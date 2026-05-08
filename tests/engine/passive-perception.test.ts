// tests/engine/passive-perception.test.ts
// 被动感知计算单元测试

import { describe, it, expect } from 'vitest';
import { calculatePassivePerception } from '../../src/engine/passive-perception';
import type { AbilityScores } from '../../src/types/ability';
import type { SkillEntry } from '../../src/types/skill';
import type { ActiveCondition } from '../../src/types/character';

// ============================================================================
// 测试辅助函数
// ============================================================================

/**
 * 创建 AbilityScores 对象
 * @param wisdomBase - 感知基础值（默认 10）
 * @param otherBases - 其他属性的基础值
 */
function makeScores(
  wisdomBase: number,
  otherBases: Partial<Record<string, number>> = {}
): AbilityScores {
  return {
    base: {
      Strength: otherBases['Strength'] ?? 10,
      Dexterity: otherBases['Dexterity'] ?? 10,
      Constitution: otherBases['Constitution'] ?? 10,
      Intelligence: otherBases['Intelligence'] ?? 10,
      Wisdom: wisdomBase,
      Charisma: otherBases['Charisma'] ?? 10,
    },
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  };
}

/**
 * 创建技能记录
 * @param perception - Perception 技能配置（可选）
 */
function makeSkills(perception?: {
  proficient: boolean;
  expertise: boolean;
}): Record<string, SkillEntry> {
  const skills: Record<string, SkillEntry> = {};

  if (perception) {
    skills['Perception'] = {
      proficient: perception.proficient,
      expertise: perception.expertise,
    };
  }

  return skills;
}

/**
 * 创建 ActiveCondition 对象
 */
function makeCondition(
  id: string,
  source = 'test',
  appliedAt = '2024-01-01T00:00:00Z'
): ActiveCondition {
  return { id: id as ActiveCondition['id'], source, appliedAt };
}

// ============================================================================
// 测试用例
// ============================================================================

describe('calculatePassivePerception', () => {
  describe('基础计算（无状态影响）', () => {
    it('用例1: Wis 14 (+2), Perception 熟练, PB+3 → 15', () => {
      const scores = makeScores(14);
      const skills = makeSkills({ proficient: true, expertise: false });
      const result = calculatePassivePerception(scores, skills, 3, []);
      // 10 + (2 + 3) = 15
      expect(result).toBe(15);
    });

    it('用例2: Wis 10 (0), Perception 不熟练 → 10', () => {
      const scores = makeScores(10);
      const skills = makeSkills({ proficient: false, expertise: false });
      const result = calculatePassivePerception(scores, skills, 3, []);
      // 10 + 0 = 10
      expect(result).toBe(10);
    });

    it('用例3: Wis 20 (+5), Perception 精通 (Expertise), PB+3 → 21', () => {
      const scores = makeScores(20);
      const skills = makeSkills({ proficient: true, expertise: true });
      const result = calculatePassivePerception(scores, skills, 3, []);
      // 10 + (5 + 6) = 21
      expect(result).toBe(21);
    });

    it('用例4: Wis 8 (-1), Perception 熟练, PB+2 → 11', () => {
      const scores = makeScores(8);
      const skills = makeSkills({ proficient: true, expertise: false });
      const result = calculatePassivePerception(scores, skills, 2, []);
      // 10 + (-1 + 2) = 11
      expect(result).toBe(11);
    });

    it('用例9: Wis 10 (0), Perception 熟练, PB+0 (边界情况) → 10', () => {
      const scores = makeScores(10);
      const skills = makeSkills({ proficient: true, expertise: false });
      const result = calculatePassivePerception(scores, skills, 0, []);
      // 10 + (0 + 0) = 10
      expect(result).toBe(10);
    });

    it('用例10: Wis 16 (+3), 高 PB+6 (17级+), Perception 熟练 → 19', () => {
      const scores = makeScores(16);
      const skills = makeSkills({ proficient: true, expertise: false });
      const result = calculatePassivePerception(scores, skills, 6, []);
      // 10 + (3 + 6) = 19
      expect(result).toBe(19);
    });
  });

  describe('无 Perception 技能条目的情况', () => {
    it('用例5: 没有 Perception 技能条目时，仅用 Wis 调整值', () => {
      const scores = makeScores(14); // Wis +2
      const skills = makeSkills(); // 不添加 Perception
      const result = calculatePassivePerception(scores, skills, 3, []);
      // 10 + 2 = 12
      expect(result).toBe(12);
    });

    it('低感知值，无 Perception 技能条目', () => {
      const scores = makeScores(6); // Wis -2
      const skills = makeSkills();
      const result = calculatePassivePerception(scores, skills, 3, []);
      // 10 + (-2) = 8
      expect(result).toBe(8);
    });

    it('高感知值，无 Perception 技能条目', () => {
      const scores = makeScores(20); // Wis +5
      const skills = makeSkills();
      const result = calculatePassivePerception(scores, skills, 4, []);
      // 10 + 5 = 15 (PB 不影响，因为没有熟练)
      expect(result).toBe(15);
    });
  });

  describe('状态影响 (conditions)', () => {
    it('用例6: 有 Exhaustion 状态时，被动感知 -5', () => {
      const scores = makeScores(14);
      const skills = makeSkills({ proficient: true, expertise: false });
      const conditions = [makeCondition('Exhaustion')];
      const result = calculatePassivePerception(scores, skills, 3, conditions);
      // 15 - 5 = 10
      expect(result).toBe(10);
    });

    it('用例7: 有多种状态但不包含 Exhaustion 时，无惩罚', () => {
      const scores = makeScores(14);
      const skills = makeSkills({ proficient: true, expertise: false });
      const conditions = [
        makeCondition('Blinded'),
        makeCondition('Poisoned'),
        makeCondition('Frightened'),
      ];
      const result = calculatePassivePerception(scores, skills, 3, conditions);
      // 15 (无惩罚)
      expect(result).toBe(15);
    });

    it('用例8: 空状态数组时，无惩罚', () => {
      const scores = makeScores(14);
      const skills = makeSkills({ proficient: true, expertise: false });
      const result = calculatePassivePerception(scores, skills, 3, []);
      // 15 (无惩罚)
      expect(result).toBe(15);
    });

    it('Exhaustion 和其他状态同时存在时，仍应用 -5 惩罚', () => {
      const scores = makeScores(14);
      const skills = makeSkills({ proficient: true, expertise: false });
      const conditions = [
        makeCondition('Exhaustion'),
        makeCondition('Blinded'),
        makeCondition('Poisoned'),
      ];
      const result = calculatePassivePerception(scores, skills, 3, conditions);
      // 15 - 5 = 10
      expect(result).toBe(10);
    });

    it('多个 Exhaustion 条件（重复）只应用一次 -5 惩罚', () => {
      const scores = makeScores(14);
      const skills = makeSkills({ proficient: true, expertise: false });
      const conditions = [
        makeCondition('Exhaustion', 'source1'),
        makeCondition('Exhaustion', 'source2'),
      ];
      const result = calculatePassivePerception(scores, skills, 3, conditions);
      // 15 - 5 = 10 (只减一次)
      expect(result).toBe(10);
    });
  });

  describe('边缘情况', () => {
    it('属性值有种族加值的情况', () => {
      const scores: AbilityScores = {
        base: {
          Strength: 10,
          Dexterity: 10,
          Constitution: 10,
          Intelligence: 10,
          Wisdom: 13,
          Charisma: 10,
        },
        racialBonuses: { Wisdom: 2 }, // 种族 +2
        featBonuses: {},
        temporaryBonuses: {},
      };
      const skills = makeSkills({ proficient: true, expertise: false });
      // Wis 总值 = 13 + 2 = 15, 调整值 = +2
      // 10 + (2 + 3) = 15
      const result = calculatePassivePerception(scores, skills, 3, []);
      expect(result).toBe(15);
    });

    it('属性值有临时加值的情况', () => {
      const scores: AbilityScores = {
        base: {
          Strength: 10,
          Dexterity: 10,
          Constitution: 10,
          Intelligence: 10,
          Wisdom: 14,
          Charisma: 10,
        },
        racialBonuses: {},
        featBonuses: {},
        temporaryBonuses: { Wisdom: 4 }, // 法术 +4
      };
      const skills = makeSkills({ proficient: true, expertise: false });
      // Wis 总值 = 14 + 4 = 18, 调整值 = +4
      // 10 + (4 + 3) = 17
      const result = calculatePassivePerception(scores, skills, 3, []);
      expect(result).toBe(17);
    });

    it('同时有种族、专长、临时加值', () => {
      const scores: AbilityScores = {
        base: {
          Strength: 10,
          Dexterity: 10,
          Constitution: 10,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 10,
        },
        racialBonuses: { Wisdom: 1 },
        featBonuses: { Wisdom: 1 },
        temporaryBonuses: { Wisdom: 2 },
      };
      const skills = makeSkills({ proficient: true, expertise: false });
      // Wis 总值 = 12 + 1 + 1 + 2 = 16, 调整值 = +3
      // 10 + (3 + 3) = 16
      const result = calculatePassivePerception(scores, skills, 3, []);
      expect(result).toBe(16);
    });

    it('Expertise 且高 PB 的情况', () => {
      const scores = makeScores(20); // Wis +5
      const skills = makeSkills({ proficient: true, expertise: true });
      // 10 + (5 + 6*2) = 10 + 17 = 27
      const result = calculatePassivePerception(scores, skills, 6, []);
      expect(result).toBe(27);
    });

    it('Exhaustion 导致负值的情况（理论边缘）', () => {
      const scores = makeScores(8); // Wis -1
      const skills = makeSkills({ proficient: false, expertise: false });
      const conditions = [makeCondition('Exhaustion')];
      // 10 + (-1) - 5 = 4
      const result = calculatePassivePerception(scores, skills, 3, conditions);
      expect(result).toBe(4);
    });
  });

  describe('不区分大小写和技能名称变体', () => {
    it('技能名称是 "Perception"（正确大小写）', () => {
      const scores = makeScores(14);
      const skills = { Perception: { proficient: true, expertise: false } };
      const result = calculatePassivePerception(scores, skills, 3, []);
      expect(result).toBe(15);
    });
  });
});
