// character/resource-builder.ts
// Pure functions to extract resources from class features.
// Returns Record<string, CharacterClassResources> keyed by classId.
// Shared by create.ts, recompute.ts, and level-up.ts.

import type { Feature, Class, Subclass } from '../types/class';
import type { Resource, CharacterClassResources } from '../types/resource';
import { ResetType } from '../types/resource';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { getModifier, getTotalScore } from '../engine/ability-modifier';
import type { AbilityScores } from '../types/ability';

/**
 * Extract per-class resources from all character classes.
 * Returns Record<classId, CharacterClassResources>.
 *
 * For each class: collects features up to the class's current level,
 * builds a Resource for each feature that has a resourceId.
 * Also includes subclass features.
 */
export function extractAllClassResources(
  charClasses: ReadonlyArray<{ classId: string; level: number; subclassId: string | null }>,
  abilityScores: AbilityScores,
  data: { getClass(id: string): Class | undefined; getSubclass(id: string): Subclass | undefined },
): Record<string, CharacterClassResources> {
  const result: Record<string, CharacterClassResources> = {};

  for (const cc of charClasses) {
    const classData = data.getClass(cc.classId);
    if (!classData) continue;

    const subclassData = cc.subclassId ? data.getSubclass(cc.subclassId) : undefined;

    const resources = buildResourcesForClass(classData, subclassData, cc.level, abilityScores);

    result[cc.classId] = {
      classId: cc.classId,
      resources,
    };
  }

  return result;
}

/**
 * Build Resource[] for a single class (including subclass features).
 */
function buildResourcesForClass(
  classData: Class,
  subclassData: Subclass | undefined,
  level: number,
  abilityScores: AbilityScores,
): readonly Resource[] {
  const resources: Resource[] = [];
  const pb = getProficiencyBonus(level);

  // Gather features from class and subclass up to `level`
  const allFeatures = gatherFeaturesUpToLevel(classData, subclassData, level);

  for (const feature of allFeatures) {
    if (!feature.resourceId) continue;

    // Avoid duplicates
    if (resources.some(r => r.id === feature.resourceId)) continue;

    const resource = buildResourceFromFeature(feature, level, pb, abilityScores);
    if (resource) {
      resources.push(resource);
    }
  }

  return Object.freeze(resources);
}

/**
 * Gather all features (class + subclass) up to the given level.
 */
function gatherFeaturesUpToLevel(
  classData: Class,
  subclassData: Subclass | undefined,
  level: number,
): Feature[] {
  const features: Feature[] = [];

  // Class features
  for (const entry of classData.featuresByLevel) {
    if (entry.level > level) break;
    for (const f of entry.features) {
      features.push(f);
    }
  }

  // Subclass features
  if (subclassData) {
    for (const entry of subclassData.featuresByLevel) {
      if (entry.level > level) break;
      for (const f of entry.features) {
        features.push(f);
      }
    }
  }

  return features;
}

/**
 * Build a Resource object from a feature definition.
 * Reads resourceMaxByLevel, resourceMax, resourceScaleWithPB, resourceResetOn
 * from the feature JSON. Falls back to defaults.
 */
function buildResourceFromFeature(
  feature: Feature,
  level: number,
  pb: number,
  abilityScores: AbilityScores,
): Resource | null {
  const resourceId = feature.resourceId!;
  const chaMod = getModifier(getTotalScore(abilityScores, 'Charisma'));

  let max: number;

  // Priority: resourceScaleWithPB > resourceMaxByLevel > resourceMax > fallback formula
  if (feature.resourceScaleWithPB) {
    // PB scaling: max is always the proficiency bonus (e.g. Second Wind, Action Surge, Indomitable)
    max = pb;
  } else if (feature.resourceMaxByLevel) {
    max = resolveResourceMaxByLevel(feature.resourceMaxByLevel, level);
  } else if (feature.resourceMax !== undefined) {
    max = feature.resourceMax;
  } else {
    max = computeDefaultMax(resourceId, level, chaMod);
  }

  const resetOn = parseResetType(feature.resourceResetOn);

  return {
    id: resourceId,
    name: resourceId,
    max,
    used: 0,
    resetOn,
  };
}

/**
 * Resolve resourceMaxByLevel: find the highest key <= level.
 */
function resolveResourceMaxByLevel(
  table: Record<number, number> | Record<string, number>,
  level: number,
): number {
  // Normalize to Record<string, number> for uniform access
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(table)) {
    normalized[String(k)] = v;
  }

  let best = 0;
  for (const rawKey of Object.keys(normalized)) {
    const key = parseInt(rawKey, 10);
    if (key <= level && key > best) {
      best = key;
    }
  }
  if (best === 0) return 0;
  return normalized[String(best)] ?? 0;
}

/**
 * Compute default max for resources without explicit resourceMax/resourceMaxByLevel.
 * These are special cases where the formula depends on ability mods or PB.
 */
function computeDefaultMax(
  resourceId: string,
  level: number,
  chaMod: number,
): number {
  switch (resourceId) {
    case 'Bardic Inspiration':
      // CHA modifier (minimum 1)
      return Math.max(1, chaMod);

    case 'Lay On Hands':
      // Paladin level × 5 (handled by resourceMaxByLevel in JSON, but fallback)
      return level * 5;

    case 'Sorcery Points':
      // Sorcerer level (handled by resourceMaxByLevel in JSON, but fallback)
      return level;

    case "Monk's Focus":
      // Monk level
      return level;

    default:
      return 1;
  }
}

function parseResetType(value: string | ResetType | undefined): ResetType {
  if (value === undefined) return ResetType.LongRest;
  if (typeof value === 'string') {
    switch (value) {
      case 'Short Rest': return ResetType.ShortRest;
      case 'Long Rest': return ResetType.LongRest;
      case 'Per Turn': return ResetType.PerTurn;
      case 'Daily': return ResetType.Daily;
      case 'Never': return ResetType.Never;
      default: return ResetType.LongRest;
    }
  }
  return value;
}

// ── Recomputation ─────────────────────────────────────────────

/**
 * Recompute resource max values for all classes.
 * Rebuilds from scratch using current levels/features, then preserves used counts.
 * Called from recomputeDerivedStats and levelUp.
 *
 * Handles both old format (Resource[]) and new format (Record<string, CharacterClassResources>).
 */
export function recomputeResources(
  resources: Record<string, CharacterClassResources> | readonly Resource[],
  charClasses: ReadonlyArray<{ classId: string; level: number; subclassId: string | null }>,
  abilityScores: AbilityScores,
  data: { getClass(id: string): Class | undefined; getSubclass(id: string): Subclass | undefined },
): Record<string, CharacterClassResources> {
  // Always rebuild from scratch using current levels/features
  const newResources = extractAllClassResources(charClasses, abilityScores, data);

  // Preserve used counts from existing resources (if in new format)
  if (!Array.isArray(resources)) {
    for (const [classId, ccr] of Object.entries(resources)) {
      const newCcr = newResources[classId];
      if (!newCcr) continue;

      // Copy used counts from old resources to new resources
      const updatedResources = newCcr.resources.map(newR => {
        const oldR = ccr.resources.find((r: Resource) => r.id === newR.id);
        if (oldR) {
          return { ...newR, used: Math.min(oldR.used, newR.max) };
        }
        return newR;
      });

      newResources[classId] = { classId, resources: Object.freeze(updatedResources) };
    }
  }

  return newResources;
}


