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
  rollDie,
  rollDice,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollAttack,
  rollSkillCheck,
  rollSavingThrow,
  rollWeaponDamage,
  rollSpellDamage,
  defaultRandom,
} from './dice';
export type {
  RandomProvider,
  AttackModifier,
  AttackRollResult,
  SkillCheckResult,
  SavingThrowResult,
  DamageRollResult,
  DamageRollEntry,
  DamageModifier,
} from './dice';

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
