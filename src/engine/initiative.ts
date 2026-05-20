// engine/initiative.ts
// 先攻值计算 — 纯函数
// 对应 HLD §6.1

import type { AbilityScores } from '../types/ability';
import type { Feature } from '../types/class';
import { getModifier, getTotalScore } from './ability-modifier';

/**
 * 计算先攻值(Initiative)
 *
 * 规则：
 * - 基础 = Dex调整值
 * - 某些特性可加值（如Jack of All Trades不适用initiative——2024规则下）
 * - Alert专长：可以将熟练加值加到先攻骰上（Initiative Proficiency）
 *
 * @param scores - 属性值对象
 * @param featIds - 拥有的专长ID列表
 * @param features - 拥有的特性列表
 * @param proficiencyBonus - 熟练加值（用于Alert专长）
 * @returns 先攻加值
 *
 * @example
 * // Dex 14(+2), no special feats, PB=2
 * calculateInitiative(scores, [], [], 2)  // 2
 *
 * // Dex 14(+2), Alert feat, PB=2
 * calculateInitiative(scores, ['Alert'], [], 2)  // 4 (Dex + PB)
 */
export function calculateInitiative(
  scores: AbilityScores,
  featIds: readonly string[],
  _features: readonly Feature[],
  proficiencyBonus: number = 0
): number {
  const dexMod = getModifier(getTotalScore(scores, 'Dexterity'));
  let initiative = dexMod;

  // Alert专长: 可以将熟练加值加到先攻骰上
  // 2024 PHB: "When you roll Initiative, you can add your Proficiency Bonus to the roll."
  // 注意：是"可以"加，不是"必须"加。这里实现为自动加（大多数玩家会选择加）
  if (featIds.includes('Alert')) {
    initiative += proficiencyBonus;
  }

  // 其他特性可在此扩展（如Friend feat等）

  return initiative;
}
