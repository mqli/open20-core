// data/default-loader.ts
// Unified DataLoader implementation — works in both Node.js and Browser
// JSON imports are cast directly to types (no parsing needed)

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
import type { Monster } from '../monster/types';

// ── JSON 导入（Node.js 21+ / 所有 bundlers 支持）────────────────────
import speciesDataJson from '../../static/srd/species.json' with { type: 'json' };
import backgroundsDataJson from '../../static/srd/backgrounds.json' with { type: 'json' };
import classesDataJson from '../../static/srd/classes.json' with { type: 'json' };
import subclassesDataJson from '../../static/srd/subclasses.json' with { type: 'json' };
import featsDataJson from '../../static/srd/feats.json' with { type: 'json' };
import weaponsDataJson from '../../static/srd/weapons.json' with { type: 'json' };
import armorDataJson from '../../static/srd/armor.json' with { type: 'json' };
import gearDataJson from '../../static/srd/gear.json' with { type: 'json' };
import spellsDataJson from '../../static/srd/spells.json' with { type: 'json' };
import monstersDataJson from '../../static/srd/monsters.json' with { type: 'json' };
import srdMetaJson from '../../static/srd/meta.json' with { type: 'json' };
import lookupTablesJson from '../../static/srd/lookup-tables.json' with { type: 'json' };

// ── 类型安全的 JSON 数据（直接转换，无需解析）─────────────────────

const speciesDataTyped: Species[] = speciesDataJson as unknown as Species[];
const backgroundsDataTyped: Background[] = backgroundsDataJson as unknown as Background[];
const classesDataTyped: Class[] = classesDataJson as unknown as Class[];
const subclassesDataTyped: Subclass[] = subclassesDataJson as unknown as Subclass[];
const featsDataTyped: Feat[] = featsDataJson as unknown as Feat[];
const weaponsDataTyped: Weapon[] = weaponsDataJson as unknown as Weapon[];
const armorDataTyped: Armor[] = armorDataJson as unknown as Armor[];
const gearDataTyped: GearItem[] = gearDataJson as unknown as GearItem[];
const spellsDataTyped: Spell[] = spellsDataJson as unknown as Spell[];
const monstersDataTyped: Monster[] = monstersDataJson as unknown as Monster[];
const srdMetaCached: ContentPackMeta = srdMetaJson as unknown as ContentPackMeta;
const lookupTablesTyped: LookupTables = lookupTablesJson as unknown as LookupTables;

// ── 可变的数据存储（支持内容包注册）─────────────────────

let speciesData: Species[] = [...speciesDataTyped];
let backgroundsData: Background[] = [...backgroundsDataTyped];
let classesData: Class[] = [...classesDataTyped];
let subclassesData: Subclass[] = [...subclassesDataTyped];
let featsData: Feat[] = [...featsDataTyped];
let weaponsData: Weapon[] = [...weaponsDataTyped];
let armorData: Armor[] = [...armorDataTyped];
let gearData: GearItem[] = [...gearDataTyped];
let spellsData: Spell[] = [...spellsDataTyped];
let monstersData: Monster[] = [...monstersDataTyped];

// 已注册的内容包元数据
const registeredPacks: Map<string, ContentPackMeta> = new Map();

// 初始化时注册 SRD
registeredPacks.set(srdMetaCached.id, srdMetaCached);

// ── 内容包管理辅助函数 ──────────────────────────────────────

function registerData(pack: ContentPack): void {
  if (pack.species) speciesData = [...speciesData, ...pack.species];
  if (pack.backgrounds) backgroundsData = [...backgroundsData, ...pack.backgrounds];
  if (pack.classes) {
    classesData = [...classesData, ...pack.classes as unknown as Class[]];
  }
  if (pack.subclasses) {
    subclassesData = [...subclassesData, ...pack.subclasses as unknown as Subclass[]];
  }
  if (pack.feats) featsData = [...featsData, ...pack.feats];
  if (pack.weapons) weaponsData = [...weaponsData, ...pack.weapons];
  if (pack.armor) armorData = [...armorData, ...pack.armor];
  if (pack.gear) gearData = [...gearData, ...pack.gear];
  if (pack.spells) spellsData = [...spellsData, ...pack.spells];
  if (pack.monsters) monstersData = [...monstersData, ...pack.monsters];
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
  monstersData = monstersData.filter(m => m.source !== source);
}

// ── createDataLoader 工厂函数 ───────────────────────────────

export function createDataLoader(): DataLoader {
  // 重置数据（用于测试隔离）
  speciesData = [...speciesDataTyped];
  backgroundsData = [...backgroundsDataTyped];
  classesData = [...classesDataTyped];
  subclassesData = [...subclassesDataTyped];
  featsData = [...featsDataTyped];
  weaponsData = [...weaponsDataTyped];
  armorData = [...armorDataTyped];
  gearData = [...gearDataTyped];
  spellsData = [...spellsDataTyped];
  monstersData = [...monstersDataTyped];
  registeredPacks.clear();

  // 重新注册 SRD
  registeredPacks.set(srdMetaCached.id, srdMetaCached);

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

    getSubclassesBySource(source: string): Subclass[] {
      return subclassesData.filter(s => s.source === source);
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

    // ── 怪物（Monster）───
    getMonster(id: string): Monster | undefined {
      return monstersData.find(m => m.id === id);
    },

    getMonstersBySource(source: string): Monster[] {
      return monstersData.filter(m => m.source === source);
    },

    getAllMonsters(): Monster[] {
      return monstersData;
    },

    // ── 内容包管理（R26）─────────────────────
    // 接受 ContentPack 对象（Browser 和 Node.js 通用）
    registerContentPack(pack: ContentPack): void {
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
      const keys = Object.keys(lookupTablesTyped.proficiencyBonus)
        .map(Number)
        .sort((a, b) => a - b);

      let result = lookupTablesTyped.proficiencyBonus[keys[0] ?? 1] ?? 2;
      for (const key of keys) {
        if (level >= key) {
          result = lookupTablesTyped.proficiencyBonus[key] ?? 2;
        } else {
          break;
        }
      }
      return result;
    },

    getHitDieFixedValue(die: DieType): number {
      return lookupTablesTyped.hitDieFixedValue[die] ?? 0;
    },

    getSpellSlots(classId: string, classLevel: number): Record<number, number> {
      const classSlots = lookupTablesTyped.spellSlots[classId];
      if (!classSlots) return emptySlotRecord();

      const slotsArray = classSlots[classLevel];
      if (!slotsArray) return emptySlotRecord();

      const result: Record<number, number> = {};
      for (let i = 0; i < slotsArray.length; i++) {
        result[i + 1] = slotsArray[i] ?? 0;
      }
      return result;
    },

    getMulticlassSpellSlots(totalSpellcastingLevel: number): Record<number, number> {
      const slotsObj = lookupTablesTyped.multiclassSpellSlots[totalSpellcastingLevel];
      if (!slotsObj) return emptySlotRecord();

      const result: Record<number, number> = {};
      const slotsRecord = slotsObj as Record<string, number>;
      for (const key of Object.keys(slotsRecord)) {
        const level = parseInt(key, 10);
        result[level] = slotsRecord[key] ?? 0;
      }
      return result;
    },

    getPactMagicSlots(warlockLevel: number): { slots: number; slotLevel: number } {
      return lookupTablesTyped.pactMagicSlots[warlockLevel] ?? { slots: 0, slotLevel: 0 };
    },

    getWeaponMasteryProperties(): readonly string[] {
      return lookupTablesTyped.weaponMasteryProperties;
    },

    getConditionNames(): readonly string[] {
      return lookupTablesTyped.conditionNames;
    },
  };
}

function emptySlotRecord(): Record<number, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
}
