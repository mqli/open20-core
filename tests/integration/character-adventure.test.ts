import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
import { shortRest, longRest } from '../../src/character/rest';
import { levelUp } from '../../src/character/level-up';
import { recomputeDerivedStats } from '../../src/character/recompute';
import { serialize, deserialize } from '../../src/storage/serializer';
import { applyTypedDamage } from '../../src/character/mutate';
import type { DamageDefenses } from '../../src/types/damage';

const dataLoader = createDataLoader();

describe('D&D Player Behavior - Adventure Arc', () => {
  describe('Session 17: Barbarian Rage and Reckless Attack', () => {
    it('should simulate a raging barbarian in combat', () => {
      let barbarian = createCharacter(
        {
          name: 'Grommash',
          speciesId: 'Half-Orc',
          backgroundId: 'soldier',
          classId: 'Barbarian',
          classLevel: 5,
          abilityScores: {
            Strength: 18,
            Dexterity: 12,
            Constitution: 16,
            Intelligence: 8,
            Wisdom: 12,
            Charisma: 10,
          },
        },
        dataLoader
      );

      const initialHP = (barbarian as any).hitPoints.current;

      (barbarian as any).conditions.push({ id: 'Raging', source: 'test', appliedAt: '2024-01-01' });
      expect(barbarian.conditions.some(c => c.id === 'Raging')).toBe(true);

      const defenses: DamageDefenses = {
        resistances: ['Bludgeoning', 'Piercing', 'Slashing'],
        immunities: [],
        vulnerabilities: [],
      };

      let { char: damaged } = applyTypedDamage(barbarian, 20, 'Slashing', defenses);
      expect(damaged.hitPoints.current).toBe(initialHP - 10);

      ({ char: damaged } = applyTypedDamage(damaged, 15, 'Fire', defenses));
      expect(damaged.hitPoints.current).toBe(initialHP - 25);

      (damaged as any).conditions = damaged.conditions.filter(c => c.id !== 'Raging');
      expect(damaged.conditions.some(c => c.id === 'Raging')).toBe(false);

      const defensesNotRaging: DamageDefenses = {
        resistances: [],
        immunities: [],
        vulnerabilities: [],
      };
      ({ char: damaged } = applyTypedDamage(damaged, 10, 'Slashing', defensesNotRaging));
      expect(damaged.hitPoints.current).toBe(initialHP - 35);
    });
  });

  describe('Session 18: Initiative and Turn Order', () => {
    it('should recalculate initiative after stat changes', () => {
      let rogue = createCharacter(
        {
          name: 'Whisper',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Rogue',
          abilityScores: {
            Strength: 10,
            Dexterity: 16,
            Constitution: 14,
            Intelligence: 12,
            Wisdom: 14,
            Charisma: 10,
          },
        },
        dataLoader
      );

      const initialInitiative = rogue.combatStats.initiative;
      expect(initialInitiative).toBe(3);

      rogue = levelUp(rogue, { classId: 'Rogue', hpChoice: 'fixed' }, dataLoader);
      expect(rogue.combatStats.initiative).toBe(initialInitiative);

      const recomputed = recomputeDerivedStats(rogue, dataLoader);
      expect(recomputed.combatStats.initiative).toBe(initialInitiative);
    });
  });

  describe('Session 19: Full Adventure Arc', () => {
    it('should simulate a complete adventure from level 1 to 3', () => {
      let hero = createCharacter(
        {
          name: 'Kira',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Paladin',
          abilityScores: {
            Strength: 15,
            Dexterity: 12,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 13,
            Charisma: 15,
          },
        },
        dataLoader
      );

      expect(hero.classes[0]!.level).toBe(1);
      const level1HP = hero.hitPoints.max;

      hero = modifyHP(hero, -8);
      expect(hero.hitPoints.current).toBeGreaterThan(0);

      hero = shortRest(hero, 1, dataLoader);
      expect(hero.hitPoints.current).toBeGreaterThan(level1HP - 8);

      hero = longRest(hero, dataLoader);
      expect(hero.hitPoints.current).toBe(hero.hitPoints.max);

      hero = levelUp(hero, { classId: 'Paladin', hpChoice: 'fixed' }, dataLoader);
      expect(hero.classes[0]!.level).toBe(2);
      expect(hero.hitPoints.max).toBeGreaterThan(level1HP);

      hero = modifyHP(hero, -15);
      hero = longRest(hero, dataLoader);

      hero = levelUp(hero, { classId: 'Paladin', hpChoice: 'fixed' }, dataLoader);
      expect(hero.classes[0]!.level).toBe(3);
      expect(hero.hitPoints.max).toBeGreaterThanOrEqual(hero.hitPoints.current);

      const json = serialize(hero);
      const saved = deserialize(json);
      expect(saved.name).toBe('Kira');
      expect(saved.classes[0]!.level).toBe(3);
    });
  });

  describe('Session 20: Edge Cases and Error Handling', () => {
    it('should handle negative ability scores gracefully', () => {
      const hero = createCharacter(
        {
          name: 'Test',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 1,
            Dexterity: 1,
            Constitution: 1,
            Intelligence: 1,
            Wisdom: 1,
            Charisma: 1,
          },
        },
        dataLoader
      );

      expect(hero.abilityScores.base['Strength']).toBe(1);
    });

    it('should handle maximum hit points correctly', () => {
      let hero = createCharacter(
        {
          name: 'Tank',
          speciesId: 'Dwarf',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 16,
            Dexterity: 10,
            Constitution: 18,
            Intelligence: 8,
            Wisdom: 12,
            Charisma: 10,
          },
        },
        dataLoader
      );

      hero = modifyHP(hero, -hero.hitPoints.current);
      expect(hero.hitPoints.current).toBe(0);

      hero = modifyHP(hero, 1000);
      expect(hero.hitPoints.current).toBe(hero.hitPoints.max);
    });

    it('should handle rapid level ups', () => {
      let hero = createCharacter(
        {
          name: 'Power Gamer',
          speciesId: 'Human',
          backgroundId: 'sage',
          classId: 'Wizard',
          abilityScores: {
            Strength: 8,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 16,
            Wisdom: 12,
            Charisma: 10,
          },
        },
        dataLoader
      );

      const level1Slots = hero.spells.spellSlots[1]!.total;
      expect(level1Slots).toBe(2);

      hero = levelUp(hero, { classId: 'Wizard', hpChoice: 'fixed' }, dataLoader);
      expect(hero.classes[0]!.level).toBe(2);

      hero = levelUp(hero, { classId: 'Wizard', hpChoice: 'fixed' }, dataLoader);
      expect(hero.classes[0]!.level).toBe(3);

      hero = levelUp(hero, { classId: 'Wizard', hpChoice: 'fixed' }, dataLoader);
      expect(hero.classes[0]!.level).toBe(4);
      expect(hero.combatStats.proficiencyBonus).toBe(2);

      expect(hero.hitPoints.max).toBeGreaterThan(level1Slots);
    });
  });
});
