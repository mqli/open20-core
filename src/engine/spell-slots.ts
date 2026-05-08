// engine/spell-slots.ts
// 法术位计算 — 纯函数
// 对应 HLD §6.1 + PRD v4.0 §10 附录C

import type { CharacterClass } from '../types/character';
import type { DataLoader } from '../data/loader';

/**
 * 法术位条目
 */
export interface SpellSlotEntry {
  readonly total: number;
  readonly used: number;
}

/**
 * Pact Magic 条目（Warlock专用）
 */
export interface PactMagicResult {
  readonly slotLevel: number;
  readonly slots: number;
}

/**
 * 计算单职业法术位
 *
 * @param classId - 职业ID
 * @param classLevel - 职业等级
 * @param data - DataLoader
 * @returns 法术位 Map（level → { total, used }），从1级到9级
 *
 * @example
 * // 5级 Wizard
 * calculateSpellSlots('Wizard', 5, data)
 * // { 1: {total:4, used:0}, 2: {total:3, used:0}, 3: {total:2, used:0}, 4-9: {total:0, used:0} }
 */
export function calculateSpellSlots(
  classId: string,
  classLevel: number,
  data: DataLoader
): Record<number, SpellSlotEntry> {
  const slotsByLevel = data.getSpellSlots(classId, classLevel);
  const result: Record<number, SpellSlotEntry> = {};

  for (let level = 1; level <= 9; level++) {
    const total = slotsByLevel[level] ?? 0;
    result[level] = { total, used: 0 };
  }

  return result;
}

/**
 * 计算法术位（支持单职业或多维职业）
 *
 * @param classes - 职业列表（单个或多个）
 * @param data - DataLoader
 * @returns 法术位 Map
 *
 * @example
 * // 单职业: 5级 Wizard
 * calculateSpellSlotsFromClasses([{ classId: 'Wizard', level: 5 }], data)
 *
 * // 多维职业: Wizard 5 / Fighter 2
 * calculateSpellSlotsFromClasses([{ classId: 'Wizard', level: 5 }, { classId: 'Fighter', level: 2 }], data)
 */
export function calculateSpellSlotsFromClasses(
  classes: readonly CharacterClass[],
  data: DataLoader
): Record<number, SpellSlotEntry> {
  const totalLevel = getMulticlassSpellcasterLevel(classes, data);
  return calculateMulticlassSpellSlots(totalLevel, data);
}

/**
 * 计算Warlock Pact Magic
 *
 * Warlock的法术位特殊：短休恢复，且等级随Warlock等级提升
 *
 * @param warlockLevel - Warlock等级
 * @param data - DataLoader
 * @returns Pact Magic信息，或 null（如果不是Warlock）
 *
 * @example
 * calculatePactMagic(1, data)  // { slotLevel: 1, slots: 1 }
 * calculatePactMagic(5, data)  // { slotLevel: 2, slots: 2 }
 * calculatePactMagic(11, data) // { slotLevel: 5, slots: 3 } -- 简化
 */
export function calculatePactMagic(warlockLevel: number, data: DataLoader): PactMagicResult | null {
  if (warlockLevel < 1) return null;

  const pactData = data.getPactMagicSlots(warlockLevel);
  if (!pactData) return null;

  return {
    slotLevel: pactData.slotLevel,
    slots: pactData.slots,
  };
}

/**
 * 计算多维职业法术位等级
 *
 * 规则：
 * - 全施法者(Bard/Cleric/Druid/Sorcerer/Wizard): 等级全额计入
 * - 半施法者(Paladin/Ranger): 等级÷2（向下取整）计入
 * - Warlock: 不计入（Pact Magic独立计算）
 * - 非施法者(Fighter/Rogue/Barbarian等): 不计入（除非Eldritch Knight/Arcane Trickster）
 *
 * @param classes - 角色职业列表
 * @param data - DataLoader
 * @returns 总施法者等级
 *
 * @example
 * // Fighter 5 / Wizard 3
 * getMulticlassSpellcasterLevel(
 *   [{ classId: 'Fighter', level: 5 }, { classId: 'Wizard', level: 3 }],
 *   data
 * )
 * // 3 (只有Wizard计入)
 */
export function getMulticlassSpellcasterLevel(
  classes: readonly CharacterClass[],
  data: DataLoader
): number {
  let totalLevel = 0;

  // 半施法者的职业ID列表
  const HALF_CASTERS = ['Paladin', 'Ranger'];

  for (const charClass of classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData?.spellcasting) continue;

    // Warlock使用Pact Magic，不计入多维职业施法者等级
    if (charClass.classId === 'Warlock') continue;

    if (HALF_CASTERS.includes(charClass.classId)) {
      // 半施法者等级÷2（向下取整）
      totalLevel += Math.floor(charClass.level / 2);
    } else {
      // 全施法者等级全额计入
      totalLevel += charClass.level;
    }
  }

  return totalLevel;
}

/**
 * 计算多维职业法术位
 *
 * @param totalSpellcasterLevel - 总施法者等级（由 getMulticlassSpellcasterLevel 计算）
 * @param data - DataLoader
 * @returns 法术位 Map
 */
export function calculateMulticlassSpellSlots(
  totalSpellcasterLevel: number,
  data: DataLoader
): Record<number, SpellSlotEntry> {
  if (totalSpellcasterLevel < 1) {
    return emptySpellSlots();
  }

  const slotsByLevel = data.getMulticlassSpellSlots(totalSpellcasterLevel);
  const result: Record<number, SpellSlotEntry> = {};

  for (let level = 1; level <= 9; level++) {
    const total = slotsByLevel[level] ?? 0;
    result[level] = { total, used: 0 };
  }

  return result;
}

/**
 * 创建空法术位表
 */
function emptySpellSlots(): Record<number, SpellSlotEntry> {
  const result: Record<number, SpellSlotEntry> = {};
  for (let level = 1; level <= 9; level++) {
    result[level] = { total: 0, used: 0 };
  }
  return result;
}
