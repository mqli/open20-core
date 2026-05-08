// tests/engine/initiative.test.ts
// Unit tests for calculateInitiative

import { describe, it, expect } from 'vitest';
import { calculateInitiative } from '../../src/engine/initiative';
import type { AbilityName, AbilityScores } from '../../src/types/ability';
import type { Feature } from '../../src/types/class';
import { ABILITY_NAMES } from '../../src/types/ability';

// Helper: create AbilityScores with given base values
function makeScores(base: Partial<Record<AbilityName, number>>): AbilityScores {
  const fullBase = {} as Record<AbilityName, number>;
  for (const ability of ABILITY_NAMES) {
    fullBase[ability] = base[ability] ?? 10;
  }
  return {
    base: fullBase,
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  };
}

describe('calculateInitiative', () => {
  describe('base Dexterity modifier', () => {
    it('should return +2 for Dex 14', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(2);
    });

    it('should return -1 for Dex 8', () => {
      const scores = makeScores({ Dexterity: 8 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(-1);
    });

    it('should return +5 for Dex 20', () => {
      const scores = makeScores({ Dexterity: 20 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(5);
    });

    it('should return 0 for Dex 10', () => {
      const scores = makeScores({ Dexterity: 10 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(0);
    });

    it('should return +4 for Dex 18', () => {
      const scores = makeScores({ Dexterity: 18 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(4);
    });
  });

  describe('Alert feat', () => {
    it('should add +5 with Alert feat and Dex 14', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, ['Alert'], []);
      expect(result).toBe(7); // 2 + 5
    });

    it('should add +5 with Alert feat and Dex 20', () => {
      const scores = makeScores({ Dexterity: 20 });
      const result = calculateInitiative(scores, ['Alert'], []);
      expect(result).toBe(10); // 5 + 5
    });

    it('should add +5 with Alert feat and Dex 8', () => {
      const scores = makeScores({ Dexterity: 8 });
      const result = calculateInitiative(scores, ['Alert'], []);
      expect(result).toBe(4); // -1 + 5
    });
  });

  describe('empty featIds (no Alert)', () => {
    it('should return only Dex modifier with empty featIds array', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(2);
    });

    it('should return only Dex modifier with undefined-like empty array', () => {
      const scores = makeScores({ Dexterity: 16 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(3);
    });
  });

  describe('features parameter', () => {
    it('should handle empty features array', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(2);
    });

    it('should ignore features that do not affect initiative', () => {
      const scores = makeScores({ Dexterity: 14 });
      const features: Feature[] = [
        { name: 'Jack of All Trades', description: 'Some feature' },
        { name: 'Rage', description: 'Barbarian feature' },
      ];
      const result = calculateInitiative(scores, [], features);
      expect(result).toBe(2);
    });
  });

  describe('multiple feats without Alert', () => {
    it('should return only Dex modifier when multiple feats but no Alert', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, ['Great Weapon Master', 'Sharpshooter'], []);
      expect(result).toBe(2);
    });

    it('should return only Dex modifier with various non-Alert feats', () => {
      const scores = makeScores({ Dexterity: 10 });
      const result = calculateInitiative(scores, ['Lucky', 'Sentinel', 'War Caster'], []);
      expect(result).toBe(0);
    });
  });

  describe('Alert feat among multiple feats', () => {
    it('should add +5 when Alert is among other feats', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = calculateInitiative(
        scores,
        ['Great Weapon Master', 'Alert', 'Sharpshooter'],
        []
      );
      expect(result).toBe(7); // 2 + 5
    });

    it('should add +5 when Alert is first in the list', () => {
      const scores = makeScores({ Dexterity: 12 });
      const result = calculateInitiative(scores, ['Alert', 'Lucky'], []);
      expect(result).toBe(6); // 1 + 5
    });

    it('should add +5 when Alert is last in the list', () => {
      const scores = makeScores({ Dexterity: 12 });
      const result = calculateInitiative(scores, ['Lucky', 'Alert'], []);
      expect(result).toBe(6); // 1 + 5
    });
  });

  describe('with racial bonuses to Dexterity', () => {
    it('should include racial bonuses in Dex total', () => {
      const scores: AbilityScores = {
        base: {
          Strength: 10,
          Dexterity: 14,
          Constitution: 10,
          Intelligence: 10,
          Wisdom: 10,
          Charisma: 10,
        },
        racialBonuses: { Dexterity: 2 },
        featBonuses: {},
        temporaryBonuses: {},
      };
      // Dex total = 14 + 2 = 16, modifier = +3
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(3);
    });

    it('should include racial bonuses with Alert feat', () => {
      const scores: AbilityScores = {
        base: {
          Strength: 10,
          Dexterity: 14,
          Constitution: 10,
          Intelligence: 10,
          Wisdom: 10,
          Charisma: 10,
        },
        racialBonuses: { Dexterity: 2 },
        featBonuses: {},
        temporaryBonuses: {},
      };
      // Dex total = 16, modifier = +3, +5 Alert = 8
      const result = calculateInitiative(scores, ['Alert'], []);
      expect(result).toBe(8);
    });
  });

  describe('performance', () => {
    it('should be fast for 1000 calls', () => {
      const scores = makeScores({ Dexterity: 14 });
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        calculateInitiative(scores, ['Alert'], []);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 1000 calls in under 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should be fast for 1000 calls without Alert', () => {
      const scores = makeScores({ Dexterity: 14 });
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        calculateInitiative(scores, [], []);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 1000 calls in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('edge cases', () => {
    it('should handle minimum Dexterity (1)', () => {
      const scores = makeScores({ Dexterity: 1 });
      // Dex 1: modifier = Math.floor((1 - 10) / 2) = Math.floor(-4.5) = -5
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(-5);
    });

    it('should handle maximum Dexterity (30)', () => {
      const scores = makeScores({ Dexterity: 30 });
      // Dex 30: modifier = Math.floor((30 - 10) / 2) = 10
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(10);
    });

    it('should handle Dexterity with Alert at maximum value', () => {
      const scores = makeScores({ Dexterity: 30 });
      const result = calculateInitiative(scores, ['Alert'], []);
      expect(result).toBe(15); // 10 + 5
    });
  });
});
