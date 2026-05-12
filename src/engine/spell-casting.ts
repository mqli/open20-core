// engine/spell-casting.ts
// Spell casting mechanics — ritual casting, upcasting, cantrips
// Corresponds to SRD 5.2 spell casting rules

import type { Spell, SpellLevel, ClassSpellData } from '../types/spell';
import type { Character } from '../types/character';
import type { DataLoader } from '../data/loader';

// ── Ritual Casting ──────────────────────────────────────

/**
 * Check if a character can cast a spell as a ritual.
 * SRD: "You can cast a spell as a ritual if it has the ritual tag and
 * you have the ritual casting feature or the spell is on your class list."
 *
 * @param char - Character object
 * @param spell - The spell to check
 * @param data - DataLoader
 * @returns True if the character can cast the spell as a ritual
 *
 * @example
 * canCastAsRitual(char, spell, data) // true if has ritual casting feature
 */
export function canCastAsRitual(char: Character, spell: Spell, data: DataLoader): boolean {
  // Spell must have ritual tag
  if (!spell.ritual) return false;

  // Check if character has the Ritual Caster feat
  const hasRitualCasterFeat = char.feats?.includes('ritual-caster') ?? false;
  if (hasRitualCasterFeat) return true;

  // Check if character's class(es) have ritual casting feature
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    // Classes with ritual casting: Bard, Cleric, Druid, Wizard (via Magic Initiate or class feature)
    // For simplicity, check if the class name is in a list of ritual-casting classes
    const ritualCastingClasses = ['bard', 'cleric', 'druid', 'wizard'];
    if (ritualCastingClasses.includes(charClass.classId)) {
      // Verify the spell is on the class's spell list
      if (spell.classes?.includes(charClass.classId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Cast a spell as a ritual.
 * SRD: "The spell doesn't expend a spell slot and takes 10 minutes longer than normal."
 *
 * @param char - Character object
 * @param spell - The spell to cast
 * @param data - DataLoader
 * @returns Object with success status and updated character (unchanged for rituals)
 *
 * @example
 * castAsRitual(char, spell, data)
 */
export function castAsRitual(
  char: Character,
  spell: Spell,
  data: DataLoader
): { success: boolean; char: Character; message?: string } {
  if (!canCastAsRitual(char, spell, data)) {
    return {
      success: false,
      char,
      message: 'Cannot cast this spell as a ritual.',
    };
  }

  // Ritual casting doesn't consume a spell slot
  // The character object is unchanged (no slot consumption)
  return {
    success: true,
    char,
    message: `Casting ${spell.name} as a ritual. Casting time: ${getRitualCastingTime(spell.castingTime)}.`,
  };
}

/**
 * Get the ritual casting time (normal casting time + 10 minutes).
 *
 * @param normalTime - Normal casting time (e.g., "1 action", "1 minute")
 * @returns Ritual casting time
 */
export function getRitualCastingTime(normalTime: string): string {
  // If casting time is "1 action" or "1 bonus action", ritual takes 10 minutes
  if (normalTime === '1 action' || normalTime === '1 bonus action') {
    return '10 minutes';
  }

  // If casting time is in minutes, add 10
  const minuteMatch = normalTime.match(/^(\d+)\s*minute/);
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1]!, 10) + 10;
    return `${minutes} minutes`;
  }

  // Default: append " + 10 minutes"
  return `${normalTime} + 10 minutes`;
}

// ── Cantrip Casting ──────────────────────────────────────

/**
 * Check if a spell is a cantrip (level 0).
 *
 * @param spell - The spell to check
 * @returns True if the spell is a cantrip
 *
 * @example
 * isCantrip(spell) // true if spell.level === 0
 */
export function isCantrip(spell: Spell): boolean {
  return spell.level === 0;
}

/**
 * Check if a character can cast a cantrip.
 * SRD: Cantrips don't use spell slots and can be cast at will.
 *
 * @param char - Character object
 * @param spell - The cantrip to check
 * @param data - DataLoader
 * @returns True if the character knows the cantrip
 *
 * @example
 * canCastCantrip(char, spell, data) // true if character knows the cantrip
 */
export function canCastCantrip(char: Character, spell: Spell, data: DataLoader): boolean {
  if (!isCantrip(spell)) return false;

  // Check if the spell is known by any class
  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    if (classSpellData.knownSpells.includes(spell.id)) {
      return true;
    }
  }
  return false;
}

// ── Upcasting ────────────────────────────────────────────

/**
 * Check if a spell can be upcast.
 * SRD: "When a spell is cast using a higher-level spell slot, it's called upcasting."
 *
 * @param spell - The spell to check
 * @returns True if the spell can be upcast (has upcast effects)
 *
 * @example
 * canUpcast(spell) // true if spell.upcast is defined
 */
export function canUpcast(spell: Spell): boolean {
  return spell.upcast !== undefined && spell.upcast !== null;
}

/**
 * Get the upcast description for a given slot level.
 *
 * @param spell - The spell to upcast
 * @param slotLevel - The slot level used (must be > spell.level)
 * @returns Upcast description or undefined
 *
 * @example
 * getUpcastDescription(spell, 3) // "At Higher Levels: ..."
 */
export function getUpcastDescription(spell: Spell, slotLevel: SpellLevel): string | undefined {
  if (!canUpcast(spell)) return undefined;
  if (slotLevel <= spell.level) return undefined;

  return spell.upcast;
}

/**
 * Find which class(es) can cast a given spell.
 * Returns the classSpellData entries that have this spell in known or prepared spells.
 */
function findCastingClasses(
  char: Character,
  spellId: string
): ClassSpellData[] {
  const result: ClassSpellData[] = [];

  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    const knowsSpell =
      classSpellData.knownSpells.includes(spellId) ||
      classSpellData.preparedSpells.includes(spellId) ||
      (classSpellData.alwaysPreparedSpells ?? []).includes(spellId);

    if (knowsSpell) {
      result.push(classSpellData);
    }
  }

  return result;
}

/**
 * Cast a spell with a specific slot level (supports upcasting).
 *
 * @param char - Character object
 * @param spellId - The spell ID to cast
 * @param slotLevel - The slot level to use (must be >= spell.level)
 * @param data - DataLoader
 * @returns Object with success status and updated character
 *
 * @example
 * castSpell(char, 'fireball', 3, data) // Casts Fireball using a 3rd-level slot
 */
export function castSpell(
  char: Character,
  spellId: string,
  slotLevel: SpellLevel,
  data: DataLoader
): { success: boolean; char: Character; message?: string; castingClassId?: string } {
  const spell = data.getSpell(spellId);
  if (!spell) {
    return { success: false, char, message: 'Spell not found.' };
  }

  // Check if character knows the spell (in any class)
  const castingClasses = findCastingClasses(char, spellId);
  if (castingClasses.length === 0) {
    return { success: false, char, message: 'Character does not know this spell.' };
  }

  // Cantrips don't use slots
  if (isCantrip(spell)) {
    return {
      success: true,
      char,
      message: `Cast ${spell.name} (cantrip, no slot used).`,
      castingClassId: castingClasses[0]?.classId,
    };
  }

  // Check if slot level is valid
  if (slotLevel < spell.level) {
    return {
      success: false,
      char,
      message: `Cannot cast ${spell.name} using a level ${slotLevel} slot (requires level ${spell.level}).`,
    };
  }

  // Check if character has the required slot (unified pool)
  const slotEntry = char.spells.spellSlots[slotLevel];
  if (!slotEntry || slotEntry.used >= slotEntry.total) {
    return {
      success: false,
      char,
      message: `No level ${slotLevel} spell slots remaining.`,
    };
  }

  // If upcasting, get the upcast description
  const upcastDesc = getUpcastDescription(spell, slotLevel);

  // Use the first casting class for spell save DC (caller can choose if multiple)
  const primaryCastingClass = castingClasses[0];

  return {
    success: true,
    char,
    message: `Cast ${spell.name} using a level ${slotLevel} slot.${upcastDesc ? ` ${upcastDesc}` : ''}`,
    castingClassId: primaryCastingClass?.classId,
  };
}
