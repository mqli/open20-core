// character/spells-init.ts
// Spell data initialization for character creation and level-up.
// Shared helpers used by create.ts and level-up.ts.

import type { CharacterSpells, ClassSpellData, SpellLevel, SpellSlotEntry, PactMagicSlots } from '../types/spell';
import type { AbilityScores } from '../types/ability';
import type { DataLoader } from '../data/loader';
import type { Class } from '../types/class';
import { getModifier, getTotalScore } from '../engine/ability-modifier';
import { getProficiencyBonus } from '../engine/proficiency-bonus';
import { calculateSpellSlots, calculatePactMagic, calculateMulticlassSpellSlots, getMulticlassSpellcasterLevel } from '../engine/spell-slots';
import { getAlwaysPreparedSpellsFromSubclass } from './utils';
import { getMaxSpellLevel } from './utils';

/** Create empty spell data (non-spellcasting class). */
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

/** Build initial spell data for a single class at creation. */
export function buildInitialSpells(
  classData: Class,
  abilityScores: AbilityScores,
  data: DataLoader,
  subclass?: import('../types/class').Subclass
): CharacterSpells {
  const spellcasting = classData.spellcasting!;
  const ability = spellcasting.ability;
  const pb = getProficiencyBonus(1);
  const abilityMod = getModifier(getTotalScore(abilityScores, ability));

  const spellSaveDC = 8 + pb + abilityMod;
  const spellAttackBonus = pb + abilityMod;

  const slots = calculateSpellSlots(classData.id, 1, data);
  const maxSpellLevel = getMaxSpellLevel(slots);

  const level1Entry = classData.featuresByLevel.find(f => f.level === 1);
  const maxCantripsKnown = level1Entry?.cantripsKnown ?? 0;

  let knownCantrips: readonly string[] = [];
  let knownSpells: readonly string[] = [];

  if (spellcasting.knownSource === 'class_list') {
    knownSpells = data.getAllSpells()
      .filter(s => s.classes?.includes(classData.id) && s.level >= 1 && s.level <= maxSpellLevel)
      .map(s => s.id);
  } else if (spellcasting.knownSource === 'spellbook') {
    knownCantrips = [];
    knownSpells = [];
  }

  let alwaysPreparedSpells: readonly string[] = [];
  if (subclass) {
    alwaysPreparedSpells = getAlwaysPreparedSpellsFromSubclass(subclass, 1);
  }

  const maxPrepared = level1Entry?.preparedSpells ?? 0;

  const classSpellData: ClassSpellData = {
    classId: classData.id,
    spellcastingAbility: ability,
    spellSaveDC,
    spellAttackBonus,
    knownCantrips,
    maxCantripsKnown,
    knownSpells,
    preparedSpells: [],
    alwaysPreparedSpells,
    maxPrepared,
  };

  const spellSlots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
  spellSlots[0] = { total: 0, used: 0 };
  for (let level = 1; level <= 9; level++) {
    spellSlots[level as SpellLevel] = slots[level] ?? { total: 0, used: 0 };
  }

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

/** Build spells for multiclass characters (per-class tracking). */
export function buildMulticlassSpells(
  classes: import('../types/character').CharacterClass[],
  abilityScores: AbilityScores,
  data: DataLoader
): CharacterSpells {
  const hasSpellcaster = classes.some(c => {
    const classData = data.getClass(c.classId);
    return classData?.spellcasting;
  });

  if (!hasSpellcaster) return emptyCharacterSpells();

  const totalLevel = classes.reduce((sum, c) => sum + c.level, 0);
  const pb = getProficiencyBonus(totalLevel);

  const totalSpellcastingLevel = getMulticlassSpellcasterLevel(classes, data);
  const spellSlots = totalSpellcastingLevel > 0
    ? calculateMulticlassSpellSlots(totalSpellcastingLevel, data)
    : createEmptySpellSlots();
  const maxSpellLevel = getMaxSpellLevel(spellSlots);

  const classSpellcasting: Record<string, ClassSpellData> = {};

  for (const charClass of classes) {
    const classData = data.getClass(charClass.classId);
    if (!classData?.spellcasting) continue;

    const ability = classData.spellcasting.ability;
    const abilityMod = getModifier(getTotalScore(abilityScores, ability));
    const spellSaveDC = 8 + pb + abilityMod;
    const spellAttackBonus = pb + abilityMod;

    const classSlots = calculateSpellSlots(charClass.classId, charClass.level, data);
    const classMaxSpellLevel = getMaxSpellLevel(classSlots);

    const levelEntry = classData.featuresByLevel.find(f => f.level === charClass.level);
    const maxCantripsKnown = levelEntry?.cantripsKnown ?? 0;

    let knownCantrips: readonly string[] = [];
    let knownSpells: readonly string[] = [];

    if (classData.spellcasting?.knownSource === 'class_list') {
      knownSpells = data.getAllSpells()
        .filter(s => s.classes?.includes(charClass.classId) && s.level >= 1 && s.level <= classMaxSpellLevel)
        .map(s => s.id);
    }

    let alwaysPreparedSpells: readonly string[] = [];
    if (charClass.subclassId) {
      const subclass = data.getSubclass(charClass.subclassId);
      if (subclass) {
        alwaysPreparedSpells = getAlwaysPreparedSpellsFromSubclass(subclass, charClass.level);
      }
    }

    const maxPrepared = levelEntry?.preparedSpells ?? 0;

    classSpellcasting[charClass.classId] = {
      classId: charClass.classId,
      spellcastingAbility: ability,
      spellSaveDC,
      spellAttackBonus,
      knownCantrips,
      maxCantripsKnown,
      knownSpells,
      preparedSpells: [],
      alwaysPreparedSpells,
      maxPrepared,
    };
  }

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

/** Create empty spell slots record. */
function createEmptySpellSlots(): Record<SpellLevel, SpellSlotEntry> {
  const slots: Record<SpellLevel, SpellSlotEntry> = {} as Record<SpellLevel, SpellSlotEntry>;
  for (let level = 0; level <= 9; level++) {
    slots[level as SpellLevel] = { total: 0, used: 0 };
  }
  return slots;
}
