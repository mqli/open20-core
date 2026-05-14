// engine/ability-modifier.ts
// 属性调整值计算 — 纯函数，零副作用
// 对应 HLD §6.1 + PRD v4.0 §4.2

import type { AbilityName, AbilityScores } from '../types/ability';

/**
 * 计算属性调整值（modifier）
 * 公式: Math.floor((score - 10) / 2)
 *
 * @param score - 属性总值（如 18）
 * @returns 调整值（如 +4）
 *
 * @example
 * getModifier(10) // 0
 * getModifier(18) // 4
 * getModifier(8)  // -1
 * getModifier(1)  // -5
 */
export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * 计算属性总值（base + racial + background + feat + featGrants + temporary）
 * 所有加值来源求和
 *
 * @param scores - 属性值对象
 * @param ability - 属性名
 * @returns 该属性的总值
 *
 * @example
 * getTotalScore({ base: { Strength: 15 }, racialBonuses: { Strength: 2 }, backgroundBonuses: {}, featBonuses: {}, featGrants: {}, temporaryBonuses: {} }, 'Strength')
 * // 17
 */
export function getTotalScore(scores: AbilityScores, ability: AbilityName): number {
  const base = scores.base?.[ability] ?? 10;
  const racial = scores.racialBonuses?.[ability] ?? 0;
  const background = scores.backgroundBonuses?.[ability] ?? 0;
  const feat = scores.featBonuses?.[ability] ?? 0;
  const featGrants = scores.featGrants?.[ability] ?? 0;
  const temp = scores.temporaryBonuses?.[ability] ?? 0;
  return base + racial + background + feat + featGrants + temp;
}
