/**
 * Browser Artifact Tests (ESM bundle)
 * These tests verify the browser bundle works correctly in a browser-like environment
 */
import { describe, test, expect } from 'vitest';
import * as Open20Core from '../../dist/open20-core.esm.js';

describe('Browser Artifact Tests (dist/open20-core.esm.js ESM)', () => {
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
    expect(Open20Core.defaultRandom).toBeDefined();
  });

  test('getModifier should work correctly', () => {
    expect(Open20Core.getModifier(10)).toBe(0);
    expect(Open20Core.getModifier(12)).toBe(1);
    expect(Open20Core.getModifier(8)).toBe(-1);
  });

  test('dice rolling should work', () => {
    const result = Open20Core.rollDie(Open20Core.defaultRandom, 'd6');
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(6);

    const total = Open20Core.rollDice(Open20Core.defaultRandom, 'd6', 2);
    expect(total).toBeGreaterThanOrEqual(2);
    expect(total).toBeLessThanOrEqual(12);
  });
});
