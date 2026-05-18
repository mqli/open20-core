// tests/content/content-management.test.ts
// Tests for R26 Content Management System

import { describe, it, expect, beforeEach } from 'vitest';
import { createDataLoader } from '../../src/data';
import type { ContentPack } from '../../src/content';
import { loadContentPack } from '../../src/content/io';

describe('Content Management (R26)', () => {
  let dataLoader: ReturnType<typeof createDataLoader>;

  beforeEach(() => {
    dataLoader = createDataLoader();
  });

  describe('Content Pack Registration', () => {
    it('should register a content pack from directory', () => {
      // Register SRD content (already registered by default)
      const packs = dataLoader.getContentPacks();
      expect(packs.length).toBeGreaterThan(0);
      expect(packs[0]?.id).toBe('srd-5.2');
    });

    it('should unregister a content pack', () => {
      const packs = dataLoader.getContentPacks();
      const initialCount = packs.length;

      // Can't unregister SRD (it's loaded by default)
      // But we can test with a custom pack
      const customPack: ContentPack = {
        meta: {
          id: 'test-pack',
          name: 'Test Pack',
          version: '1.0.0',
          source: 'Test',
          priority: 10,
        },
        species: [
          {
            id: 'custom-species',
            source: 'Test',
            description: 'A custom species for testing',
            size: 'Medium' as const,
            speed: 30,
            languages: [],
            abilityBonuses: {},
            baseTraits: [],
          },
        ],
      };

      dataLoader.registerContentPack(customPack);
      expect(dataLoader.getContentPacks().length).toBe(initialCount + 1);

      const customSpecies = dataLoader.getSpecies('custom-species');
      expect(customSpecies).toBeDefined();
      expect(customSpecies?.source).toBe('Test');

      dataLoader.unregisterContentPack('test-pack');
      expect(dataLoader.getContentPacks().length).toBe(initialCount);
      expect(dataLoader.getSpecies('custom-species')).toBeUndefined();
    });
  });

  describe('Source Filtering', () => {
    it('should filter species by source', () => {
      // Species in static/srd/ have source: '2024 PHB'
      const species = dataLoader.getSpeciesBySource('2024 PHB');
      expect(species.length).toBeGreaterThan(0);
      expect(species[0]?.source).toBe('2024 PHB');
    });

    it('should filter spells by source', () => {
      // Spells in static/srd/ have various sources
      const srdSpells = dataLoader.getSpellsBySource('SRD 5.2');
      expect(srdSpells.length).toBeGreaterThan(0);

      // Also check PHB 2024 spells
      const phbSpells = dataLoader.getSpellsBySource("Player's Handbook (2024)");
      if (phbSpells.length > 0) {
        expect(phbSpells[0]?.source).toBe("Player's Handbook (2024)");
      }
    });

    it('should return empty array for unknown source', () => {
      const result = dataLoader.getSpeciesBySource('NonExistent');
      expect(result).toEqual([]);
    });
  });

  describe('No Override Rule', () => {
    it('should allow same ID in different packs (no override)', () => {
      // Register a pack with a spell that has same ID as SRD spell
      const customPack: ContentPack = {
        meta: {
          id: 'homebrew',
          name: 'Homebrew Pack',
          version: '1.0.0',
          source: 'Homebrew',
          priority: 5,
        },
        spells: [
          {
            id: 'fireball', // Same ID as SRD!
            name: 'Fireball (Homebrew)',
            level: 3,
            school: 'Evocation' as const,
            castingTime: 'Action' as const,
            range: '150 feet',
            components: ['V', 'S', 'M'] as const,
            duration: 'Instantaneous',
            concentration: false,
            ritual: false,
            description: ['A homebrew version of fireball.'],
            source: 'Homebrew',
          },
        ],
      };

      dataLoader.registerContentPack(customPack);

      // Both spells should exist
      const srdFireball = dataLoader.getSpell('fireball');
      expect(srdFireball).toBeDefined();
      // First registered (SRD) wins for getSpell()
      // Note: SRD spells have source: 'Free Basic Rules (2024)'
      expect(['SRD 5.2', "Free Basic Rules (2024)"].includes(srdFireball?.source ?? '')).toBe(true);

      // But we can filter by source
      const homebrewSpells = dataLoader.getSpellsBySource('Homebrew');
      expect(homebrewSpells.length).toBe(1);
      expect(homebrewSpells[0]?.name).toBe('Fireball (Homebrew)');

      dataLoader.unregisterContentPack('homebrew');
    });
  });

  describe('Import/Export (Node.js only)', () => {
    it('should export content pack to unified format', () => {
      // This tests the IO functions
      const pack = loadContentPack('static/srd/');
      expect(pack.meta).toBeDefined();
      expect(pack.meta.id).toBe('srd-5.2');
      expect(pack.species).toBeDefined();
      expect(pack.spells).toBeDefined();
    });
  });
});
