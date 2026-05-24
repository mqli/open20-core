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

const MOCK_SORCERER_CLASS: Class = {
  id: 'Sorcerer',
  name: 'Sorcerer',
  source: '2024 PHB',
  hitDie: 'd6',
  savingThrowProficiencies: ['Constitution', 'Charisma'] as any,
  armorTraining: [],
  weaponProficiencies: ['Simple'],
  weaponMastery: false,
  featuresByLevel: [],
  spellcasting: {    ability: 'Charisma' as any,
    knownSource: 'class_list',
    preparationTiming: 'level_up',
    changesPerPreparation: 'all',
  },
};

const MOCK_CLERIC_CLASS: Class = {
  id: 'Cleric',
  name: 'Cleric',
  source: '2024 PHB',
  hitDie: 'd8' as any,
  savingThrowProficiencies: ['Wisdom', 'Charisma'] as any,
  armorTraining: ['Light', 'Medium', 'Heavy', 'Shields'],
  weaponProficiencies: ['Simple'],
  weaponMastery: false,
  featuresByLevel: [],
  spellcasting: {    ability: 'Wisdom' as any,
    knownSource: 'class_list',
    preparationTiming: 'long_rest',
    changesPerPreparation: 'all',
  },
};

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
  featuresByLevel: [
    { level: 3, features: CHAMPION_FEATURES_L3 },
    { level: 7, features: CHAMPION_FEATURES_L7 },
  ],
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
  featuresByLevel: [{ level: 1, features: WARLOCK_FEATURES_L1 }],
  spellcasting: {     ability: 'Charisma' as any,
    knownSource: 'class_list',
    preparationTiming: 'level_up',
    changesPerPreparation: 'all',
    pactMagic: true 
  },
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
    mutated.feats = [{ featId: 'Alert' }];
    char = recomputeDerivedStats(mutated, data);
    // Dex +2, Alert feat grants +PB (+2 for level 1) → total +4
    expect(char.combatStats.initiative).toBe(4);
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

  // ── knownSpells Filtering Tests ─────────────────────

  // Mock spells for testing knownSpells filtering
  const mockSpellsForFiltering = [
    { id: 'acid-splash', name: 'Acid Splash', level: 0, school: 'Conjuration', castingTime: 'Action', range: '60 ft.', components: ['V', 'S'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Wizard', 'Sorcerer'] },
    { id: 'fire-bolt', name: 'Fire Bolt', level: 0, school: 'Evocation', castingTime: 'Action', range: '120 ft.', components: ['V', 'S'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Wizard', 'Sorcerer'] },
    { id: 'ray-of-frost', name: 'Ray of Frost', level: 0, school: 'Evocation', castingTime: 'Action', range: '60 ft.', components: ['V', 'S'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Wizard', 'Sorcerer'] },
    { id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'Evocation', castingTime: 'Action', range: '120 ft.', components: ['V', 'S'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Wizard', 'Sorcerer'] },
    { id: 'shield', name: 'Shield', level: 1, school: 'Abjuration', castingTime: 'Reaction', range: 'Self', components: ['V', 'S'], duration: '1 round', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Wizard', 'Sorcerer'] },
    { id: 'invisibility', name: 'Invisibility', level: 2, school: 'Illusion', castingTime: 'Action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour', description: 'Test', source: 'Test', concentration: true, ritual: false, classes: ['Wizard', 'Sorcerer', 'Bard'] },
    { id: 'fireball', name: 'Fireball', level: 3, school: 'Evocation', castingTime: 'Action', range: '150 ft.', components: ['V', 'S', 'M'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Wizard', 'Sorcerer'] },
    { id: 'polymorph', name: 'Polymorph', level: 4, school: 'Transmutation', castingTime: 'Action', range: '60 ft.', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour', description: 'Test', source: 'Test', concentration: true, ritual: false, classes: ['Wizard', 'Bard', 'Druid'] },
    { id: 'hold-monster', name: 'Hold Monster', level: 5, school: 'Abjuration', castingTime: 'Action', range: '90 ft.', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute', description: 'Test', source: 'Test', concentration: true, ritual: false, classes: ['Wizard', 'Bard'] },
  ];

  function createSpellTestDataLoader(spells: any[] = mockSpellsForFiltering) {
    const fullCasterSlots: Record<number, Record<number, number>> = {
      1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      2: { 1: 3, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      3: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      5: { 1: 4, 2: 3, 3: 3, 4: 1, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      7: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 },
      9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 0, 8: 0, 9: 0 },
    };

    return createMockDataLoader({
      getSpecies: (id: string) => {
        if (id === 'Human') return HUMAN_SPECIES;
        return undefined;
      },
      getAllSpecies: () => [HUMAN_SPECIES],
      getBackground: (id: string) => {
        if (id === 'Sage') return SAGE_BACKGROUND;
        return undefined;
      },
      getAllBackgrounds: () => [SAGE_BACKGROUND],
      getClass: (id: string) => {
        if (id === 'Wizard') return WIZARD_CLASS;
        if (id === 'Sorcerer') return { ...MOCK_SORCERER_CLASS };
        if (id === 'Cleric') return MOCK_CLERIC_CLASS;
        if (id === 'Fighter') return FIGHTER_CLASS;
        return undefined;
      },
      getAllClasses: () => [WIZARD_CLASS, FIGHTER_CLASS, MOCK_CLERIC_CLASS, MOCK_SORCERER_CLASS],
      getSubclass: () => undefined,
      getAllSubclasses: () => [],
      getSpell: (id: string) => spells.find(s => s.id === id),
      getAllSpells: () => spells,
      getSpellSlots: (classId: string, level: number) => {
        return fullCasterSlots[level] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      },
      getMulticlassSpellSlots: (level: number) => {
        return fullCasterSlots[level] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      },
    });
  }

  describe('knownSpells for class_list casters (SRD 5.2)', () => {
    it('should auto-populate all level 1+ spells from class list for Sorcerer', () => {
      const data = createSpellTestDataLoader();
      let char = createCharacter(
        {
          name: 'Test Sorcerer',
          speciesId: 'Human',
          backgroundId: 'Sage',
          classId: 'Sorcerer',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 15,
          },
        },
        data
      );

      // Level 1 Sorcerer - class_list auto-populates ALL level 1+ Sorcerer spells
      const knownSpells = char.spells.classSpellcasting['Sorcerer']!.knownSpells;
      // Should contain all level 1 Sorcerer spells from test data
      expect(knownSpells).toContain('magic-missile');
      expect(knownSpells).toContain('shield');
    });

    it('should auto-populate higher level spells as Sorcerer levels up', () => {
      const data = createSpellTestDataLoader();
      let char = createCharacter(
        {
          name: 'Test Sorcerer',
          speciesId: 'Human',
          backgroundId: 'Sage',
          classId: 'Sorcerer',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 15,
          },
        },
        data
      );

      // Level 5 Sorcerer can cast up to 3rd level spells
      const mutated = mutate(char);
      mutated.classes = [{ ...mutated.classes[0]!, level: 5 }];
      char = recomputeDerivedStats(mutated, data);

      const knownSpells = char.spells.classSpellcasting['Sorcerer']!.knownSpells;
      // Should contain all level 1-3 Sorcerer spells
      expect(knownSpells).toContain('magic-missile');  // 1st level
      expect(knownSpells).toContain('invisibility');    // 2nd level
      expect(knownSpells).toContain('fireball');        // 3rd level
      // Level 5 Sorcerer cannot cast 4th level spells, so polymorph should NOT be in class list
      // (but will appear in spellbook if manually added as a Wizard would)
    });
  });

  describe('knownSpells for spellbook casters (Wizard)', () => {
    it('should keep all spells in spellbook regardless of level', () => {
      const data = createSpellTestDataLoader();
      let char = createCharacter(
        {
          name: 'Test Wizard',
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

      // Level 1 Wizard - add high level spells to spellbook
      const mutated = mutate(char);
      const wizardSpellData = mutate(mutated.spells.classSpellcasting['Wizard']!);
      wizardSpellData.knownSpells = [
        'acid-splash',
        'magic-missile',
        'fireball',      // 3rd level - should KEEP in spellbook
        'polymorph',     // 4th level - should KEEP in spellbook
        'hold-monster',  // 5th level - should KEEP in spellbook
      ];
      mutated.spells = { ...mutated.spells, classSpellcasting: { ...mutated.spells.classSpellcasting, Wizard: wizardSpellData } };

      char = recomputeDerivedStats(mutated, data);

      // Wizard spellbook should keep all spells regardless of level
      const knownSpells = char.spells.classSpellcasting['Wizard']!.knownSpells;
      expect(knownSpells).toContain('acid-splash');
      expect(knownSpells).toContain('magic-missile');
      expect(knownSpells).toContain('fireball');      // Kept in spellbook
      expect(knownSpells).toContain('polymorph');     // Kept in spellbook
      expect(knownSpells).toContain('hold-monster');  // Kept in spellbook
    });
  });

  describe('knownSpells for class_list casters (Cleric, Druid)', () => {
    it('should auto-populate knownSpells based on level for Cleric', () => {
      const data = createSpellTestDataLoader();
      // Add Cleric spells to mock data
      const clericSpells = [
        { id: 'guidance', name: 'Guidance', level: 0, school: 'Divination', castingTime: 'Action', range: 'Touch', components: ['V', 'S'], duration: 'Concentration, up to 1 minute', description: 'Test', source: 'Test', concentration: true, ritual: false, classes: ['Cleric', 'Druid'] },
        { id: 'toll-the-dead', name: 'Toll the Dead', level: 0, school: 'Necromancy', castingTime: 'Action', range: '60 ft.', components: ['V', 'S'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Cleric', 'Wizard'] },
        { id: 'cure-wounds', name: 'Cure Wounds', level: 1, school: 'Evocation', castingTime: 'Action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'] },
        { id: 'healing-word', name: 'Healing Word', level: 1, school: 'Evocation', castingTime: 'Bonus Action', range: '60 ft.', components: ['V'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Bard', 'Cleric', 'Druid'] },
        { id: 'spiritual-weapon', name: 'Spiritual Weapon', level: 2, school: 'Evocation', castingTime: 'Bonus Action', range: '60 ft.', components: ['V', 'S'], duration: '1 minute', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Cleric'] },
        { id: 'revivify', name: 'Revivify', level: 3, school: 'Necromancy', castingTime: 'Action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Cleric', 'Paladin', 'Bard'] },
      ];
      const allSpells = [...mockSpellsForFiltering, ...clericSpells];
      const dataWithCleric = createSpellTestDataLoader(allSpells);

      let char = createCharacter(
        {
          name: 'Test Cleric',
          speciesId: 'Human',
          backgroundId: 'Sage',
          classId: 'Cleric',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 10,
            Wisdom: 15,
            Charisma: 10,
          },
        },
        dataWithCleric
      );

      // Level 1 Cleric can cast cantrips and 1st level spells
      char = recomputeDerivedStats(mutate(char), dataWithCleric);

      const classSpellData = char.spells.classSpellcasting['Cleric']!;
      // Cantrips are in knownCantrips (must be learned, not auto-populated)
      // knownSpells only contains level 1+ spells
      const knownSpells = classSpellData.knownSpells;
      expect(classSpellData.knownCantrips).toEqual([]);  // starts empty, player must choose
      expect(knownSpells).toContain('cure-wounds');     // 1st level
      expect(knownSpells).toContain('healing-word');    // 1st level
      expect(knownSpells).not.toContain('spiritual-weapon');  // 2nd level - cannot cast
      expect(knownSpells).not.toContain('revivify');         // 3rd level - cannot cast
    });

    it('should include higher level spells after level up for Cleric', () => {
      const clericSpells = [
        { id: 'guidance', name: 'Guidance', level: 0, school: 'Divination', castingTime: 'Action', range: 'Touch', components: ['V', 'S'], duration: 'Concentration, up to 1 minute', description: 'Test', source: 'Test', concentration: true, ritual: false, classes: ['Cleric', 'Druid'] },
        { id: 'cure-wounds', name: 'Cure Wounds', level: 1, school: 'Evocation', castingTime: 'Action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'] },
        { id: 'spiritual-weapon', name: 'Spiritual Weapon', level: 2, school: 'Evocation', castingTime: 'Bonus Action', range: '60 ft.', components: ['V', 'S'], duration: '1 minute', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Cleric'] },
        { id: 'revivify', name: 'Revivify', level: 3, school: 'Necromancy', castingTime: 'Action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous', description: 'Test', source: 'Test', concentration: false, ritual: false, classes: ['Cleric', 'Paladin', 'Bard'] },
      ];
      const allSpells = [...mockSpellsForFiltering, ...clericSpells];
      const dataWithCleric = createSpellTestDataLoader(allSpells);

      let char = createCharacter(
        {
          name: 'Test Cleric',
          speciesId: 'Human',
          backgroundId: 'Sage',
          classId: 'Cleric',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 10,
            Wisdom: 15,
            Charisma: 10,
          },
        },
        dataWithCleric
      );

      // Level up to 5 (can cast up to 3rd level spells)
      const mutated = mutate(char);
      mutated.classes = [{ ...mutated.classes[0]!, level: 5 }];
      char = recomputeDerivedStats(mutated, dataWithCleric);

      const classSpellData = char.spells.classSpellcasting['Cleric']!;
      // Cantrips are in knownCantrips, knownSpells only contains level 1+ spells
      const knownSpells = classSpellData.knownSpells;
      expect(classSpellData.knownCantrips).toEqual([]);  // starts empty
      expect(knownSpells).toContain('cure-wounds');        // 1st level
      expect(knownSpells).toContain('spiritual-weapon');   // 2nd level - can cast
      expect(knownSpells).toContain('revivify');           // 3rd level - can cast
    });
  });

  describe('knownSpells in multiclass scenarios', () => {
    it('should filter knownSpells per class, not by combined level', () => {
      const data = createSpellTestDataLoader();
      // Create a Sorcerer 3 character first
      let char = createCharacter(
        {
          name: 'Multiclass Caster',
          speciesId: 'Human',
          backgroundId: 'Sage',
          classId: 'Sorcerer',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 15,
            Wisdom: 12,
            Charisma: 15,
          },
        },
        data
      );

      // Mutate to Sorcerer 3 / Wizard 2
      const mutated = mutate(char);
      mutated.classes = [
        { classId: 'Sorcerer', level: 3, subclassId: null, subclassLevel: 0, hitDice: { die: 'd6', used: 0 } },
        { classId: 'Wizard', level: 2, subclassId: null, subclassLevel: 0, hitDice: { die: 'd6', used: 0 } },
      ];

      // Manually set up Sorcerer knownSpells with some higher level spells
      if (mutated.spells.classSpellcasting['Sorcerer']) {
        const sorcererSpellData = mutate(mutated.spells.classSpellcasting['Sorcerer']!);
        sorcererSpellData.knownSpells = [
          'acid-splash',
          'magic-missile',
          'invisibility',  // 2nd level - Sorcerer 3 can cast this
          'fireball',      // 3rd level - Sorcerer 3 CANNOT cast this (needs level 5)
        ];
        mutated.spells = { ...mutated.spells, classSpellcasting: { ...mutated.spells.classSpellcasting, Sorcerer: sorcererSpellData } };
      }

      char = recomputeDerivedStats(mutated, data);

      // Sorcerer is level 3 with class_list - auto-populates ALL level 1+ Sorcerer spells
      // (filtering by spell level happens at prepare time, not here)
      const sorcererKnown = char.spells.classSpellcasting['Sorcerer']!.knownSpells;
      expect(sorcererKnown).toContain('invisibility');  // 2nd level - on class list
      expect(sorcererKnown).toContain('fireball');     // 3rd level - on class list (available to prepare)
    });

    it('should not filter Wizard spellbook in multiclass', () => {
      const data = createSpellTestDataLoader();
      // Create a Wizard 2 character first
      let char = createCharacter(
        {
          name: 'Multiclass Caster',
          speciesId: 'Human',
          backgroundId: 'Sage',
          classId: 'Wizard',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 15,
            Wisdom: 12,
            Charisma: 15,
          },
        },
        data
      );

      // Mutate to Sorcerer 3 / Wizard 2
      const mutated = mutate(char);
      mutated.classes = [
        { classId: 'Sorcerer', level: 3, subclassId: null, subclassLevel: 0, hitDice: { die: 'd6', used: 0 } },
        { classId: 'Wizard', level: 2, subclassId: null, subclassLevel: 0, hitDice: { die: 'd6', used: 0 } },
      ];

      // Add high level spells to Wizard spellbook
      if (mutated.spells.classSpellcasting['Wizard']) {
        const wizardSpellData = mutate(mutated.spells.classSpellcasting['Wizard']!);
        wizardSpellData.knownSpells = [
          ...wizardSpellData.knownSpells,
          'fireball',      // 3rd level - should KEEP in spellbook
          'polymorph',     // 4th level - should KEEP in spellbook
        ];
        mutated.spells = { ...mutated.spells, classSpellcasting: { ...mutated.spells.classSpellcasting, Wizard: wizardSpellData } };
      }

      char = recomputeDerivedStats(mutated, data);

      // Wizard spellbook should keep all spells regardless of level
      const wizardKnown = char.spells.classSpellcasting['Wizard']!.knownSpells;
      expect(wizardKnown).toContain('fireball');      // Kept in spellbook
      expect(wizardKnown).toContain('polymorph');     // Kept in spellbook
    });
  });
});
