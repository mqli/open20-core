// engine/passive-perception.ts
// 被动感知计算 — 纯函数
// 对应 HLD §6.1

import type { AbilityScores } from '../types/ability';
import type { SkillEntry } from '../types/skill';
import type { ActiveCondition } from '../types/character';
import { getModifier, getTotalScore } from './ability-modifier';
import { getSkillBonus } from './skill-bonus';

/**
 * 取出 Exhaustion 的最高等级（无该状态时返回 0）
 * 2024 PHB: Exhaustion 是单一状态，不应有多个条目；
 * 若意外出现多个，取最高等级以保证幂等。
 */
function getExhaustionLevel(conditions: readonly ActiveCondition[]): number {
  let max = 0;
  for (const c of conditions) {
    if (c.id !== 'Exhaustion') continue;
    const lvl = c.level ?? 1;
    if (lvl > max) max = lvl;
  }
  return max;
}

/**
 * 计算被动感知(Passive Perception)
 *
 * 规则（2024 PHB）：
 * - 基础 = 10 + Perception技能加值
 * - Exhaustion: D20 Test 减去 2 × Exhaustion 等级；被动检定同样受影响
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
 *
 * // 同上 + Exhaustion level 2
 * // 15 - 2*2 = 11
 */
export function calculatePassivePerception(
  scores: AbilityScores,
  skills: Record<string, SkillEntry>,
  proficiencyBonus: number,
  conditions: readonly ActiveCondition[]
): number {
  const perceptionSkill = skills['Perception'];
  const base = 10;

  const perceptionBonus = perceptionSkill
    ? getSkillBonus(scores, perceptionSkill, 'Wisdom', proficiencyBonus)
    : getModifier(getTotalScore(scores, 'Wisdom'));

  const exhaustion = getExhaustionLevel(conditions);

  return base + perceptionBonus - 2 * exhaustion;
}
