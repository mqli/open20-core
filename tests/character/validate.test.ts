// tests/character/validate.test.ts
// Character validation tests

import { describe, it, expect } from 'vitest';
import { validateCharacter } from '../../src/character/validate';
import { createCharacter } from '../../src/character/create';
import type { DataLoader } from '../../src/data/loader';
import type { Species } from '../../src/types/species';
import type { Background } from '../../src/types/background';
import type { Class, Feature, Subclass } from '../../src/types/class';
import type { Feat } from '../../src/types/feat';
import { ResetType } from '../../src/types/resource';
import type { Character } from '../../src/types/character';
import type { CreateCharacterParams } from '../../src/character/create';

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

const FIGHTER_FEATURES_L1: Feature[] = [
  { name: 'Fighting Style', description: 'Choose a fighting style', level: 1 },
  { name: 'Second Wind', description: 'Heal yourself', resourceId: 'Second Wind', level: 1 },
  { name: 'Weapon Mastery', description: 'Master weapons', level: 1 },
];

const FIGHTER_CLASS: Class = {
  id: 'Fighter',
  name: 'Fighter',
  source: '2024 PHB',
  hitDie: 'd10',
  savingThrowProficiencies: ['Strength', 'Constitution'],
  armorTraining: ['Light', 'Medium', 'Heavy', 'Shield'],
  weaponMastery: true,
  featuresByLevel: [{ level: 1, features: FIGHTER_FEATURES_L1 }],
  spellcasting: null,
};

const WIZARD_FEATURES_L1: Feature[] = [
  { name: 'Spellcasting', description: 'Cast wizard spells', level: 1 },
  {
    name: 'Arcane Recovery',
    description: 'Recover spell slots',
    resourceId: 'Arcane Recovery',
    level: 1,
  },
];

const WIZARD_CLASS: Class = {
  id: 'Wizard',
  name: 'Wizard',
  source: '2024 PHB',
  hitDie: 'd6',
  savingThrowProficiencies: ['Intelligence', 'Wisdom'],
  armorTraining: [],
  weaponMastery: false,
  featuresByLevel: [{ level: 1, features: WIZARD_FEATURES_L1 }],
  spellcasting: {ability: 'Intelligence', knownSource: 'spellbook', preparationTiming: 'long_rest', changesPerPreparation: 'all' },
};

const ALERT_FEAT: Feat = {
  id: 'Alert',
  name: 'Alert',
  category: 'General',
  description: '+5 Initiative',
  source: '2024 PHB',
};

const CHAMPION_SUBCLASS: Subclass = {
  id: 'Champion',
  parentClass: 'Fighter',
  grantedAtLevel: 3,
  featuresByLevel: [{ level: 3, features: [{ name: 'Improved Critical', description: 'Crit on 19-20', level: 3 }] }],
};

// ── Mock DataLoader ────────────────────────────────────────────

function createMockDataLoader(overrides?: {
  feats?: Record<string, Feat>;
  subclasses?: Record<string, Subclass>;
}): DataLoader {
  const speciesMap: Record<string, Species> = { Human: HUMAN_SPECIES };
  const backgroundMap: Record<string, Background> = { Soldier: SOLDIER_BACKGROUND };
  const classMap: Record<string, Class> = { Fighter: FIGHTER_CLASS, Wizard: WIZARD_CLASS };
  const featMap: Record<string, Feat> = overrides?.feats ?? { Alert: ALERT_FEAT };
  const subclassMap: Record<string, Subclass> = overrides?.subclasses ?? {
    Champion: CHAMPION_SUBCLASS,
  };

  const fullCasterSlots: Record<number, Record<number, number>> = {
    1: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    2: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
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
    getFeat: (id: string) => featMap[id],
    getFeatsByCategory: () => [],
    getAllFeats: () => Object.values(featMap),
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
      return (
        fullCasterSlots[classLevel] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
      );
    },
    getMulticlassSpellSlots: () => ({}),
    getPactMagicSlots: () => ({ slots: 0, slotLevel: 0 }),
    getWeaponMasteryProperties: () => [],
    getConditionNames: () => [],
  } as any as DataLoader;
}

// ── Helper: create valid character ─────────────────────────────

function createValidCharacter(data: DataLoader): Character {
  const params: CreateCharacterParams = {
    name: 'Aragorn',
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
  };
  return createCharacter(params, data);
}

// ── Helper: mutate character (bypass readonly) ─────────────────

function mutate<T extends object>(obj: T): { -readonly [K in keyof T]: T[K] } {
  return obj as { -readonly [K in keyof T]: T[K] };
}

// ── Tests ──────────────────────────────────────────────────────

describe('validateCharacter', () => {
  const data = createMockDataLoader();

  it('returns valid=true with no errors for a valid character', () => {
    const char = createValidCharacter(data);
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(true);
    expect(result.errors.filter(e => e.severity === 'error')).toEqual([]);
  });

  it('returns error for empty name', () => {
    const char = createValidCharacter(data);
    mutate(char).name = '';
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name', severity: 'error' })
    );
  });

  it('returns error for invalid species', () => {
    const char = createValidCharacter(data);
    mutate(char).species = 'Dragonborn';
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'species', severity: 'error' })
    );
  });

  it('returns error for invalid background', () => {
    const char = createValidCharacter(data);
    mutate(char).background = 'Pirate';
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'background', severity: 'error' })
    );
  });

  it('returns error for invalid class', () => {
    const char = createValidCharacter(data);
    mutate(char).classes = [{ ...char.classes[0]!, classId: 'Artificer' }];
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'classes[0].classId', severity: 'error' })
    );
  });

  it('returns error for level 0', () => {
    const char = createValidCharacter(data);
    mutate(char).classes = [{ ...char.classes[0]!, level: 0 }];
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'classes[0].level',
        severity: 'error',
        message: expect.stringContaining('>= 1'),
      })
    );
  });

  it('returns error for level 21', () => {
    const char = createValidCharacter(data);
    mutate(char).classes = [{ ...char.classes[0]!, level: 21 }];
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'classes[0].level',
        severity: 'error',
        message: expect.stringContaining('<= 20'),
      })
    );
  });

  it('returns error for total level > 20', () => {
    const char = createValidCharacter(data);
    mutate(char).classes = [
      {
        classId: 'Fighter',
        level: 15,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd10', used: 0 },
      },
      {
        classId: 'Wizard',
        level: 10,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd6', used: 0 },
      },
    ];
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'classes',
        severity: 'error',
        message: expect.stringContaining('Total level'),
      })
    );
  });

  it('returns error for base ability < 1', () => {
    const char = createValidCharacter(data);
    const scores = mutate(char.abilityScores);
    scores.base = { ...scores.base, Strength: 0 };
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'abilityScores.base.Strength', severity: 'error' })
    );
  });

  it('returns error for base ability > 30', () => {
    const char = createValidCharacter(data);
    const scores = mutate(char.abilityScores);
    scores.base = { ...scores.base, Strength: 31 };
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'abilityScores.base.Strength', severity: 'error' })
    );
  });

  it('returns warning for base ability 7 (below typical range)', () => {
    const char = createValidCharacter(data);
    const scores = mutate(char.abilityScores);
    scores.base = { ...scores.base, Intelligence: 7 };
    const result = validateCharacter(char, data);
    // Should have a warning but still be valid
    expect(result.valid).toBe(true);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'abilityScores.base.Intelligence', severity: 'warning' })
    );
  });

  it('returns error for HP current > max', () => {
    const char = createValidCharacter(data);
    mutate(char).hitPoints = { ...char.hitPoints, current: 999 };
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'hitPoints.current', severity: 'error' })
    );
  });

  it('returns error for resource used > max', () => {
    const char = createValidCharacter(data);
    mutate(char).resources = {
      'Fighter': {
        classId: 'Fighter',
        resources: [
          { id: 'Second Wind', name: 'Second Wind', max: 1, used: 3, resetOn: ResetType.ShortRest },
        ],
      },
    };
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'resources.Fighter.resources[0].used', severity: 'error' })
    );
  });

  it('returns warning for invalid feat', () => {
    const char = createValidCharacter(data);
    mutate(char).feats = [{ featId: 'NonExistentFeat' }];
    const result = validateCharacter(char, data);
    // Warning means valid is still true
    expect(result.valid).toBe(true);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'feats[0].featId',
        severity: 'warning',
        message: expect.stringContaining('NonExistentFeat'),
      })
    );
  });

  it('returns multiple errors at once', () => {
    const char = createValidCharacter(data);
    mutate(char).name = '';
    mutate(char).species = 'Invalid';
    mutate(char).background = 'Invalid';
    const result = validateCharacter(char, data);
    expect(result.valid).toBe(false);
    const errorFields = result.errors.filter(e => e.severity === 'error').map(e => e.field);
    expect(errorFields).toContain('name');
    expect(errorFields).toContain('species');
    expect(errorFields).toContain('background');
    expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThanOrEqual(3);
  });
});
