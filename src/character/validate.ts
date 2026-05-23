// character/validate.ts
// Character validation — checks a Character for rule violations
// Returns structured errors/warnings without throwing

import type { Character } from '../types/character';
import { ABILITY_NAMES } from '../types/ability';
import type { DataLoader } from '../data/loader';
import type { SpellLevel } from '../types/spell';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a Character against DND 2024 rules (MVP).
 *
 * Validation rules:
 * 1. Name must not be empty
 * 2. Species must exist in DataLoader
 * 3. Background must exist in DataLoader
 * 4. Each class must exist in DataLoader
 * 5. Each class level must be >= 1 and <= 20
 * 6. Each base ability must be between 1 and 30 (warning if < 8 or > 15)
 * 7. Total level (sum of all class levels) must be <= 20
 * 8. HP: current must be between 0 and max, max must be > 0
 * 9. Resources: used must be between 0 and max
 * 10. Spell slots: used must be between 0 and total for each level
 * 11. Feats: each feat ID must exist in DataLoader (warning if not found)
 */
export function validateCharacter(char: Character, data: DataLoader): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Name
  if (!char.name || char.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Name must not be empty',
      severity: 'error',
    });
  }

  // 2. Species
  if (!data.getSpecies(char.species)) {
    errors.push({
      field: 'species',
      message: `Species "${char.species}" not found in data`,
      severity: 'error',
    });
  }

  // 3. Background
  if (!data.getBackground(char.background)) {
    errors.push({
      field: 'background',
      message: `Background "${char.background}" not found in data`,
      severity: 'error',
    });
  }

  // 4 & 5. Classes
  let totalLevel = 0;
  for (let i = 0; i < char.classes.length; i++) {
    const charClass = char.classes[i]!;

    if (!data.getClass(charClass.classId)) {
      errors.push({
        field: `classes[${i}].classId`,
        message: `Class "${charClass.classId}" not found in data`,
        severity: 'error',
      });
    }

    if (charClass.level < 1) {
      errors.push({
        field: `classes[${i}].level`,
        message: `Class level must be >= 1, got ${charClass.level}`,
        severity: 'error',
      });
    }

    if (charClass.level > 20) {
      errors.push({
        field: `classes[${i}].level`,
        message: `Class level must be <= 20, got ${charClass.level}`,
        severity: 'error',
      });
    }

    // Validate subclass
    if (charClass.subclassId && !data.getSubclass(charClass.subclassId)) {
      errors.push({
        field: `classes[${i}].subclassId`,
        message: `Subclass "${charClass.subclassId}" not found in data`,
        severity: 'error',
      });
    }

    totalLevel += charClass.level;
  }

  // 7. Total level
  if (totalLevel > 20) {
    errors.push({
      field: 'classes',
      message: `Total level must be <= 20, got ${totalLevel}`,
      severity: 'error',
    });
  }

  // 6. Ability scores
  for (const ability of ABILITY_NAMES) {
    const base = char.abilityScores.base[ability];

    if (base < 1) {
      errors.push({
        field: `abilityScores.base.${ability}`,
        message: `${ability} must be >= 1, got ${base}`,
        severity: 'error',
      });
    } else if (base > 30) {
      errors.push({
        field: `abilityScores.base.${ability}`,
        message: `${ability} must be <= 30, got ${base}`,
        severity: 'error',
      });
    } else if (base < 8) {
      errors.push({
        field: `abilityScores.base.${ability}`,
        message: `${ability} is below typical range (8-15)`,
        severity: 'warning',
      });
    } else if (base > 15) {
      errors.push({
        field: `abilityScores.base.${ability}`,
        message: `${ability} is above typical range (8-15)`,
        severity: 'warning',
      });
    }
  }

  // 8. HP
  if (char.hitPoints.max <= 0) {
    errors.push({
      field: 'hitPoints.max',
      message: 'Max HP must be > 0',
      severity: 'error',
    });
  }

  if (char.hitPoints.current < 0) {
    errors.push({
      field: 'hitPoints.current',
      message: 'Current HP must be >= 0',
      severity: 'error',
    });
  }

  if (char.hitPoints.current > char.hitPoints.max) {
    errors.push({
      field: 'hitPoints.current',
      message: `Current HP (${char.hitPoints.current}) must be <= max HP (${char.hitPoints.max})`,
      severity: 'error',
    });
  }

  if (char.hitPoints.temporary < 0) {
    errors.push({
      field: 'hitPoints.temporary',
      message: 'Temporary HP must be >= 0',
      severity: 'error',
    });
  }

  // Death saves range check
  if (char.hitPoints.deathSaves.successes < 0 || char.hitPoints.deathSaves.successes > 3) {
    errors.push({
      field: 'hitPoints.deathSaves.successes',
      message: 'Death save successes must be between 0 and 3',
      severity: 'error',
    });
  }
  if (char.hitPoints.deathSaves.failures < 0 || char.hitPoints.deathSaves.failures > 3) {
    errors.push({
      field: 'hitPoints.deathSaves.failures',
      message: 'Death save failures must be between 0 and 3',
      severity: 'error',
    });
  }

  // 9. Resources
  for (const [classId, classResources] of Object.entries(char.resources)) {
    for (let i = 0; i < classResources.resources.length; i++) {
      const resource = classResources.resources[i]!;
      if (resource.used < 0) {
        errors.push({
          field: `resources.${classId}.resources[${i}].used`,
          message: `Resource "${resource.id}" used must be >= 0, got ${resource.used}`,
          severity: 'error',
        });
      }
      if (resource.used > resource.max) {
        errors.push({
          field: `resources.${classId}.resources[${i}].used`,
          message: `Resource "${resource.id}" used (${resource.used}) must be <= max (${resource.max})`,
          severity: 'error',
        });
      }
    }
  }

  // 10. Spell slots
  for (let level = 1; level <= 9; level++) {
    const slot = char.spells.spellSlots[level as SpellLevel];
    if (!slot) continue;

    if (slot.used < 0) {
      errors.push({
        field: `spells.spellSlots[${level}].used`,
        message: `Spell slot level ${level} used must be >= 0, got ${slot.used}`,
        severity: 'error',
      });
    }
    if (slot.used > slot.total) {
      errors.push({
        field: `spells.spellSlots[${level}].used`,
        message: `Spell slot level ${level} used (${slot.used}) must be <= total (${slot.total})`,
        severity: 'error',
      });
    }
  }

  // Pact magic slots
  if (char.spells.pactMagicSlots) {
    const pact = char.spells.pactMagicSlots;
    if (pact.used < 0) {
      errors.push({
        field: 'spells.pactMagicSlots.used',
        message: `Pact magic used must be >= 0, got ${pact.used}`,
        severity: 'error',
      });
    }
    if (pact.used > pact.total) {
      errors.push({
        field: 'spells.pactMagicSlots.used',
        message: `Pact magic used (${pact.used}) must be <= total (${pact.total})`,
        severity: 'error',
      });
    }
  }

  // 11. Combat stats
  if (char.combatStats.speed < 0) {
    errors.push({
      field: 'combatStats.speed',
      message: 'Speed must be >= 0',
      severity: 'error',
    });
  }

  // 12. Feats
  for (let i = 0; i < char.feats.length; i++) {
    const entry = char.feats[i]!;
    const featId = entry.featId;
    if (!data.getFeat(featId)) {
      errors.push({
        field: `feats[${i}].featId`,
        message: `Feat "${featId}" not found in data`,
        severity: 'warning',
      });
    }
  }

  const valid = errors.filter(e => e.severity === 'error').length === 0;

  return { valid, errors };
}
