// tests/monsters/calculator.test.ts
// Unit tests for monster calculator functions
import { describe, it, expect, beforeEach } from 'vitest';

import type { MonsterAttack } from '../../src/types/monster';
import {
  getMonsterProficiencyBonus,
  calculateMonsterAttackBonus,
  calculateMonsterSaveDC,
  calculateMonsterAC,
  calculateMonsterHP
} from '../../src/monster/calculator';
import { createMockDataLoader } from '../fixtures/data-loader';
import { MOCK_GOBLIN, MOCK_ORC, ADULT_RED_DRAGON } from '../fixtures/monsters';

// ── Tests ───────────────────────────────────────

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

    const result = calculateMonsterAttackBonus(MOCK_GOBLIN, attack, createMockDataLoader());
    expect(result).toBe(4);
  });
});

describe('calculateMonsterSaveDC', () => {
  it('should calculate save DC correctly', () => {
    // Dragon: Cha 21 → mod +5, CR 17 → prof +6
    // DC = 8 + 6 + 5 = 19
    const result = calculateMonsterSaveDC(ADULT_RED_DRAGON, 'Charisma', createMockDataLoader());
    expect(result).toBe(19);
  });

  it('should calculate save DC for different abilities', () => {
    // Dragon: Str 27 → mod +8, CR 17 → prof +6
    // DC = 8 + 6 + 8 = 22
    const result = calculateMonsterSaveDC(ADULT_RED_DRAGON, 'Strength', createMockDataLoader());
    expect(result).toBe(22);
  });
});

describe('calculateMonsterAC', () => {
  it('should return highest AC', () => {
    const result = calculateMonsterAC(MOCK_GOBLIN);
    expect(result).toBe(15);
  });

  it('should handle multiple AC entries', () => {
    const monsterWithMultipleAC = {
      ...MOCK_GOBLIN,
      armorClass: [
        { value: 13, type: 'natural armor' },
        { value: 15, type: 'natural armor', condition: 'while not incapacitated' }
      ]
    };

    const result = calculateMonsterAC(monsterWithMultipleAC);
    expect(result).toBe(15);
  });

  it('should return default AC 10 if no AC entries', () => {
    const monsterNoAC = {
      ...MOCK_GOBLIN,
      armorClass: []
    };

    const result = calculateMonsterAC(monsterNoAC);
    expect(result).toBe(10);
  });
});

describe('calculateMonsterHP', () => {
  it('should return HP value', () => {
    const result = calculateMonsterHP(MOCK_GOBLIN);
    expect(result).toBe(7);
  });

  it('should return correct HP for high CR monsters', () => {
    const result = calculateMonsterHP(ADULT_RED_DRAGON);
    expect(result).toBe(256);
  });
});
