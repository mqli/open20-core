// tests/engine/damage-calculator.test.ts
// Tests for damage type and defense calculations

import { describe, it, expect } from 'vitest';
import {
  calculateTypedDamage,
  parseDamageType,
  isValidDamageType,
  getActiveDamageDefenses,
  getDamageDefenses,
  ALL_DAMAGE_TYPES,
  DAMAGE_TYPE_CATEGORIES,
} from '../../src/engine/damage-calculator';
import { applyDamageWithDefenses } from '../../src/rolls/character';
import type { DamageDefenses } from '../../src/types/damage';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
const dataLoader = createDataLoader();

describe('DamageType parsing', () => {
  it('parses standard damage types case-sensitively', () => {
    expect(parseDamageType('Fire')).toBe('Fire');
    expect(parseDamageType('Cold')).toBe('Cold');
    expect(parseDamageType('Piercing')).toBe('Piercing');
  });

  it('parses damage types case-insensitively', () => {
    expect(parseDamageType('fire')).toBe('Fire');
    expect(parseDamageType('FIRE')).toBe('Fire');
    expect(parseDamageType('piercing')).toBe('Piercing');
  });

  it('parses damage types with whitespace', () => {
    expect(parseDamageType('  Fire  ')).toBe('Fire');
    expect(parseDamageType(' Lightning ')).toBe('Lightning');
  });

  it('returns null for invalid damage types', () => {
    expect(parseDamageType('invalid')).toBeNull();
    expect(parseDamageType('')).toBeNull();
    expect(parseDamageType('   ')).toBeNull();
    expect(parseDamageType('Magic')).toBeNull();
  });

  it('validates damage types correctly', () => {
    expect(isValidDamageType('Fire')).toBe(true);
    expect(isValidDamageType('cold')).toBe(true);
    expect(isValidDamageType('invalid')).toBe(false);
  });

  it('includes all standard damage types', () => {
    expect(ALL_DAMAGE_TYPES).toHaveLength(13);
    expect(ALL_DAMAGE_TYPES).toContain('Fire');
    expect(ALL_DAMAGE_TYPES).toContain('Psychic');
    expect(ALL_DAMAGE_TYPES).toContain('Bludgeoning');
  });

  it('groups damage types by category', () => {
    expect(DAMAGE_TYPE_CATEGORIES.physical).toEqual(['Bludgeoning', 'Piercing', 'Slashing']);
    expect(DAMAGE_TYPE_CATEGORIES.elemental).toContain('Fire');
    expect(DAMAGE_TYPE_CATEGORIES.magical).toContain('Psychic');
  });
});

describe('calculateTypedDamage', () => {
  const emptyDefenses: DamageDefenses = {
    resistances: [],
    immunities: [],
    vulnerabilities: [],
  };

  describe('no defenses', () => {
    it('returns damage unchanged with no defenses', () => {
      const result = calculateTypedDamage(10, 'Fire', emptyDefenses);
      expect(result.originalDamage).toBe(10);
      expect(result.effectiveDamage).toBe(10);
      expect(result.modifiers).toHaveLength(0);
    });

    it('handles zero damage', () => {
      const result = calculateTypedDamage(0, 'Fire', emptyDefenses);
      expect(result.effectiveDamage).toBe(0);
    });
  });

  describe('resistance', () => {
    const fireResistance: DamageDefenses = {
      resistances: ['Fire'],
      immunities: [],
      vulnerabilities: [],
    };

    it('halves damage with resistance', () => {
      const result = calculateTypedDamage(10, 'Fire', fireResistance);
      expect(result.originalDamage).toBe(10);
      expect(result.effectiveDamage).toBe(5);
      expect(result.modifiers).toEqual([{ type: 'resistance', damageType: 'Fire' }]);
    });

    it('rounds down when halving odd numbers', () => {
      const result = calculateTypedDamage(7, 'Fire', fireResistance);
      expect(result.effectiveDamage).toBe(3); // 7 / 2 = 3.5 → 3
    });

    it('handles odd number rounding correctly', () => {
      expect(calculateTypedDamage(1, 'Fire', fireResistance).effectiveDamage).toBe(0); // 1/2 = 0
      expect(calculateTypedDamage(3, 'Fire', fireResistance).effectiveDamage).toBe(1); // 3/2 = 1
      expect(calculateTypedDamage(5, 'Fire', fireResistance).effectiveDamage).toBe(2); // 5/2 = 2
    });

    it('does not apply resistance to different damage types', () => {
      const result = calculateTypedDamage(10, 'Cold', fireResistance);
      expect(result.effectiveDamage).toBe(10);
      expect(result.modifiers).toHaveLength(0);
    });
  });

  describe('immunity', () => {
    const fireImmunity: DamageDefenses = {
      resistances: [],
      immunities: ['Fire'],
      vulnerabilities: [],
    };

    it('negates all damage with immunity', () => {
      const result = calculateTypedDamage(100, 'Fire', fireImmunity);
      expect(result.effectiveDamage).toBe(0);
      expect(result.modifiers).toEqual([{ type: 'immunity', damageType: 'Fire' }]);
    });

    it('handles small damage with immunity', () => {
      const result = calculateTypedDamage(1, 'Fire', fireImmunity);
      expect(result.effectiveDamage).toBe(0);
    });
  });

  describe('vulnerability', () => {
    const fireVulnerability: DamageDefenses = {
      resistances: [],
      immunities: [],
      vulnerabilities: ['Fire'],
    };

    it('doubles damage with vulnerability', () => {
      const result = calculateTypedDamage(10, 'Fire', fireVulnerability);
      expect(result.effectiveDamage).toBe(20);
      expect(result.modifiers).toEqual([{ type: 'vulnerability', damageType: 'Fire' }]);
    });

    it('does not apply vulnerability to different damage types', () => {
      const result = calculateTypedDamage(10, 'Cold', fireVulnerability);
      expect(result.effectiveDamage).toBe(10);
      expect(result.modifiers).toHaveLength(0);
    });
  });

  describe('resistance + vulnerability interaction', () => {
    const fireResAndVuln: DamageDefenses = {
      resistances: ['Fire'],
      immunities: [],
      vulnerabilities: ['Fire'],
    };

    it('cancels out resistance and vulnerability', () => {
      const result = calculateTypedDamage(10, 'Fire', fireResAndVuln);
      expect(result.effectiveDamage).toBe(10);
      // No modifiers when they cancel out
      expect(result.modifiers).toHaveLength(0);
    });

    it('does not affect different damage types', () => {
      const result = calculateTypedDamage(10, 'Cold', fireResAndVuln);
      expect(result.effectiveDamage).toBe(10);
      expect(result.modifiers).toHaveLength(0);
    });
  });

  describe('multiple defenses on different types', () => {
    const mixedDefenses: DamageDefenses = {
      resistances: ['Fire', 'Cold'],
      immunities: ['Poison'],
      vulnerabilities: ['Lightning'],
    };

    it('applies resistance to Fire', () => {
      const result = calculateTypedDamage(10, 'Fire', mixedDefenses);
      expect(result.effectiveDamage).toBe(5);
    });

    it('applies immunity to Poison', () => {
      const result = calculateTypedDamage(50, 'Poison', mixedDefenses);
      expect(result.effectiveDamage).toBe(0);
    });

    it('applies vulnerability to Lightning', () => {
      const result = calculateTypedDamage(10, 'Lightning', mixedDefenses);
      expect(result.effectiveDamage).toBe(20);
    });

    it('applies no modifier to unlisted types', () => {
      const result = calculateTypedDamage(10, 'Psychic', mixedDefenses);
      expect(result.effectiveDamage).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('handles very large damage numbers', () => {
      const result = calculateTypedDamage(999999, 'Fire', {
        resistances: ['Fire'],
        immunities: [],
        vulnerabilities: [],
      });
      expect(result.effectiveDamage).toBe(499999);
    });

    it('handles all physical damage types with resistance', () => {
      const physRes: DamageDefenses = {
        resistances: ['Bludgeoning', 'Piercing', 'Slashing'],
        immunities: [],
        vulnerabilities: [],
      };

      expect(calculateTypedDamage(10, 'Bludgeoning', physRes).effectiveDamage).toBe(5);
      expect(calculateTypedDamage(10, 'Piercing', physRes).effectiveDamage).toBe(5);
      expect(calculateTypedDamage(10, 'Slashing', physRes).effectiveDamage).toBe(5);
    });

    it('handles all elemental damage types', () => {
      const elemVuln: DamageDefenses = {
        resistances: [],
        immunities: [],
        vulnerabilities: ['Fire', 'Cold', 'Lightning', 'Thunder', 'Acid'],
      };

      expect(calculateTypedDamage(10, 'Fire', elemVuln).effectiveDamage).toBe(20);
      expect(calculateTypedDamage(10, 'Cold', elemVuln).effectiveDamage).toBe(20);
      expect(calculateTypedDamage(10, 'Lightning', elemVuln).effectiveDamage).toBe(20);
    });
  });
});

describe('getActiveDamageDefenses', () => {
  describe('Dwarf species resistance', () => {
    it('should detect Poison resistance from Dwarf species', () => {
      const dwarf = createCharacter(
        {
          name: 'Thorin',
          speciesId: 'Dwarf',
          speciesSubtypeId: 'Hill Dwarf',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 15,
            Dexterity: 10,
            Constitution: 16,
            Intelligence: 8,
            Wisdom: 13,
            Charisma: 11,
          },
        },
        dataLoader
      );

      const { defenses, sources } = getActiveDamageDefenses(dwarf, dataLoader);

      expect(defenses.resistances).toContain('Poison');
      expect(defenses.resistances).toHaveLength(1);
      expect(sources).toHaveLength(1);
      expect(sources[0]!.source).toContain('Dwarf');
      expect(sources[0]!.type).toBe('species');
    });

    it('should aggregate defenses from Hill Dwarf correctly', () => {
      const dwarf = createCharacter(
        {
          name: 'Gimli',
          speciesId: 'Dwarf',
          speciesSubtypeId: 'Hill Dwarf',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 16,
            Dexterity: 10,
            Constitution: 16,
            Intelligence: 8,
            Wisdom: 13,
            Charisma: 11,
          },
        },
        dataLoader
      );

      const { defenses } = getActiveDamageDefenses(dwarf, dataLoader);

      // Hill Dwarf has Dwarven Resilience (poison resistance)
      expect(defenses.resistances).toContain('Poison');
    });
  });

  describe('Human has no innate defenses', () => {
    it('should return empty defenses for Human', () => {
      const human = createCharacter(
        {
          name: 'Bob',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 15,
            Dexterity: 13,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      const { defenses, sources } = getActiveDamageDefenses(human, dataLoader);

      expect(defenses.resistances).toHaveLength(0);
      expect(defenses.immunities).toHaveLength(0);
      expect(defenses.vulnerabilities).toHaveLength(0);
      expect(sources).toHaveLength(0);
    });
  });
});

describe('Rage condition integration', () => {
  it('should NOT apply B/P/S resistance when not raging', () => {
    const barbarian = createCharacter(
      {
        name: 'Kroth',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Barbarian',
        abilityScores: {
          Strength: 16,
          Dexterity: 12,
          Constitution: 16,
          Intelligence: 8,
          Wisdom: 10,
          Charisma: 8,
        },
      },
      dataLoader
    );

    const { defenses } = getActiveDamageDefenses(barbarian, dataLoader);

    // Should NOT have physical resistance when not raging
    expect(defenses.resistances).not.toContain('Bludgeoning');
    expect(defenses.resistances).not.toContain('Piercing');
    expect(defenses.resistances).not.toContain('Slashing');
  });

  it('should apply B/P/S resistance when Raging condition is active', () => {
    let barbarian = createCharacter(
      {
        name: 'Kroth',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Barbarian',
        abilityScores: {
          Strength: 16,
          Dexterity: 12,
          Constitution: 16,
          Intelligence: 8,
          Wisdom: 10,
          Charisma: 8,
        },
      },
      dataLoader
    );

    // Add Raging condition
    barbarian = modifyHP(barbarian, 0); // No HP change, just trigger withUpdate
    // Manually add the Raging condition
    barbarian = {
      ...barbarian,
      conditions: [
        ...barbarian.conditions,
        {
          id: 'Raging' as any,
          source: 'Player',
          appliedAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const { defenses, sources } = getActiveDamageDefenses(barbarian, dataLoader);

    // Should have physical resistance when raging
    expect(defenses.resistances).toContain('Bludgeoning');
    expect(defenses.resistances).toContain('Piercing');
    expect(defenses.resistances).toContain('Slashing');

    // Should have rage source
    const rageSource = sources.find(s => s.source.includes('Rage'));
    expect(rageSource).toBeDefined();
    expect(rageSource!.type).toBe('class');
  });

  it('should apply resistance correctly to physical damage while raging', () => {
    let barbarian = createCharacter(
      {
        name: 'Kroth',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Barbarian',
        abilityScores: {
          Strength: 16,
          Dexterity: 12,
          Constitution: 16,
          Intelligence: 8,
          Wisdom: 10,
          Charisma: 8,
        },
      },
      dataLoader
    );

    // Add Raging condition
    barbarian = {
      ...barbarian,
      conditions: [
        ...barbarian.conditions,
        {
          id: 'Raging' as any,
          source: 'Player',
          appliedAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    // Take 10 slashing damage while raging
    const { char: _damaged, result } = applyDamageWithDefenses(
      barbarian,
      10,
      'Slashing',
      dataLoader
    );

    // Should be halved due to rage resistance
    expect(result.originalDamage).toBe(10);
    expect(result.effectiveDamage).toBe(5);
    expect(result.modifiers).toHaveLength(1);
    expect(result.modifiers[0]).toEqual({ type: 'resistance', damageType: 'Slashing' });
  });

  it('should NOT apply rage resistance to non-physical damage', () => {
    let barbarian = createCharacter(
      {
        name: 'Kroth',
        speciesId: 'Human',
        backgroundId: 'soldier',
        classId: 'Barbarian',
        abilityScores: {
          Strength: 16,
          Dexterity: 12,
          Constitution: 16,
          Intelligence: 8,
          Wisdom: 10,
          Charisma: 8,
        },
      },
      dataLoader
    );

    // Add Raging condition
    barbarian = {
      ...barbarian,
      conditions: [
        ...barbarian.conditions,
        {
          id: 'Raging' as any,
          source: 'Player',
          appliedAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    // Take 10 fire damage while raging (rage doesn't protect from fire)
    const { result } = applyDamageWithDefenses(barbarian, 10, 'Fire', dataLoader);

    expect(result.originalDamage).toBe(10);
    expect(result.effectiveDamage).toBe(10);
    expect(result.modifiers).toHaveLength(0);
  });
});

describe('applyDamageWithDefenses', () => {
  it('should apply damage and return defenses used', () => {
    const dwarf = createCharacter(
      {
        name: 'Thorin',
        speciesId: 'Dwarf',
        speciesSubtypeId: 'Hill Dwarf',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 10,
          Constitution: 16,
          Intelligence: 8,
          Wisdom: 13,
          Charisma: 11,
        },
      },
      dataLoader
    );

    const originalHP = dwarf.hitPoints.current;
    const {
      char: damaged,
      result,
      defenses,
    } = applyDamageWithDefenses(dwarf, 10, 'Poison', dataLoader);

    // Poison damage should be halved
    expect(result.effectiveDamage).toBe(5);
    expect(defenses.resistances).toContain('Poison');
    expect(originalHP - damaged.hitPoints.current).toBe(5);
  });

  it('should handle immunity from defenses', () => {
    let dwarf = createCharacter(
      {
        name: 'Thorin',
        speciesId: 'Dwarf',
        speciesSubtypeId: 'Hill Dwarf',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 10,
          Constitution: 16,
          Intelligence: 8,
          Wisdom: 13,
          Charisma: 11,
        },
      },
      dataLoader
    );

    // Add custom immunity to fire
    dwarf = {
      ...dwarf,
      damageDefenses: {
        resistances: [],
        immunities: ['Fire'],
        vulnerabilities: [],
      },
      updatedAt: new Date().toISOString(),
    };

    const { char: _damaged, result } = applyDamageWithDefenses(dwarf, 100, 'Fire', dataLoader);

    expect(result.effectiveDamage).toBe(0);
    expect(_damaged.hitPoints.current).toBe(dwarf.hitPoints.current);
  });
});

describe('getDamageDefenses (convenience function)', () => {
  it('should return only defenses without sources', () => {
    const dwarf = createCharacter(
      {
        name: 'Thorin',
        speciesId: 'Dwarf',
        speciesSubtypeId: 'Hill Dwarf',
        backgroundId: 'soldier',
        classId: 'Fighter',
        abilityScores: {
          Strength: 15,
          Dexterity: 10,
          Constitution: 16,
          Intelligence: 8,
          Wisdom: 13,
          Charisma: 11,
        },
      },
      dataLoader
    );

    const defenses = getDamageDefenses(dwarf, dataLoader);

    expect(defenses.resistances).toContain('Poison');
    expect(Array.isArray(defenses.resistances)).toBe(true);
  });
});
