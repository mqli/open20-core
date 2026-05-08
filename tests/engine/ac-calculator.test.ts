// tests/engine/ac-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAC } from '../../src/engine/ac-calculator';
import type { AbilityScores } from '../../src/types/ability';
import type { EquipmentItem, Armor } from '../../src/types/equipment';
import type { Feature } from '../../src/types/class';
import type { DataLoader } from '../../src/data/loader';

// ── 测试用默认属性值 ──────────────────────────────────────
const defaultScores: AbilityScores = {
  base: {
    Strength: 15,
    Dexterity: 14,
    Constitution: 14,
    Intelligence: 10,
    Wisdom: 13,
    Charisma: 8,
  },
  racialBonuses: {},
  featBonuses: {},
  temporaryBonuses: {},
};

// ── Mock DataLoader ──────────────────────────────────────
function createMockDataLoader(armorData: Record<string, Armor> = {}): DataLoader {
  return {
    getSpecies: () => undefined,
    getSpeciesSubtype: () => undefined,
    getAllSpecies: () => [],
    getBackground: () => undefined,
    getAllBackgrounds: () => [],
    getClass: () => undefined,
    getAllClasses: () => [],
    getSubclass: () => undefined,
    getSubclassesForClass: () => [],
    getAllSubclasses: () => [],
    getFeat: () => undefined,
    getFeatsByCategory: () => [],
    getAllFeats: () => [],
    getWeapon: () => undefined,
    getAllWeapons: () => [],
    getArmor: (id: string) => armorData[id],
    getAllArmor: () => Object.values(armorData),
    getGearItem: () => undefined,
    getAllGear: () => [],
    getSpell: () => undefined,
    getSpellsByLevel: () => [],
    getAllSpells: () => [],
    getProficiencyBonus: () => 2,
    getHitDieFixedValue: () => 6,
    getSpellSlots: () => ({}),
    getMulticlassSpellSlots: () => ({}),
    getPactMagicSlots: () => ({ slots: 0, slotLevel: 0 }),
    getWeaponMasteryProperties: () => [],
    getConditionNames: () => [],
  } as DataLoader;
}

// ── 标准护甲数据 ──────────────────────────────────────
const LEATHER_ARMOR: Armor = {
  id: 'Leather Armor',
  type: 'armor',
  category: 'Light',
  baseAC: 11,
  dexBonus: true,
  equipped: true,
  weight: 10,
  cost: '10 gp',
};

const CHAIN_MAIL: Armor = {
  id: 'Chain Mail',
  type: 'armor',
  category: 'Heavy',
  baseAC: 16,
  dexBonus: false,
  strengthRequirement: 13,
  stealthDisadvantage: true,
  equipped: true,
  weight: 55,
  cost: '75 gp',
};

const HALF_PLATE: Armor = {
  id: 'Half Plate',
  type: 'armor',
  category: 'Medium',
  baseAC: 15,
  dexBonus: true,
  dexCap: 2,
  stealthDisadvantage: true,
  equipped: true,
  weight: 40,
  cost: '750 gp',
};

const SHIELD: Armor = {
  id: 'Shield',
  type: 'armor',
  category: 'Shield',
  baseAC: 2,
  dexBonus: false,
  equipped: true,
  weight: 6,
  cost: '10 gp',
};

describe('calculateAC', () => {
  const noFeatures: Feature[] = [];

  it('unarmored = 10 + Dex', () => {
    const data = createMockDataLoader();
    // Dex 14 → +2
    expect(calculateAC(defaultScores, [], noFeatures, data)).toBe(12);
  });

  it('light armor = armor AC + Dex', () => {
    const equip: EquipmentItem[] = [
      {
        id: 'Leather Armor',
        name: 'Leather Armor',
        type: 'armor',
        weight: 10,
        cost: '10 gp',
        equipped: true,
      },
    ];
    const data = createMockDataLoader({ 'Leather Armor': LEATHER_ARMOR });
    // 11 + 2(Dex) = 13
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(13);
  });

  it('heavy armor = armor AC only (no Dex)', () => {
    const equip: EquipmentItem[] = [
      {
        id: 'Chain Mail',
        name: 'Chain Mail',
        type: 'armor',
        weight: 55,
        cost: '75 gp',
        equipped: true,
      },
    ];
    const data = createMockDataLoader({ 'Chain Mail': CHAIN_MAIL });
    // 16 (no Dex bonus)
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(16);
  });

  it('medium armor = armor AC + min(Dex, +2)', () => {
    const equip: EquipmentItem[] = [
      {
        id: 'Half Plate',
        name: 'Half Plate',
        type: 'armor',
        weight: 40,
        cost: '750 gp',
        equipped: true,
      },
    ];
    const data = createMockDataLoader({ 'Half Plate': HALF_PLATE });
    // Dex +2, cap +2 → 15 + 2 = 17
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(17);
  });

  it('medium armor caps Dex at +2 even if Dex is higher', () => {
    const highDex: AbilityScores = {
      ...defaultScores,
      base: { ...defaultScores.base, Dexterity: 20 }, // +5
    };
    const equip: EquipmentItem[] = [
      {
        id: 'Half Plate',
        name: 'Half Plate',
        type: 'armor',
        weight: 40,
        cost: '750 gp',
        equipped: true,
      },
    ];
    const data = createMockDataLoader({ 'Half Plate': HALF_PLATE });
    // 15 + min(5, 2) = 17 (not 20)
    expect(calculateAC(highDex, equip, noFeatures, data)).toBe(17);
  });

  it('shield adds +2 to any armor', () => {
    const equip: EquipmentItem[] = [
      {
        id: 'Chain Mail',
        name: 'Chain Mail',
        type: 'armor',
        weight: 55,
        cost: '75 gp',
        equipped: true,
      },
      { id: 'Shield', name: 'Shield', type: 'armor', weight: 6, cost: '10 gp', equipped: true },
    ];
    const data = createMockDataLoader({ 'Chain Mail': CHAIN_MAIL, Shield: SHIELD });
    // 16 + 2 = 18
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(18);
  });

  it('Barbarian Unarmored Defense = 10 + Dex + Con', () => {
    const features: Feature[] = [{ name: 'Unarmored Defense', description: '' }];
    const data = createMockDataLoader();
    // Dex +2, Con +2 → 10 + 2 + 2 = 14
    expect(calculateAC(defaultScores, [], features, data)).toBe(14);
  });

  it('Monk Unarmored Defense = 10 + Dex + Wis', () => {
    const features: Feature[] = [{ name: 'Unarmored Defense (Monk)', description: '' }];
    const data = createMockDataLoader();
    // Dex +2, Wis +1 → 10 + 2 + 1 = 13
    expect(calculateAC(defaultScores, [], features, data)).toBe(13);
  });

  it('Barbarian Unarmored Defense does not stack with armor (takes highest)', () => {
    const features: Feature[] = [{ name: 'Unarmored Defense', description: '' }];
    const equip: EquipmentItem[] = [
      {
        id: 'Chain Mail',
        name: 'Chain Mail',
        type: 'armor',
        weight: 55,
        cost: '75 gp',
        equipped: true,
      },
    ];
    const data = createMockDataLoader({ 'Chain Mail': CHAIN_MAIL });
    // Unarmored: 10+2+2=14, Chain Mail: 16 → takes 16
    expect(calculateAC(defaultScores, equip, features, data)).toBe(16);
  });

  it('unequipped armor does not count', () => {
    const equip: EquipmentItem[] = [
      {
        id: 'Chain Mail',
        name: 'Chain Mail',
        type: 'armor',
        weight: 55,
        cost: '75 gp',
        equipped: false,
      },
    ];
    const data = createMockDataLoader({ 'Chain Mail': CHAIN_MAIL });
    // No armor equipped → falls back to unarmored 10+2=12
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(12);
  });
});
