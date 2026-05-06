// character/create.ts
// 角色创建 — 根据参数和规则数据构建完整的1级角色
// 对应 HLD §6.2

import type { AbilityName, AbilityScores } from '../types/ability';
import type { Character, CharacterClass, HitPoints, CombatStats, Currency, DieType } from '../types/character';
import type { SkillEntry, SkillName } from '../types/skill';
import { SKILL_NAMES } from '../types/skill';
import type { CharacterSpells, SpellLevel, SpellSlotEntry, PactMagicSlots } from '../types/spell';
import type { Feature, Class } from '../types/class';
import type { Resource, ResetType } from '../types/resource';
import type { DataLoader } from '../data/loader';

import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { calculateHPAtLevel1 } from '../engine/hp-calculator';
import { calculateAC } from '../engine/ac-calculator';
import { calculateInitiative } from '../engine/initiative';
import { calculatePassivePerception } from '../engine/passive-perception';
import { calculateSpellSlots, calculatePactMagic } from '../engine/spell-slots';
import { calculateAttacks } from '../engine/attack-calculator';

// ── 公共接口 ────────────────────────────────────────────────────

export interface CreateCharacterParams {
  name: string;
  speciesId: string;
  speciesSubtypeId?: string;
  backgroundId: string;
  classId: string;
  abilityScores: Record<AbilityName, number>;
  featIds?: string[];
  skillChoices?: string[];
}

// ── 主函数 ──────────────────────────────────────────────────────

export function createCharacter(
  params: CreateCharacterParams,
  data: DataLoader,
): Character {
  // 1. Validate inputs
  const species = data.getSpecies(params.speciesId);
  if (!species) {
    throw new Error(`Invalid speciesId: "${params.speciesId}" not found in data`);
  }

  const backgroundData = data.getBackground(params.backgroundId);
  if (!backgroundData) {
    throw new Error(`Invalid backgroundId: "${params.backgroundId}" not found in data`);
  }

  const classData = data.getClass(params.classId);
  if (!classData) {
    throw new Error(`Invalid classId: "${params.classId}" not found in data`);
  }

  // 2. Build AbilityScores
  const abilityScores: AbilityScores = {
    base: params.abilityScores,
    racialBonuses: species.abilityBonuses,
    featBonuses: {},
    temporaryBonuses: {},
  };

  // 3. Build CharacterClass
  const charClass: CharacterClass = {
    classId: params.classId,
    level: 1,
    subclassId: null,
    subclassLevel: null,
    hitDice: { die: classData.hitDie, used: 0 },
  };

  // 4. Build Skills
  const skills = buildSkills(
    backgroundData.skillProficiencies,
    classData,
    params.skillChoices ?? [],
  );

  // 5. Calculate HP
  const conMod = getModifier(getTotalScore(abilityScores, 'Constitution'));
  const maxHP = calculateHPAtLevel1(classData.hitDie, conMod);
  const hitPoints: HitPoints = {
    max: maxHP,
    current: maxHP,
    temporary: 0,
    deathSaves: { successes: 0, failures: 0, isStable: false },
  };

  // 6. Build Resources
  const resources = extractResources(classData, 1);

  // 7. Build Spells
  const spells: CharacterSpells = classData.spellcasting
    ? buildInitialSpells(classData, abilityScores, data)
    : emptyCharacterSpells();

  // 8. Calculate CombatStats
  const pb = getProficiencyBonus(1);
  const features = getFeaturesAtLevel(classData, 1);
  const combatStats: CombatStats = {
    AC: calculateAC(abilityScores, [], features, data),
    initiative: calculateInitiative(abilityScores, params.featIds ?? [], features),
    speed: species.speed,
    passivePerception: calculatePassivePerception(abilityScores, skills, pb, []),
    proficiencyBonus: pb,
    attacks: calculateAttacks(abilityScores, [], pb, features, data),
  };

  // 9. Build Currency
  const currency: Currency = {
    cp: 0,
    sp: 0,
    ep: 0,
    gp: backgroundData.startingGold,
    pp: 0,
  };

  // 10. Return complete Character
  const now = new Date().toISOString();
  return {
    schemaVersion: '2024.1',
    name: params.name,
    species: params.speciesId,
    speciesSubtype: params.speciesSubtypeId ?? null,
    background: params.backgroundId,
    classes: [charClass],
    abilityScores,
    skills,
    feats: params.featIds ?? [],
    equipment: [],
    spells,
    resources,
    hitPoints,
    combatStats,
    currency,
    conditions: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

// ── Helper Functions ────────────────────────────────────────────

/**
 * 提取指定等级的特性列表
 */
export function getFeaturesAtLevel(classData: Class, level: number): readonly Feature[] {
  return classData.featuresByLevel.get(level) ?? [];
}

/**
 * 判断某技能是否熟练
 * 来源：背景技能 + 职业特性中的技能 + 用户选择的职业技能
 */
export function isProficient(
  skillName: string,
  backgroundSkillProficiencies: readonly string[],
  classData: Class,
  skillChoices: readonly string[],
): boolean {
  // 背景授予的技能熟练
  if (backgroundSkillProficiencies.includes(skillName)) {
    return true;
  }

  // 职业特性中1级授予的技能熟练
  const features = getFeaturesAtLevel(classData, 1);
  for (const feature of features) {
    if (feature.name === 'Skill Proficiencies' || feature.name === 'Class Skills') {
      // 特性描述中可能包含技能列表，但这里我们依赖 skillChoices
      // 职业特性本身可能包含固定技能（如 Rogue 的 Thieves' Tools）
    }
  }

  // 用户选择的职业技能
  if (skillChoices.includes(skillName)) {
    return true;
  }

  return false;
}

/**
 * 构建所有18个技能的熟练状态
 */
function buildSkills(
  backgroundSkillProficiencies: readonly string[],
  classData: Class,
  skillChoices: readonly string[],
): Record<string, SkillEntry> {
  const skills: Record<string, SkillEntry> = {};
  for (const skillName of SKILL_NAMES) {
    skills[skillName] = {
      proficient: isProficient(skillName, backgroundSkillProficiencies, classData, skillChoices),
      expertise: false,
    };
  }
  return skills;
}

/**
 * 构建施法职业的初始法术数据
 */
export function buildInitialSpells(
  classData: Class,
  abilityScores: AbilityScores,
  data: DataLoader,
): CharacterSpells {
  const spellcasting = classData.spellcasting!;
  const ability = spellcasting.ability;
  const pb = getProficiencyBonus(1);
  const abilityMod = getModifier(getTotalScore(abilityScores, ability));

  const spellSaveDC = 8 + pb + abilityMod;
  const spellAttackBonus = pb + abilityMod;

  // 计算法术位
  const slots = calculateSpellSlots(classData.id, 1, data);
  const spellSlots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
  spellSlots[0] = { total: 0, used: 0 }; // cantrips
  for (let level = 1; level <= 9; level++) {
    spellSlots[level as SpellLevel] = slots[level] ?? { total: 0, used: 0 };
  }

  // Pact Magic (Warlock)
  let pactMagicSlots: PactMagicSlots | null = null;
  if (classData.id === 'Warlock') {
    const pact = calculatePactMagic(1, data);
    if (pact) {
      pactMagicSlots = {
        level: pact.slotLevel,
        total: pact.slots,
        used: 0,
        resetOn: 'Short Rest',
      };
    }
  }

  return {
    spellcastingAbility: ability,
    spellSaveDC,
    spellAttackBonus,
    knownSpells: [],
    preparedSpells: [],
    spellSlots,
    pactMagicSlots,
  };
}

/**
 * 创建空法术数据（非施法职业）
 */
export function emptyCharacterSpells(): CharacterSpells {
  const spellSlots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
  for (let level = 0; level <= 9; level++) {
    spellSlots[level as SpellLevel] = { total: 0, used: 0 };
  }
  return {
    spellcastingAbility: 'Intelligence',
    spellSaveDC: 0,
    spellAttackBonus: 0,
    knownSpells: [],
    preparedSpells: [],
    spellSlots,
    pactMagicSlots: null,
  };
}

/**
 * 从职业特性中提取资源
 */
export function extractResources(classData: Class, level: number): Resource[] {
  const features = getFeaturesAtLevel(classData, level);
  const resources: Resource[] = [];

  for (const feature of features) {
    if (!feature.resourceId) continue;

    // 根据资源ID确定资源属性
    const resource = buildResource(feature.resourceId, level);
    if (resource) {
      resources.push(resource);
    }
  }

  return resources;
}

/**
 * 根据资源ID构建Resource对象
 * 包含2024各职业1级资源的默认值
 */
function buildResource(resourceId: string, level: number): Resource | null {
  // 资源定义表（1级默认值）
  const RESOURCE_DEFS: Record<string, {
    max: number;
    resetOn: ResetType;
    displayName?: string;
  }> = {
    'Second Wind': { max: 1, resetOn: 'Short Rest' as ResetType },
    'Rage': { max: 2, resetOn: 'Long Rest' as ResetType },
    'Lay on Hands': { max: 5, resetOn: 'Long Rest' as ResetType },
    'Bardic Inspiration': { max: 1, resetOn: 'Long Rest' as ResetType },
    'Channel Divinity': { max: 1, resetOn: 'Short Rest' as ResetType },
    'Wild Shape': { max: 2, resetOn: 'Short Rest' as ResetType },
    'Sorcery Points': { max: 1, resetOn: 'Long Rest' as ResetType },
    'Action Surge': { max: 1, resetOn: 'Short Rest' as ResetType },
    'Indomitable': { max: 1, resetOn: 'Long Rest' as ResetType },
    'Focus Points': { max: 1, resetOn: 'Short Rest' as ResetType },
  };

  const def = RESOURCE_DEFS[resourceId];
  if (!def) return null;

  return {
    id: resourceId,
    name: resourceId,
    max: def.max,
    used: 0,
    resetOn: def.resetOn,
    displayName: def.displayName,
  };
}
