import { describe, it, expect } from 'vitest';
import { parseSavingThrowEffect, getActionSavingThrowEffect } from '../../src/monster/query';
import type { DataLoader } from '../../src/data/loader';
import type { Monster } from '../../src/monster/types';

describe('R28.9 - Saving Throw Effect Notation', () => {
  describe('parseSavingThrowEffect', () => {
    it('should parse saving throw effect with failure and success', () => {
      const description = '*Dexterity Saving Throw*: DC 21, each creature in a 60-foot Cone. *Failure:* 59 (17d6) Fire damage. *Success:* Half damage.';
      const result = parseSavingThrowEffect(description);
      expect(result).toBeDefined();
      expect(result!.saveType).toBe('Dexterity');
      expect(result!.dc).toBe(21);
      expect(result!.description).toContain('60-foot Cone');
      expect(result!.onSaveFailure).toContain('59 (17d6) Fire damage');
      expect(result!.onSaveSuccess).toContain('Half damage');
      expect(result!.halfDamageOnSuccess).toBe(true);
    });

    it('should parse saving throw effect without success description', () => {
      const description = '*Strength Saving Throw*: DC 15, each creature in a 10-foot radius. *Failure:* 22 (4d10) Bludgeoning damage.';
      const result = parseSavingThrowEffect(description);
      expect(result).toBeDefined();
      expect(result!.saveType).toBe('Strength');
      expect(result!.dc).toBe(15);
      expect(result!.onSaveFailure).toContain('22 (4d10) Bludgeoning damage');
      expect(result!.onSaveSuccess).toBeUndefined();
    });

    it('should return undefined for description without saving throw', () => {
      const description = 'The dragon makes three attacks.';
      const result = parseSavingThrowEffect(description);
      expect(result).toBeUndefined();
    });

    it('should handle "Saving Throw" without asterisk formatting', () => {
      const description = 'Dexterity Saving Throw: DC 13, each creature in a 20-foot radius. Failure: 10 (3d6) Cold damage. Success: Half damage.';
      const result = parseSavingThrowEffect(description);
      expect(result).toBeDefined();
      expect(result!.saveType).toBe('Dexterity');
      expect(result!.dc).toBe(13);
    });
  });

  describe('getActionSavingThrowEffect', () => {
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
            name: 'Fire Breath',
            description: '*Dexterity Saving Throw*: DC 21, each creature in a 60-foot Cone. *Failure:* 59 (17d6) Fire damage. *Success:* Half damage.',
            savingThrowEffect: {
              saveType: 'Dexterity',
              dc: 21,
              description: 'each creature in a 60-foot Cone',
              onSaveFailure: '59 (17d6) Fire damage.',
              onSaveSuccess: 'Half damage.',
              halfDamageOnSuccess: true
            }
          },
          {
            name: 'Cold Breath',
            description: '*Constitution Saving Throw*: DC 18, each creature in a 30-foot Cone. *Failure:* 36 (8d8) Cold damage. *Success:* Half damage.'
            // No pre-parsed savingThrowEffect
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

    it('should get saving throw effect from stored field', () => {
      const result = getActionSavingThrowEffect('test-dragon', 'Fire Breath', mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.saveType).toBe('Dexterity');
      expect(result!.dc).toBe(21);
      expect(result!.halfDamageOnSuccess).toBe(true);
    });

    it('should parse saving throw effect from description if not stored', () => {
      const result = getActionSavingThrowEffect('test-dragon', 'Cold Breath', mockDataLoader);
      expect(result).toBeDefined();
      expect(result!.saveType).toBe('Constitution');
      expect(result!.dc).toBe(18);
      expect(result!.halfDamageOnSuccess).toBe(true);
    });

    it('should return undefined for non-existent action', () => {
      const result = getActionSavingThrowEffect('test-dragon', 'NonExistent', mockDataLoader);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent monster', () => {
      const result = getActionSavingThrowEffect('non-existent', 'Fire Breath', mockDataLoader);
      expect(result).toBeUndefined();
    });
  });
});
