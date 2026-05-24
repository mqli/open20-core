// tests/character/mutate.test.ts
// Comprehensive tests for character mutation functions

import { describe, it, expect } from 'vitest';
import { createCharacter } from '../../src/character/create';
import type { CreateCharacterParams } from '../../src/character/create';
import type { AbilityName } from '../../src/types/ability';
import type { EquipmentItem, Armor } from '../../src/types/equipment';
import type { ConditionName } from '../../src/types/character';

import {
  modifyHP,
  setTemporaryHP,
  consumeResource,
  recoverResource,
  consumeSpellSlot,
  recoverSpellSlot,
  toggleCondition,
  equipItem,
  unequipItem,
  prepareSpellForClass,
  unprepareSpellForClass,
  addKnownSpell,
  removeKnownSpell,
  addEquipment,
  removeEquipment,
  modifyCurrency,
} from '../../src/character/mutate';

// ── Shared Fixtures ──────────────────────────────────────────

import {
  createMockDataLoader,
} from '../fixtures/data-loader';

import {
  HUMAN_SPECIES,
  SOLDIER_BACKGROUND,
  FIGHTER_CLASS,
  WIZARD_CLASS,
} from '../fixtures/characters';

// ── Helpers ────────────────────────────────────────────────────

const STANDARD_SCORES: Record<AbilityName, number> = {
  Strength: 16,
  Dexterity: 14,
  Constitution: 15,
  Intelligence: 8,
  Wisdom: 12,
  Charisma: 10,
};

function makeFighter(): ReturnType<typeof createCharacter> {
  const data = createMockDataLoader({
    getSpecies: (id: string) => (id === 'Human' ? HUMAN_SPECIES : undefined),
    getAllSpecies: () => [HUMAN_SPECIES],
    getBackground: (id: string) => (id === 'Soldier' ? SOLDIER_BACKGROUND : undefined),
    getAllBackgrounds: () => [SOLDIER_BACKGROUND],
    getClass: (id: string) => {
      if (id === 'Fighter') return FIGHTER_CLASS;
      if (id === 'Wizard') return WIZARD_CLASS;
      return undefined;
    },
    getAllClasses: () => [FIGHTER_CLASS, WIZARD_CLASS],
    getSpellSlots: (classId: string) => {
      if (classId === 'Fighter') return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      // Wizard: full caster
      return { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    },
  });
  const params: CreateCharacterParams = {
    name: 'Aragorn',
    speciesId: 'Human',
    backgroundId: 'Soldier',
    classId: 'Fighter',
    abilityScores: STANDARD_SCORES,
  };
  return createCharacter(params, data);
}

function makeWizard(): ReturnType<typeof createCharacter> {
  const data = createMockDataLoader({
    getSpecies: (id: string) => (id === 'Human' ? HUMAN_SPECIES : undefined),
    getAllSpecies: () => [HUMAN_SPECIES],
    getBackground: (id: string) => (id === 'Soldier' ? SOLDIER_BACKGROUND : undefined),
    getAllBackgrounds: () => [SOLDIER_BACKGROUND],
    getClass: (id: string) => {
      if (id === 'Fighter') return FIGHTER_CLASS;
      if (id === 'Wizard') return WIZARD_CLASS;
      return undefined;
    },
    getAllClasses: () => [FIGHTER_CLASS, WIZARD_CLASS],
    getSpellSlots: (classId: string) => {
      if (classId === 'Fighter') return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      // Wizard: full caster
      return { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    },
  });
  const params: CreateCharacterParams = {
    name: 'Gandalf',
    speciesId: 'Human',
    backgroundId: 'Soldier',
    classId: 'Wizard',
    abilityScores: {
      Strength: 8,
      Dexterity: 14,
      Constitution: 12,
      Intelligence: 16,
      Wisdom: 13,
      Charisma: 10,
    },
  };
  return createCharacter(params, data);
}

const SWORD: EquipmentItem = {
  id: 'longsword-1',
  name: 'Longsword',
  type: 'weapon',
  weight: 3,
  equipped: false,
};

const SHIELD: Armor = {
  id: 'shield-1',
  name: 'Shield',
  type: 'armor',
  category: 'Shield',
  baseAC: 2,
  dexBonus: false,
  weight: 6,
  equipped: true,
};

// ── Tests ──────────────────────────────────────────────────────

describe('modifyHP', () => {
  it('heals 5 HP: current goes up by 5', () => {
    const char = makeFighter();
    // Fighter HP max = 12, current = 12 — damage first to test healing
    const damaged = modifyHP(char, -5);
    expect(damaged.hitPoints.current).toBe(7);

    const healed = modifyHP(damaged, 5);
    expect(healed.hitPoints.current).toBe(12);
  });

  it('damages 3 HP: current goes down by 3', () => {
    const char = makeFighter();
    const result = modifyHP(char, -3);
    expect(result.hitPoints.current).toBe(9);
  });

  it('damage with temporary HP: temp absorbs first, then current', () => {
    const char = makeFighter();
    // Set temporary HP to 4
    const withTemp = setTemporaryHP(char, 4);
    expect(withTemp.hitPoints.temporary).toBe(4);
    expect(withTemp.hitPoints.current).toBe(12);

    // Deal 6 damage — temp absorbs 4, current takes 2
    const result = modifyHP(withTemp, -6);
    expect(result.hitPoints.temporary).toBe(0);
    expect(result.hitPoints.current).toBe(10);
  });

  it('heal beyond max: current caps at max', () => {
    const char = makeFighter();
    const damaged = modifyHP(char, -3);
    expect(damaged.hitPoints.current).toBe(9);

    const healed = modifyHP(damaged, 10);
    expect(healed.hitPoints.current).toBe(12); // caps at max
  });

  it('damage below 0: current floors at 0', () => {
    const char = makeFighter();
    const result = modifyHP(char, -50);
    expect(result.hitPoints.current).toBe(0);
  });

  it('original character unchanged (immutability)', () => {
    const char = makeFighter();
    const originalCurrent = char.hitPoints.current;
    modifyHP(char, -5);
    expect(char.hitPoints.current).toBe(originalCurrent);
  });
});

describe('setTemporaryHP', () => {
  it('sets temporary to 5', () => {
    const char = makeFighter();
    const result = setTemporaryHP(char, 5);
    expect(result.hitPoints.temporary).toBe(5);
  });

  it('sets temporary to 0', () => {
    const char = makeFighter();
    const withTemp = setTemporaryHP(char, 5);
    const result = setTemporaryHP(withTemp, 0);
    expect(result.hitPoints.temporary).toBe(0);
  });

  it('sets temporary to -1: becomes 0 (never negative)', () => {
    const char = makeFighter();
    const result = setTemporaryHP(char, -1);
    expect(result.hitPoints.temporary).toBe(0);
  });

  it('sets higher than existing: replaces (not adds)', () => {
    const char = makeFighter();
    const withTemp = setTemporaryHP(char, 3);
    const result = setTemporaryHP(withTemp, 8);
    expect(result.hitPoints.temporary).toBe(8);
  });
});

describe('consumeResource', () => {
  it('consumes existing resource: used increments', () => {
    const char = makeFighter();
    // Fighter has Second Wind (max: 1 at level 1, used: 0)
    const result = consumeResource(char, 'Fighter', 'Second Wind');
    const sw = result.resources['Fighter']!.resources.find(r => r.id === 'Second Wind');
    expect(sw!.used).toBe(1);
  });

  it('consumes already-maxed resource: no change', () => {
    const char = makeFighter();
    // Second Wind max=2 (PB=2 at level 1), consume twice to reach max
    let consumed = consumeResource(char, 'Fighter', 'Second Wind');
    consumed = consumeResource(consumed, 'Fighter', 'Second Wind');
    // Second Wind max=2, used=2 after two consumes
    const result = consumeResource(consumed, 'Fighter', 'Second Wind');
    const sw = result.resources['Fighter']!.resources.find(r => r.id === 'Second Wind');
    expect(sw!.used).toBe(2); // still 2 (maxed)
  });

  it('consumes non-existent resource: no change', () => {
    const char = makeFighter();
    const result = consumeResource(char, 'Fighter', 'NonExistent');
    expect(result).toEqual(char);
  });

  it('consumes resource with wrong classId: no change', () => {
    const char = makeFighter();
    const result = consumeResource(char, 'Wizard', 'Second Wind');
    expect(result).toEqual(char);
  });
});

describe('recoverResource', () => {
  it('recovers used resource: used decrements', () => {
    const char = makeFighter();
    const consumed = consumeResource(char, 'Fighter', 'Second Wind');
    expect(consumed.resources['Fighter']!.resources.find(r => r.id === 'Second Wind')!.used).toBe(1);

    const recovered = recoverResource(consumed, 'Fighter', 'Second Wind');
    expect(recovered.resources['Fighter']!.resources.find(r => r.id === 'Second Wind')!.used).toBe(0);
  });

  it('recovers fully-recovered resource: no change (used=0)', () => {
    const char = makeFighter();
    const result = recoverResource(char, 'Fighter', 'Second Wind');
    const sw = result.resources['Fighter']!.resources.find(r => r.id === 'Second Wind');
    expect(sw!.used).toBe(0);
  });

  it('recovers non-existent resource: no change', () => {
    const char = makeFighter();
    const result = recoverResource(char, 'Fighter', 'NonExistent');
    expect(result).toEqual(char);
  });

  it('recovers resource with wrong classId: no change', () => {
    const char = makeFighter();
    const result = recoverResource(char, 'Wizard', 'Second Wind');
    expect(result).toEqual(char);
  });
});

describe('consumeSpellSlot / recoverSpellSlot', () => {
  it('consumes a level-1 slot: used increments', () => {
    const char = makeWizard();
    // Wizard has 2 level-1 slots
    const result = consumeSpellSlot(char, 1);
    expect(result.spells.spellSlots[1].used).toBe(1);
    expect(result.spells.spellSlots[1].total).toBe(2);
  });

  it('consumes when all used: no change', () => {
    const char = makeWizard();
    const once = consumeSpellSlot(char, 1);
    const twice = consumeSpellSlot(once, 1);
    // All 2 slots used
    expect(twice.spells.spellSlots[1].used).toBe(2);

    const third = consumeSpellSlot(twice, 1);
    expect(third.spells.spellSlots[1].used).toBe(2); // no change
  });

  it('recovers a level-1 slot: used decrements', () => {
    const char = makeWizard();
    const consumed = consumeSpellSlot(char, 1);
    expect(consumed.spells.spellSlots[1].used).toBe(1);

    const recovered = recoverSpellSlot(consumed, 1);
    expect(recovered.spells.spellSlots[1].used).toBe(0);
  });

  it('recovers when none used: no change', () => {
    const char = makeWizard();
    const result = recoverSpellSlot(char, 1);
    expect(result.spells.spellSlots[1].used).toBe(0);
  });
});

describe('toggleCondition', () => {
  it('adds condition: appears in conditions array', () => {
    const char = makeFighter();
    const result = toggleCondition(char, 'Prone' as ConditionName);
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]!.id).toBe('Prone');
    expect(result.conditions[0]!.source).toBe('');
    expect(result.conditions[0]!.appliedAt).toBeTruthy();
  });

  it('removes condition: disappears from conditions array', () => {
    const char = makeFighter();
    const withCondition = toggleCondition(char, 'Prone' as ConditionName);
    expect(withCondition.conditions).toHaveLength(1);

    const result = toggleCondition(withCondition, 'Prone' as ConditionName);
    expect(result.conditions).toHaveLength(0);
  });

  it('toggles twice: back to original', () => {
    const char = makeFighter();
    const once = toggleCondition(char, 'Blinded' as ConditionName);
    const twice = toggleCondition(once, 'Blinded' as ConditionName);
    expect(twice.conditions).toEqual([]);
  });
});

describe('equipItem / unequipItem', () => {
  it('equips unequipped item: equipped becomes true', () => {
    const char = makeFighter();
    const withSword = addEquipment(char, SWORD);
    const result = equipItem(withSword, 'longsword-1');
    expect(result.equipment.find(e => e.id === 'longsword-1')!.equipped).toBe(true);
  });

  it('equips already equipped: no change', () => {
    const char = makeFighter();
    const withShield = addEquipment(char, SHIELD);
    const result = equipItem(withShield, 'shield-1');
    // Already equipped, so should be same object
    expect(result.equipment.find(e => e.id === 'shield-1')!.equipped).toBe(true);
  });

  it('unequips equipped item: equipped becomes false', () => {
    const char = makeFighter();
    const withShield = addEquipment(char, SHIELD);
    const result = unequipItem(withShield, 'shield-1');
    expect(result.equipment.find(e => e.id === 'shield-1')!.equipped).toBe(false);
  });

  it('unequips non-existent item: no change', () => {
    const char = makeFighter();
    const result = unequipItem(char, 'does-not-exist');
    expect(result).toEqual(char);
  });
});

describe('prepareSpellForClass / unprepareSpellForClass (deprecated API tests)', () => {
  it('prepares new spell: added to preparedSpells', () => {
    const char = makeWizard();
    const result = prepareSpellForClass(char, 'Wizard', 'fireball');
    // Check per-class prepared spells
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).toContain('fireball');
  });

  it('prepares already prepared spell: no change', () => {
    const char = makeWizard();
    const prepared = prepareSpellForClass(char, 'Wizard', 'fireball');
    const result = prepareSpellForClass(prepared, 'Wizard', 'fireball');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells.filter(id => id === 'fireball')).toHaveLength(1);
  });

  it('unprepares prepared spell: removed from preparedSpells', () => {
    const char = makeWizard();
    const prepared = prepareSpellForClass(char, 'Wizard', 'fireball');
    const result = unprepareSpellForClass(prepared, 'Wizard', 'fireball');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).not.toContain('fireball');
  });

  it('unprepares non-prepared spell: no change', () => {
    const char = makeWizard();
    const result = unprepareSpellForClass(char, 'Wizard', 'fireball');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).toEqual(char.spells.classSpellcasting['Wizard']!.preparedSpells);
  });
});

describe('prepareSpellForClass / unprepareSpellForClass', () => {
  it('prepares new spell for class: added to class preparedSpells', () => {
    const char = makeWizard();
    const result = prepareSpellForClass(char, 'Wizard', 'fireball');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).toContain('fireball');
  });

  it('prepares for non-existent class: no change', () => {
    const char = makeWizard();
    const result = prepareSpellForClass(char, 'Fighter', 'fireball');
    expect(result).toEqual(char);
  });

  it('prepares already prepared spell: no duplicate', () => {
    const char = makeWizard();
    const prepared = prepareSpellForClass(char, 'Wizard', 'fireball');
    const result = prepareSpellForClass(prepared, 'Wizard', 'fireball');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells.filter(id => id === 'fireball')).toHaveLength(1);
  });

  it('unprepares prepared spell for class: removed from class preparedSpells', () => {
    const char = makeWizard();
    const prepared = prepareSpellForClass(char, 'Wizard', 'fireball');
    const result = unprepareSpellForClass(prepared, 'Wizard', 'fireball');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).not.toContain('fireball');
  });

  it('unprepares for non-existent class: no change', () => {
    const char = makeWizard();
    const result = unprepareSpellForClass(char, 'Fighter', 'fireball');
    expect(result).toEqual(char);
  });

  it('unprepares non-prepared spell: no change', () => {
    const char = makeWizard();
    const result = unprepareSpellForClass(char, 'Wizard', 'fireball');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).toEqual(char.spells.classSpellcasting['Wizard']!.preparedSpells);
  });

  it('multiclass: prepares spell for correct class only', () => {
    // Create a Wizard with two classes
    const char = makeWizard();
    // Manually add a second class's spell data
    const withMulticlass = {
      ...char,
      spells: {
        ...char.spells,
        classSpellcasting: {
          ...char.spells.classSpellcasting,
          Cleric: {
            classId: 'Cleric',
            spellcastingAbility: 'Wisdom' as const,
            spellSaveDC: 13,
            spellAttackBonus: 5,
            knownCantrips: [],
            maxCantripsKnown: 0,
            knownSpells: ['cure-wounds'],
            preparedSpells: ['cure-wounds'],
            alwaysPreparedSpells: [],
            maxPrepared: 4,
          },
        },
      },
    };
    const result = prepareSpellForClass(withMulticlass, 'Cleric', 'guiding-bolt');
    expect(result.spells.classSpellcasting['Cleric']!.preparedSpells).toContain('guiding-bolt');
    // Wizard spells unchanged
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).not.toContain('guiding-bolt');
  });
});

describe('addEquipment / removeEquipment', () => {
  it('adds item: appears in equipment array', () => {
    const char = makeFighter();
    const result = addEquipment(char, SWORD);
    expect(result.equipment).toHaveLength(1);
    expect(result.equipment[0]!.id).toBe('longsword-1');
  });

  it('removes item: disappears from equipment array', () => {
    const char = makeFighter();
    const withSword = addEquipment(char, SWORD);
    const result = removeEquipment(withSword, 'longsword-1');
    expect(result.equipment).toHaveLength(0);
  });

  it('removes non-existent item: no change', () => {
    const char = makeFighter();
    const result = removeEquipment(char, 'does-not-exist');
    expect(result).toEqual(char);
  });
});

describe('modifyCurrency', () => {
  it('adds gold: gp increases', () => {
    const char = makeFighter();
    // Fighter starts with 10 gp from Soldier background
    const result = modifyCurrency(char, { gp: 5 });
    expect(result.currency.gp).toBe(15);
  });

  it('subtracts gold: gp decreases (but not below 0)', () => {
    const char = makeFighter();
    const result = modifyCurrency(char, { gp: -15 });
    expect(result.currency.gp).toBe(0); // 10 - 15 = -5, clamped to 0
  });

  it('modifies multiple currencies at once', () => {
    const char = makeFighter();
    const result = modifyCurrency(char, { gp: 3, sp: 5, cp: -1 });
    expect(result.currency.gp).toBe(13); // 10 + 3
    expect(result.currency.sp).toBe(5); // 0 + 5
    expect(result.currency.cp).toBe(0); // 0 + (-1), clamped to 0
    expect(result.currency.ep).toBe(0); // unchanged
    expect(result.currency.pp).toBe(0); // unchanged
  });

  it('original unchanged (immutability)', () => {
    const char = makeFighter();
    const originalGp = char.currency.gp;
    modifyCurrency(char, { gp: 100 });
    expect(char.currency.gp).toBe(originalGp);
  });
});

// ── addKnownSpell / removeKnownSpell ────────────────────────

describe('addKnownSpell / removeKnownSpell', () => {
  it('adds known spell: added to knownSpells for class', () => {
    const char = makeWizard();
    const result = addKnownSpell(char, 'Wizard', 'magic-missile');
    expect(result.spells.classSpellcasting['Wizard']!.knownSpells).toContain('magic-missile');
  });

  it('adds known spell to non-existent class: no change', () => {
    const char = makeWizard();
    const result = addKnownSpell(char, 'Cleric', 'cure-wounds');
    expect(result.spells.classSpellcasting['Cleric']).toBeUndefined();
  });

  it('adds already known spell: no duplicate', () => {
    const char = makeWizard();
    const once = addKnownSpell(char, 'Wizard', 'magic-missile');
    const twice = addKnownSpell(once, 'Wizard', 'magic-missile');
    expect(twice.spells.classSpellcasting['Wizard']!.knownSpells.filter(id => id === 'magic-missile')).toHaveLength(1);
  });

  it('removes known spell: removed from knownSpells', () => {
    const char = makeWizard();
    const withSpell = addKnownSpell(char, 'Wizard', 'magic-missile');
    const result = removeKnownSpell(withSpell, 'Wizard', 'magic-missile');
    expect(result.spells.classSpellcasting['Wizard']!.knownSpells).not.toContain('magic-missile');
  });

  it('removes known spell: also removed from preparedSpells', () => {
    const char = makeWizard();
    const withSpell = addKnownSpell(char, 'Wizard', 'magic-missile');
    const prepared = prepareSpellForClass(withSpell, 'Wizard', 'magic-missile');
    expect(prepared.spells.classSpellcasting['Wizard']!.preparedSpells).toContain('magic-missile');

    const result = removeKnownSpell(prepared, 'Wizard', 'magic-missile');
    expect(result.spells.classSpellcasting['Wizard']!.preparedSpells).not.toContain('magic-missile');
  });

  it('removes non-existent known spell: no change', () => {
    const char = makeWizard();
    const result = removeKnownSpell(char, 'Wizard', 'non-existent-spell');
    expect(result).toBe(char);
  });

  it('removes known spell for non-existent class: no change', () => {
    const char = makeWizard();
    const result = removeKnownSpell(char, 'Cleric', 'cure-wounds');
    expect(result).toBe(char);
  });
});
