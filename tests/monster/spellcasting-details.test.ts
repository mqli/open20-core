import { describe, it, expect } from 'vitest';
import type { DataLoader } from '../../src/data/loader';
import type { Monster } from '../../src/monster/types';
import type { MonsterSpellcasting } from '../../src/types/monster';

describe('R28.11 - Spellcasting Details', () => {
  describe('MonsterSpellcasting interface', () => {
    it('should have ability field', () => {
      const spellcasting: MonsterSpellcasting = {
        ability: 'Charisma',
        saveDC: 17,
        attackBonus: 9
      };
      expect(spellcasting.ability).toBe('Charisma');
      expect(spellcasting.saveDC).toBe(17);
    });

    it('should have ignoresComponents field', () => {
      const spellcasting: MonsterSpellcasting = {
        ability: 'Charisma',
        saveDC: 17,
        ignoresComponents: ['M']
      };
      expect(spellcasting.ignoresComponents!).toContain('M');
    });

    it('should have atWill field', () => {
      const spellcasting: MonsterSpellcasting = {
        ability: 'Charisma',
        saveDC: 17,
        atWill: ['Command', 'Detect Magic', 'Scorching Ray']
      };
      expect(spellcasting.atWill!).toContain('Command');
      expect(spellcasting.atWill!).toHaveLength(3);
    });

    it('should have daily field', () => {
      const spellcasting: MonsterSpellcasting = {
        ability: 'Charisma',
        saveDC: 17,
        daily: [{ spell: 'Fireball', times: 1 }]
      };
      expect(spellcasting.daily!).toHaveLength(1);
      expect(spellcasting.daily![0]!.spell).toBe('Fireball');
      expect(spellcasting.daily![0]!.times).toBe(1);
    });
  });

  describe('Monster with spellcasting', () => {
    const mockMonsters: Monster[] = [
      {
        id: 'young-red-dragon',
        name: 'Young Red Dragon',
        source: 'SRD 5.2',
        size: 'Large',
        type: 'Dragon',
        descriptiveTags: ['Chromatic'],
        alignment: 'chaotic evil',
        armorClass: [{ value: 18, type: 'natural armor' }],
        hitPoints: { value: 178, formula: '17d10+85' },
        speed: { walk: 40, climb: 40, fly: 80 },
        initiative: { modifier: 0, score: 10 },
        abilityScores: {
          base: { Strength: 23, Dexterity: 10, Constitution: 21, Intelligence: 14, Wisdom: 11, Charisma: 19 },
          racialBonuses: {},
          featBonuses: {},
          temporaryBonuses: {}
        },
        savingThrows: { Dexterity: 4, Wisdom: 4 },
        skills: { Perception: 7, Stealth: 4 },
        challengeRating: { rating: 10, xp: 5900 },
        resistances: [],
        vulnerabilities: [],
        damageDefenses: { resistances: [], immunities: ['Fire'], vulnerabilities: [] },
        senses: { blindsight: 30, darkvision: 120, passivePerception: 17 },
        languages: ['Common', 'Draconic'],
        spellcasting: [
          {
            ability: 'Charisma',
            saveDC: 17,
            attackBonus: 9,
            ignoresComponents: ['M'],
            atWill: ['Command', 'Detect Magic', 'Scorching Ray'],
            daily: [{ spell: 'Fireball', times: 1 }]
          }
        ],
        conditionImmunities: ['Charmed', 'Frightened', 'Poisoned'],
        traits: [],
        actions: [],
        reactions: [],
        legendaryActions: [],
        environments: ['mountain'],
        currentHP: 178,
        temporaryHP: 0
      }
    ];

    const mockDataLoader = {
      getMonster: (id: string) => mockMonsters.find(m => m.id === id),
      getSpell: () => undefined,
      getAllSpells: () => [],
      getClass: () => undefined,
      getAllClasses: () => [],
      getSpecies: () => undefined,
      getAllSpecies: () => [],
      getBackground: () => undefined,
      getAllBackgrounds: () => [],
      getFeat: () => undefined,
      getAllFeats: () => [],
    } as unknown as DataLoader;

    it('should have spellcasting field', () => {
      const monster = mockDataLoader.getMonster('young-red-dragon');
      expect(monster!.spellcasting).toBeDefined();
      expect(monster!.spellcasting!).toHaveLength(1);
    });

    it('should have correct spellcasting ability', () => {
      const monster = mockDataLoader.getMonster('young-red-dragon');
      const spellcasting = monster!.spellcasting![0]!;
      expect(spellcasting.ability).toBe('Charisma');
    });

    it('should have correct save DC', () => {
      const monster = mockDataLoader.getMonster('young-red-dragon');
      const spellcasting = monster!.spellcasting![0]!;
      expect(spellcasting.saveDC).toBe(17);
    });

    it('should ignore Material components', () => {
      const monster = mockDataLoader.getMonster('young-red-dragon');
      const spellcasting = monster!.spellcasting![0]!;
      expect(spellcasting.ignoresComponents).toContain('M');
    });

    it('should have at-will spells', () => {
      const monster = mockDataLoader.getMonster('young-red-dragon');
      const spellcasting = monster!.spellcasting![0]!;
      expect(spellcasting.atWill).toContain('Command');
      expect(spellcasting.atWill).toContain('Detect Magic');
      expect(spellcasting.atWill).toContain('Scorching Ray');
    });

    it('should have daily spells', () => {
      const monster = mockDataLoader.getMonster('young-red-dragon');
      const spellcasting = monster!.spellcasting![0]!;
      expect(spellcasting.daily!).toHaveLength(1);
      expect(spellcasting.daily![0]!.spell).toBe('Fireball');
      expect(spellcasting.daily![0]!.times).toBe(1);
    });
  });
});
