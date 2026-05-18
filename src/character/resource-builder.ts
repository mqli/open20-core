// character/resource-builder.ts
// Pure functions to extract Resource[] from class features.
// Shared by create.ts and level-up.ts.

import type { Feature } from '../types/class';
import type { Resource } from '../types/resource';
import { ResetType } from '../types/resource';
import { getFeaturesAtLevel } from './utils';

/**
 * Extract resources from class features up to a given level.
 * Collects all features from level 1 to `level` that have a `resourceId`.
 */
export function extractResources(classData: { featuresByLevel: { level: number; features: readonly Feature[] }[] }, level: number, proficiencyBonus?: number): Resource[] {
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

  // Default resource definitions (used when feature doesn't define values)
  // scaleWithPBByDefault: resources that scale with PB even if feature doesn't say so
  const RESOURCE_DEFS: Record<string, { max: number; resetOn: ResetType; scaleWithPBByDefault?: boolean }> = {
    'Second Wind': { max: 1, resetOn: ResetType.ShortRest, scaleWithPBByDefault: true },
    Rage: { max: 2, resetOn: ResetType.LongRest },
    'Lay on Hands': { max: 5, resetOn: ResetType.LongRest },
    'Bardic Inspiration': { max: 1, resetOn: ResetType.LongRest },
    'Channel Divinity': { max: 1, resetOn: ResetType.ShortRest },
    'Wild Shape': { max: 2, resetOn: ResetType.ShortRest },
    'Sorcery Points': { max: 1, resetOn: ResetType.LongRest },
    'Focus Points': { max: 1, resetOn: ResetType.ShortRest },
    'Action Surge': { max: 1, resetOn: ResetType.ShortRest, scaleWithPBByDefault: true },
    Indomitable: { max: 1, resetOn: ResetType.LongRest, scaleWithPBByDefault: true },
  };

  const pb = proficiencyBonus ?? (2 + Math.floor((level - 1) / 4));

  const def = RESOURCE_DEFS[resourceId];
  if (!def) {
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
