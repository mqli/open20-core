// engine/combat.ts
// Shared combat helpers for both Character and Monster
// Consolidates HP manipulation logic to ensure API consistency
// Corresponds to PRD §4.5

import type { DamageType, DamageDefenses, DamageResult } from '../types/damage';
import { calculateTypedDamage } from './damage-calculator';

// ── HP Manipulation Helpers ────────────────────────────────────────

/**
 * Apply HP change (damage or healing) with temporary HP logic.
 * Shared by both Character and Monster modules.
 *
 * Rules:
 * - Damage is applied to temporary HP first
 * - Healing cannot exceed max HP
 * - Damage cannot reduce HP below 0
 *
 * @param currentHP - Current hit points
 * @param maxHP - Maximum hit points
 * @param temporaryHP - Current temporary hit points
 * @param delta - HP change (negative = damage, positive = healing)
 * @returns Updated { currentHP, temporaryHP }
 *
 * @example
 * applyHPChange(7, 10, 3, -5) // { currentHP: 7, temporaryHP: 0 } - 3 absorbed by temp, 2 by current
 * applyHPChange(7, 10, 0, 3)  // { currentHP: 10, temporaryHP: 0 } - healed to max
 */
export function applyHPChange(
  currentHP: number,
  maxHP: number,
  temporaryHP: number,
  delta: number
): { currentHP: number; temporaryHP: number } {
  let remaining = delta;
  let newTemporary = temporaryHP;
  let newCurrent = currentHP;

  // Damage: subtract from temporary HP first
  if (remaining < 0 && newTemporary > 0) {
    const tempAbsorbed = Math.min(newTemporary, Math.abs(remaining));
    newTemporary -= tempAbsorbed;
    remaining += tempAbsorbed; // Reduce damage by amount absorbed
  }

  // Apply remaining damage/healing to current HP
  newCurrent = Math.max(0, Math.min(newCurrent + remaining, maxHP));

  return { currentHP: newCurrent, temporaryHP: newTemporary };
}

/**
 * Apply typed damage with defense calculations.
 * Shared by both Character and Monster modules.
 *
 * @param currentHP - Current hit points
 * @param maxHP - Maximum hit points
 * @param temporaryHP - Current temporary hit points
 * @param damage - Raw damage amount (positive)
 * @param damageType - Type of damage
 * @param defenses - Damage defenses (resistances, immunities, vulnerabilities)
 * @returns { currentHP, temporaryHP, result }
 *
 * @example
 * const { currentHP, temporaryHP, result } = applyTypedDamageToHP(
 *   50, 100, 0, 20, 'Fire', { resistances: ['Fire'], immunities: [], vulnerabilities: [] }
 * );
 * // result.effectiveDamage = 10 (half due to resistance)
 * // currentHP = 40
 */
export function applyTypedDamageToHP(
  currentHP: number,
  maxHP: number,
  temporaryHP: number,
  damage: number,
  damageType: DamageType,
  defenses: DamageDefenses
): { currentHP: number; temporaryHP: number; result: DamageResult } {
  const result = calculateTypedDamage(damage, damageType, defenses);
  const hpResult = applyHPChange(currentHP, maxHP, temporaryHP, -result.effectiveDamage);

  return {
    currentHP: hpResult.currentHP,
    temporaryHP: hpResult.temporaryHP,
    result,
  };
}

/**
 * Set temporary HP to a specific value (explicit set operation).
 * To follow D&D 5e rules for "gaining" temp HP (take higher),
 * use Math.max(current, value) at the call site.
 *
 * @param currentTempHP - Current temporary HP (unused, kept for API consistency)
 * @param value - New temporary HP value
 * @returns New temporary HP value (clamped to 0)
 */
export function setTemporaryHPShared(_currentTempHP: number, value: number): number {
  return Math.max(0, value);
}

/**
 * Check if an entity is defeated (HP <= 0).
 *
 * @param currentHP - Current hit points
 * @returns True if defeated
 */
export function isDefeatedShared(currentHP: number): boolean {
  return currentHP <= 0;
}

// ── HP Accessor Helpers ─────────────────────────────────────────────
// These provide consistent API for accessing HP across Character and Monster

/**
 * Get current HP for a Character.
 */
export function getCharacterCurrentHP(char: { hitPoints: { current: number } }): number {
  return char.hitPoints.current;
}

/**
 * Get max HP for a Character.
 */
export function getCharacterMaxHP(char: { hitPoints: { max: number } }): number {
  return char.hitPoints.max;
}

/**
 * Get temporary HP for a Character.
 */
export function getCharacterTemporaryHP(char: { hitPoints: { temporary: number } }): number {
  return char.hitPoints.temporary;
}

/**
 * Get current HP for a Monster.
 */
export function getMonsterCurrentHP(monster: { currentHP?: number; hitPoints: { value: number } }): number {
  return monster.currentHP ?? monster.hitPoints.value;
}

/**
 * Get max HP for a Monster.
 */
export function getMonsterMaxHP(monster: { hitPoints: { value: number } }): number {
  return monster.hitPoints.value;
}

/**
 * Get temporary HP for a Monster.
 */
export function getMonsterTemporaryHP(monster: { temporaryHP?: number }): number {
  return monster.temporaryHP ?? 0;
}

// ── Damage Defense Helpers ──────────────────────────────────────────

/**
 * Add a damage resistance to defenses.
 * Returns new defenses object (immutable).
 */
export function addDamageResistance(
  defenses: DamageDefenses,
  damageType: DamageType
): DamageDefenses {
  if (defenses.resistances.includes(damageType)) return defenses;
  return {
    ...defenses,
    resistances: [...defenses.resistances, damageType],
  };
}

/**
 * Add a damage immunity to defenses.
 * Returns new defenses object (immutable).
 */
export function addDamageImmunity(
  defenses: DamageDefenses,
  damageType: DamageType
): DamageDefenses {
  if (defenses.immunities.includes(damageType)) return defenses;
  return {
    ...defenses,
    immunities: [...defenses.immunities, damageType],
  };
}

/**
 * Add a damage vulnerability to defenses.
 * Returns new defenses object (immutable).
 */
export function addDamageVulnerability(
  defenses: DamageDefenses,
  damageType: DamageType
): DamageDefenses {
  if (defenses.vulnerabilities.includes(damageType)) return defenses;
  return {
    ...defenses,
    vulnerabilities: [...defenses.vulnerabilities, damageType],
  };
}

/**
 * Get empty defenses object.
 */
export function emptyDefenses(): DamageDefenses {
  return { resistances: [], immunities: [], vulnerabilities: [] };
}

/**
 * Merge two DamageDefenses objects.
 * Deduplicates entries.
 */
export function mergeDefenses(a: DamageDefenses, b: DamageDefenses): DamageDefenses {
  return {
    resistances: [...new Set([...a.resistances, ...b.resistances])],
    immunities: [...new Set([...a.immunities, ...b.immunities])],
    vulnerabilities: [...new Set([...a.vulnerabilities, ...b.vulnerabilities])],
  };
}
