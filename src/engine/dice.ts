// engine/dice.ts
// Dice rolling system for attacks, skills, saves, and damage
// Implements R22

import type { Character } from '../types/character';
import type { DieType } from '../types/dice';
import type { AbilityName } from '../types/ability';
import type { SkillName } from '../types/skill';
import type { Weapon } from '../types/equipment';
import type { Spell, SpellLevel } from '../types/spell';
import { getModifier, getTotalScore } from './ability-modifier';
import { getSkillBonus } from './skill-bonus';
import { SKILL_ABILITY_MAP } from '../types/skill';

// ── Random Provider ───────────────────────────────────────────────

/**
 * Random number provider - allows deterministic testing
 */
export interface RandomProvider {
  roll(min: number, max: number): number; // [min, max] inclusive
}

/**
 * Default random provider using Math.random
 */
export const defaultRandom: RandomProvider = {
  roll: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
};

// ── Basic Dice Operations ─────────────────────────────────────────

const DIE_SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

/**
 * Roll a single die
 */
export function rollDie(rng: RandomProvider, die: DieType): number {
  return rng.roll(1, DIE_SIDES[die]);
}

/**
 * Roll multiple dice of the same type
 */
export function rollDice(rng: RandomProvider, die: DieType, count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDie(rng, die);
  }
  return total;
}

/**
 * Roll with advantage - roll twice, take higher
 */
export function rollWithAdvantage(rng: RandomProvider, die: DieType): number {
  const roll1 = rollDie(rng, die);
  const roll2 = rollDie(rng, die);
  return Math.max(roll1, roll2);
}

/**
 * Roll with disadvantage - roll twice, take lower
 */
export function rollWithDisadvantage(rng: RandomProvider, die: DieType): number {
  const roll1 = rollDie(rng, die);
  const roll2 = rollDie(rng, die);
  return Math.min(roll1, roll2);
}

// ── Attack Roll ───────────────────────────────────────────────────

export type AttackModifier = 'none' | 'advantage' | 'disadvantage';

export interface AttackRollResult {
  rawRoll: number;
  modifier: AttackModifier;
  bonus: number;
  final: number;
  isCritical: boolean;
  isCriticalFail: boolean;
  hit: boolean;
  isFumble: boolean;
}

export interface AttackParams {
  attackBonus: number; // Proficiency + weapon bonus
  abilityModifier: AbilityName;
}

/**
 * Execute an attack roll
 */
export function rollAttack(
  rng: RandomProvider,
  character: Character,
  attack: AttackParams,
  modifier: AttackModifier = 'none',
  targetAC?: number
): AttackRollResult {
  // Roll d20 with appropriate modifier
  let rawRoll: number;

  if (modifier === 'advantage') {
    rawRoll = rollWithAdvantage(rng, 'd20');
  } else if (modifier === 'disadvantage') {
    rawRoll = rollWithDisadvantage(rng, 'd20');
  } else {
    rawRoll = rollDie(rng, 'd20');
  }

  // Determine critical hit/fail BEFORE modifier
  const isCritical = rawRoll === 20;
  const isCriticalFail = rawRoll === 1;

  // Calculate total bonus (ability modifier + proficiency + item bonus)
  const abilityScore = getTotalScore(character.abilityScores, attack.abilityModifier);
  const abilityMod = getModifier(abilityScore);
  const bonus = abilityMod + attack.attackBonus;

  // Final result
  const final = rawRoll + bonus;

  // Determine hit (if AC provided)
  const hit = targetAC !== undefined ? final >= targetAC : true;

  // Fumble = critical fail on attack roll
  const isFumble = isCriticalFail;

  return {
    rawRoll,
    modifier,
    bonus,
    final,
    isCritical,
    isCriticalFail,
    hit,
    isFumble,
  };
}

// ── Skill Check ───────────────────────────────────────────────────

export interface SkillCheckResult {
  rawRoll: number;
  modifier: 'advantage' | 'disadvantage' | 'none';
  bonus: number;
  final: number;
  skillName: SkillName;
  ability: AbilityName;
}

/**
 * Execute a skill check
 */
export function rollSkillCheck(
  rng: RandomProvider,
  character: Character,
  skill: SkillName,
  modifier: 'advantage' | 'disadvantage' | 'none' = 'none'
): SkillCheckResult {
  // Get skill info and ability
  const skillEntry = character.skills[skill];
  const ability = SKILL_ABILITY_MAP[skill];
  const proficiencyBonus = character.combatStats.proficiencyBonus;

  // Calculate skill bonus
  const bonus = getSkillBonus(
    character.abilityScores,
    skillEntry ?? { proficient: false, expertise: false },
    ability,
    proficiencyBonus
  );

  // Roll d20 with appropriate modifier
  let rawRoll: number;
  if (modifier === 'advantage') {
    rawRoll = rollWithAdvantage(rng, 'd20');
  } else if (modifier === 'disadvantage') {
    rawRoll = rollWithDisadvantage(rng, 'd20');
  } else {
    rawRoll = rollDie(rng, 'd20');
  }

  const final = rawRoll + bonus;

  return {
    rawRoll,
    modifier,
    bonus,
    final,
    skillName: skill,
    ability,
  };
}

// ── Saving Throw ─────────────────────────────────────────────────

export interface SavingThrowResult {
  rawRoll: number;
  modifier: 'advantage' | 'disadvantage' | 'none';
  bonus: number;
  final: number;
  success: boolean;
}

/**
 * Execute a saving throw
 */
export function rollSavingThrow(
  rng: RandomProvider,
  character: Character,
  ability: AbilityName,
  dc: number,
  data: {
    getClass: (id: string) => { savingThrowProficiencies: readonly AbilityName[] } | undefined;
  },
  modifier: 'advantage' | 'disadvantage' | 'none' = 'none'
): SavingThrowResult {
  // Roll d20 with appropriate modifier
  let rawRoll: number;
  if (modifier === 'advantage') {
    rawRoll = rollWithAdvantage(rng, 'd20');
  } else if (modifier === 'disadvantage') {
    rawRoll = rollWithDisadvantage(rng, 'd20');
  } else {
    rawRoll = rollDie(rng, 'd20');
  }

  // Calculate saving throw bonus from character's classes
  const proficiencyBonus = character.combatStats.proficiencyBonus;
  let bonus = getModifier(getTotalScore(character.abilityScores, ability));

  // Check if any class is proficient in this saving throw
  for (const charClass of character.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData?.savingThrowProficiencies.includes(ability)) {
      bonus += proficiencyBonus;
      break; // Only add proficiency once
    }
  }

  const final = rawRoll + bonus;
  const success = final >= dc;

  return {
    rawRoll,
    modifier,
    bonus,
    final,
    success,
  };
}

// ── Damage Roll ───────────────────────────────────────────────────

export interface DamageRollEntry {
  damageType: string; // 伤害类型，如 "Piercing", "Poison"
  die: DieType;
  count: number;
  results: readonly number[];
  subtotal: number;
}

export interface DamageModifier {
  type: 'ability' | 'flat' | 'extra';
  value: number;
  description: string;
}

export interface DamageRollResult {
  rolls: readonly DamageRollEntry[];
  modifiers: readonly DamageModifier[];
  total: number;
  typedDamage: Record<string, number>; // 按伤害类型分解的伤害值
}

/**
 * Parse a dice string like "1d6" into count and die type
 */
function parseDiceString(diceStr: string): { count: number; die: DieType } {
  const match = diceStr.match(/^(\d+)d(\d+)$/);
  if (!match) {
    return { count: 1, die: 'd6' }; // Default fallback
  }
  const count = parseInt(match[1]!, 10);
  const dieSize = parseInt(match[2]!, 10);
  const dieType = `d${dieSize}` as DieType;
  return { count, die: dieType };
}

/**
 * Execute a weapon damage roll (支持多种伤害类型)
 * 使用统一的 entries 数组，第一条为基础伤害（重击时骰子翻倍，应用能力加值）
 */
export function rollWeaponDamage(
  rng: RandomProvider,
  character: Character,
  weapon: Weapon,
  isCritical: boolean = false
): DamageRollResult {
  const rolls: DamageRollEntry[] = [];
  const modifiers: DamageModifier[] = [];
  const typedDamage: Record<string, number> = {};

  const entries = weapon.damage.entries;

  // 处理所有伤害条目
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const { count, die } = parseDiceString(entry.dice);

    // 第一条为基础伤害，重击时骰子翻倍
    const rollCount = (i === 0 && isCritical) ? count * 2 : count;

    const results: number[] = [];
    for (let j = 0; j < rollCount; j++) {
      results.push(rollDie(rng, die));
    }

    const subtotal = results.reduce((a, b) => a + b, 0);

    rolls.push({
      damageType: entry.type,
      die,
      count: rollCount,
      results,
      subtotal,
    });

    typedDamage[entry.type] = (typedDamage[entry.type] ?? 0) + subtotal;
  }

  // Add ability modifier (only to first entry / physical damage)
  const abilityScore = getTotalScore(character.abilityScores, weapon.damage.ability);
  const abilityMod = getModifier(abilityScore);

  if (abilityMod !== 0) {
    modifiers.push({
      type: 'ability',
      value: abilityMod,
      description: `${weapon.damage.ability} modifier`,
    });

    // 能力加值应用于所有物理伤害
    const firstEntry = entries[0];
    if (firstEntry) {
      const firstType = firstEntry.type;
      if (['Bludgeoning', 'Piercing', 'Slashing'].includes(firstType)) {
        typedDamage[firstType] = (typedDamage[firstType] ?? 0) + abilityMod;
      } else {
        // 非物理伤害，加到第一条伤害类型上
        typedDamage[firstType] = (typedDamage[firstType] ?? 0) + abilityMod;
      }
    }
  }

  // Add weapon bonus damage
  if (weapon.damage.bonus !== 0) {
    modifiers.push({
      type: 'flat',
      value: weapon.damage.bonus,
      description: 'weapon bonus',
    });
    // 武器加值加到第一条伤害类型上
    const firstType = entries[0]?.type ?? 'Slashing';
    typedDamage[firstType] = (typedDamage[firstType] ?? 0) + weapon.damage.bonus;
  }

  // Calculate total
  const diceTotal = rolls.reduce((sum, r) => sum + r.subtotal, 0);
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
  const total = diceTotal + modifierTotal;

  return { rolls, modifiers, total, typedDamage };
}

/**
 * Execute a spell damage roll (支持多种伤害类型)
 * 使用统一的 entries 数组
 */
export function rollSpellDamage(
  rng: RandomProvider,
  character: Character,
  spell: Spell,
  slotLevel: SpellLevel
): DamageRollResult {
  const rolls: DamageRollEntry[] = [];
  const modifiers: DamageModifier[] = [];
  const typedDamage: Record<string, number> = {};

  if (spell.damage) {
    const entries = spell.damage.entries;

    // 处理主伤害条目（第一条可随升环增加）
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      let diceStr = entry.dice;

      // 第一条伤害在升环时增加
      if (i === 0 && slotLevel > spell.level && spell.damage.higherLevel) {
        const higherIndex = Math.min(
          slotLevel - spell.level - 1,
          spell.damage.higherLevel.length - 1
        );
        diceStr = spell.damage.higherLevel[higherIndex] ?? diceStr;
      }

      const { count, die } = parseDiceString(diceStr);
      const results: number[] = [];
      for (let j = 0; j < count; j++) {
        results.push(rollDie(rng, die));
      }

      const subtotal = results.reduce((a, b) => a + b, 0);

      rolls.push({
        damageType: entry.type,
        die,
        count,
        results,
        subtotal,
      });

      typedDamage[entry.type] = (typedDamage[entry.type] ?? 0) + subtotal;
    }

    // Add spellcasting ability modifier if it's a spell attack
    if (spell.attack && entries.length > 0) {
      const abilityScore = getTotalScore(
        character.abilityScores,
        character.spells.spellcastingAbility
      );
      const abilityMod = getModifier(abilityScore);

      modifiers.push({
        type: 'ability',
        value: abilityMod,
        description: `${character.spells.spellcastingAbility} modifier`,
      });

      // 能力加值加到第一条伤害类型上
      const firstType = entries[0]!.type;
      typedDamage[firstType] = (typedDamage[firstType] ?? 0) + abilityMod;
    }

    // 处理额外伤害（不随升环增加，如 Melf's Acid Arrow 的 1d6 poison）
    if (spell.damage.additional) {
      for (const additional of spell.damage.additional) {
        const { count: addCount, die: addDie } = parseDiceString(additional.dice);
        const addResults: number[] = [];
        for (let i = 0; i < addCount; i++) {
          addResults.push(rollDie(rng, addDie));
        }
        const addSubtotal = addResults.reduce((a, b) => a + b, 0);

        rolls.push({
          damageType: additional.type,
          die: addDie,
          count: addCount,
          results: addResults,
          subtotal: addSubtotal,
        });

        typedDamage[additional.type] = (typedDamage[additional.type] ?? 0) + addSubtotal;
      }
    }
  }

  const diceTotal = rolls.reduce((sum, r) => sum + r.subtotal, 0);
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
  const total = diceTotal + modifierTotal;

  return { rolls, modifiers, total, typedDamage };
}
