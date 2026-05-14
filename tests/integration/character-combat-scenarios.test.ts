import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
import { shortRest, longRest } from '../../src/character/rest';
import { levelUp } from '../../src/character/level-up';
import { validateCharacter } from '../../src/character/validate';
import { serialize, deserialize } from '../../src/storage/serializer';
import { applyTypedDamage } from '../../src/character/mutate';
import type { DamageDefenses } from '../../src/types/damage';

const dataLoader = createDataLoader();

describe('D&D Player Behavior - Full Lifecycle & Combat Scenarios', () => {
  describe('Session 10: Full Character Lifecycle', () => {
    it('should handle complete character journey', () => {
      let char = createCharacter(
        {
          name: 'Aria',
          speciesId: 'Elf',
          backgroundId: 'sage',
          classId: 'Wizard',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 13,
            Intelligence: 15,
            Wisdom: 12,
            Charisma: 10,
          },
        },
        dataLoader
      );

      expect(char.classes[0]!.level).toBe(1);

      char = levelUp(char, { classId: 'Wizard', hpChoice: 'fixed' }, dataLoader);
      expect(char.classes[0]!.level).toBe(2);

      const damageAmount = char.hitPoints.current - 1;
      char = modifyHP(char, -damageAmount);
      expect(char.hitPoints.current).toBe(1);

      const hitDiceBefore = char.classes[0]!.hitDice.used;
      const afterShortRest = shortRest(char, 1, dataLoader);
      expect(afterShortRest.hitPoints.current).toBeGreaterThan(char.hitPoints.current);
      expect(afterShortRest.classes[0]!.hitDice.used).toBe(hitDiceBefore + 1);

      char = longRest(afterShortRest, dataLoader);
      expect(char.hitPoints.current).toBe(char.hitPoints.max);
      expect(char.classes[0]!.hitDice.used).toBe(0);

      const json = serialize(char);
      const restored = deserialize(json);
      expect(restored.name).toBe(char.name);
      expect(restored.hitPoints.current).toBe(char.hitPoints.current);
      expect(restored.classes[0]!.level).toBe(char.classes[0]!.level);

      const validation = validateCharacter(restored, dataLoader);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Session 12: Full Combat Round Simulation', () => {
    it('should simulate a complete combat encounter', () => {
      let fighter = createCharacter(
        {
          name: 'Sir Roland',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 5,
          abilityScores: {
            Strength: 18,
            Dexterity: 14,
            Constitution: 16,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      const initialHP = fighter.hitPoints.current;

      fighter = modifyHP(fighter, -12);
      expect(fighter.hitPoints.current).toBe(initialHP - 12);
      expect(fighter.hitPoints.current).toBeGreaterThan(0);

      const defenses: DamageDefenses = {
        resistances: [],
        immunities: [],
        vulnerabilities: [],
      };
      const { char: afterTypedDmg, result } = applyTypedDamage(fighter, 8, 'Fire', defenses);
      fighter = afterTypedDmg;
      expect(result.effectiveDamage).toBe(8);
      expect(fighter.hitPoints.current).toBe(initialHP - 20);

      fighter = shortRest(fighter, 1, dataLoader);
      expect(fighter.hitPoints.current).toBeGreaterThan(initialHP - 20);

      fighter = levelUp(fighter, { classId: 'Fighter', hpChoice: 'fixed' }, dataLoader);
      expect(fighter.classes[0]!.level).toBe(6);
      expect(fighter.combatStats.proficiencyBonus).toBe(3);

      expect(fighter.hitPoints.max).toBeGreaterThan(initialHP);
    });

    it('should simulate a wizard casting multiple spells then resting', () => {
      let wizard = createCharacter(
        {
          name: 'Zara',
          speciesId: 'Elf',
          backgroundId: 'sage',
          classId: 'Wizard',
          classLevel: 3,
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 13,
            Intelligence: 16,
            Wisdom: 12,
            Charisma: 10,
          },
        },
        dataLoader
      );

      expect(wizard.spells.spellSlots[1]!.total).toBe(4);
      expect(wizard.spells.spellSlots[2]!.total).toBe(2);
      expect(wizard.spells.spellSlots[3]!.total).toBe(0);

      (wizard.spells.spellSlots[1] as any).used = 2;
      (wizard.spells.spellSlots[2] as any).used = 1;

      const afterShortRest = shortRest(wizard, 0, dataLoader);
      expect(afterShortRest.spells.spellSlots[1]!.used).toBe(2);
      expect(afterShortRest.spells.spellSlots[2]!.used).toBe(1);

      const afterLongRest = longRest(wizard, dataLoader);
      expect(afterLongRest.spells.spellSlots[1]!.used).toBe(0);
      expect(afterLongRest.spells.spellSlots[2]!.used).toBe(0);
    });
  });

  describe('Session 13: Polymorph and Transformation Effects', () => {
    it('should handle temp HP from abilities', () => {
      let fighter = createCharacter(
        {
          name: 'Grimjaw',
          speciesId: 'Dwarf',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 18,
            Dexterity: 10,
            Constitution: 16,
            Intelligence: 8,
            Wisdom: 14,
            Charisma: 8,
          },
        },
        dataLoader
      );

      const originalHP = (fighter as any).hitPoints.current;

      (fighter as any).hitPoints.temporary = 10;
      expect(fighter.hitPoints.temporary).toBe(10);

      const defenses: DamageDefenses = {
        resistances: [],
        immunities: [],
        vulnerabilities: [],
      };
      const { char: damaged } = applyTypedDamage(fighter, 5, 'Bludgeoning', defenses);
      expect(damaged.hitPoints.temporary).toBe(5);
      expect(damaged.hitPoints.current).toBe(originalHP);
    });

    it('should track conditions that affect gameplay', () => {
      let ranger = createCharacter(
        {
          name: 'Sylara',
          speciesId: 'Elf',
          backgroundId: 'sage',  // SRD 5.2: acolyte, criminal, sage, soldier
          classId: 'Ranger',
          abilityScores: {
            Strength: 14,
            Dexterity: 16,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 14,
            Charisma: 10,
          },
        },
        dataLoader
      );

      (ranger as any).conditions.push({ id: 'Poisoned', source: 'test', appliedAt: '2024-01-01' });
      expect(ranger.conditions.some(c => c.id === 'Poisoned')).toBe(true);

      (ranger as any).conditions = ranger.conditions.filter(c => c.id !== 'Poisoned');
      expect(ranger.conditions.some(c => c.id === 'Poisoned')).toBe(false);
    });
  });

  describe('Session 14: Multi-Enemy Combat Scenario', () => {
    it('should handle multiple attacks from different enemies', () => {
      let hero = createCharacter(
        {
          name: 'Aldric',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 16,
            Dexterity: 14,
            Constitution: 15,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      const initialHP = hero.hitPoints.current;
      const defenses: DamageDefenses = {
        resistances: [],
        immunities: [],
        vulnerabilities: [],
      };

      let { char: damaged } = applyTypedDamage(hero, 8, 'Slashing', defenses);
      expect(damaged.hitPoints.current).toBeLessThan(initialHP);

      ({ char: damaged } = applyTypedDamage(damaged, 12, 'Piercing', defenses));
      expect(damaged.hitPoints.current).toBeLessThan(initialHP);

      ({ char: damaged } = applyTypedDamage(damaged, 16, 'Bludgeoning', defenses));
      expect(damaged.hitPoints.current).toBeGreaterThanOrEqual(0);

      const afterRest = shortRest(damaged, 1, dataLoader);
      if (damaged.hitPoints.current > 0) {
        expect(afterRest.hitPoints.current).toBeGreaterThan(damaged.hitPoints.current);
      }
    });

    it('should handle resistance reducing multiple attacks', () => {
      let tank = createCharacter(
        {
          name: 'Thordin',
          speciesId: 'Dwarf',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 18,
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

      let { char: damaged, result } = applyTypedDamage(tank, 20, 'Poison', defenses);
      expect(result.effectiveDamage).toBe(10);
      expect(damaged.hitPoints.current).toBeLessThan(tank.hitPoints.current);

      ({ char: damaged, result } = applyTypedDamage(damaged, 20, 'Fire', defenses));
      expect(result.effectiveDamage).toBe(20);
      expect(damaged.hitPoints.current).toBeLessThan(tank.hitPoints.current);
    });
  });
});
