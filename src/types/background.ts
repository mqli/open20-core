// types/background.ts
// 背景相关类型（零依赖）

import type { GearItem } from './equipment';

// 背景类型
export interface Background {
  readonly id: string;
  readonly source: string; // '2024 PHB' | '2014 PHB' | 'SRD 5.2' | ...
  readonly name?: string; // 显示名称（如无则用id）
  readonly description?: string;
  readonly skillProficiencies: readonly string[]; // 授予的技能熟练项
  readonly toolProficiencies: readonly string[]; // 授予的工具熟练项
  readonly languages: readonly string[]; // 授予的语言
  readonly originFeatId: string; // 授予的Origin Feat ID
  readonly startingEquipment?: readonly GearItem[];
  readonly startingGold: number; // gp
}

// 2024 背景完整列表（16个）
// Acolyte, Charlatan, Criminal, Entertainer,
// Farmer, Gladiator, Guard, Guide,
// Hermit, Merchant, Noble, Sage,
// Sailor, Scribe, Soldier, Wayfarer
