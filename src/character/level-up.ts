// character/level-up.ts
// 角色升级 — 根据DND 2024规则应用等级变化（支持多维职业）
// 对应 HLD §6.2 + S16

import type { AbilityName } from '../types/ability';
import type { Character, CharacterClass } from '../types/character';
import type { ClassSpellData } from '../types/spell';
import type { DataLoader } from '../data/loader';
import type { DieType } from '../types/dice';

import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getHitDieFixedValue } from '../engine/hp-calculator';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { recomputeResources } from './resource-builder';
import { recomputeDerivedStats } from './recompute';
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
  const hpIncrease = calcHPIncrease(classData.hitDie, conMod, options, rng);
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
      newFeats = [...newFeats, { featId: options.asiOrFeat.featId }];
    }
  }

  // 4. New spells (per-class tracking)
  let newSpells = { ...char.spells };
  if (options.newSpells && options.newSpells.length > 0) {
    const classId = options.classId;
    const existing = newSpells.classSpellcasting[classId];

    // Build updated class spell data
    const ability = classData.spellcasting?.ability ?? 'Intelligence';
    const updatedSpellData: ClassSpellData = existing
      ? {
          ...existing,
          knownSpells: [...existing.knownSpells, ...options.newSpells],
        }
      : {
          classId,
          spellcastingAbility: ability,
          spellSaveDC: 0,
          spellAttackBonus: 0,
          knownCantrips: [],
          maxCantripsKnown: 0,
          knownSpells: options.newSpells,
          preparedSpells: [],
          alwaysPreparedSpells: [],
          maxPrepared: 0,
        };

    newSpells = {
      ...newSpells,
      classSpellcasting: {
        ...newSpells.classSpellcasting,
        [classId]: updatedSpellData,
      },
    };
  }

  // 5. Calculate new total level and proficiency bonus
  const totalLevel = newClasses.reduce((sum, c) => sum + c.level, 0);
  const newProficiencyBonus = getProficiencyBonus(totalLevel);

  // 6. Recompute resources for this class (per-class model)
  const newResources = recomputeResources(
    char.resources,
    newClasses,
    newAbilityScores,
    data,
  );

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

  // Recompute derived stats (AC, initiative, perception, attacks, spell DCs, ...).
  // Preserve hitPoints because recompute uses the fixed-die HP formula and would
  // clobber rolled HP from this level-up.
  const recomputed = recomputeDerivedStats(result, data);
  return { ...recomputed, hitPoints: result.hitPoints };
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

  // Calculate HP for the new class (level 1).
  // Multiclass rules: subsequent classes use average/rolled HP, not max (PHB 2024 p.43-44).
  const conMod = getModifier(getTotalScore(char.abilityScores, 'Constitution'));
  const hpIncrease = calcHPIncrease(classData.hitDie, conMod, options, rng);
  const newMaxHP = char.hitPoints.max + hpIncrease;

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

  // Recompute resources with per-class model (preserves used counts from existing classes)
  // Note: addNewClass doesn't apply feat grants (done in recomputeDerivedStats)
  const newResources = recomputeResources(char.resources, newClasses, char.abilityScores, data);

  // Handle spellcasting for multiclass (per-class tracking)
  let newSpells = { ...char.spells };
  const hasSpellcasting = classData.spellcasting;

  if (hasSpellcasting) {
    // Recalculate spell slots using multiclass rules
    const totalSpellcastingLevel = getMulticlassSpellcasterLevel(newClasses, data);

    if (totalSpellcastingLevel > 0) {
      const spellSlots = calculateMulticlassSpellSlots(totalSpellcastingLevel, data);
      const ability = classData.spellcasting?.ability ?? 'Intelligence';
      const abilityMod = getModifier(getTotalScore(char.abilityScores, ability));

      // Update or create class spell data
      const classId = options.classId;
      const existing = newSpells.classSpellcasting[classId];

      // Build updated spell data (avoid union type issue)
      const updatedSpellData: ClassSpellData = existing
        ? {
            ...existing,
            spellcastingAbility: ability,
            spellSaveDC: 8 + newProficiencyBonus + abilityMod,
            spellAttackBonus: newProficiencyBonus + abilityMod,
          }
        : {
            classId,
            spellcastingAbility: ability,
            spellSaveDC: 8 + newProficiencyBonus + abilityMod,
            spellAttackBonus: newProficiencyBonus + abilityMod,
            knownCantrips: [],
            maxCantripsKnown: 0,
            knownSpells: [],
            preparedSpells: [],
            alwaysPreparedSpells: [],
            maxPrepared: 0,
          };

      newSpells = {
        ...newSpells,
        classSpellcasting: {
          ...newSpells.classSpellcasting,
          [classId]: updatedSpellData,
        },
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
        ? [...char.feats, { featId: options.asiOrFeat.featId }]
        : char.feats,
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

  // Recompute derived stats; preserve hitPoints (see levelUp above).
  const recomputed = recomputeDerivedStats(result, data);
  return { ...recomputed, hitPoints: result.hitPoints };
}

// ── Helper Functions ────────────────────────────────────

/**
 * Calculate HP increase for one level-up, shared by levelUp and addNewClass.
 * HP increase minimum is 1 per level (PHB 2024 p.38).
 */
function calcHPIncrease(
  die: DieType,
  conMod: number,
  options: LevelUpOptions,
  rng?: RandomProvider
): number {
  let increase: number;
  if (options.hpChoice === 'roll' && rng) {
    increase = rng.d(getDieMax(die)) + conMod;
  } else {
    increase = getHitDieFixedValue(die) + conMod;
  }
  return Math.max(1, increase);
}

/**
 * 获取骰子最大值
 */
export function getDieMax(die: DieType): number {
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
