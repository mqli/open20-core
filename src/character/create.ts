// character/create.ts
// 角色创建 — 根据参数和规则数据构建完整的角色（支持多维职业）
// 对应 HLD §6.2

import type { AbilityName, AbilityScores } from '../types/ability';
import type { SkillEntry } from '../types/skill';
import type {
  Character,
  CharacterClass,
  HitPoints,
  CombatStats,
  Currency,
  DamageDefenses,
} from '../types/character';
import type { CharacterSpells, ClassSpellData, SpellLevel, SpellSlotEntry, PactMagicSlots } from '../types/spell';
import type { Feature, Class } from '../types/class';
import type { Resource } from '../types/resource';
import { ResetType } from '../types/resource';
import type { DataLoader } from '../data/loader';

import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { SKILL_NAMES } from '../types/skill';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { calculateHPAtLevel1, calculateHPIncrement } from '../engine/hp-calculator';
import { calculateAC } from '../engine/ac-calculator';
import { calculateInitiative } from '../engine/initiative';
import { calculatePassivePerception } from '../engine/passive-perception';
import {
  calculateSpellSlots,
  calculatePactMagic,
  getMulticlassSpellcasterLevel,
  calculateMulticlassSpellSlots,
} from '../engine/spell-slots';
import { calculateAttacks } from '../engine/attack-calculator';

// ── 公共接口 ────────────────────────────────────────────

export interface CreateCharacterParams {
  name: string;
  speciesId: string;
  speciesSubtypeId?: string;
  backgroundId: string;
  classId: string;
  /** Level for primary class (defaults to 1, useful for multiclass creation) */
  classLevel?: number;
  /** Subclass ID (e.g., 'Champion', 'Eldritch Knight') - defaults to none */
  subclassId?: string;
  abilityScores: Record<AbilityName, number>;
  featIds?: string[];
  skillChoices?: string[];
  // Multiclassing support (optional)
  additionalClasses?: Array<{
    classId: string;
    level: number;
    subclassId?: string;
  }>;
}

// ── 主函数 ──────────────────────────────────────────────

export function createCharacter(params: CreateCharacterParams, data: DataLoader): Character {
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

  // Validate additional classes (multiclassing)
  const additionalClasses = params.additionalClasses ?? [];
  for (const additional of additionalClasses) {
    const additionalClassData = data.getClass(additional.classId);
    if (!additionalClassData) {
      throw new Error(`Invalid classId: "${additional.classId}" not found in data`);
    }
  }

  // 2. Build AbilityScores
  const abilityScores: AbilityScores = {
    base: params.abilityScores,
    racialBonuses: species.abilityBonuses,
    featBonuses: {},
    temporaryBonuses: {},
  };

  // 3. Build CharacterClass array
  const primaryLevel = params.classLevel ?? 1;
  const charClasses: CharacterClass[] = [
    {
      classId: params.classId,
      level: primaryLevel,
      subclassId: params.subclassId ?? null,
      subclassLevel: params.subclassId ? primaryLevel : null,
      hitDice: { die: classData.hitDie, used: 0 },
    },
    ...additionalClasses.map(ac => {
      const acData = data.getClass(ac.classId)!;
      return {
        classId: ac.classId,
        level: ac.level,
        subclassId: ac.subclassId ?? null,
        subclassLevel: ac.subclassId ? ac.level : null,
        hitDice: { die: acData.hitDie, used: 0 },
      };
    }),
  ];

  // Calculate total level
  const totalLevel = charClasses.reduce((sum, c) => sum + c.level, 0);

  // 4. Build Skills (use primary class for skill proficiencies)
  const skills = buildSkills(
    backgroundData.skillProficiencies,
    classData,
    params.skillChoices ?? []
  );

  // 5. Calculate HP (sum from all classes)
  const conMod = getModifier(getTotalScore(abilityScores, 'Constitution'));
  let maxHP = calculateHPAtLevel1(classData.hitDie, conMod);

  // Additional levels for primary class
  for (let lv = 2; lv <= primaryLevel; lv++) {
    maxHP += calculateHPIncrement(classData.hitDie, conMod);
  }

  // Add HP from additional classes
  for (const additional of additionalClasses) {
    const acData = data.getClass(additional.classId)!;
    // First level of each additional class: max hit die + Con mod
    maxHP += calculateHPAtLevel1(acData.hitDie, conMod);
    // Additional levels: fixed value + Con mod for each level beyond 1
    for (let lv = 2; lv <= additional.level; lv++) {
      maxHP += calculateHPIncrement(acData.hitDie, conMod);
    }
  }

  const hitPoints: HitPoints = {
    max: maxHP,
    current: maxHP,
    temporary: 0,
    deathSaves: { successes: 0, failures: 0, isStable: false },
  };

  // 6. Build Resources (extract from all classes)
  // 计算熟练加值用于资源数量（某些资源如Action Surge随PB变化）
  const pb = getProficiencyBonus(totalLevel);
  let resources: Resource[] = extractResources(classData, primaryLevel, pb);
  for (const additional of additionalClasses) {
    const acData = data.getClass(additional.classId)!;
    // 多职业时使用总等级计算PB
    const additionalPB = getProficiencyBonus(additional.level);
    const additionalResources = extractResources(acData, additional.level, additionalPB);
    resources = [...resources, ...additionalResources];
  }

  // 7. Build Spells (handle multiclass spell slots)
  let spells: CharacterSpells;

  if (primaryLevel === 1 && !additionalClasses.length) {
    // Single class level 1
    spells = classData.spellcasting
      ? buildInitialSpells(classData, abilityScores, data)
      : emptyCharacterSpells();
  } else {
    // Multiclassing - calculate spell slots using multiclass rules
    spells = buildMulticlassSpells(charClasses, abilityScores, data);
  }

  // 8. Calculate CombatStats (pb already calculated above for resources)
  const allFeatures = gatherAllFeatures(charClasses, data);

  // Compute weapon proficiencies from classes
  const weaponProficiencies = new Set<string>();
  for (const c of charClasses) {
    const classData = data.getClass(c.classId);
    if (classData && classData.weaponProficiencies) {
      for (const wp of classData.weaponProficiencies) {
        weaponProficiencies.add(wp);
      }
    }
  }

  const combatStats: CombatStats = {
    AC: calculateAC(abilityScores, [], allFeatures, data, []),
    initiative: calculateInitiative(abilityScores, params.featIds ?? [], allFeatures),
    speed: species.speed,
    passivePerception: calculatePassivePerception(abilityScores, skills, pb, []),
    proficiencyBonus: pb,
    attacks: calculateAttacks(
      abilityScores,
      [],
      pb,
      allFeatures,
      data,
      Array.from(weaponProficiencies)
    ),
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
  const emptyDamageDefenses: DamageDefenses = {
    resistances: [],
    immunities: [],
    vulnerabilities: [],
  };
  return {
    schemaVersion: '2024.1',
    name: params.name,
    species: params.speciesId,
    speciesSubtype: params.speciesSubtypeId ?? null,
    background: params.backgroundId,
    classes: charClasses,
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
    damageDefenses: emptyDamageDefenses,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

// ── Helper Functions ──────────────────────────────────────────

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
  skillChoices: readonly string[]
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
  skillChoices: readonly string[]
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
 * 构建施法职业的初始法术数据（每职业追踪）
 */
export function buildInitialSpells(
  classData: Class,
  abilityScores: AbilityScores,
  data: DataLoader
): CharacterSpells {
  const spellcasting = classData.spellcasting!;
  const ability = spellcasting.ability;
  const pb = getProficiencyBonus(1);
  const abilityMod = getModifier(getTotalScore(abilityScores, ability));

  const spellSaveDC = 8 + pb + abilityMod;
  const spellAttackBonus = pb + abilityMod;

  // Auto-populate knownSpells for class_list casters (Cleric, Druid)
  // They automatically know ALL spells on their class list
  let knownSpells: readonly string[] = [];
  if (spellcasting.type === 'preparation' && spellcasting.knownSource === 'class_list') {
    knownSpells = data.getAllSpells()
      .filter(s => s.classes?.includes(classData.id))
      .map(s => s.id);
  }

  // 构建该职业的法术数据
  const classSpellData: ClassSpellData = {
    classId: classData.id,
    spellcastingAbility: ability,
    spellSaveDC,
    spellAttackBonus,
    knownSpells,
    preparedSpells: [],
    alwaysPreparedSpells: [],
    maxPrepared: 1 + abilityMod, // 1级 + 调整值
  };

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
    classSpellcasting: { [classData.id]: classSpellData },
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
    classSpellcasting: {},
    spellSlots,
    pactMagicSlots: null,
  };
}

/**
 * 从职业特性中提取资源
 * @param classData - 职业数据
 * @param level - 职业等级（会提取1到该等级的所有资源特性）
 * @param proficiencyBonus - 熟练加值（用于计算资源数量）
 */
export function extractResources(classData: Class, level: number, proficiencyBonus?: number): Resource[] {
  const resources: Resource[] = [];

  // 收集从1级到指定等级的所有资源特性
  for (let lv = 1; lv <= level; lv++) {
    const features = getFeaturesAtLevel(classData, lv);

    for (const feature of features) {
      if (!feature.resourceId) continue;

      // 避免重复添加相同资源（如果低等级已有该资源）
      if (resources.some(r => r.id === feature.resourceId)) continue;

      // 根据特性定义构建资源（优先使用特性中的定义，否则使用RESOURCE_DEFS）
      const resource = buildResource(feature, level, proficiencyBonus);
      if (resource) {
        resources.push(resource);
      }
    }
  }

  return resources;
}

/**
 * 根据特性中的资源定义构建Resource对象
 * 优先使用特性中定义的资源属性，否则回退到RESOURCE_DEFS
 */
function buildResource(feature: Feature, level: number, proficiencyBonus?: number): Resource | null {
  const resourceId = feature.resourceId!;

  // 资源默认值表（当特性中未定义时使用）
  // scaleWithPBByDefault: 某些资源即使特性中未标记，也默认随PB变化（如2024 PHB的Second Wind）
  const RESOURCE_DEFS: Record<string, { max: number; resetOn: ResetType; scaleWithPBByDefault?: boolean }> = {
    'Second Wind': { max: 1, resetOn: ResetType.ShortRest, scaleWithPBByDefault: true },
    Rage: { max: 2, resetOn: ResetType.LongRest },
    'Lay on Hands': { max: 5, resetOn: ResetType.LongRest },
    'Bardic Inspiration': { max: 1, resetOn: ResetType.LongRest },
    'Channel Divinity': { max: 1, resetOn: ResetType.ShortRest },
    'Wild Shape': { max: 2, resetOn: ResetType.ShortRest },
    'Sorcery Points': { max: 1, resetOn: ResetType.LongRest },
    'Focus Points': { max: 1, resetOn: ResetType.ShortRest },
    'Action Surge': { max: 1, resetOn: ResetType.ShortRest, scaleWithPBByDefault: true },
    Indomitable: { max: 1, resetOn: ResetType.LongRest, scaleWithPBByDefault: true },
  };

  // 计算熟练加值
  const pb = proficiencyBonus ?? (2 + Math.floor((level - 1) / 4));

  // 查找资源默认值
  const def = RESOURCE_DEFS[resourceId];
  if (!def) {
    // 未知资源，跳过
    return null;
  }

  // 优先使用特性中定义的资源属性，否则使用默认值
  const max = feature.resourceMax !== undefined ? feature.resourceMax : def.max;
  const resetOn = feature.resourceResetOn ?? def.resetOn;

  // 判断是否随PB变化：
  // 1. 特性中显式定义 resourceScaleWithPB
  // 2. 或者默认值标记 scaleWithPBByDefault
  const scaleWithPB = feature.resourceScaleWithPB ?? def.scaleWithPBByDefault ?? false;
  const finalMax = scaleWithPB ? pb : max;

  return {
    id: resourceId,
    name: resourceId,
    max: finalMax,
    used: 0,
    resetOn,
  };
}

// ── Helper Functions for Multiclassing ─────────────────────────

/** Gather all features from all classes */
function gatherAllFeatures(classes: CharacterClass[], data: DataLoader): Feature[] {
  const features: Feature[] = [];
  for (const charClass of classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData) continue;

    for (let lv = 1; lv <= charClass.level; lv++) {
      features.push(...getFeaturesAtLevel(classData, lv));
    }

    // Add subclass features
    if (charClass.subclassId) {
      const subclass = data.getSubclass(charClass.subclassId);
      if (subclass) {
        for (let lv = 1; lv <= charClass.level; lv++) {
          const subFeatures = subclass.featuresByLevel.get(lv);
          if (subFeatures) features.push(...subFeatures);
        }
      }
    }
  }
  return features;
}

/** Build spells for multiclass characters (per-class tracking) */
function buildMulticlassSpells(
  classes: CharacterClass[],
  abilityScores: AbilityScores,
  data: DataLoader
): CharacterSpells {
  // Check if any class is a spellcaster
  const hasSpellcaster = classes.some(c => {
    const classData = data.getClass(c.classId);
    return classData?.spellcasting;
  });

  if (!hasSpellcaster) {
    return emptyCharacterSpells();
  }

  const totalLevel = classes.reduce((sum, c) => sum + c.level, 0);
  const pb = getProficiencyBonus(totalLevel);
  const classSpellcasting: Record<string, ClassSpellData> = {};

  // Build per-class spell data
  for (const charClass of classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData?.spellcasting) continue;

    const ability = classData.spellcasting.ability;
    const abilityMod = getModifier(getTotalScore(abilityScores, ability));
    const spellSaveDC = 8 + pb + abilityMod;
    const spellAttackBonus = pb + abilityMod;

    // Auto-populate knownSpells for class_list casters (Cleric, Druid)
    // They automatically know ALL spells on their class list
    let knownSpells: readonly string[] = [];
    if (classData.spellcasting.type === 'preparation' && classData.spellcasting.knownSource === 'class_list') {
      knownSpells = data.getAllSpells()
        .filter(s => s.classes?.includes(charClass.classId))
        .map(s => s.id);
    }

    classSpellcasting[charClass.classId] = {
      classId: charClass.classId,
      spellcastingAbility: ability,
      spellSaveDC,
      spellAttackBonus,
      knownSpells,
      preparedSpells: [],
      alwaysPreparedSpells: [],
      maxPrepared: charClass.level + abilityMod,
    };
  }

  // Calculate multiclass spell slots (unified pool)
  const totalSpellcastingLevel = getMulticlassSpellcasterLevel(classes, data);
  const spellSlots = totalSpellcastingLevel > 0
    ? calculateMulticlassSpellSlots(totalSpellcastingLevel, data)
    : createEmptySpellSlots();

  // Handle Warlock Pact Magic
  let pactMagicSlots: PactMagicSlots | null = null;
  const warlockClass = classes.find(c => c.classId === 'Warlock');
  if (warlockClass) {
    const pact = calculatePactMagic(warlockClass.level, data);
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
    classSpellcasting,
    spellSlots,
    pactMagicSlots,
  };
}

/** Create empty spell slots record */
function createEmptySpellSlots(): Record<SpellLevel, SpellSlotEntry> {
  const slots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
  for (let level = 0; level <= 9; level++) {
    slots[level as SpellLevel] = { total: 0, used: 0 };
  }
  return slots;
}
