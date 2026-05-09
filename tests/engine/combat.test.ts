// tests/engine/combat.test.ts
// Unit tests for shared combat helpers (engine/combat.ts)
// Tests HP manipulation logic shared by Character and Monster modules

import { describe, it, expect } from 'vitest';
import {
  applyHPChange,
  applyTypedDamageToHP,
  setTemporaryHPShared,
  isDefeatedShared,
  getCharacterCurrentHP,
  getCharacterMaxHP,
  getCharacterTemporaryHP,
  getMonsterCurrentHP,
  getMonsterMaxHP,
  getMonsterTemporaryHP,
  addDamageResistance,
  addDamageImmunity,
  addDamageVulnerability,
  emptyDefenses,
  mergeDefenses,
} from '../../src/engine/combat';
import type { DamageDefenses, DamageType } from '../../src/types/damage';

describe('applyHPChange', () => {
  it('damage: reduces current HP', () => {
    const result = applyHPChange(50, 100, 0, -10);
    expect(result.currentHP).toBe(40);
    expect(result.temporaryHP).toBe(0);
  });

  it('damage with temp HP: temp absorbs first', () => {
    const result = applyHPChange(50, 100, 10, -15);
    expect(result.temporaryHP).toBe(0); // 10 absorbed by temp
    expect(result.currentHP).toBe(45); // 5 remaining damage to current
  });

  it('temp HP fully absorbs damage: current unchanged', () => {
    const result = applyHPChange(50, 100, 10, -5);
    expect(result.temporaryHP).toBe(5);
    expect(result.currentHP).toBe(50);
  });

  it('healing: increases current HP', () => {
    const result = applyHPChange(30, 100, 0, 20);
    expect(result.currentHP).toBe(50);
  });

  it('healing cannot exceed max HP', () => {
    const result = applyHPChange(80, 100, 0, 30);
    expect(result.currentHP).toBe(100);
  });

  it('damage cannot reduce HP below 0', () => {
    const result = applyHPChange(5, 100, 0, -10);
    expect(result.currentHP).toBe(0);
  });
});

describe('applyTypedDamageToHP', () => {
  const mockDefenses: DamageDefenses = {
    resistances: ['Fire', 'Cold'],
    immunities: ['Poison'],
    vulnerabilities: ['Lightning'],
  };

  it('normal damage: full damage applied', () => {
    const result = applyTypedDamageToHP(50, 100, 0, 20, 'Slashing', mockDefenses);
    expect(result.currentHP).toBe(30);
    expect(result.result.originalDamage).toBe(20);
    expect(result.result.effectiveDamage).toBe(20);
  });

  it('resistance: half damage', () => {
    const result = applyTypedDamageToHP(50, 100, 0, 20, 'Fire', mockDefenses);
    expect(result.currentHP).toBe(40);
    expect(result.result.effectiveDamage).toBe(10);
  });

  it('immunity: no damage', () => {
    const result = applyTypedDamageToHP(50, 100, 0, 20, 'Poison', mockDefenses);
    expect(result.currentHP).toBe(50);
    expect(result.result.effectiveDamage).toBe(0);
  });

  it('vulnerability: double damage', () => {
    const result = applyTypedDamageToHP(50, 100, 0, 20, 'Lightning', mockDefenses);
    expect(result.currentHP).toBe(10);
    expect(result.result.effectiveDamage).toBe(40);
  });
});

describe('setTemporaryHPShared', () => {
  it('sets positive value', () => {
    const result = setTemporaryHPShared(0, 10);
    expect(result).toBe(10);
  });

  it('sets to 0', () => {
    const result = setTemporaryHPShared(5, 0);
    expect(result).toBe(0);
  });

  it('negative value becomes 0', () => {
    const result = setTemporaryHPShared(0, -5);
    expect(result).toBe(0);
  });
});

describe('isDefeatedShared', () => {
  it('HP > 0: not defeated', () => {
    expect(isDefeatedShared(1)).toBe(false);
  });

  it('HP = 0: defeated', () => {
    expect(isDefeatedShared(0)).toBe(true);
  });

  it('HP < 0: defeated', () => {
    expect(isDefeatedShared(-5)).toBe(true);
  });
});

describe('HP Accessor Helpers - Character', () => {
  const mockChar = {
    hitPoints: {
      max: 100,
      current: 75,
      temporary: 10,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
  };

  it('getCharacterCurrentHP', () => {
    expect(getCharacterCurrentHP(mockChar)).toBe(75);
  });

  it('getCharacterMaxHP', () => {
    expect(getCharacterMaxHP(mockChar)).toBe(100);
  });

  it('getCharacterTemporaryHP', () => {
    expect(getCharacterTemporaryHP(mockChar)).toBe(10);
  });
});

describe('HP Accessor Helpers - Monster', () => {
  const mockMonster = {
    hitPoints: {
      value: 50,
      formula: '5d10+5',
    },
    currentHP: 35,
    temporaryHP: 5,
  };

  it('getMonsterCurrentHP (with currentHP)', () => {
    expect(getMonsterCurrentHP(mockMonster)).toBe(35);
  });

  it('getMonsterCurrentHP (without currentHP, uses hitPoints.value)', () => {
    const m = {
      hitPoints: { value: 50, formula: '5d10+5' },
    };
    expect(getMonsterCurrentHP(m)).toBe(50);
  });

  it('getMonsterMaxHP', () => {
    expect(getMonsterMaxHP(mockMonster)).toBe(50);
  });

  it('getMonsterTemporaryHP (with temporaryHP)', () => {
    expect(getMonsterTemporaryHP(mockMonster)).toBe(5);
  });

  it('getMonsterTemporaryHP (without temporaryHP)', () => {
    const m = {
      hitPoints: { value: 50, formula: '5d10+5' },
      currentHP: 35,
    };
    expect(getMonsterTemporaryHP(m as { temporaryHP?: number })).toBe(0);
  });
});

describe('Damage Defense Helpers', () => {
  it('addDamageResistance: adds new resistance', () => {
    const defenses: DamageDefenses = emptyDefenses();
    const result = addDamageResistance(defenses, 'Fire');
    expect(result.resistances).toContain('Fire');
    expect(defenses.resistances).not.toContain('Fire'); // Immutable
  });

  it('addDamageResistance: duplicate ignored', () => {
    const defenses: DamageDefenses = { resistances: ['Fire'], immunities: [], vulnerabilities: [] };
    const result = addDamageResistance(defenses, 'Fire');
    expect(result).toBe(defenses); // Same object returned
  });

  it('addDamageImmunity: adds new immunity', () => {
    const defenses = emptyDefenses();
    const result = addDamageImmunity(defenses, 'Poison');
    expect(result.immunities).toContain('Poison');
  });

  it('addDamageVulnerability: adds new vulnerability', () => {
    const defenses = emptyDefenses();
    const result = addDamageVulnerability(defenses, 'Lightning');
    expect(result.vulnerabilities).toContain('Lightning');
  });

  it('emptyDefenses: returns empty defenses object', () => {
    const result = emptyDefenses();
    expect(result.resistances).toEqual([]);
    expect(result.immunities).toEqual([]);
    expect(result.vulnerabilities).toEqual([]);
  });

  it('mergeDefenses: merges two defenses', () => {
    const a: DamageDefenses = {
      resistances: ['Fire'],
      immunities: ['Poison'],
      vulnerabilities: [],
    };
    const b: DamageDefenses = {
      resistances: ['Cold'],
      immunities: [],
      vulnerabilities: ['Lightning'],
    };
    const result = mergeDefenses(a, b);
    expect(result.resistances).toContain('Fire');
    expect(result.resistances).toContain('Cold');
    expect(result.immunities).toContain('Poison');
    expect(result.vulnerabilities).toContain('Lightning');
  });

  it('mergeDefenses: deduplicates', () => {
    const a: DamageDefenses = {
      resistances: ['Fire'],
      immunities: [],
      vulnerabilities: [],
    };
    const b: DamageDefenses = {
      resistances: ['Fire', 'Cold'],
      immunities: [],
      vulnerabilities: [],
    };
    const result = mergeDefenses(a, b);
    expect(result.resistances).toEqual(['Fire', 'Cold']);
  });
});
