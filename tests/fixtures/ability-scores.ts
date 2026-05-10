// tests/fixtures/ability-scores.ts
// Shared AbilityScores fixtures for tests

import type { AbilityName, AbilityScores } from '../../src/types/ability';

/**
 * Creates AbilityScores with sensible defaults.
 * Only override the abilities you need for your test.
 *
 * NOTE: Returns a mutable object for testing. The properties can be spread to create
 * new objects with modifications (since the type has `readonly`).
 *
 * @param overrides - Partial ability scores (default 10 for all)
 * @returns A complete AbilityScores object
 *
 * @example
 * const scores = createAbilityScores({ Strength: 15, Dexterity: 14 });
 * // → Str 15, Dex 14, others 10
 */
export function createAbilityScores(overrides: Partial<Record<AbilityName, number>> = {}): AbilityScores {
  const base = {
    Strength: 10,
    Dexterity: 10,
    Constitution: 10,
    Intelligence: 10,
    Wisdom: 10,
    Charisma: 10,
    ...overrides,
  };

  return {
    base,
    racialBonuses: {},
    featBonuses: {},
    temporaryBonuses: {},
  } as AbilityScores;
}

/**
 * Creates AbilityScores with racial bonuses.
 * Returns a new object (since properties are readonly).
 *
 * @example
 * const scores = createAbilityScoresWithBonuses({ Wisdom: 14 }, { Wisdom: 2 });
 */
export function createAbilityScoresWithBonuses(
  overrides: Partial<Record<AbilityName, number>> = {},
  racialBonuses: Partial<Record<AbilityName, number>> = {},
  featBonuses: Partial<Record<AbilityName, number>> = {},
  temporaryBonuses: Partial<Record<AbilityName, number>> = {},
): AbilityScores {
  return {
    base: {
      Strength: 10,
      Dexterity: 10,
      Constitution: 10,
      Intelligence: 10,
      Wisdom: 10,
      Charisma: 10,
      ...overrides,
    },
    racialBonuses,
    featBonuses,
    temporaryBonuses,
  } as AbilityScores;
}

/**
 * Creates AbilityScores with explicit base values for Str/Dex/Con only.
 * Int/Wis/Cha default to 10.
 *
 * @param str - Strength score (default 10)
 * @param dex - Dexterity score (default 10)
 * @param con - Constitution score (default 10)
 * @returns A complete AbilityScores object
 *
 * @example
 * const scores = makeScores(15, 14, 13);
 * // → Str 15, Dex 14, Con 13, others 10
 */
export function makeScores(str = 10, dex = 10, con = 10): AbilityScores {
  return createAbilityScores({
    Strength: str,
    Dexterity: dex,
    Constitution: con,
  });
}

// ── Pre-built Standard Scores ──────────────────────────

/** Standard array: Str 15, Dex 14, Con 13, Int 12, Wis 10, Cha 8 */
export const STANDARD_ARRAY: AbilityScores = createAbilityScores({
  Strength: 15,
  Dexterity: 14,
  Constitution: 13,
  Intelligence: 12,
  Wisdom: 10,
  Charisma: 8,
});

/** Fighter-optimized: Str 15, Dex 13, Con 14 */
export const FIGHTER_SCORES: AbilityScores = createAbilityScores({
  Strength: 15,
  Dexterity: 13,
  Constitution: 14,
});

/** Wizard-optimized: Int 15, Dex 14, Con 13 */
export const WIZARD_SCORES: AbilityScores = createAbilityScores({
  Intelligence: 15,
  Dexterity: 14,
  Constitution: 13,
});

/** Rogue-optimized: Dex 15, Int 14, Cha 13 */
export const ROGUE_SCORES: AbilityScores = createAbilityScores({
  Dexterity: 15,
  Intelligence: 14,
  Charisma: 13,
});
