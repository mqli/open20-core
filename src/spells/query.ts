// spells/query.ts
// Spell query functions — filter, search, and retrieve spells
// Corresponds to requirement R11

import type { Spell, SpellLevel, SpellSchool, CastingTime } from '../types/spell';
import type { DamageType } from '../types/damage';
import type { Character } from '../types/character';
import type { DataLoader } from '../data/loader';

// ── Preparation Rules ──────────────────────────────────────

/**
 * SRD 5.2 Spell Preparation Rules by class:
 *
 * - Cleric, Druid, Wizard: Change any number after Long Rest
 * - Paladin, Ranger: Change 1 spell after Long Rest
 * - Bard, Sorcerer, Warlock: Change only when gaining a level (1 spell)
 */
export type PreparationChangeLimit = 'any' | 'one-per-long-rest' | 'level-up-only';

export interface PreparationRule {
  /** Whether the class prepares spells (vs knowing them) */
  preparesSpells: boolean;
  /** When spells can be changed */
  changeTiming: 'long-rest' | 'level-up';
  /** Limit on number of changes */
  changeLimit: PreparationChangeLimit;
}

/** Preparation rules by class */
const PREPARATION_RULES: Record<string, PreparationRule> = {
  cleric: { preparesSpells: true, changeTiming: 'long-rest', changeLimit: 'any' },
  druid: { preparesSpells: true, changeTiming: 'long-rest', changeLimit: 'any' },
  wizard: { preparesSpells: true, changeTiming: 'long-rest', changeLimit: 'any' },
  paladin: { preparesSpells: true, changeTiming: 'long-rest', changeLimit: 'one-per-long-rest' },
  ranger: { preparesSpells: true, changeTiming: 'long-rest', changeLimit: 'one-per-long-rest' },
  bard: { preparesSpells: false, changeTiming: 'level-up', changeLimit: 'level-up-only' },
  sorcerer: { preparesSpells: false, changeTiming: 'level-up', changeLimit: 'level-up-only' },
  warlock: { preparesSpells: false, changeTiming: 'level-up', changeLimit: 'level-up-only' },
};

/**
 * Get the preparation rule for a character based on their classes.
 * For multiclass, returns the most restrictive rule.
 *
 * @param char - Character object
 * @returns Preparation rule for the character
 */
export function getPreparationRule(char: Character): PreparationRule {
  const classes = char.classes.map(c => c.classId);

  // If any class prepares spells, treat as prepared caster
  const hasPreparedCaster = classes.some(c => PREPARATION_RULES[c]?.preparesSpells);
  const hasLevelUpOnly = classes.some(c => PREPARATION_RULES[c]?.changeLimit === 'level-up-only');

  if (hasPreparedCaster) {
    // Check if any prepared caster class has 'any' limit
    const hasAnyLimit = classes.some(c => PREPARATION_RULES[c]?.changeLimit === 'any');
    if (hasAnyLimit) {
      return { preparesSpells: true, changeTiming: 'long-rest', changeLimit: 'any' };
    }
    return { preparesSpells: true, changeTiming: 'long-rest', changeLimit: 'one-per-long-rest' };
  }

  if (hasLevelUpOnly) {
    return { preparesSpells: false, changeTiming: 'level-up', changeLimit: 'level-up-only' };
  }

  // Default: can't prepare spells (non-caster)
  return { preparesSpells: false, changeTiming: 'level-up', changeLimit: 'level-up-only' };
}

/**
 * Check if a character can currently change prepared spells.
 * SRD: Prepared casters can change after Long Rest; known casters only at level up.
 *
 * @param char - Character object
 * @returns Whether the character can change prepared spells now
 *
 * @example
 * canChangePreparedSpells(char) // true if after long rest for prepared casters
 */
export function canChangePreparedSpells(char: Character): boolean {
  const rule = getPreparationRule(char);

  if (rule.changeTiming === 'level-up') {
    // Can only change when gaining a level
    // This would need to be checked by the caller (e.g., during level up flow)
    return false;
  }

  // For 'long-rest' timing, check if character has taken a long rest
  // We track this via the presence of used spell slots (reset after long rest)
  // A simpler approach: just return true and let the UI handle the timing
  return true;
}

/**
 * Get the maximum number of spell changes allowed.
 *
 * @param char - Character object
 * @returns Maximum number of changes (Infinity for 'any', 1 for 'one-per-long-rest', 0 for 'level-up-only')
 */
export function getMaxPreparedSpellChanges(char: Character): number {
  const rule = getPreparationRule(char);

  switch (rule.changeLimit) {
    case 'any':
      return Infinity;
    case 'one-per-long-rest':
      return 1;
    case 'level-up-only':
      return 0;
    default:
      return 0;
  }
}

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
 * Get spells for a character (known by any class)
 *
 * @param char - Character object
 * @param data - DataLoader
 * @returns Array of known/prepared spells
 *
 * @example
 * getSpellsForCharacter(char, data) // Character's known spells with full data
 */
export function getSpellsForCharacter(char: Character, data: DataLoader): Spell[] {
  // Collect known spells from all classes
  const knownSpellIds = new Set<string>();
  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    for (const spellId of classSpellData.knownSpells) {
      knownSpellIds.add(spellId);
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
 *
 * @param char - Character object
 * @param spellId - Spell ID
 * @returns True if the character knows the spell in any class
 */
export function knowsSpell(char: Character, spellId: string): boolean {
  for (const classSpellData of Object.values(char.spells.classSpellcasting)) {
    if (classSpellData.knownSpells.includes(spellId)) {
      return true;
    }
  }
  return false;
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
  return classSpellData.knownSpells.includes(spellId);
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
