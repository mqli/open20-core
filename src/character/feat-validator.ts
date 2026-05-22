// character/feat-validator.ts
// Validates feat prerequisites against character state
// Pure function — returns validation result without modifying state

import type { Character } from '../types/character';
import type { Feat, FeatPrerequisite } from '../types/feat';
import type { DataLoader } from '../data/loader';
import type { AbilityName } from '../types/ability';
import { getTotalScore } from '../engine/ability-modifier';

/**
 * Result of feat prerequisite validation.
 */
export interface FeatValidationResult {
  readonly valid: boolean;
  readonly reasons: readonly string[]; // Reasons why invalid (empty if valid)
}

/**
 * Validates whether a character meets all prerequisites for a feat.
 *
 * Prerequisites checked:
 * - Ability score requirements (e.g., Strength 13+)
 * - Level requirements (e.g., Level 4+)
 * - Class requirements (e.g., must have Fighting Style feature)
 * - Subclass requirements
 * - Species requirements
 *
 * @param char - The character to validate
 * @param feat - The feat to validate
 * @param data - DataLoader for looking up class/feature data
 * @returns Validation result with reasons if invalid
 *
 * @example
 * // Character with Str 14, level 4, Fighter (has Fighting Style)
 * validateFeatPrerequisites(char, archeryFeat, data)  // { valid: true, reasons: [] }
 *
 * // Character with Str 10, level 3
 * validateFeatPrerequisites(char, grapplerFeat, data)  // { valid: false, reasons: [...] }
 */
export function validateFeatPrerequisites(
  char: Character,
  feat: Feat,
  data: DataLoader
): FeatValidationResult {
  const reasons: string[] = [];

  // If no prerequisites, always valid
  if (!feat.prerequisites) {
    return { valid: true, reasons: [] };
  }

  const prereq = feat.prerequisites;

  // 1. Check ability score prerequisites
  if (prereq.ability) {
    for (const [ability, minValue] of Object.entries(prereq.ability)) {
      const totalScore = getTotalAbilityScore(char, ability as AbilityName);
      if (totalScore < (minValue as number)) {
        reasons.push(
          `${ability} score must be at least ${minValue} (current: ${totalScore})`
        );
      }
    }
  }

  // 2. Check level prerequisite
  const totalLevel = char.classes.reduce((sum, c) => sum + c.level, 0);
  if (prereq.level !== undefined && prereq.level > 0) {
    if (totalLevel < prereq.level) {
      reasons.push(`Character level must be at least ${prereq.level} (current: ${totalLevel})`);
    }
  }

  // 3. Check class prerequisite
  if (prereq.classId) {
    const hasClass = char.classes.some(c => c.classId === prereq.classId);
    if (!hasClass) {
      const classData = data.getClass(prereq.classId);
      const className = classData?.name ?? prereq.classId;
      reasons.push(`Must have at least 1 level in ${className}`);
    }
  }

  // 4. Check subclass prerequisite
  if (prereq.subclassId) {
    const hasSubclass = char.classes.some(c => c.subclassId === prereq.subclassId);
    if (!hasSubclass) {
      reasons.push(`Must have the ${prereq.subclassId} subclass`);
    }
  }

  // 5. Check species prerequisite
  if (prereq.species) {
    if (char.species !== prereq.species) {
      reasons.push(`Must be ${prereq.species}`);
    }
  }

  // 6. Check feature prerequisite (e.g., "Fighting Style Feature")
  if (prereq.feature) {
    const hasFeature = checkFeaturePrerequisite(char, prereq.feature, data);
    if (!hasFeature) {
      reasons.push(`Must have the ${prereq.feature} feature`);
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Gets the total ability score (base + racial + background + feats + temporary).
 */
function getTotalAbilityScore(char: Character, ability: AbilityName): number {
  return getTotalScore(char.abilityScores, ability);
}

/**
 * Checks if a character has a specific feature (by name).
 * Used for prerequisites like "Fighting Style Feature".
 */
function checkFeaturePrerequisite(
  char: Character,
  featureName: string,
  data: DataLoader
): boolean {
  // Check all classes and their features
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData) continue;

    // Check features at current level and below
    for (const levelFeatures of classData.featuresByLevel) {
      if (levelFeatures.level <= charClass.level) {
        for (const feature of levelFeatures.features) {
          if (feature.name === featureName) {
            return true;
          }
        }
      }
    }
  }

  // Also check subclass features
  for (const charClass of char.classes) {
    if (!charClass.subclassId) continue;

    const subclass = data.getSubclass(charClass.subclassId);
    if (!subclass) continue;

    for (const levelFeatures of subclass.featuresByLevel) {
      if (levelFeatures.level <= charClass.level) {
        for (const feature of levelFeatures.features) {
          if (feature.name === featureName) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Checks if a feat can be taken multiple times (repeatable).
 *
 * @param char - The character
 * @param feat - The feat to check
 * @returns True if the feat is repeatable or not yet taken
 */
export function canTakeFeat(
  char: Character,
  feat: Feat
): boolean {
  // If feat is not in character's feat list, can take it
  if (!char.feats.some(f => f.featId === feat.id)) {
    return true;
  }

  // If feat is already taken, can only take again if repeatable
  return feat.repeatable === true;
}
