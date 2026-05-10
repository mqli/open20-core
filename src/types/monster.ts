// types/monster.ts
// Monster-related types for D&D 5e monster support

import type { BaseAttack } from './attack';
import type { AbilityName } from './ability';

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

// R28.7 - Initiative information
export interface InitiativeInfo {
  readonly modifier: number;
  readonly score?: number; // e.g., 14 for "+4 (14)"
}

// R28.7 - Senses information
export interface SensesInfo {
  readonly darkvision?: number; // range in feet
  readonly blindsight?: number;
  readonly tremorsense?: number;
  readonly truesight?: number;
  readonly passivePerception: number;
}

// R28.7 - Challenge Rating with lair XP
export interface ChallengeRatingInfo {
  readonly rating: ChallengeRating;
  readonly xp: number;
  readonly lairXp?: number; // XP when in lair
}

// R28.8 - Attack Notation
export interface AttackNotation {
  readonly hit?: string;
  readonly miss?: string;
  readonly hitOrMiss?: string;
}

// R28.9 - Saving Throw Effect
export interface SavingThrowEffect {
  readonly saveType: AbilityName;
  readonly dc: number;
  readonly description: string;
  readonly onSaveSuccess?: string;
  readonly onSaveFailure: string;
  readonly halfDamageOnSuccess?: boolean;
}

// R28.11 - Spellcasting Details
export interface SpellcastingDetails {
  readonly ignoresComponents?: ('V' | 'S' | 'M')[];
  readonly castingTime?: string;
  readonly restrictions?: string[];
}

// Monster attack (extends BaseAttack with reach/range)
export interface MonsterAttack extends BaseAttack {
  readonly reach?: number;
  readonly range?: { normal: number; long?: number };
  // damageEntries is now inherited from BaseAttack
  
  // R28.10 - Damage Notation
  readonly damageNotation?: {
    readonly fixedValue?: number;
    readonly dieExpression?: string;
  };
}

// R28.11 - Monster Spellcasting
export interface MonsterSpellcasting {
  readonly ability: AbilityName;
  readonly saveDC: number;
  readonly attackBonus?: number;
  readonly ignoresComponents?: readonly ('V' | 'S' | 'M')[];
  readonly atWill?: readonly string[]; // Spells that can be cast at will
  readonly daily?: ReadonlyArray<{ spell: string; times: number }>; // Spells with limited usage
}
