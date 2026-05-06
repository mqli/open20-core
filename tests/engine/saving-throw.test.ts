import { describe, expect, it } from 'vitest';
import { getSavingThrowBonus } from '../../src/engine/saving-throw';
import type { AbilityName, AbilityScores } from '../../src/types/ability';

// Helper to create AbilityScores with defaults
function makeScores(base: Partial<Record<AbilityName, number>>): AbilityScores {
  const defaultBase = {
    Strength: 10,
    Dexterity: 10,
    Constitution: 10,
    Intelligence: 10,
    Wisdom: 10,
    Charisma: 10,
  };

  return {
    base: { ...defaultBase, ...base } as Record<AbilityName, number>,
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  };
}

describe('getSavingThrowBonus', () => {
  describe('proficient saves', () => {
    it('returns ability modifier + proficiency bonus for proficient save (Fighter Str: 16+0=+3 mod, PB+3 = +6)', () => {
      const scores = makeScores({ Strength: 16 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength', 'Constitution'], 3);

      // Str 16 → modifier +3, proficient → +3 + 3 = 6
      expect(result).toBe(6);
    });

    it('returns ability modifier + proficiency bonus for Con save (Con 14, +2 mod, PB+3 = +5)', () => {
      const scores = makeScores({ Constitution: 14 });
      const result = getSavingThrowBonus(scores, 'Constitution', ['Strength', 'Constitution'], 3);

      // Con 14 → modifier +2, proficient → +2 + 3 = 5
      expect(result).toBe(5);
    });
  });

  describe('non-proficient saves', () => {
    it('returns ability modifier only for non-proficient save (Fighter Dex: 14+0=+2 mod, not proficient = +2)', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = getSavingThrowBonus(scores, 'Dexterity', ['Strength', 'Constitution'], 3);

      // Dex 14 → modifier +2, not proficient → +2 + 0 = 2
      expect(result).toBe(2);
    });

    it('returns ability modifier only for Wisdom when not proficient', () => {
      const scores = makeScores({ Wisdom: 13 });
      const result = getSavingThrowBonus(scores, 'Wisdom', ['Intelligence', 'Charisma'], 4);

      // Wis 13 → modifier +1, not proficient → +1
      expect(result).toBe(1);
    });
  });

  describe('all 6 abilities covered', () => {
    const abilities: AbilityName[] = [
      'Strength',
      'Dexterity',
      'Constitution',
      'Intelligence',
      'Wisdom',
      'Charisma',
    ];

    const baseScores = {
      Strength: 15,       // +2
      Dexterity: 14,       // +2
      Constitution: 13,    // +1
      Intelligence: 12,     // +1
      Wisdom: 10,           // 0
      Charisma: 8,          // -1
    };

    it.each(abilities)('calculates saving throw for %s when proficient', (ability) => {
      const scores = makeScores(baseScores);
      const proficiencyBonus = 3;

      const result = getSavingThrowBonus(scores, ability, abilities, proficiencyBonus);

      // All abilities are proficient in this test
      const expectedModifier = Math.floor((baseScores[ability] - 10) / 2);
      const expected = expectedModifier + proficiencyBonus;
      expect(result).toBe(expected);
    });

    it.each(abilities)('calculates saving throw for %s when not proficient', (ability) => {
      const scores = makeScores(baseScores);
      const proficiencyBonus = 3;

      const result = getSavingThrowBonus(scores, ability, [], proficiencyBonus);

      // No abilities are proficient in this test
      const expectedModifier = Math.floor((baseScores[ability] - 10) / 2);
      expect(result).toBe(expectedModifier);
    });
  });

  describe('high ability score', () => {
    it('returns +9 for Con 20 with proficient and PB+4', () => {
      const scores = makeScores({ Constitution: 20 });
      const result = getSavingThrowBonus(scores, 'Constitution', ['Constitution'], 4);

      // Con 20 → modifier +5, proficient → +5 + 4 = 9
      expect(result).toBe(9);
    });

    it('returns +8 for Str 18 with proficient and PB+3', () => {
      const scores = makeScores({ Strength: 18 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 3);

      // Str 18 → modifier +4, proficient → +4 + 3 = 7
      expect(result).toBe(7);
    });
  });

  describe('low ability score', () => {
    it('returns -1 for Str 8 when not proficient', () => {
      const scores = makeScores({ Strength: 8 });
      const result = getSavingThrowBonus(scores, 'Strength', [], 3);

      // Str 8 → modifier -1, not proficient → -1
      expect(result).toBe(-1);
    });

    it('returns 0 for Str 8 when proficient with PB+1', () => {
      const scores = makeScores({ Strength: 8 });
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 1);

      // Str 8 → modifier -1, proficient → -1 + 1 = 0
      expect(result).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero proficiency bonus', () => {
      const scores = makeScores({ Dexterity: 14 });
      const result = getSavingThrowBonus(scores, 'Dexterity', ['Dexterity'], 0);

      // Dex 14 → modifier +2, proficient but PB=0 → +2 + 0 = 2
      expect(result).toBe(2);
    });

    it('handles negative proficiency bonus (house rule or special condition)', () => {
      const scores = makeScores({ Wisdom: 14 });
      const result = getSavingThrowBonus(scores, 'Wisdom', ['Wisdom'], -1);

      // Wis 14 → modifier +2, proficient but PB=-1 → +2 + (-1) = 1
      expect(result).toBe(1);
    });

    it('handles ability score of 10 (modifier 0)', () => {
      const scores = makeScores({ Charisma: 10 });
      const result = getSavingThrowBonus(scores, 'Charisma', ['Charisma'], 3);

      // Cha 10 → modifier 0, proficient → 0 + 3 = 3
      expect(result).toBe(3);
    });

    it('handles minimum ability score of 1 (modifier -5)', () => {
      const scores = makeScores({ Strength: 1 });
      const result = getSavingThrowBonus(scores, 'Strength', [], 2);

      // Str 1 → modifier -5, not proficient → -5
      expect(result).toBe(-5);
    });
  });

  describe('multiple proficient abilities', () => {
    it('correctly identifies proficiency among multiple proficient abilities', () => {
      const scores = makeScores({
        Strength: 15,
        Dexterity: 14,
        Constitution: 13,
        Intelligence: 12,
        Wisdom: 10,
        Charisma: 8,
      });

      const proficientAbilities: AbilityName[] = [
        'Strength',
        'Constitution',
        'Wisdom',
        'Charisma',
      ];

      const proficiencyBonus = 3;

      // Test each ability
      expect(getSavingThrowBonus(scores, 'Strength', proficientAbilities, proficiencyBonus)).toBe(5); // +2 + 3
      expect(getSavingThrowBonus(scores, 'Dexterity', proficientAbilities, proficiencyBonus)).toBe(2); // +2 + 0
      expect(getSavingThrowBonus(scores, 'Constitution', proficientAbilities, proficiencyBonus)).toBe(4); // +1 + 3
      expect(getSavingThrowBonus(scores, 'Intelligence', proficientAbilities, proficiencyBonus)).toBe(1); // +1 + 0
      expect(getSavingThrowBonus(scores, 'Wisdom', proficientAbilities, proficiencyBonus)).toBe(3); // +0 + 3
      expect(getSavingThrowBonus(scores, 'Charisma', proficientAbilities, proficiencyBonus)).toBe(2); // -1 + 3
    });
  });

  describe('with racial/feat/temporary bonuses', () => {
    it('includes racial bonus in total score calculation', () => {
      const scores: AbilityScores = {
        base: { Strength: 15, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 },
        racialBonuses: { Strength: 2 },
        featBonuses: {},
        temporaryBonuses: {},
      };

      // Str total = 15 + 2 = 17 → modifier +3, proficient → +3 + 3 = 6
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 3);
      expect(result).toBe(6);
    });

    it('includes all bonuses (racial + feat + temporary) in total score calculation', () => {
      const scores: AbilityScores = {
        base: { Strength: 15, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 },
        racialBonuses: { Strength: 2 },
        featBonuses: { Strength: 1 },
        temporaryBonuses: { Strength: 2 },
      };

      // Str total = 15 + 2 + 1 + 2 = 20 → modifier +5, proficient → +5 + 4 = 9
      const result = getSavingThrowBonus(scores, 'Strength', ['Strength'], 4);
      expect(result).toBe(9);
    });
  });
});
