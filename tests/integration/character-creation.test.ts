import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
import { shortRest } from '../../src/character/rest';

const dataLoader = createDataLoader();

describe('D&D Player Behavior - Character Creation', () => {
  describe('Session 0: Character Creation', () => {
    it('should create a Human Fighter at level 1', () => {
      const char = createCharacter(
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

      expect(char.name).toBe('Tordek');
      expect(char.species).toBe('Human');
      expect(char.classes[0]!.classId).toBe('Fighter');
      expect(char.classes[0]!.level).toBe(1);
      expect(char.hitPoints.current).toBeGreaterThan(0);
    });

    it('should create an Elf Wizard at level 1', () => {
      const char = createCharacter(
        {
          name: 'Elara',
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

      expect(char.name).toBe('Elara');
      // Check per-class spell data
      expect(char.spells.classSpellcasting['Wizard']).toBeDefined();
      expect(Array.isArray(char.spells.classSpellcasting['Wizard']!.knownSpells)).toBe(true);
    });
  });

  describe('Session 1: Combat and Damage', () => {
    let fighter: any;

    beforeEach(() => {
      fighter = createCharacter(
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
    });

    it('should take damage and survive', () => {
      const initialHP = fighter.hitPoints.current;
      const damage = 8;

      const afterDamage = modifyHP(fighter, -damage);
      expect(afterDamage.hitPoints.current).toBe(initialHP - damage);
      expect(afterDamage.hitPoints.current).toBeGreaterThan(0);
    });

    it('should become unconscious at 0 HP', () => {
      const char = modifyHP(fighter, -100);
      expect(char.hitPoints.current).toBe(0);
    });
  });

  describe('Session 2: Short Rest', () => {
    let fighter: any;

    beforeEach(() => {
      fighter = createCharacter(
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

      fighter = modifyHP(fighter, -15);
    });

    it('should recover HP after Short Rest', () => {
      const hpBeforeRest = fighter.hitPoints.current;

      const afterRest = shortRest(fighter, 1, dataLoader);

      expect(afterRest.hitPoints.current).toBeGreaterThan(hpBeforeRest);
    });
  });
});
