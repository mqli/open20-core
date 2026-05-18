// character/mutate/resources.ts
// Resource-related character mutations

import type { Character } from '../../types/character';
import { withUpdate } from './hp';

export function consumeResource(char: Character, resourceId: string): Character {
  const idx = char.resources.findIndex(r => r.id === resourceId);
  if (idx === -1) return char;

  const resource = char.resources[idx]!;
  if (resource.used >= resource.max) return char;

  const newResources = [...char.resources];
  newResources[idx] = { ...resource, used: resource.used + 1 };

  return withUpdate(char, { resources: newResources });
}

export function recoverResource(char: Character, resourceId: string): Character {
  const idx = char.resources.findIndex(r => r.id === resourceId);
  if (idx === -1) return char;

  const resource = char.resources[idx]!;
  if (resource.used <= 0) return char;

  const newResources = [...char.resources];
  newResources[idx] = { ...resource, used: resource.used - 1 };

  return withUpdate(char, { resources: newResources });
}
