// tests/engine/dice.test.ts
// Tests for dice rolling system (R22)

import { describe, it, expect, vi } from 'vitest';
import {
  rollDie,
  rollDice,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollAttack,
  rollSkillCheck,
  rollSavingThrow,
  rollWeaponDamage,
  rollSpellDamage,
  defaultRandom,
  type RandomProvider,
} from '../../src/engine/dice';
import type { Character, DieType } from '../../src/types/character';
import type { Weapon } from '../../src/types/equipment';
import type { Spell } from '../../src/types/spell';

// ── Mock Random Provider ─────────────────────────────────────────

function createMockRNG(values: number[]): RandomProvider {
  let index = 0;
  return {
    roll: (min, max) => {
      const value = values[index++ % values.length] ?? min;
      return Math.max(min, Math.min(max, value));
    },
  };
}

// ── Test Data ─────────────────────────────────────────────────────

function createMockCharacter(): Character {
  return {
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
        Strength: 18,
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
    skills: { Athletics: { proficient: true, expertise: false } },
    feats: [],
    equipment: [],
    spells: {
      spellcastingAbility: 'Intelligence',
      spellSaveDC: 14,
      spellAttackBonus: 5,
      knownSpells: [],
      preparedSpells: [],
      spellSlots: {} as Record<
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
        { total: number; used: number }
      >,
      pactMagicSlots: null,
    },
    resources: [],
    hitPoints: {
      max: 44,
      current: 44,
      temporary: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false },
    },
    combatStats: {
      AC: 18,
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
}

// ── Tests ─────────────────────────────────────────────────────────

describe('rollDie', () => {
  it('returns value within die range', () => {
    const rng = createMockRNG([1, 6, 10, 20]);
    expect(rollDie(rng, 'd20')).toBe(1);
    expect(rollDie(rng, 'd6')).toBe(6);
    expect(rollDie(rng, 'd10')).toBe(10);
    expect(rollDie(rng, 'd20')).toBe(20);
  });

  it('handles all standard dice types', () => {
    const rng = createMockRNG([3, 4, 5, 6, 7, 8]);
    expect(rollDie(rng, 'd4')).toBe(3);
    expect(rollDie(rng, 'd6')).toBe(4);
    expect(rollDie(rng, 'd8')).toBe(5);
    expect(rollDie(rng, 'd10')).toBe(6);
    expect(rollDie(rng, 'd12')).toBe(7);
    expect(rollDie(rng, 'd20')).toBe(8);
  });
});

describe('rollDice', () => {
  it('rolls multiple dice and sums', () => {
    const rng = createMockRNG([1, 2, 3, 4, 5, 6]);
    expect(rollDice(rng, 'd6', 3)).toBe(6); // 1 + 2 + 3
    expect(rollDice(rng, 'd6', 3)).toBe(15); // 4 + 5 + 6
  });

  it('handles zero count', () => {
    const rng = createMockRNG([1, 2, 3]);
    expect(rollDice(rng, 'd6', 0)).toBe(0);
  });
});

describe('rollWithAdvantage', () => {
  it('takes the higher roll', () => {
    const rng = createMockRNG([3, 17, 1, 20]);
    expect(rollWithAdvantage(rng, 'd20')).toBe(17);
    expect(rollWithAdvantage(rng, 'd20')).toBe(20);
  });

  it('on 1 vs 20, takes 20', () => {
    const rng = createMockRNG([1, 20, 5, 5]);
    expect(rollWithAdvantage(rng, 'd20')).toBe(20);
  });
});

describe('rollWithDisadvantage', () => {
  it('takes the lower roll', () => {
    const rng = createMockRNG([17, 3, 1, 20]);
    expect(rollWithDisadvantage(rng, 'd20')).toBe(3);
    expect(rollWithDisadvantage(rng, 'd20')).toBe(1);
  });
});

describe('rollAttack', () => {
  it('calculates attack roll correctly', () => {
    const rng = createMockRNG([15]); // Roll 15
    const character = createMockCharacter();
    const attack = { attackBonus: 5, abilityModifier: 'Strength' as const };

    const result = rollAttack(rng, character, attack, 'none', 16);

    // Roll 15 + Str mod (+4) + bonus (+5) = 24
    expect(result.rawRoll).toBe(15);
    expect(result.bonus).toBe(9);
    expect(result.final).toBe(24);
    expect(result.hit).toBe(true);
    expect(result.isCritical).toBe(false);
    expect(result.isCriticalFail).toBe(false);
    expect(result.isFumble).toBe(false);
  });

  it('detects critical hit on roll of 20', () => {
    const rng = createMockRNG([20]);
    const character = createMockCharacter();
    const attack = { attackBonus: 0, abilityModifier: 'Strength' as const };

    const result = rollAttack(rng, character, attack, 'none');

    expect(result.rawRoll).toBe(20);
    expect(result.isCritical).toBe(true);
    expect(result.hit).toBe(true);
  });

  it('detects critical fail on roll of 1', () => {
    const rng = createMockRNG([1]);
    const character = createMockCharacter();
    // Set attack bonus low so total is < AC
    const attack = { attackBonus: 0, abilityModifier: 'Strength' as const };

    const result = rollAttack(rng, character, attack, 'none', 20); // AC 20

    expect(result.rawRoll).toBe(1);
    expect(result.isCriticalFail).toBe(true);
    expect(result.isFumble).toBe(true);
    // Natural 1 can still hit if bonuses are high enough (but usually misses)
    // In this case: 1 + 4 = 5, which is < 20
    expect(result.hit).toBe(false);
  });

  it('handles advantage', () => {
    const rng = createMockRNG([5, 15]); // Roll twice, take higher = 15
    const character = createMockCharacter();
    const attack = { attackBonus: 5, abilityModifier: 'Strength' as const };

    const result = rollAttack(rng, character, attack, 'advantage');

    expect(result.rawRoll).toBe(15);
    expect(result.modifier).toBe('advantage');
  });

  it('handles disadvantage', () => {
    const rng = createMockRNG([15, 5]); // Roll twice, take lower = 5
    const character = createMockCharacter();
    const attack = { attackBonus: 5, abilityModifier: 'Strength' as const };

    const result = rollAttack(rng, character, attack, 'disadvantage');

    expect(result.rawRoll).toBe(5);
    expect(result.modifier).toBe('disadvantage');
  });
});

describe('rollSkillCheck', () => {
  it('calculates skill check correctly', () => {
    const rng = createMockRNG([12]);
    const character = createMockCharacter();
    // Str 18 (+4), Athletics proficient, Prof +3 → total bonus +7
    const result = rollSkillCheck(rng, character, 'Athletics', 'none');

    expect(result.rawRoll).toBe(12);
    expect(result.bonus).toBe(7);
    expect(result.final).toBe(19);
    expect(result.skillName).toBe('Athletics');
    expect(result.ability).toBe('Strength');
  });

  it('handles advantage on skill check', () => {
    const rng = createMockRNG([5, 18]);
    const character = createMockCharacter();
    const result = rollSkillCheck(rng, character, 'Athletics', 'advantage');

    expect(result.rawRoll).toBe(18);
    expect(result.modifier).toBe('advantage');
  });
});

describe('rollSavingThrow', () => {
  it('calculates saving throw with proficiency', () => {
    const rng = createMockRNG([14]);
    const character = createMockCharacter();
    // Fighter proficient in Strength & Constitution
    // Str 18 (+4) + Prof (+3) = +7
    const mockData = {
      getClass: (id: string) => {
        if (id === 'Fighter') {
          return { savingThrowProficiencies: ['Strength', 'Constitution'] as const };
        }
        return undefined;
      },
    };

    const result = rollSavingThrow(rng, character, 'Strength', 15, mockData);

    expect(result.rawRoll).toBe(14);
    expect(result.bonus).toBe(7);
    expect(result.final).toBe(21);
    expect(result.success).toBe(true);
  });

  it('calculates saving throw without proficiency', () => {
    const rng = createMockRNG([10]);
    const character = createMockCharacter();
    // Int not proficient: Int 10 (+0)
    const mockData = {
      getClass: (id: string) => {
        if (id === 'Fighter') {
          return { savingThrowProficiencies: ['Strength', 'Constitution'] as const };
        }
        return undefined;
      },
    };

    const result = rollSavingThrow(rng, character, 'Intelligence', 10, mockData);

    expect(result.rawRoll).toBe(10);
    expect(result.bonus).toBe(0);
    expect(result.final).toBe(10);
    expect(result.success).toBe(true);
  });

  it('fails saving throw when roll is too low', () => {
    const rng = createMockRNG([3]);
    const character = createMockCharacter();
    const mockData = {
      getClass: () => ({ savingThrowProficiencies: ['Strength'] as const }),
    };

    const result = rollSavingThrow(rng, character, 'Strength', 15, mockData);

    expect(result.final).toBe(10); // 3 + 7
    expect(result.success).toBe(false);
  });
});

describe('rollWeaponDamage', () => {
  it('calculates weapon damage correctly', () => {
    const rng = createMockRNG([4, 6, 3]); // 1d8 + 1d8 + 1d6
    const character = createMockCharacter();
    const weapon: Weapon = {
      id: 'longsword',
      name: 'Longsword',
      type: 'weapon',
      category: 'Martial',
      weight: 3,
      equipped: true,
      damage: { dice: 'd8', ability: 'Strength', bonus: 0 },
      properties: [],
    };

    const result = rollWeaponDamage(rng, character, weapon);

    expect(result.rolls).toHaveLength(1);
    expect(result.rolls[0]?.die).toBe('d8');
    expect(result.rolls[0]?.count).toBe(1);
    expect(result.rolls[0]?.results).toEqual([4]);
    expect(result.rolls[0]?.subtotal).toBe(4);
    expect(result.modifiers).toHaveLength(1);
    expect(result.modifiers[0]?.type).toBe('ability');
    expect(result.modifiers[0]?.value).toBe(4); // Str 18 = +4
    expect(result.total).toBe(8); // 4 + 4
  });

  it('doubles dice on critical hit', () => {
    const rng = createMockRNG([4, 6, 3, 8]); // 2d8 + 1d6
    const character = createMockCharacter();
    const weapon: Weapon = {
      id: 'longsword',
      name: 'Longsword',
      type: 'weapon',
      category: 'Martial',
      weight: 3,
      equipped: true,
      damage: { dice: 'd8', ability: 'Strength', bonus: 0 },
      properties: [],
    };

    const result = rollWeaponDamage(rng, character, weapon, true);

    expect(result.rolls[0]?.count).toBe(2); // Doubled!
    expect(result.rolls[0]?.results).toEqual([4, 6]);
  });
});

describe('rollSpellDamage', () => {
  it('calculates spell damage correctly', () => {
    const rng = createMockRNG([5, 6]); // 1d6 + 1d6
    const character = createMockCharacter();
    const spell: Spell = {
      id: 'firebolt',
      name: 'Fire Bolt',
      level: 0,
      school: 'Evocation',
      castingTime: 'Action',
      range: '120 feet',
      components: ['V', 'S'],
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      description: 'You hurl a mote of fire...',
      damage: { dice: '1d10', type: 'Fire' },
      attack: true,
      source: '2024 PHB',
    };

    const result = rollSpellDamage(rng, character, spell, 0);

    expect(result.rolls).toHaveLength(1);
    expect(result.rolls[0]?.die).toBe('d10');
    expect(result.rolls[0]?.count).toBe(1);
    // Plus spell attack modifier (Int 10 = +0)
    expect(result.modifiers).toHaveLength(1);
  });

  it('scales damage with higher slot level', () => {
    const rng = createMockRNG([4, 5, 6, 3, 4, 5]); // 4d6 at level 3
    const character = createMockCharacter();
    const spell: Spell = {
      id: 'scorching-ray',
      name: 'Scorching Ray',
      level: 2,
      school: 'Evocation',
      castingTime: 'Action',
      range: '120 feet',
      components: ['V', 'S'],
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      description: 'You create three rays...',
      damage: {
        dice: '4d6',
        type: 'Fire',
        higherLevel: ['5d6', '6d6', '7d6', '8d6', '9d6', '10d6', '11d6', '12d6'],
      },
      attack: true,
      source: '2024 PHB',
    };

    const result = rollSpellDamage(rng, character, spell, 3); // Cast at 3rd level

    expect(result.rolls[0]?.count).toBe(5); // 5d6 at level 3 (base 4d6 + 1 extra)
  });
});

describe('defaultRandom', () => {
  it('produces values within range', () => {
    // Run multiple times to check distribution (not deterministic but should be in range)
    for (let i = 0; i < 100; i++) {
      const result = defaultRandom.roll(1, 20);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    }
  });
});
