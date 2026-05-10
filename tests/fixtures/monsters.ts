// tests/fixtures/monsters.ts
// Shared mock monster data for tests
// Eliminates duplication across monster test files

import type { Monster } from '../../src/monster/types';
import type { DamageDefenses } from '../../src/types/damage';

/**
 * Creates a mock monster with sensible defaults.
 * Only override the properties you need for your test.
 *
 * @param overrides - Partial monster object with only the properties you need to override
 * @returns A complete Monster object with defaults for all unused properties
 *
 * @example
 * const goblin = createMockMonster({
 *   id: 'goblin',
 *   name: 'Goblin',
 *   hitPoints: { value: 7, formula: '2d6+2' },
 * });
 */
export function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const defaults: Monster = {
    id: 'mock-monster',
    name: 'Mock Monster',
    source: 'Test',
    size: 'Medium',
    type: 'Humanoid',
    alignment: 'neutral',
    armorClass: [{ value: 10, type: 'natural armor' }],
    hitPoints: { value: 10, formula: '2d8+2' },
    speed: { walk: 30 },
    abilityScores: {
      base: { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 },
      racialBonuses: {},
      featBonuses: {},
      temporaryBonuses: {},
    },
    challengeRating: { rating: 1, xp: 200 },
    environments: [],
    damageDefenses: {
      resistances: [],
      immunities: [],
      vulnerabilities: [],
    },
  };

  return { ...defaults, ...overrides } as Monster;
}

// ── Pre-built Mock Monsters ──────────────────────────────────

export const MOCK_GOBLIN: Monster = createMockMonster({
  id: 'goblin',
  name: 'Goblin',
  source: 'SRD 5.2',
  size: 'Small',
  type: 'Humanoid',
  alignment: 'neutral evil',
  armorClass: [{ value: 15, type: 'hide armor' }],
  hitPoints: { value: 7, formula: '2d6+2' },
  speed: { walk: 30 },
  abilityScores: {
    base: { Strength: 8, Dexterity: 14, Constitution: 10, Intelligence: 10, Wisdom: 8, Charisma: 8 },
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  },
  challengeRating: { rating: '1/4', xp: 50 },
  environments: ['forest', 'hill'],
  traits: [
    { name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action.' },
  ],
});

export const MOCK_ORC: Monster = createMockMonster({
  id: 'orc',
  name: 'Orc',
  source: 'SRD 5.2',
  size: 'Medium',
  type: 'Humanoid',
  alignment: 'chaotic evil',
  armorClass: [{ value: 13, type: 'hide armor' }],
  hitPoints: { value: 15, formula: '3d8+3' },
  speed: { walk: 30 },
  abilityScores: {
    base: { Strength: 16, Dexterity: 12, Constitution: 16, Intelligence: 7, Wisdom: 11, Charisma: 10 },
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  },
  challengeRating: { rating: '1/2', xp: 100 },
  environments: ['forest', 'grassland'],
});

export const MOCK_WOLF: Monster = createMockMonster({
  id: 'wolf',
  name: 'Wolf',
  source: 'SRD 5.2',
  size: 'Medium',
  type: 'Beast',
  alignment: 'unaligned',
  armorClass: [{ value: 13, type: 'natural armor' }],
  hitPoints: { value: 11, formula: '2d8+2' },
  speed: { walk: 40 },
  abilityScores: {
    base: { Strength: 12, Dexterity: 15, Constitution: 12, Intelligence: 3, Wisdom: 12, Charisma: 6 },
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  },
  challengeRating: { rating: '1/4', xp: 50 },
  environments: ['forest', 'grassland'],
});

// ── Damage Defenses Helpers ──────────────────────────────────

export function createMockDefenses(overrides: Partial<DamageDefenses> = {}): DamageDefenses {
  const defaults: DamageDefenses = {
    resistances: [],
    immunities: [],
    vulnerabilities: [],
  };

  return { ...defaults, ...overrides };
}

export const FIRE_RESISTANCE: DamageDefenses = createMockDefenses({
  resistances: ['Fire'],
});

export const FIRE_IMMUNITY: DamageDefenses = createMockDefenses({
  immunities: ['Fire'],
});

export const COLD_VULNERABILITY: DamageDefenses = createMockDefenses({
  vulnerabilities: ['Cold'],
});

// ── Pre-built Dragon Monsters ──────────────────────────

export const YOUNG_RED_DRAGON: Monster = {
  id: 'young-red-dragon',
  name: 'Young Red Dragon',
  source: 'SRD 5.2',
  size: 'Large',
  type: 'Dragon',
  descriptiveTags: ['Chromatic'],
  alignment: 'chaotic evil',
  armorClass: [{ value: 18, type: 'natural armor' }],
  hitPoints: { value: 178, formula: '17d10+85' },
  speed: { walk: 40, climb: 40, fly: 80 },
  initiative: { modifier: 0, score: 10 },
  abilityScores: {
    base: { Strength: 23, Dexterity: 10, Constitution: 21, Intelligence: 14, Wisdom: 11, Charisma: 19 },
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  },
  savingThrows: { Dexterity: 4, Wisdom: 4 },
  skills: { Perception: 7, Stealth: 4 },
  challengeRating: { rating: 10, xp: 5900 },
  resistances: [],
  vulnerabilities: [],
  damageDefenses: { resistances: [], immunities: ['Fire'], vulnerabilities: [] },
  senses: { blindsight: 30, darkvision: 120, passivePerception: 17 },
  languages: ['Common', 'Draconic'],
  conditionImmunities: ['Charmed', 'Frightened', 'Poisoned'],
  traits: [],
  actions: [],
  reactions: [],
  legendaryActions: [],
  environments: ['mountain'],
  currentHP: 178,
  temporaryHP: 0,
};

export const ADULT_RED_DRAGON: Monster = {
  id: 'adult-red-dragon',
  name: 'Adult Red Dragon',
  source: 'SRD 5.2',
  size: 'Gargantuan',
  type: 'Dragon',
  alignment: 'chaotic evil',
  armorClass: [{ value: 19, type: 'natural armor' }],
  hitPoints: { value: 256, formula: '24d12+120' },
  speed: { walk: 40, fly: 80 },
  abilityScores: {
    base: { Strength: 27, Dexterity: 10, Constitution: 25, Intelligence: 16, Wisdom: 13, Charisma: 21 },
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  },
  challengeRating: { rating: 17, xp: 18000 },
  environments: ['mountain'],
  damageDefenses: { resistances: [], immunities: ['Fire'], vulnerabilities: [] },
  traits: [],
  actions: [],
  reactions: [],
  legendaryActions: [],
  currentHP: 256,
  temporaryHP: 0,
};
