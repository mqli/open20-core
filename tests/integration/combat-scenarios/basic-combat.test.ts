import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import { recomputeDerivedStats } from '../../../src/character/recompute';
import { modifyHP } from '../../../src/character/mutate';
import {
  initializeMonsterForCombat,
  modifyMonsterHP,
  isMonsterDefeated,
  getMonsterAC,
} from '../../../src/monster/combat';

import {
  rollMonsterAttack,
  rollMonsterAttackDamage,
} from '../../../src/rolls/monster';
import {
  applyHPChange,
  isDefeatedShared,
  setTemporaryHPShared,
  getCharacterCurrentHP,
  getCharacterMaxHP,
  getCharacterTemporaryHP,
  getMonsterCurrentHP,
  getMonsterMaxHP,
  getMonsterTemporaryHP,
} from '../../../src/engine/combat';
import { defaultRandom } from '../../../src/dice/core';
import { calculateMonsterAttackBonus } from '../../../src/monster/calculator';
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

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

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

// ── Scenario 1: Basic Combat - Fighter vs Goblin ────────────

describe('Combat Scenarios - Basic Combat (Fighter vs Goblin)', () => {
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
    expect(getMonsterAC(goblin)).toBe(15);
  });

  it('should allow character to attack monster with hit roll', () => {
    const goblinAC = getMonsterAC(goblin);
    const attackBonus = 5;

    const { hits, critical } = simulateAttackRoll(attackBonus, goblinAC);

    if (hits) {
      const damage = 5;
      const updatedGoblin = modifyMonsterHP(goblin, -damage);
      expect(getMonsterCurrentHP(updatedGoblin)).toBe(getMonsterMaxHP(goblin) - damage);
    }

    expect(hits).toBeDefined();
    expect(critical).toBeDefined();
  });

  it('should allow monster to attack character', () => {
    const fighterAC = fighter.combatStats.AC;
    const goblinAttack: any = {
      name: 'Scimitar',
      attackBonus: 4,
      damageEntries: [{ dice: '1d6', bonus: 2, type: 'Slashing' }],
    };

    const attackBonus = goblinAttack.attackBonus ?? calculateMonsterAttackBonus(goblin, goblinAttack, dataLoader);
    const result = rollMonsterAttack({ monster: goblin, attackBonus, rng: defaultRandom });
    const { total, isCritical } = result;
    const hits = isCritical || total >= fighterAC;

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

// ── Scenario 4: Multi-Round Combat Simulation ────────────────

describe('Combat Scenarios - Multi-Round Combat', () => {
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

    while (round <= 3 && !isMonsterDefeated(currentGoblin1) && !isMonsterDefeated(currentGoblin2)) {
      combatLog.push(`Round ${round}`);

      const goblin1AC = getMonsterAC(currentGoblin1);
      const attackRoll = simulateAttackRoll(5, goblin1AC);

      if (attackRoll.hits) {
        const damage = 8;
        currentGoblin1 = modifyMonsterHP(currentGoblin1, -damage);
        combatLog.push(`  Fighter hits Goblin 1 for ${damage} damage (HP: ${getMonsterCurrentHP(currentGoblin1)})`);
      } else {
        combatLog.push('  Fighter misses Goblin 1');
      }

      if (!isMonsterDefeated(currentGoblin1)) {
        const goblinAttack: any = {
          name: 'Scimitar',
          attackBonus: 4,
          damageEntries: [{ dice: '1d6', bonus: 2, type: 'Slashing' }],
        };

        const attackBonus = goblinAttack.attackBonus ?? calculateMonsterAttackBonus(currentGoblin1, goblinAttack, dataLoader);
        const monsterAttack = rollMonsterAttack({ monster: currentGoblin1, attackBonus, rng: defaultRandom });
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

    const goblinAttack: any = {
      name: 'Scimitar',
      attackBonus: 4,
      damageEntries: [{ dice: '1d6', bonus: 2, type: 'Slashing' }],
    };

    const attackBonus1 = goblinAttack.attackBonus ?? calculateMonsterAttackBonus(goblin1, goblinAttack, dataLoader);
    const attack1 = rollMonsterAttack({ monster: goblin1, attackBonus: attackBonus1, rng: defaultRandom });
    if (attack1.total >= currentFighter.combatStats.AC) {
      const damage = rollMonsterAttackDamage(goblinAttack);
      currentFighter = modifyHP(currentFighter, -damage);
    }

    const attackBonus2 = goblinAttack.attackBonus ?? calculateMonsterAttackBonus(goblin2, goblinAttack, dataLoader);
    const attack2 = rollMonsterAttack({ monster: goblin2, attackBonus: attackBonus2, rng: defaultRandom });
    if (attack2.total >= currentFighter.combatStats.AC) {
      const damage = rollMonsterAttackDamage(goblinAttack);
      currentFighter = modifyHP(currentFighter, -damage);
    }

    expect(getCharacterCurrentHP(currentFighter)).toBeLessThanOrEqual(getCharacterMaxHP(fighter));
  });
});

// ── Scenario 8: Using Shared Combat Helpers ──────────────────

describe('Combat Scenarios - Shared Combat Helpers', () => {
  let fighter: ReturnType<typeof createTestFighter>;
  let monster: any;

  beforeEach(() => {
    fighter = createTestFighter('Shared Helper Test');
    monster = initializeMonsterForCombat(getTestMonster('goblin'));
  });

  it('should use applyHPChange for both character and monster', () => {
    const charResult = applyHPChange(
      getCharacterCurrentHP(fighter),
      getCharacterMaxHP(fighter),
      getCharacterTemporaryHP(fighter),
      -10
    );
    expect(charResult.currentHP).toBe(getCharacterCurrentHP(fighter) - 10);

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
