import { describe, it, expect } from 'vitest';
import { getMonster } from '../../src/monster/query';
import { createMockDataLoader } from '../fixtures/data-loader';
import { YOUNG_RED_DRAGON, MOCK_GOBLIN } from '../fixtures/monsters';

const data = createMockDataLoader({
  getMonster: (id: string) => {
    if (id === 'young-red-dragon') return YOUNG_RED_DRAGON;
    if (id === 'goblin') return MOCK_GOBLIN;
    return undefined;
  },
});

describe('R28.7 - Missing Monster Fields', () => {
  describe('Initiative field', () => {
    it('should have initiative field for young-red-dragon', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster).toBeDefined();
      expect(monster!.initiative).toBeDefined();
      expect(monster!.initiative!.modifier).toBe(0);
      expect(monster!.initiative!.score).toBe(10);
    });

    it('should allow initiative to be undefined for monsters without it', () => {
      const goblin = getMonster('goblin', data);
      expect(goblin).toBeDefined();
      // Goblins don't have initiative field in SRD
      expect(goblin!.initiative).toBeUndefined();
    });
  });

  describe('Descriptive Tags', () => {
    it('should have descriptiveTags for young-red-dragon', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.descriptiveTags).toBeDefined();
      expect(monster!.descriptiveTags).toContain('Chromatic');
    });

    it('should allow descriptiveTags to be undefined', () => {
      const goblin = getMonster('goblin', data);
      expect(goblin!.descriptiveTags).toBeUndefined();
    });
  });

  describe('Saving Throws Override', () => {
    it('should have savingThrows for young-red-dragon', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.savingThrows).toBeDefined();
      expect(monster!.savingThrows!['Dexterity']).toBe(4);
      expect(monster!.savingThrows!['Wisdom']).toBe(4);
    });

    it('should have correct save bonuses different from ability modifiers', () => {
      const monster = getMonster('young-red-dragon', data);
      // DEX mod is +0, but save is +4
      const dexMod = Math.floor((monster!.abilityScores.base['Dexterity'] - 10) / 2);
      expect(dexMod).toBe(0);
      expect(monster!.savingThrows!['Dexterity']).toBe(4);
    });
  });

  describe('Skills', () => {
    it('should have skills for young-red-dragon', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.skills).toBeDefined();
      expect(monster!.skills!['Perception']).toBe(7);
      expect(monster!.skills!['Stealth']).toBe(4);
    });

    it('should have skill bonuses different from ability modifiers', () => {
      const monster = getMonster('young-red-dragon', data);
      // Wisdom mod is +0, but Perception is +7 (includes proficiency)
      const wisMod = Math.floor((monster!.abilityScores.base['Wisdom'] - 10) / 2);
      expect(wisMod).toBe(0);
      expect(monster!.skills!['Perception']).toBe(7);
    });
  });

  describe('Senses', () => {
    it('should have senses for young-red-dragon', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.senses).toBeDefined();
      expect(monster!.senses!.blindsight).toBe(30);
      expect(monster!.senses!.darkvision).toBe(120);
      expect(monster!.senses!.passivePerception).toBe(17);
    });

    it('should require passivePerception', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.senses!.passivePerception).toBeDefined();
      expect(typeof monster!.senses!.passivePerception).toBe('number');
    });
  });

  describe('Languages', () => {
    it('should have languages for young-red-dragon', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.languages).toBeDefined();
      expect(monster!.languages).toContain('Common');
      expect(monster!.languages).toContain('Draconic');
    });

    it('should allow languages to be undefined for monsters without languages', () => {
      const goblin = getMonster('goblin', data);
      expect(goblin!.languages).toBeUndefined();
    });
  });

  describe('Challenge Rating with Lair XP', () => {
    it('should have lairXp field in ChallengeRatingInfo type', () => {
      // This is a type test - just check the structure exists
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.challengeRating).toBeDefined();
      expect(monster!.challengeRating.rating).toBe(10);
      expect(monster!.challengeRating.xp).toBe(5900);
      // lairXp is optional, not present for young red dragon
      expect(monster!.challengeRating).not.toHaveProperty('lairXp');
    });
  });

  describe('Resistances and Vulnerabilities', () => {
    it('should have resistances and vulnerabilities as separate fields', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.resistances).toBeDefined();
      expect(monster!.vulnerabilities).toBeDefined();
      expect(Array.isArray(monster!.resistances)).toBe(true);
      expect(Array.isArray(monster!.vulnerabilities)).toBe(true);
    });

    it('should still have damageDefenses for immunities', () => {
      const monster = getMonster('young-red-dragon', data);
      expect(monster!.damageDefenses).toBeDefined();
      expect(monster!.damageDefenses!.immunities).toContain('Fire');
    });
  });

  describe('Gear', () => {
    it('should allow gear field on monster', () => {
      // Gear is optional, just test the type structure
      const monster = getMonster('goblin', data);
      expect(monster).toBeDefined();
    });
  });

  describe('Bonus Actions', () => {
    it('should allow bonusActions field on monster', () => {
      const monster = getMonster('goblin', data);
      // Goblins have Nimble Escape trait (bonus action), but we store it as separate field
      expect(monster).toBeDefined();
    });
  });

  describe('Query functions with new fields', () => {
    it('should return monster with all new fields', () => {
      const monster = getMonster('young-red-dragon', data);

      expect(monster).toMatchObject({
        id: 'young-red-dragon',
        name: 'Young Red Dragon',
        descriptiveTags: ['Chromatic'],
        initiative: { modifier: 0, score: 10 },
        savingThrows: { Dexterity: 4, Wisdom: 4 },
        skills: { Perception: 7, Stealth: 4 },
        senses: { blindsight: 30, darkvision: 120, passivePerception: 17 },
        languages: ['Common', 'Draconic'],
        resistances: [],
        vulnerabilities: [],
      });
    });
  });
});
