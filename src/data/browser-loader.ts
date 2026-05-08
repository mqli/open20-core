// data/browser-loader.ts
// Browser-compatible DataLoader — JSON data bundled directly via import
// For use in browser environments (no Node.js fs/path/node:module)

import type { DataLoader, LookupTables, SpellLevel } from './loader';
import type { Species, SpeciesSubtype } from '../types/species';
import type { Background } from '../types/background';
import type { Class, Subclass, Feature } from '../types/class';
import type { AbilityName } from '../types/ability';
import type { Feat, FeatCategory } from '../types/feat';
import type { Weapon, Armor, GearItem } from '../types/equipment';
import type { Spell } from '../types/spell';
import type { DieType } from '../types/character';

// ── 静态 JSON 数据（esbuild 会直接 bundle 进输出） ─────────────
import speciesData from '../../static/species.json';
import backgroundsData from '../../static/backgrounds.json';
import classesData from '../../static/classes.json';
import subclassesData from '../../static/subclasses.json';
import featsData from '../../static/feats.json';
import weaponsData from '../../static/weapons.json';
import armorData from '../../static/armor.json';
import gearData from '../../static/gear.json';
import spellsData from '../../static/spells.json';

// ── 类型转换工具 ───────────────────────────────────────────────

function parseFeaturesByLevel(
  raw: Array<{ level: number; features: readonly Feature[] }>
): ReadonlyMap<number, readonly Feature[]> {
  const map = new Map<number, readonly Feature[]>();
  for (const entry of raw) {
    map.set(entry.level, entry.features);
  }
  return map;
}

function parseClass(raw: unknown): Class {
  const c = raw as Record<string, unknown>;
  return {
    id: c.id as string,
    name: (c.name as string) ?? (c.id as string),
    source: c.source as '2024 PHB' | '2014 PHB',
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

// ── 解析后的数据 ─────────────────────────────────────────────
const species: Species[] = speciesData as unknown as Species[];
const backgrounds: Background[] = backgroundsData as unknown as Background[];
const classes: Class[] = (classesData as unknown[]).map(parseClass);
const subclasses: Subclass[] = (subclassesData as unknown[]).map(parseSubclass);
const feats: Feat[] = featsData as unknown as Feat[];
const weapons: Weapon[] = weaponsData as unknown as Weapon[];
const armors: Armor[] = armorData as unknown as Armor[];
const gear: GearItem[] = gearData as unknown as GearItem[];
const spells: Spell[] = spellsData as unknown as Spell[];

// ── createBrowserDataLoader ────────────────────────────────────

export function createBrowserDataLoader(tables: LookupTables): DataLoader {
  return {
    // ── 物种（Species）───
    getSpecies(id: string): Species | undefined {
      return species.find(s => s.id === id);
    },

    getSpeciesSubtype(speciesId: string, subtypeId: string): SpeciesSubtype | undefined {
      const sp = species.find(s => s.id === speciesId);
      if (!sp?.subtypes) return undefined;
      return sp.subtypes.find((st: SpeciesSubtype) => st.id === subtypeId);
    },

    getAllSpecies(): Species[] {
      return species;
    },

    // ── 背景（Background）───
    getBackground(id: string): Background | undefined {
      return backgrounds.find(b => b.id === id);
    },

    getAllBackgrounds(): Background[] {
      return backgrounds;
    },

    // ── 职业（Class）/ 子职业（Subclass）───
    getClass(id: string): Class | undefined {
      return classes.find(c => c.id === id);
    },

    getAllClasses(): Class[] {
      return classes;
    },

    getSubclass(id: string): Subclass | undefined {
      return subclasses.find(s => s.id === id);
    },

    getSubclassesForClass(classId: string): Subclass[] {
      return subclasses.filter(s => s.parentClass === classId);
    },

    getAllSubclasses(): Subclass[] {
      return subclasses;
    },

    // ── 专长（Feat）───
    getFeat(id: string): Feat | undefined {
      return feats.find(f => f.id === id);
    },

    getFeatsByCategory(category: FeatCategory): Feat[] {
      return feats.filter(f => f.category === category);
    },

    getAllFeats(): Feat[] {
      return feats;
    },

    // ── 装备 / 武器 / 护甲 ──────────────────────────────
    getWeapon(id: string): Weapon | undefined {
      return weapons.find(w => w.id === id);
    },

    getAllWeapons(): Weapon[] {
      return weapons;
    },

    getArmor(id: string): Armor | undefined {
      return armors.find(a => a.id === id);
    },

    getAllArmor(): Armor[] {
      return armors;
    },

    getGearItem(id: string): GearItem | undefined {
      return gear.find(g => g.id === id);
    },

    getAllGear(): GearItem[] {
      return gear;
    },

    // ── 法术（Spell）───
    getSpell(id: string): Spell | undefined {
      return spells.find(s => s.id === id);
    },

    getSpellsByLevel(level: SpellLevel): Spell[] {
      return spells.filter(s => s.level === level);
    },

    getAllSpells(): Spell[] {
      return spells;
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

      const result: Record<number, number> = {};
      for (let i = 0; i < slotsArray.length; i++) {
        result[i + 1] = slotsArray[i] ?? 0;
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
