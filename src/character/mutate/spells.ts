// character/mutate/spells.ts
// Spell-related character mutations

import type { Character } from '../../types/character';
import type { DataLoader } from '../../data/loader';
import type { SpellLevel } from '../../types/spell';
import { isCantrip as isCantripSpell } from '../spell-casting';
import { withUpdate } from './hp';

// ── Spell Slot Mutations ────────────────────────────────

export function consumeSpellSlot(char: Character, level: number | 'pact'): Character {
  if (level === 'pact') {
    const pact = char.spells.pactMagicSlots;
    if (!pact || pact.used >= pact.total) return char;

    return withUpdate(char, {
      spells: {
        ...char.spells,
        pactMagicSlots: { ...pact, used: pact.used + 1 },
      },
    });
  }

  const slot = char.spells.spellSlots[level as SpellLevel];
  if (!slot || slot.used >= slot.total) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      spellSlots: {
        ...char.spells.spellSlots,
        [level]: { ...slot, used: slot.used + 1 },
      },
    },
  });
}

export function recoverSpellSlot(char: Character, level: number | 'pact'): Character {
  if (level === 'pact') {
    const pact = char.spells.pactMagicSlots;
    if (!pact || pact.used <= 0) return char;

    return withUpdate(char, {
      spells: {
        ...char.spells,
        pactMagicSlots: { ...pact, used: pact.used - 1 },
      },
    });
  }

  const slot = char.spells.spellSlots[level as SpellLevel];
  if (!slot || slot.used <= 0) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      spellSlots: {
        ...char.spells.spellSlots,
        [level]: { ...slot, used: slot.used - 1 },
      },
    },
  });
}

// ── Always-Prepared Spells ───────────────────────────

export function addAlwaysPreparedSpell(char: Character, classId: string, spellId: string): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;

  const current = classData.alwaysPreparedSpells ?? [];
  if (current.includes(spellId)) return char;

  classSpellcasting[classId] = {
    ...classData,
    alwaysPreparedSpells: [...current, spellId],
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

export function removeAlwaysPreparedSpell(char: Character, classId: string, spellId: string): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;

  const current = classData.alwaysPreparedSpells ?? [];
  if (!current.includes(spellId)) return char;

  classSpellcasting[classId] = {
    ...classData,
    alwaysPreparedSpells: current.filter(id => id !== spellId),
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

// ── Known Spells ──────────────────────────────────────

export function addKnownSpell(char: Character, classId: string, spellId: string): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;
  if (classData.knownSpells.includes(spellId)) return char;

  classSpellcasting[classId] = {
    ...classData,
    knownSpells: [...classData.knownSpells, spellId],
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

export function removeKnownSpell(char: Character, classId: string, spellId: string): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;
  if (!classData.knownSpells.includes(spellId)) return char;

  classSpellcasting[classId] = {
    ...classData,
    knownSpells: classData.knownSpells.filter(id => id !== spellId),
    preparedSpells: classData.preparedSpells.filter(id => id !== spellId),
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

// ── Spell Preparation Mutations ─────────────────────────

export function prepareSpellForClass(
  char: Character,
  classId: string,
  spellId: string,
  data?: DataLoader
): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;
  if (classData.preparedSpells.includes(spellId)) return char;

  // Validate: cannot prepare cantrips (level 0)
  if (data) {
    const spell = data.getSpell(spellId);
    if (spell && isCantripSpell(spell)) return char;
  }

  // Check if we've hit the max prepared limit.
  // 2024 PHB: always-prepared spells (subclass domain/oath) don't count toward the limit.
  if (classData.preparedSpells.length >= classData.maxPrepared) return char;

  classSpellcasting[classId] = {
    ...classData,
    preparedSpells: [...classData.preparedSpells, spellId],
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

export function unprepareSpellForClass(
  char: Character,
  classId: string,
  spellId: string
): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;
  if ((classData.alwaysPreparedSpells ?? []).includes(spellId)) return char;
  if (!classData.preparedSpells.includes(spellId)) return char;

  classSpellcasting[classId] = {
    ...classData,
    preparedSpells: classData.preparedSpells.filter(id => id !== spellId),
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

// ── Cantrip Mutations ─────────────────────────────────

export function learnCantripForClass(
  char: Character,
  classId: string,
  spellId: string,
  data: DataLoader
): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;

  const spell = data.getSpell(spellId);
  if (!spell || !isCantripSpell(spell)) return char;
  if (!spell.classes?.includes(classId)) return char;
  if (classData.knownCantrips.includes(spellId)) return char;
  if (classData.knownCantrips.length >= classData.maxCantripsKnown) return char;

  classSpellcasting[classId] = {
    ...classData,
    knownCantrips: [...classData.knownCantrips, spellId],
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

export function replaceCantripForClass(
  char: Character,
  classId: string,
  oldSpellId: string,
  newSpellId: string,
  data: DataLoader
): Character {
  const classSpellcasting = { ...char.spells.classSpellcasting };
  const classData = classSpellcasting[classId];

  if (!classData) return char;
  if (!classData.knownCantrips.includes(oldSpellId)) return char;

  const newSpell = data.getSpell(newSpellId);
  if (!newSpell || !isCantripSpell(newSpell)) return char;
  if (!newSpell.classes?.includes(classId)) return char;
  if (classData.knownCantrips.includes(newSpellId)) return char;

  classSpellcasting[classId] = {
    ...classData,
    knownCantrips: classData.knownCantrips.map(id =>
      id === oldSpellId ? newSpellId : id
    ),
  };

  return withUpdate(char, {
    spells: {
      ...char.spells,
      classSpellcasting,
    },
  });
}

// ── Backward-Compatible Versions (use first spellcasting class) ───
// @deprecated These always target the first spellcasting class and silently do nothing
// for multiclass characters with multiple spellcasting classes. Use the *ForClass variants.

function getFirstSpellcastingClassId(char: Character): string | null {
  const classIds = Object.keys(char.spells.classSpellcasting);
  return classIds.length > 0 ? classIds[0]! : null;
}

/** @deprecated Use prepareSpellForClass — this silently targets the first class for multiclass characters. */
export function prepareSpell(char: Character, spellId: string): Character {
  const classId = getFirstSpellcastingClassId(char);
  if (!classId) return char;
  return prepareSpellForClass(char, classId, spellId);
}

/** @deprecated Use unprepareSpellForClass — this silently targets the first class for multiclass characters. */
export function unprepareSpell(char: Character, spellId: string): Character {
  const classId = getFirstSpellcastingClassId(char);
  if (!classId) return char;
  return unprepareSpellForClass(char, classId, spellId);
}

/** @deprecated Use learnCantripForClass — this silently targets the first class for multiclass characters. */
export function learnCantrip(char: Character, spellId: string, data: DataLoader): Character {
  const classId = getFirstSpellcastingClassId(char);
  if (!classId) return char;
  return learnCantripForClass(char, classId, spellId, data);
}

/** @deprecated Use replaceCantripForClass — this silently targets the first class for multiclass characters. */
export function replaceCantrip(
  char: Character,
  oldSpellId: string,
  newSpellId: string,
  data: DataLoader
): Character {
  const classId = getFirstSpellcastingClassId(char);
  if (!classId) return char;
  return replaceCantripForClass(char, classId, oldSpellId, newSpellId, data);
}
