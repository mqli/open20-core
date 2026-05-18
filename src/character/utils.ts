// character/utils.ts
// Shared pure helpers used by create.ts, recompute.ts, level-up.ts, spells-init.ts
// Breaking circular dependencies between character/ modules

import type { Feature, Class, Subclass } from '../types/class';
import type { DataLoader } from '../data/loader';

// ── Feature Helpers ──────────────────────────────────

/** Extract features at a specific level from a class or subclass definition. */
export function getFeaturesAtLevel(
  classData: Class | Subclass,
  level: number
): readonly Feature[] {
  const entry = classData.featuresByLevel.find(f => f.level === level);
  return entry?.features ?? [];
}

/** Get always-prepared spells from a subclass up to a given class level. */
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

// ── Feature Gathering ──────────────────────────────────

/** Gather all features across all classes and subclasses. */
export function gatherAllFeatures(
  classes: readonly import('../types/character').CharacterClass[],
  data: DataLoader
): Feature[] {
  const features: Feature[] = [];
  for (const charClass of classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData) continue;

    for (let lv = 1; lv <= charClass.level; lv++) {
      features.push(...getFeaturesAtLevel(classData, lv));
    }

    if (charClass.subclassId) {
      const subclass = data.getSubclass(charClass.subclassId);
      if (subclass) {
        for (const entry of subclass.featuresByLevel) {
          if (entry.level <= charClass.level) {
            features.push(...entry.features);
          }
        }
      }
    }
  }
  return features;
}

// ── Spell Helpers ──────────────────────────────────────

/** Get the highest spell level with non-zero slots. */
export function getMaxSpellLevel(
  slots: Record<number, import('../types/spell').SpellSlotEntry>
): number {
  let max = 0;
  for (let level = 1; level <= 9; level++) {
    const entry = slots[level];
    if (entry && entry.total > 0) max = level;
  }
  return max;
}
