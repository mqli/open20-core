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
  isPreparationCaster,
  isKnownCaster,
} from '../../src/spells/query';
import type { DataLoader } from '../../src/data/loader';
import type { Spell, SpellLevel, SpellSchool } from '../../src/types/spell';
import type { Class } from '../../src/types/class';

// ── Shared Fixtures ───────────────────────────────────

import { createMockDataLoader } from '../fixtures/data-loader';
import { MOCK_SPELLS } from '../fixtures/spells';

// ── Mock DataLoader ────────────────────────────────────

function createMockDataLoaderWithSpells(spells: Spell[] = MOCK_SPELLS): DataLoader {
  return createMockDataLoader({
    getSpell: (id: string) => spells.find(s => s.id === id),
    getAllSpells: () => spells,
    getSpellsByLevel: (level: SpellLevel) => spells.filter(s => s.level === level),
  });
}

// ── Mock Character ─────────────────────────────────────

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

// ── Mock Class Data ────────────────────────────────────

const MOCK_WIZARD_CLASS: Class = {
  id: 'Wizard',
  name: 'Wizard',
  source: '2024 PHB',
  hitDie: 'd6' as any,
  savingThrowProficiencies: ['Intelligence', 'Wisdom'] as any,
  armorTraining: [],
  weaponProficiencies: [],
  weaponMastery: false,
  featuresByLevel: new Map(),
  spellcasting: {
    type: 'preparation',
    ability: 'Intelligence' as any,
    knownSource: 'spellbook',
    changesPerRest: 'all',
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
  featuresByLevel: new Map(),
  spellcasting: {
    type: 'preparation',
    ability: 'Wisdom' as any,
    knownSource: 'class_list',
    changesPerRest: 'all',
  },
};

const MOCK_BARD_CLASS: Class = {
  id: 'Bard',
  name: 'Bard',
  source: '2024 PHB',
  hitDie: 'd8' as any,
  savingThrowProficiencies: ['Dexterity', 'Charisma'] as any,
  armorTraining: ['Light'],
  weaponProficiencies: ['Simple', 'Hand Crossbow', 'Longsword', 'Rapier', 'Shortsword'],
  weaponMastery: false,
  featuresByLevel: new Map(),
  spellcasting: {
    type: 'known',
    ability: 'Charisma' as any,
    changesPerLevel: 1,
  },
};

const MOCK_FIGHTER_CLASS: Class = {
  id: 'Fighter',
  name: 'Fighter',
  source: '2024 PHB',
  hitDie: 'd10' as any,
  savingThrowProficiencies: ['Strength', 'Constitution'] as any,
  armorTraining: ['Light', 'Medium', 'Heavy', 'Shields'],
  weaponProficiencies: ['Simple', 'Martial'],
  weaponMastery: true,
  featuresByLevel: new Map(),
  spellcasting: null,
};

// ── Tests ─────────────────────────────────────────────

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

  it('should include always-prepared spells', () => {
    const char = {
      spells: {
        classSpellcasting: {
          Wizard: {
            classId: 'Wizard',
            spellcastingAbility: 'Intelligence' as const,
            spellSaveDC: 15,
            spellAttackBonus: 7,
            knownSpells: ['fireball', 'shield'],
            preparedSpells: ['shield'],
            alwaysPreparedSpells: ['guidance', 'healing-word'],
            maxPrepared: 5,
          },
        },
        spellSlots: {},
        pactMagicSlots: null,
      },
    };
    const results = getPreparedSpells(char as any, data);
    expect(results.map(s => s.id)).toContain('shield'); // regularly prepared
    expect(results.map(s => s.id)).toContain('guidance'); // always-prepared
    expect(results.map(s => s.id)).toContain('healing-word'); // always-prepared
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

describe('isPreparationCaster', () => {
  it('should return true for Wizard (preparation caster)', () => {
    expect(isPreparationCaster(MOCK_WIZARD_CLASS)).toBe(true);
  });

  it('should return true for Cleric (preparation caster)', () => {
    expect(isPreparationCaster(MOCK_CLERIC_CLASS)).toBe(true);
  });

  it('should return false for Bard (known caster)', () => {
    expect(isPreparationCaster(MOCK_BARD_CLASS)).toBe(false);
  });

  it('should return false for Fighter (non-caster)', () => {
    expect(isPreparationCaster(MOCK_FIGHTER_CLASS)).toBe(false);
  });
});

describe('isKnownCaster', () => {
  it('should return true for Bard (known caster)', () => {
    expect(isKnownCaster(MOCK_BARD_CLASS)).toBe(true);
  });

  it('should return false for Wizard (preparation caster)', () => {
    expect(isKnownCaster(MOCK_WIZARD_CLASS)).toBe(false);
  });

  it('should return false for Fighter (non-caster)', () => {
    expect(isKnownCaster(MOCK_FIGHTER_CLASS)).toBe(false);
  });
});
