// tests/spells/query.test.ts
// Tests for spell query functions

import { describe, it, expect } from 'vitest';
import {
  getSpell,
  searchSpells,
  getSpellsForCharacter,
  getPreparedSpells,
  isSpellPrepared,
  knowsSpell,
} from '../../src/spells/query';
import type { DataLoader } from '../../src/data/loader';
import type { Spell, SpellLevel, SpellSchool } from '../../src/types/spell';

// ── Mock Spell Data ───────────────────────────────────────────

const MOCK_SPELLS: Spell[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    level: 3 as SpellLevel,
    school: 'Evocation' as SpellSchool,
    castingTime: 'Action',
    range: '150 ft.',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'A bright streak flashes from your pointing finger...',
    source: 'SRD',
    concentration: false,
    ritual: false,
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1 as SpellLevel,
    school: 'Abjuration' as SpellSchool,
    castingTime: 'Reaction',
    range: 'Self',
    components: ['V', 'S'],
    duration: '1 round',
    description: 'An invisible barrier of magical force appears...',
    source: 'SRD',
    concentration: false,
    ritual: false,
  },
  {
    id: 'mage-armor',
    name: 'Mage Armor',
    level: 1 as SpellLevel,
    school: 'Abjuration' as SpellSchool,
    castingTime: 'Action',
    range: 'Touch',
    components: ['V', 'S', 'M'],
    duration: '8 hours',
    description: 'You touch a willing creature...',
    source: 'SRD',
    concentration: false,
    ritual: false,
  },
  {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    level: 0 as SpellLevel,
    school: 'Evocation' as SpellSchool,
    castingTime: 'Action',
    range: '120 ft.',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'You hurl a mote of fire...',
    source: 'SRD',
    concentration: false,
    ritual: false,
  },
  {
    id: 'healing-word',
    name: 'Healing Word',
    level: 1 as SpellLevel,
    school: 'Evocation' as SpellSchool,
    castingTime: 'Bonus Action',
    range: '60 ft.',
    components: ['V'],
    duration: 'Instantaneous',
    description: 'A creature of your choice that you can see...',
    source: 'SRD',
    concentration: false,
    ritual: false,
  },
  {
    id: 'guidance',
    name: 'Guidance',
    level: 0 as SpellLevel,
    school: 'Divination' as SpellSchool,
    castingTime: 'Action',
    range: 'Touch',
    components: ['V', 'S'],
    duration: 'Concentration, up to 1 minute',
    description: 'You touch one willing creature...',
    source: 'SRD',
    concentration: true,
    ritual: false,
  },
];

// ── Mock DataLoader ────────────────────────────────────────────

function createMockDataLoader(spells: Spell[] = MOCK_SPELLS): DataLoader {
  return {
    getSpell: (id: string) => spells.find((s) => s.id === id),
    getAllSpells: () => spells,
    getSpellsByLevel: (level: SpellLevel) => spells.filter((s) => s.level === level),
    
    // Unused methods (return defaults)
    getSpecies: () => undefined,
    getSpeciesSubtype: () => undefined,
    getAllSpecies: () => [],
    getBackground: () => undefined,
    getAllBackgrounds: () => [],
    getClass: () => undefined,
    getAllClasses: () => [],
    getSubclass: () => undefined,
    getSubclassesForClass: () => [],
    getAllSubclasses: () => [],
    getFeat: () => undefined,
    getFeatsByCategory: () => [],
    getAllFeats: () => [],
    getWeapon: () => undefined,
    getAllWeapons: () => [],
    getArmor: () => undefined,
    getAllArmor: () => [],
    getGearItem: () => undefined,
    getAllGear: () => [],
    getProficiencyBonus: () => 2,
    getHitDieFixedValue: () => 6,
    getSpellSlots: () => ({}),
    getMulticlassSpellSlots: () => ({}),
    getPactMagicSlots: () => ({ slots: 0, slotLevel: 0 }),
    getWeaponMasteryProperties: () => [],
    getConditionNames: () => [],
  } as DataLoader;
}

// ── Mock Character ─────────────────────────────────────────────

const MOCK_CHARACTER = {
  spells: {
    knownSpells: ['fireball', 'shield', 'fire-bolt'],
    preparedSpells: ['shield', 'fireball'],
    spellcastingAbility: 'Intelligence' as const,
    spellSaveDC: 15,
    spellAttackBonus: 7,
    spellSlots: {},
    pactMagicSlots: null,
  },
};

// ── Tests ─────────────────────────────────────────────────────

describe('getSpell', () => {
  const data = createMockDataLoader();

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
  const data = createMockDataLoader();

  it('should return all spells when no filter', () => {
    const results = searchSpells({}, data);
    expect(results.length).toBe(MOCK_SPELLS.length);
  });

  it('should filter by name (case-insensitive)', () => {
    const results = searchSpells({ name: 'fire' }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.name.toLowerCase().includes('fire'))).toBe(true);
  });

  it('should filter by level', () => {
    const results = searchSpells({ level: [0, 1] }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.level === 0 || s.level === 1)).toBe(true);
  });

  it('should filter by school', () => {
    const results = searchSpells({ school: 'Evocation' }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.school === 'Evocation')).toBe(true);
  });

  it('should filter by concentration', () => {
    const results = searchSpells({ concentration: true }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.concentration === true)).toBe(true);
  });

  it('should filter by ritual', () => {
    const results = searchSpells({ ritual: true }, data);
    expect(results).toEqual([]); // No ritual spells in mock data
  });

  it('should combine multiple filters', () => {
    const results = searchSpells({
      level: [1],
      school: 'Evocation',
    }, data);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('healing-word');
  });
});

describe('getSpellsForCharacter', () => {
  const data = createMockDataLoader();

  it('should return known spells with full data', () => {
    const results = getSpellsForCharacter(MOCK_CHARACTER as any, data);
    expect(results.length).toBe(3);
    expect(results.map((s) => s.id)).toContain('fireball');
    expect(results.map((s) => s.id)).toContain('shield');
    expect(results.map((s) => s.id)).toContain('fire-bolt');
  });

  it('should skip unknown spell ids', () => {
    const char = {
      spells: {
        knownSpells: ['fireball', 'non-existent'],
        preparedSpells: [],
        spellcastingAbility: 'Intelligence' as const,
        spellSaveDC: 15,
        spellAttackBonus: 7,
        spellSlots: {},
        pactMagicSlots: null,
      },
    };
    const results = getSpellsForCharacter(char as any, data);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('fireball');
  });
});

describe('getPreparedSpells', () => {
  const data = createMockDataLoader();

  it('should return prepared spells with full data', () => {
    const results = getPreparedSpells(MOCK_CHARACTER as any, data);
    expect(results.length).toBe(2);
    expect(results.map((s) => s.id)).toContain('shield');
    expect(results.map((s) => s.id)).toContain('fireball');
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
