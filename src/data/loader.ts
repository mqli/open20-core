// data/loader.ts
// DataLoader 接口 — 所有规则数据的抽象访问层
// 实现 HLD §5.3 + §7.3
// 纯接口，零实现依赖。测试时可注入 mock，运行时可替换为 JSON/API/内存实现

import type {
  Species,
  SpeciesSubtype,
} from '../types/species';
import type { Background } from '../types/background';
import type { Class, Subclass, MulticlassSpellSlotEntry } from '../types/class';
import type { Feat, FeatCategory } from '../types/feat';
import type { EquipmentItem, Weapon, Armor, GearItem } from '../types/equipment';
import type { Spell } from '../types/spell';
import type { DieType } from '../types/character';
import type { ResetType } from '../types/resource';

// ── DataLoader 接口 ───────────────────────────────────────────────
// 所有读取规则数据的函数集中在此接口
// 原因是：engine 层只需依赖此接口，不依赖具体数据源
// 测试时传入 mock，运行时传入 JsonLoader 或 ApiLoader

export interface DataLoader {
  // ── 物种（Species）───
  getSpecies(id: string): Species | undefined;
  getSpeciesSubtype(speciesId: string, subtypeId: string): SpeciesSubtype | undefined;
  getAllSpecies(): Species[];

  // ── 背景（Background）───
  getBackground(id: string): Background | undefined;
  getAllBackgrounds(): Background[];

  // ── 职业（Class）/ 子职业（Subclass）───
  getClass(id: string): Class | undefined;
  getAllClasses(): Class[];
  getSubclass(id: string): Subclass | undefined;
  getSubclassesForClass(classId: string): Subclass[];
  getAllSubclasses(): Subclass[];

  // ── 专长（Feat）───
  getFeat(id: string): Feat | undefined;
  getFeatsByCategory(category: FeatCategory): Feat[];
  getAllFeats(): Feat[];

  // ── 装备 / 武器 / 护甲 ──────────────────────────────
  getWeapon(id: string): Weapon | undefined;
  getAllWeapons(): Weapon[];
  getArmor(id: string): Armor | undefined;
  getAllArmor(): Armor[];
  getGearItem(id: string): GearItem | undefined;
  getAllGear(): GearItem[];

  // ── 法术（Spell）───
  getSpell(id: string): Spell | undefined;
  getSpellsByLevel(level: SpellLevel): Spell[];
  getAllSpells(): Spell[];

  // ── 查表数据（Lookup Tables）────────────────────
  // 熟练加值表：level → proficiency bonus
  getProficiencyBonus(level: number): number;

  // 生命骰固定值：dieType → fixed value (d6→4, d8→5, d10→6, d12→7)
  getHitDieFixedValue(die: DieType): number;

  // 法术位表：classId + classLevel → slots[level] (1-9)
  getSpellSlots(classId: string, classLevel: number): Record<number, number>;

  // 多维职业法术位表：totalSpellcastingLevel → slots[level] (1-9)
  getMulticlassSpellSlots(totalSpellcastingLevel: number): Record<number, number>;

  // Warlock Pact Magic 表：warlockLevel → { slots, slotLevel }
  getPactMagicSlots(warlockLevel: number): { slots: number; slotLevel: number };

  // 武器精通属性列表（8个）
  getWeaponMasteryProperties(): readonly string[];

  // 标准状态列表（14个）
  getConditionNames(): readonly string[];
}

// ── 查表数据辅助类型 ──────────────────────────────────────────

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface LookupTables {
  proficiencyBonus: Record<number, number>;        // level → bonus
  hitDieFixedValue: Record<DieType, number>;   // d6→4, etc.
  spellSlots: Record<string, Record<number, readonly number[]>>;
  // classId → classLevel → [1st, 2nd, 3rd, ...] (index 0 = level 1 slots)
  multiclassSpellSlots: Record<number, readonly number[]>;
  // totalSpellcastingLevel → [1st, 2nd, 3rd, ...]
  pactMagicSlots: Record<number, { slots: number; slotLevel: number }>;
  weaponMasteryProperties: readonly string[];
  conditionNames: readonly string[];
}

// ── createDataLoader — 默认工厂函数 ───────────────────────
// 接收静态 JSON 数据，返回 DataLoader 实例
// 这是唯一会在运行时被调用的地方（除非测试注入 mock）

import { createDataLoader as createDefaultLoader } from './default-loader';

export function createDataLoader(tables: LookupTables): DataLoader {
  return createDefaultLoader(tables);
}
