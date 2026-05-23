// types/species.ts
// 物种相关类型（零依赖）

import type { AbilityName } from './ability';

// 物种特性条目
export interface SpeciesTrait {
  readonly name: string;
  readonly description?: string;
  readonly grants?: SpeciesGrant; // 该特性给予的能力
}

// 物种给予的能力（用于自动计算）
export interface SpeciesGrant {
  readonly skillProficiencies?: readonly string[];
  readonly toolProficiencies?: readonly string[];
  readonly languages?: readonly string[];
  readonly armorTraining?: readonly string[]; // 护甲熟练（如Dwarf）
  readonly speedBonus?: number;
  readonly hpPerLevel?: number; // 如Dwarf的 +1/级
}

// 物种变体（2024新机制，如Dwarf的Hill/Mountain）
export interface SpeciesSubtype {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly traits: readonly SpeciesTrait[];
}

// 物种主类型
export interface Species {
  readonly id: string; // 如 "Dwarf", "Elf"
  readonly source: string; // '2024 PHB' | '2014 PHB' | 'SRD 5.2' | ...
  readonly description: string;
  readonly size: 'Small' | 'Medium';
  readonly speed: number; // 尺（如30）
  readonly languages: readonly string[];
  readonly abilityBonuses: Partial<Record<AbilityName, number>>;
  readonly baseTraits: readonly SpeciesTrait[];
  readonly subtypes?: readonly SpeciesSubtype[]; // 如有变体
  readonly darkvision?: number; // 黑暗视觉尺数（如有）
}
