// engine/saving-throw.ts
// 豁免加值计算 — 纯函数
// 对应 HLD §6.1

import type { AbilityName, AbilityScores } from '../types/ability';
import { getModifier, getTotalScore } from './ability-modifier';

/**
 * 计算豁免加值
 *
 * 规则：
 * - 基础 = 属性调整值
 * - 熟练豁免 = 基础 + 熟练加值
 *
 * @param scores - 属性值对象
 * @param ability - 豁免对应的属性
 * @param proficientAbilities - 该职业熟练的豁免属性列表
 * @param proficiencyBonus - 熟练加值
 * @returns 豁免加值
 *
 * @example
 * // Fighter: Str 16(+3), Con 14(+2), proficient in Str & Con
 * getSavingThrowBonus(scores, 'Strength', ['Strength', 'Constitution'], 3)
 * // 6 (= 3 + 3)
 *
 * getSavingThrowBonus(scores, 'Dexterity', ['Strength', 'Constitution'], 3)
 * // 2 (= 2 + 0) — Dex不熟练
 */
export function getSavingThrowBonus(
  scores: AbilityScores,
  ability: AbilityName,
  proficientAbilities: readonly AbilityName[],
  proficiencyBonus: number
): number {
  const abilityModifier = getModifier(getTotalScore(scores, ability));
  const isProficient = proficientAbilities.includes(ability);
  return isProficient ? abilityModifier + proficiencyBonus : abilityModifier;
}
