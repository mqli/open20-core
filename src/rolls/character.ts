// rolls/character.ts
// Layer 4: Application — Apply game mechanics to Character entities
// Depends on: L1 (dice/core), L2 (dice/mechanics, engine/*), L3 (character/*)

import type { Character } from '../types/character';
import type { Weapon } from '../types/equipment';
import type { Spell, SpellLevel } from '../types/spell';
import type { AbilityName } from '../types/ability';
import type { SkillName } from '../types/skill';
import type { RandomProvider } from '../dice/core';
import type { CheckResult, AttackRollResult, DamageRollResult, RollResult } from '../dice/mechanics';
import {
  rollSkillCheck,
  rollSavingThrow,
  rollAttack,
  rollDamage,
  rollInitiative,
  type SkillCheckParams,
  type SavingThrowParams,
  type AttackRollParams,
  type DamageRollParams,
  type InitiativeRollParams,
} from '../dice/mechanics';
import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getSkillBonus } from '../engine/skill-bonus';
import { SKILL_ABILITY_MAP } from '../types/skill';
import { getActiveDamageDefenses, calculateTypedDamage } from '../engine/damage-calculator';
import { modifyHP } from '../character/mutate';
import type { DataLoader } from '../data/loader';
import type { DamageResult } from '../engine/damage-calculator';

// ── Character Skill Check ───────────────────────────────────────

export interface CharacterSkillCheckParams {
  character: Character;
  skill: SkillName;
  rollModifier?: 'none' | 'advantage' | 'disadvantage';
  dc?: number;
  rng: RandomProvider;
}

/**
 * Roll a skill check for a character
 * Wraps Layer 2 mechanics with character-specific logic
 */
export function rollCharacterSkillCheck(
  params: CharacterSkillCheckParams
): CheckResult & { skillName: SkillName; ability: AbilityName } {
  const { character, skill, rollModifier = 'none', dc, rng } = params;

  const skillEntry = character.skills[skill];
  const ability = SKILL_ABILITY_MAP[skill];
  const abilityMod = getModifier(getTotalScore(character.abilityScores, ability));
  const proficiencyBonus = character.combatStats.proficiencyBonus;

  const bonus = getSkillBonus(
    character.abilityScores,
    skillEntry ?? { proficient: false, expertise: false },
    ability,
    proficiencyBonus
  );

  const result = rollSkillCheck({
    abilityMod,
    proficiencyBonus: skillEntry?.proficient ? proficiencyBonus : 0,
    hasExpertise: skillEntry?.expertise ?? false,
    rollModifier,
    dc,
    rng,
  });

  return {
    ...result,
    bonus, // Override with actual skill bonus
    skillName: skill,
    ability,
  };
}

// ── Character Saving Throw ──────────────────────────────────────

export interface CharacterSavingThrowParams {
  character: Character;
  ability: AbilityName;
  dc: number;
  rollModifier?: 'none' | 'advantage' | 'disadvantage';
  getClass: (id: string) => { savingThrowProficiencies: readonly AbilityName[] } | undefined;
  rng: RandomProvider;
}

/**
 * Roll a saving throw for a character
 * Wraps Layer 2 with character-specific logic
 */
export function rollCharacterSavingThrow(
  params: CharacterSavingThrowParams
): CheckResult {
  const { character, ability, dc, rollModifier = 'none', getClass, rng } = params;

  const abilityMod = getModifier(getTotalScore(character.abilityScores, ability));
  const proficiencyBonus = character.combatStats.proficiencyBonus;

  // Check proficiency from any class
  let isProficient = false;
  for (const charClass of character.classes) {
    const classData = getClass(charClass.classId);
    if (classData?.savingThrowProficiencies.includes(ability)) {
      isProficient = true;
      break;
    }
  }

  return rollSavingThrow({
    abilityMod,
    proficiencyBonus,
    isProficient,
    rollModifier,
    dc,
    rng,
  });
}

// ── Character Attack Roll ───────────────────────────────────────

export interface CharacterAttackParams {
  character: Character;
  attackBonus: number;
  rollModifier?: 'none' | 'advantage' | 'disadvantage';
  targetAC?: number;
  rng: RandomProvider;
}

/**
 * Roll an attack for a character
 * Wraps Layer 2 with character-specific logic
 */
export function rollCharacterAttack(
  params: CharacterAttackParams
): AttackRollResult {
  const { character, attackBonus, rollModifier = 'none', targetAC, rng } = params;

  return rollAttack({
    attackBonus,
    rollModifier,
    targetAC,
    rng,
  });
}

// ── Character Weapon Damage ─────────────────────────────────────

export interface CharacterWeaponDamageParams {
  character: Character;
  weapon: Weapon;
  isCritical?: boolean;
  rng: RandomProvider;
}

/**
 * Roll weapon damage for a character
 * Supports multiple damage types and critical hits
 */
export function rollCharacterWeaponDamage(
  params: CharacterWeaponDamageParams
): DamageRollResult {
  const { character, weapon, isCritical = false, rng } = params;

  // Build damage entries from weapon (do NOT double dice here - rollDamage handles it)
  const entries = weapon.damage.entries;
  const damageEntries: import('../dice/mechanics').DamageRollEntry[] = [];

  for (const entry of entries) {
    damageEntries.push({
      dice: entry.dice,
      type: entry.type,
    });
  }

  // Calculate ability modifier
  const abilityMod = getModifier(
    getTotalScore(character.abilityScores, weapon.damage.ability)
  );

  const modifiers = abilityMod !== 0
    ? [{ value: abilityMod, type: 'ability' as const, description: `${weapon.damage.ability} modifier` } as { value: number; type: string; description: string }]
    : [];

  // Add weapon bonus
  if (weapon.damage.bonus !== 0) {
    modifiers.push({ value: weapon.damage.bonus, type: 'flat', description: 'weapon bonus' });
  }

  return rollDamage({
    entries: damageEntries,
    modifiers,
    isCritical,
    rng,
  });
}

// ── Spell Attack Roll ───────────────────────────────────────────

export interface SpellAttackParams {
  character: Character;
  spellcastingAbility: AbilityName;
  rollModifier?: 'none' | 'advantage' | 'disadvantage';
  targetAC?: number;
  rng: RandomProvider;
}

/**
 * Roll a spell attack for a character
 */
export function rollSpellAttack(
  params: SpellAttackParams
): AttackRollResult {
  const { character, spellcastingAbility, rollModifier = 'none', targetAC, rng } = params;

  const abilityMod = getModifier(getTotalScore(character.abilityScores, spellcastingAbility));
  const proficiencyBonus = character.combatStats.proficiencyBonus;
  const attackBonus = abilityMod + proficiencyBonus;

  return rollAttack({
    attackBonus,
    rollModifier,
    targetAC,
    rng,
  });
}

// ── Spell Damage Roll ───────────────────────────────────────────

export interface SpellDamageParams {
  character: Character;
  spell: Spell;
  slotLevel: SpellLevel;
  isCritical?: boolean;
  rng: RandomProvider;
}

/**
 * Roll spell damage for a character
 * Supports upcasting (higher level damage)
 */
export function rollSpellDamage(
  params: SpellDamageParams
): DamageRollResult {
  const { character, spell, slotLevel, rng } = params;

  if (!spell.damage) {
    return {
      entries: [],
      modifiers: [],
      total: 0,
      typedDamage: {},
    };
  }

  const entries = spell.damage.entries;
  const damageEntries: import('../dice/mechanics').DamageRollEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    let diceStr = entry.dice;

    // Handle upcasting: add perSlot damage for each slot level above base
    if (i === 0 && slotLevel > spell.level && spell.damage.perSlot && spell.damage.perSlot.length > 0) {
      const perSlotDice = spell.damage.perSlot[0]!.dice; // e.g., "1d6"
      const numLevels = slotLevel - spell.level;
      const baseMatch = diceStr.match(/(\d+)d(\d+)/);
      const slotMatch = perSlotDice.match(/(\d+)d(\d+)/);
      // Only combine if same dice sides
      if (baseMatch && slotMatch && baseMatch[2] === slotMatch[2]) {
        const baseCount = parseInt(baseMatch[1]!);
        const slotCount = parseInt(slotMatch[1]!);
        const totalCount = baseCount + slotCount * numLevels;
        diceStr = `${totalCount}d${baseMatch[2]}`;
      }
    }

    damageEntries.push({
      dice: diceStr,
      type: entry.type,
    });
  }

  // Add additional damage (e.g., Melf's Acid Arrow)
  if (spell.damage.additional) {
    for (const additional of spell.damage.additional) {
      damageEntries.push({
        dice: additional.dice,
        type: additional.type,
      });
    }
  }

  // Add spellcasting ability modifier if it's a spell attack
  const modifiers = [];
  if (spell.attack) {
    // Find the class that can cast this spell
    let spellcastingAbility: AbilityName | undefined;
    for (const [classId, classSpellData] of Object.entries(character.spells.classSpellcasting)) {
      const classIdLower = classId.toLowerCase();
      if (spell.classes?.some(c => c.toLowerCase() === classIdLower)) {
        spellcastingAbility = classSpellData.spellcastingAbility;
        break;
      }
    }

    if (spellcastingAbility) {
      const abilityMod = getModifier(
        getTotalScore(character.abilityScores, spellcastingAbility)
      );
      if (abilityMod !== 0) {
        modifiers.push({
          value: abilityMod,
          type: 'ability' as const,
          description: `${spellcastingAbility} modifier`,
        });
      }
    }
  }

  return rollDamage({
    entries: damageEntries,
    modifiers,
    isCritical: false, // Spells don't normally crit (unless specific feature)
    rng,
  });
}

// ── Initiative Roll (Character) ─────────────────────────────────

export interface CharacterInitiativeParams {
  character: Character;
  rollModifier?: 'none' | 'advantage' | 'disadvantage';
  rng: RandomProvider;
}

/**
 * Roll initiative for a character
 */
export function rollCharacterInitiative(
  params: CharacterInitiativeParams
): RollResult {
  const { character, rollModifier = 'none', rng } = params;

  const dexterityMod = getModifier(
    getTotalScore(character.abilityScores, 'Dexterity')
  );

  return rollInitiative({
    dexterityMod,
    rollModifier,
    rng,
  });
}

// ── Apply Damage with Defenses ─────────────────────────────

/**
 * Apply typed damage with character's active defenses
 * Combines damage calculation with automatic defense aggregation
 * This is a Layer 4 function that applies mechanics to entities
 */
export function applyDamageWithDefenses(
  char: Character,
  damage: number,
  damageType: import('../types/damage').DamageType,
  dataLoader: DataLoader
): { char: Character; result: DamageResult; defenses: import('../types/damage').DamageDefenses } {
  const { defenses } = getActiveDamageDefenses(char, dataLoader);
  const result = calculateTypedDamage(damage, damageType, defenses);
  const updatedChar = modifyHP(char, -result.effectiveDamage);

  return {
    char: updatedChar,
    result,
    defenses,
  };
}
