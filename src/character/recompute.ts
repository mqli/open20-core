// character/recompute.ts
// Recalculates all derived/computed stats on a Character
// Pure function — returns a new Character with updated combat stats
// Single source of truth for applying background and feat grants

import type { Character } from '../types/character';
import type { DataLoader } from '../data/loader';
import type { AbilityName, AbilityScores } from '../types/ability';
import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { calculateAC } from '../engine/ac-calculator';
import { calculateInitiative } from '../engine/initiative';
import { calculatePassivePerception } from '../engine/passive-perception';
import { calculateAttacks } from '../engine/attack-calculator';
import { calculateMaxHP } from '../engine/hp-calculator';
import { calculatePactMagic, calculateSpellSlots, calculateSpellSlotsFromClasses } from '../engine/spell-slots';
import type { SpellLevel, SpellSlotEntry } from '../types/spell';
import type { Class, Feature, Subclass } from '../types/class';

// ── Helper Functions (moved from create.ts to break circular dependency) ──

/** Extract features at a specific level */
function getFeaturesAtLevel(classData: Class, level: number): readonly Feature[] {
  const entry = classData.featuresByLevel.find(f => f.level === level);
  return entry?.features ?? [];
}

/** Get always-prepared spells from subclass */
function getAlwaysPreparedSpellsFromSubclass(
  subclass: Subclass,
  classLevel: number
): string[] {
  if (!subclass.alwaysPreparedSpells) return [];
  const spells: string[] = [];
  for (const entry of subclass.alwaysPreparedSpells) {
    if (classLevel >= entry.level) {
      spells.push(...entry.spells);
    }
  }
  return spells;
}

// ── Grant Computation (Single Source of Truth) ─────────────────

/**
 * Compute ability score grants from feats.
 * Background ability score choices are stored in abilityScores.backgroundBonuses
 * and applied directly (set by player during character creation/level-up).
 */
function computeFeatGrants(char: Character, data: DataLoader): Partial<Record<AbilityName, number>> {
  const featGrants: Partial<Record<AbilityName, number>> = {};
  for (const featId of char.feats) {
    const feat = data.getFeat(featId);
    if (feat?.grants?.abilityBonus) {
      for (const [ability, bonus] of Object.entries(feat.grants.abilityBonus)) {
        const numBonus = bonus as number;
        if (numBonus !== 0) {
          featGrants[ability as AbilityName] =
            (featGrants[ability as AbilityName] ?? 0) + numBonus;
        }
      }
    }
  }
  return featGrants;
}

/**
 * Recalculates all derived/computed stats on a Character.
 *
 * Recomputes:
 * 1. Proficiency bonus
 * 2. Max HP (caps current HP at new max)
 * 3. AC
 * 4. Initiative
 * 5. Passive Perception
 * 6. Attacks
 * 7. Spell Save DC & Spell Attack Bonus (if spellcasting)
 * 8. Spell slot totals (preserving used counts where possible)
 */
export function recomputeDerivedStats(char: Character, data: DataLoader): Character {
  // Compute feat grants (single source of truth)
  const featGrants = computeFeatGrants(char, data);

  // Update abilityScores with computed grants
  const updatedAbilityScores: AbilityScores = {
    ...char.abilityScores,
    featGrants,
  };
  
  const totalLevel = char.classes.reduce((sum, c) => sum + c.level, 0);
  const pb = getProficiencyBonus(totalLevel);
  const conMod = getModifier(getTotalScore(updatedAbilityScores, 'Constitution'));

  // Gather all features across all classes and subclasses
  const features: Feature[] = [];
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData) {
      for (let lv = 1; lv <= charClass.level; lv++) {
        features.push(...getFeaturesAtLevel(classData, lv));
      }
      // Also add subclass features
      if (charClass.subclassId) {
        const subclass = data.getSubclass(charClass.subclassId);
        if (subclass) {
          for (const entry of subclass.featuresByLevel) {
            if (entry.level <= charClass.level) {
              features.push(...entry.features);
            }
          }
        }
      }
    }
  }

  // Recalculate max HP
  const newMaxHP = calculateMaxHP(char.classes, conMod, data);
  const newCurrent = Math.min(char.hitPoints.current, newMaxHP);

  // Compute weapon proficiencies from all classes
  const weaponProficiencies = new Set<string>();
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData && classData.weaponProficiencies) {
      for (const wp of classData.weaponProficiencies) {
        weaponProficiencies.add(wp);
      }
    }
  }

  // Recalculate combat stats (using updated ability scores with grants)
  const newAC = calculateAC(updatedAbilityScores, char.equipment, features, data, char.conditions);
  const newInitiative = calculateInitiative(updatedAbilityScores, char.feats, features);
  const newPassivePerception = calculatePassivePerception(
    updatedAbilityScores,
    char.skills,
    pb,
    char.conditions
  );
  const newAttacks = calculateAttacks(
    updatedAbilityScores,
    char.equipment,
    pb,
    features,
    data,
    Array.from(weaponProficiencies)
  );

  // Recalculate per-class spell stats
  let newSpells = { ...char.spells };
  const classSpellcasting = { ...newSpells.classSpellcasting };

  // Recalculate each class's spell data
  for (const [classId, classSpellData] of Object.entries(classSpellcasting)) {
    const classData = data.getClass(classId);
    if (!classData?.spellcasting) {
      // Class no longer has spellcasting (shouldn't happen), remove it
      delete classSpellcasting[classId];
      continue;
    }

    const ability = classData.spellcasting.ability;
    const abilityMod = getModifier(getTotalScore(updatedAbilityScores, ability));
    const charClass = char.classes.find(c => c.classId === classId);
    const classLevel = charClass?.level ?? 1;

    // Calculate per-class max spell level for filtering known spells
    const classSlots = calculateSpellSlots(classId, classLevel, data);
    const classMaxSpellLevel = (() => {
      let max = 0;
      for (let level = 1; level <= 9; level++) {
        const entry = classSlots[level];
        if (entry && entry.total > 0) max = level;
      }
      return max;
    })();

    // Auto-populate knownSpells based on caster type
    let knownSpells = classSpellData.knownSpells;
    if (classData.spellcasting.knownSource === 'class_list') {
      // Class-list casters: auto-populate with spells they can cast
      knownSpells = data.getAllSpells()
        .filter(s => s.classes?.includes(classId) && (s.level === 0 || s.level <= classMaxSpellLevel))
        .map(s => s.id);
    } else if (classData.spellcasting.knownSource === 'spellbook') {
      // Wizard: auto-populate with ALL spells from spellbook (can contain higher-level spells)
      knownSpells = data.getAllSpells()
        .filter(s => s.classes?.includes(classId))
        .map(s => s.id);
    }

    // Auto-populate alwaysPreparedSpells from subclass (domain/oath spells)
    let alwaysPreparedSpells = classSpellData.alwaysPreparedSpells ?? [];
    if (charClass?.subclassId) {
      const subclass = data.getSubclass(charClass.subclassId);
      if (subclass) {
        alwaysPreparedSpells = getAlwaysPreparedSpellsFromSubclass(subclass, classLevel);
      }
    }

    // 从职业特性表中读取可准备法术数量（SRD 5.2 使用表格数值，非常规公式）
    const levelEntry = classData.featuresByLevel.find(f => f.level === classLevel);
    const maxPrepared = levelEntry?.preparedSpells ?? 0;

    classSpellcasting[classId] = {
      ...classSpellData,
      spellcastingAbility: ability,
      spellSaveDC: 8 + pb + abilityMod,
      spellAttackBonus: pb + abilityMod,
      knownSpells,
      alwaysPreparedSpells,
      maxPrepared,
    };
  }

  // Add any new spellcasting classes that weren't previously tracked
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData?.spellcasting) continue;
    if (classSpellcasting[charClass.classId]) continue; // already tracked

    const ability = classData.spellcasting.ability;
    const abilityMod = getModifier(getTotalScore(updatedAbilityScores, ability));

    // Calculate per-class max spell level for filtering known spells
    const classSlots = calculateSpellSlots(charClass.classId, charClass.level, data);
    const classMaxSpellLevel = (() => {
      let max = 0;
      for (let level = 1; level <= 9; level++) {
        const entry = classSlots[level];
        if (entry && entry.total > 0) max = level;
      }
      return max;
    })();

    // Auto-populate knownSpells for class_list casters (Cleric, Druid, Bard, etc.)
    // Only include spells they can actually cast (cantrips + up to max spell level)
    let knownSpells: readonly string[] = [];
    if (classData.spellcasting?.knownSource === 'class_list') {
      knownSpells = data.getAllSpells()
        .filter(s => s.classes?.includes(charClass.classId) && (s.level === 0 || s.level <= classMaxSpellLevel))
        .map(s => s.id);
    }

    // Auto-populate alwaysPreparedSpells from subclass (domain/oath spells)
    let alwaysPreparedSpells: readonly string[] = [];
    if (charClass.subclassId) {
      const subclass = data.getSubclass(charClass.subclassId);
      if (subclass) {
        alwaysPreparedSpells = getAlwaysPreparedSpellsFromSubclass(subclass, charClass.level);
      }
    }

    // 从职业特性表中读取可准备法术数量（SRD 5.2 使用表格数值，非常规公式）
    const levelEntry = classData.featuresByLevel.find(f => f.level === charClass.level);
    const maxPrepared = levelEntry?.preparedSpells ?? 0;

    classSpellcasting[charClass.classId] = {
      classId: charClass.classId,
      spellcastingAbility: ability,
      spellSaveDC: 8 + pb + abilityMod,
      spellAttackBonus: pb + abilityMod,
      knownSpells,
      preparedSpells: [],
      alwaysPreparedSpells,
      maxPrepared,
    };
  }

  newSpells = {
    ...newSpells,
    classSpellcasting,
  };

  // Recalculate Warlock Pact Magic
  const hasWarlock = char.classes.some(c => c.classId === 'Warlock');

  if (hasWarlock) {
    const warlockLevel = char.classes.find(c => c.classId === 'Warlock')!.level;
    const pactResult = calculatePactMagic(warlockLevel, data);
    if (pactResult) {
      const existingPactSlots = newSpells.pactMagicSlots;
      newSpells = {
        ...newSpells,
        pactMagicSlots: {
          level: pactResult.slotLevel,
          total: pactResult.slots,
          used: existingPactSlots?.used ?? 0,
          resetOn: 'Short Rest',
        },
      };
    }
  } else {
    // Remove pact magic if no longer a Warlock
    newSpells = {
      ...newSpells,
      pactMagicSlots: null,
    };
  }

  // Recalculate regular spell slots (using multiclass rules)
  const newSlots = calculateSpellSlotsFromClasses(char.classes, data);
  
  // Check if newSlots has any non-zero entries
  const hasNonZero = Object.values(newSlots).some(entry => entry.total > 0);
  
  // Preserve used counts, update totals (only if newSlots has non-zero entries)
  const updatedSlots = hasNonZero
    ? (() => {
        const slots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
        for (let level = 1; level <= 9; level++) {
          const newEntry = newSlots[level];
          if (newEntry) {
            const oldUsed = newSpells.spellSlots[level as SpellLevel]?.used ?? 0;
            slots[level as SpellLevel] = {
              total: newEntry.total,
              used: Math.min(oldUsed, newEntry.total),
            };
          }
        }
        return slots;
      })()
    : newSpells.spellSlots; // Preserve existing slots if recalculation returns all zeros
  newSpells = {
    ...newSpells,
    spellSlots: updatedSlots as typeof char.spells.spellSlots,
  };

  return {
    ...char,
    abilityScores: updatedAbilityScores,
    hitPoints: {
      ...char.hitPoints,
      max: newMaxHP,
      current: newCurrent,
    },
    combatStats: {
      AC: newAC,
      initiative: newInitiative,
      speed: char.combatStats.speed,
      passivePerception: newPassivePerception,
      proficiencyBonus: pb,
      attacks: newAttacks,
    },
    spells: newSpells,
    updatedAt: new Date().toISOString(),
  };
}
