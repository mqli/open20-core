// character/rest.ts
// Short Rest and Long Rest functions — DND 2024 rules
// Corresponds to HLD §6.2

import type { Character, CharacterClass } from '../types/character';
import type { Resource, CharacterClassResources } from '../types/resource';
import { ResetType } from '../types/resource';
import type { DataLoader } from '../data/loader';
import type { SpellLevel, FeatSpellsEntry } from '../types/spell';

import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getHitDieFixedValue } from '../engine/hp-calculator';

import { withUpdate } from './mutate';
import { getDieMax } from './level-up';

/**
 * Reset resources in a CharacterClassResources record.
 * Returns a new Record with resources reset according to the filter.
 */
function resetClassResources(
  classResources: Record<string, CharacterClassResources>,
  shouldReset: (r: Resource) => boolean,
): Record<string, CharacterClassResources> {
  const result: Record<string, CharacterClassResources> = {};
  for (const [classId, ccr] of Object.entries(classResources)) {
    const newResources = ccr.resources.map(r => {
      if (shouldReset(r)) return { ...r, used: 0 };
      return r;
    });
    result[classId] = { classId, resources: Object.freeze(newResources) };
  }
  return result;
}

// ── Random Provider Interface ──────────────────────────────────

export interface RandomProvider {
  /** Roll a die with the given maximum face value (1–max) */
  d(max: number): number;
}

// ── Helpers ────────────────────────────────────────────────────

function getConMod(char: Character): number {
  return getModifier(getTotalScore(char.abilityScores, 'Constitution'));
}

// ── Short Rest ─────────────────────────────────────────────────

export function shortRest(
  char: Character,
  hitDiceToSpend: number,
  data: DataLoader,
  rng?: RandomProvider
): Character {
  let result = char;
  let remainingToSpend = hitDiceToSpend;

  // 1. Spend hit dice and recover HP
  for (const charClass of result.classes) {
    if (remainingToSpend <= 0) break;

    const available = charClass.level - charClass.hitDice.used;
    const toSpend = Math.min(remainingToSpend, available);

    if (toSpend <= 0) continue;

    const classData = data.getClass(charClass.classId);
    if (!classData) continue;

    // Calculate HP recovery for each die spent
    let hpRecovered = 0;
    const conMod = getConMod(result);

    if (rng) {
      for (let i = 0; i < toSpend; i++) {
        hpRecovered += rng.d(getDieMax(classData.hitDie)) + conMod;
      }
    } else {
      // Fixed value: floor(die/2) + 1 + Con mod
      const fixedPerDie = getHitDieFixedValue(classData.hitDie) + conMod;
      hpRecovered = fixedPerDie * toSpend;
    }

    // Update hit dice used for this class
    const newClasses = result.classes.map(c => {
      if (c.classId === charClass.classId) {
        return { ...c, hitDice: { ...c.hitDice, used: c.hitDice.used + toSpend } };
      }
      return c;
    });

    result = withUpdate(result, {
      classes: newClasses,
      hitPoints: {
        ...result.hitPoints,
        current: Math.min(result.hitPoints.current + hpRecovered, result.hitPoints.max),
      },
    });

    remainingToSpend -= toSpend;
  }

  // 2. Reset short rest resources (per-class model)
  const resetShortRest = resetClassResources(result.resources,
    (r: Resource) => r.resetOn === ResetType.ShortRest
  );
  result = withUpdate(result, { resources: resetShortRest });

  // 3. Recover pact magic slots
  if (result.spells.pactMagicSlots) {
    result = withUpdate(result, {
      spells: {
        ...result.spells,
        pactMagicSlots: { ...result.spells.pactMagicSlots, used: 0 },
      },
    });
  }

  return result;
}

// ── Long Rest ──────────────────────────────────────────────────

// _data is intentionally kept for API consistency (future rules may need it, e.g. class-specific long rest benefits)
export function longRest(char: Character, _data: DataLoader): Character {
  // 1. Regain all HP
  let result = withUpdate(char, {
    hitPoints: {
      ...char.hitPoints,
      current: char.hitPoints.max,
    },
  });

  // 2. Reset all hit dice used
  const newClasses = result.classes.map((c: CharacterClass) => ({
    ...c,
    hitDice: { ...c.hitDice, used: 0 },
  }));
  result = withUpdate(result, { classes: newClasses });

  // 3. Regain all spell slots
  const newSpellSlots = { ...result.spells.spellSlots };
  for (let level = 1; level <= 9; level++) {
    const slot = newSpellSlots[level as SpellLevel];
    if (slot && slot.used > 0) {
      newSpellSlots[level as SpellLevel] = { ...slot, used: 0 };
    }
  }
  result = withUpdate(result, {
    spells: { ...result.spells, spellSlots: newSpellSlots },
  });

  // 4. Recover pact magic (Warlocks regain on Short OR Long Rest)
  if (result.spells.pactMagicSlots) {
    result = withUpdate(result, {
      spells: {
        ...result.spells,
        pactMagicSlots: { ...result.spells.pactMagicSlots, used: 0 },
      },
    });
  }

  // 5. Reset Long Rest and Short Rest resources (per-class model)
  const resetLongRest = resetClassResources(result.resources,
    (r: Resource) => r.resetOn === ResetType.LongRest || r.resetOn === ResetType.ShortRest
  );
  result = withUpdate(result, { resources: resetLongRest });

  // 6. Reset once-per-long-rest feat spell usage (e.g. Magic Initiate)
  if (result.spells.featSpells) {
    const resetFeatSpells: Record<string, FeatSpellsEntry> = {};
    for (const [featId, entry] of Object.entries(result.spells.featSpells)) {
      resetFeatSpells[featId] = { ...entry, usedOncePerLongRest: undefined };
    }
    result = withUpdate(result, {
      spells: { ...result.spells, featSpells: resetFeatSpells },
    });
  }

  // 7. Reset death saves
  result = withUpdate(result, {
    hitPoints: {
      ...result.hitPoints,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
  });

  return result;
}
