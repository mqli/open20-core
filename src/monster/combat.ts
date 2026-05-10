// monster/combat.ts
// Monster combat functions — deal damage, take damage, HP management
// Pure functions that return new Monster objects (immutable)
// NOW USES: Layered dice system (dice-core → dice-mechanics → dice-entity)

import type { Monster } from './types';
import type { MonsterAttack } from '../types/monster';
import type { DamageType, DamageDefenses, DamageResult } from '../types/damage';
import type { DataLoader } from '../data/loader';
import { defaultRandom, parseDiceExpression } from '../dice/core';
import { rollMonsterAttack as rollMonsterAttackEntity, rollMonsterDamage } from '../dice/entity';
import { calculateTypedDamage } from '../engine/damage-calculator';
import { calculateMonsterAttackBonus } from './calculator';
import {
  applyHPChange,
  applyTypedDamageToHP,
  setTemporaryHPShared,
  isDefeatedShared,
  addDamageResistance,
  addDamageImmunity,
  addDamageVulnerability,
  emptyDefenses,
} from '../engine/combat';

// ── Damage Roll ─────────────────────────────────────────────

/**
 * Roll damage for a monster attack
 * Uses the new dice system (dice-core layer)
 *
 * @param attack - MonsterAttack with damageEntries
 * @returns Total damage (dice roll + bonuses)
 *
 * @example
 * rollMonsterAttackDamage(goblinAttacks[0]) // e.g., 1d6+2 = 5
 */
export function rollMonsterAttackDamage(attack: MonsterAttack): number {
  if (!attack.damageEntries || attack.damageEntries.length === 0) {
    // Fallback to flat damage string if no structured data
    if (attack.damage) {
      return estimateDamageFromString(attack.damage);
    }
    return 0;
  }

  let total = 0;
  for (const entry of attack.damageEntries) {
    // Use parseDiceExpression from dice-core
    const expr = parseDiceExpression(entry.dice);
    // Simple roll: sum the dice
    const sides = parseInt(entry.dice.replace(/^\d*d/, ''), 10);
    const count = parseInt(entry.dice.replace(/d\d+$/, ''), 10) || 1;
    const dieType = `d${sides}` as 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

    let entryTotal = 0;
    for (let i = 0; i < count; i++) {
      // Use defaultRandom for now - in game mode, would pass RNG
      entryTotal += defaultRandom.roll(1, sides);
    }
    total += entryTotal + (entry.bonus || 0);
  }
  return total;
}

/**
 * Estimate damage from a flat damage string
 * Returns average damage for deterministic calculation
 */
function estimateDamageFromString(damageStr: string): number {
  const match = damageStr.match(/^(\d*)d(\d+)(?:([+-])(\d+))?$/i);
  if (!match) return 0;

  const count = parseInt(match[1] || '1');
  const sides = parseInt(match[2] || '1');
  const sign = match[3] === '-' ? -1 : 1;
  const modifier = match[4] ? parseInt(match[4]) * sign : 0;

  // Return average damage for deterministic calculation
  const avgDice = count * (sides + 1) / 2;
  return Math.floor(avgDice + modifier);
}

// ── HP Management ────────────────────────────────────────────

/**
 * Initialize a monster for combat by setting current HP to max
 *
 * @param monster - Monster object
 * @returns New monster with currentHP set to max HP
 *
 * @example
 * const combatMonster = initializeMonsterForCombat(goblin);
 * combatMonster.currentHP // 7 (full HP)
 */
export function initializeMonsterForCombat(monster: Monster): Monster {
  return {
    ...monster,
    currentHP: monster.hitPoints.value,
    temporaryHP: 0,
  };
}

/**
 * Modify monster HP (damage or healing)
 * Handles temporary HP, damage defenses (resistances/immunities/vulnerabilities)
 *
 * @param monster - Monster object
 * @param delta - HP change (negative = damage, positive = healing)
 * @param damageType - Damage type (for typed damage)
 * @param data - DataLoader (for additional defenses)
 * @returns New monster with updated HP
 *
 * @example
 * modifyMonsterHP(goblin, -5, 'Slashing', data) // Apply 5 slashing damage
 * modifyMonsterHP(goblin, 3) // Heal 3 HP
 */
export function modifyMonsterHP(
  monster: Monster,
  delta: number,
  damageType?: DamageType,
  _data?: DataLoader
): Monster {
  // Get defenses from monster or empty
  const defenses: DamageDefenses = monster.damageDefenses || emptyDefenses();

  // Apply damage type modifiers if provided
  let effectiveDelta = delta;
  if (damageType !== undefined && delta < 0) {
    const result = calculateTypedDamage(Math.abs(delta), damageType, defenses);
    effectiveDelta = -result.effectiveDamage;
  }

  const currentHP = monster.currentHP ?? monster.hitPoints.value;
  const temporaryHP = monster.temporaryHP ?? 0;

  const { currentHP: newCurrent, temporaryHP: newTemporary } = applyHPChange(
    currentHP,
    monster.hitPoints.value,
    temporaryHP,
    effectiveDelta
  );

  return {
    ...monster,
    currentHP: newCurrent,
    temporaryHP: newTemporary,
  };
}

/**
 * Apply typed damage to monster and return damage result
 * Combines defense calculation with HP modification
 *
 * @param monster - Monster object
 * @param damage - Raw damage amount
 * @param damageType - Damage type
 * @returns { monster, result } - Updated monster and damage result
 *
 * @example
 * const { monster, result } = applyMonsterTypedDamage(dragon, 20, 'Fire');
 * result.effectiveDamage // 0 (if immune to fire)
 * monster.currentHP // reduced by 0
 */
export function applyMonsterTypedDamage(
  monster: Monster,
  damage: number,
  damageType: DamageType
): { monster: Monster; result: DamageResult } {
  const defenses: DamageDefenses = monster.damageDefenses || emptyDefenses();

  const currentHP = monster.currentHP ?? monster.hitPoints.value;
  const temporaryHP = monster.temporaryHP ?? 0;

  const { currentHP: newCurrent, temporaryHP: newTemporary, result } = applyTypedDamageToHP(
    currentHP,
    monster.hitPoints.value,
    temporaryHP,
    damage,
    damageType,
    defenses
  );

  const updatedMonster = {
    ...monster,
    currentHP: newCurrent,
    temporaryHP: newTemporary,
  };

  return { monster: updatedMonster, result };
}

/**
 * Set temporary HP for monster
 *
 * @param monster - Monster object
 * @param value - Temporary HP value
 * @returns New monster with updated temporary HP
 */
export function setMonsterTemporaryHP(monster: Monster, value: number): Monster {
  const newTemp = setTemporaryHPShared(monster.temporaryHP ?? 0, value);
  return {
    ...monster,
    temporaryHP: newTemp,
  };
}

// ── Combat Helpers ───────────────────────────────────────────

/**
 * Check if monster is defeated (HP <= 0)
 *
 * @param monster - Monster object
 * @returns True if monster is defeated
 */
export function isMonsterDefeated(monster: Monster): boolean {
  const currentHP = monster.currentHP ?? monster.hitPoints.value;
  return isDefeatedShared(currentHP);
}

/**
 * Calculate attack roll for monster
 * Uses the new dice system (dice-entity layer)
 *
 * @param attack - MonsterAttack
 * @param monster - Monster object
 * @param data - DataLoader
 * @param rng - Random provider (defaults to defaultRandom)
 * @returns Attack roll result (d20 + bonus)
 *
 * @example
 * const roll = rollMonsterAttack(goblinAttack, goblin, data);
 * // e.g., { d20: 15, total: 19, critical: false }
 */
export function rollMonsterAttack(
  attack: MonsterAttack,
  monster: Monster,
  data: DataLoader,
  rng = defaultRandom
): { d20: number; total: number; critical: boolean } {
  const attackBonus = attack.attackBonus ?? calculateMonsterAttackBonus(monster, attack, data);

  const result = rollMonsterAttackEntity({
    monster,
    attackBonus,
    rng,
  });

  return {
    d20: result.rawRoll,
    total: result.total,
    critical: result.isCritical,
  };
}

/**
 * Get monster AC (for attack targeting)
 *
 * @param monster - Monster object
 * @returns Armor Class value
 */
export function getMonsterAC(monster: Monster): number {
  if (monster.armorClass.length === 0) return 10;
  return Math.max(...monster.armorClass.map(entry => entry.value));
}

// ── Damage Defenses Helpers ──────────────────────────────────

/**
 * Add damage resistance to monster
 *
 * @param monster - Monster object
 * @param damageType - Damage type to resist
 * @returns New monster with added resistance
 */
export function addMonsterDamageResistance(
  monster: Monster,
  damageType: DamageType
): Monster {
  const defenses: DamageDefenses = monster.damageDefenses || emptyDefenses();
  const newDefenses = addDamageResistance(defenses, damageType);

  if (newDefenses === defenses) return monster;

  return {
    ...monster,
    damageDefenses: newDefenses,
  };
}

/**
 * Add damage immunity to monster
 *
 * @param monster - Monster object
 * @param damageType - Damage type to be immune to
 * @returns New monster with added immunity
 */
export function addMonsterDamageImmunity(
  monster: Monster,
  damageType: DamageType
): Monster {
  const defenses: DamageDefenses = monster.damageDefenses || emptyDefenses();
  const newDefenses = addDamageImmunity(defenses, damageType);

  if (newDefenses === defenses) return monster;

  return {
    ...monster,
    damageDefenses: newDefenses,
  };
}

/**
 * Add damage vulnerability to monster
 *
 * @param monster - Monster object
 * @param damageType - Damage type to be vulnerable to
 * @returns New monster with added vulnerability
 */
export function addMonsterDamageVulnerability(
  monster: Monster,
  damageType: DamageType
): Monster {
  const defenses: DamageDefenses = monster.damageDefenses || emptyDefenses();
  const newDefenses = addDamageVulnerability(defenses, damageType);

  if (newDefenses === defenses) return monster;

  return {
    ...monster,
    damageDefenses: newDefenses,
  };
}
