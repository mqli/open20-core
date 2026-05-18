// tests/fixtures/spells.ts
// Shared mock spell data for tests
// Eliminates duplication across spell test files

import type { Spell, SpellLevel, SpellSchool } from '../../src/types/spell';

/**
 * Creates a mock spell with sensible defaults.
 * Only override the properties you need for your test.
 *
 * @param overrides - Partial spell object with only the properties you need to override
 * @returns A complete Spell object with defaults for all unused properties
 *
 * @example
 * const fireball = createMockSpell({
 *   id: 'fireball',
 *   name: 'Fireball',
 *   level: 3,
 *   school: 'Evocation',
 * });
 */
export function createMockSpell(overrides: Partial<Spell> = {}): Spell {
  const defaults: Spell = {
    id: 'mock-spell',
    name: 'Mock Spell',
    level: 1 as SpellLevel,
    school: 'Evocation' as SpellSchool,
    castingTime: 'Action',
    range: 'Self',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: ['A mock spell for testing.'],
    concentration: false,
    ritual: false,
    source: 'Test',
    classes: [],
  };

  return { ...defaults, ...overrides } as Spell;
}

// ── Pre-built Mock Spells ──────────────────────────────────

export const MOCK_FIREBALL: Spell = createMockSpell({
  id: 'fireball',
  name: 'Fireball',
  level: 3 as SpellLevel,
  school: 'Evocation' as SpellSchool,
  castingTime: 'Action',
  range: '150 ft.',
  components: ['V', 'S', 'M'],
  duration: 'Instantaneous',
  description: ['A bright streak flashes from your pointing finger...'],
  source: 'SRD',
});

export const MOCK_SHIELD: Spell = createMockSpell({
  id: 'shield',
  name: 'Shield',
  level: 1 as SpellLevel,
  school: 'Abjuration' as SpellSchool,
  castingTime: 'Reaction',
  range: 'Self',
  components: ['V', 'S'],
  duration: '1 round',
  description: ['An invisible barrier of magical force appears...'],
  source: 'SRD',
});

export const MOCK_MAGE_ARMOR: Spell = createMockSpell({
  id: 'mage-armor',
  name: 'Mage Armor',
  level: 1 as SpellLevel,
  school: 'Abjuration' as SpellSchool,
  castingTime: 'Action',
  range: 'Touch',
  components: ['V', 'S', 'M'],
  duration: '8 hours',
  description: ['You touch a willing creature...'],
  source: 'SRD',
});

export const MOCK_FIRE_BOLT: Spell = createMockSpell({
  id: 'fire-bolt',
  name: 'Fire Bolt',
  level: 0 as SpellLevel,
  school: 'Evocation' as SpellSchool,
  castingTime: 'Action',
  range: '120 ft.',
  components: ['V', 'S'],
  duration: 'Instantaneous',
  description: ['You hurl a mote of fire...'],
  source: 'SRD',
});

export const MOCK_HEALING_WORD: Spell = createMockSpell({
  id: 'healing-word',
  name: 'Healing Word',
  level: 1 as SpellLevel,
  school: 'Evocation' as SpellSchool,
  castingTime: 'Bonus Action',
  range: '60 ft.',
  components: ['V'],
  duration: 'Instantaneous',
  description: ['A creature of your choice that you can see...'],
  source: 'SRD',
});

export const MOCK_GUIDANCE: Spell = createMockSpell({
  id: 'guidance',
  name: 'Guidance',
  level: 0 as SpellLevel,
  school: 'Divination' as SpellSchool,
  castingTime: 'Action',
  range: 'Touch',
  components: ['V', 'S'],
  duration: 'Concentration, up to 1 minute',
  description: ['You touch one willing creature...'],
  source: 'SRD',
  concentration: true,
});

// ── Mock Spell Array ────────────────────────────────────────

export const MOCK_SPELLS: Spell[] = [
  MOCK_FIREBALL,
  MOCK_SHIELD,
  MOCK_MAGE_ARMOR,
  MOCK_FIRE_BOLT,
  MOCK_HEALING_WORD,
  MOCK_GUIDANCE,
];
