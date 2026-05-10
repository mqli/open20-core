// tests/monsters/query.test.ts
// Unit tests for monster query functions

import type { DataLoader } from '../../src/data/loader';
import type { Monster } from '../../src/monster/types';
import { describe, it, expect } from 'vitest';
import {
  getMonster,
  searchMonsters,
  getMonstersByCR,
  getMonstersByType,
  getMonstersForParty,
  getMonsterActions,
  getMonsterTraits,
  getMonsterReactions,
  getMonsterLegendaryActions,
  getMonstersWithTrait,
  getLegendaryMonsters,
  getMonsterAllAttacks,
  searchActionsByName
} from '../../src/monster/query';

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
    abilityScores: {
      base: { Strength: 8, Dexterity: 14, Constitution: 10, Intelligence: 10, Wisdom: 8, Charisma: 8 },
      racialBonuses: {},
      featBonuses: {},
      temporaryBonuses: {}
    },
    challengeRating: { rating: '1/4', xp: 50 },
    environments: ['forest', 'hill'],
    traits: [
      { name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action.' }
    ],
    actions: [
      {
        name: 'Scimitar',
        attacks: [
          {
            name: 'Scimitar',
            attackBonus: 4,
            damage: '1d6+2',
            damageType: 'Slashing',
            damageEntries: [{ dice: '1d6', type: 'Slashing' as const, bonus: 2 }]
          }
        ]
      },
      {
        name: 'Shortbow',
        attacks: [
          {
            name: 'Shortbow',
            attackBonus: 4,
            damage: '1d6+2',
            damageType: 'Piercing',
            damageEntries: [{ dice: '1d6', type: 'Piercing' as const, bonus: 2 }]
          }
        ]
      }
    ]
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
    abilityScores: {
      base: { Strength: 16, Dexterity: 12, Constitution: 16, Intelligence: 7, Wisdom: 11, Charisma: 10 },
      racialBonuses: {},
      featBonuses: {},
      temporaryBonuses: {}
    },
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
    abilityScores: {
      base: { Strength: 12, Dexterity: 15, Constitution: 12, Intelligence: 3, Wisdom: 12, Charisma: 6 },
      racialBonuses: {},
      featBonuses: {},
      temporaryBonuses: {}
    },
    challengeRating: { rating: '1/4', xp: 50 },
    environments: ['forest', 'grassland', 'tundra']
  },
  {
    id: 'test-dragon',
    name: 'Test Red Dragon',
    source: 'SRD 5.2',
    size: 'Large',
    type: 'Dragon',
    alignment: 'chaotic evil',
    armorClass: [{ value: 18, type: 'natural armor' }],
    hitPoints: { value: 178, formula: '17d10+85' },
    speed: { walk: 40, fly: 80 },
    abilityScores: {
      base: { Strength: 23, Dexterity: 10, Constitution: 21, Intelligence: 14, Wisdom: 11, Charisma: 19 },
      racialBonuses: {},
      featBonuses: {},
      temporaryBonuses: {}
    },
    challengeRating: { rating: 10, xp: 5900 },
    traits: [
      { name: 'Fire Aura', description: 'Deals fire damage to adjacent creatures.' }
    ],
    actions: [
      {
        name: 'Bite',
        attacks: [
          {
            name: 'Bite',
            attackBonus: 11,
            damage: '2d10+6',
            damageType: 'Piercing',
            damageEntries: [{ dice: '2d10', type: 'Piercing' as const, bonus: 6 }]
          }
        ]
      },
      {
        name: 'Fire Breath',
        description: 'Exhales fire in a cone.'
      }
    ],
    reactions: [
      { name: 'Tail Strike', description: 'Makes a tail attack as reaction.' }
    ],
    legendaryActions: [
      { name: 'Detect', description: 'Makes a Perception check.', cost: 1 },
      { name: 'Tail Attack', description: 'Makes a tail attack.', cost: 1 },
      { name: 'Wing Attack', description: 'Beats wings to knock creatures prone.', cost: 2 }
    ],
    environments: ['mountain']
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
    expect(result.length).toBe(4);
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
    const result = searchMonsters({ source: ['SRD 5.2'] }, mockDataLoader);
    expect(result.length).toBe(4);
  });
});

describe('getMonstersByCR', () => {
  it('should return monsters within CR range', () => {
    const result = getMonstersByCR('1/4', '1/2', mockDataLoader);
    expect(result.length).toBe(3); // goblin, orc, wolf (test-dragon has CR 10)
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

// ── Action/Trait/Reaction Query Tests ─────────────────────

describe('getMonsterActions', () => {
  it('should return actions for a monster', () => {
    const result = getMonsterActions('goblin', mockDataLoader);
    expect(result.length).toBe(2); // Scimitar, Shortbow
    expect(result[0]?.name).toBe('Scimitar');
  });

  it('should return empty array for non-existent monster', () => {
    const result = getMonsterActions('nonexistent', mockDataLoader);
    expect(result).toEqual([]);
  });

  it('should return actions with attacks', () => {
    const result = getMonsterActions('goblin', mockDataLoader);
    const scimitar = result.find(a => a.name === 'Scimitar');
    expect(scimitar?.attacks).toBeDefined();
    expect(scimitar?.attacks?.length).toBeGreaterThan(0);
  });
});

describe('getMonsterTraits', () => {
  it('should return traits for a monster', () => {
    const result = getMonsterTraits('goblin', mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Nimble Escape');
  });

  it('should return empty array for monster without traits', () => {
    // Wolf has traits, let's check a monster without traits
    const result = getMonsterTraits('test-dragon', mockDataLoader);
    expect(result.length).toBe(1); // Test dragon has Fire Aura
  });
});

describe('getMonsterReactions', () => {
  it('should return reactions for a legendary monster', () => {
    const result = getMonsterReactions('test-dragon', mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Tail Strike');
  });

  it('should return empty array for monster without reactions', () => {
    const result = getMonsterReactions('goblin', mockDataLoader);
    expect(result).toEqual([]);
  });
});

describe('getMonsterLegendaryActions', () => {
  it('should return legendary actions for a legendary monster', () => {
    const result = getMonsterLegendaryActions('test-dragon', mockDataLoader);
    expect(result.length).toBe(3);
    expect(result[0]?.name).toBe('Detect');
    expect(result[0]?.cost).toBe(1);
    expect(result[2]?.cost).toBe(2); // Wing Attack costs 2
  });

  it('should return empty array for non-legendary monster', () => {
    const result = getMonsterLegendaryActions('goblin', mockDataLoader);
    expect(result).toEqual([]);
  });
});

describe('getMonstersWithTrait', () => {
  it('should find monsters with specific trait', () => {
    const result = getMonstersWithTrait('Nimble Escape', mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('goblin');
  });

  it('should support partial trait name matching', () => {
    const result = getMonstersWithTrait('Nimble', mockDataLoader);
    expect(result.length).toBe(1);
  });

  it('should return empty array for non-existent trait', () => {
    const result = getMonstersWithTrait('NonExistent', mockDataLoader);
    expect(result).toEqual([]);
  });
});

describe('getLegendaryMonsters', () => {
  it('should return only legendary monsters', () => {
    const result = getLegendaryMonsters(mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('test-dragon');
  });
});

describe('getMonsterAllAttacks', () => {
  it('should return only actions with attacks', () => {
    const result = getMonsterAllAttacks('goblin', mockDataLoader);
    expect(result.length).toBe(2); // Scimitar and Shortbow both have attacks
  });

  it('should skip actions without attacks', () => {
    const result = getMonsterAllAttacks('test-dragon', mockDataLoader);
    // Bite has attacks, Fire Breath doesn't
    const biteAction = result.find(a => a.name === 'Bite');
    expect(biteAction).toBeDefined();
    const fireBreath = result.find(a => a.name === 'Fire Breath');
    expect(fireBreath).toBeUndefined();
  });
});

describe('searchActionsByName', () => {
  it('should find actions by name across all monsters', () => {
    const result = searchActionsByName('Bite', mockDataLoader);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.monsterId).toBe('test-dragon');
    expect(result[0]?.action.name).toBe('Bite');
  });

  it('should support partial name matching', () => {
    const result = searchActionsByName('bow', mockDataLoader);
    expect(result.length).toBe(1);
    expect(result[0]?.action.name).toBe('Shortbow');
  });

  it('should return empty array for non-existent action', () => {
    const result = searchActionsByName('NonExistent', mockDataLoader);
    expect(result).toEqual([]);
  });
});
