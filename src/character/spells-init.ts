// character/spells-init.ts
// Initial CharacterSpells shape for character creation.
// All non-empty data is populated by character/recompute.ts via engine/spell-data.

import type { CharacterSpells, SpellLevel, SpellSlotEntry } from '../types/spell';

/** Create empty spell data (non-spellcasting class). Used during character creation. */
export function emptyCharacterSpells(): CharacterSpells {
  const spellSlots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
  for (let level = 0; level <= 9; level++) {
    spellSlots[level as SpellLevel] = { total: 0, used: 0 };
  }
  return {
    classSpellcasting: {},
    spellSlots,
    pactMagicSlots: null,
  };
}
