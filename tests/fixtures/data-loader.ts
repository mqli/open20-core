// tests/fixtures/data-loader.ts
// Shared mock DataLoader factory for tests
// Eliminates ~200 lines of duplication across test files

import type { DataLoader } from '../../src/data/loader';
import type { ContentPack } from '../../src/content/types';
import { createDataLoader } from '../../src/data/loader';
import { MULTICLASS_SLOTS, FULL_CASTER_SLOTS } from './spell-slots';

/**
 * Creates a mock DataLoader with sensible defaults.
 * Only override the methods you need for your test.
 *
 * @param overrides - Partial DataLoader with only the methods you need to mock
 * @returns A complete DataLoader with defaults for all unused methods
 *
 * @example
 * const data = createMockDataLoader({
 *   getSpecies: (id) => speciesMap[id],
 *   getClass: (id) => classMap[id],
 * });
 */
export function createMockDataLoader(overrides: Partial<DataLoader> = {}): DataLoader {
  const defaults: DataLoader = {
    // Species
    getSpecies: () => undefined,
    getSpeciesBySource: () => [],
    getSpeciesSubtype: () => undefined,
    getAllSpecies: () => [],

    // Background
    getBackground: () => undefined,
    getBackgroundsBySource: () => [],
    getAllBackgrounds: () => [],

    // Class
    getClass: () => undefined,
    getClassesBySource: () => [],
    getAllClasses: () => [],
    getSubclass: () => undefined,
    getSubclassesBySource: () => [],
    getSubclassesForClass: () => [],
    getAllSubclasses: () => [],

    // Feats
    getFeat: () => undefined,
    getFeatsBySource: () => [],
    getFeatsByCategory: () => [],
    getAllFeats: () => [],

    // Equipment
    getWeapon: () => undefined,
    getWeaponsBySource: () => [],
    getAllWeapons: () => [],
    getArmor: () => undefined,
    getArmorBySource: () => [],
    getAllArmor: () => [],
    getGearItem: () => undefined,
    getGearBySource: () => [],
    getAllGear: () => [],

    // Spells
    getSpell: () => undefined,
    getSpellsBySource: () => [],
    getSpellsByLevel: () => [],
    getAllSpells: () => [],

    // Content Packs
    registerContentPack: (_source: string | ContentPack) => {},
    unregisterContentPack: (_packId: string) => {},
    getContentPacks: () => [],

    // Monster
    getMonster: () => undefined,
    getMonstersBySource: () => [],
    getAllMonsters: () => [],

    // Lookup tables
    getProficiencyBonus: (level: number) => Math.floor((level - 1) / 4) + 2,
    getHitDieFixedValue: () => 6,
    getSpellSlots: (_classId: string, level: number) => FULL_CASTER_SLOTS[level] ?? {},
    getMulticlassSpellSlots: (totalLevel: number) => MULTICLASS_SLOTS[totalLevel] ?? {},
    getPactMagicSlots: (_level: number) => ({ slots: 0, slotLevel: 0 }),
    getWeaponMasteryProperties: () => [],
    getConditionNames: () => [],
  };

  return { ...defaults, ...overrides } as DataLoader;
}

/**
 * Creates a mock DataLoader with real SRD data for integration tests.
 * Uses the actual lookup tables from static/srd/.
 *
 * @returns A DataLoader backed by real SRD data
 */
export function createSRDDataLoader(): DataLoader {
  return createDataLoader();
}
