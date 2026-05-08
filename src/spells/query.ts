// spells/query.ts
// Spell query functions — filter, search, and retrieve spells
// Corresponds to requirement R11

import type { Spell, SpellLevel, SpellSchool } from '../types/spell';
import type { Character } from '../types/character';
import type { DataLoader } from '../data/loader';

// ── SpellFilter Interface ──────────────────────────────────────

export interface SpellFilter {
  name?: string;
  level?: SpellLevel[];
  school?: SpellSchool;
  concentration?: boolean;
  ritual?: boolean;
  source?: string;
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
    spells = spells.filter((s) =>
      s.id.toLowerCase().includes(searchLower) ||
      s.name.toLowerCase().includes(searchLower)
    );
  }

  if (filter.level && filter.level.length > 0) {
    const levelSet = new Set(filter.level);
    spells = spells.filter((s) => levelSet.has(s.level));
  }

  if (filter.school) {
    spells = spells.filter((s) => s.school === filter.school);
  }

  if (filter.concentration !== undefined) {
    spells = spells.filter((s) => s.concentration === filter.concentration);
  }

  if (filter.ritual !== undefined) {
    spells = spells.filter((s) => s.ritual === filter.ritual);
  }

  if (filter.source) {
    spells = spells.filter((s) => s.source === filter.source);
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
  return knownSpellIds
    .map((id) => data.getSpell(id))
    .filter((s): s is Spell => s !== undefined);
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
  return preparedIds
    .map((id) => data.getSpell(id))
    .filter((s): s is Spell => s !== undefined);
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
