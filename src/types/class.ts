// types/class.ts
// 职业与子职业相关类型（零依赖）

// 法术施法方式
export interface Spellcasting {
  readonly ability: import('./ability').AbilityName; // 施法关键属性
  readonly prepares: boolean; // 是否需要准备法术
}

// 职业特性条目
export interface Feature {
  readonly name: string;
  readonly description: string;
  readonly resourceId?: string; // 关联的资源ID（如有）
  readonly level?: number; // 获得该特性的等级
}

// 职业类型
export interface Class {
  readonly id: string;
  readonly name: string;
  readonly source: '2024 PHB' | '2014 PHB';
  readonly hitDie: import('./character').DieType;
  readonly savingThrowProficiencies: readonly import('./ability').AbilityName[];
  readonly armorTraining: readonly string[]; // 许可的护甲类型
  readonly weaponMastery: boolean; // 是否有Weapon Mastery
  readonly featuresByLevel: ReadonlyMap<number, readonly Feature[]>;
  readonly spellcasting: Spellcasting | null;
}

// 子职业类型
export interface Subclass {
  readonly id: string;
  readonly parentClass: string; // 父职业ID
  readonly grantedAtLevel: number;
  readonly featuresByLevel: ReadonlyMap<number, readonly Feature[]>;
}

// 多维职业法术位查询表条目
export interface MulticlassSpellSlotEntry {
  readonly totalSpellcastingLevel: number;
  readonly slotsByLevel: ReadonlyArray<number>; // index = 法术等级 0-9
}
