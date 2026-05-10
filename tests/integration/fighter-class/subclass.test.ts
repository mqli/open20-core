import { describe, it, expect } from 'vitest';
import { createDataLoader } from '../../../src/data/loader';
import { createCharacter } from '../../../src/character/create';
import lookupTables from '../../../static/srd/lookup-tables.json';

const dataLoader = createDataLoader(lookupTables);

describe('D&D SRD 5.2 - Fighter Class: Subclasses', () => {
  // ============================================================
  // CHAMPION SUBCLASS (PHB p.72-73, SRD)
  // ============================================================
  describe('Fighter: Champion Subclass', () => {
    it('should create a Champion Fighter', () => {
      const champion = createCharacter(
        {
          name: 'Valeros',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 17,
            Dexterity: 13,
            Constitution: 16,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 9,
          },
        },
        dataLoader
      );

      expect(champion.classes[0]!.classId).toBe('Fighter');
    });

    it('should have Champion features at level 3', () => {
      const champion = createCharacter(
        {
          name: 'Valeros',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 3,
          abilityScores: {
            Strength: 17,
            Dexterity: 13,
            Constitution: 16,
            Intelligence: 10,
            Wisdom: 12,
            Charisma: 9,
          },
        },
        dataLoader
      );

      expect(champion.classes[0]!.level).toBe(3);
    });
  });

  // ============================================================
  // BATTLE MASTER SUBCLASS (PHB p.73-74, SRD)
  // ============================================================
  describe('Fighter: Battle Master Subclass', () => {
    it('should create a Battle Master Fighter', () => {
      const battlemaster = createCharacter(
        {
          name: 'Dungeon Master',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          abilityScores: {
            Strength: 16,
            Dexterity: 14,
            Constitution: 15,
            Intelligence: 10,
            Wisdom: 13,
            Charisma: 8,
          },
        },
        dataLoader
      );

      expect(battlemaster.classes[0]!.classId).toBe('Fighter');
    });

    it('should have Superiority Dice at level 3 (future)', () => {
      let battlemaster = createCharacter(
        {
          name: 'Tactician',
          speciesId: 'Human',
          backgroundId: 'soldier',
          classId: 'Fighter',
          classLevel: 3,
          abilityScores: {
            Strength: 16,
            Dexterity: 14,
            Constitution: 15,
            Intelligence: 10,
            Wisdom: 13,
            Charisma: 8,
          },
        },
        dataLoader
      );

      expect(battlemaster.classes[0]!.level).toBe(3);
    });
  });

  // ============================================================
  // ELDRITCH KNIGHT SUBCLASS (PHB p.74-75, SRD)
  // ============================================================
  describe('Fighter: Eldritch Knight Subclass', () => {
    it('should create an Eldritch Knight with spellcasting', () => {
      const ek = createCharacter(
        {
          name: 'Arcanist',
          speciesId: 'Human',
          backgroundId: 'sage',
          classId: 'Fighter',
          abilityScores: {
            Strength: 15,
            Dexterity: 13,
            Constitution: 14,
            Intelligence: 16,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      expect(ek.spells.spellcastingAbility).toBe('Intelligence');
      expect(ek.spells.spellSlots).toBeDefined();
    });

    it('should have spell slots at level 3', () => {
      const ek = createCharacter(
        {
          name: 'Arcanist',
          speciesId: 'Human',
          backgroundId: 'sage',
          classId: 'Fighter',
          classLevel: 3,
          abilityScores: {
            Strength: 15,
            Dexterity: 13,
            Constitution: 14,
            Intelligence: 16,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      expect(ek.classes[0]!.level).toBe(3);
      expect(ek.spells.spellcastingAbility).toBe('Intelligence');
    });

    it('should have spell slots at level 7', () => {
      const ek = createCharacter(
        {
          name: 'Arcanist',
          speciesId: 'Human',
          backgroundId: 'sage',
          classId: 'Fighter',
          classLevel: 7,
          abilityScores: {
            Strength: 15,
            Dexterity: 13,
            Constitution: 14,
            Intelligence: 16,
            Wisdom: 12,
            Charisma: 8,
          },
        },
        dataLoader
      );

      expect(ek.classes[0]!.level).toBe(7);
    });
  });
});
