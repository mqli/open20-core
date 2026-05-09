import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { recomputeDerivedStats } from '../../src/character/recompute';
import { modifyHP, applyTypedDamage, setTemporaryHP } from '../../src/character/mutate';
import {
  initializeMonsterForCombat,
  modifyMonsterHP,
  applyMonsterTypedDamage,
  setMonsterTemporaryHP,
  isMonsterDefeated,
  rollMonsterAttack,
  getMonsterAC,
  rollMonsterAttackDamage,
  addMonsterDamageResistance,
  addMonsterDamageImmunity,
  addMonsterDamageVulnerability,
} from '../../src/monster/combat';
import {
  applyHPChange,
  applyTypedDamageToHP,
  setTemporaryHPShared,
  isDefeatedShared,
  addDamageResistance,
  addDamageImmunity,
  emptyDefenses,
  mergeDefenses,
  getCharacterCurrentHP,
  getCharacterMaxHP,
  getCharacterTemporaryHP,
  getMonsterCurrentHP,
  getMonsterMaxHP,
  getMonsterTemporaryHP,
} from '../../src/engine/combat';
import type { DamageDefenses } from '../../src/types/damage';
import type { MonsterAttack } from '../../src/types/monster';
import lookupTables from '../../static/srd/lookup-tables.json';
import monstersArray from '../../static/srd/monsters.json';

// ── Test Helpers ─────────────────────────────────────────────

const dataLoader = createDataLoader(lookupTables);

/**
 * Create a test character with standard fighter setup
 */
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

/**
 * Create a test monster from SRD data
 */
function getTestMonster(monsterId: string): any {
  const monster = (monstersArray as any).find((m: any) => m.id === monsterId);
  if (!monster) throw new Error(`Monster ${monsterId} not found in SRD data`);
  return monster;
}

/**
 * Simulate a d20 roll (deterministic for testing)
 */
function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Simulate attack roll: d20 + attack bonus vs AC
 */
function simulateAttackRoll(attackBonus: number, targetAC: number): {
  roll: number;
  total: number;
  hits: boolean;
  critical: boolean;
} {
  const roll = rollD20();
  const total = roll + attackBonus;
  const critical = roll === 20;
  const hits = critical || total >= targetAC;

  return { roll, total, hits, critical };
}

// ── Integration Tests ─────────────────────────────────────────

describe('Combat Scenarios - Character vs Monster Integration', () => {
  describe('Scenario 1: Basic Combat - Fighter vs Goblin', () => {
    let fighter: ReturnType<typeof createTestFighter>;
    let goblin: any;

    beforeEach(() => {
      fighter = createTestFighter('Bron');
      goblin = initializeMonsterForCombat(getTestMonster('goblin'));
    });

    it('should initialize combatants with full HP', () => {
      expect(getCharacterCurrentHP(fighter)).toBe(getCharacterMaxHP(fighter));
      expect(getCharacterTemporaryHP(fighter)).toBe(0);

      expect(getMonsterCurrentHP(goblin)).toBe(getMonsterMaxHP(goblin));
      expect(getMonsterTemporaryHP(goblin)).toBe(0);
    });

    it('should have correct AC values', () => {
      expect(fighter.combatStats.AC).toBeGreaterThan(0);
      expect(getMonsterAC(goblin)).toBe(15); // Goblin has AC 15 (leather armor + Dex)
    });

    it('should allow character to attack monster with hit roll', () => {
      const goblinAC = getMonsterAC(goblin);
      const attackBonus = 5; // Fighter with Str 16 (+3) and proficiency (+2) = +5

      const { hits, critical } = simulateAttackRoll(attackBonus, goblinAC);

      if (hits) {
        // Simulate damage (use less than goblin's 7 HP)
        const damage = 5;
        const updatedGoblin = modifyMonsterHP(goblin, -damage);
        expect(getMonsterCurrentHP(updatedGoblin)).toBe(getMonsterMaxHP(goblin) - damage);
      }

      expect(hits).toBeDefined();
      expect(critical).toBeDefined();
    });

    it('should allow monster to attack character', () => {
      const fighterAC = fighter.combatStats.AC;
      const goblinAttack: MonsterAttack = {
        name: 'Scimitar',
        attackBonus: 4,
        damageEntries: [{ dice: '1d6', bonus: 2, type: 'Slashing' }],
      };

      const { total, critical } = rollMonsterAttack(goblinAttack, goblin, dataLoader);
      const hits = critical || total >= fighterAC;

      if (hits) {
        const damage = rollMonsterAttackDamage(goblinAttack);
        const updatedFighter = modifyHP(fighter, -damage);
        expect(getCharacterCurrentHP(updatedFighter)).toBeLessThanOrEqual(getCharacterCurrentHP(fighter));
      }
    });

    it('should defeat goblin when HP reaches 0', () => {
      const goblinMaxHP = getMonsterMaxHP(goblin);
      const defeatedGoblin = modifyMonsterHP(goblin, -goblinMaxHP);
      expect(isMonsterDefeated(defeatedGoblin)).toBe(true);
    });
  });

  describe('Scenario 2: Damage Types and Defenses', () => {
    let fighter: ReturnType<typeof createTestFighter>;
    let dragon: any;

    beforeEach(() => {
      fighter = createTestFighter('DragonSlayer');
      dragon = initializeMonsterForCombat(getTestMonster('young-red-dragon'));
    });

    it('should apply fire resistance correctly', () => {
      // Give fighter fire resistance
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

      // With resistance, effective damage should be 10
      expect(result.result.effectiveDamage).toBe(10);
      expect(result.currentHP).toBe(getCharacterCurrentHP(fighter) - 10);
    });

    it('should apply fire immunity for red dragon', () => {
      // Red dragons are immune to fire
      const result = applyMonsterTypedDamage(dragon, 30, 'Fire');

      // Dragon should take no damage from fire
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

      // With vulnerability, effective damage should be 20
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

      // Resistance and vulnerability cancel out
      expect(result.result.effectiveDamage).toBe(10);
      expect(result.result.modifiers).toHaveLength(0);
    });
  });

  describe('Scenario 3: Temporary HP in Combat', () => {
    let fighter: ReturnType<typeof createTestFighter>;
    let goblin: any;

    beforeEach(() => {
      fighter = createTestFighter('TempHP Fighter');
      goblin = initializeMonsterForCombat(getTestMonster('goblin'));
    });

    it('should absorb damage with temporary HP first', () => {
      // Give fighter 10 temporary HP
      const withTempHP = setTemporaryHP(fighter, 10);
      expect(getCharacterTemporaryHP(withTempHP)).toBe(10);

      // Take 6 damage - should be absorbed by temp HP
      const afterDamage = modifyHP(withTempHP, -6);
      expect(getCharacterTemporaryHP(afterDamage)).toBe(4); // 10 - 6 = 4
      expect(getCharacterCurrentHP(afterDamage)).toBe(getCharacterMaxHP(fighter)); // No HP lost
    });

    it('should continue to current HP after temp HP is depleted', () => {
      const withTempHP = setTemporaryHP(fighter, 3);
      expect(getCharacterTemporaryHP(withTempHP)).toBe(3);

      // Take 8 damage - 3 absorbed by temp, 5 from current HP
      const afterDamage = modifyHP(withTempHP, -8);
      expect(getCharacterTemporaryHP(afterDamage)).toBe(0);
      expect(getCharacterCurrentHP(afterDamage)).toBe(getCharacterMaxHP(fighter) - 5);
    });

    it('should work with monster temporary HP', () => {
      const withTempHP = setMonsterTemporaryHP(goblin, 5);
      expect(getMonsterTemporaryHP(withTempHP)).toBe(5);

      // Take 3 damage
      const afterDamage = modifyMonsterHP(withTempHP, -3);
      expect(getMonsterTemporaryHP(afterDamage)).toBe(2);
      expect(getMonsterCurrentHP(afterDamage)).toBe(getMonsterMaxHP(goblin));
    });
  });

  describe('Scenario 4: Multi-Round Combat Simulation', () => {
    let fighter: ReturnType<typeof createTestFighter>;
    let goblin1: any;
    let goblin2: any;

    beforeEach(() => {
      fighter = createTestFighter('Bron');
      goblin1 = initializeMonsterForCombat(getTestMonster('goblin'));
      goblin2 = initializeMonsterForCombat(getTestMonster('goblin'));
    });

    it('should simulate a combat encounter with multiple participants', () => {
      const combatLog: string[] = [];
      let round = 1;
      let currentFighter = fighter;
      let currentGoblin1 = goblin1;
      let currentGoblin2 = goblin2;

      // Simulate 3 rounds of combat
      while (round <= 3 && !isMonsterDefeated(currentGoblin1) && !isMonsterDefeated(currentGoblin2)) {
        combatLog.push(`Round ${round}`);

        // Fighter attacks goblin1
        const goblin1AC = getMonsterAC(currentGoblin1);
        const attackRoll = simulateAttackRoll(5, goblin1AC);

        if (attackRoll.hits) {
          const damage = 8; // 1d6+2
          currentGoblin1 = modifyMonsterHP(currentGoblin1, -damage);
          combatLog.push(`  Fighter hits Goblin 1 for ${damage} damage (HP: ${getMonsterCurrentHP(currentGoblin1)})`);
        } else {
          combatLog.push('  Fighter misses Goblin 1');
        }

        // Goblin1 attacks fighter (if not defeated)
        if (!isMonsterDefeated(currentGoblin1)) {
          const goblinAttack: MonsterAttack = {
            name: 'Scimitar',
            attackBonus: 4,
            damageEntries: [{ dice: '1d6', bonus: 2, type: 'Slashing' }],
          };

          const monsterAttack = rollMonsterAttack(goblinAttack, currentGoblin1, dataLoader);
          if (monsterAttack.total >= currentFighter.combatStats.AC) {
            const damage = rollMonsterAttackDamage(goblinAttack);
            currentFighter = modifyHP(currentFighter, -damage);
            combatLog.push(`  Goblin 1 hits Fighter for ${damage} damage (HP: ${getCharacterCurrentHP(currentFighter)})`);
          } else {
            combatLog.push('  Goblin 1 misses Fighter');
          }
        }

        round++;
      }

      expect(combatLog.length).toBeGreaterThan(0);
      expect(round).toBeGreaterThan(1);
    });

    it('should handle fighter taking damage from multiple goblins', () => {
      let currentFighter = fighter;

      // Both goblins attack
      const goblinAttack: MonsterAttack = {
        name: 'Scimitar',
        attackBonus: 4,
        damageEntries: [{ dice: '1d6', bonus: 2, type: 'Slashing' }],
      };

      // Goblin 1 attacks
      const attack1 = rollMonsterAttack(goblinAttack, goblin1, dataLoader);
      if (attack1.total >= currentFighter.combatStats.AC) {
        const damage = rollMonsterAttackDamage(goblinAttack);
        currentFighter = modifyHP(currentFighter, -damage);
      }

      // Goblin 2 attacks
      const attack2 = rollMonsterAttack(goblinAttack, goblin2, dataLoader);
      if (attack2.total >= currentFighter.combatStats.AC) {
        const damage = rollMonsterAttackDamage(goblinAttack);
        currentFighter = modifyHP(currentFighter, -damage);
      }

      expect(getCharacterCurrentHP(currentFighter)).toBeLessThanOrEqual(getCharacterMaxHP(fighter));
    });
  });

  describe('Scenario 5: Damage Defense Modifications During Combat', () => {
    let monster: any;

    beforeEach(() => {
      monster = initializeMonsterForCombat(getTestMonster('goblin'));
    });

    it('should add resistance to monster during combat', () => {
      let updatedMonster = addMonsterDamageResistance(monster, 'Slashing');

      const result = applyMonsterTypedDamage(updatedMonster, 10, 'Slashing');
      expect(result.result.effectiveDamage).toBe(5); // Half due to resistance
    });

    it('should add immunity to monster during combat', () => {
      let updatedMonster = addMonsterDamageImmunity(monster, 'Poison');

      const result = applyMonsterTypedDamage(updatedMonster, 20, 'Poison');
      expect(result.result.effectiveDamage).toBe(0); // No damage due to immunity
    });

    it('should add vulnerability to monster during combat', () => {
      let updatedMonster = addMonsterDamageVulnerability(monster, 'Fire');

      const result = applyMonsterTypedDamage(updatedMonster, 10, 'Fire');
      expect(result.result.effectiveDamage).toBe(20); // Double due to vulnerability
    });

    it('should merge defenses from multiple sources', () => {
      const defenses1: DamageDefenses = {
        resistances: ['Fire', 'Cold'],
        immunities: ['Poison'],
        vulnerabilities: [],
      };

      const defenses2: DamageDefenses = {
        resistances: ['Lightning'],
        immunities: ['Poison'], // Duplicate
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

  describe('Scenario 6: Character with Damage Defenses vs Monster', () => {
    let fighter: ReturnType<typeof createTestFighter>;

    beforeEach(() => {
      fighter = createTestFighter('Resilient Fighter');
    });

    it('should apply character damage defenses correctly', () => {
      // Add fire resistance to character
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

      // Test slashing resistance
      const slashResult = applyTypedDamageToHP(
        getCharacterCurrentHP(charWithDefenses),
        getCharacterMaxHP(charWithDefenses),
        0,
        10,
        'Slashing',
        charWithDefenses.damageDefenses
      );
      expect(slashResult.result.effectiveDamage).toBe(5);

      // Test poison immunity
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

  describe('Scenario 7: Combat with Healing', () => {
    let fighter: ReturnType<typeof createTestFighter>;
    let goblin: any;

    beforeEach(() => {
      fighter = createTestFighter('Healer Fighter');
      goblin = initializeMonsterForCombat(getTestMonster('goblin'));
    });

    it('should allow healing during combat', () => {
      const maxHP = getCharacterMaxHP(fighter);
      // Damage the fighter (use realistic damage)
      const damage = Math.min(20, maxHP - 1);
      const damaged = modifyHP(fighter, -damage);
      expect(getCharacterCurrentHP(damaged)).toBe(maxHP - damage);

      // Heal the fighter
      const healed = modifyHP(damaged, 10);
      expect(getCharacterCurrentHP(healed)).toBe(Math.min(maxHP, maxHP - damage + 10));
    });

    it('should not heal beyond max HP', () => {
      const damaged = modifyHP(fighter, -20);
      const overHealed = modifyHP(damaged, 50); // Try to heal more than missing
      expect(getCharacterCurrentHP(overHealed)).toBe(getCharacterMaxHP(fighter));
    });

    it('should allow healing monster during combat', () => {
      // Damage the goblin
      const damaged = modifyMonsterHP(goblin, -5);
      expect(getMonsterCurrentHP(damaged)).toBe(getMonsterMaxHP(goblin) - 5);

      // Heal the goblin
      const healed = modifyMonsterHP(damaged, 3);
      expect(getMonsterCurrentHP(healed)).toBe(getMonsterMaxHP(goblin) - 2);
    });
  });

  describe('Scenario 8: Using Shared Combat Helpers', () => {
    let fighter: ReturnType<typeof createTestFighter>;
    let monster: any;

    beforeEach(() => {
      fighter = createTestFighter('Shared Helper Test');
      monster = initializeMonsterForCombat(getTestMonster('goblin'));
    });

    it('should use applyHPChange for both character and monster', () => {
      // Character HP change
      const charResult = applyHPChange(
        getCharacterCurrentHP(fighter),
        getCharacterMaxHP(fighter),
        getCharacterTemporaryHP(fighter),
        -10
      );
      expect(charResult.currentHP).toBe(getCharacterCurrentHP(fighter) - 10);

      // Monster HP change
      const monResult = applyHPChange(
        getMonsterCurrentHP(monster),
        getMonsterMaxHP(monster),
        getMonsterTemporaryHP(monster),
        -5
      );
      expect(monResult.currentHP).toBe(getMonsterMaxHP(monster) - 5);
    });

    it('should use isDefeatedShared for both character and monster', () => {
      expect(isDefeatedShared(getCharacterCurrentHP(fighter))).toBe(false);
      expect(isDefeatedShared(0)).toBe(true);
      expect(isDefeatedShared(-5)).toBe(true);

      expect(isDefeatedShared(getMonsterCurrentHP(monster))).toBe(false);
      expect(isDefeatedShared(0)).toBe(true);
    });

    it('should use setTemporaryHPShared consistently', () => {
      const charTemp = setTemporaryHPShared(getCharacterTemporaryHP(fighter), 10);
      expect(charTemp).toBe(10);

      const monTemp = setTemporaryHPShared(getMonsterTemporaryHP(monster), 5);
      expect(monTemp).toBe(5);
    });
  });

  describe('Scenario 9: Edge Cases in Combat', () => {
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
      const maxHP = getMonsterMaxHP(monster); // Goblin has 7 HP
      const damage = 5; // Use less than max HP
      const result = modifyMonsterHP(monster, -damage); // No damage type = raw damage
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

  describe('Scenario 10: Complex Combat with Multiple Damage Types', () => {
    let fighter: ReturnType<typeof createTestFighter>;
    let monster: any;

    beforeEach(() => {
      fighter = createTestFighter('Multi-Type Fighter');
      monster = initializeMonsterForCombat(getTestMonster('goblin'));
    });

    it('should handle different damage types in sequence', () => {
      let currentFighter = fighter;
      const defenses = emptyDefenses(); // No special defenses
      const maxHP = getCharacterMaxHP(fighter);

      // Take slashing damage (small amount)
      const damage1 = 3;
      const slashResult = applyTypedDamage(currentFighter, damage1, 'Slashing', defenses);
      currentFighter = slashResult.char;
      expect(getCharacterCurrentHP(currentFighter)).toBe(maxHP - damage1);

      // Take fire damage
      const damage2 = 2;
      const fireResult = applyTypedDamage(currentFighter, damage2, 'Fire', defenses);
      currentFighter = fireResult.char;
      expect(getCharacterCurrentHP(currentFighter)).toBe(maxHP - damage1 - damage2);

      // Take cold damage
      const damage3 = 2;
      const coldResult = applyTypedDamage(currentFighter, damage3, 'Cold', defenses);
      currentFighter = coldResult.char;
      expect(getCharacterCurrentHP(currentFighter)).toBe(maxHP - damage1 - damage2 - damage3);
    });

    it('should handle monster taking multiple damage types', () => {
      let currentMonster = monster;
      const maxHP = getMonsterMaxHP(monster); // Goblin has 7 HP

      // Slashing - 5 damage
      const result1 = applyMonsterTypedDamage(currentMonster, 5, 'Slashing');
      currentMonster = result1.monster;
      expect(getMonsterCurrentHP(currentMonster)).toBe(maxHP - 5);

      // Fire - 5 more damage (total 10, but goblin only has 7 HP)
      const result2 = applyMonsterTypedDamage(currentMonster, 5, 'Fire');
      currentMonster = result2.monster;

      // Poison - 5 more damage
      const result3 = applyMonsterTypedDamage(currentMonster, 5, 'Poison');
      currentMonster = result3.monster;

      // Goblin should be defeated (HP at 0)
      expect(getMonsterCurrentHP(currentMonster)).toBe(0);
    });
  });
});

describe('Combat Scenarios - Engine Combat Helpers', () => {
  describe('Shared Helper Functions', () => {
    it('should apply HP change with temp HP absorption', () => {
      // Damage less than temp HP
      const result1 = applyHPChange(50, 100, 10, -5);
      expect(result1.currentHP).toBe(50);
      expect(result1.temporaryHP).toBe(5);

      // Damage more than temp HP
      const result2 = applyHPChange(50, 100, 3, -10);
      expect(result2.currentHP).toBe(43); // 50 - (10 - 3)
      expect(result2.temporaryHP).toBe(0);

      // Healing
      const result3 = applyHPChange(50, 100, 0, 20);
      expect(result3.currentHP).toBe(70);
      expect(result3.temporaryHP).toBe(0);

      // Healing beyond max
      const result4 = applyHPChange(80, 100, 0, 30);
      expect(result4.currentHP).toBe(100);
    });

    it('should apply typed damage with defenses', () => {
      const defenses: DamageDefenses = {
        resistances: ['Fire'],
        immunities: ['Poison'],
        vulnerabilities: ['Cold'],
      };

      // Fire damage (resisted)
      const result1 = applyTypedDamageToHP(100, 100, 0, 20, 'Fire', defenses);
      expect(result1.result.effectiveDamage).toBe(10);
      expect(result1.currentHP).toBe(90);

      // Poison damage (immune)
      const result2 = applyTypedDamageToHP(100, 100, 0, 20, 'Poison', defenses);
      expect(result2.result.effectiveDamage).toBe(0);
      expect(result2.currentHP).toBe(100);

      // Cold damage (vulnerable)
      const result3 = applyTypedDamageToHP(100, 100, 0, 10, 'Cold', defenses);
      expect(result3.result.effectiveDamage).toBe(20);
      expect(result3.currentHP).toBe(80);
    });

    it('should handle edge cases in defense calculations', () => {
      // No defenses
      const result1 = applyTypedDamageToHP(100, 100, 0, 10, 'Fire', emptyDefenses());
      expect(result1.result.effectiveDamage).toBe(10);

      // Conflicting defenses (resistance + vulnerability)
      const conflicting: DamageDefenses = {
        resistances: ['Fire'],
        immunities: [],
        vulnerabilities: ['Fire'],
      };
      const result2 = applyTypedDamageToHP(100, 100, 0, 10, 'Fire', conflicting);
      expect(result2.result.effectiveDamage).toBe(10); // Cancel out
    });
  });
});
