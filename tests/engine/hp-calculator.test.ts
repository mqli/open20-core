// tests/engine/hp-calculator.test.ts
import { describe, it, expect } from 'vitest';
import {
  getHitDieFixedValue,
  calculateHPAtLevel1,
  calculateHPIncrement,
  calculateMaxHP,
} from '../../src/engine/hp-calculator';
import { createMockDataLoader } from '../fixtures/data-loader';
import type { Class } from '../../src/types/class';

// ── Mock Class Data ──────────────────────────────────────

const MOCK_CLASSES: Record<string, Class> = {
  Fighter: {
    id: 'Fighter',
    name: 'Fighter',
    source: '2024 PHB',
    hitDie: 'd10',
    savingThrowProficiencies: ['Strength', 'Constitution'],
    armorTraining: ['Light', 'Medium', 'Heavy', 'Shield'],
    weaponMastery: true,
    featuresByLevel: [],
    spellcasting: null,
  },
  Wizard: {
    id: 'Wizard',
    name: 'Wizard',
    source: '2024 PHB',
    hitDie: 'd6',
    savingThrowProficiencies: ['Intelligence', 'Wisdom'],
    armorTraining: [],
    weaponMastery: false,
    featuresByLevel: [],
    spellcasting: {ability: 'Intelligence', knownSource: 'spellbook', preparationTiming: 'long_rest', changesPerPreparation: 'all' },
  },
  Barbarian: {
    id: 'Barbarian',
    name: 'Barbarian',
    source: '2024 PHB',
    hitDie: 'd12',
    savingThrowProficiencies: ['Strength', 'Constitution'],
    armorTraining: ['Light', 'Medium', 'Shield'],
    weaponMastery: true,
    featuresByLevel: [],
    spellcasting: null,
  },
  Sorcerer: {
    id: 'Sorcerer',
    name: 'Sorcerer',
    source: '2024 PHB',
    hitDie: 'd6',
    savingThrowProficiencies: ['Constitution', 'Charisma'],
    armorTraining: [],
    weaponMastery: false,
    featuresByLevel: [],
    spellcasting: {ability: 'Charisma', preparationTiming: 'level_up', changesPerPreparation: 1 },
  },
  Rogue: {
    id: 'Rogue',
    name: 'Rogue',
    source: '2024 PHB',
    hitDie: 'd8',
    savingThrowProficiencies: ['Dexterity', 'Intelligence'],
    armorTraining: ['Light'],
    weaponMastery: true,
    featuresByLevel: [],
    spellcasting: null,
  },
};

// ── Mock DataLoader ──────────────────────────────────────

const data = createMockDataLoader({
  getClass: (id: string) => MOCK_CLASSES[id] ?? undefined,
});

// ── Tests ──────────────────────────────────────────────────

describe('getHitDieFixedValue', () => {
  it('returns 4 for d6', () => expect(getHitDieFixedValue('d6')).toBe(4));
  it('returns 5 for d8', () => expect(getHitDieFixedValue('d8')).toBe(5));
  it('returns 6 for d10', () => expect(getHitDieFixedValue('d10')).toBe(6));
  it('returns 7 for d12', () => expect(getHitDieFixedValue('d12')).toBe(7));
});

describe('calculateHPAtLevel1', () => {
  it('calculates Fighter (d10) + Con 3 = 13', () => {
    expect(calculateHPAtLevel1('d10', 3)).toBe(13);
  });

  it('calculates Wizard (d6) + Con 2 = 8', () => {
    expect(calculateHPAtLevel1('d6', 2)).toBe(8);
  });

  it('calculates Barbarian (d12) + Con 4 = 16', () => {
    expect(calculateHPAtLevel1('d12', 4)).toBe(16);
  });

  it('handles negative Con modifier', () => {
    expect(calculateHPAtLevel1('d8', -1)).toBe(7); // 8 + (-1)
  });

  it('handles Con -5 (extremely low)', () => {
    expect(calculateHPAtLevel1('d6', -5)).toBe(1); // 6 + (-5) = 1
  });
});

describe('calculateHPIncrement', () => {
  it('calculates d10 + Con 3 = 9', () => {
    expect(calculateHPIncrement('d10', 3)).toBe(9); // 6 + 3
  });

  it('calculates d8 + Con -1 = 4', () => {
    expect(calculateHPIncrement('d8', -1)).toBe(4); // 5 + (-1)
  });

  it('calculates d6 + Con 0 = 4', () => {
    expect(calculateHPIncrement('d6', 0)).toBe(4); // 4 + 0
  });
});

describe('calculateMaxHP', () => {
  it('calculates 5-level Fighter Con +3 = 49', () => {
    // Level 1: 10+3=13
    // Levels 2-5: 4 * (6+3) = 36
    // Total: 13 + 36 = 49
    const char = [
      {
        classId: 'Fighter',
        level: 5,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd10' as const, used: 0 },
      },
    ];
    expect(calculateMaxHP(char, 3, data)).toBe(49);
  });

  it('calculates 1-level Wizard Con +2 = 8', () => {
    const char = [
      {
        classId: 'Wizard',
        level: 1,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd6' as const, used: 0 },
      },
    ];
    expect(calculateMaxHP(char, 2, data)).toBe(8);
  });

  it('calculates 3-level Barbarian Con +4 = 38', () => {
    // Level 1: 12+4=16
    // Levels 2-3: 2 * (7+4) = 22
    // Total: 16 + 22 = 38
    const char = [
      {
        classId: 'Barbarian',
        level: 3,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd12' as const, used: 0 },
      },
    ];
    expect(calculateMaxHP(char, 4, data)).toBe(38);
  });

  it('returns 0 for empty classes', () => {
    expect(calculateMaxHP([], 3, data)).toBe(0);
  });

  it('HP minimum is 1 even with very negative Con', () => {
    // d6 + (-5) per level, 5 levels → would be negative but capped at 1
    const char = [
      {
        classId: 'Wizard',
        level: 5,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd6' as const, used: 0 },
      },
    ];
    expect(calculateMaxHP(char, -5, data)).toBe(1); // Math.max(1, ...)
  });
});
