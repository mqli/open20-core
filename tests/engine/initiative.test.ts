// tests/engine/initiative.test.ts
// Unit tests for calculateInitiative

import { describe, it, expect } from 'vitest';
import { calculateInitiative } from '../../src/engine/initiative';
import type { Feature } from '../../src/types/class';
import { createAbilityScores, createAbilityScoresWithBonuses } from '../fixtures/ability-scores';

describe('calculateInitiative', () => {
  describe('base Dexterity modifier', () => {
    it('should return +2 for Dex 14', () => {
      const scores = createAbilityScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(2);
    });

    it('should return -1 for Dex 8', () => {
      const scores = createAbilityScores({ Dexterity: 8 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(-1);
    });

    it('should return +5 for Dex 20', () => {
      const scores = createAbilityScores({ Dexterity: 20 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(5);
    });

    it('should return 0 for Dex 10', () => {
      const scores = createAbilityScores({ Dexterity: 10 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(0);
    });

    it('should return +4 for Dex 18', () => {
      const scores = createAbilityScores({ Dexterity: 18 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(4);
    });
  });

  describe('Dexterity racial bonuses', () => {
    it('should include racial bonus in initiative (Dex 14 + racial +2 → Dex 16 = +3)', () => {
      const scores = createAbilityScoresWithBonuses({ Dexterity: 14 }, { Dexterity: 2 });
      const result = calculateInitiative(scores, [], []);
      // Dex 14 → +2, racial +2 → Dex 16 → total +3
      expect(result).toBe(3);
    });

    it('should work with negative racial bonus (Dex 14 - 2 → Dex 12 = +1)', () => {
      const scores = createAbilityScoresWithBonuses({ Dexterity: 14 }, { Dexterity: -2 });
      const result = calculateInitiative(scores, [], []);
      // Dex 14 → +2, racial -2 → Dex 12 → total +1
      expect(result).toBe(1);
    });
  });

  describe('feat bonuses (proficiency bonus)', () => {
    it('should add proficiency bonus for Alert feat', () => {
      const scores = createAbilityScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, ['Alert'], [], 2);
      // Dex +2, Alert feat grants +PB (+2) → total +4
      expect(result).toBe(4);
    });

    it('should not add bonus if no relevant feat', () => {
      const scores = createAbilityScores({ Dexterity: 14 });
      const result = calculateInitiative(scores, ['Strength Feat'], [], 2);
      // Only Dex mod, no Alert
      expect(result).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle very low Dex (Dex 1 → -5)', () => {
      const scores = createAbilityScores({ Dexterity: 1 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(-5);
    });

    it('should handle very high Dex (Dex 30 → +10)', () => {
      const scores = createAbilityScores({ Dexterity: 30 });
      const result = calculateInitiative(scores, [], []);
      expect(result).toBe(10);
    });

    it('should handle PB +0 (level 1)', () => {
      const scores = createAbilityScores({ Dexterity: 15 });
      const result = calculateInitiative(scores, ['Dexterity Feat'], []);
      // Dex 15 → +2, feat grants +PB (+0) → total +2
      expect(result).toBe(2);
    });
  });
});
