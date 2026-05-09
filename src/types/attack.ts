// types/attack.ts
// Base attack interface — shared between Character and Monster

/**
 * Base attack interface
 * Shared properties between Character attacks and Monster attacks
 */
export interface BaseAttack {
  readonly name: string;
  readonly attackBonus: number;
  readonly damage: string; // e.g., "1d8+4"
  readonly damageType: string; // e.g., "Slashing"
}
