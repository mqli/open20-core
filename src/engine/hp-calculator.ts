// engine/hp-calculator.ts
// HP计算 — 纯函数
// 对应 HLD §6.1 + PRD v4.0 §10 附录E
// ⚠️ 这是v1.0公式错误的修正版，必须100%准确

import type { DieType } from '../types/dice';
import type { CharacterClass } from '../types/character';
import type { DataLoader } from '../data/loader';

/**
 * 生命骰固定值对照表
 * d6 → 4, d8 → 5, d10 → 6, d12 → 7
 * 公式: floor(maxFace / 2) + 1（D&D 平均值向上取整）
 */
const HIT_DIE_FIXED: Record<DieType, number> = {
  d4: 3,
  d6: 4,
  d8: 5,
  d10: 6,
  d12: 7,
  d20: 11,
};

/**
 * 获取生命骰固定值（升级时HP增量的骰面部分）
 *
 * @param die - 骰子类型
 * @returns 固定值
 *
 * @example
 * getHitDieFixedValue('d10') // 6
 * getHitDieFixedValue('d6')  // 4
 */
export function getHitDieFixedValue(die: DieType): number {
  return HIT_DIE_FIXED[die] ?? 0;
}

/**
 * 生命骰最大值对照表
 */
const HIT_DIE_MAX: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

/**
 * 计算1级HP
 * 公式: 生命骰最大值 + Constitution调整值
 *
 * @param die - 职业生命骰类型
 * @param conModifier - Constitution调整值
 * @returns 1级HP
 *
 * @example
 * calculateHPAtLevel1('d10', 3)  // 13 = 10 + 3
 * calculateHPAtLevel1('d8', -1)  // 7  = 8 + (-1)
 * calculateHPAtLevel1('d6', 2)   // 8  = 6 + 2
 */
export function calculateHPAtLevel1(die: DieType, conModifier: number): number {
  return (HIT_DIE_MAX[die] ?? 0) + conModifier;
}

/**
 * 计算每次升级的HP增量（固定值模式）
 * 公式: ceil(dieFace / 2) + Constitution调整值
 *
 * @param die - 职业生命骰类型
 * @param conModifier - Constitution调整值
 * @returns HP增量（可能为负数如果Con极低）
 *
 * @example
 * calculateHPIncrement('d10', 3) // 9 = 6 + 3
 * calculateHPIncrement('d8', -1) // 4 = 5 + (-1)
 */
export function calculateHPIncrement(die: DieType, conModifier: number): number {
  return getHitDieFixedValue(die) + conModifier;
}

/**
 * 计算角色最大HP（完整计算，1级 + 所有升级增量）
 *
 * @param classes - 角色职业列表（支持多维职业）
 * @param conModifier - Constitution调整值
 * @param data - DataLoader
 * @returns 最大HP
 *
 * @example
 * // 5级Fighter, Con +3
 * calculateMaxHP([{ classId: 'Fighter', level: 5, ... }], 3, data)
 * // 1级: 10+3=13, 2-5级: 4*(6+3)=36 → total = 49
 */
export function calculateMaxHP(
  classes: readonly CharacterClass[],
  conModifier: number,
  data: DataLoader
): number {
  if (classes.length === 0) return 0;

  let maxHP = 0;

  // 多维职业规则: 只有第一个职业的1级取生命骰最大值
  // PHB 2024 p.43-44: 后续职业的 HP 增量也取固定值（或掷骰）
  for (let i = 0; i < classes.length; i++) {
    const charClass = classes[i]!;
    const classData = data.getClass(charClass.classId);
    if (!classData) continue;

    const die = classData.hitDie;
    const level = charClass.level;

    if (i === 0) {
      // 第一个职业: 1级取满 + Con，后续等级取固定值 + Con
      maxHP += calculateHPAtLevel1(die, conModifier);
      for (let lv = 2; lv <= level; lv++) {
        maxHP += calculateHPIncrement(die, conModifier);
      }
    } else {
      // 多维职业的额外职业: 所有等级都取固定值 + Con
      for (let lv = 1; lv <= level; lv++) {
        maxHP += calculateHPIncrement(die, conModifier);
      }
    }
  }

  // HP最小值为1
  return Math.max(1, maxHP);
}
