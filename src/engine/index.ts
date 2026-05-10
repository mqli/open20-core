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

export {
  type CharacterSkillCheckParams,
  type CharacterSavingThrowParams,
  type CharacterAttackParams,
  type CharacterWeaponDamageParams,
  type SpellAttackParams,
  type SpellDamageParams,
  type MonsterAttackParams,
  type MonsterDamageParams,
  type CharacterInitiativeParams,
  type MonsterInitiativeParams,
  rollCharacterSkillCheck,
  rollCharacterSavingThrow,
  rollCharacterAttack,
  rollCharacterWeaponDamage,
  rollSpellAttack,
  rollSpellDamage,
  rollMonsterAttack,
  rollMonsterDamage,
  rollCharacterInitiative,
  rollMonsterInitiative,
} from '../dice/entity';

// Backward Compatibility (from dice/index.ts)
export {
  rollAttack as rollAttackLegacy,
  rollSkillCheck as rollSkillCheckLegacy,
  rollSavingThrow as rollSavingThrowLegacy,
  rollWeaponDamage as rollWeaponDamageLegacy,
  rollSpellDamage as rollSpellDamageLegacy,
} from '../dice';

// ── Combat Helpers ─────────────────────────────────────
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
