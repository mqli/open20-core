// types/attack.ts
// Base attack interface — shared between Character and Monster

/**
 * Base attack interface
 * Shared properties between Character attacks and Monster attacks
 */
export interface BaseAttack {
  readonly name: string;
  readonly attackBonus?: number; // Optional: can be calculated from ability + proficiency
  readonly damage?: string; // Optional: not all attacks deal damage (e.g., Grapple)
  readonly damageType?: string; // Optional: matches damage optionality
}
