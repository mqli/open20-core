import { describe, expect, it } from 'vitest';
import { getSavingThrowBonus } from '../../src/engine/saving-throw';
import { createAbilityScores, createAbilityScoresWithBonuses } from '../fixtures/ability-scores';

describe('getSavingThrowBonus', () => {
  describe('proficient saves', () => {
    it('returns ability modifier + proficiency bonus for proficient save (Fighter Str: 16+0=+3 mod, PB+3 = +6)', () => {
      const scores = createAbilityScores({ Strength: 16 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength', 'Constitution'], 3);

      // Str 16 → modifier +3, proficient → +3 + 3 = 6
      expect(result).toBe(6);
    });

    it('returns ability modifier + proficiency bonus for Con save (Con 14, +2 mod, PB+3 = +5)', () => {
      const scores = createAbilityScores({ Constitution: 14 });
      const result = getSavingThrowBonus(scores, 'Constitution', ['Strength', 'Constitution'], 3);

      // Con 14 → modifier +2, proficient → +2 + 3 = 5
      expect(result).toBe(5);
    });
  });

  describe('non-proficient saves', () => {
    it('returns ability modifier only for non-proficient save (Fighter Dex: 14+0=+2 mod, not proficient = +2)', () => {
      const scores = createAbilityScores({ Dexterity: 14 });
      const result = getSavingThrowBonus(scores, 'Dexterity', ['Strength', 'Constitution'], 3);

      // Dex 14 → modifier +2, not proficient → +2 + 0 = 2
      expect(result).toBe(2);
    });

    it('returns only ability modifier for Int save (not proficient)', () => {
      const scores = createAbilityScores({ Intelligence: 18 });
      const result = getSavingThrowBonus(scores, 'Intelligence', ['Strength', 'Constitution'], 3);

      // Int 18 → modifier +4, not proficient → +4
      expect(result).toBe(4);
    });
  });

  describe('proficiency bonus scaling', () => {
    it('uses PB+2 for level 1-4', () => {
      const scores = createAbilityScores({ Strength: 15 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 2);
      // Str 15 → +2, PB+2 → +4
      expect(result).toBe(4);
    });

    it('uses PB+3 for level 5-8', () => {
      const scores = createAbilityScores({ Strength: 15 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 3);
      // Str 15 → +2, PB+3 → +5
      expect(result).toBe(5);
    });

    it('uses PB+6 for level 17-20 (expertise not applied to saves)', () => {
      const scores = createAbilityScores({ Strength: 15 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 6);
      // Str 15 → +2, PB+6 → +8 (no expertise for saves)
      expect(result).toBe(8);
    });
  });

  describe('ability modifiers', () => {
    it('handles negative modifiers (Str 8 → -1)', () => {
      const scores = createAbilityScores({ Strength: 8 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 3);
      // Str 8 → -1, proficient → -1 + 3 = 2
      expect(result).toBe(2);
    });

    it('handles high modifiers (Cha 20 → +5)', () => {
      const scores = createAbilityScores({ Charisma: 20 });
      const result = getSavingThrowBonus(scores, 'Charisma', ['Charisma'], 3);
      // Cha 20 → +5, proficient → +5 + 3 = 8
      expect(result).toBe(8);
    });
  });

  describe('edge cases', () => {
    it('handles empty proficiencies array', () => {
      const scores = createAbilityScores({ Strength: 16 });
      const result = getSavingThrowBonus(scores, 'Strength', [], 3);
      // Str 16 → +3, not proficient → +3
      expect(result).toBe(3);
    });

    it('handles PB+0 (proficiency bonus 0 at level 0)', () => {
      const scores = createAbilityScores({ Strength: 16 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 0);
      // Str 16 → +3, proficient but PB+0 → +3
      expect(result).toBe(3);
    });

    it('uses total score (base + racial) for save calculation', () => {
      const scores = createAbilityScoresWithBonuses({ Strength: 14 }, { Strength: 2 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 3);
      // Str 14+2=16 → +3, proficient → +3 + 3 = 6
      expect(result).toBe(6);
    });
  });
});
