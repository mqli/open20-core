// tests/engine/skill-bonus.test.ts
// Unit tests for skill-bonus.ts

import { describe, it, expect } from 'vitest';
import { getSkillBonus, getAllSkillBonuses } from '../../src/engine/skill-bonus';
import type { SkillEntry } from '../../src/types/skill';
import { createAbilityScores, createAbilityScoresWithBonuses } from '../fixtures/ability-scores';
import { SKILL_NAMES, SKILL_ABILITY_MAP } from '../../src/types/skill';

/**
 * Helper to create a SkillEntry.
 */
function makeSkill(proficient: boolean, expertise: boolean = false): SkillEntry {
  return { proficient, expertise };
}

describe('getSkillBonus', () => {
  describe('non-proficient skill', () => {
    it('returns ability modifier only (Str 10 → mod 0)', () => {
      const scores = createAbilityScores({ Strength: 10 });
      const skill = makeSkill(false, false);
      // Str 10 → modifier 0, not proficient → 0
      expect(getSkillBonus(scores, skill, 'Strength', 2)).toBe(0);
    });

    it('returns ability modifier only (Dex 14 → mod +2)', () => {
      const scores = createAbilityScores({ Dexterity: 14 });
      const skill = makeSkill(false, false);
      // Dex 14 → modifier +2, not proficient → 2
      expect(getSkillBonus(scores, skill, 'Dexterity', 2)).toBe(2);
    });

    it('returns ability modifier only (Int 8 → mod -1)', () => {
      const scores = createAbilityScores({ Intelligence: 8 });
      const skill = makeSkill(false, false);
      // Int 8 → modifier -1, not proficient → -1
      expect(getSkillBonus(scores, skill, 'Intelligence', 2)).toBe(-1);
    });
  });

  describe('proficient skill', () => {
    it('returns ability modifier + PB (Str 10, PB+3 = +3)', () => {
      const scores = createAbilityScores({ Strength: 10 });
      const skill = makeSkill(true, false);
      // Str 10 → 0, proficient → 0 + 3 = 3
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(3);
    });

    it('returns ability modifier + PB (Con 14, PB+3 = +5)', () => {
      const scores = createAbilityScores({ Constitution: 14 });
      const skill = makeSkill(true, false);
      // Con 14 → +2, proficient → 2 + 3 = 5
      expect(getSkillBonus(scores, skill, 'Constitution', 3)).toBe(5);
    });

    it('handles negative ability modifier (Str 8, PB+3 = +2)', () => {
      const scores = createAbilityScores({ Strength: 8 });
      const skill = makeSkill(true, false);
      // Str 8 → -1, proficient → -1 + 3 = 2
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(2);
    });
  });

  describe('expertise skill', () => {
    it('returns ability modifier + 2*PB (Dex 14, PB+3 = +8)', () => {
      const scores = createAbilityScores({ Dexterity: 14 });
      const skill = makeSkill(true, true);
      // Dex 14 → +2, expertise → 2 + 2*3 = 8
      expect(getSkillBonus(scores, skill, 'Dexterity', 3)).toBe(8);
    });

    it('handles high PB (PB+6, expertise = +14)', () => {
      const scores = createAbilityScores({ Dexterity: 14 });
      const skill = makeSkill(true, true);
      // Dex 14 → +2, expertise → 2 + 2*6 = 14
      expect(getSkillBonus(scores, skill, 'Dexterity', 6)).toBe(14);
    });

    it('handles negative modifier with expertise (Int 8, PB+3 = +5)', () => {
      const scores = createAbilityScores({ Intelligence: 8 });
      const skill = makeSkill(true, true);
      // Int 8 → -1, expertise → -1 + 2*3 = 5
      expect(getSkillBonus(scores, skill, 'Intelligence', 3)).toBe(5);
    });
  });

  describe('proficiency bonus scaling', () => {
    it('uses PB+2 for level 1-4', () => {
      const scores = createAbilityScores({ Strength: 15 });
      const skill = makeSkill(true, false);
      // Str 15 → +2, PB+2 → 2 + 2 = 4
      expect(getSkillBonus(scores, skill, 'Strength', 2)).toBe(4);
    });

    it('uses PB+3 for level 5-8', () => {
      const scores = createAbilityScores({ Strength: 15 });
      const skill = makeSkill(true, false);
      // Str 15 → +2, PB+3 → 2 + 3 = 5
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(5);
    });

    it('uses PB+6 for level 17-20', () => {
      const scores = createAbilityScores({ Strength: 15 });
      const skill = makeSkill(true, false);
      // Str 15 → +2, PB+6 → 2 + 6 = 8
      expect(getSkillBonus(scores, skill, 'Strength', 6)).toBe(8);
    });
  });

  describe('ability modifiers', () => {
    it('handles Str 20 (+5)', () => {
      const scores = createAbilityScores({ Strength: 20 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(8); // 5 + 3
    });

    it('handles Cha 8 (-1)', () => {
      const scores = createAbilityScores({ Charisma: 8 });
      const skill = makeSkill(true, false);
      expect(getSkillBonus(scores, skill, 'Charisma', 3)).toBe(2); // -1 + 3
    });
  });

  describe('edge cases', () => {
    it('handles PB+0 (level 0 or special)', () => {
      const scores = createAbilityScores({ Strength: 15 });
      const skill = makeSkill(true, false);
      // Str 15 → +2, PB+0 → 2
      expect(getSkillBonus(scores, skill, 'Strength', 0)).toBe(2);
    });

    it('uses total score (base + racial) for skill bonus', () => {
      const scores = createAbilityScoresWithBonuses({ Strength: 15 }, { Strength: 2 });
      const skill = makeSkill(true, false);
      // Str 15+2=17 → +3, proficient → 3 + 3 = 6
      expect(getSkillBonus(scores, skill, 'Strength', 3)).toBe(6);
    });

    it('uses total score (base + feat) for skill bonus', () => {
      const scores = createAbilityScoresWithBonuses({ Dexterity: 14 }, {}, { Dexterity: 1 });
      const skill = makeSkill(true, false);
      // Dex 14+1=15 → +2, proficient → 2 + 3 = 5
      expect(getSkillBonus(scores, skill, 'Dexterity', 3)).toBe(5);
    });

    it('handles all skills with expertise at high PB', () => {
      const scores = createAbilityScores({ Intelligence: 20 });
      const skill = makeSkill(true, true);
      // Int 20 → +5, expertise → 5 + 2*6 = 17
      expect(getSkillBonus(scores, skill, 'Intelligence', 6)).toBe(17);
    });
  });
});

describe('getAllSkillBonuses', () => {
  it('returns correct bonuses for all skills (Str 15, PB+3)', () => {
    const scores = createAbilityScores({ Strength: 15 });
    const skills: Record<string, SkillEntry> = {};
    for (const skill of SKILL_NAMES) {
      skills[skill] = makeSkill(true, false);
    }

    const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

    // Str 15 → +2, proficient → +5 for Str-based skills
    // Dex-based skills → Dex 10 → 0, proficient → +3
    expect(result['Athletics']).toBe(5); // Str-based
    expect(result['Acrobatics']).toBe(3); // Dex-based
    expect(result['Stealth']).toBe(3); // Dex-based
  });

  it('returns empty object for no skills input', () => {
    const scores = createAbilityScores({ Strength: 15 });
    const skills: Record<string, SkillEntry> = {};
    // No skills in input
    const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

    // getAllSkillBonuses only returns skills in the input
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns ability mod for non-proficient skills that are in input', () => {
    const scores = createAbilityScores({ Strength: 15 });
    const skills: Record<string, SkillEntry> = {
      Athletics: makeSkill(false, false), // Not proficient
    };
    const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

    // Non-proficient → ability mod only
    expect(result['Athletics']).toBe(2); // Str 15 → +2
  });

  it('returns expertise bonus (Dex 14, expertise, PB+3 = +8)', () => {
    const scores = createAbilityScores({ Dexterity: 14 });
    const skills: Record<string, SkillEntry> = {
      Acrobatics: makeSkill(true, true),
    };

    const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

    // Dex 14 → +2, expertise → 2 + 2*3 = 8
    expect(result['Acrobatics']).toBe(8);
  });

  it('handles mixed proficiencies and expertise', () => {
    const scores = createAbilityScores({
      Strength: 15,
      Dexterity: 14,
      Intelligence: 12,
    });
    const skills: Record<string, SkillEntry> = {
      Athletics: makeSkill(true, false), // Proficient
      Acrobatics: makeSkill(true, true),   // Expertise
      Arcana: makeSkill(false, false),     // Not proficient
    };

    const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

    expect(result['Athletics']).toBe(5); // Str 15 → +2, prof → 2+3=5
    expect(result['Acrobatics']).toBe(8); // Dex 14 → +2, exp → 2+6=8
    expect(result['Arcana']).toBe(1);     // Int 12 → +1, not prof → 1
  });

  it('uses total ability score (base + racial) for all skills', () => {
    const scores = createAbilityScoresWithBonuses({ Strength: 15 }, { Strength: 2 });
    const skills: Record<string, SkillEntry> = {
      Athletics: makeSkill(true, false),
    };

    const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 3);

    // Str 15+2=17 → +3, proficient → 3+3=6
    expect(result['Athletics']).toBe(6);
  });

  it('returns only skills that are in the input', () => {
    const scores = createAbilityScores();
    const skills: Record<string, SkillEntry> = {
      Athletics: makeSkill(true, false),
    };
    const result = getAllSkillBonuses(scores, skills, SKILL_ABILITY_MAP, 2);

    expect(result['Athletics']).toBeDefined();
    expect(Object.keys(result)).toHaveLength(1);
  });
});
