// src/spells/index.ts
// Barrel export for spell query functions

export type { SpellFilter, PreparationRule, PreparationChangeLimit } from './query';
export {
  getSpell,
  getSpell as getSpellData,
  searchSpells,
  getSpellsByClass,
  getSpellsForCharacter,
  getPreparedSpells,
  isSpellPrepared,
  knowsSpell,
  getPreparationRule,
  canChangePreparedSpells,
  getMaxPreparedSpellChanges,
} from './query';
