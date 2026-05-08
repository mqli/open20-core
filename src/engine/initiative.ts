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
 * - 某些专长可加值（如Alert +5）
 *
 * @param scores - 属性值对象
 * @param featIds - 拥有的专长ID列表
 * @param features - 拥有的特性列表
 * @returns 先攻加值
 *
 * @example
 * // Dex 14(+2), no special feats
 * calculateInitiative(scores, [], [])  // 2
 *
 * // Dex 14(+2), Alert feat (+5)
 * calculateInitiative(scores, ['Alert'], [])  // 7
 */
export function calculateInitiative(
  scores: AbilityScores,
  featIds: readonly string[],
  features: readonly Feature[]
): number {
  const dexMod = getModifier(getTotalScore(scores, 'Dexterity'));
  let initiative = dexMod;

  // Alert专长: +5 先攻
  if (featIds.includes('Alert')) {
    initiative += 5;
  }

  // 其他特性可在此扩展（如Friend feat等）

  return initiative;
}
