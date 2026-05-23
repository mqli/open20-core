// types/equipment.ts
// 装备相关类型定义（零依赖）

import type { DamageType } from './damage';
import type { AbilityName } from './ability';

// 装备条目基础接口
export interface EquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly type: 'weapon' | 'armor' | 'gear' | 'consumable';
  readonly source?: string; // '2024 PHB' | '2014 PHB' | 'SRD 5.2' | ...（可选，测试中可以省略）
  readonly weight: number; // 重量（磅），0=无重量
  readonly cost?: string; // 价格（如 "15 gp"）
  readonly equipped: boolean; // 是否装备（影响AC/攻击加值）
  readonly quantity?: number; // 数量（物品堆叠）
}

// 武器类型
export interface Weapon extends EquipmentItem {
  readonly type: 'weapon';
  readonly category: 'Simple' | 'Martial';
  readonly damage: WeaponDamage;
  readonly properties: readonly WeaponProperty[];
  readonly mastery?: readonly WeaponMasteryProperty[]; // 2024 武器精通属性（9级Fighter可多选）
  readonly range?: WeaponRange;
  readonly versatileDamage?: string; // 双手使用时伤害（如 "1d10"）
}

// 武器伤害条目（统一结构，消除 dice/type 与 additional 的冗余）
export interface WeaponDamageEntry {
  readonly dice: string; // 如 "1d8", "2d6", "1d4"
  readonly type: DamageType; // 伤害类型，如 "Piercing", "Slashing", "Poison", "Fire"
}

// 武器伤害（统一使用 entries 数组）
export interface WeaponDamage {
  readonly entries: readonly WeaponDamageEntry[]; // 所有伤害条目，第一条为基础伤害（应用能力加值）
  readonly ability: AbilityName;
  readonly bonus: number;
}

// 武器射程
export interface WeaponRange {
  readonly normal: number;
  readonly maximum?: number; // 远程武器有最大射程
}

// 武器属性
export type WeaponProperty =
  | 'Ammunition'
  | 'Finesse'
  | 'Heavy'
  | 'Light'
  | 'Loading'
  | 'Range'
  | 'Reach'
  | 'Special'
  | 'Thrown'
  | 'Two-Handed'
  | 'Versatile'
  | WeaponMasteryProperty; // 2024 新增：武器精通属性也算武器属性

// 2024 武器精通属性（8个）
export type WeaponMasteryProperty =
  | 'Cleave'
  | 'Graze'
  | 'Nick'
  | 'Push'
  | 'Sap'
  | 'Slow'
  | 'Topple'
  | 'Vex';

// 护甲类型
export interface Armor extends EquipmentItem {
  readonly type: 'armor';
  readonly category: 'Light' | 'Medium' | 'Heavy' | 'Shield';
  readonly baseAC: number;
  readonly dexBonus: boolean; // 是否加Dex调整值
  readonly dexCap?: number; // Dex上限（中甲为2，轻甲无上限）
  readonly strengthRequirement?: number; // 力量需求（重甲）
  readonly stealthDisadvantage?: boolean;
}

// 通用装备（工具、冒险装备、消耗品等）
export interface GearItem extends EquipmentItem {
  readonly type: 'gear' | 'consumable';
}
