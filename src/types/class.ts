// types/class.ts
// 职业与子职业相关类型（零依赖）

import type { ResetType } from './resource';
import type { AbilityName } from './ability';
import type { AlwaysPreparedSpells } from './spell';
import type { DieType } from './dice';

// 法术施法方式（SRD 5.2）
// 所有施法者都有准备法术（Prepared Spells）
// 区别仅在于：如何知道法术 + 何时可以更换 + 法术位系统
export interface Spellcasting {
  readonly ability: AbilityName;

  // 如何"知道"法术：
  // - 'class_list' → 大多数职业：自动知道职业法术列表
  // - 'spellbook'   → Wizard: 必须学习/抄写才能知道
  // 注意：只有 type=preparation 时此字段才有意义
  readonly knownSource?: 'class_list' | 'spellbook';

  // 何时可以更换准备的法术：
  // - 'long_rest'  → Cleric, Druid, Wizard: 每次长休可更换
  // - 'level_up'   → Bard, Sorcerer, Warlock: 仅在升级时可更换
  readonly preparationTiming: 'long_rest' | 'level_up';

  // 每次准备时可以更换多少个法术：
  // - 'all'   → 大多数职业：可以更换任意数量
  // - number  → Paladin, Ranger: 每次只能更换1个（SRD: "One"）
  readonly changesPerPreparation: 'all' | number;

  // Warlock 专用：使用 Pact Magic 而非常规法术位
  readonly pactMagic?: true;
}

// 职业特性条目
export interface Feature {
  readonly name: string;
  readonly description: string;
  readonly resourceId?: string; // 关联的资源ID（如有）
  readonly level?: number; // 获得该特性的等级
  // 资源属性（可选，如果定义则优先使用）
  // 用法：resourceMax 用于固定值；resourceMaxByLevel 用于按等级查表（Option B）
  readonly resourceMax?: number; // 资源最大使用次数（固定值）
  readonly resourceMaxByLevel?: Record<number, number>; // 按等级查表，key=等级，value=最大值
  readonly resourceResetOn?: ResetType; // 重置时机
  readonly resourceScaleWithPB?: boolean; // 是否随熟练加值变化
}

// 职业类型
export interface Class {
  readonly id: string;
  readonly name: string;
  readonly source: string; // '2024 PHB' | '2014 PHB' | 'SRD 5.2' | ...
  readonly hitDie: DieType;
  readonly savingThrowProficiencies: readonly AbilityName[];
  readonly armorTraining: readonly string[]; // 许可的护甲类型
  readonly weaponProficiencies?: readonly string[]; // 武器熟练项（如 "Simple", "Martial", "Longsword"）
  readonly weaponMastery: boolean; // 是否有Weapon Mastery
  // JSON 原生格式：按等级分组的特性列表
  readonly featuresByLevel: readonly {
    readonly level: number;
    // 准备施法者每级可准备的法术数量（从职业特性表中读取）
    // 仅准备施法职业（Cleric, Druid, Wizard, Paladin, Ranger）有此字段
    readonly preparedSpells?: number;
    // 每级知道的戏法数量（从职业特性表中读取）
    // 所有施法职业都有此字段
    readonly cantripsKnown?: number;
    readonly features: readonly Feature[];
  }[];
  readonly spellcasting: Spellcasting | null;
}

// 子职业类型
export interface Subclass {
  readonly id: string;
  readonly parentClass: string; // 父职业ID
  readonly grantedAtLevel: number;
  // JSON 原生格式：按等级分组的特性列表
  readonly featuresByLevel: readonly {
    readonly level: number;
    // 准备施法者每级可准备的法术数量（从职业特性表中读取）
    // 仅准备施法职业（Cleric, Druid, Wizard, Paladin, Ranger）有此字段
    readonly preparedSpells?: number;
    // 每级知道的戏法数量（从职业特性表中读取）
    // 所有施法职业都有此字段
    readonly cantripsKnown?: number;
    readonly features: readonly Feature[];
  }[];
  // 始终准备的法术（领域法术、誓言法术等）
  // JSON 原生格式：按获得等级分组，这些法术不计入准备法术数量上限
  readonly alwaysPreparedSpells?: readonly {
    readonly level: number;
    readonly spells: AlwaysPreparedSpells;
  }[];
  // 来源（如 'SRD 5.2', '2024 PHB' 等）
  readonly source?: string;
}

// 多维职业法术位查询表条目
export interface MulticlassSpellSlotEntry {
  readonly totalSpellcastingLevel: number;
  // slotsByLevel: indexed by spell level (1-9), index 0 = level 1 slots, index 8 = level 9 slots.
  // Cantrips (level 0) are not included since they don't consume slots.
  readonly slotsByLevel: ReadonlyArray<number>;
}
