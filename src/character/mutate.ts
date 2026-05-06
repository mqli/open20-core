// character/mutate.ts
// Character mutation functions — all return new Character (immutable)
// Corresponds to HLD §6.2

import type { Character, ConditionName, Currency, ActiveCondition } from '../types/character';
import type { EquipmentItem } from '../types/equipment';
import type { SpellLevel } from '../types/spell';

// ── Helper ──────────────────────────────────────────────────────

function withUpdate(char: Character, patch: Partial<Character>): Character {
  return {
    ...char,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

// ── HP Mutations ────────────────────────────────────────────────

export function modifyHP(char: Character, delta: number): Character {
  let remaining = delta;
  let temporary = char.hitPoints.temporary;
  let current = char.hitPoints.current;

  // Damage: subtract from temporary HP first
  if (remaining < 0 && temporary > 0) {
    const tempAbsorbed = Math.min(temporary, Math.abs(remaining));
    temporary -= tempAbsorbed;
    remaining += tempAbsorbed;
  }

  current = Math.max(0, Math.min(current + remaining, char.hitPoints.max));

  return withUpdate(char, {
    hitPoints: {
      ...char.hitPoints,
      current,
      temporary,
    },
  });
}

export function setTemporaryHP(char: Character, value: number): Character {
  return withUpdate(char, {
    hitPoints: {
      ...char.hitPoints,
      temporary: Math.max(0, value),
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
