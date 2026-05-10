// tests/engine/ac-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAC } from '../../src/engine/ac-calculator';
import type { Feature } from '../../src/types/class';
import { createAbilityScores } from '../fixtures/ability-scores';
import { createMockDataLoader } from '../fixtures/data-loader';
import { LEATHER_ARMOR, CHAIN_MAIL, HALF_PLATE, SHIELD } from '../fixtures/equipment';

// ── Test Data ──────────────────────────────────────

const defaultScores = createAbilityScores({
  Strength: 15,
  Dexterity: 14,
  Constitution: 14,
  Intelligence: 10,
  Wisdom: 13,
  Charisma: 8,
});

// ── Tests ──────────────────────────────────────────

describe('calculateAC', () => {
  const noFeatures: Feature[] = [];

  it('unarmored = 10 + Dex', () => {
    const data = createMockDataLoader();
    // Dex 14 → +2
    expect(calculateAC(defaultScores, [], noFeatures, data)).toBe(12);
  });

  it('light armor = armor AC + Dex', () => {
    const equip = [{ id: 'Leather Armor', name: 'Leather Armor', type: 'armor' as const, weight: 10, cost: '10 gp', equipped: true }];
    const data = createMockDataLoader({ getArmor: (id: string) => (id === 'Leather Armor' ? LEATHER_ARMOR : undefined) });
    // 11 + 2(Dex) = 13
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(13);
  });

  it('heavy armor = armor AC only (no Dex)', () => {
    const equip = [{ id: 'Chain Mail', name: 'Chain Mail', type: 'armor' as const, weight: 55, cost: '75 gp', equipped: true }];
    const data = createMockDataLoader({ getArmor: (id: string) => (id === 'Chain Mail' ? CHAIN_MAIL : undefined) });
    // 16 (no Dex bonus)
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(16);
  });

  it('medium armor = armor AC + min(Dex, +2)', () => {
    const equip = [{ id: 'Half Plate', name: 'Half Plate', type: 'armor' as const, weight: 40, cost: '750 gp', equipped: true }];
    const data = createMockDataLoader({ getArmor: (id: string) => (id === 'Half Plate' ? HALF_PLATE : undefined) });
    // Dex +2, cap +2 → 15 + 2 = 17
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(17);
  });

  it('medium armor caps Dex at +2 even if Dex is higher', () => {
    const highDex = createAbilityScores({
      Strength: 15,
      Dexterity: 20,
      Constitution: 14,
      Intelligence: 10,
      Wisdom: 13,
      Charisma: 8,
    });
    const equip = [{ id: 'Half Plate', name: 'Half Plate', type: 'armor' as const, weight: 40, cost: '750 gp', equipped: true }];
    const data = createMockDataLoader({ getArmor: (id: string) => (id === 'Half Plate' ? HALF_PLATE : undefined) });
    // 15 + min(5, 2) = 17 (not 20)
    expect(calculateAC(highDex, equip, noFeatures, data)).toBe(17);
  });

  it('shield adds +2 to any armor', () => {
    const equip = [
      { id: 'Chain Mail', name: 'Chain Mail', type: 'armor' as const, weight: 55, cost: '75 gp', equipped: true },
      { id: 'Shield', name: 'Shield', type: 'armor' as const, weight: 6, cost: '10 gp', equipped: true },
    ];
    const data = createMockDataLoader({
      getArmor: (id: string) => {
        if (id === 'Chain Mail') return CHAIN_MAIL;
        if (id === 'Shield') return SHIELD;
        return undefined;
      },
    });
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
    const equip = [{ id: 'Chain Mail', name: 'Chain Mail', type: 'armor' as const, weight: 55, cost: '75 gp', equipped: true }];
    const data = createMockDataLoader({ getArmor: (id: string) => (id === 'Chain Mail' ? CHAIN_MAIL : undefined) });
    // Unarmored: 10+2+2=14, Chain Mail: 16 → takes 16
    expect(calculateAC(defaultScores, equip, features, data)).toBe(16);
  });

  it('unequipped armor does not count', () => {
    const equip = [{ id: 'Chain Mail', name: 'Chain Mail', type: 'armor' as const, weight: 55, cost: '75 gp', equipped: false }];
    const data = createMockDataLoader({ getArmor: (id: string) => (id === 'Chain Mail' ? CHAIN_MAIL : undefined) });
    // No armor equipped → falls back to unarmored 10+2=12
    expect(calculateAC(defaultScores, equip, noFeatures, data)).toBe(12);
  });

  // Test: Mage Armor (via conditions)
  it('should apply Mage Armor AC when condition is present', () => {
    const scores = createAbilityScores({ Strength: 10, Dexterity: 16, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 });
    const equip: { id: string; name: string; type: 'armor'; weight: number; cost: string; equipped: boolean }[] = [];
    const features: readonly Feature[] = [];
    const conditions: readonly { source?: string; id?: string }[] = [
      { id: 'mage-armor', source: 'Mage Armor' },
    ];
    const data = createMockDataLoader();

    // Mage Armor: 13 + Dex mod (3) = 16
    expect(calculateAC(scores, equip, features, data, conditions)).toBe(16);
  });

  it('should not apply Mage Armor AC when condition is absent', () => {
    const scores = createAbilityScores({ Strength: 10, Dexterity: 16, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 });
    const equip: { id: string; name: string; type: 'armor'; weight: number; cost: string; equipped: boolean }[] = [];
    const features: readonly Feature[] = [];
    const conditions: readonly { source?: string; id?: string }[] = [];
    const data = createMockDataLoader();

    // No Mage Armor → unarmored 10 + 3 = 13
    expect(calculateAC(scores, equip, features, data, conditions)).toBe(13);
  });
});
