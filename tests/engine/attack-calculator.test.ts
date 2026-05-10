// tests/engine/attack-calculator.test.ts
// Unit tests for calculateAttacks function

import { describe, it, expect } from 'vitest';
import { calculateAttacks } from '../../src/engine/attack-calculator';
import type { Feature, EquipmentItem } from '../../src/types';
import { makeScores } from '../fixtures/ability-scores';
import { createMockDataLoader } from '../fixtures/data-loader';
import { getStandardWeapons } from '../fixtures/equipment';

// ── Mock DataLoader ──────────────────────────────────────

const mockData = createMockDataLoader({
  getWeapon: (id: string) => getStandardWeapons()[id] ?? undefined,
  getAllWeapons: () => Object.values(getStandardWeapons()),
});

// ── Helper Functions ──────────────────────────────────────

function makeEquippedWeapon(id: string): EquipmentItem {
  return {
    id,
    name: id,
    type: 'weapon',
    weight: 3,
    equipped: true,
  };
}

function makeEquippedArmor(id: string): EquipmentItem {
  return {
    id,
    name: id,
    type: 'armor',
    weight: 0,
    equipped: true,
  };
}

// ── Test Suite ──────────────────────────────────────────

describe('calculateAttacks', () => {
  const emptyFeatures: readonly Feature[] = [];
  // All weapon proficiencies for testing (Simple + Martial)
  const allWeaponProficiencies: readonly string[] = ['Simple', 'Martial'];

  // Test 1: No equipped weapons returns empty array
  it('should return empty array when no weapons are equipped', () => {
    const scores = makeScores(10, 10, 10);
    const equipment: EquipmentItem[] = [];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toEqual([]);
  });

  // Test 2: One equipped martial weapon (Longsword, Str 15, PB+3)
  it('should calculate attack bonus correctly for martial weapon (Longsword)', () => {
    const scores = makeScores(15); // Str 15 → mod +2
    const equipment = [makeEquippedWeapon('Longsword')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Longsword');
    expect(result[0]!.attackBonus).toBe(5); // proficiency (3) + Str mod (2)
    expect(result[0]!.damage).toBe('d8(d10)+2'); // versatile damage included
  });

  // Test 3a: Finesse weapon - should use higher of Str/Dex (Dex higher)
  it('should use Dexterity for Finesse weapon when Dex > Str', () => {
    const scores = makeScores(10, 16); // Str 10 (mod 0), Dex 16 (mod +3)
    const equipment = [makeEquippedWeapon('Dagger')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Dagger');
    expect(result[0]!.attackBonus).toBe(6); // proficiency (3) + Dex mod (3)
    expect(result[0]!.damage).toBe('d4+3');
  });

  // Test 3b: Finesse weapon - should use Strength when Str > Dex
  it('should use Strength for Finesse weapon when Str > Dex', () => {
    const scores = makeScores(16, 10); // Str 16 (mod +3), Dex 10 (mod 0)
    const equipment = [makeEquippedWeapon('Dagger')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.attackBonus).toBe(6); // proficiency (3) + Str mod (3)
    expect(result[0]!.damage).toBe('d4+3');
  });

  // Test 4: Ranged weapon (Shortbow) - Dex-based
  it('should use Dexterity for ranged weapon (Shortbow)', () => {
    const scores = makeScores(10, 16); // Dex 16 → mod +3
    const equipment = [makeEquippedWeapon('Shortbow')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Shortbow');
    expect(result[0]!.attackBonus).toBe(6); // proficiency (3) + Dex mod (3)
    expect(result[0]!.damage).toBe('d6+3');
  });

  // Test 5: Two-handed versatile weapon - damage string includes versatile damage
  it('should include versatile damage in damage string for versatile weapons', () => {
    const scores = makeScores(15); // Str 15 → mod +2
    const equipment = [makeEquippedWeapon('Longsword')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    // Versatile weapons show both damage dice: "d8(d10)"
    expect(result[0]!.damage).toBe('d8(d10)+2');
  });

  // Test 5b: Quarterstaff versatile damage
  it('should include versatile damage for Quarterstaff', () => {
    const scores = makeScores(14); // Str 14 → mod +2
    const equipment = [makeEquippedWeapon('Quarterstaff')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.damage).toBe('d6(d8)+2');
  });

  // Test 6: Weapon with mastery - mastery array includes the property
  it('should include weapon mastery in the attack result', () => {
    const scores = makeScores(15);
    const equipment = [makeEquippedWeapon('Longsword')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.mastery).toContain('Topple');
  });

  // Test 6b: Dagger has Nick mastery
  it('should include Nick mastery for Dagger', () => {
    const scores = makeScores(10, 16);
    const equipment = [makeEquippedWeapon('Dagger')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result[0]!.mastery).toContain('Nick');
  });

  // Test 7: Multiple equipped weapons - returns all in array
  it('should return all equipped weapons in the result array', () => {
    const scores = makeScores(15, 14);
    const equipment = [
      makeEquippedWeapon('Longsword'),
      makeEquippedWeapon('Dagger'),
      makeEquippedWeapon('Shortbow'),
    ];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(3);
    expect(result[0]!.name).toBe('Longsword');
    expect(result[1]!.name).toBe('Dagger');
    expect(result[2]!.name).toBe('Shortbow');
  });

  // Test 8: Non-weapon equipment (Armor) should be ignored
  it('should ignore non-weapon equipment like armor', () => {
    const scores = makeScores(15);
    const equipment = [makeEquippedWeapon('Longsword'), makeEquippedArmor('Chain Mail')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Longsword');
  });

  // Test 9: Unequipped weapons should be ignored
  it('should ignore unequipped weapons', () => {
    const scores = makeScores(15);
    const equipment = [
      { ...makeEquippedWeapon('Longsword'), equipped: false },
      makeEquippedWeapon('Dagger'),
    ];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Dagger');
  });

  // Test 10: Damage modifier >= 0 (never negative per 2024 rules)
  it('should ensure damage modifier is never negative (2024 rules)', () => {
    const scores = makeScores(8); // Str 8 → mod -1, but should be 0
    const equipment = [makeEquippedWeapon('Longsword')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    // Damage mod should be max(0, abilityMod) = max(0, -1) = 0
    expect(result[0]!.damage).toBe('d8(d10)+0');
  });

  // Test 10b: Negative Dex mod should also be clamped to 0 for damage
  it('should clamp negative Dex modifier to 0 for damage', () => {
    const scores = makeScores(10, 8); // Dex 8 → mod -1
    const equipment = [makeEquippedWeapon('Shortbow')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.damage).toBe('d6+0');
  });

  // Test 11: Attack name matches weapon id
  it('should set attack name to match weapon id', () => {
    const scores = makeScores(15);
    const equipment = [makeEquippedWeapon('Longsword')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result[0]!.name).toBe('Longsword');
  });

  // Test 11b: Dagger name matches
  it('should set attack name correctly for Dagger', () => {
    const scores = makeScores(10, 16);
    const equipment = [makeEquippedWeapon('Dagger')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result[0]!.name).toBe('Dagger');
  });

  // Additional Test: Unknown weapon id should be filtered out
  it('should filter out weapons with unknown ids (getWeapon returns undefined)', () => {
    const scores = makeScores(15);
    const equipment = [makeEquippedWeapon('Longsword'), makeEquippedWeapon('UnknownWeapon')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Longsword');
  });

  // Additional Test: Attack bonus with different proficiency bonuses
  it('should calculate attack bonus with different proficiency bonuses', () => {
    const scores = makeScores(16); // Str 16 → mod +3
    const equipment = [makeEquippedWeapon('Longsword')];

    // Test with PB +2
    const result1 = calculateAttacks(scores, equipment, 2, emptyFeatures, mockData, allWeaponProficiencies);
    expect(result1).toHaveLength(1);
    expect(result1[0]!.attackBonus).toBe(5); // 2 + 3

    // Test with PB +4
    const result2 = calculateAttacks(scores, equipment, 4, emptyFeatures, mockData, allWeaponProficiencies);
    expect(result2[0]!.attackBonus).toBe(7); // 4 + 3
  });

  // Additional Test: Quarterstaff versatile damage
  it('should handle Quarterstaff versatile damage correctly', () => {
    const scores = makeScores(14); // Str 14 → mod +2
    const equipment = [makeEquippedWeapon('Quarterstaff')];
    const result = calculateAttacks(scores, equipment, 3, emptyFeatures, mockData, allWeaponProficiencies);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Quarterstaff');
    expect(result[0]!.attackBonus).toBe(5); // 3 + 2
    expect(result[0]!.damage).toBe('d6(d8)+2');
    expect(result[0]!.mastery).toContain('Sap');
  });
});
