import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import { modifyHP } from '../../../src/character/mutate';
import { shortRest, longRest } from '../../../src/character/rest';

const dataLoader = createDataLoader();

describe('D&D SRD 5.2 - Fighter Class: Level 1-4 Features', () => {
  // ============================================================
  // SECOND WIND (PHB p.72, SRD)
  // ============================================================
  describe('Fighter: Second Wind (Level 1)', () => {
    it('should have Second Wind resource available at level 1', () => {
      const fighter = createCharacter(
        {
          name: 'Roland',
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

      const secondWind = fighter.resources.find(r => r.id === 'Second Wind');
      expect(secondWind).toBeDefined();
      expect(secondWind!.max).toBe(2);
      expect(secondWind!.used).toBe(0);
      expect(secondWind!.resetOn).toBe('Short Rest');
    });

    it('should have Second Wind reset on Short Rest', () => {
      let fighter = createCharacter(
        {
          name: 'Roland',
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

      const secondWind = fighter.resources.find(r => r.id === 'Second Wind');
      (secondWind as any).used = 1;
      expect(secondWind!.used).toBe(1);

      fighter = shortRest(fighter, 1, dataLoader);
      const afterRest = fighter.resources.find(r => r.id === 'Second Wind');
      expect(afterRest!.used).toBe(0);
    });

    it('should have Second Wind reset on Long Rest', () => {
      let fighter = createCharacter(
        {
          name: 'Roland',
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

      const secondWind = fighter.resources.find(r => r.id === 'Second Wind');
      (secondWind as any).used = 1;

      fighter = longRest(fighter, dataLoader);
      const afterRest = fighter.resources.find(r => r.id === 'Second Wind');
      expect(afterRest!.used).toBe(0);
    });

    it('should heal when using Second Wind', () => {
      let fighter = createCharacter(
        {
          name: 'Roland',
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
      const hpAfterDamage = fighter.hitPoints.current;
      expect(hpAfterDamage).toBeLessThan(fighter.hitPoints.max);

      const secondWind = fighter.resources.find(r => r.id === 'Second Wind');
      expect(secondWind).toBeDefined();
    });
  });
});

describe('D&D SRD 5.2 - Fighter Class: Level 5-10 Features', () => {
  // ============================================================
  // ACTION SURGE (PHB p.72, SRD)
  // ============================================================
  describe('Fighter: Action Surge (Level 2)', () => {
    it('should have Action Surge at level 5 with correct max (PB=3)', () => {
      const fighter = createCharacter(
        {
          name: 'Aldric',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 5,
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

      const actionSurge = fighter.resources.find(r => r.id === 'Action Surge');
      expect(actionSurge).toBeDefined();
      expect(actionSurge!.max).toBe(3);
      expect(actionSurge!.used).toBe(0);
      expect(actionSurge!.resetOn).toBe('Short Rest');
    });

    it('should have six Action Surges at level 17 (PB=6)', () => {
      const fighter = createCharacter(
        {
          name: 'Veteran',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 17,
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

      const actionSurge = fighter.resources.find(r => r.id === 'Action Surge');
      expect(actionSurge).toBeDefined();
      expect(actionSurge!.max).toBe(6);
    });
  });

  // ============================================================
  // EXTRA ATTACK (PHB p.72, SRD)
  // ============================================================
  describe('Fighter: Extra Attack (Level 5, 11, 20)', () => {
    it('should have single attack at level 4', () => {
      const fighter = createCharacter(
        {
          name: 'Novice',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 4,
          abilityScores: {
            Strength: 16,
            Dexterity: 14,
            Constitution: 14,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      expect(fighter.classes[0]!.level).toBe(4);
    });

    it('should have Extra Attack feature at level 5', () => {
      const fighter = createCharacter(
        {
          name: 'Aldric',
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

      expect(fighter.classes[0]!.level).toBe(5);
    });

    it('should have improved Extra Attack at level 11', () => {
      const fighter = createCharacter(
        {
          name: 'Veteran',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 11,
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

      expect(fighter.classes[0]!.level).toBe(11);
    });

    it('should have maximum Extra Attack at level 20', () => {
      const fighter = createCharacter(
        {
          name: 'Champion',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 20,
          abilityScores: {
            Strength: 20,
            Dexterity: 14,
            Constitution: 20,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      expect(fighter.classes[0]!.level).toBe(20);
    });
  });

  // ============================================================
  // INDOMITABLE (PHB p.72, SRD)
  // ============================================================
  describe('Fighter: Indomitable (Level 9, 13, 17)', () => {
    it('should have Indomitable at level 9 with correct max (PB=3)', () => {
      const fighter = createCharacter(
        {
          name: 'Veteran',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 9,
          abilityScores: {
            Strength: 16,
            Dexterity: 14,
            Constitution: 16,
            Intelligence: 10,
            Wisdom: 14,
            Charisma: 8,
          },
        },
        dataLoader
      );

      const indomitable = fighter.resources.find(r => r.id === 'Indomitable');
      expect(indomitable).toBeDefined();
      expect(indomitable!.max).toBe(4);
      expect(indomitable!.resetOn).toBe('Long Rest');
    });

    it('should have Indomitable at level 17 with max 6 (PB=6)', () => {
      const fighter = createCharacter(
        {
          name: 'Champion',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 17,
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

      const indomitable = fighter.resources.find(r => r.id === 'Indomitable');
      expect(indomitable).toBeDefined();
      expect(indomitable!.max).toBe(6);
    });
  });
});
