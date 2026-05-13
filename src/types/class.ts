// types/class.ts
// 职业与子职业相关类型（零依赖）

import type { ResetType } from './resource';
import type { AbilityName } from './ability';
import type { AlwaysPreparedSpells } from './spell';

// 法术施法方式（判别联合）
// 对应 SRD 5.2 Spell Preparation by Class 表
export type Spellcasting =
  | PreparationSpellcasting
  | KnownSpellcasting;

// 准备施法者：Cleric, Druid, Wizard, Paladin, Ranger
interface PreparationSpellcasting {
  readonly type: 'preparation';
  readonly ability: AbilityName;

  // 如何"知道"法术：
  // - 'class_list'  → Cleric, Druid: 自动知道该职业法术列表中的所有法术
  // - 'spellbook'   → Wizard: 必须学习/抄写才能知道
  // - 'limited'     → Paladin, Ranger: 知道的法术数量有限（等级 + 调整值）
  readonly knownSource: 'class_list' | 'spellbook' | 'limited';

  // 每次长休可以更换多少个准备的法术：
  // - 'all'   → Cleric, Druid, Wizard: 可以更换任意数量
  // - number  → Paladin, Ranger: 每次长休只能更换1个（SRD: "One"）
  // 注意：此为参考字段，代码不强制执行限制
  readonly changesPerRest: 'all' | number;
}

// 已知施法者（无需准备）：Bard, Sorcerer, Warlock
interface KnownSpellcasting {
  readonly type: 'known';
  readonly ability: AbilityName;

  // 每升一级可以更换多少个已知法术（SRD: 总是1）
  // 注意：此为参考字段，代码不强制执行限制
  readonly changesPerLevel: number;

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
  readonly resourceMax?: number; // 资源最大使用次数
  readonly resourceResetOn?: ResetType; // 重置时机
  readonly resourceScaleWithPB?: boolean; // 是否随熟练加值变化
}

// 职业类型
export interface Class {
  readonly id: string;
  readonly name: string;
  readonly source: string; // '2024 PHB' | '2014 PHB' | 'SRD 5.2' | ...
  readonly hitDie: import('./dice').DieType;
  readonly savingThrowProficiencies: readonly import('./ability').AbilityName[];
  readonly armorTraining: readonly string[]; // 许可的护甲类型
  readonly weaponProficiencies?: readonly string[]; // 武器熟练项（如 "Simple", "Martial", "Longsword"）
  readonly weaponMastery: boolean; // 是否有Weapon Mastery
  // JSON 原生格式：按等级分组的特性列表
  readonly featuresByLevel: readonly {
    readonly level: number;
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
  readonly slotsByLevel: ReadonlyArray<number>; // index = 法术等级 0-9
}
