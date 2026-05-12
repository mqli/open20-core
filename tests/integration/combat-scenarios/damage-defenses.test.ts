import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import { recomputeDerivedStats } from '../../../src/character/recompute';
import { modifyHP, applyTypedDamage } from '../../../src/character/mutate';
import {
  initializeMonsterForCombat,
  modifyMonsterHP,
  applyMonsterTypedDamage,
  isMonsterDefeated,
  addMonsterDamageResistance,
  addMonsterDamageImmunity,
  addMonsterDamageVulnerability,
} from '../../../src/monster/combat';
import {
  applyTypedDamageToHP,
  addDamageResistance,
  addDamageImmunity,
  addDamageVulnerability,
  emptyDefenses,
  mergeDefenses,
  getCharacterCurrentHP,
  getCharacterMaxHP,
  getCharacterTemporaryHP,
  getMonsterCurrentHP,
  getMonsterMaxHP,
} from '../../../src/engine/combat';
import type { DamageDefenses } from '../../../src/types/damage';
import monstersArray from '../../../static/srd/monsters.json';

// ── Test Helpers ─────────────────────────────────────────────

const dataLoader = createDataLoader();

function createTestFighter(name: string = 'Fighter') {
  const char = createCharacter(
    {
      name,
      speciesId: 'Human',
      backgroundId: 'soldier',
      classId: 'Fighter',
      abilityScores: {
        Strength: 16,
        Dexterity: 14,
        Constitution: 15,
        Intelligence: 10,
        Wisdom: 12,
        Charisma: 10,
      },
    },
    dataLoader
  );
  return recomputeDerivedStats(char, dataLoader);
}

function getTestMonster(monsterId: string): any {
  const monster = (monstersArray as any).find((m: any) => m.id === monsterId);
  if (!monster) throw new Error(`Monster ${monsterId} not found in SRD data`);
  return monster;
}

// ── Scenario 2: Damage Types and Defenses ────────────────────

describe('Combat Scenarios - Damage Types and Defenses', () => {
  let fighter: ReturnType<typeof createTestFighter>;
  let dragon: any;

  beforeEach(() => {
    fighter = createTestFighter('DragonSlayer');
    dragon = initializeMonsterForCombat(getTestMonster('young-red-dragon'));
  });

  it('should apply fire resistance correctly', () => {
    const defenses: DamageDefenses = {
      resistances: ['Fire'],
      immunities: [],
      vulnerabilities: [],
    };

    const result = applyTypedDamageToHP(
      getCharacterCurrentHP(fighter),
      getCharacterMaxHP(fighter),
      getCharacterTemporaryHP(fighter),
      20,
      'Fire',
      defenses
    );

    expect(result.result.effectiveDamage).toBe(10);
    expect(result.currentHP).toBe(getCharacterCurrentHP(fighter) - 10);
  });

  it('should apply fire immunity for red dragon', () => {
    const result = applyMonsterTypedDamage(dragon, 30, 'Fire');

    expect(result.result.effectiveDamage).toBe(0);
    expect(getMonsterCurrentHP(result.monster)).toBe(getMonsterMaxHP(dragon));
  });

  it('should apply vulnerability for double damage', () => {
    const vulnerableDefenses: DamageDefenses = {
      resistances: [],
      immunities: [],
      vulnerabilities: ['Cold'],
    };

    const result = applyTypedDamageToHP(
      getCharacterCurrentHP(fighter),
      getCharacterMaxHP(fighter),
      getCharacterTemporaryHP(fighter),
      10,
      'Cold',
      vulnerableDefenses
    );

    expect(result.result.effectiveDamage).toBe(20);
  });

  it('should cancel resistance and vulnerability', () => {
    const conflictingDefenses: DamageDefenses = {
      resistances: ['Fire'],
      immunities: [],
      vulnerabilities: ['Fire'],
    };

    const result = applyTypedDamageToHP(
      100,
      100,
      0,
      10,
      'Fire',
      conflictingDefenses
    );

    expect(result.result.effectiveDamage).toBe(10);
    expect(result.result.modifiers).toHaveLength(0);
  });
});

// ── Scenario 5: Damage Defense Modifications During Combat ───

describe('Combat Scenarios - Damage Defense Modifications', () => {
  let monster: any;

  beforeEach(() => {
    monster = initializeMonsterForCombat(getTestMonster('goblin'));
  });

  it('should add resistance to monster during combat', () => {
    let updatedMonster = addMonsterDamageResistance(monster, 'Slashing');

    const result = applyMonsterTypedDamage(updatedMonster, 10, 'Slashing');
    expect(result.result.effectiveDamage).toBe(5);
  });

  it('should add immunity to monster during combat', () => {
    let updatedMonster = addMonsterDamageImmunity(monster, 'Poison');

    const result = applyMonsterTypedDamage(updatedMonster, 20, 'Poison');
    expect(result.result.effectiveDamage).toBe(0);
  });

  it('should add vulnerability to monster during combat', () => {
    let updatedMonster = addMonsterDamageVulnerability(monster, 'Fire');

    const result = applyMonsterTypedDamage(updatedMonster, 10, 'Fire');
    expect(result.result.effectiveDamage).toBe(20);
  });

  it('should merge defenses from multiple sources', () => {
    const defenses1: DamageDefenses = {
      resistances: ['Fire', 'Cold'],
      immunities: ['Poison'],
      vulnerabilities: [],
    };

    const defenses2: DamageDefenses = {
      resistances: ['Lightning'],
      immunities: ['Poison'],
      vulnerabilities: ['Radiant'],
    };

    const merged = mergeDefenses(defenses1, defenses2);

    expect(merged.resistances).toContain('Fire');
    expect(merged.resistances).toContain('Cold');
    expect(merged.resistances).toContain('Lightning');
    expect(merged.immunities).toContain('Poison');
    expect(merged.vulnerabilities).toContain('Radiant');
    expect(merged.resistances).toHaveLength(3);
    expect(merged.immunities).toHaveLength(1);
    expect(merged.vulnerabilities).toHaveLength(1);
  });
});

// ── Scenario 6: Character with Damage Defenses vs Monster ────

describe('Combat Scenarios - Character Damage Defenses', () => {
  let fighter: ReturnType<typeof createTestFighter>;

  beforeEach(() => {
    fighter = createTestFighter('Resilient Fighter');
  });

  it('should apply character damage defenses correctly', () => {
    const defenses = addDamageResistance(emptyDefenses(), 'Fire');
    const charWithResistance = {
      ...fighter,
      damageDefenses: defenses,
    };

    const { result } = applyTypedDamage(charWithResistance, 20, 'Fire', defenses);
    expect(result.effectiveDamage).toBe(10);
  });

  it('should handle character with multiple defenses', () => {
    let defenses = emptyDefenses();
    defenses = addDamageResistance(defenses, 'Slashing');
    defenses = addDamageResistance(defenses, 'Piercing');
    defenses = addDamageImmunity(defenses, 'Poison');

    const charWithDefenses = {
      ...fighter,
      damageDefenses: defenses,
    };

    const slashResult = applyTypedDamageToHP(
      getCharacterCurrentHP(charWithDefenses),
      getCharacterMaxHP(charWithDefenses),
      0,
      10,
      'Slashing',
      charWithDefenses.damageDefenses
    );
    expect(slashResult.result.effectiveDamage).toBe(5);

    const poisonResult = applyTypedDamageToHP(
      getCharacterCurrentHP(charWithDefenses),
      getCharacterMaxHP(charWithDefenses),
      0,
      20,
      'Poison',
      charWithDefenses.damageDefenses
    );
    expect(poisonResult.result.effectiveDamage).toBe(0);
  });
});

// ── Scenario 9: Edge Cases in Combat ─────────────────────────

describe('Combat Scenarios - Edge Cases', () => {
  let fighter: ReturnType<typeof createTestFighter>;
  let monster: any;

  beforeEach(() => {
    fighter = createTestFighter('Edge Case Fighter');
    monster = initializeMonsterForCombat(getTestMonster('goblin'));
  });

  it('should handle massive damage that exceeds current HP', () => {
    const massiveDamage = getCharacterMaxHP(fighter) + 100;
    const afterDamage = modifyHP(fighter, -massiveDamage);
    expect(getCharacterCurrentHP(afterDamage)).toBe(0);
  });

  it('should handle healing from 0 HP', () => {
    const dead = modifyHP(fighter, -getCharacterMaxHP(fighter));
    expect(getCharacterCurrentHP(dead)).toBe(0);

    const revived = modifyHP(dead, 10);
    expect(getCharacterCurrentHP(revived)).toBe(10);
  });

  it('should handle damage with no damage type', () => {
    const maxHP = getMonsterMaxHP(monster);
    const damage = 5;
    const result = modifyMonsterHP(monster, -damage);
    expect(getMonsterCurrentHP(result)).toBe(maxHP - damage);
  });

  it('should handle empty defenses', () => {
    const empty: DamageDefenses = emptyDefenses();
    expect(empty.resistances).toHaveLength(0);
    expect(empty.immunities).toHaveLength(0);
    expect(empty.vulnerabilities).toHaveLength(0);

    const result = applyTypedDamageToHP(100, 100, 0, 10, 'Fire', empty);
    expect(result.result.effectiveDamage).toBe(10);
  });
});

// ── Scenario 10: Complex Combat with Multiple Damage Types ────

describe('Combat Scenarios - Complex Multi-Damage Type Combat', () => {
  let fighter: ReturnType<typeof createTestFighter>;
  let monster: any;

  beforeEach(() => {
    fighter = createTestFighter('Multi-Type Fighter');
    monster = initializeMonsterForCombat(getTestMonster('goblin'));
  });

  it('should handle different damage types in sequence', () => {
    let currentFighter = fighter;
    const defenses = emptyDefenses();
    const maxHP = getCharacterMaxHP(fighter);

    const damage1 = 3;
    const slashResult = applyTypedDamage(currentFighter, damage1, 'Slashing', defenses);
    currentFighter = slashResult.char;
    expect(getCharacterCurrentHP(currentFighter)).toBe(maxHP - damage1);

    const damage2 = 2;
    const fireResult = applyTypedDamage(currentFighter, damage2, 'Fire', defenses);
    currentFighter = fireResult.char;
    expect(getCharacterCurrentHP(currentFighter)).toBe(maxHP - damage1 - damage2);

    const damage3 = 2;
    const coldResult = applyTypedDamage(currentFighter, damage3, 'Cold', defenses);
    currentFighter = coldResult.char;
    expect(getCharacterCurrentHP(currentFighter)).toBe(maxHP - damage1 - damage2 - damage3);
  });

  it('should handle monster taking multiple damage types', () => {
    let currentMonster = monster;
    const maxHP = getMonsterMaxHP(monster);

    const result1 = applyMonsterTypedDamage(currentMonster, 5, 'Slashing');
    currentMonster = result1.monster;
    expect(getMonsterCurrentHP(currentMonster)).toBe(maxHP - 5);

    const result2 = applyMonsterTypedDamage(currentMonster, 5, 'Fire');
    currentMonster = result2.monster;

    const result3 = applyMonsterTypedDamage(currentMonster, 5, 'Poison');
    currentMonster = result3.monster;

    expect(getMonsterCurrentHP(currentMonster)).toBe(0);
  });
});
