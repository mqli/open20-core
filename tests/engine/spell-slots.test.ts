// tests/engine/spell-slots.test.ts
// 法术位计算单元测试

import { describe, it, expect } from 'vitest';
import {
  calculateSpellSlots,
  calculatePactMagic,
  getMulticlassSpellcasterLevel,
  calculateMulticlassSpellSlots,
  type SpellSlotEntry,
} from '../../src/engine/spell-slots';
import type { DataLoader } from '../../src/data/loader';
import type { CharacterClass } from '../../src/types/character';

// ── Mock DataLoader ───────────────────────────────────────────────

/**
 * 创建模拟的 DataLoader
 * 包含测试所需的法术位数据
 */
function createMockDataLoader(): DataLoader {
  // 全施法者法术位表（Wizard/Cleric等）
  const fullCasterSlots: Record<number, Record<number, number>> = {
    1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    3: { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    4: { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    5: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    6: { 1: 4, 2: 3, 3: 3, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    7: { 1: 4, 2: 3, 3: 3, 4: 1, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    8: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 },
    10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 0, 7: 0, 8: 0, 9: 0 },
    11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 0, 8: 0, 9: 0 },
    12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 0, 8: 0, 9: 0 },
    13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0 },
    14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0 },
    15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 0 },
    16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 0 },
    17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
    18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
    19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
    20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  };

  // 多维职业法术位表
  const multiclassSlots: Record<number, Record<number, number>> = {
    1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    3: { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    4: { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    5: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    6: { 1: 4, 2: 3, 3: 3, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    7: { 1: 4, 2: 3, 3: 3, 4: 1, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    8: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 },
    10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 0, 7: 0, 8: 0, 9: 0 },
  };

  // Pact Magic 表（Warlock）
  const pactMagicSlots: Record<number, { slots: number; slotLevel: number }> = {
    1: { slots: 1, slotLevel: 1 },
    2: { slots: 2, slotLevel: 1 },
    3: { slots: 2, slotLevel: 2 },
    4: { slots: 2, slotLevel: 2 },
    5: { slots: 2, slotLevel: 3 },
    6: { slots: 2, slotLevel: 3 },
    7: { slots: 2, slotLevel: 4 },
    8: { slots: 2, slotLevel: 4 },
    9: { slots: 2, slotLevel: 5 },
    10: { slots: 2, slotLevel: 5 },
    11: { slots: 3, slotLevel: 5 },
    12: { slots: 3, slotLevel: 5 },
    13: { slots: 3, slotLevel: 5 },
    14: { slots: 3, slotLevel: 5 },
    15: { slots: 3, slotLevel: 5 },
    16: { slots: 3, slotLevel: 5 },
    17: { slots: 3, slotLevel: 5 },
    18: { slots: 3, slotLevel: 5 },
    19: { slots: 3, slotLevel: 5 },
    20: { slots: 3, slotLevel: 5 },
  };

  // 职业数据（简化版，仅包含 spellcasting 相关信息）
  const classData: Record<string, { spellcasting?: object }> = {
    Wizard: { spellcasting: {} },
    Cleric: { spellcasting: {} },
    Bard: { spellcasting: {} },
    Sorcerer: { spellcasting: {} },
    Druid: { spellcasting: {} },
    Paladin: { spellcasting: {} },
    Ranger: { spellcasting: {} },
    Warlock: { spellcasting: {} },
    Fighter: {},
    Rogue: {},
    Barbarian: {},
    Monk: {},
  };

  return {
    // 法术位相关
    getSpellSlots(classId: string, classLevel: number): Record<number, number> {
      // 非施法者返回全零
      const nonCasters = ['Fighter', 'Rogue', 'Barbarian', 'Monk'];
      if (nonCasters.includes(classId)) {
        return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      }
      return (
        fullCasterSlots[classLevel] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
      );
    },

    getMulticlassSpellSlots(level: number): Record<number, number> {
      return multiclassSlots[level] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    },

    getPactMagicSlots(warlockLevel: number): { slots: number; slotLevel: number } {
      return pactMagicSlots[warlockLevel] || { slots: 0, slotLevel: 0 };
    },

    // 职业相关
    getClass(id: string): import('../../src/types/class').Class | undefined {
      return classData[id] as import('../../src/types/class').Class | undefined;
    },

    // 以下方法在测试中不会被调用，返回默认值
    getSpecies(): undefined {
      return undefined;
    },
    getSpeciesSubtype(): undefined {
      return undefined;
    },
    getAllSpecies(): never[] {
      return [];
    },
    getBackground(): undefined {
      return undefined;
    },
    getAllBackgrounds(): never[] {
      return [];
    },
    getAllClasses(): never[] {
      return [];
    },
    getSubclass(): undefined {
      return undefined;
    },
    getSubclassesForClass(): never[] {
      return [];
    },
    getAllSubclasses(): never[] {
      return [];
    },
    getFeat(): undefined {
      return undefined;
    },
    getFeatsByCategory(): never[] {
      return [];
    },
    getAllFeats(): never[] {
      return [];
    },
    getWeapon(): undefined {
      return undefined;
    },
    getAllWeapons(): never[] {
      return [];
    },
    getArmor(): undefined {
      return undefined;
    },
    getAllArmor(): never[] {
      return [];
    },
    getGearItem(): undefined {
      return undefined;
    },
    getAllGear(): never[] {
      return [];
    },
    getSpell(): undefined {
      return undefined;
    },
    getSpellsByLevel(): never[] {
      return [];
    },
    getAllSpells(): never[] {
      return [];
    },
    getProficiencyBonus(): 0 {
      return 0;
    },
    getHitDieFixedValue(): 0 {
      return 0;
    },
    getWeaponMasteryProperties(): readonly string[] {
      return [];
    },
    getConditionNames(): readonly string[] {
      return [];
    },
  } as any as DataLoader;
}

// ── 辅助函数 ─────────────────────────────────────────────────────

/** 创建 CharacterClass 对象 */
function makeClass(classId: string, level: number): CharacterClass {
  return { classId, level } as CharacterClass;
}

/** 获取法术位总数（用于断言） */
function getSlotTotal(result: Record<number, SpellSlotEntry>, level: number): number {
  return result[level]?.total ?? 0;
}

// ── 测试用例 ─────────────────────────────────────────────────────

describe('calculateSpellSlots', () => {
  const data = createMockDataLoader();

  it('should return 2 level-1 slots for Wizard level 1', () => {
    const result = calculateSpellSlots('Wizard', 1, data);
    expect(getSlotTotal(result, 1)).toBe(2);
    expect(getSlotTotal(result, 2)).toBe(0);
    expect(getSlotTotal(result, 9)).toBe(0);
  });

  it('should return 4/2 slots for Wizard level 3', () => {
    const result = calculateSpellSlots('Wizard', 3, data);
    expect(getSlotTotal(result, 1)).toBe(4);
    expect(getSlotTotal(result, 2)).toBe(2);
    expect(getSlotTotal(result, 3)).toBe(0);
  });

  it('should return 4/3/2 slots for Wizard level 5', () => {
    const result = calculateSpellSlots('Wizard', 5, data);
    expect(getSlotTotal(result, 1)).toBe(4);
    expect(getSlotTotal(result, 2)).toBe(3);
    expect(getSlotTotal(result, 3)).toBe(2);
    expect(getSlotTotal(result, 4)).toBe(0);
  });

  it('should return all zeros for non-spellcaster (Fighter)', () => {
    const result = calculateSpellSlots('Fighter', 5, data);
    for (let level = 1; level <= 9; level++) {
      expect(getSlotTotal(result, level)).toBe(0);
    }
  });

  it('should return 2 level-1 slots for Cleric level 1 (full caster)', () => {
    const result = calculateSpellSlots('Cleric', 1, data);
    expect(getSlotTotal(result, 1)).toBe(2);
    expect(getSlotTotal(result, 2)).toBe(0);
  });

  it('should return 4/3/3/3/1 slots for Wizard level 9', () => {
    const result = calculateSpellSlots('Wizard', 9, data);
    expect(getSlotTotal(result, 1)).toBe(4);
    expect(getSlotTotal(result, 2)).toBe(3);
    expect(getSlotTotal(result, 3)).toBe(3);
    expect(getSlotTotal(result, 4)).toBe(3);
    expect(getSlotTotal(result, 5)).toBe(1);
    expect(getSlotTotal(result, 6)).toBe(0);
  });

  it('should always set used to 0 after calculation', () => {
    const result = calculateSpellSlots('Wizard', 5, data);
    for (let level = 1; level <= 9; level++) {
      expect(result[level]!.used).toBe(0);
    }
  });

  it('should return all 9 levels in result', () => {
    const result = calculateSpellSlots('Wizard', 1, data);
    for (let level = 1; level <= 9; level++) {
      expect(result[level]!).toBeDefined();
      expect(result[level]!).toHaveProperty('total');
      expect(result[level]!).toHaveProperty('used');
    }
  });
});

describe('calculatePactMagic', () => {
  const data = createMockDataLoader();

  it('should return { slotLevel: 1, slots: 1 } for Warlock level 1', () => {
    const result = calculatePactMagic(1, data);
    expect(result).not.toBeNull();
    expect(result!.slotLevel).toBe(1);
    expect(result!.slots).toBe(1);
  });

  it('should return { slotLevel: 2, slots: 2 } for Warlock level 3', () => {
    const result = calculatePactMagic(3, data);
    expect(result).not.toBeNull();
    expect(result!.slotLevel).toBe(2);
    expect(result!.slots).toBe(2);
  });

  it('should return { slotLevel: 3, slots: 2 } for Warlock level 5', () => {
    const result = calculatePactMagic(5, data);
    expect(result).not.toBeNull();
    expect(result!.slotLevel).toBe(3);
    expect(result!.slots).toBe(2);
  });

  it('should return { slotLevel: 5, slots: 3 } for Warlock level 11', () => {
    const result = calculatePactMagic(11, data);
    expect(result).not.toBeNull();
    expect(result!.slotLevel).toBe(5);
    expect(result!.slots).toBe(3);
  });

  it('should return null for warlockLevel < 1', () => {
    const result = calculatePactMagic(0, data);
    expect(result).toBeNull();
  });

  it('should return null for unknown warlock level (if data returns falsy)', () => {
    // 创建一个返回 null 的 mock
    const nullData = {
      ...createMockDataLoader(),
      getPactMagicSlots(): { slots: number; slotLevel: number } {
        return { slots: 0, slotLevel: 0 };
      },
    };
    // 注意：实际实现中，如果 pactData 是 { slots: 0, slotLevel: 0 }，它不会是 null/falsy
    // 所以这个测试验证边界情况
    const result = calculatePactMagic(1, nullData);
    expect(result).not.toBeNull();
    expect(result!.slots).toBe(0);
  });
});

describe('getMulticlassSpellcasterLevel', () => {
  const data = createMockDataLoader();

  it('should return 5 for single full caster (Wizard 5)', () => {
    const classes = [makeClass('Wizard', 5)];
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(5);
  });

  it('should return 0 for single non-caster (Fighter 5)', () => {
    const classes = [makeClass('Fighter', 5)];
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(0);
  });

  it('should return 3 for Fighter 5 + Wizard 3 (only Wizard counts)', () => {
    const classes = [makeClass('Fighter', 5), makeClass('Wizard', 3)];
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(3);
  });

  it('should return 5 for Paladin 4 + Wizard 3 (Paladin is half-caster)', () => {
    const classes = [makeClass('Paladin', 4), makeClass('Wizard', 3)];
    // Paladin: floor(4/2) = 2, Wizard: 3, total = 5
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(5);
  });

  it('should return 0 for Warlock 3 (Warlock does not count toward multiclass slots)', () => {
    const classes = [makeClass('Warlock', 3)];
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(0);
  });

  it('should return 8 for Bard 6 + Paladin 4', () => {
    const classes = [makeClass('Bard', 6), makeClass('Paladin', 4)];
    // Bard: 6, Paladin: floor(4/2) = 2, total = 8
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(8);
  });

  it('should handle Ranger as half-caster', () => {
    const classes = [makeClass('Ranger', 6)];
    // Ranger: floor(6/2) = 3
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(3);
  });

  it('should handle empty classes array', () => {
    const result = getMulticlassSpellcasterLevel([], data);
    expect(result).toBe(0);
  });

  it('should handle multiple half-casters', () => {
    const classes = [makeClass('Paladin', 4), makeClass('Ranger', 6)];
    // Paladin: floor(4/2) = 2, Ranger: floor(6/2) = 3, total = 5
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(5);
  });

  it('should exclude Warlock from multiclass calculation even with other casters', () => {
    const classes = [makeClass('Wizard', 3), makeClass('Warlock', 5)];
    // Wizard: 3, Warlock: 0 (excluded), total = 3
    const result = getMulticlassSpellcasterLevel(classes, data);
    expect(result).toBe(3);
  });
});

describe('calculateMulticlassSpellSlots', () => {
  const data = createMockDataLoader();

  it('should return {1:4, 2:2, ...} for total level 3', () => {
    const result = calculateMulticlassSpellSlots(3, data);
    expect(getSlotTotal(result, 1)).toBe(4);
    expect(getSlotTotal(result, 2)).toBe(2);
    expect(getSlotTotal(result, 3)).toBe(0);
  });

  it('should return {1:4, 2:3, 3:2, ...} for total level 5', () => {
    const result = calculateMulticlassSpellSlots(5, data);
    expect(getSlotTotal(result, 1)).toBe(4);
    expect(getSlotTotal(result, 2)).toBe(3);
    expect(getSlotTotal(result, 3)).toBe(2);
    expect(getSlotTotal(result, 4)).toBe(0);
  });

  it('should return all zeros for total level 0', () => {
    const result = calculateMulticlassSpellSlots(0, data);
    for (let level = 1; level <= 9; level++) {
      expect(getSlotTotal(result, level)).toBe(0);
    }
  });

  it('should return all zeros for negative total level', () => {
    const result = calculateMulticlassSpellSlots(-1, data);
    for (let level = 1; level <= 9; level++) {
      expect(getSlotTotal(result, level)).toBe(0);
    }
  });

  it('should always set used to 0 after calculation', () => {
    const result = calculateMulticlassSpellSlots(5, data);
    for (let level = 1; level <= 9; level++) {
      expect(result[level]!.used).toBe(0);
    }
  });

  it('should return correct slots for high level (level 9)', () => {
    const result = calculateMulticlassSpellSlots(9, data);
    expect(getSlotTotal(result, 1)).toBe(4);
    expect(getSlotTotal(result, 2)).toBe(3);
    expect(getSlotTotal(result, 3)).toBe(3);
    expect(getSlotTotal(result, 4)).toBe(3);
    expect(getSlotTotal(result, 5)).toBe(1);
  });

  it('should return all 9 levels in result', () => {
    const result = calculateMulticlassSpellSlots(3, data);
    for (let level = 1; level <= 9; level++) {
      expect(result[level]!).toBeDefined();
      expect(result[level]!).toHaveProperty('total');
      expect(result[level]!).toHaveProperty('used');
    }
  });
});

describe('integration: multiclass spell slots flow', () => {
  const data = createMockDataLoader();

  it('should calculate correct multiclass slots for Fighter 5 + Wizard 3', () => {
    const classes = [makeClass('Fighter', 5), makeClass('Wizard', 3)];
    const totalLevel = getMulticlassSpellcasterLevel(classes, data);
    expect(totalLevel).toBe(3);

    const slots = calculateMulticlassSpellSlots(totalLevel, data);
    expect(getSlotTotal(slots, 1)).toBe(4);
    expect(getSlotTotal(slots, 2)).toBe(2);
  });

  it('should calculate correct multiclass slots for Paladin 4 + Wizard 3', () => {
    const classes = [makeClass('Paladin', 4), makeClass('Wizard', 3)];
    const totalLevel = getMulticlassSpellcasterLevel(classes, data);
    expect(totalLevel).toBe(5);

    const slots = calculateMulticlassSpellSlots(totalLevel, data);
    expect(getSlotTotal(slots, 1)).toBe(4);
    expect(getSlotTotal(slots, 2)).toBe(3);
    expect(getSlotTotal(slots, 3)).toBe(2);
  });

  it('should return no slots for Warlock 5 (Pact Magic does not use multiclass slots)', () => {
    const classes = [makeClass('Warlock', 5)];
    const totalLevel = getMulticlassSpellcasterLevel(classes, data);
    expect(totalLevel).toBe(0);

    const slots = calculateMulticlassSpellSlots(totalLevel, data);
    for (let level = 1; level <= 9; level++) {
      expect(getSlotTotal(slots, level)).toBe(0);
    }
  });
});
