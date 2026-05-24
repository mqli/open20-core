// tests/spells/query.test.ts
// Tests for spell query functions

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSpell,
  searchSpells,
  getSpellsForCharacter,
  getPreparedSpells,
  isSpellPrepared,
  knowsSpell,
  getClassSpellData,
  knowsSpellForClass,
  isSpellPreparedForClass,
  isClassListCaster,
  isSpellbookCaster,
  canChangeSpellsOnLongRest,
  canChangeSpellsOnLevelUp,
  getKnownSpellsForClass,
} from '../../src/spells/query';
import type { DataLoader } from '../../src/data/loader';
import type { Spell, SpellLevel, SpellSchool } from '../../src/types/spell';
import type { Class } from '../../src/types/class';

// Mock calculateSpellSlots to return predictable results
vi.mock('../../src/engine/spell-slots', () => ({
  calculateSpellSlots: vi.fn((classId: string, level: number) => {
    // Return spell slots based on class level
    // This is a simplified mock - returns slots for levels 1-9
    const slots: Record<number, { total: number; used: number }> = {};
    for (let i = 1; i <= 9; i++) {
      slots[i] = { total: 0, used: 0 };
    }

    // Simplified spell slot table for Sorcerer
    if (classId === 'Sorcerer') {
      if (level >= 1) slots[1] = { total: 2, used: 0 };
      if (level >= 2) slots[1] = { total: 3, used: 0 };
      if (level >= 3) {
        slots[1] = { total: 4, used: 0 };
        slots[2] = { total: 2, used: 0 };
      }
      if (level >= 5) {
        slots[1] = { total: 4, used: 0 };
        slots[2] = { total: 3, used: 0 };
        slots[3] = { total: 2, used: 0 };
      }
      if (level >= 9) {
        slots[1] = { total: 4, used: 0 };
        slots[2] = { total: 3, used: 0 };
        slots[3] = { total: 3, used: 0 };
        slots[4] = { total: 3, used: 0 };
        slots[5] = { total: 1, used: 0 };
      }
    }

    return slots;
  }),
}));

// ── Shared Fixtures ───────────────────────────────────

import { createMockDataLoader } from '../fixtures/data-loader';
import { MOCK_SPELLS, createMockSpell, MOCK_SHIELD, MOCK_FIREBALL } from '../fixtures/spells';

// ── Mock DataLoader ────────────────────────────────────

function createMockDataLoaderWithSpells(spells: Spell[] = MOCK_SPELLS): DataLoader {
  return createMockDataLoader({
    getSpell: (id: string) => spells.find(s => s.id === id),
    getAllSpells: () => spells,
    getSpellsByLevel: (level: SpellLevel) => spells.filter(s => s.level === level),
  });
}

// ── Mock Character ─────────────────────────────────────

const MOCK_CHARACTER = {
  spells: {
    classSpellcasting: {
      Wizard: {
        classId: 'Wizard',
        spellcastingAbility: 'Intelligence' as const,
        spellSaveDC: 15,
        spellAttackBonus: 7,
        knownSpells: ['fireball', 'shield', 'fire-bolt'],
        preparedSpells: ['shield', 'fireball'],
        alwaysPreparedSpells: [],
        maxPrepared: 5,
      },
    },
    spellSlots: {
      1: { total: 4, used: 0 },
      2: { total: 3, used: 0 },
      3: { total: 3, used: 0 },
    } as any,
    pactMagicSlots: null,
  },
};

// ── Mock Class Data ────────────────────────────────────

const MOCK_WIZARD_CLASS: Class = {
  id: 'Wizard',
  name: 'Wizard',
  source: '2024 PHB',
  hitDie: 'd6' as any,
  savingThrowProficiencies: ['Intelligence', 'Wisdom'] as any,
  armorTraining: [],
  weaponProficiencies: [],
  weaponMastery: false,
  featuresByLevel: [],
  spellcasting: {    ability: 'Intelligence' as any,
    knownSource: 'spellbook',
    preparationTiming: 'long_rest',
    changesPerPreparation: 'all',
  },
};

const MOCK_CLERIC_CLASS: Class = {
  id: 'Cleric',
  name: 'Cleric',
  source: '2024 PHB',
  hitDie: 'd8' as any,
  savingThrowProficiencies: ['Wisdom', 'Charisma'] as any,
  armorTraining: ['Light', 'Medium', 'Heavy', 'Shields'],
  weaponProficiencies: ['Simple'],
  weaponMastery: false,
  featuresByLevel: [],
  spellcasting: {    ability: 'Wisdom' as any,
    knownSource: 'class_list',
    preparationTiming: 'long_rest',
    changesPerPreparation: 'all',
  },
};

const MOCK_BARD_CLASS: Class = {
  id: 'Bard',
  name: 'Bard',
  source: '2024 PHB',
  hitDie: 'd8' as any,
  savingThrowProficiencies: ['Dexterity', 'Charisma'] as any,
  armorTraining: ['Light'],
  weaponProficiencies: ['Simple', 'Hand Crossbow', 'Longsword', 'Rapier', 'Shortsword'],
  weaponMastery: false,
  featuresByLevel: [],
  spellcasting: {    ability: 'Charisma' as any,
    knownSource: 'class_list',
    preparationTiming: 'level_up',
    changesPerPreparation: 'all',
  },
};

const MOCK_FIGHTER_CLASS: Class = {
  id: 'Fighter',
  name: 'Fighter',
  source: '2024 PHB',
  hitDie: 'd10' as any,
  savingThrowProficiencies: ['Strength', 'Constitution'] as any,
  armorTraining: ['Light', 'Medium', 'Heavy', 'Shields'],
  weaponProficiencies: ['Simple', 'Martial'],
  weaponMastery: true,
  featuresByLevel: [],
  spellcasting: null,
};

// ── Tests ─────────────────────────────────────────────

describe('getSpell', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return spell by id', () => {
    const spell = getSpell('fireball', data);
    expect(spell).toBeDefined();
    expect(spell?.name).toBe('Fireball');
  });

  it('should return undefined for non-existent spell', () => {
    const spell = getSpell('non-existent', data);
    expect(spell).toBeUndefined();
  });
});

describe('searchSpells', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return all spells when no filter', () => {
    const results = searchSpells({}, data);
    expect(results.length).toBe(MOCK_SPELLS.length);
  });

  it('should filter by name (case-insensitive)', () => {
    const results = searchSpells({ name: 'fire' }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.name.toLowerCase().includes('fire'))).toBe(true);
  });

  it('should filter by level', () => {
    const results = searchSpells({ level: [0, 1] }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.level === 0 || s.level === 1)).toBe(true);
  });

  it('should filter by school', () => {
    const results = searchSpells({ school: ['Evocation'] }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.school === 'Evocation')).toBe(true);
  });

  it('should filter by concentration', () => {
    const results = searchSpells({ concentration: true }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.concentration === true)).toBe(true);
  });

  it('should filter by ritual', () => {
    const results = searchSpells({ ritual: true }, data);
    expect(results).toEqual([]); // No ritual spells in mock data
  });

  it('should combine multiple filters', () => {
    const results = searchSpells(
      {
        level: [1],
        school: ['Evocation'],
      },
      data
    );
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe('healing-word');
  });
});

describe('getSpellsForCharacter', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return known spells with full data', () => {
    const results = getSpellsForCharacter(MOCK_CHARACTER as any, data);
    expect(results.length).toBe(3);
    expect(results.map(s => s.id)).toContain('fireball');
    expect(results.map(s => s.id)).toContain('shield');
    expect(results.map(s => s.id)).toContain('fire-bolt');
  });

  it('should skip unknown spell ids', () => {
    const char = {
      spells: {
        classSpellcasting: {
          Wizard: {
            classId: 'Wizard',
            spellcastingAbility: 'Intelligence' as const,
            spellSaveDC: 15,
            spellAttackBonus: 7,
            knownSpells: ['fireball', 'non-existent'],
            preparedSpells: [],
            alwaysPreparedSpells: [],
            maxPrepared: 5,
          },
        },
        spellSlots: {
          1: { total: 4, used: 0 },
          2: { total: 3, used: 0 },
          3: { total: 3, used: 0 },
        } as any,
        pactMagicSlots: null,
      },
    };
    const results = getSpellsForCharacter(char as any, data);
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe('fireball');
  });
});

describe('getPreparedSpells', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return prepared spells with full data', () => {
    const results = getPreparedSpells(MOCK_CHARACTER as any, data);
    expect(results.length).toBe(2);
    expect(results.map(s => s.id)).toContain('shield');
    expect(results.map(s => s.id)).toContain('fireball');
  });

  it('should include always-prepared spells', () => {
    const char = {
      spells: {
        classSpellcasting: {
          Wizard: {
            classId: 'Wizard',
            spellcastingAbility: 'Intelligence' as const,
            spellSaveDC: 15,
            spellAttackBonus: 7,
            knownSpells: ['fireball', 'shield'],
            preparedSpells: ['shield'],
            alwaysPreparedSpells: ['guidance', 'healing-word'],
            maxPrepared: 5,
          },
        },
        spellSlots: {},
        pactMagicSlots: null,
      },
    };
    const results = getPreparedSpells(char as any, data);
    expect(results.map(s => s.id)).toContain('shield'); // regularly prepared
    expect(results.map(s => s.id)).toContain('guidance'); // always-prepared
    expect(results.map(s => s.id)).toContain('healing-word'); // always-prepared
  });
});

describe('isSpellPrepared', () => {
  it('should return true for prepared spell', () => {
    expect(isSpellPrepared(MOCK_CHARACTER as any, 'shield')).toBe(true);
  });

  it('should return false for known but not prepared spell', () => {
    expect(isSpellPrepared(MOCK_CHARACTER as any, 'fire-bolt')).toBe(false);
  });

  it('should return false for unknown spell', () => {
    expect(isSpellPrepared(MOCK_CHARACTER as any, 'non-existent')).toBe(false);
  });
});

describe('knowsSpell', () => {
  it('should return true for known spell', () => {
    expect(knowsSpell(MOCK_CHARACTER as any, 'fireball')).toBe(true);
  });

  it('should return false for unknown spell', () => {
    expect(knowsSpell(MOCK_CHARACTER as any, 'non-existent')).toBe(false);
  });
});

describe('getClassSpellData', () => {
  it('should return class spell data for existing class', () => {
    const result = getClassSpellData(MOCK_CHARACTER as any, 'Wizard');
    expect(result).toBeDefined();
    expect(result?.classId).toBe('Wizard');
    expect(result?.spellcastingAbility).toBe('Intelligence');
  });

  it('should return undefined for non-existent class', () => {
    const result = getClassSpellData(MOCK_CHARACTER as any, 'Fighter');
    expect(result).toBeUndefined();
  });
});

describe('knowsSpellForClass', () => {
  it('should return true for spell known by class', () => {
    expect(knowsSpellForClass(MOCK_CHARACTER as any, 'Wizard', 'fireball')).toBe(true);
  });

  it('should return false for spell not known by class', () => {
    expect(knowsSpellForClass(MOCK_CHARACTER as any, 'Wizard', 'wish')).toBe(false);
  });

  it('should return false for non-existent class', () => {
    expect(knowsSpellForClass(MOCK_CHARACTER as any, 'Fighter', 'fireball')).toBe(false);
  });
});

describe('isSpellPreparedForClass', () => {
  it('should return true for prepared spell', () => {
    expect(isSpellPreparedForClass(MOCK_CHARACTER as any, 'Wizard', 'shield')).toBe(true);
  });

  it('should return true for always-prepared spell', () => {
    const char = {
      spells: {
        classSpellcasting: {
          Wizard: {
            classId: 'Wizard',
            spellcastingAbility: 'Intelligence' as const,
            spellSaveDC: 15,
            spellAttackBonus: 7,
            knownSpells: ['shield'],
            preparedSpells: [],
            alwaysPreparedSpells: ['shield'],
            maxPrepared: 5,
          },
        },
        spellSlots: {},
        pactMagicSlots: null,
      },
    };
    expect(isSpellPreparedForClass(char as any, 'Wizard', 'shield')).toBe(true);
  });

  it('should return false for unknown spell', () => {
    expect(isSpellPreparedForClass(MOCK_CHARACTER as any, 'Wizard', 'wish')).toBe(false);
  });

  it('should return false for non-existent class', () => {
    expect(isSpellPreparedForClass(MOCK_CHARACTER as any, 'Fighter', 'shield')).toBe(false);
  });
});

describe('isClassListCaster', () => {
  it('should return true for Cleric (class_list caster)', () => {
    expect(isClassListCaster(MOCK_CLERIC_CLASS)).toBe(true);
  });

  it('should return true for Bard (class_list caster)', () => {
    expect(isClassListCaster(MOCK_BARD_CLASS)).toBe(true);
  });

  it('should return false for Wizard (spellbook caster)', () => {
    expect(isClassListCaster(MOCK_WIZARD_CLASS)).toBe(false);
  });

  it('should return false for Fighter (non-caster)', () => {
    expect(isClassListCaster(MOCK_FIGHTER_CLASS)).toBe(false);
  });
});

describe('isSpellbookCaster', () => {
  it('should return true for Wizard (spellbook caster)', () => {
    expect(isSpellbookCaster(MOCK_WIZARD_CLASS)).toBe(true);
  });

  it('should return false for Cleric (class_list caster)', () => {
    expect(isSpellbookCaster(MOCK_CLERIC_CLASS)).toBe(false);
  });

  it('should return false for Fighter (non-caster)', () => {
    expect(isSpellbookCaster(MOCK_FIGHTER_CLASS)).toBe(false);
  });
});

describe('canChangeSpellsOnLongRest', () => {
  it('should return true for Wizard (long_rest timing)', () => {
    expect(canChangeSpellsOnLongRest(MOCK_WIZARD_CLASS)).toBe(true);
  });

  it('should return true for Cleric (long_rest timing)', () => {
    expect(canChangeSpellsOnLongRest(MOCK_CLERIC_CLASS)).toBe(true);
  });

  it('should return false for Bard (level_up timing)', () => {
    expect(canChangeSpellsOnLongRest(MOCK_BARD_CLASS)).toBe(false);
  });

  it('should return false for Fighter (non-caster)', () => {
    expect(canChangeSpellsOnLongRest(MOCK_FIGHTER_CLASS)).toBe(false);
  });
});

describe('canChangeSpellsOnLevelUp', () => {
  it('should return true for Bard (level_up timing)', () => {
    expect(canChangeSpellsOnLevelUp(MOCK_BARD_CLASS)).toBe(true);
  });

  it('should return false for Wizard (long_rest timing)', () => {
    expect(canChangeSpellsOnLevelUp(MOCK_WIZARD_CLASS)).toBe(false);
  });

  it('should return false for Fighter (non-caster)', () => {
    expect(canChangeSpellsOnLevelUp(MOCK_FIGHTER_CLASS)).toBe(false);
  });
});

// ── Mock Spells by Level ──────────────────────────────────

const MOCK_CANTRIP: Spell = createMockSpell({
  id: 'acid-splash',
  name: 'Acid Splash',
  level: 0 as SpellLevel,
  school: 'Conjuration' as SpellSchool,
});

const MOCK_L1_SPELL: Spell = createMockSpell({
  id: 'charm-person',
  name: 'Charm Person',
  level: 1 as SpellLevel,
  school: 'Enchantment' as SpellSchool,
});

const MOCK_L2_SPELL: Spell = createMockSpell({
  id: 'mirror-image',
  name: 'Mirror Image',
  level: 2 as SpellLevel,
  school: 'Illusion' as SpellSchool,
});

const MOCK_L3_SPELL: Spell = createMockSpell({
  id: 'dispel-magic',
  name: 'Dispel Magic',
  level: 3 as SpellLevel,
  school: 'Abjuration' as SpellSchool,
});

const MOCK_L5_SPELL: Spell = createMockSpell({
  id: 'hold-monster',
  name: 'Hold Monster',
  level: 5 as SpellLevel,
  school: 'Abjuration' as SpellSchool,
});

// ── Mock Sorcerer Class (known caster) ────────────────────

const MOCK_SORCERER_CLASS: Class = {
  id: 'Sorcerer',
  name: 'Sorcerer',
  source: '2024 PHB',
  hitDie: 'd6' as any,
  savingThrowProficiencies: ['Constitution', 'Charisma'] as any,
  armorTraining: [],
  weaponProficiencies: ['Simple'],
  weaponMastery: false,
  featuresByLevel: [],
  spellcasting: {    ability: 'Charisma' as any,
    preparationTiming: 'level_up',
    changesPerPreparation: 1,
  },
};

// ── getKnownSpellsForClass Tests ───────────────────────────

describe('getKnownSpellsForClass', () => {
  // Create a data loader with spells of various levels
  const allSpells = [
    MOCK_CANTRIP,      // level 0
    MOCK_L1_SPELL,     // level 1
    MOCK_SHIELD,       // level 1
    MOCK_L2_SPELL,     // level 2
    MOCK_L3_SPELL,     // level 3
    MOCK_FIREBALL,     // level 3
    MOCK_L5_SPELL,     // level 5
  ];

  function createTestDataLoader(spells: Spell[] = allSpells): DataLoader {
    const createSlotRecord = (slots: Record<number, number>): Record<number, number> => {
      const record: Record<number, number> = {};
      for (let i = 1; i <= 9; i++) {
        record[i] = slots[i] || 0;
      }
      return record;
    };

    const sorcererSlots: Record<number, Record<number, number>> = {
      1: createSlotRecord({ 1: 2 }),
      2: createSlotRecord({ 1: 3 }),
      3: createSlotRecord({ 1: 4, 2: 2 }),
      5: createSlotRecord({ 1: 4, 2: 3, 3: 2 }),
      9: createSlotRecord({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }),
    };

    return createMockDataLoader({
      getSpell: (id: string) => spells.find(s => s.id === id),
      getAllSpells: () => spells,
      getSpellsByLevel: (level: SpellLevel) => spells.filter(s => s.level === level),
      getClass: (id: string) => {
        if (id === 'Sorcerer') return MOCK_SORCERER_CLASS;
        if (id === 'Wizard') return MOCK_WIZARD_CLASS;
        if (id === 'Cleric') return MOCK_CLERIC_CLASS;
        return undefined;
      },
      getSpellSlots: (classId: string, classLevel: number) => {
        if (classId === 'Sorcerer') {
          return sorcererSlots[classLevel] || createSlotRecord({});
        }
        return createSlotRecord({});
      },
    });
  }

  it('should return only spells the class can cast (known caster)', () => {
    const data = createTestDataLoader();
    const char = {
      classes: [{ classId: 'Sorcerer', level: 3 }],
      spells: {
        classSpellcasting: {
          Sorcerer: {
            classId: 'Sorcerer',
            spellcastingAbility: 'Charisma' as const,
            spellSaveDC: 13,
            spellAttackBonus: 5,
            knownSpells: ['acid-splash', 'charm-person', 'mirror-image', 'dispel-magic', 'hold-monster'],
            preparedSpells: [],
            alwaysPreparedSpells: [],
            maxPrepared: 0,
          },
        },
        spellSlots: {
          1: { total: 4, used: 0 },
          2: { total: 2, used: 0 },
          3: { total: 0, used: 0 },
        },
        pactMagicSlots: null,
      },
    };

    // Level 3 Sorcerer can cast up to 2nd level spells
    const result = getKnownSpellsForClass(char as any, 'Sorcerer', data);
    const resultIds = result.map(s => s.id);

    expect(resultIds).toContain('acid-splash');  // cantrip
    expect(resultIds).toContain('charm-person');  // 1st level
    expect(resultIds).toContain('mirror-image');  // 2nd level
    expect(resultIds).not.toContain('dispel-magic');  // 3rd level - cannot cast
    expect(resultIds).not.toContain('hold-monster');  // 5th level - cannot cast
  });

  it('should return empty array for non-existent class', () => {
    const data = createTestDataLoader();
    const char = {
      classes: [{ classId: 'Sorcerer', level: 3 }],
      spells: { classSpellcasting: {}, spellSlots: {}, pactMagicSlots: null },
    };

    const result = getKnownSpellsForClass(char as any, 'Fighter', data);
    expect(result).toEqual([]);
  });

  it('should filter by per-class level, not combined multiclass level', () => {
    const data = createTestDataLoader();
    const char = {
      classes: [
        { classId: 'Sorcerer', level: 3 },
        { classId: 'Wizard', level: 2 },
      ],
      spells: {
        classSpellcasting: {
          Sorcerer: {
            classId: 'Sorcerer',
            spellcastingAbility: 'Charisma' as const,
            spellSaveDC: 13,
            spellAttackBonus: 5,
            knownSpells: ['acid-splash', 'charm-person', 'mirror-image', 'dispel-magic'],
            preparedSpells: [],
            alwaysPreparedSpells: [],
            maxPrepared: 0,
          },
        },
        spellSlots: {
          1: { total: 3, used: 0 },  // multiclass slots
          2: { total: 0, used: 0 },
        },
        pactMagicSlots: null,
      },
    };

    // Sorcerer is level 3, can cast up to 2nd level spells
    const result = getKnownSpellsForClass(char as any, 'Sorcerer', data);
    const resultIds = result.map(s => s.id);

    expect(resultIds).toContain('mirror-image');  // 2nd level - can cast
    expect(resultIds).not.toContain('dispel-magic');  // 3rd level - cannot cast
  });

  it('should include cantrips regardless of level', () => {
    const data = createTestDataLoader();
    const char = {
      classes: [{ classId: 'Sorcerer', level: 1 }],
      spells: {
        classSpellcasting: {
          Sorcerer: {
            classId: 'Sorcerer',
            spellcastingAbility: 'Charisma' as const,
            spellSaveDC: 13,
            spellAttackBonus: 5,
            knownSpells: ['acid-splash', 'charm-person', 'dispel-magic'],
            preparedSpells: [],
            alwaysPreparedSpells: [],
            maxPrepared: 0,
          },
        },
        spellSlots: {
          1: { total: 2, used: 0 },
        },
        pactMagicSlots: null,
      },
    };

    const result = getKnownSpellsForClass(char as any, 'Sorcerer', data);
    const resultIds = result.map(s => s.id);

    expect(resultIds).toContain('acid-splash');  // cantrip - always included
    expect(resultIds).toContain('charm-person');  // 1st level - can cast
    expect(resultIds).not.toContain('dispel-magic');  // 3rd level - cannot cast
  });
});
