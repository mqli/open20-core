// tests/engine/proficiency-bonus.test.ts
import { describe, it, expect } from 'vitest';
import { getProficiencyBonus } from '../../src/engine/proficiency-bonus';

describe('getProficiencyBonus', () => {
  it('returns +2 for level 1', () => {
    expect(getProficiencyBonus(1)).toBe(2);
  });

  it('returns +2 for level 4', () => {
    expect(getProficiencyBonus(4)).toBe(2);
  });

  it('returns +3 for level 5', () => {
    expect(getProficiencyBonus(5)).toBe(3);
  });

  it('returns +3 for level 8', () => {
    expect(getProficiencyBonus(8)).toBe(3);
  });

  it('returns +4 for level 9', () => {
    expect(getProficiencyBonus(9)).toBe(4);
  });

  it('returns +5 for level 13', () => {
    expect(getProficiencyBonus(13)).toBe(5);
  });

  it('returns +6 for level 17', () => {
    expect(getProficiencyBonus(17)).toBe(6);
  });

  it('returns +6 for level 20', () => {
    expect(getProficiencyBonus(20)).toBe(6);
  });

  // 边界：等级<1时默认+2
  it('returns +2 for level 0 (defensive)', () => {
    expect(getProficiencyBonus(0)).toBe(2);
  });
});
