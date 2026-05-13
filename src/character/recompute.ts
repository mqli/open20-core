// character/recompute.ts
// Recalculates all derived/computed stats on a Character
// Pure function — returns a new Character with updated combat stats

import type { Character } from '../types/character';
import type { DataLoader } from '../data/loader';
import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { calculateAC } from '../engine/ac-calculator';
import { calculateInitiative } from '../engine/initiative';
import { calculatePassivePerception } from '../engine/passive-perception';
import { calculateAttacks } from '../engine/attack-calculator';
import { calculateMaxHP } from '../engine/hp-calculator';
import type { Feature } from '../types/class';
import { calculatePactMagic, calculateSpellSlotsFromClasses } from '../engine/spell-slots';
import type { SpellLevel } from '../types/spell';
import { getFeaturesAtLevel, getAlwaysPreparedSpellsFromSubclass } from './create';

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
  const totalLevel = char.classes.reduce((sum, c) => sum + c.level, 0);
  const pb = getProficiencyBonus(totalLevel);
  const conMod = getModifier(getTotalScore(char.abilityScores, 'Constitution'));

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

  // Recalculate combat stats
  const newAC = calculateAC(char.abilityScores, char.equipment, features, data, char.conditions);
  const newInitiative = calculateInitiative(char.abilityScores, char.feats, features);
  const newPassivePerception = calculatePassivePerception(
    char.abilityScores,
    char.skills,
    pb,
    char.conditions
  );
  const newAttacks = calculateAttacks(
    char.abilityScores,
    char.equipment,
    pb,
    features,
    data,
    Array.from(weaponProficiencies)
  );

  // Recalculate per-class spell stats
  let newSpells = { ...char.spells };
  const classSpellcasting = { ...newSpells.classSpellcasting };

  // Calculate combined spell slots first to determine max spell level for filtering known spells
  const combinedSlots = calculateSpellSlotsFromClasses(char.classes, data);
  const maxSpellLevel = (() => {
    let max = 0;
    for (let level = 1; level <= 9; level++) {
      const entry = combinedSlots[level];
      if (entry && entry.total > 0) max = level;
    }
    return max;
  })();

  // Recalculate each class's spell data
  for (const [classId, classSpellData] of Object.entries(classSpellcasting)) {
    const classData = data.getClass(classId);
    if (!classData?.spellcasting) {
      // Class no longer has spellcasting (shouldn't happen), remove it
      delete classSpellcasting[classId];
      continue;
    }

    const ability = classData.spellcasting.ability;
    const abilityMod = getModifier(getTotalScore(char.abilityScores, ability));
    const charClass = char.classes.find(c => c.classId === classId);
    const classLevel = charClass?.level ?? 1;

    // Auto-populate knownSpells for class_list casters (Cleric, Druid)
    // For other casters, filter existing knownSpells by max castable level
    let knownSpells = classSpellData.knownSpells;
    if (classData.spellcasting.type === 'preparation' && classData.spellcasting.knownSource === 'class_list') {
      knownSpells = data.getAllSpells()
        .filter(s => s.classes?.includes(classId) && (s.level === 0 || s.level <= maxSpellLevel))
        .map(s => s.id);
    } else {
      // Filter known spells by max spell level (cantrips always included)
      knownSpells = knownSpells.filter(spellId => {
        const spell = data.getSpell(spellId);
        return spell && (spell.level === 0 || spell.level <= maxSpellLevel);
      });
    }

    // Auto-populate alwaysPreparedSpells from subclass (domain/oath spells)
    let alwaysPreparedSpells = classSpellData.alwaysPreparedSpells ?? [];
    if (charClass?.subclassId) {
      const subclass = data.getSubclass(charClass.subclassId);
      if (subclass) {
        alwaysPreparedSpells = getAlwaysPreparedSpellsFromSubclass(subclass, classLevel);
      }
    }

    classSpellcasting[classId] = {
      ...classSpellData,
      spellcastingAbility: ability,
      spellSaveDC: 8 + pb + abilityMod,
      spellAttackBonus: pb + abilityMod,
      knownSpells,
      alwaysPreparedSpells,
      maxPrepared: classLevel + abilityMod,
    };
  }

  // Add any new spellcasting classes that weren't previously tracked
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData?.spellcasting) continue;
    if (classSpellcasting[charClass.classId]) continue; // already tracked

    const ability = classData.spellcasting.ability;
    const abilityMod = getModifier(getTotalScore(char.abilityScores, ability));

    // Auto-populate knownSpells for class_list casters (Cleric, Druid)
    // Only include spells they can actually cast (cantrips + up to max spell level)
    let knownSpells: readonly string[] = [];
    if (classData.spellcasting.type === 'preparation' && classData.spellcasting.knownSource === 'class_list') {
      knownSpells = data.getAllSpells()
        .filter(s => s.classes?.includes(charClass.classId) && (s.level === 0 || s.level <= maxSpellLevel))
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

    classSpellcasting[charClass.classId] = {
      classId: charClass.classId,
      spellcastingAbility: ability,
      spellSaveDC: 8 + pb + abilityMod,
      spellAttackBonus: pb + abilityMod,
      knownSpells,
      preparedSpells: [],
      alwaysPreparedSpells,
      maxPrepared: charClass.level + abilityMod,
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
  // Preserve used counts, update totals
  const updatedSlots = { ...newSpells.spellSlots };
  for (let level = 1; level <= 9; level++) {
    const newEntry = newSlots[level];
    if (newEntry) {
      const oldUsed = updatedSlots[level as SpellLevel]?.used ?? 0;
      updatedSlots[level as SpellLevel] = {
        total: newEntry.total,
        used: Math.min(oldUsed, newEntry.total),
      };
    }
  }
  newSpells = {
    ...newSpells,
    spellSlots: updatedSlots as typeof char.spells.spellSlots,
  };

  return {
    ...char,
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
