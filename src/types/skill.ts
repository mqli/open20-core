// types/skill.ts
// 技能相关类型定义（零依赖）

import type { AbilityName } from './ability';

// 技能名 — 字符串字面量联合类型（18个标准技能）
export type SkillName =
  | 'Athletics' // Strength
  | 'Acrobatics' // Dexterity
  | 'Sleight of Hand' // Dexterity
  | 'Stealth' // Dexterity
  | 'Arcana' // Intelligence
  | 'History' // Intelligence
  | 'Investigation' // Intelligence
  | 'Nature' // Intelligence
  | 'Religion' // Intelligence
  | 'Animal Handling' // Wisdom
  | 'Insight' // Wisdom
  | 'Medicine' // Wisdom
  | 'Perception' // Wisdom
  | 'Survival' // Wisdom
  | 'Deception' // Charisma
  | 'Intimidation' // Charisma
  | 'Performance' // Charisma
  | 'Persuasion'; // Charisma

// 全部技能名（用于遍历）
export const SKILL_NAMES: readonly SkillName[] = [
  'Athletics',
  'Acrobatics',
  'Sleight of Hand',
  'Stealth',
  'Arcana',
  'History',
  'Investigation',
  'Nature',
  'Religion',
  'Animal Handling',
  'Insight',
  'Medicine',
  'Perception',
  'Survival',
  'Deception',
  'Intimidation',
  'Performance',
  'Persuasion',
] as const;

// 技能 → 属性的映射
export const SKILL_ABILITY_MAP: Record<SkillName, AbilityName> = {
  Athletics: 'Strength',
  Acrobatics: 'Dexterity',
  'Sleight of Hand': 'Dexterity',
  Stealth: 'Dexterity',
  Arcana: 'Intelligence',
  History: 'Intelligence',
  Investigation: 'Intelligence',
  Nature: 'Intelligence',
  Religion: 'Intelligence',
  'Animal Handling': 'Wisdom',
  Insight: 'Wisdom',
  Medicine: 'Wisdom',
  Perception: 'Wisdom',
  Survival: 'Wisdom',
  Deception: 'Charisma',
  Intimidation: 'Charisma',
  Performance: 'Charisma',
  Persuasion: 'Charisma',
};

// 技能条目（角色JSON中的数据结构）
export interface SkillEntry {
  readonly proficient: boolean;
  readonly expertise: boolean; // Rogue 6/13级、Bard 3/10级
}
