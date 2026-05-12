// tests/character/recompute.test.ts
// recomputeDerivedStats tests

import { describe, it, expect } from 'vitest';
import { recomputeDerivedStats } from '../../src/character/recompute';
import { createCharacter } from '../../src/character/create';
import type { DataLoader } from '../../src/data/loader';
import type { Class, Feature, Subclass } from '../../src/types/class';

// ── Shared Fixtures ─────────────────────────

import { createMockDataLoader } from '../fixtures/data-loader';
import {
  HUMAN_SPECIES,
  DWARF_SPECIES,
  SOLDIER_BACKGROUND,
  SAGE_BACKGROUND,
  FIGHTER_FEATURES_L1,
  FIGHTER_FEATURES_L5,
  FIGHTER_CLASS,
  BARBARIAN_CLASS,
  WIZARD_CLASS,
  CHAMPION_SUBCLASS,
} from '../fixtures/characters';

// ── Additional Test Data ─────────────────────────

const CHAMPION_FEATURES_L3: Feature[] = [
  { name: 'Improved Critical', description: 'Crit on 19-20', level: 3 },
];

const CHAMPION_FEATURES_L7: Feature[] = [
  {
    name: 'Remarkable Athlete',
    description: 'Add half proficiency to Str/Dex/Con checks',
    level: 7,
  },
];

const CHAMPION_SUBCLASS_EXTENDED: Subclass = {
  id: 'Champion',
  parentClass: 'fighter',
  grantedAtLevel: 3,
  featuresByLevel: new Map([
    [3, CHAMPION_FEATURES_L3],
    [7, CHAMPION_FEATURES_L7],
  ]),
};

const WARLOCK_FEATURES_L1: Feature[] = [
  { name: 'Pact Magic', description: 'Cast warlock spells', level: 1 },
];

const WARLOCK_CLASS: Class = {
  id: 'Warlock',
  name: 'Warlock',
  source: '2024 PHB',
  hitDie: 'd8',
  savingThrowProficiencies: ['Wisdom', 'Charisma'],
  armorTraining: ['Light'],
  weaponMastery: false,
  featuresByLevel: new Map([[1, WARLOCK_FEATURES_L1]]),
  spellcasting: { ability: 'Charisma', prepares: false },
};

// ── Mock DataLoader ─────────────────────────────

function createMockDataLoaderExtended(): DataLoader {
  // Full caster spell slot table
  const fullCasterSlots: Record<number, Record<number, number>> = {
    1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    5: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  };

  // Pact magic table
  const pactMagicSlots: Record<number, { slots: number; slotLevel: number }> = {
    1: { slots: 1, slotLevel: 1 },
    2: { slots: 2, slotLevel: 1 },
    5: { slots: 3, slotLevel: 3 },
  };

  return createMockDataLoader({
    getSpecies: (id: string) => {
      if (id === 'Human') return HUMAN_SPECIES;
      if (id === 'Dwarf') return DWARF_SPECIES;
      return undefined;
    },
    getAllSpecies: () => [HUMAN_SPECIES, DWARF_SPECIES],
    getBackground: (id: string) => {
      if (id === 'Soldier') return SOLDIER_BACKGROUND;
      if (id === 'Sage') return SAGE_BACKGROUND;
      return undefined;
    },
    getAllBackgrounds: () => [SOLDIER_BACKGROUND, SAGE_BACKGROUND],
    getClass: (id: string) => {
      if (id === 'Fighter') return FIGHTER_CLASS;
      if (id === 'Barbarian') return BARBARIAN_CLASS;
      if (id === 'Wizard') return WIZARD_CLASS;
      if (id === 'Warlock') return WARLOCK_CLASS;
      return undefined;
    },
    getAllClasses: () => [FIGHTER_CLASS, BARBARIAN_CLASS, WIZARD_CLASS, WARLOCK_CLASS],
    getSubclass: (id: string) => {
      if (id === 'Champion') return CHAMPION_SUBCLASS_EXTENDED;
      return undefined;
    },
    getAllSubclasses: () => [CHAMPION_SUBCLASS_EXTENDED],
    getSpellSlots: (classId: string, classLevel: number) => {
      const nonCasters = ['Fighter', 'Rogue', 'Barbarian', 'Monk'];
      if (nonCasters.includes(classId)) {
        return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      }
      return (
        fullCasterSlots[classLevel] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
      );
    },
    getMulticlassSpellSlots: (level: number) => {
      const multiclassSlots: Record<number, Record<number, number>> = {
        1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
        2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
        3: { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
        4: { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
        5: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };
      return multiclassSlots[level] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    },
    getPactMagicSlots: (warlockLevel: number) => {
      return pactMagicSlots[warlockLevel] || { slots: 0, slotLevel: 0 };
    },
  });
}

// ── Helper: mutate character (bypass readonly) ─────────────────

function mutate<T extends object>(obj: T): { -readonly [K in keyof T]: T[K] } {
  return obj as { -readonly [K in keyof T]: T[K] };
}

// ── Tests ─────────────────────────────────────

describe('recomputeDerivedStats', () => {
  const data = createMockDataLoaderExtended();

  it('recalculates proficiency bonus', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
      },
      data
    );

    // Level 1 → PB = 2
    expect(char.combatStats.proficiencyBonus).toBe(2);

    // Simulate level up to 5 → PB = 3
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 5 }];
    char = recomputeDerivedStats(mutated, data);
    expect(char.combatStats.proficiencyBonus).toBe(3);
  });

  it('recalculates AC', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
      },
      data
    );

    // Unarmored: 10 + Dex(+2) = 12
    expect(char.combatStats.AC).toBe(12);

    // Change Dex to 18
    const mutated = mutate(char);
    mutated.abilityScores = {
      ...char.abilityScores,
      base: { ...char.abilityScores.base, Dexterity: 18 },
    };
    char = recomputeDerivedStats(mutated, data);
    expect(char.combatStats.AC).toBe(14); // 10 + 4
  });

  it('recalculates initiative', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
      },
      data
    );

    // Dex 14 → +2
    expect(char.combatStats.initiative).toBe(2);

    // Add Alert feat
    const mutated = mutate(char);
    mutated.feats = ['Alert'];
    char = recomputeDerivedStats(mutated, data);
    expect(char.combatStats.initiative).toBe(7); // +2 + 5
  });

  it('recalculates passive perception', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
        skillChoices: ['Perception'],
      },
      data
    );

    // Wis 12 → +1, proficient, PB 2 → 10 + 1 + 2 = 13
    expect(char.combatStats.passivePerception).toBe(13);

    // Increase Wisdom
    const mutated = mutate(char);
    mutated.abilityScores = {
      ...char.abilityScores,
      base: { ...char.abilityScores.base, Wisdom: 16 },
    };
    char = recomputeDerivedStats(mutated, data);
    // Wis 16 → +3, proficient, PB 2 → 10 + 3 + 2 = 15
    expect(char.combatStats.passivePerception).toBe(15);
  });

  it('recalculates max HP', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
      },
      data
    );

    // Level 1 Fighter, Con 15 → +2, d10: 10+2 = 12
    expect(char.hitPoints.max).toBe(12);

    // Level up to 5
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 5 }];
    char = recomputeDerivedStats(mutated, data);
    // 1st: 10+2=12, 2-5: 4*(6+2)=32 → total 44
    expect(char.hitPoints.max).toBe(44);
  });

  it('caps current HP at new max', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
      },
      data
    );

    // Set current HP to max
    const mutated = mutate(char);
    mutated.hitPoints = { ...char.hitPoints, current: 12 };

    // Lower Con to reduce max HP
    mutated.abilityScores = {
      ...char.abilityScores,
      base: { ...char.abilityScores.base, Constitution: 8 },
    };
    char = recomputeDerivedStats(mutated, data);
    // Con 8 → -1, HP = 10 + (-1) = 9
    expect(char.hitPoints.max).toBe(9);
    expect(char.hitPoints.current).toBe(9); // Capped from 12 to 9
  });

  it('recalculates spell save DC', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 8,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 15,
          Wisdom: 13,
          Charisma: 10,
        },
      },
      data
    );

    // Int 15 → +2, PB 2, DC = 8 + 2 + 2 = 12
    expect(char.spells.classSpellcasting['Wizard']!.spellSaveDC).toBe(12);

    // Increase Int to 20
    const mutated = mutate(char);
    mutated.abilityScores = {
      ...char.abilityScores,
      base: { ...char.abilityScores.base, Intelligence: 20 },
    };
    char = recomputeDerivedStats(mutated, data);
    // Int 20 → +5, PB 2, DC = 8 + 2 + 5 = 15
    expect(char.spells.classSpellcasting['Wizard']!.spellSaveDC).toBe(15);
  });

  it('recalculates spell attack bonus', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 8,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 15,
          Wisdom: 13,
          Charisma: 10,
        },
      },
      data
    );

    // Int 15 → +2, PB 2, Attack = 2 + 2 = 4
    expect(char.spells.classSpellcasting['Wizard']!.spellAttackBonus).toBe(4);

    // Level up to 5 → PB 3
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 5 }];
    char = recomputeDerivedStats(mutated, data);
    // Int 15 → +2, PB 3, Attack = 3 + 2 = 5
    expect(char.spells.classSpellcasting['Wizard']!.spellAttackBonus).toBe(5);
  });

  it('updates spell slot totals', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 8,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 15,
          Wisdom: 13,
          Charisma: 10,
        },
      },
      data
    );

    // Level 1: 2 level-1 slots
    expect(char.spells.spellSlots[1].total).toBe(2);

    // Level up to 2
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 2 }];
    char = recomputeDerivedStats(mutated, data);
    // Level 2: 3 level-1 slots
    expect(char.spells.spellSlots[1].total).toBe(3);
  });

  it('preserves used counts where possible', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Sage',
        classId: 'Wizard',
        abilityScores: {
          Strength: 8,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 15,
          Wisdom: 13,
          Charisma: 10,
        },
      },
      data
    );

    // Use 1 slot
    const mutated = mutate(char);
    const slots = mutate(mutated.spells);
    slots.spellSlots = { ...slots.spellSlots };
    const slot1 = mutate(slots.spellSlots[1]!);
    slot1.used = 1;
    slots.spellSlots[1] = slot1;
    mutated.spells = slots;

    // Recompute (same level, should preserve used=1)
    char = recomputeDerivedStats(mutated, data);
    expect(char.spells.spellSlots[1].total).toBe(2);
    expect(char.spells.spellSlots[1].used).toBe(1);
  });

  it('after level up, combat stats reflect new level', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
      },
      data
    );

    // Level 1
    expect(char.combatStats.proficiencyBonus).toBe(2);
    expect(char.hitPoints.max).toBe(12); // 10+2

    // Level up to 5
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 5 }];
    char = recomputeDerivedStats(mutated, data);

    expect(char.combatStats.proficiencyBonus).toBe(3);
    expect(char.hitPoints.max).toBe(44); // 10+2 + 4*(6+2) = 12+32
  });

  it('includes features from subclass', () => {
    let char = createCharacter(
      {
        name: 'Test',
        speciesId: 'Human',
        backgroundId: 'Soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 14,
          Constitution: 15,
          Intelligence: 8,
          Wisdom: 12,
          Charisma: 10,
        },
      },
      data
    );

    // Add subclass and level up to 7
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 7, subclassId: 'Champion', subclassLevel: 3 }];
    char = recomputeDerivedStats(mutated, data);

    // Should not throw — features from subclass are included
    expect(char.combatStats.proficiencyBonus).toBe(3); // level 7 → PB 3
    // Con 15 → +2, d10 fixed=6
    // 1st: 10+2=12, 2nd-7th: 6*(6+2)=48 → total=60
    expect(char.hitPoints.max).toBe(60);
  });
});
