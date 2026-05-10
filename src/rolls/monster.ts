// rolls/monster.ts
// Layer 4: Application — Apply game mechanics to Monster entities
// Depends on: L1 (dice/core), L2 (dice/mechanics), L3 (monster/*)

import type { Monster } from '../monster/types';
import type { MonsterAttack } from '../types/monster';
import type { DamageType } from '../types/damage';
import type { RandomProvider } from '../dice/core';
import type { AttackRollResult, DamageRollResult, RollResult } from '../dice/mechanics';
import {
  rollAttack,
  rollDamage,
  rollInitiative,
  type AttackRollParams,
  type DamageRollParams,
  type InitiativeRollParams,
} from '../dice/mechanics';
import { defaultRandom, parseDiceExpression } from '../dice/core';
import { calculateMonsterAttackBonus } from '../monster/calculator';

// ── Monster Attack Roll ─────────────────────────────────

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
  return rollAttack({
    attackBonus: params.attackBonus,
    rollModifier: params.rollModifier ?? 'none',
    targetAC: params.targetAC,
    rng: params.rng,
  });
}

// ── Monster Damage Roll ──────────────────────────────────

export interface MonsterDamageParams {
  entries: DamageRollParams['entries']; // Array of damage entries
  isCritical?: boolean;
  rng: RandomProvider;
}

/**
 * Roll damage for a monster attack
 */
export function rollMonsterDamage(
  params: MonsterDamageParams
): DamageRollResult {
  return rollDamage({
    entries: params.entries,
    isCritical: params.isCritical,
    rng: params.rng,
  });
}

// ── Monster Attack Damage (from attack definition) ─────────────

/**
 * Roll damage for a monster attack
 * Uses the new dice system (dice-core layer)
 *
 * @param attack - MonsterAttack with damageEntries
 * @returns Total damage (dice roll + bonuses)
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

// ── Monster Full Attack (full roll with attack bonus calculation) ─────────────

export interface MonsterFullAttackParams {
  attack: MonsterAttack;
  monster: Monster;
  data: import('../data/loader').DataLoader;
  rng?: RandomProvider;
}

/**
 * Calculate attack roll for monster
 * Uses the new dice system (dice-mechanics layer)
 *
 * @param params - Attack parameters
 * @returns Attack roll result (d20 + bonus)
 */
export function rollMonsterFullAttack(
  params: MonsterFullAttackParams
): { d20: number; total: number; critical: boolean } {
  const { attack, monster, data, rng = defaultRandom } = params;
  const attackBonus = attack.attackBonus ?? calculateMonsterAttackBonus(monster, attack, data);

  const result = rollMonsterAttack({
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

  return rollInitiative({
    dexterityMod,
    rollModifier,
    rng,
  });
}
