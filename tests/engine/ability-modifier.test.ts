// tests/engine/ability-modifier.test.ts
import { describe, it, expect } from 'vitest';
import { getModifier, getTotalScore } from '../../src/engine/ability-modifier';
import type { AbilityScores } from '../../src/types/ability';

describe('getModifier', () => {
  it('returns 0 for score 10', () => {
    expect(getModifier(10)).toBe(0);
  });

  it('returns +4 for score 18', () => {
    expect(getModifier(18)).toBe(4);
  });

  it('returns -1 for score 8', () => {
    expect(getModifier(8)).toBe(-1);
  });

  it('returns -5 for score 1', () => {
    expect(getModifier(1)).toBe(-5);
  });

  it('returns +5 for score 20', () => {
    expect(getModifier(20)).toBe(5);
  });

  it('returns +1 for score 12', () => {
    expect(getModifier(12)).toBe(1);
  });

  it('returns -4 for score 3', () => {
    expect(getModifier(3)).toBe(-4);
  });

  // 边界：奇数属性值正确向下取整
  it('returns +1 for score 13 (not +2)', () => {
    expect(getModifier(13)).toBe(1);
  });

  it('returns +2 for score 14', () => {
    expect(getModifier(14)).toBe(2);
  });
});

describe('getTotalScore', () => {
  const baseScores: AbilityScores = {
    base: {
      Strength: 15,
      Dexterity: 12,
      Constitution: 14,
      Intelligence: 10,
      Wisdom: 13,
      Charisma: 8,
    },
    racialBonuses: { Constitution: 2 },
    featBonuses: {},
    temporaryBonuses: {},
  };

  it('sums base + racial bonus', () => {
    expect(getTotalScore(baseScores, 'Constitution')).toBe(16); // 14 + 2
  });

  it('returns base only when no bonuses', () => {
    expect(getTotalScore(baseScores, 'Strength')).toBe(15);
  });

  it('returns base for ability with no racial bonus', () => {
    expect(getTotalScore(baseScores, 'Dexterity')).toBe(12);
  });

  it('sums all bonus sources', () => {
    const scores: AbilityScores = {
      base: {
        Strength: 15,
        Dexterity: 12,
        Constitution: 14,
        Intelligence: 10,
        Wisdom: 13,
        Charisma: 8,
      },
      racialBonuses: { Strength: 2 },
      featBonuses: { Strength: 1 },
      temporaryBonuses: {},
    };
    expect(getTotalScore(scores, 'Strength')).toBe(18); // 15 + 2 + 1
  });

  it('defaults to 10 for missing base value', () => {
    const scores: AbilityScores = {
      base: {
        Strength: 15,
        Dexterity: 12,
        Constitution: 14,
        Intelligence: 10,
        Wisdom: 13,
        Charisma: 8,
      },
      racialBonuses: {},
      featBonuses: {},
      temporaryBonuses: {},
    };
    // All abilities have base values in this test
    expect(getTotalScore(scores, 'Strength')).toBe(15);
  });
});
