// tests/monsters/query.test.ts
// Unit tests for monster query functions

import type { DataLoader } from '../../src/data/loader';
import type { Monster, ChallengeRating } from '../../src/types/monster';
import {
  getMonster,
  searchMonsters,
  getMonstersByCR,
  getMonstersByType,
  getMonstersForParty
} from '../../src/monsters/query';

// ── Mock DataLoader ───────────────────────────────────────────

const mockMonsters: Monster[] = [
  {
    id: 'goblin',
    name: 'Goblin',
    source: 'SRD 5.2',
    size: 'Small',
    type: 'Humanoid',
    alignment: 'neutral evil',
    armorClass: [{ value: 15, type: 'hide armor' }],
    hitPoints: { value: 7, formula: '2d6+2' },
    speed: { walk: 30 },
    abilityScores: { Strength: 8, Dexterity: 14, Constitution: 10, Intelligence: 10, Wisdom: 8, Charisma: 8 },
    challengeRating: { rating: '1/4', xp: 50 },
    environments: ['forest', 'hill']
  },
  {
    id: 'orc',
    name: 'Orc',
    source: 'SRD 5.2',
    size: 'Medium',
    type: 'Humanoid',
    alignment: 'chaotic evil',
    armorClass: [{ value: 13, type: 'hide armor' }],
    hitPoints: { value: 15, formula: '3d8+3' },
    speed: { walk: 30 },
    abilityScores: { Strength: 16, Dexterity: 12, Constitution: 16, Intelligence: 7, Wisdom: 11, Charisma: 10 },
    challengeRating: { rating: '1/2', xp: 100 },
    environments: ['forest', 'grassland']
  },
  {
    id: 'wolf',
    name: 'Wolf',
    source: 'SRD 5.2',
    size: 'Medium',
    type: 'Beast',
    alignment: 'unaligned',
    armorClass: [{ value: 13, type: 'natural armor' }],
    hitPoints: { value: 11, formula: '3d8' },
    speed: { walk: 40 },
    abilityScores: { Strength: 12, Dexterity: 15, Constitution: 12, Intelligence: 3, Wisdom: 12, Charisma: 6 },
    challengeRating: { rating: '1/4', xp: 50 },
    environments: ['forest', 'grassland', 'tundra']
  }
];

const mockDataLoader: DataLoader = {
  // Monster methods
  getMonster: (id: string) => mockMonsters.find(m => m.id === id),
  getMonstersBySource: (source: string) => mockMonsters.filter(m => m.source === source),
  getAllMonsters: () => mockMonsters,
  
  // Stub other methods
  getSpecies: () => undefined,
  getSpeciesBySource: () => [],
  getSpeciesSubtype: () => undefined,
  getAllSpecies: () => [],
  
  getBackground: () => undefined,
  getBackgroundsBySource: () => [],
  getAllBackgrounds: () => [],
  
  getClass: () => undefined,
  getClassesBySource: () => [],
  getAllClasses: () => [],
  getSubclass: () => undefined,
  getSubclassesBySource: () => [],
  getSubclassesForClass: () => [],
  getAllSubclasses: () => [],
  
  getFeat: () => undefined,
  getFeatsBySource: () => [],
  getFeatsByCategory: () => [],
  getAllFeats: () => [],
  
  getWeapon: () => undefined,
  getWeaponsBySource: () => [],
  getAllWeapons: () => [],
  getArmor: () => undefined,
  getArmorBySource: () => [],
  getAllArmor: () => [],
  getGearItem: () => undefined,
  getGearBySource: () => [],
  getAllGear: () => [],
  
  getSpell: () => undefined,
  getSpellsBySource: () => [],
  getSpellsByLevel: () => [],
  getAllSpells: () => [],
  
  registerContentPack: () => {},
  unregisterContentPack: () => {},
  getContentPacks: () => [],
  
  getProficiencyBonus: () => 2,
  getHitDieFixedValue: () => 0,
  getSpellSlots: () => ({}),
  getMulticlassSpellSlots: () => ({}),
  getPactMagicSlots: () => ({ slots: 0, slotLevel: 0 }),
  getWeaponMasteryProperties: () => [],
  getConditionNames: () => [],
};

// ── Tests ─────────────────────────────────────────────────────

describe('getMonster', () => {
  it('should return monster by id', () => {
    const result = getMonster('goblin', mockDataLoader);
    expect(result).toBeDefined();
    expect(result?.name).toBe('Goblin');
  });

  it('should return undefined for non-existent id', () => {
    const result = getMonster('nonexistent', mockDataLoader);
    expect(result).toBeUndefined();
  });
});

describe('searchMonsters', () => {
  it('should return all monsters when no filter', () => {
    const result = searchMonsters({}, mockDataLoader);
    expect(result.length).toBe(3);
  });

  it('should filter by name', () => {
    const result = searchMonsters({ name: 'gob' }, mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('goblin');
  });

  it('should filter by type', () => {
    const result = searchMonsters({ type: ['Beast'] }, mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('wolf');
  });

  it('should filter by size', () => {
    const result = searchMonsters({ size: ['Small'] }, mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('goblin');
  });

  it('should filter by CR range', () => {
    const result = searchMonsters({ minCR: '1/4', maxCR: '1/2' }, mockDataLoader);
    expect(result.length).toBe(3); // All have CR 1/4 or 1/2
  });

  it('should filter by environment', () => {
    const result = searchMonsters({ environment: ['tundra'] }, mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('wolf');
  });

  it('should filter by source', () => {
    const result = searchMonsters({ source: 'SRD 5.2' }, mockDataLoader);
    expect(result.length).toBe(3);
  });
});

describe('getMonstersByCR', () => {
  it('should return monsters within CR range', () => {
    const result = getMonstersByCR('1/4', '1/2', mockDataLoader);
    expect(result.length).toBe(3);
  });
});

describe('getMonstersByType', () => {
  it('should return monsters of given type', () => {
    const result = getMonstersByType('Humanoid', mockDataLoader);
    expect(result.length).toBe(2);
  });
});

describe('getMonstersForParty', () => {
  it('should return appropriate monsters for party level', () => {
    const result = getMonstersForParty(1, 4, mockDataLoader);
    expect(result.length).toBeGreaterThan(0);
  });
});
