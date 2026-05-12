import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import { recomputeDerivedStats } from '../../../src/character/recompute';
import { modifyHP } from '../../../src/character/mutate';
import {
  initializeMonsterForCombat,
  modifyMonsterHP,
} from '../../../src/monster/combat';
import {
  getCharacterCurrentHP,
  getCharacterMaxHP,
  getMonsterCurrentHP,
  getMonsterMaxHP,
} from '../../../src/engine/combat';
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

// ── Scenario 7: Combat with Healing ─────────────────────────

describe('Combat Scenarios - Healing in Combat', () => {
  let fighter: ReturnType<typeof createTestFighter>;
  let goblin: any;

  beforeEach(() => {
    fighter = createTestFighter('Healer Fighter');
    goblin = initializeMonsterForCombat(getTestMonster('goblin'));
  });

  it('should allow healing during combat', () => {
    const maxHP = getCharacterMaxHP(fighter);
    const damage = Math.min(20, maxHP - 1);
    const damaged = modifyHP(fighter, -damage);
    expect(getCharacterCurrentHP(damaged)).toBe(maxHP - damage);

    const healed = modifyHP(damaged, 10);
    expect(getCharacterCurrentHP(healed)).toBe(Math.min(maxHP, maxHP - damage + 10));
  });

  it('should not heal beyond max HP', () => {
    const damaged = modifyHP(fighter, -20);
    const overHealed = modifyHP(damaged, 50);
    expect(getCharacterCurrentHP(overHealed)).toBe(getCharacterMaxHP(fighter));
  });

  it('should allow healing monster during combat', () => {
    const damaged = modifyMonsterHP(goblin, -5);
    expect(getMonsterCurrentHP(damaged)).toBe(getMonsterMaxHP(goblin) - 5);

    const healed = modifyMonsterHP(damaged, 3);
    expect(getMonsterCurrentHP(healed)).toBe(getMonsterMaxHP(goblin) - 2);
  });
});
