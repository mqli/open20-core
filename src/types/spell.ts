// types/spell.ts
// 法术相关类型定义（零依赖）

import type { AbilityName } from './ability';

// 法术等级
export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 法术法术位条目（Character.spells）
export interface SpellSlotEntry {
  readonly total: number;
  readonly used: number;
}

// Pact Magic（Warlock专用）
export interface PactMagicSlots {
  readonly level: number; // Pact Magic法术位等级（不是职业等级）
  readonly total: number;
  readonly used: number;
  readonly resetOn: 'Short Rest'; // Warlock法术位短休恢复
}

// 角色法术数据（Character.spells）
export interface CharacterSpells {
  readonly spellcastingAbility: import('./ability').AbilityName;
  readonly spellSaveDC: number;
  readonly spellAttackBonus: number;
  readonly knownSpells: readonly string[]; // Spell.id 列表
  readonly preparedSpells: readonly string[]; // 已准备法术（施法者用）
  readonly spellSlots: Record<SpellLevel, SpellSlotEntry>;
  readonly pactMagicSlots: PactMagicSlots | null;
}

// 法术施法时间
export type CastingTime = 'Action' | 'Bonus Action' | 'Reaction' | 'Minute' | 'Hour' | 'Special';

// 法术成分
export type SpellComponent = 'V' | 'S' | 'M';

// 法术伤害条目
export interface SpellDamageEntry {
  readonly dice: string; // 如 "2d6", "1d10"
  readonly type: string; // 伤害类型，如 "Fire", "Piercing", "Poison"
}

// Spell damage/effect data（统一使用 entries 数组）
export interface SpellDamage {
  readonly entries: readonly SpellDamageEntry[]; // 法术伤害条目（升环时第一条伤害骰增加）
  readonly higherLevel?: readonly string[];       // 升环伤害（对应 entries[0]）
  readonly additional?: readonly SpellDamageEntry[]; // 额外伤害（不随升环增加）
}

export interface SpellHeal {
  readonly dice: string;
  readonly higherLevel?: readonly string[];
}

// Spell template (static data from JSON)
export interface Spell {
  readonly id: string;
  readonly name: string;
  readonly level: SpellLevel;
  readonly school: SpellSchool;
  readonly castingTime: CastingTime;
  readonly range: string;
  readonly components: readonly SpellComponent[];
  readonly duration: string;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly description: string; // 来自SRD
  readonly damage?: SpellDamage;
  readonly heal?: SpellHeal;
  readonly save?: AbilityName;
  readonly attack?: boolean;
  readonly source: string; // '2024 PHB' | '2014 PHB' | 'SRD 5.2' | 'Player\'s Handbook (2024)'
  readonly upcast?: string; // 升环施法说明
  readonly classes?: readonly string[]; // Which classes have this spell
}

// 法术法术学校
export type SpellSchool =
  | 'Abjuration'
  | 'Conjuration'
  | 'Divination'
  | 'Enchantment'
  | 'Evocation'
  | 'Illusion'
  | 'Necromancy'
  | 'Transmutation';
