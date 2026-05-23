// types/character.ts
// Character 及其相关类型（零依赖）

import type { DieType } from './dice';
import type { DamageDefenses } from './damage';
import type { BaseAttack } from './attack';
import type { AbilityScores } from './ability';
import type { SkillEntry } from './skill';
import type { CharacterFeatEntry } from './feat';
import type { EquipmentItem } from './equipment';
import type { CharacterSpells } from './spell';
import type { CharacterClassResources } from './resource';
export type { DamageDefenses };

// 角色核心接口 — 所有字段均为 readonly（不可变）
export interface Character {
  readonly schemaVersion: string;
  readonly name: string;
  readonly species: string; // Species.id
  readonly speciesSubtype: string | null; // 物种变体（如 "Mountain Dwarf"）
  readonly background: string; // Background.id
  readonly classes: readonly CharacterClass[]; // 支持多维职业
  readonly abilityScores: AbilityScores;
  readonly skills: Record<string, SkillEntry>;
  readonly feats: readonly CharacterFeatEntry[];
  readonly equipment: readonly EquipmentItem[];
  readonly spells: CharacterSpells;
  // 按职业分类的资源追踪（类似 classSpellcasting 模式）
  readonly resources: Record<string, CharacterClassResources>;
  readonly hitPoints: HitPoints;
  readonly combatStats: CombatStats;
  readonly currency: Currency;
  readonly conditions: readonly ActiveCondition[];
  readonly damageDefenses: DamageDefenses;
  readonly notes: string;
  readonly createdAt: string; // ISO 8601
  readonly updatedAt: string; // ISO 8601
}

// 角色职业条目（支持多维职业）
export interface CharacterClass {
  readonly classId: string; // Class.id
  readonly level: number;
  readonly subclassId: string | null;
  readonly subclassLevel: number | null; // 获得子职业的等级
  readonly hitDice: { readonly die: DieType; readonly used: number };
}

// 生命值
export interface HitPoints {
  readonly max: number;
  readonly current: number;
  readonly temporary: number;
  readonly deathSaves: DeathSaves;
}

// 死亡豁免
export interface DeathSaves {
  readonly successes: number; // 0-3
  readonly failures: number; // 0-3
  readonly isStable: boolean;
}

// 战斗统计（派生值，由 recomputeDerivedStats 计算）
export interface CombatStats {
  readonly AC: number;
  readonly initiative: number;
  readonly speed: number;
  readonly passivePerception: number;
  readonly proficiencyBonus: number;
  readonly attacks: readonly CharacterAttack[];
}

// 角色攻击条目（扩展 BaseAttack，添加 mastery）
export interface CharacterAttack extends BaseAttack {
  readonly mastery: readonly string[]; // Weapon Mastery 属性
}

// 活跃状态（当前施加于角色的状态）
export interface ActiveCondition {
  readonly id: ConditionName;
  readonly source: string; // 来源（如 "Player A", "Hold Person"）
  readonly appliedAt: string; // ISO 8601
  // Exhaustion 专用等级 (1-6)。其他状态忽略此字段；缺省视为 1。
  readonly level?: number;
}

// 状态名称 — 标准 D&D 条件 + 引擎追踪状态
// NOTE: 'Raging' and 'Concentrating' are not standard D&D conditions;
// they are engine-level state trackers mixed in for convenience.
// Future refactor: separate into ConditionName | FeatureState | ActiveEffect.
export type ConditionName =
  | 'Blinded'
  | 'Charmed'
  | 'Deafened'
  | 'Exhaustion' // 特殊：有等级 1-6
  | 'Frightened'
  | 'Grappled'
  | 'Incapacitated'
  | 'Invisible'
  | 'Paralyzed'
  | 'Petrified'
  | 'Poisoned'
  | 'Prone'
  | 'Restrained'
  | 'Raging' // 野蛮人狂暴（激活时生效）
  | 'Stunned'
  | 'Unconscious'
  | 'Concentrating'; // 非官方但需追踪（专注）

// 金币
export interface Currency {
  readonly cp: number; // Copper Piece
  readonly sp: number; // Silver Piece
  readonly ep: number; // Electrum Piece
  readonly gp: number; // Gold Piece
  readonly pp: number; // Platinum Piece
}
