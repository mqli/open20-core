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

/** Get feat spell entries that contain a specific spell. */
function getFeatSpellEntriesForSpell(char: Character, spellId: string): FeatSpellsEntry[] {
  if (!char.spells.featSpells) return [];
  const result: FeatSpellsEntry[] = [];
  for (const featSpellEntry of Object.values(char.spells.featSpells) as FeatSpellsEntry[]) {
    if (featSpellEntry.cantrips.includes(spellId) || featSpellEntry.preparedSpells.includes(spellId)) {
      result.push(featSpellEntry);
    }
  }
  return result;
}

// ── Ritual Casting ──────────────────────────────────────

/** Check if a character can cast a spell as a ritual. */
export function canCastAsRitual(char: Character, spell: Spell, data: DataLoader): boolean {
  if (!spell.ritual) return false;

  const hasRitualCasterFeat = char.feats?.some(f => f.featId === 'ritual-caster') ?? false;
  if (hasRitualCasterFeat) return true;

  const ritualCastingClasses = ['bard', 'cleric', 'druid', 'wizard'];
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
  return spell.usingAHigherLevelSpellSlot![0];
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

/** Cast a spell with a specific slot level (supports upcasting). */
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
    const castingClassId = castingClasses[0]?.classId ?? featSpellEntries[0]?.classId;
    return {
      success: true,
      char,
      message: `Cast ${spell.name} (cantrip, no slot used).`,
      castingClassId,
    };
  }

  // Handle feat spells (level 1+ spells that can be cast once per long rest)
  if (featSpellEntries.length > 0 && castingClasses.length === 0) {
    // This is a feat spell (not from a class)
    const featEntry = featSpellEntries[0]!;

    // Check if it's once per long rest
    if (featEntry.oncePerLongRest?.[spellId]) {
      // TODO: Track usage in character state (long rest reset)
      // For now, just allow casting
      return {
        success: true,
        char,
        message: `Cast ${spell.name} (once per long rest, no slot used).`,
        castingClassId: featEntry.classId,
      };
    }
  }

  // Handle regular spell casting (requires spell slots)
  if (castingClasses.length === 0) {
    return { success: false, char, message: 'Character does not know this spell.' };
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

  const upcastDesc = getUpcastDescription(spell, slotLevel);
  return {
    success: true,
    char,
    message: `Cast ${spell.name} using a level ${slotLevel} slot.${upcastDesc ? ` ${upcastDesc}` : ''}`,
    castingClassId: castingClasses[0]?.classId,
  };
}
