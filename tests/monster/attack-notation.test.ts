import { describe, it, expect } from 'vitest';
import { parseAttackNotation, getActionAttackNotation } from '../../src/monster/query';
import type { DataLoader } from '../../src/data/loader';
import type { Monster } from '../../src/monster/types';

describe('R28.8 - Attack Notation', () => {
  describe('parseAttackNotation', () => {
    it('should parse "Hit:" notation', () => {
      const description = 'Melee Attack Roll: +5. Hit: 7 (1d6+4) piercing damage.';
      const result = parseAttackNotation(description);
      expect(result).toBeDefined();
      expect(result!.hit).toBe('7 (1d6+4) piercing damage.');
      expect(result!.miss).toBeUndefined();
      expect(result!.hitOrMiss).toBeUndefined();
    });

    it('should parse "Miss:" notation', () => {
      const description = 'Melee Attack Roll: +5. Hit: 7 (1d6+4) piercing damage. Miss: The attacker takes 1d4 psychic damage.';
      const result = parseAttackNotation(description);
      expect(result).toBeDefined();
      expect(result!.hit).toBe('7 (1d6+4) piercing damage.');
      expect(result!.miss).toBe('The attacker takes 1d4 psychic damage.');
    });

    it('should parse "Hit or Miss:" notation', () => {
      const description = 'Ranged Attack Roll: +4. Hit: 5 (1d6+2) fire damage. Hit or Miss: The target bursts into flames.';
      const result = parseAttackNotation(description);
      expect(result).toBeDefined();
      expect(result!.hit).toBe('5 (1d6+2) fire damage.');
      expect(result!.hitOrMiss).toBe('The target bursts into flames.');
    });

    it('should return undefined for description without notation', () => {
      const description = 'The dragon makes three attacks.';
      const result = parseAttackNotation(description);
      expect(result).toBeUndefined();
    });

    it('should handle description with only "Hit:"', () => {
      const description = 'Melee Attack Roll: +14, reach 10 ft. Hit: 13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage.';
      const result = parseAttackNotation(description);
      expect(result).toBeDefined();
      expect(result!.hit).toContain('13 (1d10 + 8) Slashing damage');
      expect(result!.miss).toBeUndefined();
    });
  });

  describe('getActionAttackNotation', () => {
    const mockMonsters: Monster[] = [
      {
        id: 'test-monster',
        name: 'Test Monster',
        source: 'Test',
        size: 'Medium',
        type: 'Humanoid',
        alignment: 'neutral',
        armorClass: [{ value: 15, type: 'natural armor' }],
        hitPoints: { value: 30, formula: '4d8+4' },
        speed: { walk: 30 },
        abilityScores: {
          base: { Strength: 15, Dexterity: 14, Constitution: 12, Intelligence: 10, Wisdom: 11, Charisma: 10 },
          racialBonuses: {},
          featBonuses: {},
          temporaryBonuses: {}
        },
        challengeRating: { rating: 2, xp: 450 },
        traits: [],
        actions: [
          {
            name: 'Shortsword',
            description: 'Melee Attack Roll: +5. Hit: 7 (1d6+4) piercing damage.',
            attacks: [
              {
                name: 'Shortsword',
                attackBonus: 5,
                damageEntries: [{ dice: '1d6', type: 'Piercing', bonus: 4 }]
              }
            ]
          },
          {
            name: 'Fire Bolt',
            description: 'Ranged Attack Roll: +4. Hit: 11 (2d6+4) fire damage. Miss: The attacker takes 1d4 fire damage.',
            attacks: [
              {
                name: 'Fire Bolt',
                attackBonus: 4,
                damageEntries: [{ dice: '2d6', type: 'Fire', bonus: 4 }]
              }
            ],
            attackNotation: {
              hit: '11 (2d6+4) fire damage.',
              miss: 'The attacker takes 1d4 fire damage.'
            }
          }
        ],
        reactions: [],
        legendaryActions: [],
        environments: ['forest'],
        currentHP: 30,
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

    it('should get attack notation from stored field', () => {
      const result = getActionAttackNotation('test-monster', 'Fire Bolt', mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.hit).toBe('11 (2d6+4) fire damage.');
      expect(result!.miss).toBe('The attacker takes 1d4 fire damage.');
    });

    it('should parse attack notation from description if not stored', () => {
      const result = getActionAttackNotation('test-monster', 'Shortsword', mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.hit).toBe('7 (1d6+4) piercing damage.');
    });

    it('should return undefined for non-existent action', () => {
      const result = getActionAttackNotation('test-monster', 'NonExistent', mockDataLoader);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent monster', () => {
      const result = getActionAttackNotation('non-existent', 'Shortsword', mockDataLoader);
      expect(result).toBeUndefined();
    });
  });
});
