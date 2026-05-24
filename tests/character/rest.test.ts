// tests/character/rest.test.ts
// Tests for shortRest and longRest — DND 2024 rules

import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character';
import type { DieType } from '../../src/types/dice';
import type { Resource } from '../../src/types/resource';
import type {
  ClassSpellData,
  CharacterSpells,
  SpellSlotEntry,
  PactMagicSlots,
  SpellLevel,
} from '../../src/types/spell';
import { ResetType } from '../../src/types/resource';
import type { DataLoader } from '../../src/data/loader';
import type { Class, Feature } from '../../src/types/class';

import { shortRest, longRest } from '../../src/character/rest';
import type { RandomProvider } from '../../src/character/rest';

// ── Helper ─────────────────────────────────────────

/** Create CharacterSpells with per-class tracking (new structure) */
function makeCharSpells(
  classId: string,
  overrides?: Partial<ClassSpellData>
): CharacterSpells {
  return {
    classSpellcasting: {
      [classId]: {
        classId,
        spellcastingAbility: 'Intelligence' as const,
        spellSaveDC: 0,
        spellAttackBonus: 0,
        knownCantrips: [],
        maxCantripsKnown: 0,
        knownSpells: [],
        preparedSpells: [],
        alwaysPreparedSpells: [],
        maxPrepared: 0,
        ...overrides,
      },
    },
    spellSlots: {} as Record<SpellLevel, SpellSlotEntry>,
    pactMagicSlots: null,
  };
}

// ── Mock Data ──────────────────────────────────────────────────

function makeMockClass(id: string, hitDie: DieType): Class {
  return {
    id,
    name: id,
    source: '2024 PHB',
    hitDie,
    savingThrowProficiencies: [],
    armorTraining: [],
    weaponMastery: false,
    featuresByLevel: [],
    spellcasting: id === 'Warlock' ? {ability: 'Charisma', preparationTiming: 'level_up', changesPerPreparation: 1, pactMagic: true } : null,
  };
}

const FIGHTER_CLASS = makeMockClass('Fighter', 'd10');
const WARLOCK_CLASS = makeMockClass('Warlock', 'd8');
const WIZARD_CLASS = makeMockClass('Wizard', 'd6');

function createMockDataLoader(): DataLoader {
  const classes: Record<string, Class> = {
    Fighter: FIGHTER_CLASS,
    Warlock: WARLOCK_CLASS,
    Wizard: WIZARD_CLASS,
  };

  return {
    getSpecies: (_id: string) => undefined,
    getSpeciesSubtype: (_sid: string, _ssid: string) => undefined,
    getAllSpecies: () => [],
    getBackground: (_id: string) => undefined,
    getAllBackgrounds: () => [],
    getClass: (id: string) => classes[id] ?? undefined,
    getAllClasses: () => Object.values(classes),
    getSubclass: (_id: string) => undefined,
    getSubclassesForClass: (_id: string) => [],
    getAllSubclasses: () => [],
    getFeat: (_id: string) => undefined,
    getFeatsByCategory: () => [],
    getAllFeats: () => [],
    getWeapon: (_id: string) => undefined,
    getAllWeapons: () => [],
    getArmor: (_id: string) => undefined,
    getAllArmor: () => [],
    getGearItem: (_id: string) => undefined,
    getAllGear: () => [],
    getSpell: (_id: string) => undefined,
    getSpellsByLevel: (_level: SpellLevel) => [],
    getAllSpells: () => [],
    getProficiencyBonus: (level: number) =>
      level < 5 ? 2 : level < 9 ? 3 : level < 13 ? 4 : level < 17 ? 5 : 6,
    getHitDieFixedValue: (die: DieType) => {
      const map: Record<DieType, number> = { d4: 3, d6: 4, d8: 5, d10: 6, d12: 7, d20: 11 };
      return map[die] ?? 0;
    },
    getSpellSlots: (_classId: string, _level: number) => ({}),
    getMulticlassSpellSlots: (_level: number) => ({}),
    getPactMagicSlots: (level: number) => {
      if (level >= 1) return { slots: 1, slotLevel: 1 };
      return { slots: 0, slotLevel: 1 };
    },
    getWeaponMasteryProperties: () => [],
    getConditionNames: () => [],
  } as any as DataLoader;
}

// ── Character Builders ─────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const defaultChar: Character = {
    schemaVersion: '2024.1',
    name: 'Test Hero',
    species: 'Human',
    speciesSubtype: null,
    background: 'Soldier',
    classes: [
      {
        classId: 'Fighter',
        level: 5,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd10', used: 0 },
      },
    ],
    abilityScores: {
      base: {
        Strength: 16,
        Dexterity: 14,
        Constitution: 16,
        Intelligence: 10,
        Wisdom: 12,
        Charisma: 8,
      },
      racialBonuses: {},
      featBonuses: {},
      temporaryBonuses: {},
    },
    skills: {},
    feats: [],
    equipment: [],
    spells: {
      classSpellcasting: {},
      spellSlots: {} as Record<SpellLevel, SpellSlotEntry>,
      pactMagicSlots: null,
    },
    resources: {},
    hitPoints: {
      max: 49,
      current: 49,
      temporary: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
    combatStats: {
      AC: 16,
      initiative: 2,
      speed: 30,
      passivePerception: 12,
      proficiencyBonus: 3,
      attacks: [],
    },
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    conditions: [],
    damageDefenses: { resistances: [], immunities: [], vulnerabilities: [] },
    notes: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
  return { ...defaultChar, ...overrides };
}

function makeFighterWithResources(): Character {
  const shortRestResource: Resource = {
    id: 'Second Wind',
    name: 'Second Wind',
    max: 1,
    used: 1,
    resetOn: ResetType.ShortRest,
  };
  const longRestResource: Resource = {
    id: 'Indomitable',
    name: 'Indomitable',
    max: 1,
    used: 1,
    resetOn: ResetType.LongRest,
  };
  const perTurnResource: Resource = {
    id: 'Sneak Attack',
    name: 'Sneak Attack',
    max: 1,
    used: 1,
    resetOn: ResetType.PerTurn,
  };

  return makeCharacter({
    hitPoints: {
      max: 49,
      current: 25,
      temporary: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
    classes: [
      {
        classId: 'Fighter',
        level: 5,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd10', used: 2 },
      },
    ],
    resources: {
      'Fighter': {
        classId: 'Fighter',
        resources: [shortRestResource, longRestResource, perTurnResource],
      },
    },
  });
}

function makeWarlock(): Character {
  const pactMagic: PactMagicSlots = {
    level: 1,
    total: 2,
    used: 2,
    resetOn: 'Short Rest',
  };

  const spellSlots: Record<SpellLevel, SpellSlotEntry> = {
    0: { total: 0, used: 0 },
    1: { total: 0, used: 0 },
    2: { total: 0, used: 0 },
    3: { total: 0, used: 0 },
    4: { total: 0, used: 0 },
    5: { total: 0, used: 0 },
    6: { total: 0, used: 0 },
    7: { total: 0, used: 0 },
    8: { total: 0, used: 0 },
    9: { total: 0, used: 0 },
  };

  return makeCharacter({
    classes: [
      {
        classId: 'Warlock',
        level: 5,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd8', used: 3 },
      },
    ],
    spells: {
      classSpellcasting: {
        warlock: {
          classId: 'warlock',
          spellcastingAbility: 'Charisma',
          spellSaveDC: 14,
          spellAttackBonus: 6,
          knownCantrips: [],
          maxCantripsKnown: 0,
          knownSpells: [],
          preparedSpells: [],
          alwaysPreparedSpells: [],
          maxPrepared: 0,
        },
      },
      spellSlots,
      pactMagicSlots: pactMagic,
    },
    hitPoints: {
      max: 35,
      current: 10,
      temporary: 0,
      deathSaves: { successes: 2, failures: 1, isStable: false },
    },
  });
}

// ── Helper ─────────────────────────────────────────────────────

/** Get a resource by id from the per-class Record */
function getResource(char: Character, classId: string, resourceId: string): Resource | undefined {
  const ccr = char.resources[classId];
  if (!ccr) return undefined;
  return ccr.resources.find(r => r.id === resourceId);
}

// ── Tests ──────────────────────────────────────────────────────

describe('shortRest', () => {
  const data = createMockDataLoader();

  it('spends 1 hit die and recovers HP (fixed value)', () => {
    const char = makeFighterWithResources();
    // Fighter level 5, Con mod = +3 (Con 16), d10 hit die
    // Fixed value: ceil(10/2) + 3 = 6 + 3 = 9 HP per die
    const result = shortRest(char, 1, data);

    expect(result.hitPoints.current).toBe(25 + 9); // 34
    expect(result.classes[0]!.hitDice.used).toBe(3); // was 2, now 3
  });

  it('spends 0 hit dice: no HP change, resources still reset', () => {
    const char = makeFighterWithResources();
    const result = shortRest(char, 0, data);

    expect(result.hitPoints.current).toBe(25); // unchanged
    expect(result.classes[0]!.hitDice.used).toBe(2); // unchanged
    // Short rest resource still resets
    expect(getResource(result, 'Fighter', 'Second Wind')!.used).toBe(0);
  });

  it('resets short rest resources (Second Wind)', () => {
    const char = makeFighterWithResources();
    const result = shortRest(char, 0, data);

    const secondWind = getResource(result, 'Fighter', 'Second Wind')!;
    expect(secondWind.used).toBe(0);
  });

  it('does NOT reset long rest resources', () => {
    const char = makeFighterWithResources();
    const result = shortRest(char, 0, data);

    const indomitable = getResource(result, 'Fighter', 'Indomitable')!;
    expect(indomitable.used).toBe(1); // still used
  });

  it('does NOT reset per-turn resources', () => {
    const char = makeFighterWithResources();
    const result = shortRest(char, 0, data);

    const sneakAttack = getResource(result, 'Fighter', 'Sneak Attack')!;
    expect(sneakAttack.used).toBe(1); // still used
  });

  it('recovers pact magic slots', () => {
    const char = makeWarlock();
    const result = shortRest(char, 0, data);

    expect(result.spells.pactMagicSlots!.used).toBe(0);
  });

  it('cannot spend more hit dice than available', () => {
    const char = makeFighterWithResources();
    // Level 5, 2 used, so 3 available
    // Try to spend 10 — should only spend 3
    const result = shortRest(char, 10, data);

    // Should spend all 3 remaining: 3 * 9 = 27, but capped at max 49
    expect(result.hitPoints.current).toBe(49); // capped at max
    expect(result.classes[0]!.hitDice.used).toBe(5); // all spent
  });

  it('HP is capped at max', () => {
    const char = makeCharacter({
      hitPoints: {
        max: 49,
        current: 45,
        temporary: 0,
        deathSaves: { successes: 0, failures: 0, isStable: false },
      },
      classes: [
        {
          classId: 'Fighter',
          level: 5,
          subclassId: null,
          subclassLevel: null,
          hitDice: { die: 'd10', used: 0 },
        },
      ],
    });
    const result = shortRest(char, 1, data);

    // 45 + 9 = 54, but max is 49
    expect(result.hitPoints.current).toBe(49);
  });

  it('uses RNG when provided', () => {
    const char = makeFighterWithResources();
    // Con mod = +3
    const mockRng: RandomProvider = {
      d: (_max: number) => 8, // always roll 8
    };
    const result = shortRest(char, 1, data, mockRng);

    // HP recovered = 8 (roll) + 3 (con mod) = 11
    expect(result.hitPoints.current).toBe(25 + 11); // 36
  });

  it('updates updatedAt timestamp', () => {
    const char = makeFighterWithResources();
    const result = shortRest(char, 0, data);

    expect(result.updatedAt).not.toBe(char.updatedAt);
  });
});

describe('longRest', () => {
  const data = createMockDataLoader();

  it('restores HP to max', () => {
    const char = makeFighterWithResources();
    const result = longRest(char, data);

    expect(result.hitPoints.current).toBe(result.hitPoints.max);
  });

  it('resets all hit dice used', () => {
    const char = makeFighterWithResources();
    const result = longRest(char, data);

    expect(result.classes[0]!.hitDice.used).toBe(0);
  });

  it('recovers all spell slots', () => {
    const spellSlots: Record<SpellLevel, SpellSlotEntry> = {
      0: { total: 4, used: 2 },
      1: { total: 4, used: 4 },
      2: { total: 3, used: 1 },
      3: { total: 2, used: 2 },
      4: { total: 0, used: 0 },
      5: { total: 0, used: 0 },
      6: { total: 0, used: 0 },
      7: { total: 0, used: 0 },
      8: { total: 0, used: 0 },
      9: { total: 0, used: 0 },
    };

    const char = makeCharacter({
      classes: [
        {
          classId: 'Wizard',
          level: 9,
          subclassId: null,
          subclassLevel: null,
          hitDice: { die: 'd6', used: 5 },
        },
      ],
      spells: {
        classSpellcasting: {
          wizard: {
            classId: 'wizard',
            spellcastingAbility: 'Intelligence',
            spellSaveDC: 15,
            spellAttackBonus: 7,
            knownCantrips: [],
            maxCantripsKnown: 0,
            knownSpells: [],
            preparedSpells: [],
            alwaysPreparedSpells: [],
            maxPrepared: 0,
          },
        },
        spellSlots,
        pactMagicSlots: null,
      },
    });

    const result = longRest(char, data);

    expect(result.spells.spellSlots[1]!.used).toBe(0);
    expect(result.spells.spellSlots[2]!.used).toBe(0);
    expect(result.spells.spellSlots[3]!.used).toBe(0);
  });

  it('recovers pact magic', () => {
    const char = makeWarlock();
    const result = longRest(char, data);

    expect(result.spells.pactMagicSlots!.used).toBe(0);
  });

  it('resets long rest resources (Indomitable)', () => {
    const char = makeFighterWithResources();
    const result = longRest(char, data);

    const indomitable = getResource(result, 'Fighter', 'Indomitable')!;
    expect(indomitable.used).toBe(0);
  });

  it('resets short rest resources too', () => {
    const char = makeFighterWithResources();
    const result = longRest(char, data);

    const secondWind = getResource(result, 'Fighter', 'Second Wind')!;
    expect(secondWind.used).toBe(0);
  });

  it('does NOT reset per-turn resources', () => {
    const char = makeFighterWithResources();
    const result = longRest(char, data);

    const sneakAttack = getResource(result, 'Fighter', 'Sneak Attack')!;
    expect(sneakAttack.used).toBe(1); // still used
  });

  it('resets death saves', () => {
    const char = makeWarlock(); // has death saves: successes=2, failures=1
    const result = longRest(char, data);

    expect(result.hitPoints.deathSaves.successes).toBe(0);
    expect(result.hitPoints.deathSaves.failures).toBe(0);
    expect(result.hitPoints.deathSaves.isStable).toBe(false);
  });

  it('updates updatedAt timestamp', () => {
    const char = makeFighterWithResources();
    const result = longRest(char, data);

    expect(result.updatedAt).not.toBe(char.updatedAt);
  });
});

describe('shortRest with multi-class', () => {
  const data = createMockDataLoader();

  it('spends hit dice across classes in order', () => {
    const char = makeCharacter({
      classes: [
        {
          classId: 'Fighter',
          level: 5,
          subclassId: null,
          subclassLevel: null,
          hitDice: { die: 'd10', used: 3 },
        },
        {
          classId: 'Wizard',
          level: 3,
          subclassId: null,
          subclassLevel: null,
          hitDice: { die: 'd6', used: 1 },
        },
      ],
      hitPoints: {
        max: 55,
        current: 20,
        temporary: 0,
        deathSaves: { successes: 0, failures: 0, isStable: false },
      },
      abilityScores: {
        base: {
          Strength: 16,
          Dexterity: 14,
          Constitution: 16,
          Intelligence: 10,
          Wisdom: 12,
          Charisma: 8,
        },
        racialBonuses: {},
        featBonuses: {},
        temporaryBonuses: {},
      },
    });

    // Fighter: 5-3=2 available, d10 fixed+con=6+3=9 each
    // Wizard: 3-1=2 available, d6 fixed+con=4+3=7 each
    // Spend 3 dice: 2 from Fighter (18 HP) + 1 from Wizard (7 HP) = 25 HP
    const result = shortRest(char, 3, data);

    expect(result.classes[0]!.hitDice.used).toBe(5); // 3+2=5
    expect(result.classes[1]!.hitDice.used).toBe(2); // 1+1=2
    expect(result.hitPoints.current).toBe(20 + 18 + 7); // 45
  });
});
