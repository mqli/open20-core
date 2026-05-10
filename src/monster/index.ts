// monster/index.ts
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
  AttackNotation,
  SavingThrowEffect,
} from '../types/monster';

// Query functions
export type { MonsterFilter } from './query';
export {
  getMonster,
  searchMonsters,
  getMonstersByCR,
  getMonstersByType,
  getMonstersForParty,
  getMonsterActions,
  getMonsterTraits,
  getMonsterReactions,
  getMonsterLegendaryActions,
  getMonstersWithTrait,
  getLegendaryMonsters,
  getMonsterAllAttacks,
  searchActionsByName,
} from './query';

// Calculator functions
export {
  getMonsterProficiencyBonus,
  calculateMonsterAttackBonus,
  calculateMonsterSaveDC,
  calculateMonsterAC,
  calculateMonsterHP
} from './calculator';

// Combat functions (L3: Entity State Management)
export type { DamageResult } from '../types/damage';
export {
  initializeMonsterForCombat,
  modifyMonsterHP,
  applyMonsterTypedDamage,
  setMonsterTemporaryHP,
  isMonsterDefeated,
  getMonsterAC,
  addMonsterDamageResistance,
  addMonsterDamageImmunity,
  addMonsterDamageVulnerability
} from './combat';

// HP Accessor Helpers (for API consistency with character module)
export {
  getMonsterCurrentHP,
  getMonsterMaxHP,
  getMonsterTemporaryHP,
} from '../engine/combat';
