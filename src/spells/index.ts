// src/spells/index.ts
// Barrel export for spell query functions

export type { SpellFilter } from './query';
export {
  getSpell,
  searchSpells,
  getSpellsForCharacter,
  getPreparedSpells,
  isSpellPrepared,
  knowsSpell,
} from './query';
