import { describe, it, expect } from 'vitest';
import { parseDamageNotation, getAttackDamageNotation } from '../../src/monster/query';
import type { DataLoader } from '../../src/data/loader';
import type { Monster } from '../../src/monster/types';

describe('R28.10 - Damage Notation', () => {
  describe('parseDamageNotation', () => {
    it('should parse damage notation with fixed value and die expression', () => {
      const description = 'Melee Attack Roll: +14, reach 10 ft. 13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage.';
      const result = parseDamageNotation(description);
      expect(result).toBeDefined();
      expect(result!.fixedValue).toBe(13);
      expect(result!.dieExpression).toBe('1d10+8');
    });

    it('should parse damage notation with only die expression', () => {
      const description = 'Ranged Attack Roll: +5. Hit: 7 (1d6+4) piercing damage.';
      const result = parseDamageNotation(description);
      expect(result).toBeDefined();
      expect(result!.fixedValue).toBe(7);
      expect(result!.dieExpression).toBe('1d6+4');
    });

    it('should parse damage notation with subtraction', () => {
      const description = 'Melee Attack Roll: +3. Hit: 5 (1d8-2) slashing damage.';
      const result = parseDamageNotation(description);
      expect(result).toBeDefined();
      expect(result!.fixedValue).toBe(5);
      expect(result!.dieExpression).toBe('1d8-2');
    });

    it('should return undefined for description without damage notation', () => {
      const description = 'The dragon makes three attacks.';
      const result = parseDamageNotation(description);
      expect(result).toBeUndefined();
    });

    it('should handle multiple damage notations', () => {
      const description = '13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage.';
      const result = parseDamageNotation(description);
      expect(result).toBeDefined();
      expect(result!.fixedValue).toBe(13);
      expect(result!.dieExpression).toBe('1d10+8');
    });
  });

  describe('getAttackDamageNotation', () => {
    const mockMonsters: Monster[] = [
      {
        id: 'test-dragon',
        name: 'Test Dragon',
        source: 'Test',
        size: 'Large',
        type: 'Dragon',
        alignment: 'chaotic evil',
        armorClass: [{ value: 18, type: 'natural armor' }],
        hitPoints: { value: 178, formula: '17d10+85' },
        speed: { walk: 40, fly: 80 },
        abilityScores: {
          base: { Strength: 23, Dexterity: 10, Constitution: 21, Intelligence: 14, Wisdom: 11, Charisma: 19 },
          racialBonuses: {},
          featBonuses: {},
          temporaryBonuses: {}
        },
        challengeRating: { rating: 10, xp: 5900 },
        traits: [],
        actions: [
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
                damageNotation: {
                  fixedValue: 13,
                  dieExpression: '1d10+8'
                }
              }
            ]
          }
        ],
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

    it('should get damage notation from stored field', () => {
      const result = getAttackDamageNotation('test-dragon', 'Rend', undefined, mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.fixedValue).toBe(13);
      expect(result!.dieExpression).toBe('1d10+8');
    });

    it('should get damage notation for specific attack', () => {
      const result = getAttackDamageNotation('test-dragon', 'Rend', 'Rend', mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.fixedValue).toBe(13);
    });

    it('should return undefined for non-existent action', () => {
      const result = getAttackDamageNotation('test-dragon', 'NonExistent', undefined, mockDataLoader);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent monster', () => {
      const result = getAttackDamageNotation('non-existent', 'Rend', undefined, mockDataLoader);
      expect(result).toBeUndefined();
    });
  });
});
