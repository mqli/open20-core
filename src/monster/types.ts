// monsters/types.ts
// Monster data structures for D&D 5e monster support

import type { MonsterSize, MonsterType, ChallengeRating, MonsterAttack, MonsterDamageEntry } from '../types/monster';
import type { AbilityScores } from '../types/ability';
import type { DamageType, DamageDefenses } from '../types/damage';

// ── Main Monster Interface ─────────────────────────────────────

export interface Monster {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly size: MonsterSize;
  readonly type: MonsterType;
  readonly alignment: string;
  readonly armorClass: readonly ArmorClassEntry[];
  readonly hitPoints: HPInfo;
  readonly speed: SpeedInfo;
  readonly abilityScores: AbilityScores;
  readonly challengeRating: ChallengeRatingInfo;
  readonly traits?: readonly MonsterFeature[];
  readonly actions?: readonly MonsterAction[];
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
}

// ── Monster Features (Traits, Actions, Reactions) ────────────

export interface MonsterFeature {
  readonly name: string;
  readonly description: string;
}

export interface MonsterAction {
  readonly name: string;
  readonly description?: string;
  readonly attacks?: readonly MonsterAttack[];
  readonly legendary?: boolean;
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
