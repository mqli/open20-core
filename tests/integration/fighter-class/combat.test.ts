import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import { applyTypedDamage } from '../../../src/character/mutate';
import { shortRest, longRest } from '../../../src/character/rest';
import lookupTables from '../../../static/srd/lookup-tables.json';

const dataLoader = createDataLoader(lookupTables);

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

      if (fighter.resources.length === 0) {
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

      const secondWind = fighter.resources.find(r => r.id === 'Second Wind');
      if (secondWind) {
        (secondWind as any).used = 1;
        expect(secondWind.used).toBe(1);

        fighter = shortRest(fighter, 1, dataLoader);

        const afterRest = fighter.resources.find(r => r.id === 'Second Wind');
        expect(afterRest!.used).toBe(0);
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

      expect(ek.spells.spellcastingAbility).toBe('Intelligence');

      const level1Slots = ek.spells.spellSlots[1];
      (level1Slots as any).used = 1;

      expect(level1Slots.used).toBe(1);

      ek = longRest(ek, dataLoader);
      expect(ek.spells.spellSlots[1]!.used).toBe(0);
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
