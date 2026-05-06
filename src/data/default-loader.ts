// data/default-loader.ts
// 默认 DataLoader 实现 — 从静态 JSON 数据加载
// 实现 HLD §5.3 + §7.3
//
// 修复：
// - require() → createRequire（ESM 兼容）
// - featuresByLevel 数组→ReadonlyMap 转换（JSON 无法直接存 Map）

import { createRequire } from 'node:module';
import type { DataLoader, LookupTables, SpellLevel } from './loader';
import type { Species, SpeciesSubtype } from '../types/species';
import type { Background } from '../types/background';
import type { Class, Subclass, Feature } from '../types/class';
import type { AbilityName } from '../types/ability';
import type { Feat, FeatCategory } from '../types/feat';
import type { Weapon, Armor, GearItem } from '../types/equipment';
import type { Spell } from '../types/spell';
import type { DieType } from '../types/character';

// ── ESM 兼容的 JSON 加载 ────────────────────────────────────
const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawSpecies: unknown[] = require('../../static/species.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawBackgrounds: unknown[] = require('../../static/backgrounds.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawClasses: unknown[] = require('../../static/classes.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawSubclasses: unknown[] = require('../../static/subclasses.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawFeats: unknown[] = require('../../static/feats.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawWeapons: unknown[] = require('../../static/weapons.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawArmor: unknown[] = require('../../static/armor.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawGear: unknown[] = require('../../static/gear.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawSpells: unknown[] = require('../../static/spells.json');

// ── JSON → 类型转换工具 ──────────────────────────────────────

/** 将 JSON 中的 featuresByLevel 数组转为 ReadonlyMap<number, Feature[]> */
function parseFeaturesByLevel(
  raw: Array<{ level: number; features: readonly Feature[] }>,
): ReadonlyMap<number, readonly Feature[]> {
  const map = new Map<number, readonly Feature[]>();
  for (const entry of raw) {
    map.set(entry.level, entry.features);
  }
  return map;
}

/** 将原始 JSON 对象转为 Class 类型（含 featuresByLevel 转换） */
function parseClass(raw: unknown): Class {
  const c = raw as Record<string, unknown>;
  return {
    id: c.id as string,
    source: c.source as '2024 PHB' | '2014 PHB',
    hitDie: c.hitDie as DieType,
    savingThrowProficiencies: c.savingThrowProficiencies as readonly AbilityName[],
    armorTraining: c.armorTraining as readonly string[],
    weaponMastery: c.weaponMastery as boolean,
    featuresByLevel: parseFeaturesByLevel(
      c.featuresByLevel as Array<{ level: number; features: readonly Feature[] }>,
    ),
    spellcasting: c.spellcasting as Class['spellcasting'],
  };
}

/** 将原始 JSON 对象转为 Subclass 类型（含 featuresByLevel 转换） */
function parseSubclass(raw: unknown): Subclass {
  const s = raw as Record<string, unknown>;
  return {
    id: s.id as string,
    parentClass: s.parentClass as string,
    grantedAtLevel: s.grantedAtLevel as number,
    featuresByLevel: parseFeaturesByLevel(
      s.featuresByLevel as Array<{ level: number; features: readonly Feature[] }>,
    ),
  };
}

// ── 解析后的数据 ─────────────────────────────────────────────
const speciesData: Species[] = rawSpecies as Species[];
const backgroundsData: Background[] = rawBackgrounds as Background[];
const classesData: Class[] = rawClasses.map(parseClass);
const subclassesData: Subclass[] = rawSubclasses.map(parseSubclass);
const featsData: Feat[] = rawFeats as Feat[];
const weaponsData: Weapon[] = rawWeapons as Weapon[];
const armorData: Armor[] = rawArmor as Armor[];
const gearData: GearItem[] = rawGear as GearItem[];
const spellsData: Spell[] = rawSpells as Spell[];

// ── createDataLoader 工厂函数 ────────────────────────────────

export function createDataLoader(tables: LookupTables): DataLoader {
  return {
    // ── 物种（Species）───
    getSpecies(id: string): Species | undefined {
      return speciesData.find((s) => s.id === id);
    },

    getSpeciesSubtype(speciesId: string, subtypeId: string): SpeciesSubtype | undefined {
      const species = speciesData.find((s) => s.id === speciesId);
      if (!species?.subtypes) return undefined;
      return species.subtypes.find((st: SpeciesSubtype) => st.id === subtypeId);
    },

    getAllSpecies(): Species[] {
      return speciesData;
    },

    // ── 背景（Background）───
    getBackground(id: string): Background | undefined {
      return backgroundsData.find((b) => b.id === id);
    },

    getAllBackgrounds(): Background[] {
      return backgroundsData;
    },

    // ── 职业（Class）/ 子职业（Subclass）───
    getClass(id: string): Class | undefined {
      return classesData.find((c) => c.id === id);
    },

    getAllClasses(): Class[] {
      return classesData;
    },

    getSubclass(id: string): Subclass | undefined {
      return subclassesData.find((s) => s.id === id);
    },

    getSubclassesForClass(classId: string): Subclass[] {
      return subclassesData.filter((s) => s.parentClass === classId);
    },

    getAllSubclasses(): Subclass[] {
      return subclassesData;
    },

    // ── 专长（Feat）───
    getFeat(id: string): Feat | undefined {
      return featsData.find((f) => f.id === id);
    },

    getFeatsByCategory(category: FeatCategory): Feat[] {
      return featsData.filter((f) => f.category === category);
    },

    getAllFeats(): Feat[] {
      return featsData;
    },

    // ── 装备 / 武器 / 护甲 ──────────────────────────────
    getWeapon(id: string): Weapon | undefined {
      return weaponsData.find((w) => w.id === id);
    },

    getAllWeapons(): Weapon[] {
      return weaponsData;
    },

    getArmor(id: string): Armor | undefined {
      return armorData.find((a) => a.id === id);
    },

    getAllArmor(): Armor[] {
      return armorData;
    },

    getGearItem(id: string): GearItem | undefined {
      return gearData.find((g) => g.id === id);
    },

    getAllGear(): GearItem[] {
      return gearData;
    },

    // ── 法术（Spell）───
    getSpell(id: string): Spell | undefined {
      return spellsData.find((s) => s.id === id);
    },

    getSpellsByLevel(level: SpellLevel): Spell[] {
      return spellsData.filter((s) => s.level === level);
    },

    getAllSpells(): Spell[] {
      return spellsData;
    },

    // ── 查表数据（Lookup Tables）────────────────────
    getProficiencyBonus(level: number): number {
      const keys = Object.keys(tables.proficiencyBonus)
        .map(Number)
        .sort((a, b) => a - b);

      let result = tables.proficiencyBonus[keys[0] ?? 1] ?? 2;
      for (const key of keys) {
        if (level >= key) {
          result = tables.proficiencyBonus[key] ?? 2;
        } else {
          break;
        }
      }
      return result;
    },

    getHitDieFixedValue(die: DieType): number {
      return tables.hitDieFixedValue[die] ?? 0;
    },

    getSpellSlots(classId: string, classLevel: number): Record<number, number> {
      const classSlots = tables.spellSlots[classId];
      if (!classSlots) return emptySlotRecord();

      const slotsArray = classSlots[classLevel];
      if (!slotsArray) return emptySlotRecord();

      // slotsArray 是数组，index 0 = 1级法术位，index 1 = 2级法术位...
      const result: Record<number, number> = {};
      for (let i = 0; i < slotsArray.length; i++) {
        result[i + 1] = slotsArray[i] ?? 0;  // 修正：index 0 → 法术位等级 1
      }
      return result;
    },

    getMulticlassSpellSlots(totalSpellcastingLevel: number): Record<number, number> {
      const slotsArray = tables.multiclassSpellSlots[totalSpellcastingLevel];
      if (!slotsArray) return emptySlotRecord();

      const result: Record<number, number> = {};
      for (let i = 0; i < slotsArray.length; i++) {
        result[i + 1] = slotsArray[i] ?? 0;
      }
      return result;
    },

    getPactMagicSlots(warlockLevel: number): { slots: number; slotLevel: number } {
      return tables.pactMagicSlots[warlockLevel] ?? { slots: 0, slotLevel: 0 };
    },

    getWeaponMasteryProperties(): readonly string[] {
      return tables.weaponMasteryProperties;
    },

    getConditionNames(): readonly string[] {
      return tables.conditionNames;
    },
  };
}

function emptySlotRecord(): Record<number, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
}
