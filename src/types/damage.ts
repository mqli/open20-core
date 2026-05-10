// types/damage.ts
// Damage type definitions (zero dependencies)

// 伤害类型 (5e标准)
export type DamageType =
  | 'Bludgeoning'
  | 'Piercing'
  | 'Slashing' // Physical
  | 'Fire'
  | 'Cold'
  | 'Lightning'
  | 'Thunder'
  | 'Acid'
  | 'Poison'
  | 'Psychic'
  | 'Force'
  | 'Necrotic'
  | 'Radiant'; // Magical/Elemental

/**
 * Damage defense modifiers
 */
export interface DamageDefenses {
  readonly resistances: readonly DamageType[];
  readonly immunities: readonly DamageType[];
  readonly vulnerabilities: readonly DamageType[];
}

/**
 * Source of a damage defense
 */
export interface DamageDefenseSource {
  readonly source: string;
  readonly type: 'species' | 'class' | 'equipment' | 'condition' | 'spell' | 'custom';
  readonly defenses: DamageDefenses;
}

/**
 * Result of applying typed damage
 */
export interface DamageResult {
  readonly originalDamage: number;
  readonly effectiveDamage: number; // After defenses applied
  readonly modifiers: readonly {
    readonly type: 'resistance' | 'immunity' | 'vulnerability';
    readonly damageType: DamageType;
  }[];
}

/**
 * Structured damage entry for attacks
 * Supports multiple damage types per attack (e.g., flame tongue: 1d6 slashing + 1d6 fire)
 */
export interface DamageEntry {
  readonly dice: string; // e.g., "1d6"
  readonly type: DamageType;
  readonly bonus?: number; // e.g., +2 from Str mod
}
