// character/feat-mutate.ts
// Feat-related mutations — pure functions that return new Character state
// Handles feat selection, feat choices, and feat removal

import type { Character } from '../types/character';
import type { Feat, FeatSpellSelection } from '../types/feat';
import type { DataLoader } from '../data/loader';
import { validateFeatPrerequisites, canTakeFeat } from './feat-validator';
import { recomputeDerivedStats } from './recompute';

// ── Public Interface ──────────────────────────────────────

/**
 * Options for adding a feat to a character.
 */
export interface AddFeatOptions {
  /**
   * Player's choices for this feat.
   * - readonly string[]: skill/tool choices (e.g., ["Athletics", "Stealth"])
   * - Record<string, number>: ability bonus choices (e.g., { "Strength": 2 })
   */
  choices?: readonly string[] | Record<string, number>;
  /** Spell choices for feats like Magic Initiate */
  spellSelection?: FeatSpellSelection;
}

/**
 * Add a feat to a character (with validation).
 * If the feat requires choices (e.g., "Skilled"), also store the choices.
 *
 * @param char - The character to modify
 * @param featId - The ID of the feat to add
 * @param data - DataLoader for validation
 * @param options - Optional choices and spell selection
 * @returns New Character with the feat added
 * @throws Error if prerequisites not met
 *
 * @example
 * // Add a feat with skill choices
 * addFeat(char, 'skilled', data, { choices: ['Athletics', 'Stealth', 'Perception'] });
 *
 * @example
 * // Add a feat with ability bonus choice
 * addFeat(char, 'ability-score-improvement', data, { choices: { Strength: 2 } });
 *
 * @example
 * // Add a feat with spell selection (Magic Initiate)
 * addFeat(char, 'magic-initiate', data, { spellSelection: { classId: 'Wizard', spells: { cantrips: ['fire-bolt'], level1Spell: ['magic-missile'] } } });
 */
export function addFeat(
  char: Character,
  featId: string,
  data: DataLoader,
  options?: AddFeatOptions
): Character {
  const feat = data.getFeat(featId);
  if (!feat) {
    throw new Error(`Feat "${featId}" not found in data`);
  }

  // Validate prerequisites
  const validation = validateFeatPrerequisites(char, feat, data);
  if (!validation.valid) {
    throw new Error(
      `Cannot take feat "${feat.name ?? featId}": ${validation.reasons.join(', ')}`
    );
  }

  // Check if feat can be taken (not already taken, or repeatable)
  if (!canTakeFeat(char, feat)) {
    throw new Error(
      `Feat "${feat.name ?? featId}" cannot be taken again (not repeatable)`
    );
  }

  const { choices, spellSelection } = options ?? {};

  // Add feat ID
  const newFeats = [...char.feats, featId];

  // Add choices (if any)
  const newFeatChoices = { ...char.featChoices };
  if (choices !== undefined) {
    // Handle both array (skill/tool choices) and object (ability bonus choices)
    const isEmpty = Array.isArray(choices) ? choices.length === 0 : Object.keys(choices).length === 0;
    if (!isEmpty) {
      newFeatChoices[featId] = choices;
    }
  }

  // Add spell selection (if any)
  const newFeatSpellChoices = { ...char.featSpellChoices };
  if (spellSelection) {
    newFeatSpellChoices[featId] = spellSelection;
  }

  // Build new character and recompute
  const newChar: Character = {
    ...char,
    feats: newFeats,
    featChoices: Object.keys(newFeatChoices).length > 0 ? newFeatChoices : undefined,
    featSpellChoices: Object.keys(newFeatSpellChoices).length > 0 ? newFeatSpellChoices : undefined,
    updatedAt: new Date().toISOString(),
  };

  return recomputeDerivedStats(newChar, data);
}

/**
 * Remove a feat from a character.
 * Note: In D&D 5e, feats are permanent once chosen (unless using optional "Feat Respec" rules).
 * This function is provided for flexibility (e.g., level respec, homebrew rules).
 *
 * @param char - The character to modify
 * @param featId - The ID of the feat to remove
 * @param data - DataLoader
 * @returns New Character with the feat removed
 */
export function removeFeat(
  char: Character,
  featId: string,
  data: DataLoader
): Character {
  if (!char.feats.includes(featId)) {
    throw new Error(`Feat "${featId}" not found on character`);
  }

  // Remove feat ID
  const newFeats = char.feats.filter(id => id !== featId);

  // Remove choices
  const newFeatChoices = { ...char.featChoices };
  delete newFeatChoices[featId];

  // Remove spell choices
  const newFeatSpellChoices = { ...char.featSpellChoices };
  delete newFeatSpellChoices[featId];

  // Build new character and recompute
  const newChar: Character = {
    ...char,
    feats: newFeats,
    featChoices: Object.keys(newFeatChoices).length > 0 ? newFeatChoices : undefined,
    featSpellChoices: Object.keys(newFeatSpellChoices).length > 0 ? newFeatSpellChoices : undefined,
    updatedAt: new Date().toISOString(),
  };

  return recomputeDerivedStats(newChar, data);
}

/**
 * Update choices for a feat (e.g., change which skills you chose for "Skilled").
 * Accepts both:
 * - readonly string[]: skill/tool choices (e.g., ["Athletics", "Stealth"])
 * - Record<string, number>: ability bonus choices (e.g., { "Strength": 2 })
 *
 * @param char - The character to modify
 * @param featId - The ID of the feat
 * @param choices - New choices for this feat
 * @param data - DataLoader
 * @returns New Character with updated choices
 */
export function updateFeatChoices(
  char: Character,
  featId: string,
  choices: readonly string[] | Record<string, number>,
  data: DataLoader
): Character {
  if (!char.feats.includes(featId)) {
    throw new Error(`Feat "${featId}" not found on character`);
  }

  const feat = data.getFeat(featId);
  if (!feat) {
    throw new Error(`Feat "${featId}" not found in data`);
  }

  // Update choices
  const newFeatChoices = {
    ...char.featChoices,
    [featId]: choices,
  };

  // Build new character and recompute
  const newChar: Character = {
    ...char,
    featChoices: newFeatChoices,
    updatedAt: new Date().toISOString(),
  };

  return recomputeDerivedStats(newChar, data);
}

/**
 * Update spell choices for a feat (e.g., Magic Initiate).
 *
 * @param char - The character to modify
 * @param featId - The ID of the feat
 * @param spellSelection - New spell selection for this feat
 * @param data - DataLoader
 * @returns New Character with updated spell choices
 */
export function updateFeatSpellChoices(
  char: Character,
  featId: string,
  spellSelection: FeatSpellSelection,
  data: DataLoader
): Character {
  if (!char.feats.includes(featId)) {
    throw new Error(`Feat "${featId}" not found on character`);
  }

  const feat = data.getFeat(featId);
  if (!feat) {
    throw new Error(`Feat "${featId}" not found in data`);
  }

  if (!feat.grants?.spellChoices) {
    throw new Error(`Feat "${featId}" does not have spell choices`);
  }

  // Update spell choices
  const newFeatSpellChoices = {
    ...char.featSpellChoices,
    [featId]: spellSelection,
  };

  // Build new character and recompute
  const newChar: Character = {
    ...char,
    featSpellChoices: newFeatSpellChoices,
    updatedAt: new Date().toISOString(),
  };

  return recomputeDerivedStats(newChar, data);
}

/**
 * Get all special abilities granted by a character's feats.
 * Useful for UI display and engine logic.
 *
 * @param char - The character
 * @param data - DataLoader
 * @returns Array of special ability names
 */
export function getFeatSpecialAbilities(
  char: Character,
  data: DataLoader
): string[] {
  const abilities: string[] = [];

  for (const featId of char.feats) {
    const feat = data.getFeat(featId);
    if (feat?.grants?.specialAbilities) {
      abilities.push(...feat.grants.specialAbilities);
    }
  }

  return abilities;
}
