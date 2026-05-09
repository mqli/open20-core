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
export type { CombatStats, Attack, ActiveCondition, ConditionName } from './types';
export type { DieType } from './types';

// ── Data (Browser-compatible loader) ──────────────────────────────
export type { DataLoader, LookupTables } from './data';
export { createBrowserDataLoader } from './data/browser-loader';

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

// ── Dice Rolling ──────────────────────────────────────
export type {
  RandomProvider,
  AttackModifier,
  AttackRollResult,
  SkillCheckResult,
  SavingThrowResult,
  DamageRollResult,
  DamageRollEntry,
  DamageModifier,
} from './engine';
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
} from './engine';
