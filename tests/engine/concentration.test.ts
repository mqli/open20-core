// tests/engine/concentration.test.ts
// Concentration tracking and enforcement tests

import { describe, it, expect } from 'vitest';
import {
  isConcentrating,
  getConcentratingSpellId,
  calculateConcentrationDC,
  type ConcentrationCheckResult,
} from '../../src/engine/concentration';

// ── Tests for pure functions (no character creation needed) ──

describe('calculateConcentrationDC', () => {
  it('should return 10 if damage is low (DC 10 > half damage)', () => {
    // 8 damage → half = 4 → DC = 10
    expect(calculateConcentrationDC(8)).toBe(10);
  });

  it('should return 10 if damage is 20 (DC 10 = half damage)', () => {
    // 20 damage → half = 10 → DC = 10
    expect(calculateConcentrationDC(20)).toBe(10);
  });

  it('should return half damage (rounded down) if > 10', () => {
    // 25 damage → half = 12.5 → floor = 12 → DC = 12
    expect(calculateConcentrationDC(25)).toBe(12);
  });

  it('should return higher DC for large damage', () => {
    // 50 damage → half = 25 → DC = 25
    expect(calculateConcentrationDC(50)).toBe(25);
  });

  it('should handle 0 damage', () => {
    expect(calculateConcentrationDC(0)).toBe(10);
  });

  it('should handle 1 damage', () => {
    // 1 damage → half = 0.5 → floor = 0 → DC = 10
    expect(calculateConcentrationDC(1)).toBe(10);
  });
});

// ── Tests for functions that need character objects ──
// These are integration tests that would need proper character creation
// For now, we test the logic with manually constructed objects

describe('isConcentrating', () => {
  it('should return true if character has Concentrating condition', () => {
    const char = {
      conditions: [{ id: 'Concentrating', source: 'bless', appliedAt: '2024-01-01' }],
    } as any;
    expect(isConcentrating(char)).toBe(true);
  });

  it('should return false if character does not have Concentrating condition', () => {
    const char = {
      conditions: [],
    } as any;
    expect(isConcentrating(char)).toBe(false);
  });

  it('should return false if character has other conditions but not Concentrating', () => {
    const char = {
      conditions: [{ id: 'Raging', source: '', appliedAt: '2024-01-01' }],
    } as any;
    expect(isConcentrating(char)).toBe(false);
  });
});

describe('getConcentratingSpellId', () => {
  it('should return spell ID from Concentrating condition source', () => {
    const char = {
      conditions: [{ id: 'Concentrating', source: 'bless', appliedAt: '2024-01-01' }],
    } as any;
    expect(getConcentratingSpellId(char)).toBe('bless');
  });

  it('should return null if not concentrating', () => {
    const char = {
      conditions: [],
    } as any;
    expect(getConcentratingSpellId(char)).toBe(null);
  });

  it('should return null if source is empty', () => {
    const char = {
      conditions: [{ id: 'Concentrating', source: '', appliedAt: '2024-01-01' }],
    } as any;
    expect(getConcentratingSpellId(char)).toBe(null);
  });
});
