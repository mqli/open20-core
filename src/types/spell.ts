// types/spell.ts
// 法术相关类型定义（零依赖）

import type { AbilityName } from './ability';

// 法术等级
export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 法术位条目（Character.spells）
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

// 始终准备的法术列表（领域法术、誓言法术等）
// 这些法术不计入准备法术数量上限
export type AlwaysPreparedSpells = readonly string[];

// 每职业法术追踪（多维职业支持）
export interface ClassSpellData {
  readonly classId: string;
  readonly spellcastingAbility: AbilityName;
  readonly spellSaveDC: number;  // 8 + proficiency + ability mod
  readonly spellAttackBonus: number;

  // 已知的戏法（有限数量，由职业表决定）
  readonly knownCantrips: readonly string[];

  // 最大已知戏法数量（从职业表读取）
  readonly maxCantripsKnown: number;

  // 该职业已知的法术（1+级）
  readonly knownSpells: readonly string[];

  // 已准备的法术（准备施法者用）
  readonly preparedSpells: readonly string[];

  // 始终准备的法术（领域法术等）- 不计入准备数量
  readonly alwaysPreparedSpells?: AlwaysPreparedSpells;

  // 最大准备法术数量（从职业表读取，SRD 5.2 使用表格数值）
  readonly maxPrepared: number;
}

// 角色法术数据（Character.spells）- 支持多维职业
export interface CharacterSpells {
  // 每职业法术追踪（以 classId 为键）
  readonly classSpellcasting: Record<string, ClassSpellData>;

  // 统一法术位（多维职业合并池）
  readonly spellSlots: Record<SpellLevel, SpellSlotEntry>;

  // Warlock Pact Magic（独立于常规法术位）
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

// 戏法升级条目（自动计算伤害）
export interface CantripUpgradeEntry {
  readonly atCharacterLevel: 5 | 11 | 17;
  readonly damage?: readonly SpellDamageEntry[];
}

// Spell damage/effect data
export interface SpellDamage {
  readonly entries: readonly SpellDamageEntry[];
  readonly additional?: readonly SpellDamageEntry[]; // Extra damage (doesn't scale with upcast)
  readonly perSlot?: readonly SpellDamageEntry[]; // Damage increase per slot level above base (for upcasting)
}

export interface SpellHeal {
  readonly dice: string;
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
  readonly description: readonly string[]; // 多段落描述
  readonly cantripUpgrade?: readonly CantripUpgradeEntry[]; // 戏法升级（0级法术）
  readonly usingAHigherLevelSpellSlot?: readonly string[]; // 升环施法说明（1+级法术）
  readonly damage?: SpellDamage;
  readonly heal?: SpellHeal;
  readonly save?: AbilityName;
  readonly attack?: boolean;
  readonly source: string;
  readonly classes?: readonly string[];
}

// 法术学校
export type SpellSchool =
  | 'Abjuration'
  | 'Conjuration'
  | 'Divination'
  | 'Enchantment'
  | 'Evocation'
  | 'Illusion'
  | 'Necromancy'
  | 'Transmutation';
