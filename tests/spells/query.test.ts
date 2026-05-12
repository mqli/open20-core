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
  getClassSpellData,
  knowsSpellForClass,
  isSpellPreparedForClass,
  getPreparationRule,
  canChangePreparedSpells,
  getMaxPreparedSpellChanges,
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
    classSpellcasting: {
      Wizard: {
        classId: 'Wizard',
        spellcastingAbility: 'Intelligence' as const,
        spellSaveDC: 15,
        spellAttackBonus: 7,
        knownSpells: ['fireball', 'shield', 'fire-bolt'],
        preparedSpells: ['shield', 'fireball'],
        alwaysPreparedSpells: [],
        maxPrepared: 5,
      },
    },
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
    const results = searchSpells({ school: ['Evocation'] }, data);
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
        school: ['Evocation'],
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
        classSpellcasting: {
          Wizard: {
            classId: 'Wizard',
            spellcastingAbility: 'Intelligence' as const,
            spellSaveDC: 15,
            spellAttackBonus: 7,
            knownSpells: ['fireball', 'non-existent'],
            preparedSpells: [],
            alwaysPreparedSpells: [],
            maxPrepared: 5,
          },
        },
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

describe('getClassSpellData', () => {
  it('should return class spell data for existing class', () => {
    const result = getClassSpellData(MOCK_CHARACTER as any, 'Wizard');
    expect(result).toBeDefined();
    expect(result?.classId).toBe('Wizard');
    expect(result?.spellcastingAbility).toBe('Intelligence');
  });

  it('should return undefined for non-existent class', () => {
    const result = getClassSpellData(MOCK_CHARACTER as any, 'Fighter');
    expect(result).toBeUndefined();
  });
});

describe('knowsSpellForClass', () => {
  it('should return true for spell known by class', () => {
    expect(knowsSpellForClass(MOCK_CHARACTER as any, 'Wizard', 'fireball')).toBe(true);
  });

  it('should return false for spell not known by class', () => {
    expect(knowsSpellForClass(MOCK_CHARACTER as any, 'Wizard', 'wish')).toBe(false);
  });

  it('should return false for non-existent class', () => {
    expect(knowsSpellForClass(MOCK_CHARACTER as any, 'Fighter', 'fireball')).toBe(false);
  });
});

describe('isSpellPreparedForClass', () => {
  it('should return true for prepared spell', () => {
    expect(isSpellPreparedForClass(MOCK_CHARACTER as any, 'Wizard', 'shield')).toBe(true);
  });

  it('should return true for always-prepared spell', () => {
    const char = {
      spells: {
        classSpellcasting: {
          Wizard: {
            classId: 'Wizard',
            spellcastingAbility: 'Intelligence' as const,
            spellSaveDC: 15,
            spellAttackBonus: 7,
            knownSpells: ['shield'],
            preparedSpells: [],
            alwaysPreparedSpells: ['shield'],
            maxPrepared: 5,
          },
        },
        spellSlots: {},
        pactMagicSlots: null,
      },
    };
    expect(isSpellPreparedForClass(char as any, 'Wizard', 'shield')).toBe(true);
  });

  it('should return false for unknown spell', () => {
    expect(isSpellPreparedForClass(MOCK_CHARACTER as any, 'Wizard', 'wish')).toBe(false);
  });

  it('should return false for non-existent class', () => {
    expect(isSpellPreparedForClass(MOCK_CHARACTER as any, 'Fighter', 'shield')).toBe(false);
  });
});

describe('getPreparationRule', () => {
  it('should return correct rule for Wizard (prepares, any changes)', () => {
    const char = {
      classes: [{ classId: 'wizard', level: 3 }],
    };
    const rule = getPreparationRule(char as any);
    expect(rule.preparesSpells).toBe(true);
    expect(rule.changeTiming).toBe('long-rest');
    expect(rule.changeLimit).toBe('any');
  });

  it('should return correct rule for Sorcerer (knows, level-up only)', () => {
    const char = {
      classes: [{ classId: 'sorcerer', level: 3 }],
    };
    const rule = getPreparationRule(char as any);
    expect(rule.preparesSpells).toBe(false);
    expect(rule.changeTiming).toBe('level-up');
    expect(rule.changeLimit).toBe('level-up-only');
  });

  it('should return correct rule for Paladin (prepares, one per long rest)', () => {
    const char = {
      classes: [{ classId: 'paladin', level: 3 }],
    };
    const rule = getPreparationRule(char as any);
    expect(rule.preparesSpells).toBe(true);
    expect(rule.changeTiming).toBe('long-rest');
    expect(rule.changeLimit).toBe('one-per-long-rest');
  });

  it('should handle multiclass (Wizard + Sorcerer = prepared with any limit)', () => {
    const char = {
      classes: [
        { classId: 'wizard', level: 3 },
        { classId: 'sorcerer', level: 2 },
      ],
    };
    const rule = getPreparationRule(char as any);
    // Wizard is a prepared caster with 'any' limit
    expect(rule.preparesSpells).toBe(true);
    expect(rule.changeLimit).toBe('any');
  });

  it('should return default for non-caster', () => {
    const char = {
      classes: [{ classId: 'fighter', level: 3 }],
    };
    const rule = getPreparationRule(char as any);
    expect(rule.preparesSpells).toBe(false);
    expect(rule.changeLimit).toBe('level-up-only');
  });
});

describe('canChangePreparedSpells', () => {
  it('should return true for prepared casters (long-rest timing)', () => {
    const char = {
      classes: [{ classId: 'wizard', level: 3 }],
    };
    expect(canChangePreparedSpells(char as any)).toBe(true);
  });

  it('should return false for known casters (level-up timing)', () => {
    const char = {
      classes: [{ classId: 'sorcerer', level: 3 }],
    };
    expect(canChangePreparedSpells(char as any)).toBe(false);
  });
});

describe('getMaxPreparedSpellChanges', () => {
  it('should return Infinity for prepared casters with any limit', () => {
    const char = {
      classes: [{ classId: 'wizard', level: 3 }],
    };
    expect(getMaxPreparedSpellChanges(char as any)).toBe(Infinity);
  });

  it('should return 1 for Paladin (one-per-long-rest)', () => {
    const char = {
      classes: [{ classId: 'paladin', level: 3 }],
    };
    expect(getMaxPreparedSpellChanges(char as any)).toBe(1);
  });

  it('should return 0 for known casters (level-up-only)', () => {
    const char = {
      classes: [{ classId: 'sorcerer', level: 3 }],
    };
    expect(getMaxPreparedSpellChanges(char as any)).toBe(0);
  });
});
