// tests/monsters/combat.test.ts
// Unit tests for monster combat functions

import { describe, it, expect } from 'vitest';
import type { Monster } from '../../src/monster/types';
import type { MonsterAttack } from '../../src/types/monster';
import type { DamageType } from '../../src/types/damage';
import {
  initializeMonsterForCombat,
  modifyMonsterHP,
  applyMonsterTypedDamage,
  setMonsterTemporaryHP,
  isMonsterDefeated,
  getMonsterAC,
  addMonsterDamageResistance,
  addMonsterDamageImmunity,
  addMonsterDamageVulnerability,
} from '../../src/monster/combat';
import { rollMonsterAttackDamage } from '../../src/rolls/monster';

// ── Shared Fixtures ───────────────────────────────────────

import { MOCK_GOBLIN, createMockMonster } from '../fixtures/monsters';

// ── Mock Monster ─────────────────────────────────────────

const mockMonster: Monster = MOCK_GOBLIN;

const mockMonsterWithDefenses: Monster = createMockMonster({
  id: 'goblin-with-defenses',
  name: 'Goblin',
  hitPoints: { value: 7, formula: '2d6+2' },
  damageDefenses: {
    resistances: ['Bludgeoning'],
    immunities: ['Fire'],
    vulnerabilities: ['Cold'],
  },
});

const mockAttack: MonsterAttack = {
  name: 'Scimitar',
  attackBonus: 4,
  damage: '1d6+2',
  damageType: 'Slashing',
  damageEntries: [{ dice: '1d6', type: 'Slashing' as DamageType, bonus: 2 }],
};

// ── Tests ─────────────────────────────────────────────────

describe('initializeMonsterForCombat', () => {
  it('should set currentHP to max HP', () => {
    const result = initializeMonsterForCombat(mockMonster);
    expect(result.currentHP).toBe(7);
    expect(result.temporaryHP).toBe(0);
  });

  it('should not modify original monster', () => {
    const result = initializeMonsterForCombat(mockMonster);
    expect(mockMonster.currentHP).toBeUndefined();
  });
});

describe('modifyMonsterHP', () => {
  it('should reduce HP when taking damage', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const result = modifyMonsterHP(combatMonster, -3);
    expect(result.currentHP).toBe(4);
  });

  it('should increase HP when healing', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const damaged = modifyMonsterHP(combatMonster, -3);
    const healed = modifyMonsterHP(damaged, 2);
    expect(healed.currentHP).toBe(6);
  });

  it('should not exceed max HP when healing', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const result = modifyMonsterHP(combatMonster, 10);
    expect(result.currentHP).toBe(7);
  });

  it('should not go below 0 HP', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const result = modifyMonsterHP(combatMonster, -10);
    expect(result.currentHP).toBe(0);
  });

  it('should absorb damage with temporary HP', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const withTemp = setMonsterTemporaryHP(combatMonster, 3);
    const result = modifyMonsterHP(withTemp, -5);
    expect(result.temporaryHP).toBe(0);
    expect(result.currentHP).toBe(5); // 7 - (5 - 3) = 5
  });

  it('should apply resistance to typed damage', () => {
    const combatMonster = initializeMonsterForCombat(mockMonsterWithDefenses);
    const result = modifyMonsterHP(combatMonster, -10, 'Bludgeoning');
    // Resitance: 10 -> 5 effective damage
    expect(result.currentHP).toBe(2); // 7 - 5 = 2
  });

  it('should apply immunity to typed damage', () => {
    const combatMonster = initializeMonsterForCombat(mockMonsterWithDefenses);
    const result = modifyMonsterHP(combatMonster, -10, 'Fire');
    // Immunity: 10 -> 0 effective damage
    expect(result.currentHP).toBe(7);
  });

  it('should apply vulnerability to typed damage', () => {
    const combatMonster = initializeMonsterForCombat(mockMonsterWithDefenses);
    const result = modifyMonsterHP(combatMonster, -10, 'Cold');
    // Vulnerability: 10 -> 20 effective damage
    expect(result.currentHP).toBe(0); // 7 - 20 = -13 -> 0
  });
});

describe('applyMonsterTypedDamage', () => {
  it('should return damage result with effective damage', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const { monster, result } = applyMonsterTypedDamage(combatMonster, 10, 'Slashing');
    expect(result.originalDamage).toBe(10);
    expect(result.effectiveDamage).toBe(10);
    expect(result.modifiers).toEqual([]);
  });

  it('should apply resistance', () => {
    const combatMonster = initializeMonsterForCombat(mockMonsterWithDefenses);
    const { result } = applyMonsterTypedDamage(combatMonster, 10, 'Bludgeoning');
    expect(result.effectiveDamage).toBe(5);
    expect(result.modifiers).toContainEqual({ type: 'resistance', damageType: 'Bludgeoning' });
  });

  it('should apply immunity', () => {
    const combatMonster = initializeMonsterForCombat(mockMonsterWithDefenses);
    const { result } = applyMonsterTypedDamage(combatMonster, 10, 'Fire');
    expect(result.effectiveDamage).toBe(0);
    expect(result.modifiers).toContainEqual({ type: 'immunity', damageType: 'Fire' });
  });

  it('should apply vulnerability', () => {
    const combatMonster = initializeMonsterForCombat(mockMonsterWithDefenses);
    const { result } = applyMonsterTypedDamage(combatMonster, 10, 'Cold');
    expect(result.effectiveDamage).toBe(20);
    expect(result.modifiers).toContainEqual({ type: 'vulnerability', damageType: 'Cold' });
  });
});

describe('setMonsterTemporaryHP', () => {
  it('should set temporary HP', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const result = setMonsterTemporaryHP(combatMonster, 5);
    expect(result.temporaryHP).toBe(5);
  });

  it('should not allow negative temporary HP', () => {
    const result = setMonsterTemporaryHP(mockMonster, -5);
    expect(result.temporaryHP).toBe(0);
  });
});

describe('isMonsterDefeated', () => {
  it('should return false when HP > 0', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    expect(isMonsterDefeated(combatMonster)).toBe(false);
  });

  it('should return true when HP = 0', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const dead = modifyMonsterHP(combatMonster, -7);
    expect(isMonsterDefeated(dead)).toBe(true);
  });

  it('should return true when HP < 0', () => {
    const combatMonster = initializeMonsterForCombat(mockMonster);
    const dead = modifyMonsterHP(combatMonster, -10);
    expect(isMonsterDefeated(dead)).toBe(true);
  });
});

describe('getMonsterAC', () => {
  it('should return monster AC', () => {
    const result = getMonsterAC(mockMonster);
    expect(result).toBe(15);
  });

  it('should return highest AC when multiple entries', () => {
    const monsterWithMultiAC: Monster = {
      ...mockMonster,
      armorClass: [
        { value: 13, type: 'natural armor' },
        { value: 15, type: 'natural armor', condition: 'while not incapacitated' },
      ],
    };
    const result = getMonsterAC(monsterWithMultiAC);
    expect(result).toBe(15);
  });

  it('should return 10 when no AC entries', () => {
    const monsterNoAC: Monster = { ...mockMonster, armorClass: [] };
    const result = getMonsterAC(monsterNoAC);
    expect(result).toBe(10);
  });
});

describe('rollMonsterAttackDamage', () => {
  it('should calculate damage from damage entries', () => {
    const result = rollMonsterAttackDamage(mockAttack);
    // 1d6 + 2 = 3 to 8 damage
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(8);
  });

  it('should handle multiple damage entries', () => {
    const multiDamageAttack: MonsterAttack = {
      ...mockAttack,
      damageEntries: [
        { dice: '1d6', type: 'Slashing' as DamageType, bonus: 2 },
        { dice: '1d6', type: 'Fire' as DamageType, bonus: 0 },
      ],
    };
    const result = rollMonsterAttackDamage(multiDamageAttack);
    // 1d6+2 + 1d6 = 3 to 14 damage
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(14);
  });

  it('should return 0 when no damage entries', () => {
    const noDamageAttack: MonsterAttack = {
      name: 'Grapple',
      damageType: 'Bludgeoning',
    };
    const result = rollMonsterAttackDamage(noDamageAttack);
    expect(result).toBe(0);
  });
});

describe('addMonsterDamageResistance', () => {
  it('should add resistance', () => {
    const result = addMonsterDamageResistance(mockMonster, 'Lightning');
    expect(result.damageDefenses?.resistances).toContain('Lightning');
  });

  it('should not add duplicate resistance', () => {
    const result = addMonsterDamageResistance(mockMonster, 'Lightning');
    const result2 = addMonsterDamageResistance(result, 'Lightning');
    expect(result2.damageDefenses?.resistances.filter(r => r === 'Lightning').length).toBe(1);
  });
});

describe('addMonsterDamageImmunity', () => {
  it('should add immunity', () => {
    const result = addMonsterDamageImmunity(mockMonster, 'Poison');
    expect(result.damageDefenses?.immunities).toContain('Poison');
  });
});

describe('addMonsterDamageVulnerability', () => {
  it('should add vulnerability', () => {
    const result = addMonsterDamageVulnerability(mockMonster, 'Fire');
    expect(result.damageDefenses?.vulnerabilities).toContain('Fire');
  });
});
