import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import { recomputeDerivedStats } from '../../../src/character/recompute';
import { modifyHP, setTemporaryHP } from '../../../src/character/mutate';
import {
  initializeMonsterForCombat,
  modifyMonsterHP,
  setMonsterTemporaryHP,
} from '../../../src/monster/combat';
import {
  getCharacterCurrentHP,
  getCharacterMaxHP,
  getCharacterTemporaryHP,
  getMonsterCurrentHP,
  getMonsterMaxHP,
  getMonsterTemporaryHP,
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

// ── Scenario 3: Temporary HP in Combat ──────────────────────

describe('Combat Scenarios - Temporary HP', () => {
  let fighter: ReturnType<typeof createTestFighter>;
  let goblin: any;

  beforeEach(() => {
    fighter = createTestFighter('TempHP Fighter');
    goblin = initializeMonsterForCombat(getTestMonster('goblin'));
  });

  it('should absorb damage with temporary HP first', () => {
    const withTempHP = setTemporaryHP(fighter, 10);
    expect(getCharacterTemporaryHP(withTempHP)).toBe(10);

    const afterDamage = modifyHP(withTempHP, -6);
    expect(getCharacterTemporaryHP(afterDamage)).toBe(4);
    expect(getCharacterCurrentHP(afterDamage)).toBe(getCharacterMaxHP(fighter));
  });

  it('should continue to current HP after temp HP is depleted', () => {
    const withTempHP = setTemporaryHP(fighter, 3);
    expect(getCharacterTemporaryHP(withTempHP)).toBe(3);

    const afterDamage = modifyHP(withTempHP, -8);
    expect(getCharacterTemporaryHP(afterDamage)).toBe(0);
    expect(getCharacterCurrentHP(afterDamage)).toBe(getCharacterMaxHP(fighter) - 5);
  });

  it('should work with monster temporary HP', () => {
    const withTempHP = setMonsterTemporaryHP(goblin, 5);
    expect(getMonsterTemporaryHP(withTempHP)).toBe(5);

    const afterDamage = modifyMonsterHP(withTempHP, -3);
    expect(getMonsterTemporaryHP(afterDamage)).toBe(2);
    expect(getMonsterCurrentHP(afterDamage)).toBe(getMonsterMaxHP(goblin));
  });
});
