// engine/passive-perception.ts
// 被动感知计算 — 纯函数
// 对应 HLD §6.1

import type { AbilityScores } from '../types/ability';
import type { SkillEntry } from '../types/skill';
import type { ActiveCondition } from '../types/character';
import { getModifier, getTotalScore } from './ability-modifier';
import { getSkillBonus } from './skill-bonus';

/**
 * 计算被动感知(Passive Perception)
 *
 * 规则：
 * - 基础 = 10 + Perception技能加值
 * - 优势 = +5
 * - 劣势 = -5
 *
 * @param scores - 属性值对象
 * @param skills - 全部技能条目
 * @param proficiencyBonus - 熟练加值
 * @param conditions - 当前状态列表
 * @returns 被动感知值
 *
 * @example
 * // Wis 14(+2), proficient, proficiency +3
 * calculatePassivePerception(scores, { Perception: { proficient: true, expertise: false } }, 3, [])
 * // 15 = 10 + (2 + 3)
 */
export function calculatePassivePerception(
  scores: AbilityScores,
  skills: Record<string, SkillEntry>,
  proficiencyBonus: number,
  conditions: readonly ActiveCondition[]
): number {
  const perceptionSkill = skills['Perception'];
  const base = 10;

  if (!perceptionSkill) {
    // 没有Perception技能条目，仅用Wis调整值
    const wisMod = getModifier(getTotalScore(scores, 'Wisdom'));
    return base + wisMod;
  }

  const perceptionBonus = getSkillBonus(scores, perceptionSkill, 'Wisdom', proficiencyBonus);

  let passive = base + perceptionBonus;

  // 状态影响
  const conditionNames = new Set(conditions.map(c => c.id));

  // Blinded: 被动感知-10（实际上无法用视觉感知）
  // 这里简化处理：不自动减10，因为被动感知可能不依赖视觉
  // 但如果DM判定完全依赖视觉，则-10

  // Exhaustion 1级: 技能检定劣势 → 被动-5
  if (conditionNames.has('Exhaustion')) {
    passive -= 5;
  }

  return passive;
}
