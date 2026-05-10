// tests/spells/query.test.ts
// Tests for spell query functions

import { describe, it, expect } from 'vitest';
import {
  getSpell,
  searchSpells,
  getSpellsForCharacter,
  getPreparedSpells,
  isSpellPrepared,
  knowsSpell,
} from '../../src/spells/query';
import type { DataLoader } from '../../src/data/loader';
import type { Spell, SpellLevel, SpellSchool } from '../../src/types/spell';

// ── Shared Fixtures ───────────────────────────────────────────

import { createMockDataLoader } from '../fixtures/data-loader';
import { MOCK_SPELLS } from '../fixtures/spells';

// ── Mock DataLoader ────────────────────────────────────────────

function createMockDataLoaderWithSpells(spells: Spell[] = MOCK_SPELLS): DataLoader {
  return createMockDataLoader({
    getSpell: (id: string) => spells.find(s => s.id === id),
    getAllSpells: () => spells,
    getSpellsByLevel: (level: SpellLevel) => spells.filter(s => s.level === level),
  });
}

// ── Mock Character ─────────────────────────────────────────────

const MOCK_CHARACTER = {
  spells: {
    knownSpells: ['fireball', 'shield', 'fire-bolt'],
    preparedSpells: ['shield', 'fireball'],
    spellcastingAbility: 'Intelligence' as const,
    spellSaveDC: 15,
    spellAttackBonus: 7,
    spellSlots: {},
    pactMagicSlots: null,
  },
};

// ── Tests ─────────────────────────────────────────────────────

describe('getSpell', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return spell by id', () => {
    const spell = getSpell('fireball', data);
    expect(spell).toBeDefined();
    expect(spell?.name).toBe('Fireball');
  });

  it('should return undefined for non-existent spell', () => {
    const spell = getSpell('non-existent', data);
    expect(spell).toBeUndefined();
  });
});

describe('searchSpells', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return all spells when no filter', () => {
    const results = searchSpells({}, data);
    expect(results.length).toBe(MOCK_SPELLS.length);
  });

  it('should filter by name (case-insensitive)', () => {
    const results = searchSpells({ name: 'fire' }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.name.toLowerCase().includes('fire'))).toBe(true);
  });

  it('should filter by level', () => {
    const results = searchSpells({ level: [0, 1] }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.level === 0 || s.level === 1)).toBe(true);
  });

  it('should filter by school', () => {
    const results = searchSpells({ school: 'Evocation' }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.school === 'Evocation')).toBe(true);
  });

  it('should filter by concentration', () => {
    const results = searchSpells({ concentration: true }, data);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.concentration === true)).toBe(true);
  });

  it('should filter by ritual', () => {
    const results = searchSpells({ ritual: true }, data);
    expect(results).toEqual([]); // No ritual spells in mock data
  });

  it('should combine multiple filters', () => {
    const results = searchSpells(
      {
        level: [1],
        school: 'Evocation',
      },
      data
    );
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe('healing-word');
  });
});

describe('getSpellsForCharacter', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return known spells with full data', () => {
    const results = getSpellsForCharacter(MOCK_CHARACTER as any, data);
    expect(results.length).toBe(3);
    expect(results.map(s => s.id)).toContain('fireball');
    expect(results.map(s => s.id)).toContain('shield');
    expect(results.map(s => s.id)).toContain('fire-bolt');
  });

  it('should skip unknown spell ids', () => {
    const char = {
      spells: {
        knownSpells: ['fireball', 'non-existent'],
        preparedSpells: [],
        spellcastingAbility: 'Intelligence' as const,
        spellSaveDC: 15,
        spellAttackBonus: 7,
        spellSlots: {},
        pactMagicSlots: null,
      },
    };
    const results = getSpellsForCharacter(char as any, data);
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe('fireball');
  });
});

describe('getPreparedSpells', () => {
  const data = createMockDataLoaderWithSpells();

  it('should return prepared spells with full data', () => {
    const results = getPreparedSpells(MOCK_CHARACTER as any, data);
    expect(results.length).toBe(2);
    expect(results.map(s => s.id)).toContain('shield');
    expect(results.map(s => s.id)).toContain('fireball');
  });
});

describe('isSpellPrepared', () => {
  it('should return true for prepared spell', () => {
    expect(isSpellPrepared(MOCK_CHARACTER as any, 'shield')).toBe(true);
  });

  it('should return false for known but not prepared spell', () => {
    expect(isSpellPrepared(MOCK_CHARACTER as any, 'fire-bolt')).toBe(false);
  });

  it('should return false for unknown spell', () => {
    expect(isSpellPrepared(MOCK_CHARACTER as any, 'non-existent')).toBe(false);
  });
});

describe('knowsSpell', () => {
  it('should return true for known spell', () => {
    expect(knowsSpell(MOCK_CHARACTER as any, 'fireball')).toBe(true);
  });

  it('should return false for unknown spell', () => {
    expect(knowsSpell(MOCK_CHARACTER as any, 'non-existent')).toBe(false);
  });
});
