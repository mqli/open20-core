// tests/storage/serializer.test.ts
// Unit tests for storage/serializer module

import { describe, it, expect } from 'vitest';
import {
  serialize,
  deserialize,
  validateSchemaVersion,
  sanitizeFilename,
} from '../../src/storage/serializer';
import type { Character } from '../../src/types/character';

// ── Test Helpers ──────────────────────────────────────────────────

function createMinimalCharacter(overrides?: Partial<Character>): Character {
  return {
    schemaVersion: '2024.1',
    name: 'Test Character',
    species: 'Human',
    speciesSubtype: null,
    background: 'Soldier',
    classes: [
      {
        classId: 'Fighter',
        level: 1,
        subclassId: null,
        subclassLevel: null,
        hitDice: { die: 'd10', used: 0 },
      },
    ],
    abilityScores: {
      base: {
        Strength: 15,
        Dexterity: 12,
        Constitution: 14,
        Intelligence: 10,
        Wisdom: 13,
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
      spellSlots: {} as Record<import('../../src/types/spell').SpellLevel, import('../../src/types/spell').SpellSlotEntry>,
      pactMagicSlots: null,
    },
    resources: {},
    hitPoints: {
      max: 13,
      current: 13,
      temporary: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
    combatStats: {
      AC: 10,
      initiative: 1,
      speed: 30,
      passivePerception: 11,
      proficiencyBonus: 2,
      attacks: [],
    },
    currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
    conditions: [],
    damageDefenses: { resistances: [], immunities: [], vulnerabilities: [] },
    notes: '',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('serialize', () => {
  it('serializes a character to a valid JSON string', () => {
    const char = createMinimalCharacter();
    const json = serialize(char);

    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('Test Character');
    expect(parsed.schemaVersion).toBe('2024.1');
  });

  it('round-trips: serialize then deserialize gives equivalent character', () => {
    const original = createMinimalCharacter();
    const json = serialize(original);
    const restored = deserialize(json);

    expect(restored.name).toBe(original.name);
    expect(restored.species).toBe(original.species);
    expect(restored.classes[0]!.classId).toBe('Fighter');
    expect(restored.classes[0]!.level).toBe(1);
    expect(restored.hitPoints.max).toBe(13);
    expect(restored.currency.gp).toBe(10);
  });
});

describe('deserialize', () => {
  it('returns a Character object from valid JSON', () => {
    const char = createMinimalCharacter();
    const json = serialize(char);
    const result = deserialize(json);

    expect(result.name).toBe('Test Character');
    expect(result.schemaVersion).toBe('2024.1');
  });

  it('throws on invalid JSON', () => {
    expect(() => deserialize('not valid json')).toThrow('Invalid JSON');
  });

  it('throws when schemaVersion is missing', () => {
    const char = createMinimalCharacter();
    const obj = JSON.parse(serialize(char));
    delete (obj as Record<string, unknown>).schemaVersion;
    const json = JSON.stringify(obj);

    expect(() => deserialize(json)).toThrow('Missing schemaVersion');
  });

  it('throws when schemaVersion is incompatible', () => {
    const char = createMinimalCharacter();
    const obj = JSON.parse(serialize(char));
    obj.schemaVersion = '2023.0';
    const json = JSON.stringify(obj);

    expect(() => deserialize(json)).toThrow('Incompatible schema version');
  });

  it('throws when schema structure is wrong', () => {
    const json = JSON.stringify({ schemaVersion: '2024.1', name: 123 });
    expect(() => deserialize(json)).toThrow();
  });
});

describe('validateSchemaVersion', () => {
  it('returns compatible for valid version', () => {
    const char = createMinimalCharacter();
    const json = serialize(char);

    const result = validateSchemaVersion(json);
    expect(result.compatible).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('returns incompatible for wrong version', () => {
    const char = createMinimalCharacter();
    const obj = JSON.parse(serialize(char));
    obj.schemaVersion = '2023.0';
    const json = JSON.stringify(obj);

    const result = validateSchemaVersion(json);
    expect(result.compatible).toBe(false);
    expect(result.message).toContain('Incompatible');
  });

  it('returns incompatible for missing schemaVersion', () => {
    const json = JSON.stringify({ name: 'test' });
    const result = validateSchemaVersion(json);
    expect(result.compatible).toBe(false);
    expect(result.message).toContain('Missing');
  });

  it('returns incompatible for invalid JSON', () => {
    const result = validateSchemaVersion('not json');
    expect(result.compatible).toBe(false);
    expect(result.message).toContain('Invalid JSON');
  });
});

describe('sanitizeFilename', () => {
  it('converts "Borin Ironforge" to "borin-ironforge"', () => {
    expect(sanitizeFilename('Borin Ironforge')).toBe('borin-ironforge');
  });

  it('converts "Bob/O\'Malley" to "bob-o-malley"', () => {
    expect(sanitizeFilename("Bob/O'Malley")).toBe('bob-o-malley');
  });

  it('trims spaces from "   spaces  " to "spaces"', () => {
    expect(sanitizeFilename('   spaces  ')).toBe('spaces');
  });

  it('returns "unnamed-character" for empty string', () => {
    expect(sanitizeFilename('')).toBe('unnamed-character');
  });

  it('returns "unnamed-character" for whitespace-only string', () => {
    expect(sanitizeFilename('   ')).toBe('unnamed-character');
  });

  it('lowercases the result', () => {
    expect(sanitizeFilename('UPPERCASE')).toBe('uppercase');
  });

  it('replaces multiple non-alphanumeric chars with single hyphen', () => {
    expect(sanitizeFilename('A---B')).toBe('a-b');
  });

  it('removes leading and trailing hyphens', () => {
    expect(sanitizeFilename('-leading')).toBe('leading');
    expect(sanitizeFilename('trailing-')).toBe('trailing');
  });

  it('limits length to 64 characters', () => {
    const longName = 'a'.repeat(100);
    expect(sanitizeFilename(longName).length).toBe(64);
  });
});
