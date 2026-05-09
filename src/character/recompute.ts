// character/recompute.ts
// Recalculates all derived/computed stats on a Character
// Pure function — returns a new Character with updated combat stats

import type { Character } from '../types/character';
import type { DataLoader } from '../data/loader';
import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { calculateAC } from '../engine/ac-calculator';
import { calculateInitiative } from '../engine/initiative';
import { calculatePassivePerception } from '../engine/passive-perception';
import { calculateAttacks } from '../engine/attack-calculator';
import { calculateMaxHP } from '../engine/hp-calculator';
import type { Feature } from '../types/class';
import { calculatePactMagic, calculateSpellSlotsFromClasses } from '../engine/spell-slots';
import type { SpellLevel } from '../types/spell';
import { getFeaturesAtLevel } from './create';

/**
 * Recalculates all derived/computed stats on a Character.
 *
 * Recomputes:
 * 1. Proficiency bonus
 * 2. Max HP (caps current HP at new max)
 * 3. AC
 * 4. Initiative
 * 5. Passive Perception
 * 6. Attacks
 * 7. Spell Save DC & Spell Attack Bonus (if spellcasting)
 * 8. Spell slot totals (preserving used counts where possible)
 */
export function recomputeDerivedStats(char: Character, data: DataLoader): Character {
  const totalLevel = char.classes.reduce((sum, c) => sum + c.level, 0);
  const pb = getProficiencyBonus(totalLevel);
  const conMod = getModifier(getTotalScore(char.abilityScores, 'Constitution'));

  // Gather all features across all classes and subclasses
  const features: Feature[] = [];
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData) {
      for (let lv = 1; lv <= charClass.level; lv++) {
        features.push(...getFeaturesAtLevel(classData, lv));
      }
      // Also add subclass features
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
  }

  // Recalculate max HP
  const newMaxHP = calculateMaxHP(char.classes, conMod, data);
  const newCurrent = Math.min(char.hitPoints.current, newMaxHP);

  // Compute weapon proficiencies from all classes
  const weaponProficiencies = new Set<string>();
  for (const charClass of char.classes) {
    const classData = data.getClass(charClass.classId);
    if (classData && classData.weaponProficiencies) {
      for (const wp of classData.weaponProficiencies) {
        weaponProficiencies.add(wp);
      }
    }
  }

  // Recalculate combat stats
  const newAC = calculateAC(char.abilityScores, char.equipment, features, data, char.conditions);
  const newInitiative = calculateInitiative(char.abilityScores, char.feats, features);
  const newPassivePerception = calculatePassivePerception(
    char.abilityScores,
    char.skills,
    pb,
    char.conditions
  );
  const newAttacks = calculateAttacks(
    char.abilityScores,
    char.equipment,
    pb,
    features,
    data,
    Array.from(weaponProficiencies)
  );

  // Recalculate spell stats
  let newSpells = { ...char.spells };

  if (char.spells.spellcastingAbility) {
    const spellMod = getModifier(
      getTotalScore(char.abilityScores, char.spells.spellcastingAbility)
    );
    newSpells = {
      ...newSpells,
      spellSaveDC: 8 + pb + spellMod,
      spellAttackBonus: pb + spellMod,
    };
  }

  // Recalculate spell slots (handles both single class and multiclass)
  const hasWarlock = char.classes.some(c => c.classId === 'Warlock');

  if (hasWarlock) {
    // Handle Warlock pact magic
    const warlockLevel = char.classes.find(c => c.classId === 'Warlock')!.level;
    const pactResult = calculatePactMagic(warlockLevel, data);
    if (pactResult && newSpells.pactMagicSlots) {
      newSpells = {
        ...newSpells,
        pactMagicSlots: {
          ...newSpells.pactMagicSlots,
          total: pactResult.slots,
          level: pactResult.slotLevel,
        },
      };
    }
  }

  // Recalculate regular spell slots (using multiclass rules if multiple classes)
  const newSlots = calculateSpellSlotsFromClasses(char.classes, data);
  // Preserve used counts, update totals
  const updatedSlots = { ...newSpells.spellSlots };
  for (let level = 1; level <= 9; level++) {
    const newEntry = newSlots[level];
    if (newEntry) {
      const oldUsed = updatedSlots[level as SpellLevel]?.used ?? 0;
      updatedSlots[level as SpellLevel] = {
        total: newEntry.total,
        used: Math.min(oldUsed, newEntry.total),
      };
    }
  }
  newSpells = {
    ...newSpells,
    spellSlots: updatedSlots as typeof char.spells.spellSlots,
  };

  return {
    ...char,
    hitPoints: {
      ...char.hitPoints,
      max: newMaxHP,
      current: newCurrent,
    },
    combatStats: {
      AC: newAC,
      initiative: newInitiative,
      speed: char.combatStats.speed,
      passivePerception: newPassivePerception,
      proficiencyBonus: pb,
      attacks: newAttacks,
    },
    spells: newSpells,
    updatedAt: new Date().toISOString(),
  };
}
