// character/resource-builder.ts
// Pure functions to extract Resource[] from class features.
// Shared by create.ts and level-up.ts.

import type { Feature, Class, Subclass } from '../types/class';
import type { Resource } from '../types/resource';
import { ResetType } from '../types/resource';
import { getFeaturesAtLevel } from './utils';
import { getProficiencyBonus } from '../engine/proficiency-bonus';

// Default resource definitions (used when a feature doesn't specify values).
// scaleWithPBByDefault: resource scales with PB even if the feature doesn't say so.
//
// NOTE: Some resources scale with class level or ability modifiers (e.g., Sorcery Points
// scale with Sorcerer level, Bardic Inspiration scales with CHA mod, Lay on Hands is a
// point pool = Paladin level × 5). The current simplified model uses flat defaults or PB
// scaling as a reasonable MVP approximation. Feature-level overrides (resourceMax,
// resourceScaleWithPB) should be preferred when available.
const RESOURCE_DEFS: Record<string, { max: number; resetOn: ResetType; scaleWithPBByDefault?: boolean }> = {
  'Second Wind': { max: 1, resetOn: ResetType.ShortRest, scaleWithPBByDefault: true },
  Rage: { max: 2, resetOn: ResetType.LongRest },
  'Lay on Hands': { max: 5, resetOn: ResetType.LongRest },           // Pool: Paladin level × 5 (MVP: flat 5)
  'Bardic Inspiration': { max: 1, resetOn: ResetType.LongRest },      // Actual: CHA mod per long rest (MVP: flat 1)
  'Channel Divinity': { max: 1, resetOn: ResetType.ShortRest },
  'Wild Shape': { max: 2, resetOn: ResetType.ShortRest },
  'Sorcery Points': { max: 2, resetOn: ResetType.LongRest },          // Starts at 2 (Sorcerer level 2+); scales with class level
  'Focus Points': { max: 1, resetOn: ResetType.ShortRest },           // Scales with Monk level
  'Action Surge': { max: 1, resetOn: ResetType.ShortRest, scaleWithPBByDefault: true },
  Indomitable: { max: 1, resetOn: ResetType.LongRest, scaleWithPBByDefault: true },
};

/**
 * Extract resources from class features up to a given level.
 * Collects all features from level 1 to `level` that have a `resourceId`.
 */
export function extractResources(classData: Class | Subclass, level: number, proficiencyBonus?: number): Resource[] {
  const resources: Resource[] = [];

  for (let lv = 1; lv <= level; lv++) {
    const features = getFeaturesAtLevel(classData, lv);

    for (const feature of features) {
      if (!feature.resourceId) continue;

      // Avoid duplicates (if low level already added the resource)
      if (resources.some(r => r.id === feature.resourceId)) continue;

      const resource = buildResource(feature, level, proficiencyBonus);
      if (resource) {
        resources.push(resource);
      }
    }
  }

  return resources;
}

/**
 * Build a Resource object from a feature's resource definition.
 * Prefers values defined on the feature; falls back to RESOURCE_DEFS.
 */
function buildResource(feature: Feature, level: number, proficiencyBonus?: number): Resource | null {
  const resourceId = feature.resourceId!;
  const pb = proficiencyBonus ?? getProficiencyBonus(level);
  const def = RESOURCE_DEFS[resourceId];
  if (!def) {
    console.warn(`[resource-builder] Unknown resource "${resourceId}" – skipped. Add it to RESOURCE_DEFS.`);
    return null;
  }

  const max = feature.resourceMax !== undefined ? feature.resourceMax : def.max;
  const resetOn = feature.resourceResetOn ?? def.resetOn;

  const scaleWithPB = feature.resourceScaleWithPB ?? def.scaleWithPBByDefault ?? false;
  const finalMax = scaleWithPB ? pb : max;

  return {
    id: resourceId,
    name: resourceId,
    max: finalMax,
    used: 0,
    resetOn,
  };
}
