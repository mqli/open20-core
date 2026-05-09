// monsters/calculator.ts
// Monster calculation functions — CR-based proficiency, attack bonus, save DC

import type { Monster } from './types';
import type { ChallengeRating } from '../types/monster';
import type { AbilityName } from '../types/ability';
import type { DataLoader } from '../data/loader';
import { getModifier, getTotalScore } from '../engine/ability-modifier';

// ── Proficiency Bonus by CR ────────────────────────────────

/**
 * Get monster proficiency bonus based on Challenge Rating
 * 
 * D&D 5e Rules:
 * - CR 0-4: +2
 * - CR 5-8: +3
 * - CR 9-12: +4
 * - CR 13-16: +5
 * - CR 17-20: +6
 * - CR 21-24: +7
 * - CR 25-28: +8
 * - CR 29-30: +9
 *
 * @param cr - Challenge Rating
 * @returns Proficiency bonus
 *
 * @example
 * getMonsterProficiencyBonus(1) // 2
 * getMonsterProficiencyBonus(5) // 3
 */
export function getMonsterProficiencyBonus(cr: ChallengeRating): number {
  const numericCR = crToNumber(cr);
  
  if (numericCR >= 29) return 9;
  if (numericCR >= 25) return 8;
  if (numericCR >= 21) return 7;
  if (numericCR >= 17) return 6;
  if (numericCR >= 13) return 5;
  if (numericCR >= 9) return 4;
  if (numericCR >= 5) return 3;
  return 2;
}

// ── Attack Bonus ─────────────────────────────────────────────

/**
 * Calculate monster attack bonus
 * 
 * Most monsters have static attack bonus in their stat block,
 * but this function can calculate it based on ability mod + proficiency
 *
 * @param monster - Monster object
 * @param attack - MonsterAttack object
 * @param data - DataLoader
 * @returns Attack bonus
 *
 * @example
 * calculateMonsterAttackBonus(goblin, goblin.attacks[0], data) // 4
 */
export function calculateMonsterAttackBonus(
  monster: Monster, 
  attack: import('../types/monster').MonsterAttack, 
  data: DataLoader
): number {
  // If attack has explicit attackBonus, use it
  if (attack.attackBonus !== undefined) {
    return attack.attackBonus;
  }
  
  // Otherwise calculate from ability mod + proficiency
  // Most monsters use Str or Dex for attacks
  const strMod = getModifier(getTotalScore(monster.abilityScores, 'Strength'));
  const dexMod = getModifier(getTotalScore(monster.abilityScores, 'Dexterity'));
  const profBonus = getMonsterProficiencyBonus(monster.challengeRating.rating);
  
  // Default to Str for melee, Dex for ranged
  // This is a simplification - real implementation would need to check weapon properties
  const abilityMod = Math.max(strMod, dexMod);
  return abilityMod + profBonus;
}

// ── Save DC ─────────────────────────────────────────────────

/**
 * Calculate monster save DC
 *
 * @param monster - Monster object
 * @param ability - Ability name
 * @param data - DataLoader
 * @returns Save DC (8 + prof bonus + ability mod)
 *
 * @example
 * calculateMonsterSaveDC(dragon, 'Charisma', data) // 8 + 5 + 5 = 18
 */
export function calculateMonsterSaveDC(
  monster: Monster, 
  ability: AbilityName, 
  data: DataLoader
): number {
  const abilityMod = getModifier(getTotalScore(monster.abilityScores, ability));
  const profBonus = getMonsterProficiencyBonus(monster.challengeRating.rating);
  return 8 + profBonus + abilityMod;
}

// ── AC & HP ─────────────────────────────────────────────────

/**
 * Get monster AC (highest AC entry, or conditional)
 *
 * @param monster - Monster object
 * @param condition - Optional condition (e.g., "while not incapacitated")
 * @returns AC value
 *
 * @example
 * calculateMonsterAC(goblin) // 15
 */
export function calculateMonsterAC(
  monster: Monster, 
  condition?: string
): number {
  if (monster.armorClass.length === 0) return 10;
  
  // If condition specified, try to find matching AC entry
  if (condition) {
    const conditionalEntry = monster.armorClass.find(entry => 
      entry.condition?.toLowerCase().includes(condition.toLowerCase())
    );
    if (conditionalEntry) return conditionalEntry.value;
  }
  
  // Return highest AC
  return Math.max(...monster.armorClass.map(entry => entry.value));
}

/**
 * Get monster HP (static value from stat block)
 *
 * @param monster - Monster object
 * @returns HP value
 *
 * @example
 * calculateMonsterHP(goblin) // 7
 */
export function calculateMonsterHP(monster: Monster): number {
  return monster.hitPoints.value;
}

// ── Helper Functions ─────────────────────────────────────────

/**
 * Convert Challenge Rating to numeric value for comparison
 */
function crToNumber(cr: ChallengeRating): number {
  if (typeof cr === 'number') return cr;
  switch (cr) {
    case '1/8': return 0.125;
    case '1/4': return 0.25;
    case '1/2': return 0.5;
    default: return 0;
  }
}
