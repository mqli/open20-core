// src/index.ts
// Top-level barrel export — public API per HLD §12.1
// Single entry point for both Node.js and browser environments

// ── Types ─────────────────────────────────────────────────
export type { Character, CharacterClass, HitPoints, DeathSaves, Currency } from './types';
export type { AbilityName, AbilityScores } from './types';
export type { Species, SpeciesTrait, SpeciesSubtype } from './types';
export type { Background } from './types';
export type { Class, Subclass, Feature, Spellcasting } from './types';
export type { Feat, FeatCategory, FeatSpellSelection, FeatSpellChoice, CharacterFeatEntry } from './types/feat';
export type { Weapon, Armor, GearItem, EquipmentItem } from './types';
export type { Spell, CharacterSpells, ClassSpellData, AlwaysPreparedSpells, SpellSlotEntry, PactMagicSlots, FeatSpellsEntry } from './types/spell';
export type { Resource, ResetType } from './types';
export type { CombatStats, CharacterAttack, ActiveCondition, ConditionName } from './types';
export type { BaseAttack } from './types';

// ── Data Loaders ────────────────────────────────────────
export type { DataLoader, LookupTables } from './data';
export { createDataLoader } from './data';

// ── Content (R26: Content Pack Management) ─────────
export type { ContentPack, ContentPackMeta } from './content';
// Note: exportContentPack, importContentPack, loadContentPack are Node.js-only
// Import directly from 'open20-core/content/io' when needed in Node.js environment

// ── Engine (pure functions) ─────────────────────────────
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
  calculateSpellSlotsFromClasses,
  calculatePactMagic,
  getMulticlassSpellcasterLevel,
  calculateMulticlassSpellSlots,
} from './engine';
export type { SpellSlotEntry as SpellSlotEntryEngine, PactMagicResult } from './engine';
export { calculateInitiative } from './engine';
export { calculatePassivePerception } from './engine';
export { calculateAttacks } from './engine';

// ── Engine: Critical Hit/Fail Helpers ────────────────
export { isCriticalHit, isCriticalFail } from './engine';

// ── Engine: Concentration Management ─────────────────
export type { ConcentrationCheckResult } from './engine';
export {
  isConcentrating,
  getConcentratingSpellId,
  calculateConcentrationDC,
} from './engine';

// ── Engine: Combat Helpers ───────────────────────────
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
} from './engine';

// ── Character: Spell Casting ────────────────────────
export {
  canCastAsRitual,
  castAsRitual,
  getRitualCastingTime,
  isCantrip,
  canCastCantrip,
  canUpcast,
  getUpcastDescription,
  castSpell,
} from './character';

// ── Character (state management) ────────────────────────
export { createCharacter, getAlwaysPreparedSpellsFromSubclass } from './character';
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
  startConcentration,
  endConcentration,
  makeConcentrationCheck,
  addAlwaysPreparedSpell,
  removeAlwaysPreparedSpell,
  addKnownSpell,
  removeKnownSpell,
  equipItem,
  unequipItem,
  equipItemAndRecompute,
  unequipItemAndRecompute,
  prepareSpell,
  unprepareSpell,
  prepareSpellForClass,
  unprepareSpellForClass,
  addEquipment,
  removeEquipment,
  modifyCurrency,
} from './character';
export { validateCharacter } from './character';
export { recomputeDerivedStats } from './character';

// ── Character: Feat Validation ─────────────────────────
export type { FeatValidationResult } from './character/feat-validator';
export { validateFeatPrerequisites, canTakeFeat } from './character/feat-validator';

// ── Character: Feat Mutations ──────────────────────────
export type { AddFeatOptions } from './character/feat-mutate';
export {
  addFeat,
  removeFeat,
  updateFeatChoices,
  updateFeatSpellChoices,
  getFeatSpecialAbilities,
} from './character/feat-mutate';

// ── Spells (query + preparation rules) ─────────────────
export type { SpellFilter } from './spells';
export {
  getSpell as getSpellData,
  searchSpells,
  getSpellsByClass,
  getKnownSpellsForClass,
  getSpellsForCharacter,
  getPreparedSpells,
  isSpellPrepared,
  knowsSpell,
  getClassSpellData,
  knowsSpellForClass,
  isSpellPreparedForClass,
  isClassListCaster,
  isSpellbookCaster,
  canChangeSpellsOnLongRest,
  canChangeSpellsOnLevelUp,
  canCastSpell,
} from './spells';

// ── Monsters (query + combat) ─────────────────────────
export type {
  Monster,
  MonsterSize,
  MonsterType,
  ChallengeRating,
  MonsterAttack,
  MonsterAction,
  MonsterFeature,
  MonsterReaction,
  MonsterLegendaryAction,
  MonsterFilter,
  AttackNotation,
  SavingThrowEffect,
} from './monster';
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
} from './monster';
export {
  initializeMonsterForCombat,
  modifyMonsterHP,
  applyMonsterTypedDamage,
  setMonsterTemporaryHP,
  isMonsterDefeated,
  getMonsterAC,
  addMonsterDamageResistance,
  addMonsterDamageImmunity,
  addMonsterDamageVulnerability,
} from './monster';

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
  DamageResult,
  DamageDefenses,
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

// ── Storage ──────────────────────────────────────────────
export type { ICharacterStorage, CharacterSummary } from './storage';
export { InMemoryStorage } from './storage';
export { serialize, deserialize, sanitizeFilename } from './storage';
