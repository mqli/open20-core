// engine/index.ts
// Barrel export — engine 模块公共API

export { getModifier, getTotalScore } from './ability-modifier';
export { getProficiencyBonus } from './proficiency-bonus';
export { getSkillBonus, getAllSkillBonuses } from './skill-bonus';
export { getSavingThrowBonus } from './saving-throw';
export { calculateAC } from './ac-calculator';
export {
  getHitDieFixedValue,
  calculateHPAtLevel1,
  calculateHPIncrement,
  calculateMaxHP,
} from './hp-calculator';
export {
  calculateSpellSlots,
  calculateSpellSlotsFromClasses,
  calculatePactMagic,
  getMulticlassSpellcasterLevel,
  calculateMulticlassSpellSlots,
} from './spell-slots';
export type { SpellSlotEntry, PactMagicResult } from './spell-slots';
export { calculateInitiative } from './initiative';
export { calculatePassivePerception } from './passive-perception';
export { calculateAttacks } from './attack-calculator';
export {
  buildClassSpellData,
  getMaxSpellLevel,
  getAlwaysPreparedSpellsFromSubclass,
} from './spell-data';
export type { BuildClassSpellDataOpts } from './spell-data';

// ── Dice System (New Layered Architecture) ─────────────
// Import from dice/ folder
export {
  type RandomProvider,
  defaultRandom,
  createDeterministicRNG,
  type DieType,
  type DiceRollResult,
  rollDie,
  rollDice,
  rollWithAdvantage,
  rollWithDisadvantage,
  type RollModifier,
  rollD20WithModifier,
  type DiceTerm,
  type DiceExpression,
  parseDiceExpression,
  rollExpression,
  rollDiceExpression,
  isCriticalHit,
  isCriticalFail,
} from '../dice/core';

export {
  type RollResult,
  type CheckResult,
  type SkillCheckParams,
  type SavingThrowParams,
  type AttackRollParams,
  type AttackRollResult,
  type DamageRollParams,
  type DamageEntry,
  type DamageRollResult,
  type InitiativeRollParams,
  rollSkillCheck,
  rollSavingThrow,
  rollAttack,
  rollDamage,
  rollInitiative,
} from '../dice/mechanics';

// ── Combat Helpers ─────────────────────────────────────
export type { DamageResult, DamageDefenses } from '../types/damage';
export {
  applyHPChange,
  applyTypedDamageToHP,
  setTemporaryHPShared,
  isDefeatedShared,
  getCharacterCurrentHP,
  getCharacterMaxHP,
  getCharacterTemporaryHP,
  getMonsterCurrentHP,
  getMonsterMaxHP,
  getMonsterTemporaryHP,
  addDamageResistance,
  addDamageImmunity,
  addDamageVulnerability,
  emptyDefenses,
  mergeDefenses,
} from './combat';

// ── Concentration Management ────────────────────────
export {
  isConcentrating,
  getConcentratingSpellId,
  calculateConcentrationDC,
  type ConcentrationCheckResult,
} from './concentration';
