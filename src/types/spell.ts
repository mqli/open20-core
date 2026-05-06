// types/spell.ts
// 法术相关类型定义（零依赖）

// 法术等级
export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 法术法术位条目（Character.spells）
export interface SpellSlotEntry {
  readonly total: number;
  readonly used: number;
}

// Pact Magic（Warlock专用）
export interface PactMagicSlots {
  readonly level: number;     // Pact Magic法术位等级（不是职业等级）
  readonly total: number;
  readonly used: number;
  readonly resetOn: 'Short Rest';  // Warlock法术位短休恢复
}

// 角色法术数据（Character.spells）
export interface CharacterSpells {
  readonly spellcastingAbility: import('./ability').AbilityName;
  readonly spellSaveDC: number;
  readonly spellAttackBonus: number;
  readonly knownSpells: readonly string[];           // Spell.id 列表
  readonly preparedSpells: readonly string[];    // 已准备法术（施法者用）
  readonly spellSlots: Record<SpellLevel, SpellSlotEntry>;
  readonly pactMagicSlots: PactMagicSlots | null;
}

// 法术施法时间
export type CastingTime =
  | 'Action'
  | 'Bonus Action'
  | 'Reaction'
  | 'Minute'
  | 'Hour'
  | 'Special';

// 法术成分
export type SpellComponent = 'V' | 'S' | 'M';

// 法术法术模板（静态数据）
export interface Spell {
  readonly id: string;
  readonly level: SpellLevel;
  readonly school: SpellSchool;
  readonly castingTime: CastingTime;
  readonly range: string;
  readonly components: readonly SpellComponent[];
  readonly materialDescription?: string;
  readonly duration: string;
  readonly description: string;         // 来自SRD
  readonly source: '2024 PHB' | '2014 PHB' | 'SRD';
  readonly upcast?: string;              // 升环施法说明
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
