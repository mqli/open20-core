// character/rest.ts
// Short Rest and Long Rest functions — DND 2024 rules
// Corresponds to HLD §6.2

import type { Character, CharacterClass, DieType } from '../types/character';
import type { Resource } from '../types/resource';
import { ResetType } from '../types/resource';
import type { DataLoader } from '../data/loader';
import type { SpellLevel } from '../types/spell';

import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getHitDieFixedValue } from '../engine/hp-calculator';

// ── Random Provider Interface ──────────────────────────────────

export interface RandomProvider {
  /** Roll a die with the given maximum face value (1–max) */
  d(max: number): number;
}

// ── Helpers ────────────────────────────────────────────────────

function getDieMax(die: DieType): number {
  return parseInt(die.slice(1), 10);
}

function getConMod(char: Character): number {
  return getModifier(getTotalScore(char.abilityScores, 'Constitution'));
}

function withUpdate(char: Character, patch: Partial<Character>): Character {
  return {
    ...char,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
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
      // Fixed value: ceil(die/2) + Con mod
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

  // 2. Reset short rest resources
  const newResources = result.resources.map((r: Resource) => {
    if (r.resetOn === ResetType.ShortRest) return { ...r, used: 0 };
    return r;
  });
  result = withUpdate(result, { resources: newResources });

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

export function longRest(char: Character, data: DataLoader): Character {
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
  for (let level = 0; level <= 9; level++) {
    const slot = newSpellSlots[level as SpellLevel];
    if (slot && slot.used > 0) {
      newSpellSlots[level as SpellLevel] = { ...slot, used: 0 };
    }
  }
  result = withUpdate(result, {
    spells: { ...result.spells, spellSlots: newSpellSlots },
  });

  // 4. Recover pact magic
  if (result.spells.pactMagicSlots) {
    result = withUpdate(result, {
      spells: {
        ...result.spells,
        pactMagicSlots: { ...result.spells.pactMagicSlots, used: 0 },
      },
    });
  }

  // 5 & 6. Reset Long Rest and Short Rest resources
  const newResources = result.resources.map((r: Resource) => {
    if (r.resetOn === ResetType.LongRest || r.resetOn === ResetType.ShortRest) {
      return { ...r, used: 0 };
    }
    return r;
  });
  result = withUpdate(result, { resources: newResources });

  // 7. Reset death saves
  result = withUpdate(result, {
    hitPoints: {
      ...result.hitPoints,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
  });

  return result;
}
