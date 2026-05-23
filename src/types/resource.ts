// types/resource.ts
// 可消耗资源相关类型（零依赖）

// 资源重置方式 — 用 enum（有限选项，需要反向映射）
export enum ResetType {
  ShortRest = 'Short Rest',
  LongRest = 'Long Rest',
  PerTurn = 'Per Turn',
  Daily = 'Daily',
  Never = 'Never',
}

// 资源显示类型（UI层用）
export enum DisplayType {
  Counter = 'Counter', // 数字计数器（如 Second Wind 1/1）
  Dots = 'Dots', // 圆点显示（如 Rage ●●○）
  Points = 'Points', // 点数显示（如 Sorcery Points 3/3）
}

// 资源条目
export interface Resource {
  readonly id: string; // 资源ID（如 "Second Wind"）
  readonly name?: string; // 显示名称（无则用id）
  readonly description?: string; // 描述（用于tooltip）
  readonly max: number;
  readonly used: number;
  readonly resetOn: ResetType;
  readonly displayType?: DisplayType;
  readonly displayName?: string; // 显示名称（如 "Rage 1/3"）
}

// 2024 各职业资源清单（参考，非类型定义）：
// Barbarian: Rage (LongRest)
// Bard: Bardic Inspiration (LongRest; switches to ShortRest at level 5 — not yet supported)
// Cleric: Channel Divinity (ShortRest)
// Druid: Wild Shape (ShortRest)
// Fighter: Second Wind (ShortRest), Action Surge (ShortRest), Indomitable (LongRest)
// Monk: Focus Points (ShortRest)
// Paladin: Channel Divinity (ShortRest), Lay on Hands (LongRest)
// Ranger: Favored Enemy (LongRest)
// Rogue: Sneak Attack (no resource — unlimited per turn, damage bonus only)
// Sorcerer: Sorcery Points (LongRest)
// Warlock: Pact Magic (ShortRest)
// Wizard: Arcane Recovery (LongRest)
