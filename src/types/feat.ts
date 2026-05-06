// types/feat.ts
// 专长相关类型（零依赖）

// 专长类别 — 字符串字面量联合类型
export type FeatCategory = 'Origin' | 'General' | 'Fighting Style' | 'Epic Boon';

// 专长条目
export interface Feat {
  readonly id: string;
  readonly source: '2024 PHB' | '2014 PHB';
  readonly name?: string;           // 显示名称（无则用id）
  readonly description: string;
  readonly category: FeatCategory;
  readonly prerequisites?: FeatPrerequisite;  // 前提条件
  readonly grants?: FeatGrant;             // 给予的能力
}

// 专长前提
export interface FeatPrerequisite {
  readonly ability?: Partial<Record<import('./ability').AbilityName, number>>;
  readonly level?: number;
  readonly classId?: string;
  readonly subclassId?: string;
  readonly species?: string;
}

// 专长给予的能力
export interface FeatGrant {
  readonly abilityBonus?: Partial<Record<import('./ability').AbilityName, number>>;
  readonly skillProficiencies?: readonly string[];
  readonly toolProficiencies?: readonly string[];
  readonly languages?: readonly string[];
  readonly armorTraining?: readonly string[];
  readonly weaponMastery?: readonly string[];  // 武器精通属性
}

// 2024 专长总数：75个
// 37个新专长 + 35个修订专长 + 3个未变专长
