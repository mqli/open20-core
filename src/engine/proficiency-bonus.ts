// engine/proficiency-bonus.ts
// 熟练加值计算 — 纯函数
// 对应 HLD §6.1 + PRD v4.0 §4.2

/**
 * 根据总等级查表计算熟练加值
 *
 * | 等级范围 | 熟练加值 |
 * |----------|----------|
 * | 1-4      | +2       |
 * | 5-8      | +3       |
 * | 9-12     | +4       |
 * | 13-16    | +5       |
 * | 17-20    | +6       |
 *
 * @param level - 角色总等级（1-20）
 * @returns 熟练加值
 *
 * @example
 * getProficiencyBonus(1)   // 2
 * getProficiencyBonus(4)   // 2
 * getProficiencyBonus(5)   // 3
 * getProficiencyBonus(20)  // 6
 */
export function getProficiencyBonus(level: number): number {
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}
