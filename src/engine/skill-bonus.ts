// engine/skill-bonus.ts
// 技能加值计算 — 纯函数
// 对应 HLD §6.1 + PRD v4.0 §4.2

import type { AbilityName, AbilityScores } from '../types/ability';
import type { SkillEntry } from '../types/skill';
import { getModifier, getTotalScore } from './ability-modifier';

/**
 * 计算技能加值
 *
 * 规则：
 * - 基础 = 属性调整值
 * - 熟练 = 基础 + 熟练加值
 * - 双重熟练（Expertise）= 基础 + 熟练加值 × 2
 *
 * @param scores - 属性值对象
 * @param skill  - 技能条目（含 proficient / expertise 字段）
 * @param abilityName - 该技能关联的属性名
 * @param proficiencyBonus - 熟练加值（由调用方根据等级计算）
 * @returns 技能加值
 *
 * @example
 * // Str 16(+3), proficient, proficiency bonus +3
 * getSkillBonus(scores, { proficient: true, expertise: false }, 'Strength', 3)
 * // 6 (= 3 + 3)
 *
 * // Dex 14(+2), expertise, proficiency bonus +3
 * getSkillBonus(scores, { proficient: true, expertise: true }, 'Dexterity', 3)
 * // 8 (= 2 + 3 + 3)
 */
export function getSkillBonus(
  scores: AbilityScores,
  skill: SkillEntry,
  abilityName: AbilityName,
  proficiencyBonus: number
): number {
  const abilityModifier = getModifier(getTotalScore(scores, abilityName));

  if (skill.expertise) {
    return abilityModifier + proficiencyBonus * 2;
  }
  if (skill.proficient) {
    return abilityModifier + proficiencyBonus;
  }
  return abilityModifier;
}

/**
 * 计算全部技能加值（返回 Map）
 *
 * @param scores - 属性值对象
 * @param skills - 全部技能条目
 * @param skillAbilityMap - 技能→属性映射
 * @param proficiencyBonus - 熟练加值
 * @returns 技能名 → 加值 的 Map
 */
export function getAllSkillBonuses(
  scores: AbilityScores,
  skills: Record<string, SkillEntry>,
  skillAbilityMap: Record<string, AbilityName>,
  proficiencyBonus: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [skillName, entry] of Object.entries(skills)) {
    const ability = skillAbilityMap[skillName];
    if (ability) {
      result[skillName] = getSkillBonus(scores, entry, ability, proficiencyBonus);
    }
  }
  return result;
}
