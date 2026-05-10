// character/mutate.ts
// Character mutation functions — all return new Character (immutable)
// Corresponds to HLD §6.2

import type {
  Character,
  ConditionName,
  Currency,
  ActiveCondition,
} from '../types/character';
import type { DamageType, DamageDefenses, DamageResult } from '../types/damage';
import type { EquipmentItem } from '../types/equipment';
import type { SpellLevel } from '../types/spell';
import type { DataLoader } from '../data/loader';
import type { RandomProvider } from '../dice/core';
import { rollSavingThrow } from '../dice/mechanics';
import {
  isConcentrating,
  getConcentratingSpellId,
  calculateConcentrationDC,
  type ConcentrationCheckResult,
} from '../engine/concentration';
// calculateTypedDamage is used in applyTypedDamage function
import { applyHPChange, applyTypedDamageToHP, setTemporaryHPShared } from '../engine/combat';
import { recomputeDerivedStats } from './recompute';

// ── Helper ──────────────────────────────────────────────────────

function withUpdate(char: Character, patch: Partial<Character>): Character {
  return {
    ...char,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

// ── HP Mutations ────────────────────────────────────────────────

/**
 * Modify character HP (healing or untyped damage)
 * For typed damage, use applyTypedDamage instead
 */
export function modifyHP(char: Character, delta: number): Character {
  const { currentHP, temporaryHP } = applyHPChange(
    char.hitPoints.current,
    char.hitPoints.max,
    char.hitPoints.temporary,
    delta
  );

  return withUpdate(char, {
    hitPoints: {
      ...char.hitPoints,
      current: currentHP,
      temporary: temporaryHP,
    },
  });
}

/**
 * Apply typed damage to character and return damage result
 * Combines defense calculation with HP modification
 */
export function applyTypedDamage(
  char: Character,
  damage: number,
  damageType: DamageType,
  defenses: DamageDefenses
): { char: Character; result: DamageResult } {
  const { currentHP, temporaryHP, result } = applyTypedDamageToHP(
    char.hitPoints.current,
    char.hitPoints.max,
    char.hitPoints.temporary,
    damage,
    damageType,
    defenses
  );

  const updatedChar = withUpdate(char, {
    hitPoints: {
      ...char.hitPoints,
      current: currentHP,
      temporary: temporaryHP,
    },
  });

  return { char: updatedChar, result };
}

export function setTemporaryHP(char: Character, value: number): Character {
  const newTemp = setTemporaryHPShared(char.hitPoints.temporary, value);
  return withUpdate(char, {
    hitPoints: {
      ...char.hitPoints,
      temporary: newTemp,
    },
  });
}

// ── Resource Mutations ──────────────────────────────────────────

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

// ── Spell Slot Mutations ────────────────────────────────────────

export function consumeSpellSlot(char: Character, level: number | 'pact'): Character {
  if (level === 'pact') {
    const pact = char.spells.pactMagicSlots;
    if (!pact || pact.used >= pact.total) return char;

    return withUpdate(char, {
      spells: {
        ...char.spells,
        pactMagicSlots: { ...pact, used: pact.used + 1 },
      },
    });
  }

  const slot = char.spells.spellSlots[level as SpellLevel];
  if (!slot || slot.used >= slot.total) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      spellSlots: {
        ...char.spells.spellSlots,
        [level]: { ...slot, used: slot.used + 1 },
      },
    },
  });
}

export function recoverSpellSlot(char: Character, level: number | 'pact'): Character {
  if (level === 'pact') {
    const pact = char.spells.pactMagicSlots;
    if (!pact || pact.used <= 0) return char;

    return withUpdate(char, {
      spells: {
        ...char.spells,
        pactMagicSlots: { ...pact, used: pact.used - 1 },
      },
    });
  }

  const slot = char.spells.spellSlots[level as SpellLevel];
  if (!slot || slot.used <= 0) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      spellSlots: {
        ...char.spells.spellSlots,
        [level]: { ...slot, used: slot.used - 1 },
      },
    },
  });
}

// ── Condition Mutations ─────────────────────────────────────────

export function toggleCondition(char: Character, conditionId: ConditionName): Character {
  const existingIdx = char.conditions.findIndex(c => c.id === conditionId);

  if (existingIdx !== -1) {
    // Remove existing condition
    const newConditions = char.conditions.filter((_, i) => i !== existingIdx);
    return withUpdate(char, { conditions: newConditions });
  }

  // Add new condition
  const newCondition: ActiveCondition = {
    id: conditionId,
    source: '',
    appliedAt: new Date().toISOString(),
  };

  return withUpdate(char, {
    conditions: [...char.conditions, newCondition],
  });
}

// ── Concentration Mutations ───────────────────────────────────

/**
 * Start concentrating on a spell
 * SRD: "Only one concentration spell can be active at a time"
 * If already concentrating, ends previous concentration first
 *
 * @param char - The character
 * @param spellId - The spell ID to concentrate on
 * @returns Updated character with Concentrating condition
 *
 * @example
 * startConcentration(char, 'bless')
 */
export function startConcentration(char: Character, spellId: string): Character {
  // End any existing concentration first
  let updated = char;
  if (isConcentrating(char)) {
    updated = endConcentration(char);
  }

  // Add Concentrating condition with spell ID as source
  const newCondition: ActiveCondition = {
    id: 'Concentrating',
    source: spellId,
    appliedAt: new Date().toISOString(),
  };

  return withUpdate(updated, {
    conditions: [...updated.conditions, newCondition],
  });
}

/**
 * End concentration (remove Concentrating condition)
 * SRD: Concentration ends when you cast another concentration spell,
 * become incapacitated, or the spell's duration ends
 *
 * @param char - The character
 * @returns Updated character without Concentrating condition
 *
 * @example
 * endConcentration(char)
 */
export function endConcentration(char: Character): Character {
  const conditionIdx = char.conditions.findIndex(c => c.id === 'Concentrating');
  if (conditionIdx === -1) return char;

  return withUpdate(char, {
    conditions: char.conditions.filter((_, i) => i !== conditionIdx),
  });
}

/**
 * Make a concentration check when taking damage
 * SRD: "If the save fails, the spell ends. The DC equals 10 or half the
 * damage taken, whichever is higher."
 *
 * @param char - The character
 * @param damageAmount - Amount of damage taken
 * @param data - DataLoader (for class save proficiencies)
 * @param rng - Random provider for dice rolling
 * @returns Object with updated character and check result
 *
 * @example
 * makeConcentrationCheck(char, 20, data, defaultRandom)
 */
export function makeConcentrationCheck(
  char: Character,
  damageAmount: number,
  data: DataLoader,
  rng: RandomProvider
): { char: Character; result: ConcentrationCheckResult } {
  // Calculate DC
  const dc = calculateConcentrationDC(damageAmount);

  // Get Constitution modifier
  const conScore = char.abilityScores.base.Constitution
    + (char.abilityScores.racialBonuses.Constitution ?? 0)
    + (char.abilityScores.featBonuses.Constitution ?? 0)
    + (char.abilityScores.temporaryBonuses.Constitution ?? 0);
  const conMod = Math.floor((conScore - 10) / 2);

  // Check if proficient in Constitution saves
  // A character is proficient if any of their classes has Con as a save proficiency
  let isProficient = false;
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData?.savingThrowProficiencies.includes('Constitution')) {
      isProficient = true;
      break;
    }
  }

  // Roll the save
  const check = rollSavingThrow({
    abilityMod: conMod,
    proficiencyBonus: isProficient ? char.combatStats.proficiencyBonus : 0,
    isProficient,
    dc,
    rng,
  });

  // If failed, end concentration
  let updatedChar = char;
  if (!check.success) {
    updatedChar = endConcentration(char);
  }

  return {
    char: updatedChar,
    result: {
      check,
      dc,
      maintained: check.success ?? false,
    },
  };
}

// ── Always-Prepared Spells ───────────────────────────────────

/**
 * Add a spell to the always-prepared list
 * SRD: Some features give spells that are always prepared and don't count
 * against the prepared spell limit.
 *
 * @param char - The character
 * @param spellId - The spell ID to add
 * @returns Updated character with the spell in alwaysPreparedSpells
 *
 * @example
 * addAlwaysPreparedSpell(char, 'shield-of-faith')
 */
export function addAlwaysPreparedSpell(char: Character, spellId: string): Character {
  const current = char.spells.alwaysPreparedSpells ?? [];
  if (current.includes(spellId)) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      alwaysPreparedSpells: [...current, spellId],
    },
  });
}

/**
 * Remove a spell from the always-prepared list
 *
 * @param char - The character
 * @param spellId - The spell ID to remove
 * @returns Updated character without the spell in alwaysPreparedSpells
 *
 * @example
 * removeAlwaysPreparedSpell(char, 'shield-of-faith')
 */
export function removeAlwaysPreparedSpell(char: Character, spellId: string): Character {
  const current = char.spells.alwaysPreparedSpells ?? [];
  if (!current.includes(spellId)) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      alwaysPreparedSpells: current.filter(id => id !== spellId),
    },
  });
}

// ── Equipment Mutations ─────────────────────────────────────────

export function equipItem(char: Character, itemId: string): Character {
  const idx = char.equipment.findIndex(e => e.id === itemId);
  if (idx === -1) return char;

  const item = char.equipment[idx]!;
  if (item.equipped) return char;

  const newEquipment = [...char.equipment];
  newEquipment[idx] = { ...item, equipped: true };

  return withUpdate(char, { equipment: newEquipment });
}

export function unequipItem(char: Character, itemId: string): Character {
  const idx = char.equipment.findIndex(e => e.id === itemId);
  if (idx === -1) return char;

  const item = char.equipment[idx]!;
  if (!item.equipped) return char;

  const newEquipment = [...char.equipment];
  newEquipment[idx] = { ...item, equipped: false };

  return withUpdate(char, { equipment: newEquipment });
}

/**
 * Equip an item and recalculate derived stats (AC, attacks)
 * Use this for UI actions where stats need immediate update
 */
export function equipItemAndRecompute(
  char: Character,
  itemId: string,
  data: DataLoader
): Character {
  const updatedChar = equipItem(char, itemId);
  if (updatedChar === char) return char;

  return recomputeDerivedStats(updatedChar, data);
}

/**
 * Unequip an item and recalculate derived stats (AC, attacks)
 * Use this for UI actions where stats need immediate update
 */
export function unequipItemAndRecompute(
  char: Character,
  itemId: string,
  data: DataLoader
): Character {
  const updatedChar = unequipItem(char, itemId);
  if (updatedChar === char) return char;

  return recomputeDerivedStats(updatedChar, data);
}

export function addEquipment(char: Character, item: EquipmentItem): Character {
  return withUpdate(char, {
    equipment: [...char.equipment, item],
  });
}

export function removeEquipment(char: Character, itemId: string): Character {
  const idx = char.equipment.findIndex(e => e.id === itemId);
  if (idx === -1) return char;

  return withUpdate(char, {
    equipment: char.equipment.filter((_, i) => i !== idx),
  });
}

// ── Spell Preparation Mutations ─────────────────────────────────

export function prepareSpell(char: Character, spellId: string): Character {
  if (char.spells.preparedSpells.includes(spellId)) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      preparedSpells: [...char.spells.preparedSpells, spellId],
    },
  });
}

export function unprepareSpell(char: Character, spellId: string): Character {
  // Cannot unprepare always-prepared spells
  if ((char.spells.alwaysPreparedSpells ?? []).includes(spellId)) return char;
  if (!char.spells.preparedSpells.includes(spellId)) return char;

  return withUpdate(char, {
    spells: {
      ...char.spells,
      preparedSpells: char.spells.preparedSpells.filter(id => id !== spellId),
    },
  });
}

// ── Currency Mutations ──────────────────────────────────────────

export function modifyCurrency(char: Character, currency: Partial<Currency>): Character {
  const newCurrency: Currency = {
    cp: Math.max(0, char.currency.cp + (currency.cp ?? 0)),
    sp: Math.max(0, char.currency.sp + (currency.sp ?? 0)),
    ep: Math.max(0, char.currency.ep + (currency.ep ?? 0)),
    gp: Math.max(0, char.currency.gp + (currency.gp ?? 0)),
    pp: Math.max(0, char.currency.pp + (currency.pp ?? 0)),
  };

  return withUpdate(char, { currency: newCurrency });
}
