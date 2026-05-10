// dice/entity.ts
// Layer 3: Entity Application - Apply dice mechanics to game entities
// Uses Layer 2 (dice-mechanics) and adds entity-specific logic
// Handles: Character, Monster, Spell

import type { Character } from '../types/character';
import type { Monster } from '../monster/types';
import type { Spell, SpellLevel } from '../types/spell';
import type { Weapon } from '../types/equipment';
import type { AbilityName } from '../types/ability';
import type { SkillName } from '../types/skill';
import type { DamageType } from '../types/damage';
import type { RandomProvider } from './core';
import {
  rollSkillCheck as rollSkillCheckMechanic,
  rollSavingThrow as rollSavingThrowMechanic,
  rollAttack as rollAttackMechanic,
  rollDamage as rollDamageMechanic,
  rollInitiative as rollInitiativeMechanic,
  type SkillCheckParams,
  type SavingThrowParams,
  type AttackRollParams,
  type DamageRollParams,
  type DamageRollEntry,
  type CheckResult,
  type AttackRollResult,
  type DamageRollResult,
  type RollResult,
} from './mechanics';
import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getSkillBonus } from '../engine/skill-bonus';
import { SKILL_ABILITY_MAP } from '../types/skill';

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
 * Wraps Layer 2 with character-specific logic
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

  const result = rollSkillCheckMechanic({
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

  return rollSavingThrowMechanic({
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

  return rollAttackMechanic({
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
  const damageEntries: DamageRollEntry[] = [];

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
    ? [{ value: abilityMod, type: 'ability', description: `${weapon.damage.ability} modifier` }]
    : [];

  // Add weapon bonus
  if (weapon.damage.bonus !== 0) {
    modifiers.push({ value: weapon.damage.bonus, type: 'flat', description: 'weapon bonus' });
  }

  return rollDamageMechanic({
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

  return rollAttackMechanic({
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
  const damageEntries: DamageRollEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    let diceStr = entry.dice;

    // Handle upcasting
    if (i === 0 && slotLevel > spell.level && spell.damage.higherLevel) {
      const higherIndex = Math.min(
        slotLevel - spell.level - 1,
        spell.damage.higherLevel.length - 1
      );
      diceStr = spell.damage.higherLevel[higherIndex] ?? diceStr;
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
    const abilityMod = getModifier(
      getTotalScore(character.abilityScores, character.spells.spellcastingAbility)
    );
    if (abilityMod !== 0) {
      modifiers.push({
        value: abilityMod,
        type: 'ability',
        description: `${character.spells.spellcastingAbility} modifier`,
      });
    }
  }

  return rollDamageMechanic({
    entries: damageEntries,
    modifiers,
    isCritical: false, // Spells don't normally crit (unless specific feature)
    rng,
  });
}

// ── Monster Attack Roll ─────────────────────────────────────────

export interface MonsterAttackParams {
  monster: Monster;
  attackBonus: number;
  rollModifier?: 'none' | 'advantage' | 'disadvantage';
  targetAC?: number;
  rng: RandomProvider;
}

/**
 * Roll an attack for a monster
 */
export function rollMonsterAttack(
  params: MonsterAttackParams
): AttackRollResult {
  return rollAttackMechanic({
    attackBonus: params.attackBonus,
    rollModifier: params.rollModifier ?? 'none',
    targetAC: params.targetAC,
    rng: params.rng,
  });
}

// ── Monster Damage Roll ──────────────────────────────────────────

export interface MonsterDamageParams {
  entries: DamageRollEntry[]; // Array of damage entries
  isCritical?: boolean;
  rng: RandomProvider;
}

/**
 * Roll damage for a monster attack
 */
export function rollMonsterDamage(
  params: MonsterDamageParams
): DamageRollResult {
  return rollDamageMechanic({
    entries: params.entries,
    isCritical: params.isCritical,
    rng: params.rng,
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

  return rollInitiativeMechanic({
    dexterityMod,
    rollModifier,
    rng,
  });
}

// ── Initiative Roll (Monster) ───────────────────────────────────

export interface MonsterInitiativeParams {
  monster: Monster;
  rollModifier?: 'none' | 'advantage' | 'disadvantage';
  rng: RandomProvider;
}

/**
 * Roll initiative for a monster
 */
export function rollMonsterInitiative(
  params: MonsterInitiativeParams
): RollResult {
  const { monster, rollModifier = 'none', rng } = params;

  // Monster initiative is typically based on DEX
  // This would need to be added to monster type
  const dexterityMod = 0; // Placeholder - would get from monster stats

  return rollInitiativeMechanic({
    dexterityMod,
    rollModifier,
    rng,
  });
}
