// types/index.ts
// Barrel export — 公共类型API

// 核心类型
export type { Character, CharacterClass } from './character';
export type { HitPoints, DeathSaves } from './character';
export type { CombatStats, CharacterAttack, ActiveCondition } from './character';
export type { ConditionName, Currency } from './character';

// 攻击类型
export type { BaseAttack } from './attack';

// 怪物类型
export type { MonsterSize, MonsterType, ChallengeRating } from './monster';
export type { MonsterAttack } from './monster';
export type { InitiativeInfo, SensesInfo, ChallengeRatingInfo } from './monster';
export type { AttackNotation, SavingThrowEffect, MonsterSpellcasting } from './monster';

// 骰子类型 (canonical source: ../dice/core.ts)
export type { DieType } from '../dice';

// 伤害类型
export type { DamageType, DamageDefenses, DamageDefenseSource, DamageResult, DamageEntry } from './damage';

// 属性
export type { AbilityName, AbilityScores } from './ability';
export { ABILITY_NAMES } from './ability';

// 物种
export type { Species, SpeciesTrait, SpeciesGrant, SpeciesSubtype } from './species';

// 背景
export type { Background } from './background';

// 职业
export type { Class, Subclass, Feature, Spellcasting } from './class';

// 技能
export type { SkillName, SkillEntry } from './skill';
export { SKILL_NAMES, SKILL_ABILITY_MAP } from './skill';

// 专长
export type { Feat, FeatCategory, FeatPrerequisite, FeatGrant } from './feat';

// 装备
export type { EquipmentItem, Weapon, WeaponDamage, WeaponRange, WeaponProperty } from './equipment';
export type { Armor } from './equipment';
export type { GearItem } from './equipment';
export type { WeaponMasteryProperty } from './equipment';

// 法术
export type { Spell, SpellSlotEntry, PactMagicSlots, CharacterSpells } from './spell';
export type { AlwaysPreparedSpells, ClassSpellData } from './spell';
export type { SpellLevel, SpellSchool, CastingTime, SpellComponent } from './spell';

// 资源
export type { Resource, ResetType } from './resource';
