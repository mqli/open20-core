// engine/concentration.ts
// Concentration tracking and enforcement — pure functions and types
// Corresponds to SRD §Spells: Concentration rules

import type { Character } from '../types/character';
import type { CheckResult } from '../dice/mechanics';

/**
 * Check if a character is currently concentrating on a spell
 *
 * @param char - The character to check
 * @returns True if the character has the 'Concentrating' condition
 *
 * @example
 * isConcentrating(char) // true if concentrating on a spell
 */
export function isConcentrating(char: Character): boolean {
  return char.conditions.some(c => c.id === 'Concentrating');
}

/**
 * Get the spell ID that the character is concentrating on
 *
 * @param char - The character to check
 * @returns The spell ID from the condition source, or null if not concentrating
 *
 * @example
 * getConcentratingSpellId(char) // 'bless' or null
 */
export function getConcentratingSpellId(char: Character): string | null {
  const condition = char.conditions.find(c => c.id === 'Concentrating');
  if (!condition) return null;
  return condition.source || null;
}

/**
 * Calculate the concentration check DC
 * SRD: "If the save fails, the spell ends. The DC equals 10 or half the damage taken, whichever is higher."
 *
 * @param damageAmount - Amount of damage taken
 * @returns The DC for the concentration check
 *
 * @example
 * calculateConcentrationDC(8)  // 10 (10 > floor(8/2))
 * calculateConcentrationDC(20) // 10 (10 == floor(20/2))
 * calculateConcentrationDC(25) // 12 (floor(25/2) = 12 > 10)
 */
export function calculateConcentrationDC(damageAmount: number): number {
  const halfDamage = Math.floor(damageAmount / 2);
  return Math.max(10, halfDamage);
}

/**
 * Result of a concentration check
 */
export interface ConcentrationCheckResult {
  /** The check result (includes roll, bonus, total, success) */
  readonly check: CheckResult;
  /** The DC that was rolled against */
  readonly dc: number;
  /** Whether the concentration was maintained (true = success, false = spell ends) */
  readonly maintained: boolean;
}
