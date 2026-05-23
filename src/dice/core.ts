// dice/core.ts
// Layer 1: Core Dice Engine - Pure dice rolling functions
// No game logic, no dependencies on characters/monsters/spells
// Implements R22

// ── Random Provider ───────────────────────────────────────────────

/**
 * Random number provider - allows deterministic testing
 * Implement this interface to control randomness in tests
 */
export interface RandomProvider {
  roll(min: number, max: number): number; // [min, max] inclusive
}

/**
 * Default random provider using Math.random
 */
export const defaultRandom: RandomProvider = {
  roll: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
};

/**
 * Create a deterministic random provider for testing
 * @param sequence - Array of values to return in order
 */
export function createDeterministicRNG(sequence: number[]): RandomProvider {
  let index = 0;
  return {
    roll: (_min, _max) => {
      if (index >= sequence.length) {
        throw new Error('DeterministicRNG: sequence exhausted');
      }
      return sequence[index++]!;
    },
  };
}

// ── Die Types ──────────────────────────────────────────────────────

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

const DIE_SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

// ── Dice Roll Result ──────────────────────────────────────────────

/**
 * Result of a dice roll operation
 * Unified type used by all dice operations
 */
export interface DiceRollResult {
  /** Individual die results */
  readonly rolls: readonly number[];
  /** Sum of all dice rolled */
  readonly diceTotal: number;
  /** Modifier added to the roll (e.g., ability mod, proficiency) */
  readonly modifier: number;
  /** Final total = diceTotal + modifier */
  readonly total: number;
}

/**
 * Create a DiceRollResult
 */
function createResult(rolls: number[], modifier: number = 0): DiceRollResult {
  const diceTotal = rolls.reduce((sum, r) => sum + r, 0);
  return {
    rolls,
    diceTotal,
    modifier,
    total: diceTotal + modifier,
  };
}

// ── Basic Dice Operations ─────────────────────────────────────────

/**
 * Roll a single die of the given type
 * @param rng - Random provider
 * @param die - Die type (d4, d6, etc.)
 * @returns DiceRollResult with single roll
 */
export function rollDie(rng: RandomProvider, die: DieType): DiceRollResult {
  const sides = DIE_SIDES[die];
  const roll = rng.roll(1, sides);
  return createResult([roll]);
}

/**
 * Roll multiple dice of the same type
 * @param rng - Random provider
 * @param die - Die type
 * @param count - Number of dice to roll
 * @returns DiceRollResult with all rolls
 */
export function rollDice(rng: RandomProvider, die: DieType, count: number): DiceRollResult {
  const sides = DIE_SIDES[die];
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rng.roll(1, sides));
  }
  return createResult(rolls);
}

/**
 * Roll with advantage - roll twice, take higher
 */
export function rollWithAdvantage(rng: RandomProvider, die: DieType): DiceRollResult {
  const result = rollDie(rng, die);
  const secondRoll = rollDie(rng, die);
  const finalRoll = Math.max(result.rolls[0]!, secondRoll.rolls[0]!);
  return createResult([finalRoll], 0);
}

/**
 * Roll with disadvantage - roll twice, take lower
 */
export function rollWithDisadvantage(rng: RandomProvider, die: DieType): DiceRollResult {
  const result = rollDie(rng, die);
  const secondRoll = rollDie(rng, die);
  const finalRoll = Math.min(result.rolls[0]!, secondRoll.rolls[0]!);
  return createResult([finalRoll], 0);
}

// ── Advantage/Disadvantage Modifier ───────────────────────────────

export type RollModifier = 'none' | 'advantage' | 'disadvantage';

/**
 * Apply advantage/disadvantage to a d20 roll
 * Centralizes the advantage/disadvantage logic that was duplicated
 * @param rng - Random provider
 * @param modifier - Roll modifier
 * @returns DiceRollResult with the final d20 roll
 */
export function rollD20WithModifier(rng: RandomProvider, modifier: RollModifier): DiceRollResult {
  switch (modifier) {
    case 'advantage':
      return rollWithAdvantage(rng, 'd20');
    case 'disadvantage':
      return rollWithDisadvantage(rng, 'd20');
    case 'none':
    default:
      return rollDie(rng, 'd20');
  }
}

// ── Dice Expression Parsing ──────────────────────────────────────

/**
 * A single term in a dice expression
 */
export interface DiceTerm {
  /** Number of dice (0 for flat modifiers) */
  count: number;
  /** Die type (undefined for flat modifiers) */
  die?: DieType;
  /** Flat modifier value (positive or negative) */
  modifier: number;
}

/**
 * Parsed dice expression
 */
export interface DiceExpression {
  /** Individual terms in the expression */
  readonly terms: readonly DiceTerm[];
  /** String representation (for debugging) */
  readonly expression: string;
}

/**
 * Parse a dice expression string into structured data
 * Supports formats: "1d6", "2d8+3", "1d6+1d8", "d6" (assumes 1)
 *
 * @param expr - Dice expression string
 * @returns Parsed DiceExpression
 *
 * @example
 * parseDiceExpression("1d6")      // { terms: [{ count: 1, die: 'd6', modifier: 0 }] }
 * parseDiceExpression("2d8+3")    // { terms: [{ count: 2, die: 'd8', modifier: 0 }, { count: 0, modifier: 3 }] }
 * parseDiceExpression("1d6+1d8")  // Multiple dice terms
 */
export function parseDiceExpression(expr: string): DiceExpression {
  const terms: DiceTerm[] = [];
  const normalized = expr.replace(/\s/g, '');

  // Match all terms: optional number, 'd', sides, optional +/-, optional modifier
  // Handles: 1d6, d6, 2d8+3, 1d6+1d8, -1d6
  const termRegex = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/gi;
  let match: RegExpExecArray | null;

  while ((match = termRegex.exec(normalized)) !== null) {
    if (match[2] !== undefined) {
      // Dice term: e.g., "1d6", "d6", "2d8"
      const sign = match[1] === '-' ? -1 : 1;
      const count = match[2] ? parseInt(match[2], 10) : 1;
      const sides = parseInt(match[3]!, 10);
      const die = `d${sides}` as DieType;

      if (DIE_SIDES[die] !== undefined) {
        terms.push({
          count: sign * count,
          die,
          modifier: 0,
        });
      }
    } else {
      // Flat modifier: e.g., "+3", "-2"
      const sign = match[4] === '-' ? -1 : 1;
      const value = parseInt(match[5]!, 10);
      terms.push({
        count: 0,
        modifier: sign * value,
      });
    }
  }

  return {
    terms,
    expression: expr,
  };
}

/**
 * Roll a parsed dice expression
 * @param rng - Random provider
 * @param expr - Parsed DiceExpression
 * @returns DiceRollResult
 *
 * @example
 * const expr = parseDiceExpression("2d6+3");
 * const result = rollExpression(defaultRandom, expr);
 * // result.rolls = [3, 5] (individual dice)
 * // result.diceTotal = 8
 * // result.modifier = 3
 * // result.total = 11
 */
export function rollExpression(rng: RandomProvider, expr: DiceExpression): DiceRollResult {
  const allRolls: number[] = [];
  let modifier = 0;

  for (const term of expr.terms) {
    if (term.count !== 0 && term.die) {
      // Dice term (positive or negative count)
      const sides = DIE_SIDES[term.die];
      const sign = term.count > 0 ? 1 : -1;
      for (let i = 0; i < Math.abs(term.count); i++) {
        const roll = rng.roll(1, sides);
        allRolls.push(sign * roll);
      }
    }

    // Add flat modifier
    modifier += term.modifier;
  }

  return createResult(allRolls, modifier);
}

/**
 * Convenience function: parse and roll a dice expression string
 */
export function rollDiceExpression(rng: RandomProvider, expr: string): DiceRollResult {
  const parsed = parseDiceExpression(expr);
  return rollExpression(rng, parsed);
}

// ── Critical Hit/Fail Detection ──────────────────────────────────

/**
 * Check if a d20 roll is a critical hit (natural 20)
 */
export function isCriticalHit(d20Result: number): boolean {
  return d20Result === 20;
}

/**
 * Check if a d20 roll is a critical fail (natural 1)
 */
export function isCriticalFail(d20Result: number): boolean {
  return d20Result === 1;
}
