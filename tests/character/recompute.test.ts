// tests/character/recompute.test.ts
// recomputeDerivedStats tests

import { describe, it, expect } from 'vitest';
import { recomputeDerivedStats } from '../../src/character/recompute';
import { createCharacter } from '../../src/character/create';
import type { CreateCharacterParams } from '../../src/character/create';
import type { DataLoader } from '../../src/data/loader';
import type { Species } from '../../src/types/species';
import type { Background } from '../../src/types/background';
import type { Class, Feature, Subclass } from '../../src/types/class';
import type { AbilityName } from '../../src/types/ability';
import type { Character } from '../../src/types/character';
import type { SpellLevel } from '../../src/types/spell';

// ── Mock Data ──────────────────────────────────────────────────

const HUMAN_SPECIES: Species = {
  id: 'Human',
  source: '2024 PHB',
  description: 'Versatile and ambitious',
  size: 'Medium',
  speed: 30,
  languages: ['Common'],
  abilityBonuses: {},
  baseTraits: [],
};

const DWARF_SPECIES: Species = {
  id: 'Dwarf',
  source: '2024 PHB',
  description: 'Stout and resilient',
  size: 'Medium',
  speed: 30,
  languages: ['Common', 'Dwarvish'],
  abilityBonuses: { Constitution: 2 },
  baseTraits: [],
};

const SOLDIER_BACKGROUND: Background = {
  id: 'Soldier',
  source: '2024 PHB',
  name: 'Soldier',
  description: 'Military veteran',
  skillProficiencies: ['Athletics', 'Intimidation'],
  toolProficiencies: ['Land Vehicles'],
  languages: [],
  originFeatId: 'Savage Attacker',
  startingGold: 10,
};

const SAGE_BACKGROUND: Background = {
  id: 'Sage',
  source: '2024 PHB',
  name: 'Sage',
  description: 'Scholarly researcher',
  skillProficiencies: ['Arcana', 'History'],
  toolProficiencies: [],
  languages: [],
  originFeatId: 'Magic Initiate',
  startingGold: 10,
};

const FIGHTER_FEATURES_L1: Feature[] = [
  { name: 'Fighting Style', description: 'Choose a fighting style', level: 1 },
  { name: 'Second Wind', description: 'Heal yourself', resourceId: 'Second Wind', level: 1 },
  { name: 'Weapon Mastery', description: 'Master weapons', level: 1 },
];

const FIGHTER_FEATURES_L5: Feature[] = [
  { name: 'Extra Attack', description: 'Attack twice', level: 5 },
];

const BARBARIAN_FEATURES_L1: Feature[] = [
  { name: 'Rage', description: 'Enter a rage', resourceId: 'Rage', level: 1 },
  { name: 'Unarmored Defense', description: 'AC = 10 + Dex + Con', level: 1 },
  { name: 'Weapon Mastery', description: 'Master weapons', level: 1 },
];

const WIZARD_FEATURES_L1: Feature[] = [
  { name: 'Spellcasting', description: 'Cast wizard spells', level: 1 },
  { name: 'Arcane Recovery', description: 'Recover spell slots', resourceId: 'Arcane Recovery', level: 1 },
];

const CHAMPION_FEATURES_L3: Feature[] = [
  { name: 'Improved Critical', description: 'Crit on 19-20', level: 3 },
];

const CHAMPION_FEATURES_L7: Feature[] = [
  { name: 'Remarkable Athlete', description: 'Add half proficiency to Str/Dex/Con checks', level: 7 },
];

const CHAMPION_SUBCLASS: Subclass = {
  id: 'Champion',
  parentClass: 'Fighter',
  grantedAtLevel: 3,
  featuresByLevel: new Map([
    [3, CHAMPION_FEATURES_L3],
    [7, CHAMPION_FEATURES_L7],
  ]),
};

const FIGHTER_CLASS: Class = {
  id: 'Fighter',
  source: '2024 PHB',
  hitDie: 'd10',
  savingThrowProficiencies: ['Strength', 'Constitution'],
  armorTraining: ['Light', 'Medium', 'Heavy', 'Shield'],
  weaponMastery: true,
  featuresByLevel: new Map([
    [1, FIGHTER_FEATURES_L1],
    [5, FIGHTER_FEATURES_L5],
  ]),
  spellcasting: null,
};

const BARBARIAN_CLASS: Class = {
  id: 'Barbarian',
  source: '2024 PHB',
  hitDie: 'd12',
  savingThrowProficiencies: ['Strength', 'Constitution'],
  armorTraining: ['Light', 'Medium', 'Shield'],
  weaponMastery: true,
  featuresByLevel: new Map([[1, BARBARIAN_FEATURES_L1]]),
  spellcasting: null,
};

const WIZARD_CLASS: Class = {
  id: 'Wizard',
  source: '2024 PHB',
  hitDie: 'd6',
  savingThrowProficiencies: ['Intelligence', 'Wisdom'],
  armorTraining: [],
  weaponMastery: false,
  featuresByLevel: new Map([[1, WIZARD_FEATURES_L1]]),
  spellcasting: { ability: 'Intelligence', prepares: true },
};

const WARLOCK_FEATURES_L1: Feature[] = [
  { name: 'Pact Magic', description: 'Cast warlock spells', level: 1 },
];

const WARLOCK_CLASS: Class = {
  id: 'Warlock',
  source: '2024 PHB',
  hitDie: 'd8',
  savingThrowProficiencies: ['Wisdom', 'Charisma'],
  armorTraining: ['Light'],
  weaponMastery: false,
  featuresByLevel: new Map([[1, WARLOCK_FEATURES_L1]]),
  spellcasting: { ability: 'Charisma', prepares: false },
};

// ── Mock DataLoader ────────────────────────────────────────────

function createMockDataLoader(): DataLoader {
  const speciesMap: Record<string, Species> = {
    Human: HUMAN_SPECIES,
    Dwarf: DWARF_SPECIES,
  };
  const backgroundMap: Record<string, Background> = {
    Soldier: SOLDIER_BACKGROUND,
    Sage: SAGE_BACKGROUND,
  };
  const classMap: Record<string, Class> = {
    Fighter: FIGHTER_CLASS,
    Barbarian: BARBARIAN_CLASS,
    Wizard: WIZARD_CLASS,
    Warlock: WARLOCK_CLASS,
  };
  const subclassMap: Record<string, Subclass> = {
    Champion: CHAMPION_SUBCLASS,
  };

  const fullCasterSlots: Record<number, Record<number, number>> = {
    1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    5: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  };

  const pactMagicSlots: Record<number, { slots: number; slotLevel: number }> = {
    1: { slots: 1, slotLevel: 1 },
    2: { slots: 2, slotLevel: 1 },
    5: { slots: 3, slotLevel: 3 },
  };

  return {
    getSpecies: (id: string) => speciesMap[id],
    getSpeciesSubtype: () => undefined,
    getAllSpecies: () => Object.values(speciesMap),
    getBackground: (id: string) => backgroundMap[id],
    getAllBackgrounds: () => Object.values(backgroundMap),
    getClass: (id: string) => classMap[id],
    getAllClasses: () => Object.values(classMap),
    getSubclass: (id: string) => subclassMap[id],
    getSubclassesForClass: () => [],
    getAllSubclasses: () => Object.values(subclassMap),
    getFeat: () => undefined,
    getFeatsByCategory: () => [],
    getAllFeats: () => [],
    getWeapon: () => undefined,
    getAllWeapons: () => [],
    getArmor: () => undefined,
    getAllArmor: () => [],
    getGearItem: () => undefined,
    getAllGear: () => [],
    getSpell: () => undefined,
    getSpellsByLevel: () => [],
    getAllSpells: () => [],
    getProficiencyBonus: (level: number) => {
      if (level <= 4) return 2;
      if (level <= 8) return 3;
      if (level <= 12) return 4;
      if (level <= 16) return 5;
      return 6;
    },
    getHitDieFixedValue: () => 6,
    getSpellSlots: (classId: string, classLevel: number) => {
      const nonCasters = ['Fighter', 'Rogue', 'Barbarian', 'Monk'];
      if (nonCasters.includes(classId)) {
        return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
      }
      return fullCasterSlots[classLevel] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    },
    getMulticlassSpellSlots: () => ({}),
    getPactMagicSlots: (warlockLevel: number) => {
      return pactMagicSlots[warlockLevel] || { slots: 0, slotLevel: 0 };
    },
    getWeaponMasteryProperties: () => [],
    getConditionNames: () => [],
  };
}

// ── Helper: mutate character (bypass readonly) ─────────────────

function mutate<T extends object>(obj: T): { -readonly [K in keyof T]: T[K] } {
  return obj as { -readonly [K in keyof T]: T[K] };
}

// ── Tests ──────────────────────────────────────────────────────

describe('recomputeDerivedStats', () => {
  const data = createMockDataLoader();

  it('recalculates proficiency bonus', () => {
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
    }, data);

    // Level 1 → PB = 2
    expect(char.combatStats.proficiencyBonus).toBe(2);

    // Simulate level up to 5 → PB = 3
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 5 }];
    char = recomputeDerivedStats(mutated, data);
    expect(char.combatStats.proficiencyBonus).toBe(3);
  });

  it('recalculates AC', () => {
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
    }, data);

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
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
    }, data);

    // Dex 14 → +2
    expect(char.combatStats.initiative).toBe(2);

    // Add Alert feat
    const mutated = mutate(char);
    mutated.feats = ['Alert'];
    char = recomputeDerivedStats(mutated, data);
    expect(char.combatStats.initiative).toBe(7); // +2 + 5
  });

  it('recalculates passive perception', () => {
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
      skillChoices: ['Perception'],
    }, data);

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
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
    }, data);

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
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
    }, data);

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
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Sage',
      classId: 'Wizard',
      abilityScores: { Strength: 8, Dexterity: 14, Constitution: 12, Intelligence: 15, Wisdom: 13, Charisma: 10 },
    }, data);

    // Int 15 → +2, PB 2, DC = 8 + 2 + 2 = 12
    expect(char.spells.spellSaveDC).toBe(12);

    // Increase Int to 20
    const mutated = mutate(char);
    mutated.abilityScores = {
      ...char.abilityScores,
      base: { ...char.abilityScores.base, Intelligence: 20 },
    };
    char = recomputeDerivedStats(mutated, data);
    // Int 20 → +5, PB 2, DC = 8 + 2 + 5 = 15
    expect(char.spells.spellSaveDC).toBe(15);
  });

  it('recalculates spell attack bonus', () => {
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Sage',
      classId: 'Wizard',
      abilityScores: { Strength: 8, Dexterity: 14, Constitution: 12, Intelligence: 15, Wisdom: 13, Charisma: 10 },
    }, data);

    // Int 15 → +2, PB 2, Attack = 2 + 2 = 4
    expect(char.spells.spellAttackBonus).toBe(4);

    // Level up to 5 → PB 3
    const mutated = mutate(char);
    mutated.classes = [{ ...char.classes[0]!, level: 5 }];
    char = recomputeDerivedStats(mutated, data);
    // Int 15 → +2, PB 3, Attack = 3 + 2 = 5
    expect(char.spells.spellAttackBonus).toBe(5);
  });

  it('updates spell slot totals', () => {
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Sage',
      classId: 'Wizard',
      abilityScores: { Strength: 8, Dexterity: 14, Constitution: 12, Intelligence: 15, Wisdom: 13, Charisma: 10 },
    }, data);

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
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Sage',
      classId: 'Wizard',
      abilityScores: { Strength: 8, Dexterity: 14, Constitution: 12, Intelligence: 15, Wisdom: 13, Charisma: 10 },
    }, data);

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
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
    }, data);

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
    let char = createCharacter({
      name: 'Test',
      speciesId: 'Human',
      backgroundId: 'Soldier',
      classId: 'Fighter',
      abilityScores: { Strength: 15, Dexterity: 14, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 },
    }, data);

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
