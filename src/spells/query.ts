// spells/query.ts
// Spell query functions — filter, search, and retrieve spells
// Corresponds to requirement R11

import type { Spell, SpellLevel, SpellSchool, CastingTime } from '../types/spell';
import type { DamageType } from '../types/damage';
import type { Character } from '../types/character';
import type { Class } from '../types/class';
import type { DataLoader } from '../data/loader';
import { calculateSpellSlots } from '../engine/spell-slots';

// ── Spellcasting Type Helpers ──────────────────────────────

/** Check if a class knows spells from class list (Cleric, Druid, Paladin, Ranger, Bard, Sorcerer) */
export function isClassListCaster(classData: Class): boolean {
  return classData.spellcasting?.knownSource === 'class_list';
}

/** Check if a class uses spellbook (Wizard) */
export function isSpellbookCaster(classData: Class): boolean {
  return classData.spellcasting?.knownSource === 'spellbook';
}

/** Check if a class can change prepared spells after Long Rest */
export function canChangeSpellsOnLongRest(classData: Class): boolean {
  return classData.spellcasting?.preparationTiming === 'long_rest';
}

/** Check if a class can only change prepared spells on level up */
export function canChangeSpellsOnLevelUp(classData: Class): boolean {
  return classData.spellcasting?.preparationTiming === 'level_up';
}

// ── SpellFilter Interface ────────────────────────────────────

export interface SpellFilter {
  name?: string;
  level?: SpellLevel[];
  school?: SpellSchool[];
  class?: string[];              // Filter by which class can cast
  damageType?: DamageType[];     // Filter by damage type
  castingTime?: CastingTime[];  // Filter by casting time
  range?: string;                // Filter by range
  concentration?: boolean;
  ritual?: boolean;
  source?: string[];
}

// ── Query Functions ────────────────────────────────────────────

/**
 * Get a single spell by ID
 *
 * @param id - Spell ID (kebab-case)
 * @param data - DataLoader
 * @returns Spell or undefined
 *
 * @example
 * getSpell('fireball', data) // { id: 'fireball', name: 'Fire Ball', ... }
 */
export function getSpell(id: string, data: DataLoader): Spell | undefined {
  return data.getSpell(id);
}

/**
 * Search/filter spells based on criteria
 *
 * @param filter - Filter criteria
 * @param data - DataLoader
 * @returns Array of matching spells
 *
 * @example
 * searchSpells({ level: [0, 1], school: 'Evocation' }, data)
 */
export function searchSpells(filter: SpellFilter, data: DataLoader): Spell[] {
  let spells = data.getAllSpells();

  if (filter.name) {
    const searchLower = filter.name.toLowerCase();
    spells = spells.filter(
      s => s.id.toLowerCase().includes(searchLower) || s.name.toLowerCase().includes(searchLower)
    );
  }

  if (filter.level && filter.level.length > 0) {
    const levelSet = new Set(filter.level);
    spells = spells.filter(s => levelSet.has(s.level));
  }

  if (filter.school && filter.school.length > 0) {
    const schoolSet = new Set(filter.school);
    spells = spells.filter(s => schoolSet.has(s.school));
  }

  if (filter.class && filter.class.length > 0) {
    const classSet = new Set(filter.class);
    spells = spells.filter(s => s.classes?.some(c => classSet.has(c)));
  }

  if (filter.damageType && filter.damageType.length > 0) {
    const damageTypeSet = new Set(filter.damageType);
    spells = spells.filter(s =>
      s.damage?.entries.some(e => damageTypeSet.has(e.type as DamageType)) ||
      s.damage?.additional?.some(e => damageTypeSet.has(e.type as DamageType))
    );
  }

  if (filter.castingTime && filter.castingTime.length > 0) {
    const castingTimeSet = new Set(filter.castingTime);
    spells = spells.filter(s => castingTimeSet.has(s.castingTime));
  }

  if (filter.range) {
    const rangeLower = filter.range.toLowerCase();
    spells = spells.filter(s => s.range.toLowerCase().includes(rangeLower));
  }

  if (filter.concentration !== undefined) {
    spells = spells.filter(s => s.concentration === filter.concentration);
  }

  if (filter.ritual !== undefined) {
    spells = spells.filter(s => s.ritual === filter.ritual);
  }

  if (filter.source && filter.source.length > 0) {
    const sourceSet = new Set(filter.source);
    spells = spells.filter(s => sourceSet.has(s.source));
  }

  return spells;
}

/**
 * Get spells for a character (known by any class)
 * Only returns spells the character can actually cast (cantrips + up to max spell level)
 *
 * @param char - Character object
 * @param data - DataLoader
 * @returns Array of known spells within casting level
 *
 * @example
 * getSpellsForCharacter(char, data) // Character's known spells within casting level
 */
export function getSpellsForCharacter(char: Character, data: DataLoader): Spell[] {
  // Determine max spell level the character can cast
  let maxSpellLevel = 0;
  for (let level = 1; level <= 9; level++) {
    const entry = char.spells.spellSlots[level as SpellLevel];
    if (entry && entry.total > 0) {
      maxSpellLevel = level;
    }
  }

  // Collect known spells from all classes, filtered by castable level
  const knownSpellIds = new Set<string>();
  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    // Add cantrips (level 0) from knownCantrips
    for (const spellId of (classSpellData.knownCantrips ?? [])) {
      knownSpellIds.add(spellId);
    }
    // Add level 1+ spells from knownSpells (filtered by castable level)
    for (const spellId of classSpellData.knownSpells) {
      const spell = data.getSpell(spellId);
      if (spell && spell.level <= maxSpellLevel) {
        knownSpellIds.add(spellId);
      }
    }
  }

  return Array.from(knownSpellIds)
    .map(id => data.getSpell(id))
    .filter((s): s is Spell => s !== undefined);
}

/**
 * Get prepared spells for a character
 * Includes both regularly prepared and always-prepared spells from all classes
 *
 * @param char - Character object
 * @param data - DataLoader
 * @returns Array of prepared spells
 */
export function getPreparedSpells(char: Character, data: DataLoader): Spell[] {
  const allPreparedIds = new Set<string>();

  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    // Add regularly prepared spells
    for (const spellId of classSpellData.preparedSpells) {
      allPreparedIds.add(spellId);
    }
    // Add always-prepared spells
    for (const spellId of (classSpellData.alwaysPreparedSpells ?? [])) {
      allPreparedIds.add(spellId);
    }
  }

  return Array.from(allPreparedIds)
    .map(id => data.getSpell(id))
    .filter((s): s is Spell => s !== undefined);
}

/**
 * Check if a spell is prepared by the character
 * Checks all classes for prepared or always-prepared spells
 *
 * @param char - Character object
 * @param spellId - Spell ID
 * @returns True if the spell is prepared or always prepared in any class
 */
export function isSpellPrepared(char: Character, spellId: string): boolean {
  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    if (
      classSpellData.preparedSpells.includes(spellId) ||
      (classSpellData.alwaysPreparedSpells ?? []).includes(spellId)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a character knows a spell (in any class)
 * Checks both knownCantrips (for cantrips) and knownSpells (for level 1+)
 *
 * @param char - Character object
 * @param spellId - Spell ID
 * @returns True if the character knows the spell in any class
 */
export function knowsSpell(char: Character, spellId: string): boolean {
  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    if (
      (classSpellData.knownCantrips ?? []).includes(spellId) ||
      classSpellData.knownSpells.includes(spellId)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a character can cast a spell (cantrip or level 1+)
 * - Cantrips: check if known (can cast at will)
 * - Level 1+ spells: check if prepared
 *
 * @param char - Character object
 * @param spell - Spell to check
 * @param data - DataLoader
 * @returns True if the character can cast the spell
 *
 * @example
 * canCastSpell(char, spell, data) // true if cantrip (known) or level 1+ (prepared)
 */
export function canCastSpell(char: Character, spell: Spell, data: DataLoader): boolean {
  if (spell.level === 0) {
    // Cantrip - check if known (in knownCantrips)
    return knowsSpell(char, spell.id);
  }
  // Level 1+ - check if prepared
  return isSpellPrepared(char, spell.id);
}

/**
 * Get the class spell data for a specific class
 *
 * @param char - Character object
 * @param classId - Class ID
 * @returns ClassSpellData or undefined
 */
export function getClassSpellData(
  char: Character,
  classId: string
): import('../types/spell').ClassSpellData | undefined {
  return char.spells.classSpellcasting[classId];
}

/**
 * Check if a spell is known for a specific class
 * Checks both knownCantrips (for cantrips) and knownSpells (for level 1+)
 *
 * @param char - Character object
 * @param classId - Class ID
 * @param spellId - Spell ID
 * @returns True if the spell is known for that class
 */
export function knowsSpellForClass(
  char: Character,
  classId: string,
  spellId: string
): boolean {
  const classSpellData = char.spells.classSpellcasting[classId];
  if (!classSpellData) return false;
  return (
    (classSpellData.knownCantrips ?? []).includes(spellId) ||
    classSpellData.knownSpells.includes(spellId)
  );
}

/**
 * Check if a spell is prepared for a specific class
 *
 * @param char - Character object
 * @param classId - Class ID
 * @param spellId - Spell ID
 * @returns True if the spell is prepared for that class
 */
export function isSpellPreparedForClass(
  char: Character,
  classId: string,
  spellId: string
): boolean {
  const classSpellData = char.spells.classSpellcasting[classId];
  if (!classSpellData) return false;
  return (
    classSpellData.preparedSpells.includes(spellId) ||
    (classSpellData.alwaysPreparedSpells ?? []).includes(spellId)
  );
}

/**
 * Get known spells for a specific class, filtered by character level
 * Only returns spells the character can actually cast (cantrips + up to max spell level)
 *
 * @param char - Character object
 * @param classId - Class ID
 * @param data - DataLoader
 * @returns Array of known spells within casting level for that class
 *
 * @example
 * getKnownSpellsForClass(char, 'sorcerer', data) // Sorcerer's known spells filtered by level
 */
export function getKnownSpellsForClass(
  char: Character,
  classId: string,
  data: DataLoader
): Spell[] {
  const classSpellData = char.spells.classSpellcasting[classId];
  if (!classSpellData) return [];

  // Calculate per-class max spell level (not combined multiclass level)
  const charClass = char.classes.find(c => c.classId === classId);
  const classLevel = charClass?.level ?? 1;
  const classSlots = calculateSpellSlots(classId, classLevel, data);
  let classMaxSpellLevel = 0;
  for (let level = 1; level <= 9; level++) {
    const entry = classSlots[level];
    if (entry && entry.total > 0) {
      classMaxSpellLevel = level;
    }
  }

  return classSpellData.knownSpells
    .map(id => data.getSpell(id))
    .filter((s): s is Spell => s !== undefined && (s.level === 0 || s.level <= classMaxSpellLevel));
}

/**
 * Get all spells for a specific class
 *
 * @param classId - Class ID (e.g., 'wizard', 'cleric')
 * @param data - DataLoader
 * @returns Array of spells available to the class
 *
 * @example
 * getSpellsByClass('wizard', data) // All wizard spells
 */
export function getSpellsByClass(classId: string, data: DataLoader): Spell[] {
  return data.getAllSpells().filter(s =>
    s.classes?.includes(classId)
  );
}
