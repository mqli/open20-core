// character/mutate/conditions.ts
// Condition and concentration-related character mutations

import type { Character, ConditionName, ActiveCondition } from '../../types/character';
import type { DataLoader } from '../../data/loader';
import type { RandomProvider } from '../../dice/core';
import type { ConcentrationCheckResult } from '../../engine/concentration';
import { isConcentrating, calculateConcentrationDC } from '../../engine/concentration';
import { getModifier, getTotalScore } from '../../engine/ability-modifier';
import { rollSavingThrow } from '../../dice/mechanics';
import { withUpdate } from './hp';

export function toggleCondition(char: Character, conditionId: ConditionName): Character {
  const existingIdx = char.conditions.findIndex(c => c.id === conditionId);

  if (existingIdx !== -1) {
    // Remove existing condition
    const newConditions = char.conditions.filter((_, i) => i !== existingIdx);
    return withUpdate(char, { conditions: newConditions });
  }

  // Add new condition
  const newCondition: ActiveCondition = {
    id: conditionId,
    source: '',
    appliedAt: new Date().toISOString(),
  };

  return withUpdate(char, {
    conditions: [...char.conditions, newCondition],
  });
}

export function startConcentration(char: Character, spellId: string): Character {
  // End any existing concentration first
  let updated = char;
  if (isConcentrating(char)) {
    updated = endConcentration(char);
  }

  // Add Concentrating condition with spell ID as source
  const newCondition: ActiveCondition = {
    id: 'Concentrating',
    source: spellId,
    appliedAt: new Date().toISOString(),
  };

  return withUpdate(updated, {
    conditions: [...updated.conditions, newCondition],
  });
}

export function endConcentration(char: Character): Character {
  const conditionIdx = char.conditions.findIndex(c => c.id === 'Concentrating');
  if (conditionIdx === -1) return char;

  return withUpdate(char, {
    conditions: char.conditions.filter((_, i) => i !== conditionIdx),
  });
}

export function makeConcentrationCheck(
  char: Character,
  damageAmount: number,
  data: DataLoader,
  rng: RandomProvider
): { char: Character; result: ConcentrationCheckResult } {
  // Calculate DC
  const dc = calculateConcentrationDC(damageAmount);

  // Get Constitution modifier using shared utility (respects all bonus sources)
  const conMod = getModifier(getTotalScore(char.abilityScores, 'Constitution'));

  // Check if proficient in Constitution saves
  let isProficient = false;
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData?.savingThrowProficiencies.includes('Constitution')) {
      isProficient = true;
      break;
    }
  }

  // Roll the save
  const check = rollSavingThrow({
    abilityMod: conMod,
    proficiencyBonus: isProficient ? char.combatStats.proficiencyBonus : 0,
    isProficient,
    dc,
    rng,
  });

  // If failed, end concentration
  let updatedChar = char;
  if (!check.success) {
    updatedChar = endConcentration(char);
  }

  return {
    char: updatedChar,
    result: {
      check,
      dc,
      maintained: check.success ?? false,
    },
  };
}
