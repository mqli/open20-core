// monsters/query.ts
// Monster query functions — filter, search, and retrieve monsters

import type { Monster, MonsterAction, MonsterFeature, MonsterReaction, MonsterLegendaryAction } from './types';
import type { MonsterSize, MonsterType, ChallengeRating, AttackNotation } from '../types/monster';
import type { DamageType } from '../types/damage';
import type { DataLoader } from '../data/loader';

// ── MonsterFilter Interface ─────────────────────────────────────

export interface MonsterFilter {
  name?: string;
  size?: MonsterSize[];
  type?: MonsterType[];
  minCR?: ChallengeRating;
  maxCR?: ChallengeRating;
  environment?: string[];
  source?: string[];
  damageResistances?: DamageType[];    // Filter by damage resistances
  damageImmunities?: DamageType[];     // Filter by damage immunities
  damageVulnerabilities?: DamageType[]; // Filter by damage vulnerabilities
  conditionImmunities?: string[];      // Filter by condition immunities
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

  if (filter.source && filter.source.length > 0) {
    const sourceSet = new Set(filter.source);
    monsters = monsters.filter(m => sourceSet.has(m.source));
  }

  if (filter.damageResistances && filter.damageResistances.length > 0) {
    const resSet = new Set(filter.damageResistances);
    monsters = monsters.filter(m =>
      m.resistances?.some(r => resSet.has(r))
    );
  }

  if (filter.damageImmunities && filter.damageImmunities.length > 0) {
    const immSet = new Set(filter.damageImmunities);
    monsters = monsters.filter(m =>
      m.damageDefenses?.immunities.some(i => immSet.has(i))
    );
  }

  if (filter.damageVulnerabilities && filter.damageVulnerabilities.length > 0) {
    const vulnSet = new Set(filter.damageVulnerabilities);
    monsters = monsters.filter(m =>
      m.vulnerabilities?.some(v => vulnSet.has(v))
    );
  }

  if (filter.conditionImmunities && filter.conditionImmunities.length > 0) {
    const condSet = new Set(filter.conditionImmunities);
    monsters = monsters.filter(m =>
      m.conditionImmunities?.some(c => condSet.has(c))
    );
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

// ── Limited Usage (R28.12) ──────────────────────

/**
 * Parse limited usage from action name/description
 * Identifies "X/Day", "Recharge X-Y", "Recharge after Short/Long Rest"
 *
 * @param actionName - Action name (e.g., "Fire Breath (Recharge 5-6)")
 * @param description - Action description
 * @returns Limited usage object or undefined if no limited usage found
 */
export function parseLimitedUsage(actionName: string, description?: string): { type: 'x_per_day' | 'recharge' | 'recharge_after_rest'; uses?: number; rechargeRange?: [number, number]; rechargeOn?: 'short_rest' | 'long_rest' } | undefined {
  const text = `${actionName} ${description || ''}`;
  
  // Check for "Recharge X-Y"
  const rechargeMatch = text.match(/Recharge\s+(\d+)\s*-\s*(\d+)/i);
  if (rechargeMatch) {
    return {
      type: 'recharge',
      rechargeRange: [parseInt(rechargeMatch[1]!, 10), parseInt(rechargeMatch[2]!, 10)]
    };
  }
  
  // Check for "X/Day"
  const xPerDayMatch = text.match(/(\d+)\s*\/\s*Day/i);
  if (xPerDayMatch) {
    return {
      type: 'x_per_day',
      uses: parseInt(xPerDayMatch[1]!, 10)
    };
  }
  
  // Check for "Recharge after Short/Long Rest"
  if (text.toLowerCase().includes('recharge after')) {
    const restType = text.toLowerCase().includes('short') ? 'short_rest' : 'long_rest';
    return {
      type: 'recharge_after_rest',
      rechargeOn: restType
    };
  }
  
  return undefined;
}

/**
 * Get limited usage for a specific action
 *
 * @param monsterId - Monster ID
 * @param actionName - Action name
 * @param data - DataLoader
 * @returns Limited usage or undefined
 */
export function getActionLimitedUsage(
  monsterId: string,
  actionName: string,
  data: DataLoader
): { type: 'x_per_day' | 'recharge' | 'recharge_after_rest'; uses?: number; rechargeRange?: [number, number]; rechargeOn?: 'short_rest' | 'long_rest' } | undefined {
  const actions = getMonsterActions(monsterId, data);
  const action = actions.find(a => a.name === actionName || a.name.toLowerCase().includes(actionName.toLowerCase()));
  
  if (!action) return undefined;
  
  // If limitedUsage is already parsed and stored, return it
  if (action.limitedUsage) {
    // Explicitly create a new object with mutable tuple for return type compatibility
    return {
      type: action.limitedUsage.type,
      uses: action.limitedUsage.uses,
      rechargeRange: action.limitedUsage.rechargeRange ? [...action.limitedUsage.rechargeRange] as [number, number] : undefined,
      rechargeOn: action.limitedUsage.rechargeOn
    };
  }
    
  // Otherwise, try to parse from action name and description
  return parseLimitedUsage(action.name, action.description);
}

// ── Damage Notation (R28.10) ────────────────────────

/**
 * Parse damage notation from attack description
 * Extracts fixed value and die expression
 *
 * @param description - Attack description text
 * @returns Damage notation object or undefined if no notation found
 *
 * @example
 * parseDamageNotation("13 (1d10 + 8) Slashing damage")
 * // { fixedValue: 13, dieExpression: "1d10 + 8" }
 */
export function parseDamageNotation(description: string): { fixedValue?: number; dieExpression?: string } | undefined {
  if (!description) return undefined;

  // Look for pattern: "N (XdY + Z)" or "N (XdY)" or "N (XdY - Z)"
  const damageNotationRegex = /(\d+)\s*\(\s*(\d*d\d+(?:\s*[+-]\s*\d+)?)\s*\)/;
  const match = description.match(damageNotationRegex);
  
  if (match) {
    const fixedValue = parseInt(match[1]!, 10);
    const dieExpression = match[2]!.replace(/\s+/g, '');
    return { fixedValue, dieExpression };
  }

  return undefined;
}

/**
 * Get damage notation for a specific attack
 *
 * @param monsterId - Monster ID
 * @param actionName - Action name
 * @param attackName - Attack name (optional, uses first attack if not specified)
 * @param data - DataLoader
 * @returns Damage notation or undefined
 */
export function getAttackDamageNotation(
  monsterId: string,
  actionName: string,
  attackName: string | undefined,
  data: DataLoader
): { fixedValue?: number; dieExpression?: string } | undefined {
  const actions = getMonsterActions(monsterId, data);
  const action = actions.find(a => a.name === actionName || a.name.toLowerCase().includes(actionName.toLowerCase()));
  
  if (!action || !action.attacks || action.attacks.length === 0) return undefined;
  
  // Find the specific attack
  const attack = attackName 
    ? action.attacks.find(a => a.name === attackName || a.name.toLowerCase().includes(attackName.toLowerCase()))
    : action.attacks[0];
  
  if (!attack) return undefined;
  
  // If damageNotation is already parsed and stored, return it
  if (attack.damageNotation) return attack.damageNotation;
  
  // Otherwise, try to parse from action description
  if (action.description) {
    return parseDamageNotation(action.description);
  }
  
  return undefined;
}

// ── Saving Throw Effect Notation (R28.9) ─────────────────────

/**
 * Parse saving throw effect notation from action description
 * Extracts save type, DC, description, success/failure effects
 *
 * @param description - Action description text
 * @returns SavingThrowEffect object or undefined if no notation found
 *
 * @example
 * parseSavingThrowEffect("*Dexterity Saving Throw*: DC 21, each creature in a 60-foot Cone. *Failure:* 59 (17d6) Fire damage. *Success:* Half damage.")
 * // { saveType: "Dexterity", dc: 21, description: "each creature in a 60-foot Cone", onSaveFailure: "59 (17d6) Fire damage.", onSaveSuccess: "Half damage.", halfDamageOnSuccess: true }
 */
export function parseSavingThrowEffect(description: string): { saveType?: string; dc?: number; description?: string; onSaveSuccess?: string; onSaveFailure?: string; halfDamageOnSuccess?: boolean } | undefined {
  if (!description) return undefined;

  const result: { saveType?: string; dc?: number; description?: string; onSaveSuccess?: string; onSaveFailure?: string; halfDamageOnSuccess?: boolean } = {};

  // Look for "Saving Throw:" or "Saving Throw*:" notation
  const saveMatch = description.match(/[*]?\s*(\w+)\s+Saving Throw[*]?\s*:\s*DC\s*(\d+)/i);
  if (saveMatch) {
    result.saveType = saveMatch[1]!;
    result.dc = parseInt(saveMatch[2]!, 10);
  }

  // Look for description between DC and "*Failure:" or "*Success:"
  const descMatch = description.match(/DC\s*\d+\s*,\s*([^]*?)(?=\s*[*]\s*(?:Failure|Success):)/i);
  if (descMatch) {
    result.description = descMatch[1]!.trim();
  }

  // Look for "*Failure:" notation
  const failureMatch = description.match(/[*]\s*Failure\s*:\s*([^]*?)(?=\s*[*]\s*Success\s*:|$)/i);
  if (failureMatch) {
    result.onSaveFailure = failureMatch[1]!.trim();
  }

  // Look for "*Success:" notation
  const successMatch = description.match(/[*]\s*Success\s*:\s*([^]*?)$/i);
  if (successMatch) {
    result.onSaveSuccess = successMatch[1]!.trim();
    // Check if success means half damage
    if (result.onSaveSuccess.toLowerCase().includes('half')) {
      result.halfDamageOnSuccess = true;
    }
  }

  if (result.saveType || result.dc) {
    return result;
  }

  return undefined;
}

/**
 * Get saving throw effect for a specific action
 *
 * @param monsterId - Monster ID
 * @param actionName - Action name
 * @param data - DataLoader
 * @returns SavingThrowEffect or undefined
 */
export function getActionSavingThrowEffect(
  monsterId: string,
  actionName: string,
  data: DataLoader
): { saveType?: string; dc?: number; description?: string; onSaveSuccess?: string; onSaveFailure?: string; halfDamageOnSuccess?: boolean } | undefined {
  const actions = getMonsterActions(monsterId, data);
  const action = actions.find(a => a.name === actionName || a.name.toLowerCase().includes(actionName.toLowerCase()));
  
  if (!action) return undefined;
  
  // If savingThrowEffect is already parsed and stored, return it
  if (action.savingThrowEffect) {
    return {
      saveType: action.savingThrowEffect.saveType,
      dc: action.savingThrowEffect.dc,
      description: action.savingThrowEffect.description,
      onSaveSuccess: action.savingThrowEffect.onSaveSuccess,
      onSaveFailure: action.savingThrowEffect.onSaveFailure,
      halfDamageOnSuccess: action.savingThrowEffect.halfDamageOnSuccess
    };
  }
  
  // Otherwise, try to parse from description
  if (action.description) {
    return parseSavingThrowEffect(action.description);
  }
  
  return undefined;
}

// ── Attack Notation Parsing (R28.8) ─────────────────────

/**
 * Parse attack notation from action description
 * Extracts "Hit:", "Miss:", and "Hit or Miss:" sections
 *
 * @param description - Action description text
 * @returns AttackNotation object or undefined if no notation found
 *
 * @example
 * parseAttackNotation("Melee Attack Roll: +5. Hit: 7 (1d6+4) piercing damage.")
 * // { hit: "7 (1d6+4) piercing damage." }
 */
export function parseAttackNotation(description: string): AttackNotation | undefined {
  if (!description) return undefined;

  let hit: string | undefined;
  let miss: string | undefined;
  let hitOrMiss: string | undefined;

  // Look for "Hit or Miss:" notation first (most specific)
  const hitOrMissIndex = description.search(/Hit or Miss:/i);
  if (hitOrMissIndex !== -1) {
    hitOrMiss = description.substring(hitOrMissIndex + "Hit or Miss:".length).trim();
  }

  // Look for "Hit:" notation
  const hitIndex = description.search(/Hit:/i);
  if (hitIndex !== -1) {
    const endIndex = hitOrMissIndex !== -1 ? hitOrMissIndex : description.search(/Miss:/i);
    if (endIndex === -1 || endIndex > hitIndex) {
      const hitText = endIndex === -1 
        ? description.substring(hitIndex + "Hit:".length)
        : description.substring(hitIndex + "Hit:".length, endIndex);
      hit = hitText.trim();
    }
  }

  // Look for "Miss:" notation
  const missIndex = description.search(/Miss:/i);
  if (missIndex !== -1) {
    const endIndex = hitOrMissIndex !== -1 ? hitOrMissIndex : description.length;
    if (missIndex > hitIndex || hitIndex === -1) {
      const missText = missIndex + "Miss:".length >= endIndex
        ? ''
        : description.substring(missIndex + "Miss:".length, endIndex);
      miss = missText.trim();
    }
  }

  if (hit || miss || hitOrMiss) {
    return { hit, miss, hitOrMiss };
  }

  return undefined;
}

/**
 * Get attack notation for a specific action
 *
 * @param monsterId - Monster ID
 * @param actionName - Action name
 * @param data - DataLoader
 * @returns AttackNotation or undefined
 */
export function getActionAttackNotation(
  monsterId: string,
  actionName: string,
  data: DataLoader
): AttackNotation | undefined {
  const actions = getMonsterActions(monsterId, data);
  const action = actions.find(a => a.name === actionName || a.name.toLowerCase().includes(actionName.toLowerCase()));
  
  if (!action) return undefined;
  
  // If attackNotation is already parsed and stored, return it
  if (action.attackNotation) return action.attackNotation;
  
  // Otherwise, try to parse from description
  if (action.description) {
    return parseAttackNotation(action.description);
  }
  
  return undefined;
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
