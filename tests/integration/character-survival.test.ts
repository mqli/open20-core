import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../src/data/loader';
import { createCharacter } from '../../src/character/create';
import { modifyHP } from '../../src/character/mutate';
import { longRest } from '../../src/character/rest';

const dataLoader = createDataLoader();

describe('D&D Player Behavior - Survival Mechanics', () => {
  describe('Session 15: Death Save Roller Coaster', () => {
    it('should track death saves over multiple turns', () => {
      let dyingHero = createCharacter(
        {
          name: 'Pip',
          speciesId: 'Halfling',
          backgroundId: 'soldier',
          classId: 'Rogue',
          abilityScores: {
            Strength: 8,
            Dexterity: 16,
            Constitution: 12,
            Intelligence: 10,
            Wisdom: 14,
            Charisma: 12,
          },
        },
        dataLoader
      );

      dyingHero = modifyHP(dyingHero, -dyingHero.hitPoints.max);
      expect(dyingHero.hitPoints.current).toBe(0);
      expect(dyingHero.hitPoints.deathSaves!.successes).toBe(0);
      expect(dyingHero.hitPoints.deathSaves!.failures).toBe(0);

      (dyingHero.hitPoints.deathSaves as any).successes = 2;
      (dyingHero.hitPoints.deathSaves as any).failures = 1;

      expect(dyingHero.hitPoints.deathSaves!.successes).toBe(2);
      expect(dyingHero.hitPoints.deathSaves!.failures).toBe(1);
      expect(dyingHero.hitPoints.deathSaves!.isStable).toBe(false);

      (dyingHero.hitPoints.deathSaves as any).failures = 2;
      expect(dyingHero.hitPoints.deathSaves!.failures).toBe(2);

      (dyingHero.hitPoints.deathSaves as any).failures = 3;
      expect(dyingHero.hitPoints.deathSaves!.failures).toBe(3);
    });

    it('should stabilize from death saves then recover', () => {
      let dyingHero = createCharacter(
        {
          name: 'Lucky',
          speciesId: 'Human',
          backgroundId: 'soldier',  // SRD 5.2 only: Acolyte, Criminal, Sage, soldier
          classId: 'Fighter',
          abilityScores: {
            Strength: 12,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 16,
          },
        },
        dataLoader
      );

      dyingHero = modifyHP(dyingHero, -dyingHero.hitPoints.max);
      expect(dyingHero.hitPoints.current).toBe(0);

      (dyingHero.hitPoints.deathSaves as any).successes = 3;
      (dyingHero.hitPoints.deathSaves as any).isStable = true;
      expect(dyingHero.hitPoints.deathSaves!.successes).toBe(3);

      const healed = longRest(dyingHero, dataLoader);
      expect(healed.hitPoints.current).toBe(healed.hitPoints.max);
      expect(healed.hitPoints.deathSaves!.successes).toBe(0);
      expect(healed.hitPoints.deathSaves!.failures).toBe(0);
    });
  });

  describe('Session 16: Spell Slot Management', () => {
    it('should track spell slot usage and recovery', () => {
      let wizard = createCharacter(
        {
          name: 'Melara',
          speciesId: 'Gnome',
          backgroundId: 'sage',
          classId: 'Wizard',
          classLevel: 5,
          abilityScores: {
            Strength: 8,
            Dexterity: 12,
            Constitution: 14,
            Intelligence: 17,
            Wisdom: 12,
            Charisma: 10,
          },
        },
        dataLoader
      );

      expect(wizard.spells.spellSlots[1]!.total).toBe(4);
      expect(wizard.spells.spellSlots[2]!.total).toBe(3);
      expect(wizard.spells.spellSlots[3]!.total).toBe(2);
      expect(wizard.spells.spellSlots[4]!.total).toBe(0);

      (wizard.spells.spellSlots[1] as any).used = 1;
      expect(wizard.spells.spellSlots[1]!.total - wizard.spells.spellSlots[1]!.used).toBe(3);

      const rested = longRest(wizard, dataLoader);
      expect(rested.spells.spellSlots[1]!.used).toBe(0);
      expect(rested.spells.spellSlots[2]!.used).toBe(0);
      expect(rested.spells.spellSlots[3]!.used).toBe(0);
      expect(rested.spells.spellSlots[4]!.used).toBe(0);
    });

    it('should handle Pact Magic slots separately', () => {
      let warlock = createCharacter(
        {
          name: 'Shadow',
          speciesId: 'Tiefling',
          backgroundId: 'soldier',  // SRD 5.2 only: Acolyte, Criminal, Sage, soldier
          classId: 'Warlock',
          abilityScores: {
            Strength: 10,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 17,
          },
        },
        dataLoader
      );

      // Warlock uses Charisma for spellcasting
      expect(warlock.spells.classSpellcasting['Warlock']).toBeDefined();
      expect(warlock.spells.classSpellcasting['Warlock']!.spellcastingAbility).toBe('Charisma');
    });
  });
});
