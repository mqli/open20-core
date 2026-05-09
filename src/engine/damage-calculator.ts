// engine/damage-calculator.ts
// Damage type & defense calculation — pure functions
// Corresponds to PRD §4.5

import type { Character } from '../types/character';
import type { DamageType, DamageDefenses, DamageDefenseSource, DamageResult } from '../types/damage';
export type { DamageDefenses, DamageDefenseSource, DamageResult } from '../types/damage';
import type { DataLoader } from '../data/loader';
import { modifyHP } from '../character/mutate';

/**
 * Check if character has a specific defense against a damage type
 */
function hasDefense(
  defenses: DamageDefenses,
  damageType: DamageType,
  check: 'resistance' | 'immunity' | 'vulnerability'
): boolean {
  switch (check) {
    case 'resistance':
      return defenses.resistances.includes(damageType);
    case 'immunity':
      return defenses.immunities.includes(damageType);
    case 'vulnerability':
      return defenses.vulnerabilities.includes(damageType);
  }
}

/**
 * Calculate effective damage after applying defenses
 * Rules:
 * - Immunity: 0 damage
 * - Resistance: half damage (round down)
 * - Vulnerability: double damage
 * - Resistance + Vulnerability: cancel out (normal damage)
 * - Multiple of same type: don't stack (take highest modifier only)
 *
 * @param damage - Raw damage amount (positive number)
 * @param damageType - Type of damage
 * @param defenses - Character's active damage defenses
 * @returns DamageResult with effective damage and modifiers applied
 */
export function calculateTypedDamage(
  damage: number,
  damageType: DamageType,
  defenses: DamageDefenses
): DamageResult {
  const modifiers: Array<DamageResult['modifiers'][number]> = [];

  // Check each defense type
  const isImmune = hasDefense(defenses, damageType, 'immunity');
  const isResistant = hasDefense(defenses, damageType, 'resistance');
  const isVulnerable = hasDefense(defenses, damageType, 'vulnerability');

  if (isImmune) {
    modifiers.push({ type: 'immunity', damageType });
    return {
      originalDamage: damage,
      effectiveDamage: 0,
      modifiers,
    };
  }

  let effectiveDamage = damage;

  // Apply resistance/vulnerability (they cancel if both present)
  if (isResistant && isVulnerable) {
    // Cancel out - normal damage, no modifier message needed
    // (neither resistance nor vulnerability applies when both present)
    effectiveDamage = damage;
  } else if (isResistant) {
    modifiers.push({ type: 'resistance', damageType });
    effectiveDamage = Math.floor(damage / 2);
  } else if (isVulnerable) {
    modifiers.push({ type: 'vulnerability', damageType });
    effectiveDamage = damage * 2;
  }

  return {
    originalDamage: damage,
    effectiveDamage,
    modifiers,
  };
}

/**
 * Get the standard damage type from a string (case-insensitive match)
 * Returns null if not a valid damage type
 */
export function parseDamageType(value: string): DamageType | null {
  const normalized = value.trim();
  const damageTypes: DamageType[] = [
    'Bludgeoning',
    'Piercing',
    'Slashing',
    'Fire',
    'Cold',
    'Lightning',
    'Thunder',
    'Acid',
    'Poison',
    'Psychic',
    'Force',
    'Necrotic',
    'Radiant',
  ];

  // Try exact match first (case-sensitive)
  if (damageTypes.includes(normalized as DamageType)) {
    return normalized as DamageType;
  }

  // Try case-insensitive match
  const lower = normalized.toLowerCase();
  for (const dt of damageTypes) {
    if (dt.toLowerCase() === lower) {
      return dt;
    }
  }

  // Handle common aliases
  const aliases: Record<string, DamageType> = {
    bludgeoning: 'Bludgeoning',
    piercing: 'Piercing',
    slashing: 'Slashing',
    physical: 'Slashing', // Generic, default to Slashing
    fire: 'Fire',
    cold: 'Cold',
    lightning: 'Lightning',
    thunder: 'Thunder',
    acid: 'Acid',
    poison: 'Poison',
    psychic: 'Psychic',
    force: 'Force',
    necrotic: 'Necrotic',
    radiant: 'Radiant',
    magical: 'Force', // Generic magical, default to Force
    'non-magical': 'Bludgeoning', // Generic physical
  };

  return aliases[lower] ?? null;
}

/**
 * Check if a string is a valid damage type
 */
export function isValidDamageType(value: string): boolean {
  return parseDamageType(value) !== null;
}

/**
 * Get list of all standard damage types
 */
export const ALL_DAMAGE_TYPES: readonly DamageType[] = [
  'Bludgeoning',
  'Piercing',
  'Slashing',
  'Fire',
  'Cold',
  'Lightning',
  'Thunder',
  'Acid',
  'Poison',
  'Psychic',
  'Force',
  'Necrotic',
  'Radiant',
];

/**
 * Get damage types by category
 */
export const DAMAGE_TYPE_CATEGORIES = {
  physical: ['Bludgeoning', 'Piercing', 'Slashing'] as const,
  elemental: ['Fire', 'Cold', 'Lightning', 'Thunder', 'Acid'] as const,
  magical: ['Psychic', 'Force', 'Necrotic', 'Radiant', 'Poison'] as const,
} as const;

// ── Damage Defense Aggregation ────────────────────────────────────────

/**
 * Physical damage types (affected by Barbarian Rage)
 */
const PHYSICAL_DAMAGE_TYPES: readonly DamageType[] = ['Bludgeoning', 'Piercing', 'Slashing'];

/**
 * Parse damage type from a feature description
 * Extracts damage types from phrases like "resistance to fire damage"
 */
function parseDefenseFromDescription(description: string): DamageType[] {
  const found: DamageType[] = [];
  const lowerDesc = description.toLowerCase();

  // Check for specific damage type mentions
  const typeMap: Record<string, DamageType> = {
    fire: 'Fire',
    cold: 'Cold',
    lightning: 'Lightning',
    thunder: 'Thunder',
    acid: 'Acid',
    poison: 'Poison',
    psychic: 'Psychic',
    force: 'Force',
    necrotic: 'Necrotic',
    radiant: 'Radiant',
    bludgeoning: 'Bludgeoning',
    piercing: 'Piercing',
    slashing: 'Slashing',
  };

  for (const [keyword, dtype] of Object.entries(typeMap)) {
    if (
      lowerDesc.includes(`resistance to ${keyword}`) ||
      lowerDesc.includes(`${keyword} resistance`) ||
      lowerDesc.includes(`resistance to ${keyword} damage`)
    ) {
      if (!found.includes(dtype)) {
        found.push(dtype);
      }
    }
  }

  return found;
}

/**
 * Check if a character has the 'Raging' condition active
 */
function isRaging(char: Character): boolean {
  return char.conditions.some(c => c.id === 'Raging' || c.id === 'Concentrating');
}

/**
 * Check if character has a specific class at minimum level
 */
function _hasClassLevel(char: Character, classId: string, minLevel: number): boolean {
  return char.classes.some(c => c.classId === classId && c.level >= minLevel);
}

/**
 * Get damage defenses from species features
 */
function getSpeciesDefenses(char: Character, dataLoader: DataLoader): DamageDefenseSource | null {
  const species = dataLoader.getSpecies(char.species);
  if (!species) return null;

  const defenses: DamageType[] = [];
  const baseTraits = species.baseTraits ?? [];
  const subtype = char.speciesSubtype
    ? dataLoader.getSpeciesSubtype(char.species, char.speciesSubtype)
    : null;
  const subtypeTraits = subtype?.traits ?? [];

  const allTraits = [...baseTraits, ...subtypeTraits];

  for (const trait of allTraits) {
    if (!trait.description) continue;
    const found = parseDefenseFromDescription(trait.description);
    defenses.push(...found);
  }

  if (defenses.length === 0) return null;

  // Deduplicate
  const unique = [...new Set(defenses)];

  const sourceName = subtype ? subtype.name : species.id;

  return {
    source: `${sourceName} traits`,
    type: 'species',
    defenses: {
      resistances: unique,
      immunities: [],
      vulnerabilities: [],
    },
  };
}

/**
 * Get damage defenses from class features
 * Handles conditional defenses like Barbarian Rage
 */
function getClassDefenses(char: Character, dataLoader: DataLoader): DamageDefenseSource[] {
  const sources: DamageDefenseSource[] = [];

  for (const charClass of char.classes) {
    const classData = dataLoader.getClass(charClass.classId);
    if (!classData) continue;

    // Check all features for damage resistances
    for (const [level, features] of classData.featuresByLevel) {
      if (level > charClass.level) continue;

      for (const feature of features) {
        const found = parseDefenseFromDescription(feature.description);

        // Special case: Barbarian Rage - only active while raging
        if (feature.name === 'Rage' && charClass.classId === 'Barbarian') {
          if (isRaging(char)) {
            sources.push({
              source: `Barbarian Rage (active)`,
              type: 'class',
              defenses: {
                resistances: [...PHYSICAL_DAMAGE_TYPES],
                immunities: [],
                vulnerabilities: [],
              },
            });
          }
          // Don't add permanent B/P/S resistance from Rage feature
          continue;
        }

        if (found.length > 0) {
          sources.push({
            source: `${classData.name} ${feature.name}`,
            type: 'class',
            defenses: {
              resistances: found,
              immunities: [],
              vulnerabilities: [],
            },
          });
        }
      }
    }
  }

  return sources;
}

/**
 * Get damage defenses from equipment
 */
function getEquipmentDefenses(char: Character): DamageDefenseSource[] {
  const sources: DamageDefenseSource[] = [];
  const resistances: DamageType[] = [];
  const immunities: DamageType[] = [];

  for (const item of char.equipment) {
    if (!item.equipped) continue;

    // Check for resistance properties on items
    // This is a simplified check - in a full implementation,
    // we'd have explicit resistance fields on equipment items
    if ('resistance' in item && item.resistance) {
      const parsed = parseDamageType(String(item.resistance));
      if (parsed) {
        resistances.push(parsed);
      }
    }
  }

  if (resistances.length > 0 || immunities.length > 0) {
    sources.push({
      source: 'Equipped items',
      type: 'equipment',
      defenses: {
        resistances: [...new Set(resistances)],
        immunities: [...new Set(immunities)],
        vulnerabilities: [],
      },
    });
  }

  return sources;
}

/**
 * Get damage defenses from active conditions
 */
function getConditionDefenses(char: Character): DamageDefenseSource[] {
  const sources: DamageDefenseSource[] = [];

  for (const condition of char.conditions) {
    // Check for spells/effects that grant defenses
    // This would be expanded with actual spell effect data
    // For now, we handle known defensive conditions

    // Example: Protection from Energy grants chosen damage type resistance
    if (condition.id === 'Concentrating' && condition.source.includes('Protection from Energy')) {
      // Would need additional data to determine which type
      // Placeholder - actual implementation would track this
    }
  }

  return sources;
}

/**
 * Aggregate all damage defenses from character sources
 * Returns both aggregated defenses and detailed sources for debugging
 *
 * @param char - The character to get defenses for
 * @param dataLoader - DataLoader for accessing game data
 * @returns Object containing aggregated defenses and individual sources
 */
export function getActiveDamageDefenses(
  char: Character,
  dataLoader: DataLoader
): {
  defenses: DamageDefenses;
  sources: readonly DamageDefenseSource[];
} {
  const allSources: DamageDefenseSource[] = [];

  // Collect from all sources
  const speciesSource = getSpeciesDefenses(char, dataLoader);
  if (speciesSource) allSources.push(speciesSource);

  const classSources = getClassDefenses(char, dataLoader);
  allSources.push(...classSources);

  const equipmentSources = getEquipmentDefenses(char);
  allSources.push(...equipmentSources);

  const conditionSources = getConditionDefenses(char);
  allSources.push(...conditionSources);

  // Include character's custom persistent defenses (only if non-empty)
  const { damageDefenses } = char;
  if (
    damageDefenses.resistances.length > 0 ||
    damageDefenses.immunities.length > 0 ||
    damageDefenses.vulnerabilities.length > 0
  ) {
    allSources.push({
      source: 'Character custom defenses',
      type: 'custom',
      defenses: damageDefenses,
    });
  }

  // Aggregate all defenses
  const allResistances = new Set<DamageType>();
  const allImmunities = new Set<DamageType>();
  const allVulnerabilities = new Set<DamageType>();

  for (const source of allSources) {
    for (const r of source.defenses.resistances) allResistances.add(r);
    for (const i of source.defenses.immunities) allImmunities.add(i);
    for (const v of source.defenses.vulnerabilities) allVulnerabilities.add(v);
  }

  return {
    defenses: {
      resistances: [...allResistances],
      immunities: [...allImmunities],
      vulnerabilities: [...allVulnerabilities],
    },
    sources: allSources,
  };
}

/**
 * Convenience function: Get only aggregated defenses
 */
export function getDamageDefenses(char: Character, dataLoader: DataLoader): DamageDefenses {
  return getActiveDamageDefenses(char, dataLoader).defenses;
}

/**
 * Apply typed damage with character's active defenses
 * Combines damage calculation with automatic defense aggregation
 */
export function applyDamageWithDefenses(
  char: Character,
  damage: number,
  damageType: DamageType,
  dataLoader: DataLoader
): { char: Character; result: DamageResult; defenses: DamageDefenses } {
  const { defenses } = getActiveDamageDefenses(char, dataLoader);
  const result = calculateTypedDamage(damage, damageType, defenses);
  const updatedChar = modifyHP(char, -result.effectiveDamage);

  return {
    char: updatedChar,
    result,
    defenses,
  };
}
