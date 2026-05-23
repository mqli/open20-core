// character/create.ts
// 角色创建 — 根据参数和规则数据构建完整的角色（支持多维职业）
// 对应 HLD §6.2
//
// 设计：只构建核心身份/来源数据，所有派生属性交给 recomputeDerivedStats 计算。

import type { AbilityName, AbilityScores } from '../types/ability';
import type { SkillEntry } from '../types/skill';
import type {
  Character,
  CharacterClass,
  Currency,
  DamageDefenses,
} from '../types/character';
import type { Class } from '../types/class';
import type { DataLoader } from '../data/loader';

import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { emptyCharacterSpells } from './spells-init';
import { recomputeDerivedStats } from './recompute';
import { extractAllClassResources } from './resource-builder';

// Re-export for backward compatibility (tests import from create.ts)
export { getFeaturesAtLevel, getAlwaysPreparedSpellsFromSubclass } from './utils';
export { extractAllClassResources } from './resource-builder';
export { emptyCharacterSpells } from './spells-init';

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
  if (!species) throw new Error(`Invalid speciesId: "${params.speciesId}" not found in data`);

  const backgroundData = data.getBackground(params.backgroundId);
  if (!backgroundData) throw new Error(`Invalid backgroundId: "${params.backgroundId}" not found in data`);

  const classData = data.getClass(params.classId);
  if (!classData) throw new Error(`Invalid classId: "${params.classId}" not found in data`);

  // Validate additional classes (multiclassing)
  const additionalClasses = params.additionalClasses ?? [];
  for (const additional of additionalClasses) {
    if (!data.getClass(additional.classId)) {
      throw new Error(`Invalid classId: "${additional.classId}" not found in data`);
    }
  }

  // 2. Build AbilityScores (featGrants computed by recomputeDerivedStats)
  const abilityScores: AbilityScores = {
    base: params.abilityScores,
    racialBonuses: species.abilityBonuses,
    backgroundBonuses: {},
    featBonuses: {},
    featGrants: {},
    temporaryBonuses: {},
  };

  // 3. Build CharacterClass array
  const primaryLevel = params.classLevel ?? 1;
  const charClasses: CharacterClass[] = [
    {
      classId: params.classId,
      level: primaryLevel,
      subclassId: params.subclassId ?? null,
      // subclassLevel: the level at which this subclass was chosen/assigned.
      // When creating a character above level 1, the subclass was actually
      // unlocked at an earlier level (e.g., level 3 for most 2024 PHB classes),
      // but we record the creation level since the exact unlock level depends
      // on the class and is not needed for any computation.
      subclassLevel: params.subclassId ? primaryLevel : null,
      hitDice: { die: classData.hitDie, used: 0 },
    },
    ...additionalClasses.map(ac => ({
      classId: ac.classId,
      level: ac.level,
      subclassId: ac.subclassId ?? null,
      subclassLevel: ac.subclassId ? ac.level : null,
      hitDice: { die: data.getClass(ac.classId)!.hitDie, used: 0 },
    })),
  ];

  const totalLevel = charClasses.reduce((sum, c) => sum + c.level, 0);
  const pb = getProficiencyBonus(totalLevel);

  // 4. Build Skills (not handled by recompute — set at creation/level-up)
  const skills = buildSkills(
    backgroundData.skillProficiencies,
    classData,
    params.skillChoices ?? []
  );

  // 5. Build Resources (per-class tracking, same pattern as classSpellcasting)
  const resources = extractAllClassResources(charClasses, abilityScores, data);

  // 6. Build Currency
  const currency: Currency = {
    cp: 0, sp: 0, ep: 0,
    gp: backgroundData.startingGold,
    pp: 0,
  };

  // 7. Empty defaults (recomputeDerivedStats will fill these)
  const emptyDamageDefenses: DamageDefenses = {
    resistances: [], immunities: [], vulnerabilities: [],
  };

  const now = new Date().toISOString();

  // Build character with minimal data — recompute fills all derived stats
  const partialChar: Character = {
    schemaVersion: '2024.1',
    name: params.name,
    species: params.speciesId,
    speciesSubtype: params.speciesSubtypeId ?? null,
    background: params.backgroundId,
    classes: charClasses,
    abilityScores,
    skills,
    feats: (params.featIds ?? []).map(featId => ({ featId })),
    equipment: [],
    spells: emptyCharacterSpells(),
    resources,  // Record<string, CharacterClassResources>
    hitPoints: {
      max: 0, current: 0, temporary: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
    combatStats: {
      AC: 10, initiative: 0, speed: species.speed,
      passivePerception: 10, proficiencyBonus: pb, attacks: [],
    },
    currency,
    conditions: [],
    damageDefenses: emptyDamageDefenses,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };

  // Single source of truth for all derived stats
  const char = recomputeDerivedStats(partialChar, data);
  // Set current HP to max on creation (recompute never heals)
  return {
    ...char,
    hitPoints: {
      ...char.hitPoints,
      current: char.hitPoints.max,
    },
  };
}

// ── Helper Functions ──────────────────────────────────────────

/**
 * 判断某技能是否熟练
 * 来源：背景技能 + 职业特性中的技能 + 用户选择的职业技能
 */
export function isProficient(
  skillName: string,
  backgroundSkillProficiencies: readonly string[],
  _classData: Class,
  skillChoices: readonly string[]
): boolean {
  if (backgroundSkillProficiencies.includes(skillName)) return true;

  // TODO: Parse feature.grantedSkills or similar field when Feature type supports it
  // Currently, class features that grant fixed skill proficiencies are not auto-detected.
  // The caller must pass them via skillChoices.

  if (skillChoices.includes(skillName)) return true;
  return false;
}

/** 构建所有18个技能的熟练状态 */
function buildSkills(
  backgroundSkillProficiencies: readonly string[],
  classData: Class,
  skillChoices: readonly string[]
): Record<string, SkillEntry> {
  const skills: Record<string, SkillEntry> = {};
  for (const skillName of ['Athletics', 'Acrobatics', 'Animal Handling',
    'Arcana', 'Deception', 'History', 'Insight', 'Intimidation',
    'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance',
    'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival']) {
    skills[skillName] = {
      proficient: isProficient(skillName, backgroundSkillProficiencies, classData, skillChoices),
      expertise: false,
    };
  }
  return skills;
}
