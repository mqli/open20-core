// tests/engine/dice.test.ts
// Tests for dice rolling system (R22)

import { describe, it, expect } from 'vitest';
import {
  rollDie,
  rollDice,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollAttack,
  defaultRandom,
  type RandomProvider,
} from '../../src/dice';
import { rollCharacterAttack, rollCharacterSkillCheck, rollCharacterSavingThrow } from '../../src/rolls/character';
import { rollCharacterWeaponDamage } from '../../src/rolls/character';
import { rollSpellDamage } from '../../src/rolls/character';
import { getModifier, getTotalScore } from '../../src/engine/ability-modifier';
import type { Character } from '../../src/types/character';
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
      classSpellcasting: {
        fighter: {
          classId: 'fighter',
          spellcastingAbility: 'Intelligence',
          spellSaveDC: 14,
          spellAttackBonus: 5,
          knownCantrips: [],
          maxCantripsKnown: 0,
          knownSpells: [],
          preparedSpells: [],
          alwaysPreparedSpells: [],
          maxPrepared: 0,
        },
      },
      spellSlots: {} as Record<
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
        { total: number; used: number }
      >,
      pactMagicSlots: null,
    },
    resources: {},
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
    expect(rollDie(rng, 'd20').total).toBe(1);
    expect(rollDie(rng, 'd6').total).toBe(6);
    expect(rollDie(rng, 'd10').total).toBe(10);
    expect(rollDie(rng, 'd20').total).toBe(20);
  });

  it('handles all standard dice types', () => {
    const rng = createMockRNG([3, 4, 5, 6, 7, 8]);
    expect(rollDie(rng, 'd4').total).toBe(3);
    expect(rollDie(rng, 'd6').total).toBe(4);
    expect(rollDie(rng, 'd8').total).toBe(5);
    expect(rollDie(rng, 'd10').total).toBe(6);
    expect(rollDie(rng, 'd12').total).toBe(7);
    expect(rollDie(rng, 'd20').total).toBe(8);
  });
});

describe('rollDice', () => {
  it('rolls multiple dice and sums', () => {
    const rng = createMockRNG([1, 2, 3, 4, 5, 6]);
    expect(rollDice(rng, 'd6', 3).total).toBe(6); // 1 + 2 + 3
    expect(rollDice(rng, 'd6', 3).total).toBe(15); // 4 + 5 + 6
  });

  it('handles zero count', () => {
    const rng = createMockRNG([1, 2, 3]);
    expect(rollDice(rng, 'd6', 0).total).toBe(0);
  });
});

describe('rollWithAdvantage', () => {
  it('takes the higher roll', () => {
    const rng = createMockRNG([3, 17, 1, 20]);
    expect(rollWithAdvantage(rng, 'd20').total).toBe(17);
    expect(rollWithAdvantage(rng, 'd20').total).toBe(20);
  });

  it('on 1 vs 20, takes 20', () => {
    const rng = createMockRNG([1, 20, 5, 5]);
    expect(rollWithAdvantage(rng, 'd20').total).toBe(20);
  });
});

describe('rollWithDisadvantage', () => {
  it('takes the lower roll', () => {
    const rng = createMockRNG([17, 3, 1, 20]);
    expect(rollWithDisadvantage(rng, 'd20').total).toBe(3);
    expect(rollWithDisadvantage(rng, 'd20').total).toBe(1);
  });
});

describe('rollAttack', () => {
  it('calculates attack roll correctly', () => {
    const rng = createMockRNG([15]); // Roll 15
    const character = createMockCharacter();
    const attack = { attackBonus: 5, abilityModifier: 'Strength' as const };

    // Calculate attack bonus: attack.attackBonus + ability modifier
    const abilityMod = getModifier(getTotalScore(character.abilityScores, 'Strength'));
    const attackBonus = attack.attackBonus + abilityMod;

    const result = rollCharacterAttack({
      character,
      attackBonus,
      rollModifier: 'none',
      targetAC: 16,
      rng,
    });

    // Roll 15 + Str mod (+4) + bonus (+5) = 24
    expect(result.rawRoll).toBe(15);
    expect(result.bonus).toBe(attackBonus);
    expect(result.total).toBe(15 + attackBonus);
    expect(result.hit).toBe(true);
    expect(result.isCritical).toBe(false);
    expect(result.isCriticalFail).toBe(false);
  });

  it('detects critical hit on roll of 20', () => {
    const rng = createMockRNG([20]);
    const character = createMockCharacter();
    const attack = { attackBonus: 0, abilityModifier: 'Strength' as const };

    const abilityMod = getModifier(getTotalScore(character.abilityScores, 'Strength'));
    const attackBonus = attack.attackBonus + abilityMod;

    const result = rollCharacterAttack({
      character,
      attackBonus,
      rollModifier: 'none',
      targetAC: 10, // Add AC so hit is calculated
      rng,
    });

    expect(result.rawRoll).toBe(20);
    expect(result.isCritical).toBe(true);
    expect(result.hit).toBe(true);
  });

  it('detects critical fail on roll of 1', () => {
    const rng = createMockRNG([1]);
    const character = createMockCharacter();
    // Set attack bonus low so total is < AC
    const attack = { attackBonus: 0, abilityModifier: 'Strength' as const };

    const abilityMod = getModifier(getTotalScore(character.abilityScores, 'Strength'));
    const attackBonus = attack.attackBonus + abilityMod;

    const result = rollCharacterAttack({
      character,
      attackBonus,
      rollModifier: 'none',
      targetAC: 20, // AC 20
      rng,
    });

    expect(result.rawRoll).toBe(1);
    expect(result.isCriticalFail).toBe(true);
    // Natural 1 can still hit if bonuses are high enough (but usually misses)
    // In this case: 1 + 4 = 5, which is < 20
    expect(result.hit).toBe(false);
  });

  it('handles advantage', () => {
    const rng = createMockRNG([5, 15]); // Roll twice, take higher = 15
    const character = createMockCharacter();
    const attack = { attackBonus: 5, abilityModifier: 'Strength' as const };

    const abilityMod = getModifier(getTotalScore(character.abilityScores, 'Strength'));
    const attackBonus = attack.attackBonus + abilityMod;

    const result = rollCharacterAttack({
      character,
      attackBonus,
      rollModifier: 'advantage',
      rng,
    });

    expect(result.rawRoll).toBe(15);
    expect(result.rollModifier).toBe('advantage');
  });

  it('handles disadvantage', () => {
    const rng = createMockRNG([15, 5]); // Roll twice, take lower = 5
    const character = createMockCharacter();
    const attack = { attackBonus: 5, abilityModifier: 'Strength' as const };

    const abilityMod = getModifier(getTotalScore(character.abilityScores, 'Strength'));
    const attackBonus = attack.attackBonus + abilityMod;

    const result = rollCharacterAttack({
      character,
      attackBonus,
      rollModifier: 'disadvantage',
      rng,
    });

    expect(result.rawRoll).toBe(5);
    expect(result.rollModifier).toBe('disadvantage');
  });
});

describe('rollSkillCheck', () => {
  it('calculates skill check correctly', () => {
    const rng = createMockRNG([12]);
    const character = createMockCharacter();
    // Str 18 (+4), Athletics proficient, Prof +3 → total bonus +7
    const result = rollCharacterSkillCheck({
      character,
      skill: 'Athletics',
      rollModifier: 'none',
      rng,
    });

    expect(result.rawRoll).toBe(12);
    expect(result.bonus).toBe(7);
    expect(result.total).toBe(19);
    expect(result.skillName).toBe('Athletics');
    expect(result.ability).toBe('Strength');
  });

  it('handles advantage on skill check', () => {
    const rng = createMockRNG([5, 18]);
    const character = createMockCharacter();
    const result = rollCharacterSkillCheck({
      character,
      skill: 'Athletics',
      rollModifier: 'advantage',
      rng,
    });

    expect(result.rawRoll).toBe(18);
    expect(result.rollModifier).toBe('advantage');
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

    const result = rollCharacterSavingThrow({
      character,
      ability: 'Strength',
      dc: 15,
      getClass: mockData.getClass,
      rng,
    });

    expect(result.rawRoll).toBe(14);
    expect(result.bonus).toBe(7);
    expect(result.total).toBe(21);
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

    const result = rollCharacterSavingThrow({
      character,
      ability: 'Intelligence',
      dc: 10,
      getClass: mockData.getClass,
      rng,
    });

    expect(result.rawRoll).toBe(10);
    expect(result.bonus).toBe(0);
    expect(result.total).toBe(10);
    expect(result.success).toBe(true);
  });

  it('fails saving throw when roll is too low', () => {
    const rng = createMockRNG([3]);
    const character = createMockCharacter();
    const mockData = {
      getClass: () => ({ savingThrowProficiencies: ['Strength'] as const }),
    };

    const result = rollCharacterSavingThrow({
      character,
      ability: 'Strength',
      dc: 15,
      getClass: mockData.getClass,
      rng,
    });

    expect(result.total).toBe(10); // 3 + 7
    expect(result.success).toBe(false);
  });
});

describe('rollCharacterWeaponDamage', () => {
  it('calculates weapon damage correctly', () => {
    const rng = createMockRNG([4]); // 1d8
    const character = createMockCharacter();
    const weapon: Weapon = {
      id: 'longsword',
      name: 'Longsword',
      type: 'weapon',
      category: 'Martial',
      weight: 3,
      equipped: true,
      damage: { entries: [{ dice: '1d8', type: 'Slashing' }], ability: 'Strength', bonus: 0 },
      properties: [],
    };

    const result = rollCharacterWeaponDamage({ rng, character, weapon });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.die).toBe('d8');
    expect(result.entries[0]?.count).toBe(1);
    expect(result.entries[0]?.results).toEqual([4]);
    expect(result.entries[0]?.subtotal).toBe(4);
    expect(result.modifiers).toHaveLength(1);
    expect(result.modifiers[0]?.type).toBe('ability');
    expect(result.modifiers[0]?.value).toBe(4); // Str 18 = +4
    expect(result.total).toBe(8); // 4 + 4
  });

  it('doubles dice on critical hit', () => {
    const rng = createMockRNG([4, 6]); // 2d8
    const character = createMockCharacter();
    const weapon: Weapon = {
      id: 'longsword',
      name: 'Longsword',
      type: 'weapon',
      category: 'Martial',
      weight: 3,
      equipped: true,
      damage: { entries: [{ dice: '1d8', type: 'Slashing' }], ability: 'Strength', bonus: 0 },
      properties: [],
    };

    const result = rollCharacterWeaponDamage({ rng, character, weapon, isCritical: true });

    expect(result.entries[0]?.count).toBe(2); // Doubled!
    expect(result.entries[0]?.results).toEqual([4, 6]);
  });

  it('supports composed damage types (weapon with poison)', () => {
    const rng = createMockRNG([4, 3]); // 1d8 piercing + 1d4 poison
    const character = createMockCharacter();
    const weapon: Weapon = {
      id: 'poisoned-shortbow',
      name: 'Poisoned Shortbow',
      type: 'weapon',
      category: 'Simple',
      weight: 2,
      equipped: true,
      damage: {
        entries: [
          { dice: '1d8', type: 'Piercing' },
          { dice: '1d4', type: 'Poison' },
        ],
        ability: 'Dexterity',
        bonus: 0,
      },
      properties: ['Ammunition', 'Range', 'Two-Handed'],
    };

    const result = rollCharacterWeaponDamage({ rng, character, weapon });

    // Should have 2 roll entries: Piercing and Poison
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.type).toBe('Piercing');
    expect(result.entries[1]?.type).toBe('Poison');

    // typedDamage should have both types
    expect(result.typedDamage['Piercing']).toBeDefined();
    expect(result.typedDamage['Poison']).toBeDefined();

    // Total should equal sum of typedDamage values
    const typedTotal = Object.values(result.typedDamage).reduce((a, b) => a + b, 0);
    expect(result.total).toBe(typedTotal);
  });

  it('ability modifier only applies to physical damage', () => {
    const rng = createMockRNG([4, 3]); // 1d8 slashing + 1d6 fire
    const character = createMockCharacter(); // Str 18 = +4
    const weapon: Weapon = {
      id: 'flametongue-longsword',
      name: 'Flametongue Longsword',
      type: 'weapon',
      category: 'Martial',
      weight: 3,
      equipped: true,
      damage: {
        entries: [
          { dice: '1d8', type: 'Slashing' },
          { dice: '1d6', type: 'Fire' },
        ],
        ability: 'Strength',
        bonus: 0,
      },
      properties: [],
    };

    const result = rollCharacterWeaponDamage({ rng, character, weapon });

    // Slashing should include Str modifier (+4)
    expect(result.typedDamage['Slashing']).toBe(4 + 4); // 1d8 = 4, +4 Str
    // Fire should NOT include Str modifier
    expect(result.typedDamage['Fire']).toBe(3); // 1d6 = 3
  });
});

describe('rollSpellDamage', () => {
  it('calculates spell damage correctly', () => {
    const rng = createMockRNG([5]); // 1d10
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
      description: ['You hurl a mote of fire...'],
      damage: { entries: [{ dice: '1d10', type: 'Fire' }] },
      attack: true,
      source: '2024 PHB',
    };

    const result = rollSpellDamage({ rng, character, spell, slotLevel: 0 });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.die).toBe('d10');
    expect(result.entries[0]?.count).toBe(1);
    // Character has Int 10, so modifier is 0 and not added
    expect(result.modifiers).toHaveLength(0);
  });

  it('scales damage with higher slot level', () => {
    const rng = createMockRNG([4, 5, 6, 3, 4]); // 5d6 at level 3
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
      description: ['You create three rays...'],
      damage: {
        entries: [{ dice: '4d6', type: 'Fire' }],
        perSlot: [{ dice: '1d6', type: 'Fire' }],
      },
      attack: true,
      source: '2024 PHB',
    };

    const result = rollSpellDamage({ rng, character, spell, slotLevel: 3 }); // Cast at 3rd level

    expect(result.entries[0]?.count).toBe(5); // 5d6 at level 3 (base 4d6 + 1 extra)
  });

  it('supports composed damage types (spell with additional damage)', () => {
    const rng = createMockRNG([4, 3]); // 2d6 piercing + 1d6 poison
    const character = createMockCharacter();
    const spell: Spell = {
      id: 'melfs-acid-arrow',
      name: "Melf's Acid Arrow",
      level: 2,
      school: 'Evocation',
      castingTime: 'Action',
      range: '90 feet',
      components: ['V', 'S', 'M'],
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      description: ['A shimmering green arrow...'],
      damage: {
        entries: [{ dice: '2d6', type: 'Piercing' }],
        perSlot: [{ dice: '1d6', type: 'Piercing' }],
        additional: [{ dice: '1d6', type: 'Poison' }],
      },
      attack: false,
      source: '2024 PHB',
    };

    const result = rollSpellDamage({ rng, character, spell, slotLevel: 2 });

    // Should have 2 roll entries: Piercing and Poison
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.type).toBe('Piercing');
    expect(result.entries[1]?.type).toBe('Poison');

    // typedDamage should have both types
    expect(result.typedDamage['Piercing']).toBeDefined();
    expect(result.typedDamage['Poison']).toBeDefined();
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
