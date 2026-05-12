/**
 * Artifact tests for Node.js build output
 * These tests verify the built dist/ ESM modules work correctly
 */
import { describe, test, expect } from 'vitest';
import * as Open20Core from '../../dist/index.js';

describe('Node.js Artifact Tests (dist/index.js)', () => {
  test('should export createCharacter', () => {
    expect(Open20Core.createCharacter).toBeDefined();
    expect(typeof Open20Core.createCharacter).toBe('function');
  });

  test('should export engine functions', () => {
    expect(Open20Core.getModifier).toBeDefined();
    expect(Open20Core.getProficiencyBonus).toBeDefined();
    expect(Open20Core.calculateAC).toBeDefined();
  });

  test('should export dice rolling functions', () => {
    expect(Open20Core.rollDie).toBeDefined();
    expect(Open20Core.rollDice).toBeDefined();
    expect(Open20Core.rollAttack).toBeDefined();
    expect(Open20Core.rollCharacterWeaponDamage).toBeDefined();
    expect(Open20Core.rollSpellDamage).toBeDefined();
    expect(Open20Core.defaultRandom).toBeDefined();
  });

  test('should export storage classes', () => {
    expect(Open20Core.InMemoryStorage).toBeDefined();
  });

  test('getModifier should work correctly', () => {
    expect(Open20Core.getModifier(10)).toBe(0);
    expect(Open20Core.getModifier(12)).toBe(1);
    expect(Open20Core.getModifier(8)).toBe(-1);
  });

  test('dice rolling should work with default random', () => {
    const rng = Open20Core.defaultRandom;

    // rollDie(rng, die) returns DiceRollResult object
    const result = Open20Core.rollDie(rng, 'd6');
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeLessThanOrEqual(6);

    // rollDice(rng, die, count) returns DiceRollResult object
    const rollResult = Open20Core.rollDice(rng, 'd6', 2);
    expect(rollResult.total).toBeGreaterThanOrEqual(2);
    expect(rollResult.total).toBeLessThanOrEqual(12);
  });

  test('InMemoryStorage should be instantiable', () => {
    const storage = new Open20Core.InMemoryStorage();
    expect(storage).toBeDefined();
  });
});
