// spells/query.ts
// Spell query functions — filter, search, and retrieve spells
// Corresponds to requirement R11

import type { Spell, SpellLevel, SpellSchool, CastingTime } from '../types/spell';
import type { DamageType } from '../types/damage';
import type { Character } from '../types/character';
import type { DataLoader } from '../data/loader';

// ── SpellFilter Interface ──────────────────────────────────────

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
 * Get spells for a character (known or prepared)
 *
 * @param char - Character object
 * @param data - DataLoader
 * @returns Array of known/prepared spells
 *
 * @example
 * getSpellsForCharacter(char, data) // Character's known spells with full data
 */
export function getSpellsForCharacter(char: Character, data: DataLoader): Spell[] {
  const knownSpellIds = char.spells.knownSpells;
  return knownSpellIds.map(id => data.getSpell(id)).filter((s): s is Spell => s !== undefined);
}

/**
 * Get prepared spells for a character
 *
 * @param char - Character object
 * @param data - DataLoader
 * @returns Array of prepared spells
 */
export function getPreparedSpells(char: Character, data: DataLoader): Spell[] {
  const preparedIds = char.spells.preparedSpells;
  return preparedIds.map(id => data.getSpell(id)).filter((s): s is Spell => s !== undefined);
}

/**
 * Check if a spell is prepared by the character
 *
 * @param char - Character object
 * @param spellId - Spell ID
 * @returns True if the spell is prepared
 */
export function isSpellPrepared(char: Character, spellId: string): boolean {
  return char.spells.preparedSpells.includes(spellId);
}

/**
 * Check if a character knows a spell
 *
 * @param char - Character object
 * @param spellId - Spell ID
 * @returns True if the character knows the spell
 */
export function knowsSpell(char: Character, spellId: string): boolean {
  return char.spells.knownSpells.includes(spellId);
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
