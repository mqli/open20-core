// monsters/query.ts
// Monster query functions — filter, search, and retrieve monsters

import type { Monster, MonsterAction, MonsterFeature, MonsterReaction, MonsterLegendaryAction } from './types';
import type { MonsterSize, MonsterType, ChallengeRating } from '../types/monster';
import type { DataLoader } from '../data/loader';

// ── MonsterFilter Interface ─────────────────────────────────────

export interface MonsterFilter {
  name?: string;
  size?: MonsterSize[];
  type?: MonsterType[];
  minCR?: ChallengeRating;
  maxCR?: ChallengeRating;
  environment?: string[];
  source?: string;
}

// ── Query Functions ────────────────────────────────────────────

/**
 * Get a single monster by ID
 *
 * @param id - Monster ID (kebab-case)
 * @param data - DataLoader
 * @returns Monster or undefined
 *
 * @example
 * getMonster('goblin', data) // { id: 'goblin', name: 'Goblin', ... }
 */
export function getMonster(id: string, data: DataLoader): Monster | undefined {
  return data.getMonster(id);
}

/**
 * Search/filter monsters based on criteria
 *
 * @param filter - Filter criteria
 * @param data - DataLoader
 * @returns Array of matching monsters
 *
 * @example
 * searchMonsters({ minCR: 0, maxCR: 2, type: ['Beast'] }, data)
 */
export function searchMonsters(filter: MonsterFilter, data: DataLoader): Monster[] {
  let monsters = data.getAllMonsters();

  if (filter.name) {
    const searchLower = filter.name.toLowerCase();
    monsters = monsters.filter(
      m => m.id.toLowerCase().includes(searchLower) || 
           m.name.toLowerCase().includes(searchLower)
    );
  }

  if (filter.size && filter.size.length > 0) {
    const sizeSet = new Set(filter.size);
    monsters = monsters.filter(m => sizeSet.has(m.size));
  }

  if (filter.type && filter.type.length > 0) {
    const typeSet = new Set(filter.type);
    monsters = monsters.filter(m => typeSet.has(m.type));
  }

  if (filter.minCR !== undefined) {
    monsters = monsters.filter(m => compareCR(m.challengeRating.rating, filter.minCR!) >= 0);
  }

  if (filter.maxCR !== undefined) {
    monsters = monsters.filter(m => compareCR(m.challengeRating.rating, filter.maxCR!) <= 0);
  }

  if (filter.environment && filter.environment.length > 0) {
    const envSet = new Set(filter.environment);
    monsters = monsters.filter(m => 
      m.environments?.some(e => envSet.has(e))
    );
  }

  if (filter.source) {
    monsters = monsters.filter(m => m.source === filter.source);
  }

  return monsters;
}

/**
 * Get monsters by Challenge Rating range
 *
 * @param minCR - Minimum CR
 * @param maxCR - Maximum CR
 * @param data - DataLoader
 * @returns Array of monsters within CR range
 */
export function getMonstersByCR(
  minCR: ChallengeRating, 
  maxCR: ChallengeRating, 
  data: DataLoader
): Monster[] {
  return searchMonsters({ minCR, maxCR }, data);
}

/**
 * Get monsters by type
 *
 * @param type - Monster type
 * @param data - DataLoader
 * @returns Array of monsters of given type
 */
export function getMonstersByType(type: MonsterType, data: DataLoader): Monster[] {
  return searchMonsters({ type: [type] }, data);
}

/**
 * Get monsters appropriate for a party of given level
 *
 * @param partyLevel - Average party level
 * @param partySize - Number of players (default 4)
 * @param data - DataLoader
 * @returns Array of monsters with appropriate CR
 */
export function getMonstersForParty(
  partyLevel: number, 
  partySize: number = 4, 
  data: DataLoader
): Monster[] {
  // Simple CR filter: monster CR should be around partyLevel - 2 to partyLevel + 1
  const minCR = Math.max(0, partyLevel - 2) as ChallengeRating;
  const maxCR = (partyLevel + 1) as ChallengeRating;
  return getMonstersByCR(minCR, maxCR, data);
}

// ── Helper Functions ──────────────────────────────────────────

/**
 * Compare two Challenge Ratings
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareCR(a: ChallengeRating, b: ChallengeRating): number {
  const numericA = crToNumber(a);
  const numericB = crToNumber(b);
  return numericA < numericB ? -1 : numericA > numericB ? 1 : 0;
}

/**
 * Convert Challenge Rating to numeric value for comparison
 */
function crToNumber(cr: ChallengeRating): number {
  if (typeof cr === 'number') return cr;
  switch (cr) {
    case '1/8': return 0.125;
    case '1/4': return 0.25;
    case '1/2': return 0.5;
    default: return 0;
  }
}

// ── Action/Trait/Reaction Query Functions ─────────────────────

/**
 * Get all actions for a specific monster
 *
 * @param monsterId - Monster ID
 * @param data - DataLoader
 * @returns Array of actions or empty array
 *
 * @example
 * getMonsterActions('goblin', data) // [{ name: 'Scimitar', attacks: [...] }]
 */
export function getMonsterActions(monsterId: string, data: DataLoader): readonly MonsterAction[] {
  const monster = getMonster(monsterId, data);
  return monster?.actions ?? [];
}

/**
 * Get all traits for a specific monster
 *
 * @param monsterId - Monster ID
 * @param data - DataLoader
 * @returns Array of traits or empty array
 *
 * @example
 * getMonsterTraits('goblin', data) // [{ name: 'Nimble Escape', description: '...' }]
 */
export function getMonsterTraits(monsterId: string, data: DataLoader): readonly MonsterFeature[] {
  const monster = getMonster(monsterId, data);
  return monster?.traits ?? [];
}

/**
 * Get all reactions for a specific monster
 *
 * @param monsterId - Monster ID
 * @param data - DataLoader
 * @returns Array of reactions or empty array
 */
export function getMonsterReactions(monsterId: string, data: DataLoader): readonly MonsterReaction[] {
  const monster = getMonster(monsterId, data);
  return monster?.reactions ?? [];
}

/**
 * Get all legendary actions for a specific monster
 *
 * @param monsterId - Monster ID
 * @param data - DataLoader
 * @returns Array of legendary actions or empty array
 */
export function getMonsterLegendaryActions(monsterId: string, data: DataLoader): readonly MonsterLegendaryAction[] {
  const monster = getMonster(monsterId, data);
  return monster?.legendaryActions ?? [];
}

/**
 * Search monsters that have a specific trait
 *
 * @param traitName - Trait name (case-insensitive partial match)
 * @param data - DataLoader
 * @returns Array of monsters with the specified trait
 *
 * @example
 * getMonstersWithTrait('Pack Tactics', data) // [{ id: 'wolf', ... }]
 */
export function getMonstersWithTrait(traitName: string, data: DataLoader): Monster[] {
  const searchLower = traitName.toLowerCase();
  return data.getAllMonsters().filter(m =>
    m.traits?.some(t => t.name.toLowerCase().includes(searchLower))
  );
}

/**
 * Search monsters that have legendary actions
 *
 * @param data - DataLoader
 * @returns Array of monsters with legendary actions
 */
export function getLegendaryMonsters(data: DataLoader): Monster[] {
  return data.getAllMonsters().filter(m =>
    m.legendaryActions && m.legendaryActions.length > 0
  );
}

/**
 * Get all attacks from all actions of a monster
 *
 * @param monsterId - Monster ID
 * @param data - DataLoader
 * @returns Array of all attacks from all actions
 */
export function getMonsterAllAttacks(monsterId: string, data: DataLoader): MonsterAction[] {
  const actions = getMonsterActions(monsterId, data);
  return actions.filter(a => a.attacks && a.attacks.length > 0);
}

/**
 * Search actions by name across all monsters
 *
 * @param actionName - Action name (case-insensitive partial match)
 * @param data - DataLoader
 * @returns Array of { monsterId, monsterName, action }
 */
export function searchActionsByName(
  actionName: string,
  data: DataLoader
): Array<{ monsterId: string; monsterName: string; action: MonsterAction }> {
  const searchLower = actionName.toLowerCase();
  const results: Array<{ monsterId: string; monsterName: string; action: MonsterAction }> = [];

  for (const monster of data.getAllMonsters()) {
    if (!monster.actions) continue;
    for (const action of monster.actions) {
      if (action.name.toLowerCase().includes(searchLower)) {
        results.push({
          monsterId: monster.id,
          monsterName: monster.name,
          action
        });
      }
    }
  }

  return results;
}
