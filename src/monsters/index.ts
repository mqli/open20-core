// monsters/index.ts
// Barrel export — public API for monster module

// Types from local types.ts
export type {
  Monster,
  HPInfo,
  ArmorClassEntry,
  SpeedInfo,
  ChallengeRatingInfo,
  MonsterFeature,
  MonsterAction,
  MonsterReaction,
  MonsterLegendaryAction
} from './types';

// Types from shared types/monster.ts
export type {
  MonsterSize,
  MonsterType,
  ChallengeRating,
  MonsterAttack,
  MonsterDamageEntry
} from '../types/monster';

// Query functions
export type { MonsterFilter } from './query';
export {
  getMonster,
  searchMonsters,
  getMonstersByCR,
  getMonstersByType,
  getMonstersForParty
} from './query';

// Calculator functions
export {
  getMonsterProficiencyBonus,
  calculateMonsterAttackBonus,
  calculateMonsterSaveDC,
  calculateMonsterAC,
  calculateMonsterHP
} from './calculator';
