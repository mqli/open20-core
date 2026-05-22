// engine/spell-data.ts
// Pure builders for per-class spell data (ClassSpellData).
// Used as the single source of truth by character/recompute.ts.

import type { AbilityScores } from '../types/ability';
import type { Subclass } from '../types/class';
import type { ClassSpellData, SpellSlotEntry } from '../types/spell';
import type { DataLoader } from '../data/loader';
import { getModifier, getTotalScore } from './ability-modifier';
import { calculateSpellSlots } from './spell-slots';

/**
 * Get the highest spell level with non-zero slots.
 */
export function getMaxSpellLevel(slots: Record<number, SpellSlotEntry>): number {
  let max = 0;
  for (let level = 1; level <= 9; level++) {
    const entry = slots[level];
    if (entry && entry.total > 0) max = level;
  }
  return max;
}

/**
 * Get always-prepared spells (subclass domain/oath spells) up to a given class level.
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

export interface BuildClassSpellDataOpts {
  readonly classId: string;
  readonly classLevel: number;
  readonly subclassId?: string | null;
  readonly abilityScores: AbilityScores;
  readonly proficiencyBonus: number;
  /** Existing entry, used to preserve spellbook caster's known spells, prepared spells, etc. */
  readonly existing?: ClassSpellData;
  readonly data: DataLoader;
}

/**
 * Build a complete `ClassSpellData` entry for one class.
 * Returns `null` if the class does not have spellcasting.
 *
 * Single source of truth for:
 *  - spellcastingAbility
 *  - spellSaveDC = 8 + pb + abilityMod
 *  - spellAttackBonus = pb + abilityMod
 *  - knownSpells / knownCantrips (auto-populated for class_list casters, preserved for spellbook)
 *  - maxCantripsKnown, maxPrepared (from class level table)
 *  - alwaysPreparedSpells (from subclass)
 *  - preparedSpells (preserved from `existing`)
 */
export function buildClassSpellData(opts: BuildClassSpellDataOpts): ClassSpellData | null {
  const { classId, classLevel, subclassId, abilityScores, proficiencyBonus, existing, data } = opts;

  const classData = data.getClass(classId);
  if (!classData?.spellcasting) return null;

  const ability = classData.spellcasting.ability;
  const abilityMod = getModifier(getTotalScore(abilityScores, ability));

  const classSlots = calculateSpellSlots(classId, classLevel, data);
  const classMaxSpellLevel = getMaxSpellLevel(classSlots);

  const levelEntry = classData.featuresByLevel.find(f => f.level === classLevel);
  const maxCantripsKnown = levelEntry?.cantripsKnown ?? existing?.maxCantripsKnown ?? 0;
  const maxPrepared = levelEntry?.preparedSpells ?? 0;

  let knownSpells: readonly string[];
  let knownCantrips: readonly string[];
  if (classData.spellcasting.knownSource === 'class_list') {
    knownSpells = data
      .getAllSpells()
      .filter(s => s.classes?.includes(classId) && s.level >= 1 && s.level <= classMaxSpellLevel)
      .map(s => s.id);
    knownCantrips = existing?.knownCantrips ?? [];
  } else {
    // Spellbook caster (Wizard): preserve player's chosen spells.
    knownSpells = existing?.knownSpells ?? [];
    knownCantrips = existing?.knownCantrips ?? [];
  }

  let alwaysPreparedSpells: readonly string[] = [];
  if (subclassId) {
    const subclass = data.getSubclass(subclassId);
    if (subclass) {
      alwaysPreparedSpells = getAlwaysPreparedSpellsFromSubclass(subclass, classLevel);
    }
  }

  return {
    classId,
    spellcastingAbility: ability,
    spellSaveDC: 8 + proficiencyBonus + abilityMod,
    spellAttackBonus: proficiencyBonus + abilityMod,
    knownCantrips,
    maxCantripsKnown,
    knownSpells,
    preparedSpells: existing?.preparedSpells ?? [],
    alwaysPreparedSpells,
    maxPrepared,
  };
}
