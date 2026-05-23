// character/mutate/resources.ts
// Resource-related character mutations (per-class model)

import type { Character } from '../../types/character';
import type { CharacterClassResources } from '../../types/resource';
import { withUpdate } from './hp';

/**
 * Consume one use of a resource.
 * Looks up the resource by classId + resourceId in the per-class Record.
 */
export function consumeResource(
  char: Character,
  classId: string,
  resourceId: string,
): Character {
  const ccr = char.resources[classId];
  if (!ccr) return char;

  const idx = ccr.resources.findIndex(r => r.id === resourceId);
  if (idx === -1) return char;

  const resource = ccr.resources[idx]!;
  if (resource.used >= resource.max) return char;

  const newResources = [...ccr.resources];
  newResources[idx] = { ...resource, used: resource.used + 1 };

  const updated: Record<string, CharacterClassResources> = {
    ...char.resources,
    [classId]: { ...ccr, resources: Object.freeze(newResources) },
  };

  return withUpdate(char, { resources: updated });
}

/**
 * Recover one use of a resource.
 * Looks up the resource by classId + resourceId in the per-class Record.
 */
export function recoverResource(
  char: Character,
  classId: string,
  resourceId: string,
): Character {
  const ccr = char.resources[classId];
  if (!ccr) return char;

  const idx = ccr.resources.findIndex(r => r.id === resourceId);
  if (idx === -1) return char;

  const resource = ccr.resources[idx]!;
  if (resource.used <= 0) return char;

  const newResources = [...ccr.resources];
  newResources[idx] = { ...resource, used: resource.used - 1 };

  const updated: Record<string, CharacterClassResources> = {
    ...char.resources,
    [classId]: { ...ccr, resources: Object.freeze(newResources) },
  };

  return withUpdate(char, { resources: updated });
}

/**
 * Consume a resource without knowing the classId (searches all classes).
 * Returns the updated character, or the original character if not found.
 */
export function consumeResourceAny(
  char: Character,
  resourceId: string,
): Character {
  for (const [classId, ccr] of Object.entries(char.resources)) {
    const idx = ccr.resources.findIndex(r => r.id === resourceId);
    if (idx !== -1) {
      return consumeResource(char, classId, resourceId);
    }
  }
  return char;
}

/**
 * Recover a resource without knowing the classId (searches all classes).
 */
export function recoverResourceAny(
  char: Character,
  resourceId: string,
): Character {
  for (const [classId, ccr] of Object.entries(char.resources)) {
    const idx = ccr.resources.findIndex(r => r.id === resourceId);
    if (idx !== -1) {
      return recoverResource(char, classId, resourceId);
    }
  }
  return char;
}
