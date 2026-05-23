// character/recompute.ts
// Recalculates all derived/computed stats on a Character
// Pure function — returns a new Character with updated combat stats
// Single source of truth for applying background and feat grants
//
// Split into: computeFeatGrants, gatherAllFeatures, computeCombatStats,
//   computeClassSpellData, recomputeDerivedStats (orchestrator)

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
import { calculatePactMagic, calculateSpellSlotsFromClasses } from '../engine/spell-slots';
import { buildClassSpellData } from '../engine/spell-data';
import type { ClassSpellData, SpellLevel, SpellSlotEntry } from '../types/spell';
import type { Feature } from '../types/class';
import { gatherAllFeatures } from './utils';
import { recomputeResources } from './resource-builder';
import type { FeatAttackBonus, FeatACBonus } from '../types/feat';

// ── Grant Computation (Single Source of Truth) ─────────────────

/**
 * Compute ability score grants from feats.
 * Handles both fixed bonuses (feat.grants.abilityBonus) and
 * choice-based bonuses (entry.abilityChoices).
 * Background ability score choices are stored in abilityScores.backgroundBonuses
 * and applied directly (set by player during character creation/level-up).
 */
function computeFeatGrants(char: Character, data: DataLoader): Partial<Record<AbilityName, number>> {
  const featGrants: Partial<Record<AbilityName, number>> = {};

  for (const entry of char.feats) {
    const feat = data.getFeat(entry.featId);
    if (!feat) continue;

    // 1. Apply fixed ability bonuses (if any)
    if (feat.grants?.abilityBonus) {
      for (const [ability, bonus] of Object.entries(feat.grants.abilityBonus)) {
        const numBonus = bonus as number;
        if (numBonus !== 0) {
          featGrants[ability as AbilityName] =
            (featGrants[ability as AbilityName] ?? 0) + numBonus;
        }
      }
    }

    // 2. Apply choice-based ability bonuses from entry.abilityChoices
    if (entry.abilityChoices) {
      for (const [ability, bonus] of Object.entries(entry.abilityChoices)) {
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
 * Apply feat skill/tool proficiencies to the skills record.
 * Feat choices are stored in each CharacterFeatEntry.
 */
function applyFeatSkillProficiencies(
  skills: Record<string, import('../types/skill').SkillEntry>,
  char: Character,
  data: DataLoader
): Record<string, import('../types/skill').SkillEntry> {
  const updatedSkills = { ...skills };

  for (const entry of char.feats) {
    const feat = data.getFeat(entry.featId);
    if (!feat) continue;

    // Apply predefined skill proficiencies from feat data
    const skillProficiencies = feat.grants?.skillProficiencies ?? [];
    for (const skill of skillProficiencies) {
      if (updatedSkills[skill]) {
        updatedSkills[skill] = { ...updatedSkills[skill], proficient: true };
      }
    }

    // Apply player's skill choices for this feat
    if (entry.skillChoices) {
      for (const choice of entry.skillChoices) {
        if (updatedSkills[choice]) {
          updatedSkills[choice] = { ...updatedSkills[choice], proficient: true };
        }
      }
    }
  }

  return updatedSkills;
}

/**
 * Extract attack bonuses from feats (for Fighting Style feats like Archery).
 */
function computeFeatAttackBonuses(char: Character, data: DataLoader): readonly FeatAttackBonus[] {
  const bonuses: FeatAttackBonus[] = [];
  for (const entry of char.feats) {
    const feat = data.getFeat(entry.featId);
    if (feat?.grants?.attackBonus) {
      bonuses.push(feat.grants.attackBonus);
    }
  }
  return bonuses;
}

/**
 * Extract AC bonuses from feats (for Fighting Style feats like Defense).
 */
function computeFeatACBonuses(char: Character, data: DataLoader): readonly FeatACBonus[] {
  const bonuses: FeatACBonus[] = [];
  for (const entry of char.feats) {
    const feat = data.getFeat(entry.featId);
    if (feat?.grants?.acBonus) {
      bonuses.push(feat.grants.acBonus);
    }
  }
  return bonuses;
}

// ── Feature Gathering ──────────────────────────────────────

// ── Weapon Proficiencies ──────────────────────────────────

/** Compute weapon proficiencies from all classes. */
function computeWeaponProficiencies(char: Character, data: DataLoader): string[] {
  const weaponProficiencies = new Set<string>();
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData?.weaponProficiencies) {
      for (const wp of classData.weaponProficiencies) {
        weaponProficiencies.add(wp);
      }
    }
  }
  return Array.from(weaponProficiencies);
}

// ── Combat Stats ──────────────────────────────────────────

/** Recalculate AC, initiative, passive perception, attacks. */
function computeCombatStats(
  abilityScores: AbilityScores,
  equipment: Character['equipment'],
  features: Feature[],
  conditions: Character['conditions'],
  feats: Character['feats'],
  skills: Character['skills'],
  pb: number,
  weaponProficiencies: string[],
  data: DataLoader,
  featAttackBonuses: readonly import('../types/feat').FeatAttackBonus[],
  featACBonuses: readonly import('../types/feat').FeatACBonus[]
) {
  const newAC = calculateAC(abilityScores, equipment, features, data, conditions, featACBonuses);
  const newInitiative = calculateInitiative(abilityScores, feats.map(f => f.featId), features, pb);
  const newPassivePerception = calculatePassivePerception(
    abilityScores,
    skills,
    pb,
    conditions
  );
  const newAttacks = calculateAttacks(
    abilityScores,
    equipment,
    pb,
    features,
    data,
    weaponProficiencies,
    featAttackBonuses
  );

  return { newAC, newInitiative, newPassivePerception, newAttacks };
}

// ── Spell Data Computation ────────────────────────────────

/**
 * Compute per-class spell data (DC, attack bonus, known/cantrip/prepared spells).
 * Delegates per-class computation to engine/spell-data.buildClassSpellData.
 * Any class no longer on `char.classes` (or no longer spellcasting) is dropped.
 */
function computeClassSpellData(
  char: Character,
  data: DataLoader,
  pb: number,
  abilityScores: AbilityScores,
  existing: Record<string, ClassSpellData>
): Record<string, ClassSpellData> {
  const result: Record<string, ClassSpellData> = {};
  for (const charClass of char.classes) {
    const built = buildClassSpellData({
      classId: charClass.classId,
      classLevel: charClass.level,
      subclassId: charClass.subclassId,
      abilityScores,
      proficiencyBonus: pb,
      existing: existing[charClass.classId],
      data,
    });
    if (built) result[charClass.classId] = built;
  }
  return result;
}

// ── Pact Magic ────────────────────────────────────────────

/** Recalculate Warlock Pact Magic slots, or remove if no longer Warlock. */
function computePactMagic(
  char: Character,
  data: DataLoader,
  existingSlots: Character['spells']['pactMagicSlots']
) {
  const hasWarlock = char.classes.some(c => c.classId === 'Warlock');

  if (!hasWarlock) {
    return { ...char.spells, pactMagicSlots: null };
  }

  const warlockLevel = char.classes.find(c => c.classId === 'Warlock')!.level;
  const pactResult = calculatePactMagic(warlockLevel, data);
  if (!pactResult) return char.spells;

  return {
    ...char.spells,
    pactMagicSlots: {
      level: pactResult.slotLevel,
      total: pactResult.slots,
      used: existingSlots?.used ?? 0,
      resetOn: 'Short Rest' as const,
    },
  };
}

// ── Spell Slots ───────────────────────────────────────────

/** Recalculate regular spell slots, preserving used counts. */
function computeSpellSlots(
  char: Character,
  data: DataLoader
) {
  const newSlots = calculateSpellSlotsFromClasses(char.classes, data);
  const hasNonZero = Object.values(newSlots).some(entry => entry.total > 0);

  if (!hasNonZero) return char.spells.spellSlots;

  const updatedSlots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
  for (let level = 1; level <= 9; level++) {
    const newEntry = newSlots[level];
    if (newEntry) {
      const oldUsed = char.spells.spellSlots[level as SpellLevel]?.used ?? 0;
      updatedSlots[level as SpellLevel] = {
        total: newEntry.total,
        used: Math.min(oldUsed, newEntry.total),
      };
    }
  }
  return updatedSlots;
}

// ── Feat Spells ──────────────────────────────────────────

/**
 * Compute feat spells from CharacterFeatEntry.spellChoices.
 * Populates spells.featSpells with spells granted by feats like Magic Initiate.
 */
function computeFeatSpells(
  char: Character,
  data: DataLoader
): Record<string, import('../types/spell').FeatSpellsEntry> | undefined {
  const existingFeatSpells = char.spells.featSpells;
  const featSpells: Record<string, import('../types/spell').FeatSpellsEntry> = {};

  for (const entry of char.feats) {
    if (!entry.spellChoices) continue;

    const feat = data.getFeat(entry.featId);
    if (!feat?.grants?.spellChoices) continue;

    const selection = entry.spellChoices;

    // Determine spellcasting ability from classId
    const classData = data.getClass(selection.classId);
    if (!classData?.spellcasting) continue;

    const spellcastingAbility = classData.spellcasting.ability;

    // Build the FeatSpellsEntry
    const cantrips = selection.spells['cantrips'] ?? [];
    const level1Spell = selection.spells['level1Spell'] ?? [];

    // Determine which spells can be cast once per long rest
    const oncePerLongRest: Record<string, boolean> = {};
    if (feat.grants.spellChoices) {
      for (const spellChoice of feat.grants.spellChoices) {
        if (spellChoice.oncePerLongRest) {
          const spellsForChoice = selection.spells[spellChoice.id] ?? [];
          for (const spell of spellsForChoice) {
            oncePerLongRest[spell] = true;
          }
        }
      }
    }

    featSpells[entry.featId] = {
      classId: selection.classId,
      spellcastingAbility,
      cantrips,
      preparedSpells: [...cantrips, ...level1Spell],
      oncePerLongRest: Object.keys(oncePerLongRest).length > 0 ? oncePerLongRest : undefined,
      usedOncePerLongRest: existingFeatSpells?.[entry.featId]?.usedOncePerLongRest,
    };
  }

  return Object.keys(featSpells).length > 0 ? featSpells : undefined;
}

// ── Main Orchestrator ─────────────────────────────────────

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
 * 9. Apply feat skill/tool proficiencies
 */
export function recomputeDerivedStats(char: Character, data: DataLoader): Character {
  // 1. Feat grants (single source of truth)
  const featGrants = computeFeatGrants(char, data);

  // 1.5. Compute feat attack and AC bonuses (for Fighting Style feats)
  const featAttackBonuses = computeFeatAttackBonuses(char, data);
  const featACBonuses = computeFeatACBonuses(char, data);

  // 1.6. Apply feat skill proficiencies
  const updatedSkills = applyFeatSkillProficiencies(
    char.skills,
    char,
    data
  );

  // 2. Update abilityScores with computed grants
  const updatedAbilityScores: AbilityScores = {
    ...char.abilityScores,
    featGrants,
  };

  const totalLevel = char.classes.reduce((sum, c) => sum + c.level, 0);
  const pb = getProficiencyBonus(totalLevel);
  const conMod = getModifier(getTotalScore(updatedAbilityScores, 'Constitution'));

  // 3. Gather features & weapon proficiencies
  const features = gatherAllFeatures(char.classes, data);
  const weaponProficiencies = computeWeaponProficiencies(char, data);

  // 4. Combat stats
  const { newAC, newInitiative, newPassivePerception, newAttacks } =
    computeCombatStats(
      updatedAbilityScores,
      char.equipment,
      features,
      char.conditions,
      char.feats,
      updatedSkills,
      pb,
      weaponProficiencies,
      data,
      featAttackBonuses,
      featACBonuses
    );

  // 5. Spell data (per-class)
  const classSpellcasting = computeClassSpellData(
    char, data, pb, updatedAbilityScores, { ...char.spells.classSpellcasting }
  );

  // 6. Pact Magic (Warlock)
  let newSpells = computePactMagic(char, data, char.spells.pactMagicSlots);

  // 7. Regular spell slots + feat spells
  const updatedSlots = computeSpellSlots(char, data);
  const featSpells = computeFeatSpells(char, data);
  newSpells = {
    ...newSpells,
    classSpellcasting,
    spellSlots: updatedSlots,
    featSpells,
  };

  // 8. Recompute resource max values (per-class, preserves used counts)
  const updatedResources = recomputeResources(
    char.resources,
    char.classes,
    updatedAbilityScores,
    data,
  );

  // 9. Max HP (cap current at new max; never heal via recompute)
  const newMaxHP = calculateMaxHP(char.classes, conMod, data);
  const newCurrent = Math.min(char.hitPoints.current, newMaxHP);

  // 10. Assemble result
  return {
    ...char,
    abilityScores: updatedAbilityScores,
    skills: updatedSkills,
    resources: updatedResources,
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
