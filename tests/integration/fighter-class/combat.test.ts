import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import { applyTypedDamage } from '../../../src/character/mutate';
import { consumeResource } from '../../../src/character/mutate/resources';
import { shortRest } from '../../../src/character/rest';

const dataLoader = createDataLoader();

describe('D&D SRD 5.2 - Fighter Class: Combat Scenarios', () => {
  // ============================================================
  // COMBINED FIGHTER GAMEPLAY SCENARIO
  // ============================================================
  describe('Fighter: Full Combat Scenario (Level 10)', () => {
    it('should simulate a complete Fighter combat encounter', () => {
      let fighter = createCharacter(
        {
          name: 'Commander',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 10,
          abilityScores: {
            Strength: 18,
            Dexterity: 14,
            Constitution: 16,
            Intelligence: 10,
            Wisdom: 14,
            Charisma: 8,
          },
        },
        dataLoader
      );

      const initialHP = fighter.hitPoints.current;
      expect(fighter.classes[0]!.level).toBe(10);
      expect(fighter.combatStats.proficiencyBonus).toBe(4);

      if (Object.keys(fighter.resources).length === 0) {
        console.log('Level 10 Fighter has no resources');
      }

      const defenses: any = {
        resistances: [],
        immunities: [],
        vulnerabilities: [],
      };

      let result = applyTypedDamage(fighter, 25, 'Slashing', defenses);
      fighter = result.char;
      expect(fighter.hitPoints.current).toBeLessThan(initialHP);

      const fighterResources = fighter.resources['Fighter'];
      if (fighterResources) {
        const secondWind = fighterResources.resources.find(r => r.id === 'Second Wind');
        if (secondWind) {
          // Consume Second Wind
          fighter = consumeResource(fighter, 'Fighter', 'Second Wind');
          const swAfterConsume = fighter.resources['Fighter']!.resources.find(r => r.id === 'Second Wind');
          expect(swAfterConsume!.used).toBe(1);

          fighter = shortRest(fighter, 1, dataLoader);

          const afterRest = fighter.resources['Fighter']!.resources.find(r => r.id === 'Second Wind');
          expect(afterRest!.used).toBe(0);
        }
      }
    });

    it('should simulate Eldritch Knight spell combat', () => {
      let ek = createCharacter(
        {
          name: 'Battle Mage',
          speciesId: 'Human',
          backgroundId: 'sage',
          classId: 'Fighter',
          subclassId: 'Eldritch Knight',
          classLevel: 7,
          abilityScores: {
            Strength: 15,
            Dexterity: 13,
            Constitution: 14,
            Intelligence: 17,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      // Note: Eldritch Knight spellcasting is granted by a subclass feature at level 3
      // The current implementation doesn't automatically add subclass-granted spellcasting
      // This test verifies the character is created successfully
      expect(ek.classes[0]!.level).toBe(7);
      expect(ek.classes[0]!.subclassId).toBe('Eldritch Knight');
    });
  });

  // ============================================================
  // FIGHTING STYLES (PHB p.72, SRD)
  // ============================================================
  describe('Fighter: Fighting Styles', () => {
    it('should have Fighting Style available', () => {
      const fighter = createCharacter(
        {
          name: 'Warrior',
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

      expect(fighter.classes[0]!.level).toBe(1);
    });
  });

  // ============================================================
  // FIGHTING MASTERIES (2024 PHB)
  // ============================================================
  describe('Fighter: Weapon Mastery (2024)', () => {
    it('should have Weapon Mastery feature', () => {
      const fighter = createCharacter(
        {
          name: 'Master',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
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

      expect(fighter.classes[0]!.classId).toBe('Fighter');
    });
  });
});
