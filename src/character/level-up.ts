// character/level-up.ts
// 角色升级 — 根据DND 2024规则应用等级变化（支持多维职业）
// 对应 HLD §6.2 + S16

import type { AbilityName } from '../types/ability';
import type { Character, CharacterClass, DieType } from '../types/character';
import type { DataLoader } from '../data/loader';
import type { ResetType } from '../types/resource';

import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getHitDieFixedValue, calculateHPIncrement } from '../engine/hp-calculator';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import {
  extractResources,
  getFeaturesAtLevel,
  buildInitialSpells,
  emptyCharacterSpells,
} from './create';
import {
  getMulticlassSpellcasterLevel,
  calculateMulticlassSpellSlots,
} from '../engine/spell-slots';

// ── 公共接口 ────────────────────────────────────────────

export interface LevelUpOptions {
  classId: string; // which class to level (or new class for multiclassing)
  subclassId?: string; // if reached subclass level
  hpChoice: 'fixed' | 'roll'; // HP increment method
  asiOrFeat?: {
    // ASI/Feat choice (at levels 4/8/12/16/19)
    type: 'asi' | 'feat';
    asi?: Partial<Record<AbilityName, number>>;
    featId?: string;
  };
  newSpells?: string[]; // new spells for spellcasters
  // Multiclassing: add a new class
  isNewClass?: boolean; // true if adding a new class (multiclassing)
}

export interface RandomProvider {
  d(max: number): number;
}

// ── 主函数 ──────────────────────────────────────────────

export function levelUp(
  char: Character,
  options: LevelUpOptions,
  data: DataLoader,
  rng?: RandomProvider
): Character {
  // Check if adding a new class (multiclassing)
  if (options.isNewClass) {
    return addNewClass(char, options, data, rng);
  }

  // Validate class exists on character
  const classIdx = char.classes.findIndex(c => c.classId === options.classId);
  if (classIdx === -1) {
    throw new Error(`Class ${options.classId} not found on character`);
  }

  const charClass = char.classes[classIdx]!;
  const newLevel = charClass.level + 1;

  // Validate class exists in data
  const classData = data.getClass(options.classId);
  if (!classData) {
    throw new Error(`Class ${options.classId} not found in data`);
  }

  // 1. Update class level
  const newClasses = char.classes.map((c, i) => {
    if (i === classIdx) {
      return {
        ...c,
        level: newLevel,
        subclassId: options.subclassId ?? c.subclassId,
        subclassLevel: options.subclassId ? newLevel : c.subclassLevel,
        hitDice: { ...c.hitDice },
      };
    }
    return c;
  });

  // 2. HP increase
  const conMod = getModifier(getTotalScore(char.abilityScores, 'Constitution'));
  let hpIncrease: number;
  if (options.hpChoice === 'roll' && rng) {
    hpIncrease = rng.d(getDieMax(classData.hitDie)) + conMod;
  } else {
    hpIncrease = getHitDieFixedValue(classData.hitDie) + conMod;
  }
  hpIncrease = Math.max(1, hpIncrease); // HP increase is at least 1 per level
  const newMaxHP = char.hitPoints.max + hpIncrease;

  // 3. ASI or Feat
  let newAbilityScores = { ...char.abilityScores };
  let newFeats = [...char.feats];
  if (options.asiOrFeat) {
    if (options.asiOrFeat.type === 'asi' && options.asiOrFeat.asi) {
      const newFeatBonuses = { ...newAbilityScores.featBonuses };
      for (const [ability, bonus] of Object.entries(options.asiOrFeat.asi)) {
        if (bonus !== undefined) {
          newFeatBonuses[ability as AbilityName] =
            (newFeatBonuses[ability as AbilityName] ?? 0) + bonus;
        }
      }
      newAbilityScores = { ...newAbilityScores, featBonuses: newFeatBonuses };
    } else if (options.asiOrFeat.type === 'feat' && options.asiOrFeat.featId) {
      newFeats = [...newFeats, options.asiOrFeat.featId];
    }
  }

  // 4. New spells
  let newSpells = { ...char.spells };
  if (options.newSpells && options.newSpells.length > 0) {
    newSpells = {
      ...newSpells,
      knownSpells: [...newSpells.knownSpells, ...options.newSpells],
    };
  }

  // 5. Calculate new total level and proficiency bonus
  const totalLevel = newClasses.reduce((sum, c) => sum + c.level, 0);
  const newProficiencyBonus = getProficiencyBonus(totalLevel);

  // 6. New resources from features at new level (pass PB for scaling resources)
  const levelResources = extractResources(classData, newLevel, newProficiencyBonus);
  const newResources = [...char.resources];
  for (const resource of levelResources) {
    if (!newResources.some(r => r.id === resource.id)) {
      newResources.push(resource);
    }
  }

  // Build result
  let result: Character = {
    ...char,
    classes: newClasses,
    abilityScores: newAbilityScores,
    feats: newFeats,
    spells: newSpells,
    resources: newResources,
    hitPoints: {
      ...char.hitPoints,
      max: newMaxHP,
      current: char.hitPoints.current + hpIncrease,
    },
    combatStats: {
      ...char.combatStats,
      proficiencyBonus: newProficiencyBonus,
    },
    updatedAt: new Date().toISOString(),
  };

  // Cap current HP at max
  result = {
    ...result,
    hitPoints: {
      ...result.hitPoints,
      current: Math.min(result.hitPoints.current, result.hitPoints.max),
    },
  };

  return result;
}

// ── Multiclassing Support ─────────────────────────────────

/**
 * Add a new class to an existing character (multiclassing)
 */
function addNewClass(
  char: Character,
  options: LevelUpOptions,
  data: DataLoader,
  rng?: RandomProvider
): Character {
  // Validate new class exists in data
  const classData = data.getClass(options.classId);
  if (!classData) {
    throw new Error(`Class ${options.classId} not found in data`);
  }

  // Calculate HP for the new class (level 1)
  const conMod = getModifier(getTotalScore(char.abilityScores, 'Constitution'));
  const hpIncrease = getHitDieFixedValue(classData.hitDie) + conMod;
  const newMaxHP = char.hitPoints.max + Math.max(1, hpIncrease);

  // Create new CharacterClass
  const newClass: CharacterClass = {
    classId: options.classId,
    level: 1,
    subclassId: options.subclassId ?? null,
    subclassLevel: options.subclassId ? 1 : null,
    hitDice: { die: classData.hitDie, used: 0 },
  };

  // Add to classes array
  const newClasses = [...char.classes, newClass];

  // Calculate new total level and proficiency bonus
  const totalLevel = newClasses.reduce((sum, c) => sum + c.level, 0);
  const newProficiencyBonus = getProficiencyBonus(totalLevel);

  // Add resources from new class (pass total PB for scaling resources)
  const newResources = [...char.resources];
  const classResources = extractResources(classData, 1, newProficiencyBonus);
  for (const resource of classResources) {
    if (!newResources.some(r => r.id === resource.id)) {
      newResources.push(resource);
    }
  }

  // Handle spellcasting for multiclass
  let newSpells = { ...char.spells };
  const hasSpellcasting = classData.spellcasting;

  if (hasSpellcasting) {
    // Recalculate spell slots using multiclass rules
    const totalSpellcastingLevel = getMulticlassSpellcasterLevel(newClasses, data);

    if (totalSpellcastingLevel > 0) {
      const spellSlots = calculateMulticlassSpellSlots(totalSpellcastingLevel, data);
      const ability = classData.spellcasting?.ability ?? 'Intelligence';
      const abilityMod = getModifier(getTotalScore(char.abilityScores, ability));

      newSpells = {
        ...newSpells,
        spellcastingAbility: ability,
        spellSaveDC: 8 + newProficiencyBonus + abilityMod,
        spellAttackBonus: newProficiencyBonus + abilityMod,
        spellSlots,
      };
    }
  }

  // Build result
  let result: Character = {
    ...char,
    classes: newClasses,
    feats:
      options.asiOrFeat?.type === 'feat' && options.asiOrFeat.featId
        ? [...char.feats, options.asiOrFeat.featId]
        : char.feats,
    spells: newSpells,
    resources: newResources,
    hitPoints: {
      ...char.hitPoints,
      max: newMaxHP,
      current: char.hitPoints.current + Math.max(1, hpIncrease),
    },
    combatStats: {
      ...char.combatStats,
      proficiencyBonus: newProficiencyBonus,
    },
    updatedAt: new Date().toISOString(),
  };

  // Cap current HP at max
  result = {
    ...result,
    hitPoints: {
      ...result.hitPoints,
      current: Math.min(result.hitPoints.current, result.hitPoints.max),
    },
  };

  return result;
}

// ── Helper Functions ────────────────────────────────────

/**
 * 获取骰子最大值
 */
function getDieMax(die: DieType): number {
  const map: Record<DieType, number> = {
    d4: 4,
    d6: 6,
    d8: 8,
    d10: 10,
    d12: 12,
    d20: 20,
  };
  return map[die];
}
