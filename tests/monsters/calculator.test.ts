// tests/monsters/calculator.test.ts
// Unit tests for monster calculator functions
import { describe, it, expect, beforeEach } from 'vitest';

import type { ChallengeRating, MonsterAttack } from '../../src/types/monster';
import type { Monster } from '../../src/monsters/types';
import {
  getMonsterProficiencyBonus,
  calculateMonsterAttackBonus,
  calculateMonsterSaveDC,
  calculateMonsterAC,
  calculateMonsterHP
} from '../../src/monsters/calculator';
import type { DataLoader } from '../../src/data/loader';

// ── Mock Monster ────────────────────────────────────────────

const mockGoblin: Monster = {
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
    base: { 'Strength': 8, 'Dexterity': 14, 'Constitution': 10, 'Intelligence': 10, 'Wisdom': 8, 'Charisma': 8 } as Record<'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma', number>,
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {}
  },
  challengeRating: { rating: '1/4', xp: 50 }
};

const mockOrc: Monster = {
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
    base: { 'Strength': 16, 'Dexterity': 12, 'Constitution': 16, 'Intelligence': 7, 'Wisdom': 11, 'Charisma': 10 } as Record<'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma', number>,
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {}
  },
  challengeRating: { rating: '1/2', xp: 100 }
};

const mockDragon: Monster = {
  id: 'adult-red-dragon',
  name: 'Adult Red Dragon',
  source: 'SRD 5.2',
  size: 'Gargantuan',
  type: 'Dragon',
  alignment: 'chaotic evil',
  armorClass: [{ value: 19, type: 'natural armor' }],
  hitPoints: { value: 256, formula: '24d12+120' },
  speed: { walk: 40, fly: 80 },
  abilityScores: {
    base: { 'Strength': 27, 'Dexterity': 10, 'Constitution': 25, 'Intelligence': 16, 'Wisdom': 13, 'Charisma': 21 } as Record<'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma', number>,
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {}
  },
  challengeRating: { rating: 17, xp: 18000 }
};

// Mock DataLoader
const mockDataLoader: DataLoader = {
  getMonster: () => undefined,
  getMonstersBySource: () => [],
  getAllMonsters: () => [],
  
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

describe('getMonsterProficiencyBonus', () => {
  it('should return +2 for CR 0-4', () => {
    expect(getMonsterProficiencyBonus(0)).toBe(2);
    expect(getMonsterProficiencyBonus(1)).toBe(2);
    expect(getMonsterProficiencyBonus(4)).toBe(2);
    expect(getMonsterProficiencyBonus('1/4')).toBe(2);
    expect(getMonsterProficiencyBonus('1/2')).toBe(2);
  });

  it('should return +3 for CR 5-8', () => {
    expect(getMonsterProficiencyBonus(5)).toBe(3);
    expect(getMonsterProficiencyBonus(8)).toBe(3);
  });

  it('should return +4 for CR 9-12', () => {
    expect(getMonsterProficiencyBonus(9)).toBe(4);
    expect(getMonsterProficiencyBonus(12)).toBe(4);
  });

  it('should return +5 for CR 13-16', () => {
    expect(getMonsterProficiencyBonus(13)).toBe(5);
    expect(getMonsterProficiencyBonus(16)).toBe(5);
  });

  it('should return +6 for CR 17-20', () => {
    expect(getMonsterProficiencyBonus(17)).toBe(6);
    expect(getMonsterProficiencyBonus(20)).toBe(6);
  });

  it('should return +9 for CR 29-30', () => {
    expect(getMonsterProficiencyBonus(29)).toBe(9);
    expect(getMonsterProficiencyBonus(30)).toBe(9);
  });
});

describe('calculateMonsterAttackBonus', () => {
  it('should return explicit attack bonus if provided', () => {
    const attack: MonsterAttack = {
      name: 'Scimitar',
      attackBonus: 4,
      damage: '1d6+2',
      damageType: 'Slashing',
      damageEntries: [{ dice: '1d6', type: 'Slashing', bonus: 2 }]
    };
    
    const result = calculateMonsterAttackBonus(mockGoblin, attack, mockDataLoader);
    expect(result).toBe(4);
  });
});

describe('calculateMonsterSaveDC', () => {
  it('should calculate save DC correctly', () => {
    // Dragon: Cha 21 → mod +5, CR 17 → prof +6
    // DC = 8 + 6 + 5 = 19
    const result = calculateMonsterSaveDC(mockDragon, 'Charisma', mockDataLoader);
    expect(result).toBe(19);
  });

  it('should calculate save DC for different abilities', () => {
    // Dragon: Str 27 → mod +8, CR 17 → prof +6
    // DC = 8 + 6 + 8 = 22
    const result = calculateMonsterSaveDC(mockDragon, 'Strength', mockDataLoader);
    expect(result).toBe(22);
  });
});

describe('calculateMonsterAC', () => {
  it('should return highest AC', () => {
    const result = calculateMonsterAC(mockGoblin);
    expect(result).toBe(15);
  });

  it('should handle multiple AC entries', () => {
    const monsterWithMultipleAC: Monster = {
      ...mockGoblin,
      armorClass: [
        { value: 13, type: 'natural armor' },
        { value: 15, type: 'natural armor', condition: 'while not incapacitated' }
      ]
    };
    
    const result = calculateMonsterAC(monsterWithMultipleAC);
    expect(result).toBe(15);
  });

  it('should return default AC 10 if no AC entries', () => {
    const monsterNoAC: Monster = {
      ...mockGoblin,
      armorClass: []
    };
    
    const result = calculateMonsterAC(monsterNoAC);
    expect(result).toBe(10);
  });
});

describe('calculateMonsterHP', () => {
  it('should return HP value', () => {
    const result = calculateMonsterHP(mockGoblin);
    expect(result).toBe(7);
  });

  it('should return correct HP for high CR monsters', () => {
    const result = calculateMonsterHP(mockDragon);
    expect(result).toBe(256);
  });
});
