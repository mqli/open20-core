// types/monster.ts
// Monster-related types for D&D 5e monster support

import type { BaseAttack } from './attack';
import type { DamageType } from './damage';

// Monster size categories
export type MonsterSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

// Monster type categories (D&D 5e SRD)
export type MonsterType =
  | 'Aberration'
  | 'Beast'
  | 'Celestial'
  | 'Construct'
  | 'Dragon'
  | 'Elemental'
  | 'Fey'
  | 'Fiend'
  | 'Giant'
  | 'Humanoid'
  | 'Monstrosity'
  | 'Ooze'
  | 'Plant'
  | 'Undead';

// Challenge Rating (can be fractional)
export type ChallengeRating = number | '1/8' | '1/4' | '1/2';

// Monster attack (extends BaseAttack with reach/range)
export interface MonsterAttack extends BaseAttack {
  readonly reach?: number;
  readonly range?: { normal: number; long?: number };
  readonly damageEntries: readonly MonsterDamageEntry[];
}

// Structured damage entry for monster attacks
export interface MonsterDamageEntry {
  readonly dice: string; // e.g., "1d6"
  readonly type: DamageType;
  readonly bonus?: number; // e.g., +2 from Str mod
}
