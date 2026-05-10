// monsters/types.ts
// Monster data structures for D&D 5e monster support

import type { MonsterSize, MonsterType, ChallengeRating, MonsterAttack, MonsterSpellcasting } from '../types/monster';
import type { AbilityScores } from '../types/ability';
import type { DamageType, DamageDefenses } from '../types/damage';
import type { InitiativeInfo, SensesInfo } from '../types/monster';

// ── Main Monster Interface ─────────────────────────────────────

export interface Monster {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly size: MonsterSize;
  readonly type: MonsterType;
  readonly alignment: string;
  readonly descriptiveTags?: readonly string[]; // R28.7 - e.g., "(Chromatic)"
  readonly armorClass: readonly ArmorClassEntry[];
  readonly hitPoints: HPInfo;
  readonly speed: SpeedInfo;
  readonly initiative?: InitiativeInfo; // R28.7
  readonly abilityScores: AbilityScores;
  readonly savingThrows?: Readonly<Record<string, number>>; // R28.7 - Override save bonuses
  readonly skills?: Readonly<Record<string, number>>; // R28.7 - Skill bonuses
  readonly challengeRating: ChallengeRatingInfo; // Updated for lair XP
  readonly resistances?: readonly DamageType[]; // R28.7 - Separate from damageDefenses
  readonly vulnerabilities?: readonly DamageType[]; // R28.7 - Separate from damageDefenses
  readonly senses?: SensesInfo; // R28.7 - Senses and Passive Perception
  readonly languages?: readonly string[]; // R28.7 - Spoken languages
  readonly gear?: readonly string[]; // R28.7 - Equipment
  readonly spellcasting?: readonly MonsterSpellcasting[]; // R28.11 - Spellcasting details
  readonly traits?: readonly MonsterFeature[];
  readonly actions?: readonly MonsterAction[];
  readonly bonusActions?: readonly MonsterAction[]; // R28.7 - Separate from actions
  readonly reactions?: readonly MonsterReaction[];
  readonly legendaryActions?: readonly MonsterLegendaryAction[];
  readonly environments?: readonly string[];
  // Damage defenses (optional, not all monsters have them)
  readonly damageDefenses?: DamageDefenses;
  // Condition immunities (common in monsters)
  readonly conditionImmunities?: readonly string[];
  // Current HP for combat (not part of stat block, used during combat)
  readonly currentHP?: number;
  readonly temporaryHP?: number;
}

// ── HP & AC ──────────────────────────────────────────────────

export interface HPInfo {
  readonly value: number;
  readonly formula?: string; // e.g., "2d6+2"
}

export interface ArmorClassEntry {
  readonly value: number;
  readonly type: string; // e.g., "natural armor", "hide armor"
  readonly condition?: string; // e.g., "while not incapacitated"
}

// ── Speed ─────────────────────────────────────────────────────

export interface SpeedInfo {
  readonly walk?: number;
  readonly burrow?: number;
  readonly climb?: number;
  readonly fly?: number;
  readonly swim?: number;
  readonly hover?: boolean;
}

// ── Challenge Rating ─────────────────────────────────────────

export interface ChallengeRatingInfo {
  readonly rating: ChallengeRating;
  readonly xp: number;
  readonly lairXp?: number; // R28.7 - XP when in lair
}

// ── Monster Features (Traits, Actions, Reactions) ────────────

export interface MonsterFeature {
  readonly name: string;
  readonly description: string;
}

import type { AttackNotation, SavingThrowEffect } from '../types/monster';

export interface MonsterAction {
  readonly name: string;
  readonly description?: string;
  readonly attacks?: readonly MonsterAttack[];
  readonly legendary?: boolean;
  
  // R28.8 - Attack Notation
  readonly attackNotation?: AttackNotation;
  
  // R28.9 - Saving Throw Effect
  readonly savingThrowEffect?: SavingThrowEffect;
  
  // R28.12 - Limited Usage
  readonly limitedUsage?: {
    readonly type: 'x_per_day' | 'recharge' | 'recharge_after_rest';
    readonly uses?: number;  // for x_per_day
    readonly rechargeRange?: readonly [number, number];  // for recharge
    readonly rechargeOn?: 'short_rest' | 'long_rest';  // for recharge_after_rest
  };
}

export interface MonsterReaction {
  readonly name: string;
  readonly description: string;
}

export interface MonsterLegendaryAction {
  readonly name: string;
  readonly description: string;
  readonly cost?: number; // Default 1, some cost 2 or 3
}
