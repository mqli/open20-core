// src/browser-index.ts
// Browser-compatible entry point (excludes Node.js storage)
// Use this for browser bundling

// ── Types ────────────────────────────────────────────────────────
export type { Character, CharacterClass, HitPoints, DeathSaves, Currency } from './types';
export type { AbilityName, AbilityScores } from './types';
export type { Species, SpeciesTrait, SpeciesSubtype } from './types';
export type { Background } from './types';
export type { Class, Subclass, Feature, Spellcasting } from './types';
export type { Feat, FeatCategory } from './types';
export type { Weapon, Armor, GearItem, EquipmentItem } from './types';
export type { Spell, CharacterSpells, SpellSlotEntry, PactMagicSlots } from './types';
export type { Resource, ResetType } from './types';
export type { CombatStats, CharacterAttack, ActiveCondition, ConditionName } from './types';
export type { BaseAttack } from './types';
// DieType is now exported from './engine' (dice-core)

// ── Data (Browser-compatible loader) ──────────────────────────────
export type { DataLoader, LookupTables } from './data';
export { createBrowserDataLoader } from './data/browser-loader';

// ── Content (R26: Content Pack Types only, no IO) ─────
export type { ContentPack, ContentPackMeta } from './content';

// ── Engine (pure functions) ──────────────────────────────────────
export { getModifier, getTotalScore } from './engine';
export { getProficiencyBonus } from './engine';
export { getSkillBonus, getAllSkillBonuses } from './engine';
export { getSavingThrowBonus } from './engine';
export { calculateAC } from './engine';
export {
  getHitDieFixedValue,
  calculateHPAtLevel1,
  calculateHPIncrement,
  calculateMaxHP,
} from './engine';
export {
  calculateSpellSlots,
  calculatePactMagic,
  getMulticlassSpellcasterLevel,
  calculateMulticlassSpellSlots,
} from './engine';
export type { SpellSlotEntry as SpellSlotEntryEngine, PactMagicResult } from './engine';
export { calculateInitiative } from './engine';
export { calculatePassivePerception } from './engine';
export { calculateAttacks } from './engine';

// ── Character (state management) ─────────────────────────────────
export { createCharacter } from './character';
export { levelUp } from './character';
export { shortRest, longRest } from './character';
export {
  modifyHP,
  setTemporaryHP,
  consumeResource,
  recoverResource,
  consumeSpellSlot,
  recoverSpellSlot,
  toggleCondition,
  equipItem,
  unequipItem,
  equipItemAndRecompute,
  unequipItemAndRecompute,
  prepareSpell,
  unprepareSpell,
  addEquipment,
  removeEquipment,
  modifyCurrency,
} from './character';
export { validateCharacter } from './character';
export { recomputeDerivedStats } from './character';

// ── Dice Rolling (New Layered Architecture) ───────────
// Layer 1: Core Dice
export type {
  RandomProvider,
  DieType,
  DiceRollResult,
  RollModifier,
  DiceTerm,
  DiceExpression,
} from './engine';
export {
  rollDie,
  rollDice,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollD20WithModifier,
  parseDiceExpression,
  rollExpression,
  rollDiceExpression,
  defaultRandom,
  createDeterministicRNG,
} from './engine';

// Layer 2: Game Mechanics
export type {
  RollResult,
  CheckResult,
  SkillCheckParams,
  SavingThrowParams,
  AttackRollParams,
  AttackRollResult,
  DamageRollParams,
  DamageEntry,
  DamageRollResult,
  InitiativeRollParams,
} from './engine';
export {
  rollSkillCheck,
  rollSavingThrow,
  rollAttack,
  rollDamage,
  rollInitiative,
} from './engine';

// Layer 4: Application (rolls module)
export type {
  CharacterSkillCheckParams,
  CharacterSavingThrowParams,
  CharacterAttackParams,
  CharacterWeaponDamageParams,
  SpellAttackParams,
  SpellDamageParams,
  MonsterAttackParams,
  MonsterDamageParams,
  MonsterFullAttackParams,
  CharacterInitiativeParams,
  MonsterInitiativeParams,
} from './rolls';
export {
  rollCharacterSkillCheck,
  rollCharacterSavingThrow,
  rollCharacterAttack,
  rollCharacterWeaponDamage,
  rollSpellAttack,
  rollSpellDamage,
  rollCharacterInitiative,
  rollMonsterAttack,
  rollMonsterDamage,
  rollMonsterAttackDamage,
  rollMonsterFullAttack,
  rollMonsterInitiative,
} from './rolls';
