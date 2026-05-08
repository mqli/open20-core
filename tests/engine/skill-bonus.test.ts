// tests/engine/skill-bonus.test.ts
// Unit tests for skill-bonus.ts

import { describe, it, expect } from 'vitest';
import { getSkillBonus, getAllSkillBonuses } from '../../src/engine/skill-bonus';
import type { AbilityScores, AbilityName } from '../../src/types/ability';
import type { SkillEntry, SkillName } from '../../src/types/skill';
import { SKILL_NAMES, SKILL_ABILITY_MAP } from '../../src/types/skill';

/**
 * Helper to create AbilityScores with sensible defaults.
 * Only specify the abilities you care about; others default to 10 (modifier 0).
 */
function makeScores(base?: Partial<Record<AbilityName, number>>): AbilityScores {
  const defaults: Record<AbilityName, number> = {
    Strength: 10,
    Dexterity: 10,
    Constitution: 10,
    Intelligence: 10,
    Wisdom: 10,
    Charisma: 10,
  };
  return {
    base: { ...defaults, ...base },
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  };
}

/**
 * Helper to create a SkillEntry.
 */
function makeSkill(proficient: boolean, expertise: boolean = false): SkillEntry {
  return { proficient, expertise };
}

describe('getSkillBonus', () => {
  describe('non-proficient skill', () => {
    it('returns ability modifier only (Str 10 → mod 0)', () => {
      const scores = makeScores({ Strength: 10 });
      const skill = makeSkill(false, false);
      // Str 10 → modifier 0, not proficient → 0
      expect(getSkillBonus(scores, skill, 'Strength', 2)).toBe(0);
    });

    it('returns ability modifier only (Dex 14 → mod +2)', () => {
      const scores = makeScores({ Dexterity: 14 });
      const skill = makeSkill(false, false);
      // Dex 14 → modifier +2, not proficient → 2
      expect(getSkillBonus(scores, skill, 'Dexterity', 3)).toBe(2);
    });

    it('is not affected by proficiency bonus', () => {
      const scores = makeScores({ Strength: 16 });
      const skill = makeSkill(false, false);
      // Str 16 → modifier +3, not proficient → 3 (proficiency ignored)
      expect(getSkillBonus(scores, skill, 'Strength', 4)).toBe(3);
    });
  });

  describe('proficient skill', () => {
    it('returns ability modifier + proficiency bonus', () => {
      const scores = makeScores({ Strength: 16 });
      const skill = makeSkill(true, false);
      // Str 16 → modifier +3, proficient, PB +3 → 3 + 3 = 6
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(6);
    });

    it('works with minimal values (Str 8 → mod -1)', () => {
      const scores = makeScores({ Strength: 8 });
      const skill = makeSkill(true, false);
      // Str 8 → modifier -1, proficient, PB +2 → -1 + 2 = 1
      expect(getSkillBonus(scores, skill, 'Strength', 2)).toBe(1);
    });
  });

  describe('expertise skill (Rogue 6+)', () => {
    it('returns ability modifier + proficiency bonus * 2', () => {
      const scores = makeScores({ Dexterity: 14 });
      const skill = makeSkill(true, true);
      // Dex 14 → modifier +2, expertise, PB +3 → 2 + 3*2 = 8
      expect(getSkillBonus(scores, skill, 'Dexterity', 3)).toBe(8);
    });

    it('expertise doubles PB even at low PB', () => {
      const scores = makeScores({ Charisma: 20 });
      const skill = makeSkill(true, true);
      // Cha 20 → modifier +5, expertise, PB +2 → 5 + 2*2 = 9
      expect(getSkillBonus(scores, skill, 'Charisma', 2)).toBe(9);
    });
  });

  describe('high ability score (Str 20, +5 mod)', () => {
    it('calculates correctly with proficiency', () => {
      const scores = makeScores({ Strength: 20 });
      const skill = makeSkill(true, false);
      // Str 20 → modifier +5, proficient, PB +3 → 5 + 3 = 8
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(8);
    });

    it('calculates correctly with expertise', () => {
      const scores = makeScores({ Strength: 20 });
      const skill = makeSkill(true, true);
      // Str 20 → modifier +5, expertise, PB +3 → 5 + 3*2 = 11
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(11);
    });
  });

  describe('low ability score (Cha 8, -1 mod)', () => {
    it('calculates correctly with proficiency', () => {
      const scores = makeScores({ Charisma: 8 });
      const skill = makeSkill(true, false);
      // Cha 8 → modifier -1, proficient, PB +3 → -1 + 3 = 2
      expect(getSkillBonus(scores, skill, 'Charisma', 3)).toBe(2);
    });

    it('can result in low total with expertise + low PB', () => {
      const scores = makeScores({ Charisma: 8 });
      const skill = makeSkill(true, true);
      // Cha 8 → modifier -1, expertise, PB +2 → -1 + 2*2 = 3
      expect(getSkillBonus(scores, skill, 'Charisma', 2)).toBe(3);
    });
  });

  describe('all 18 skills covered', () => {
    const proficiencyBonus = 3;

    // Strength skills
    it('Athletics (Strength) with proficiency', () => {
      const scores = makeScores({ Strength: 16 });
      const skill = makeSkill(true, false);
      // Str 16 → +3, proficient, PB +3 → 6
      expect(getSkillBonus(scores, skill, 'Strength', proficiencyBonus)).toBe(6);
    });

    // Dexterity skills
    it('Acrobatics (Dexterity) with proficiency', () => {
      const scores = makeScores({ Dexterity: 14 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Dexterity', proficiencyBonus)).toBe(5); // +2 + 3
    });

    it('Sleight of Hand (Dexterity) with expertise', () => {
      const scores = makeScores({ Dexterity: 14 });
      const skill = makeSkill(true, true);
      expect(getSkillBonus(scores, skill, 'Dexterity', proficiencyBonus)).toBe(8); // +2 + 3*2
    });

    it('Stealth (Dexterity) non-proficient', () => {
      const scores = makeScores({ Dexterity: 14 });
      const skill = makeSkill(false, false);
      expect(getSkillBonus(scores, skill, 'Dexterity', proficiencyBonus)).toBe(2); // +2 only
    });

    // Intelligence skills
    it('Arcana (Intelligence) with proficiency', () => {
      const scores = makeScores({ Intelligence: 12 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Intelligence', proficiencyBonus)).toBe(4); // +1 + 3
    });

    it('History (Intelligence) non-proficient', () => {
      const scores = makeScores({ Intelligence: 12 });
      const skill = makeSkill(false, false);
      expect(getSkillBonus(scores, skill, 'Intelligence', proficiencyBonus)).toBe(1); // +1 only
    });

    it('Investigation (Intelligence) with expertise', () => {
      const scores = makeScores({ Intelligence: 20 });
      const skill = makeSkill(true, true);
      expect(getSkillBonus(scores, skill, 'Intelligence', proficiencyBonus)).toBe(11); // +5 + 3*2
    });

    it('Nature (Intelligence) with proficiency', () => {
      const scores = makeScores({ Intelligence: 16 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Intelligence', proficiencyBonus)).toBe(6); // +3 + 3
    });

    it('Religion (Intelligence) non-proficient', () => {
      const scores = makeScores({ Intelligence: 10 });
      const skill = makeSkill(false, false);
      expect(getSkillBonus(scores, skill, 'Intelligence', proficiencyBonus)).toBe(0); // 0 only
    });

    // Wisdom skills
    it('Animal Handling (Wisdom) with proficiency', () => {
      const scores = makeScores({ Wisdom: 14 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Wisdom', proficiencyBonus)).toBe(5); // +2 + 3
    });

    it('Insight (Wisdom) with expertise', () => {
      const scores = makeScores({ Wisdom: 18 });
      const skill = makeSkill(true, true);
      expect(getSkillBonus(scores, skill, 'Wisdom', proficiencyBonus)).toBe(10); // +4 + 3*2
    });

    it('Medicine (Wisdom) non-proficient', () => {
      const scores = makeScores({ Wisdom: 14 });
      const skill = makeSkill(false, false);
      expect(getSkillBonus(scores, skill, 'Wisdom', proficiencyBonus)).toBe(2); // +2 only
    });

    it('Perception (Wisdom) with proficiency', () => {
      const scores = makeScores({ Wisdom: 16 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Wisdom', proficiencyBonus)).toBe(6); // +3 + 3
    });

    it('Survival (Wisdom) with expertise', () => {
      const scores = makeScores({ Wisdom: 14 });
      const skill = makeSkill(true, true);
      expect(getSkillBonus(scores, skill, 'Wisdom', proficiencyBonus)).toBe(8); // +2 + 3*2
    });

    // Charisma skills
    it('Deception (Charisma) with proficiency', () => {
      const scores = makeScores({ Charisma: 16 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Charisma', proficiencyBonus)).toBe(6); // +3 + 3
    });

    it('Intimidation (Charisma) non-proficient', () => {
      const scores = makeScores({ Charisma: 16 });
      const skill = makeSkill(false, false);
      expect(getSkillBonus(scores, skill, 'Charisma', proficiencyBonus)).toBe(3); // +3 only
    });

    it('Performance (Charisma) with expertise', () => {
      const scores = makeScores({ Charisma: 20 });
      const skill = makeSkill(true, true);
      expect(getSkillBonus(scores, skill, 'Charisma', proficiencyBonus)).toBe(11); // +5 + 3*2
    });

    it('Persuasion (Charisma) with proficiency', () => {
      const scores = makeScores({ Charisma: 14 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Charisma', proficiencyBonus)).toBe(5); // +2 + 3
    });
  });

  describe('edge cases', () => {
    it('handles score of 1 (modifier -5)', () => {
      const scores = makeScores({ Strength: 1 });
      const skill = makeSkill(false, false);
      // Str 1 → modifier -5
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(-5);
    });

    it('handles score of 30 (modifier +10)', () => {
      const scores = makeScores({ Strength: 30 });
      const skill = makeSkill(false, false);
      // Str 30 → modifier +10
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(10);
    });

    it('expertise without proficient flag is still expertise', () => {
      // The implementation checks expertise first, so this tests the logic
      const scores = makeScores({ Dexterity: 14 });
      const skill = { proficient: false, expertise: true };
      // Even if proficient is false, expertise=true should give double PB
      expect(getSkillBonus(scores, skill, 'Dexterity', 3)).toBe(8); // +2 + 3*2
    });
  });
});

describe('getAllSkillBonuses', () => {
  describe('returns correct map for all skills', () => {
    it('calculates bonuses for all 18 skills when all are present', () => {
      const scores = makeScores({
        Strength: 16, // +3
        Dexterity: 14, // +2
        Constitution: 12, // +1
        Intelligence: 10, // 0
        Wisdom: 14, // +2
        Charisma: 12, // +1
      });

      // All skills proficient
      const skills: Record<string, SkillEntry> = {};
      for (const skillName of SKILL_NAMES) {
        skills[skillName] = { proficient: true, expertise: false };
      }

      const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

      // Verify all 18 skills are in the result
      expect(Object.keys(result)).toHaveLength(18);

      // Check specific values
      expect(result['Athletics']).toBe(6); // Str +3 + PB +3 = 6
      expect(result['Acrobatics']).toBe(5); // Dex +2 + PB +3 = 5
      expect(result['Sleight of Hand']).toBe(5); // Dex +2 + PB +3 = 5
      expect(result['Stealth']).toBe(5); // Dex +2 + PB +3 = 5
      expect(result['Arcana']).toBe(3); // Int 0 + PB +3 = 3
      expect(result['History']).toBe(3); // Int 0 + PB +3 = 3
      expect(result['Investigation']).toBe(3); // Int 0 + PB +3 = 3
      expect(result['Nature']).toBe(3); // Int 0 + PB +3 = 3
      expect(result['Religion']).toBe(3); // Int 0 + PB +3 = 3
      expect(result['Animal Handling']).toBe(5); // Wis +2 + PB +3 = 5
      expect(result['Insight']).toBe(5); // Wis +2 + PB +3 = 5
      expect(result['Medicine']).toBe(5); // Wis +2 + PB +3 = 5
      expect(result['Perception']).toBe(5); // Wis +2 + PB +3 = 5
      expect(result['Survival']).toBe(5); // Wis +2 + PB +3 = 5
      expect(result['Deception']).toBe(4); // Cha +1 + PB +3 = 4
      expect(result['Intimidation']).toBe(4); // Cha +1 + PB +3 = 4
      expect(result['Performance']).toBe(4); // Cha +1 + PB +3 = 4
      expect(result['Persuasion']).toBe(4); // Cha +1 + PB +3 = 4
    });

    it('handles mix of proficient, non-proficient, and expertise skills', () => {
      const scores = makeScores({
        Strength: 16, // +3
        Dexterity: 14, // +2
        Wisdom: 16, // +3
        Charisma: 20, // +5
      });

      const skills: Record<string, SkillEntry> = {
        Athletics: { proficient: true, expertise: false }, // +3 + 3 = 6
        Acrobatics: { proficient: false, expertise: false }, // +2 only = 2
        'Sleight of Hand': { proficient: true, expertise: true }, // +2 + 3*2 = 8
        Stealth: { proficient: false, expertise: false }, // +2 only = 2
        Perception: { proficient: true, expertise: false }, // +3 + 3 = 6
        Persuasion: { proficient: true, expertise: true }, // +5 + 3*2 = 11
      };

      const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

      expect(result['Athletics']).toBe(6);
      expect(result['Acrobatics']).toBe(2);
      expect(result['Sleight of Hand']).toBe(8);
      expect(result['Stealth']).toBe(2);
      expect(result['Perception']).toBe(6);
      expect(result['Persuasion']).toBe(11);
    });
  });

  describe('only includes skills that exist in SKILL_ABILITY_MAP', () => {
    it('skips skills not in the ability map', () => {
      const scores = makeScores({ Strength: 16 });

      const skills: Record<string, SkillEntry> = {
        Athletics: { proficient: true, expertise: false },
        'Fake Skill': { proficient: true, expertise: false }, // Not in SKILL_ABILITY_MAP
      };

      const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

      // Should only include 'Athletics'
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['Athletics']).toBe(6);
      expect(result['Fake Skill']).toBeUndefined();
    });

    it('handles empty skills object', () => {
      const scores = makeScores();
      const skills: Record<string, SkillEntry> = {};

      const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('uses provided skillAbilityMap', () => {
    it('respects custom skillAbilityMap', () => {
      const scores = makeScores({ Strength: 16, Dexterity: 14 });

      const skills: Record<string, SkillEntry> = {
        'Custom Skill': { proficient: true, expertise: false },
      };

      // Custom map that maps 'Custom Skill' to 'Strength'
      const customMap: Record<string, AbilityName> = {
        'Custom Skill': 'Strength',
      };

      const result = getAllSkillBonuses(scores, skills, customMap, 3);

      // Custom Skill uses Strength (+3) + PB (+3) = 6
      expect(result['Custom Skill']).toBe(6);
    });
  });
});
