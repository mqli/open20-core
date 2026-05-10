import { describe, it, expect } from 'vitest';
import { parseLimitedUsage, getActionLimitedUsage } from '../../src/monster/query';
import type { DataLoader } from '../../src/data/loader';
import type { Monster } from '../../src/monster/types';

describe('R28.12 - Limited Usage', () => {
  describe('parseLimitedUsage', () => {
    it('should parse "Recharge X-Y" usage', () => {
      const result = parseLimitedUsage('Fire Breath (Recharge 5-6)');
      expect(result).toBeDefined();
      expect(result!.type).toBe('recharge');
      expect(result!.rechargeRange).toEqual([5, 6]);
    });

    it('should parse "X/Day" usage', () => {
      const result = parseLimitedUsage('Legendary Resistance (3/Day)');
      expect(result).toBeDefined();
      expect(result!.type).toBe('x_per_day');
      expect(result!.uses).toBe(3);
    });

    it('should parse "X/Day in Lair" usage', () => {
      const result = parseLimitedUsage('Legendary Resistance (4/Day in Lair)');
      expect(result).toBeDefined();
      expect(result!.type).toBe('x_per_day');
      expect(result!.uses).toBe(4);
    });

    it('should parse "Recharge after Long Rest" usage', () => {
      const result = parseLimitedUsage('Action Name', 'Recharge after Long Rest');
      expect(result).toBeDefined();
      expect(result!.type).toBe('recharge_after_rest');
      expect(result!.rechargeOn).toBe('long_rest');
    });

    it('should parse "Recharge after Short Rest" usage', () => {
      const result = parseLimitedUsage('Action Name', 'Recharge after Short Rest');
      expect(result).toBeDefined();
      expect(result!.type).toBe('recharge_after_rest');
      expect(result!.rechargeOn).toBe('short_rest');
    });

    it('should return undefined for no limited usage', () => {
      const result = parseLimitedUsage('Regular Action');
      expect(result).toBeUndefined();
    });
  });

  describe('getActionLimitedUsage', () => {
    const mockMonsters: Monster[] = [
      {
        id: 'adult-red-dragon',
        name: 'Adult Red Dragon',
        source: 'SRD 5.2',
        size: 'Huge',
        type: 'Dragon',
        descriptiveTags: ['Chromatic'],
        alignment: 'chaotic evil',
        armorClass: [{ value: 19, type: 'natural armor' }],
        hitPoints: { value: 256, formula: '19d12 + 133' },
        speed: { walk: 40, climb: 40, fly: 80 },
        initiative: { modifier: 4, score: 14 },
        abilityScores: {
          base: { Strength: 27, Dexterity: 10, Constitution: 25, Intelligence: 16, Wisdom: 13, Charisma: 23 },
          racialBonuses: {},
          featBonuses: {},
          temporaryBonuses: {}
        },
        savingThrows: { Dexterity: 6, Wisdom: 7 },
        skills: { Perception: 13, Stealth: 6 },
        challengeRating: { rating: 17, xp: 18000, lairXp: 20000 },
        resistances: [],
        vulnerabilities: [],
        damageDefenses: { resistances: [], immunities: ['Fire'], vulnerabilities: [] },
        senses: { blindsight: 60, darkvision: 120, passivePerception: 23 },
        languages: ['Common', 'Draconic'],
        spellcasting: [
          {
            ability: 'Charisma',
            saveDC: 20,
            attackBonus: 12,
            ignoresComponents: ['M'],
            atWill: ['Command', 'Detect Magic', 'Scorching Ray'],
            daily: [{ spell: 'Fireball', times: 1 }]
          }
        ],
        conditionImmunities: ['Charmed', 'Frightened', 'Poisoned'],
        traits: [
          {
            name: 'Legendary Resistance (3/Day, or 4/Day in Lair)',
            description: 'If the dragon fails a saving throw, it can choose to succeed instead.'
          }
        ],
        actions: [
          {
            name: 'Multiattack',
            description: 'The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Scorching Ray.'
          },
          {
            name: 'Rend',
            description: 'Melee Attack Roll: +14, reach 10 ft. 13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage.',
            attacks: [
              {
                name: 'Rend',
                attackBonus: 14,
                damageEntries: [
                  { dice: '1d10', type: 'Slashing', bonus: 8 },
                  { dice: '2d4', type: 'Fire', bonus: 0 }
                ],
                damageNotation: { fixedValue: 13, dieExpression: '1d10+8' }
              }
            ]
          },
          {
            name: 'Fire Breath',
            description: '*Dexterity Saving Throw*: DC 21, each creature in a 60-foot Cone. *Failure:* 59 (17d6) Fire damage. *Success:* Half damage.',
            limitedUsage: {
              type: 'recharge',
              rechargeRange: [5, 6]
            },
            savingThrowEffect: {
              saveType: 'Dexterity',
              dc: 21,
              description: 'each creature in a 60-foot Cone',
              onSaveFailure: '59 (17d6) Fire damage.',
              onSaveSuccess: 'Half damage.',
              halfDamageOnSuccess: true
            }
          }
        ],
        reactions: [],
        legendaryActions: [
          {
            name: 'Commanding Presence',
            description: 'The dragon uses Spellcasting to cast Command (level 2 version). The dragon can\'t take this action again until the start of its next turn.'
          },
          {
            name: 'Fiery Rays',
            description: 'The dragon uses Spellcasting to cast Scorching Ray. The dragon can\'t take this action again until the start of its next turn.'
          },
          {
            name: 'Pounce',
            description: 'The dragon moves up to half its Speed, and it makes one Rend attack.'
          }
        ],
        environments: ['mountain'],
        currentHP: 256,
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

    it('should get limited usage from stored field', () => {
      const result = getActionLimitedUsage('adult-red-dragon', 'Fire Breath', mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.type).toBe('recharge');
      expect(result!.rechargeRange).toEqual([5, 6]);
    });

    it('should parse limited usage from action name', () => {
      const result = getActionLimitedUsage('adult-red-dragon', 'Fire Breath', mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.type).toBe('recharge');
      expect(result!.rechargeRange).toEqual([5, 6]);
    });

    it('should return undefined for action without limited usage', () => {
      const result = getActionLimitedUsage('adult-red-dragon', 'Rend', mockDataLoader);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent action', () => {
      const result = getActionLimitedUsage('adult-red-dragon', 'NonExistent', mockDataLoader);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent monster', () => {
      const result = getActionLimitedUsage('non-existent', 'Fire Breath', mockDataLoader);
      expect(result).toBeUndefined();
    });
  });
});
