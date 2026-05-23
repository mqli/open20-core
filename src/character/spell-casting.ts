// character/spell-casting.ts
// Spell casting mechanics — ritual casting, upcasting, cantrips
// Corresponds to SRD 5.2 spell casting rules
//
// Lives in character/ (not engine/) because it operates on Character state.

import type { Spell, SpellLevel, ClassSpellData } from '../types';
import type { FeatSpellsEntry } from '../types/spell';
import type { Character } from '../types';
import type { DataLoader } from '../data/loader';

// ── Helper Functions ──────────────────────────────────────

/** Check if a spell is in featSpells (e.g., Magic Initiate). */
function isFeatSpell(char: Character, spellId: string): boolean {
  if (!char.spells.featSpells) return false;
  for (const featSpellEntry of Object.values(char.spells.featSpells) as FeatSpellsEntry[]) {
    if (featSpellEntry.cantrips.includes(spellId) || featSpellEntry.preparedSpells.includes(spellId)) {
      return true;
    }
  }
  return false;
}

/** Get feat spell entries (with their feat IDs) that contain a specific spell. */
function getFeatSpellEntriesForSpell(
  char: Character,
  spellId: string
): { featId: string; entry: FeatSpellsEntry }[] {
  if (!char.spells.featSpells) return [];
  const result: { featId: string; entry: FeatSpellsEntry }[] = [];
  for (const [featId, entry] of Object.entries(char.spells.featSpells) as [string, FeatSpellsEntry][]) {
    if (entry.cantrips.includes(spellId) || entry.preparedSpells.includes(spellId)) {
      result.push({ featId, entry });
    }
  }
  return result;
}

// ── Ritual Casting ──────────────────────────────────────

/** Check if a character can cast a spell as a ritual. */
export function canCastAsRitual(char: Character, spell: Spell, _data: DataLoader): boolean {
  if (!spell.ritual) return false;

  const hasRitualCasterFeat = char.feats?.some(f => f.featId === 'ritual-caster') ?? false;
  if (hasRitualCasterFeat) return true;

  const ritualCastingClasses = ['Bard', 'Cleric', 'Druid', 'Wizard'];
  for (const charClass of char.classes) {
    if (!ritualCastingClasses.includes(charClass.classId)) continue;
    if (spell.classes?.includes(charClass.classId)) return true;
  }

  return false;
}

/** Cast a spell as a ritual (does not consume a slot). */
export function castAsRitual(
  char: Character,
  spell: Spell,
  data: DataLoader
): { success: boolean; char: Character; message?: string } {
  if (!canCastAsRitual(char, spell, data)) {
    return { success: false, char, message: 'Cannot cast this spell as a ritual.' };
  }
  return {
    success: true,
    char,
    message: `Casting ${spell.name} as a ritual. Casting time: ${getRitualCastingTime(spell.castingTime)}.`,
  };
}

/** Get ritual casting time (normal time + 10 minutes). */
export function getRitualCastingTime(normalTime: string): string {
  if (normalTime === '1 action' || normalTime === '1 bonus action') return '10 minutes';

  const minuteMatch = normalTime.match(/^(\d+)\s*minute/);
  if (minuteMatch) return `${parseInt(minuteMatch[1]!, 10) + 10} minutes`;

  return `${normalTime} + 10 minutes`;
}

// ── Cantrip Casting ──────────────────────────────────────

export function isCantrip(spell: Spell): boolean {
  return spell.level === 0;
}

/** Check if character can cast a cantrip (including feat spells like Magic Initiate). */
export function canCastCantrip(char: Character, spell: Spell, _data: DataLoader): boolean {
  if (!isCantrip(spell)) return false;

  // Check class spellcasting (regular casters)
  for (const csd of Object.values(char.spells.classSpellcasting) as ClassSpellData[]) {
    if (csd.knownSpells.includes(spell.id)) return true;
  }

  // Check feat spells (e.g., Magic Initiate cantrips)
  if (isFeatSpell(char, spell.id)) return true;

  return false;
}

// ── Upcasting ────────────────────────────────────────────

export function canUpcast(spell: Spell): boolean {
  return spell.usingAHigherLevelSpellSlot !== undefined
    && spell.usingAHigherLevelSpellSlot !== null
    && spell.usingAHigherLevelSpellSlot.length > 0;
}

export function getUpcastDescription(spell: Spell, slotLevel: SpellLevel): string | undefined {
  if (!canUpcast(spell) || slotLevel <= spell.level) return undefined;
  // Index by how many levels above base (0-based). Fall back to first entry for spells
  // with a single catch-all upcast description.
  const idx = slotLevel - spell.level - 1;
  return spell.usingAHigherLevelSpellSlot![idx] ?? spell.usingAHigherLevelSpellSlot![0];
}

/** Find all class spell data entries that can cast a spell. */
function findCastingClasses(char: Character, spellId: string): ClassSpellData[] {
  const result: ClassSpellData[] = [];

  // Check class spellcasting
  for (const csd of Object.values(char.spells.classSpellcasting) as ClassSpellData[]) {
    const knowsSpell =
      csd.knownSpells.includes(spellId) ||
      csd.preparedSpells.includes(spellId) ||
      (csd.alwaysPreparedSpells ?? []).includes(spellId);
    if (knowsSpell) result.push(csd);
  }

  return result;
}

/** Cast a spell with a specific slot level (supports upcasting).
 *
 * Returns the updated Character on success — the spell slot (or feat-spell usage) is
 * consumed inside this function so callers don't need a separate consumeSpellSlot call.
 */
export function castSpell(
  char: Character,
  spellId: string,
  slotLevel: SpellLevel,
  data: DataLoader
): { success: boolean; char: Character; message?: string; castingClassId?: string } {
  const spell = data.getSpell(spellId);
  if (!spell) return { success: false, char, message: 'Spell not found.' };

  // Check class spellcasting
  const castingClasses = findCastingClasses(char, spellId);

  // Check feat spells (e.g., Magic Initiate)
  const featSpellEntries = getFeatSpellEntriesForSpell(char, spellId);

  if (castingClasses.length === 0 && featSpellEntries.length === 0) {
    return { success: false, char, message: 'Character does not know this spell.' };
  }

  // Handle cantrips (no slot needed)
  if (isCantrip(spell)) {
    const castingClassId = castingClasses[0]?.classId ?? featSpellEntries[0]?.entry.classId;
    return {
      success: true,
      char,
      message: `Cast ${spell.name} (cantrip, no slot used).`,
      castingClassId,
    };
  }

  // Handle feat spells (level 1+ spells that can be cast once per long rest)
  if (featSpellEntries.length > 0 && castingClasses.length === 0) {
    const { featId, entry: featEntry } = featSpellEntries[0]!;

    if (featEntry.oncePerLongRest?.[spellId]) {
      if (featEntry.usedOncePerLongRest?.[spellId]) {
        return {
          success: false,
          char,
          message: `${spell.name} can only be cast once per long rest.`,
        };
      }

      const updatedEntry: FeatSpellsEntry = {
        ...featEntry,
        usedOncePerLongRest: { ...featEntry.usedOncePerLongRest, [spellId]: true },
      };
      const updatedChar: Character = {
        ...char,
        spells: {
          ...char.spells,
          featSpells: { ...char.spells.featSpells!, [featId]: updatedEntry },
        },
      };
      return {
        success: true,
        char: updatedChar,
        message: `Cast ${spell.name} (once per long rest, no slot used).`,
        castingClassId: featEntry.classId,
      };
    }
  }

  // Handle regular spell casting (requires spell slots)
  if (castingClasses.length === 0) {
    return { success: false, char, message: 'Character does not know this spell.' };
  }

  // Warlock Pact Magic: Warlock spells use pact magic slots, not regular spell slots
  const isWarlockCaster = castingClasses.some(csd => csd.classId === 'Warlock');
  if (isWarlockCaster && char.spells.pactMagicSlots) {
    const pact = char.spells.pactMagicSlots;
    if (pact.used >= pact.total) {
      return { success: false, char, message: 'No Pact Magic slots remaining.' };
    }
    if (spell.level > pact.level) {
      return {
        success: false,
        char,
        message: `Cannot cast ${spell.name} (level ${spell.level}) — Pact Magic slots are only level ${pact.level}.`,
      };
    }

    const updatedChar: Character = {
      ...char,
      spells: {
        ...char.spells,
        pactMagicSlots: { ...pact, used: pact.used + 1 },
      },
    };
    return {
      success: true,
      char: updatedChar,
      message: `Cast ${spell.name} using a Pact Magic slot (level ${pact.level}).`,
      castingClassId: 'Warlock',
    };
  }

  if (slotLevel < spell.level) {
    return {
      success: false,
      char,
      message: `Cannot cast ${spell.name} using a level ${slotLevel} slot (requires level ${spell.level}).`,
    };
  }

  const slotEntry = char.spells.spellSlots[slotLevel];
  if (!slotEntry || slotEntry.used >= slotEntry.total) {
    return { success: false, char, message: `No level ${slotLevel} spell slots remaining.` };
  }

  const updatedChar: Character = {
    ...char,
    spells: {
      ...char.spells,
      spellSlots: {
        ...char.spells.spellSlots,
        [slotLevel]: { ...slotEntry, used: slotEntry.used + 1 },
      },
    },
  };

  const upcastDesc = getUpcastDescription(spell, slotLevel);
  return {
    success: true,
    char: updatedChar,
    message: `Cast ${spell.name} using a level ${slotLevel} slot.${upcastDesc ? ` ${upcastDesc}` : ''}`,
    castingClassId: castingClasses[0]?.classId,
  };
}
