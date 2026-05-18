// character/utils.ts
// Shared pure helpers used by create.ts, recompute.ts, and level-up.ts
// Breaking the circular dependency between create.ts and recompute.ts

import type { Feature, Class, Subclass } from '../types/class';

/**
 * Extract features at a specific level from a class or subclass definition.
 */
export function getFeaturesAtLevel(
  classData: Class | Subclass,
  level: number
): readonly Feature[] {
  const entry = classData.featuresByLevel.find(f => f.level === level);
  return entry?.features ?? [];
}

/**
 * Get always-prepared spells from a subclass up to a given class level.
 * Used for domain/oath spells that are always prepared.
 */
export function getAlwaysPreparedSpellsFromSubclass(
  subclass: Subclass,
  classLevel: number
): string[] {
  if (!subclass.alwaysPreparedSpells) return [];
  const spells: string[] = [];
  for (const entry of subclass.alwaysPreparedSpells) {
    if (classLevel >= entry.level) {
      spells.push(...entry.spells);
    }
  }
  return spells;
}
