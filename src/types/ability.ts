// types/ability.ts
// 属性相关类型定义（零依赖）

// 六项核心属性名 — 用字符串字面量联合类型（JSON天然兼容）
export type AbilityName =
  | 'Strength'
  | 'Dexterity'
  | 'Constitution'
  | 'Intelligence'
  | 'Wisdom'
  | 'Charisma';

// 所有属性名的只读数组（用于遍历）
export const ABILITY_NAMES: readonly AbilityName[] = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
] as const;

// 属性值记录 — base/ racial/ background/ feat/ temporary 五维
export interface AbilityScores {
  readonly base: Record<AbilityName, number>; // 玩家分配的原始值（8-15）
  readonly racialBonuses: Partial<Record<AbilityName, number>>; // 来自物种的固定加值
  readonly backgroundBonuses?: Partial<Record<AbilityName, number>>; // 来自背景的加值（由 recompute 计算）
  readonly featBonuses?: Partial<Record<AbilityName, number>>; // 来自专长 ASI 选择的加值
  readonly featGrants?: Partial<Record<AbilityName, number>>; // 来自专长固有奖励的加值（由 recompute 计算）
  readonly temporaryBonuses?: Partial<Record<AbilityName, number>>; // 法术/特性临时加值
}

// 属性调整值计算方式：
// modifier = Math.floor((base + racial + feat + temporary - 10) / 2)
//
// 示例：
// base St 15, racial +2, feat +1 → total = 18 → modifier = +4
// base Con 12, racial +0, no feat  → total = 12 → modifier = +1
// base Dex  8, no racial, no feat  → total =  8 → modifier = -1
