import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
import { longRest } from '../../src/character/rest';
import { calculateTypedDamage } from '../../src/engine/damage-calculator';
import { applyTypedDamage } from '../../src/character/mutate';
import type { DamageDefenses } from '../../src/types/damage';

const dataLoader = createDataLoader();

describe('D&D Player Behavior - Combat and Damage', () => {
  describe('Session 9: Death and Death Saves', () => {
    it('should track death saves when dropped to 0 HP', () => {
      const fighter = createCharacter(
        {
          name: 'Bron',
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

      const dying = modifyHP(fighter, -fighter.hitPoints.max);
      expect(dying.hitPoints.current).toBe(0);
      expect(dying.hitPoints.deathSaves).toBeDefined();
      expect(dying.hitPoints.deathSaves!.successes).toBe(0);
      expect(dying.hitPoints.deathSaves!.failures).toBe(0);
    });

    it('should reset death saves and restore HP on long rest', () => {
      let fighter = createCharacter(
        {
          name: 'Bron',
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

      fighter = modifyHP(fighter, -fighter.hitPoints.max);
      expect(fighter.hitPoints.current).toBe(0);

      const restored = longRest(fighter, dataLoader);
      expect(restored.hitPoints.current).toBe(restored.hitPoints.max);
      expect(restored.hitPoints.deathSaves!.successes).toBe(0);
      expect(restored.hitPoints.deathSaves!.failures).toBe(0);
    });
  });

  describe('Session 11: Damage Types and Resistance', () => {
    it('should apply resistance correctly to fire damage', () => {
      const defenses: DamageDefenses = {
        resistances: ['Fire'],
        immunities: [],
        vulnerabilities: [],
      };

      const result = calculateTypedDamage(10, 'Fire', defenses);
      expect(result.originalDamage).toBe(10);
      expect(result.effectiveDamage).toBe(5);
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0]).toEqual({ type: 'resistance', damageType: 'Fire' });
    });

    it('should apply immunity to poison damage', () => {
      const defenses: DamageDefenses = {
        resistances: [],
        immunities: ['Poison'],
        vulnerabilities: [],
      };

      const result = calculateTypedDamage(50, 'Poison', defenses);
      expect(result.effectiveDamage).toBe(0);
      expect(result.modifiers[0]).toEqual({ type: 'immunity', damageType: 'Poison' });
    });

    it('should apply vulnerability to lightning damage', () => {
      const defenses: DamageDefenses = {
        resistances: [],
        immunities: [],
        vulnerabilities: ['Lightning'],
      };

      const result = calculateTypedDamage(10, 'Lightning', defenses);
      expect(result.effectiveDamage).toBe(20);
      expect(result.modifiers[0]).toEqual({ type: 'vulnerability', damageType: 'Lightning' });
    });

    it('should cancel resistance and vulnerability', () => {
      const defenses: DamageDefenses = {
        resistances: ['Fire'],
        immunities: [],
        vulnerabilities: ['Fire'],
      };

      const result = calculateTypedDamage(10, 'Fire', defenses);
      expect(result.effectiveDamage).toBe(10);
      expect(result.modifiers).toHaveLength(0);
    });

    it('should handle Dwarven Poison Resistance', () => {
      const _dwarf = createCharacter(
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

      const defenses: DamageDefenses = {
        resistances: ['Poison'],
        immunities: [],
        vulnerabilities: [],
      };

      const result = calculateTypedDamage(8, 'Poison', defenses);
      expect(result.effectiveDamage).toBe(4);
    });

    it('should modifyHP with typed damage for a Dwarf', () => {
      const _dwarf = createCharacter(
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

      const defenses: DamageDefenses = {
        resistances: ['Poison'],
        immunities: [],
        vulnerabilities: [],
      };

      const originalHP = _dwarf.hitPoints.current;
      const { char: damaged, result } = applyTypedDamage(_dwarf, 8, 'Poison', defenses);
      expect(result.effectiveDamage).toBe(4);
      expect(originalHP - damaged.hitPoints.current).toBe(4);
    });

    it('should use applyTypedDamage and return damage result', () => {
      const fighter = createCharacter(
        {
          name: 'Tordek',
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

      const defenses: DamageDefenses = {
        resistances: ['Fire'],
        immunities: [],
        vulnerabilities: [],
      };

      const originalHP = fighter.hitPoints.current;
      const { char: damaged, result } = applyTypedDamage(fighter, 10, 'Fire', defenses);

      expect(result.originalDamage).toBe(10);
      expect(result.effectiveDamage).toBe(5);
      expect(originalHP - damaged.hitPoints.current).toBe(5);
    });

    it('should handle Barbarian rage resistance (B/P/S)', () => {
      const defenses: DamageDefenses = {
        resistances: ['Bludgeoning', 'Piercing', 'Slashing'],
        immunities: [],
        vulnerabilities: [],
      };

      const slashResult = calculateTypedDamage(10, 'Slashing', defenses);
      expect(slashResult.effectiveDamage).toBe(5);

      const pierceResult = calculateTypedDamage(10, 'Piercing', defenses);
      expect(pierceResult.effectiveDamage).toBe(5);

      const bludgeResult = calculateTypedDamage(10, 'Bludgeoning', defenses);
      expect(bludgeResult.effectiveDamage).toBe(5);

      const fireResult = calculateTypedDamage(10, 'Fire', defenses);
      expect(fireResult.effectiveDamage).toBe(10);
    });
  });
});
