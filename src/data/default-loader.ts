// data/default-loader.ts
// 默认 DataLoader 实现 — 从静态 JSON 数据加载
// 实现 HLD §5.3 + §7.3 + R26 内容包管理
//
// 修复：
// - require() → createRequire（ESM 兼容）
// - featuresByLevel 数组→ReadonlyMap 转换（JSON 无法直接存 Map）
// - R26: 支持内容包注册/注销

import { createRequire } from 'node:module';
import type { DataLoader, LookupTables, SpellLevel } from './loader';
import type { ContentPack, ContentPackMeta } from '../content/types';
import type { Species, SpeciesSubtype } from '../types/species';
import type { Background } from '../types/background';
import type { Class, Subclass, Feature } from '../types/class';
import type { AbilityName } from '../types/ability';
import type { Feat, FeatCategory } from '../types/feat';
import type { Weapon, Armor, GearItem } from '../types/equipment';
import type { Spell } from '../types/spell';
import type { DieType } from '../types/dice';
import { loadContentPack } from '../content/io';

// ── ESM 兼容的 JSON 加载 ────────────────────────────────────
const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawSpecies: unknown[] = require('../../static/srd/species.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawBackgrounds: unknown[] = require('../../static/srd/backgrounds.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawClasses: unknown[] = require('../../static/srd/classes.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawSubclasses: unknown[] = require('../../static/srd/subclasses.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawFeats: unknown[] = require('../../static/srd/feats.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawWeapons: unknown[] = require('../../static/srd/weapons.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawArmor: unknown[] = require('../../static/srd/armor.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawGear: unknown[] = require('../../static/srd/gear.json');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const rawSpells: unknown[] = require('../../static/srd/spells.json');

// ── JSON → 类型转换工具 ──────────────────────────────────────

/** 将 JSON 中的 featuresByLevel 数组转为 ReadonlyMap<number, Feature[]> */
function parseFeaturesByLevel(
  raw: Array<{ level: number; features: readonly Feature[] }>
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
    name: (c.name as string) ?? (c.id as string),
    source: c.source as Class['source'],
    hitDie: c.hitDie as DieType,
    savingThrowProficiencies: c.savingThrowProficiencies as readonly AbilityName[],
    armorTraining: c.armorTraining as readonly string[],
    weaponMastery: c.weaponMastery as boolean,
    featuresByLevel: parseFeaturesByLevel(
      c.featuresByLevel as Array<{ level: number; features: readonly Feature[] }>
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
      s.featuresByLevel as Array<{ level: number; features: readonly Feature[] }>
    ),
  };
}

// ── 可变的数据存储（支持内容包注册）─────────────────────

// 使用 let 而不是 const，以便支持 register/unregister
let speciesData: Species[] = rawSpecies as Species[];
let backgroundsData: Background[] = rawBackgrounds as Background[];
let classesData: Class[] = rawClasses.map(parseClass);
let subclassesData: Subclass[] = rawSubclasses.map(parseSubclass);
let featsData: Feat[] = rawFeats as Feat[];
let weaponsData: Weapon[] = rawWeapons as Weapon[];
let armorData: Armor[] = rawArmor as Armor[];
let gearData: GearItem[] = rawGear as GearItem[];
let spellsData: Spell[] = rawSpells as Spell[];

// 已注册的内容包元数据
const registeredPacks: Map<string, ContentPackMeta> = new Map();

// 注册 SRD 内容包
try {
  const srdMeta = require('../../static/srd/meta.json') as ContentPackMeta;
  registeredPacks.set(srdMeta.id, srdMeta);
} catch {
  // meta.json 可能不存在，忽略
}

// ── 内容包管理辅助函数 ──────────────────────────────────────

function registerData(pack: ContentPack): void {
  if (pack.species) speciesData = [...speciesData, ...pack.species];
  if (pack.backgrounds) backgroundsData = [...backgroundsData, ...pack.backgrounds];
  if (pack.classes) {
    classesData = [...classesData, ...pack.classes.map(parseClass)];
  }
  if (pack.subclasses) {
    subclassesData = [...subclassesData, ...pack.subclasses.map(parseSubclass)];
  }
  if (pack.feats) featsData = [...featsData, ...pack.feats];
  if (pack.weapons) weaponsData = [...weaponsData, ...pack.weapons];
  if (pack.armor) armorData = [...armorData, ...pack.armor];
  if (pack.gear) gearData = [...gearData, ...pack.gear];
  if (pack.spells) spellsData = [...spellsData, ...pack.spells];
}

function unregisterData(source: string): void {
  speciesData = speciesData.filter(s => s.source !== source);
  backgroundsData = backgroundsData.filter(b => b.source !== source);
  classesData = classesData.filter(c => c.source !== source);
  subclassesData = subclassesData.filter(s => {
    // Subclass doesn't have source field, skip for now
    return true;
  });
  featsData = featsData.filter(f => f.source !== source);
  weaponsData = weaponsData.filter(w => w.source !== source);
  armorData = armorData.filter(a => a.source !== source);
  gearData = gearData.filter(g => g.source !== source);
  spellsData = spellsData.filter(s => s.source !== source);
}

// ── createDataLoader 工厂函数 ───────────────────────────────

export function createDataLoader(tables: LookupTables): DataLoader {
  // 重置数据（用于测试隔离）
  speciesData = rawSpecies as Species[];
  backgroundsData = rawBackgrounds as Background[];
  classesData = rawClasses.map(parseClass);
  subclassesData = rawSubclasses.map(parseSubclass);
  featsData = rawFeats as Feat[];
  weaponsData = rawWeapons as Weapon[];
  armorData = rawArmor as Armor[];
  gearData = rawGear as GearItem[];
  spellsData = rawSpells as Spell[];
  registeredPacks.clear();

  // 重新注册 SRD
  try {
    const srdMeta = require('../../static/srd/meta.json') as ContentPackMeta;
    registeredPacks.set(srdMeta.id, srdMeta);
  } catch {
    // ignore
  }

  return {
    // ── 物种（Species）───
    getSpecies(id: string): Species | undefined {
      return speciesData.find(s => s.id === id);
    },

    getSpeciesBySource(source: string): Species[] {
      return speciesData.filter(s => s.source === source);
    },

    getSpeciesSubtype(speciesId: string, subtypeId: string): SpeciesSubtype | undefined {
      const species = speciesData.find(s => s.id === speciesId);
      if (!species?.subtypes) return undefined;
      return species.subtypes.find((st: SpeciesSubtype) => st.id === subtypeId);
    },

    getAllSpecies(): Species[] {
      return speciesData;
    },

    // ── 背景（Background）───
    getBackground(id: string): Background | undefined {
      return backgroundsData.find(b => b.id === id);
    },

    getBackgroundsBySource(source: string): Background[] {
      return backgroundsData.filter(b => b.source === source);
    },

    getAllBackgrounds(): Background[] {
      return backgroundsData;
    },

    // ── 职业（Class）/ 子职业（Subclass）───
    getClass(id: string): Class | undefined {
      return classesData.find(c => c.id === id);
    },

    getClassesBySource(source: string): Class[] {
      return classesData.filter(c => c.source === source);
    },

    getAllClasses(): Class[] {
      return classesData;
    },

    getSubclass(id: string): Subclass | undefined {
      return subclassesData.find(s => s.id === id);
    },

    getSubclassesBySource(_source: string): Subclass[] {
      // Subclass 没有 source 字段，暂时返回空数组
      return [];
    },

    getSubclassesForClass(classId: string): Subclass[] {
      return subclassesData.filter(s => s.parentClass === classId);
    },

    getAllSubclasses(): Subclass[] {
      return subclassesData;
    },

    // ── 专长（Feat）───
    getFeat(id: string): Feat | undefined {
      return featsData.find(f => f.id === id);
    },

    getFeatsBySource(source: string): Feat[] {
      return featsData.filter(f => f.source === source);
    },

    getFeatsByCategory(category: FeatCategory): Feat[] {
      return featsData.filter(f => f.category === category);
    },

    getAllFeats(): Feat[] {
      return featsData;
    },

    // ── 装备 / 武器 / 护甲 ──────────────────────────────
    getWeapon(id: string): Weapon | undefined {
      return weaponsData.find(w => w.id === id);
    },

    getWeaponsBySource(source: string): Weapon[] {
      return weaponsData.filter(w => w.source === source);
    },

    getAllWeapons(): Weapon[] {
      return weaponsData;
    },

    getArmor(id: string): Armor | undefined {
      return armorData.find(a => a.id === id);
    },

    getArmorBySource(source: string): Armor[] {
      return armorData.filter(a => a.source === source);
    },

    getAllArmor(): Armor[] {
      return armorData;
    },

    getGearItem(id: string): GearItem | undefined {
      return gearData.find(g => g.id === id);
    },

    getGearBySource(source: string): GearItem[] {
      return gearData.filter(g => g.source === source);
    },

    getAllGear(): GearItem[] {
      return gearData;
    },

    // ── 法术（Spell）───
    getSpell(id: string): Spell | undefined {
      return spellsData.find(s => s.id === id);
    },

    getSpellsBySource(source: string): Spell[] {
      return spellsData.filter(s => s.source === source);
    },

    getSpellsByLevel(level: SpellLevel): Spell[] {
      return spellsData.filter(s => s.level === level);
    },

    getAllSpells(): Spell[] {
      return spellsData;
    },

    // ── 内容包管理（R26）─────────────────────
    registerContentPack(source: string | ContentPack): void {
      const pack = loadContentPack(source);
      registeredPacks.set(pack.meta.id, pack.meta);
      registerData(pack);
    },

    unregisterContentPack(packId: string): void {
      const meta = registeredPacks.get(packId);
      if (!meta) return;
      registeredPacks.delete(packId);
      unregisterData(meta.source);
    },

    getContentPacks(): ContentPackMeta[] {
      return Array.from(registeredPacks.values());
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
        result[i + 1] = slotsArray[i] ?? 0; // 修正：index 0 → 法术位等级 1
      }
      return result;
    },

    getMulticlassSpellSlots(totalSpellcastingLevel: number): Record<number, number> {
      const slotsObj = tables.multiclassSpellSlots[totalSpellcastingLevel];
      if (!slotsObj) return emptySlotRecord();

      // JSON uses string keys like "1", "2", convert to numeric
      const result: Record<number, number> = {};
      const slotsRecord = slotsObj as Record<string, number>;
      for (const key of Object.keys(slotsRecord)) {
        const level = parseInt(key, 10);
        result[level] = slotsRecord[key] ?? 0;
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
