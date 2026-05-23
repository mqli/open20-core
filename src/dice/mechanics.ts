// dice/mechanics.ts
// Layer 2: Game Mechanics - Stateless pure functions for game rolls
// Uses Layer 1 (dice-core) for all dice operations
// No dependencies on specific entity types (Character, Monster, etc.)

import type { DieType } from '../types/dice';
import type { RollModifier } from './core';
import {
  rollD20WithModifier,
  rollDice,
  rollExpression,
  parseDiceExpression,
  isCriticalHit as detectCrit,
  isCriticalFail as detectCritFail,
  type DiceRollResult,
  type RandomProvider,
} from './core';

// ── Common Types ─────────────────────────────────────────────────

export interface RollResult {
  /** Raw d20 roll (before modifier applied) */
  readonly rawRoll: number;
  /** Roll modifier (advantage/disadvantage) */
  readonly rollModifier: RollModifier;
  /** Total bonus added to raw roll (ability mod + proficiency + etc.) */
  readonly bonus: number;
  /** Final roll total = rawRoll + bonus */
  readonly total: number;
}

export interface CheckResult extends RollResult {
  /** Whether the check succeeded (if DC was provided) */
  readonly success?: boolean;
  /** DC of the check (if applicable) */
  readonly dc?: number;
}

// ── Ability Check / Skill Check ──────────────────────────────────

export interface SkillCheckParams {
  /** The ability modifier value (e.g., +3 for STR) */
  abilityMod: number;
  /** Proficiency bonus (0 if not proficient) */
  proficiencyBonus: number;
  /** Whether the character has expertise in this skill */
  hasExpertise: boolean;
  /** Roll modifier (advantage/disadvantage) */
  rollModifier?: RollModifier;
  /** Optional DC to check against */
  dc?: number;
  /** RNG provider */
  rng: RandomProvider;
}

/**
 * Execute a skill check or ability check
 *
 * @param params - Skill check parameters
 * @returns CheckResult
 *
 * @example
 * // Skill check with proficiency, DC 15
 * const result = rollSkillCheck({
 *   abilityMod: 3,
 *   proficiencyBonus: 2,
 *   hasExpertise: false,
 *   rollModifier: 'none',
 *   dc: 15,
 *   rng: defaultRandom,
 * });
 */
export function rollSkillCheck(params: SkillCheckParams): CheckResult {
  const {
    abilityMod,
    proficiencyBonus,
    hasExpertise,
    rollModifier = 'none',
    dc,
    rng,
  } = params;

  // Calculate bonus
  let bonus = abilityMod;
  if (proficiencyBonus > 0) {
    bonus += hasExpertise ? proficiencyBonus * 2 : proficiencyBonus;
  }

  // Roll d20 with modifier
  const d20Result = rollD20WithModifier(rng, rollModifier);
  const total = d20Result.total + bonus;

  return {
    rawRoll: d20Result.total,
    rollModifier,
    bonus,
    total,
    success: dc !== undefined ? total >= dc : undefined,
    dc,
  };
}

// ── Saving Throw ─────────────────────────────────────────────────

export interface SavingThrowParams {
  /** The ability modifier value */
  abilityMod: number;
  /** Proficiency bonus (0 if not proficient) */
  proficiencyBonus: number;
  /** Whether proficient in this save */
  isProficient: boolean;
  /** Roll modifier (advantage/disadvantage) */
  rollModifier?: RollModifier;
  /** DC to save against */
  dc: number;
  /** RNG provider */
  rng: RandomProvider;
}

/**
 * Execute a saving throw
 *
 * @param params - Saving throw parameters
 * @returns CheckResult with success flag
 *
 * @example
 * const result = rollSavingThrow({
 *   abilityMod: 1,
 *   proficiencyBonus: 2,
 *   isProficient: true,
 *   dc: 14,
 *   rng: defaultRandom,
 * });
 */
export function rollSavingThrow(params: SavingThrowParams): CheckResult {
  const {
    abilityMod,
    proficiencyBonus,
    isProficient,
    rollModifier = 'none',
    dc,
    rng,
  } = params;

  // Calculate bonus
  let bonus = abilityMod;
  if (isProficient) {
    bonus += proficiencyBonus;
  }

  // Roll d20 with modifier
  const d20Result = rollD20WithModifier(rng, rollModifier);
  const total = d20Result.total + bonus;

  return {
    rawRoll: d20Result.total,
    rollModifier,
    bonus,
    total,
    success: total >= dc,
    dc,
  };
}

// ── Attack Roll ──────────────────────────────────────────────────

export interface AttackRollParams {
  /** Attack bonus (proficiency + weapon bonus + etc.) */
  attackBonus: number;
  /** Roll modifier (advantage/disadvantage) */
  rollModifier?: RollModifier;
  /** Optional AC to check against */
  targetAC?: number;
  /** RNG provider */
  rng: RandomProvider;
}

export interface AttackRollResult extends RollResult {
  /** Whether the attack is a critical hit (natural 20) */
  readonly isCritical: boolean;
  /** Whether the attack is a critical fail (natural 1) */
  readonly isCriticalFail: boolean;
  /** Whether the attack hits (if AC was provided) */
  readonly hit?: boolean;
}

/**
 * Execute an attack roll
 *
 * @param params - Attack roll parameters
 * @returns AttackRollResult
 *
 * @example
 * const result = rollAttack({
 *   attackBonus: 5,
 *   rollModifier: 'advantage',
 *   targetAC: 15,
 *   rng: defaultRandom,
 * });
 */
export function rollAttack(params: AttackRollParams): AttackRollResult {
  const {
    attackBonus,
    rollModifier = 'none',
    targetAC,
    rng,
  } = params;

  // Roll d20 with modifier
  const d20Result = rollD20WithModifier(rng, rollModifier);
  const rawRoll = d20Result.total;
  const total = rawRoll + attackBonus;

  const isCritical = detectCrit(rawRoll);
  const isCriticalFail = detectCritFail(rawRoll);

  // Nat 20 always hits, nat 1 always misses (in some house rules)
  let hit: boolean | undefined;
  if (targetAC !== undefined) {
    if (isCritical) {
      hit = true;
    } else if (isCriticalFail) {
      hit = false;
    } else {
      hit = total >= targetAC;
    }
  }

  return {
    rawRoll,
    rollModifier,
    bonus: attackBonus,
    total,
    isCritical,
    isCriticalFail,
    hit,
  };
}

// ── Damage Roll ──────────────────────────────────────────────────

export interface DamageRollEntry {
  /** Dice expression (e.g., "1d6", "2d8") */
  dice: string;
  /** Damage type (e.g., "Slashing", "Fire") */
  type: string;
}

export interface DamageRollParams {
  /** Array of damage entries */
  entries: DamageRollEntry[];
  /** Additional modifiers to apply (ability mod, etc.) */
  modifiers?: readonly { value: number; type: string; description: string }[];
  /** Whether this is a critical hit (double dice) */
  isCritical?: boolean;
  /** RNG provider */
  rng: RandomProvider;
}

export interface DamageEntry {
  /** Damage type */
  type: string;
  /** Die type */
  die: DieType;
  /** Number of dice rolled */
  count: number;
  /** Individual die results */
  results: readonly number[];
  /** Subtotal for this entry */
  subtotal: number;
}

export interface DamageRollResult {
  /** Individual damage entries (for multi-type damage) */
  readonly entries: readonly DamageEntry[];
  /** Modifiers applied to the damage */
  readonly modifiers: readonly { value: number; type: string; description: string }[];
  /** Total damage (dice + modifiers) */
  readonly total: number;
  /** Damage broken down by type */
  readonly typedDamage: Readonly<Record<string, number>>;
}

/**
 * Execute a damage roll
 * Supports multiple damage types and critical hits
 *
 * @param params - Damage roll parameters
 * @returns DamageRollResult
 *
 * @example
 * // Simple damage
 * const result = rollDamage({
 *   entries: [{ dice: "1d6", type: "Slashing" }],
 *   modifiers: [{ value: 3, type: 'ability', description: 'STR mod' }],
 *   rng: defaultRandom,
 * });
 *
 * // Critical hit with multiple damage types
 * const critResult = rollDamage({
 *   entries: [
 *     { dice: "1d8", type: "Piercing" },
 *     { dice: "1d6", type: "Poison" },
 *   ],
 *   isCritical: true,
 *   rng: defaultRandom,
 * });
 */
export function rollDamage(params: DamageRollParams): DamageRollResult {
  const {
    entries: entryParams,
    modifiers = [],
    isCritical = false,
    rng,
  } = params;

  const allEntries: DamageEntry[] = [];
  const typedDamage: Record<string, number> = {};
  let diceTotal = 0;

  // Process each damage entry
  for (const entryParam of entryParams) {
    let diceStr = entryParam.dice;

    // For critical hits, double the dice count (ALL entries, not just the first)
    // D&D 5e: critical hits double ALL damage dice, regardless of source
    if (isCritical) {
      const match = diceStr.match(/^(\d+)d(\d+)$/);
      if (match) {
        const count = parseInt(match[1]!, 10) * 2;
        diceStr = `${count}d${match[2]}`;
      }
    }

    // Parse dice expression
    const expr = parseDiceExpression(diceStr);
    const rollResult = rollExpression(rng, expr);

    // Determine die type (use first term's die)
    const firstTerm = expr.terms[0];
    const die = firstTerm?.die ?? 'd6';

    // Determine count (sum of all dice counts)
    const count = expr.terms.reduce((sum, t) => sum + Math.abs(t.count), 0);

    allEntries.push({
      type: entryParam.type,
      die,
      count,
      results: rollResult.rolls,
      subtotal: rollResult.diceTotal,
    });

    // Add to typed damage
    typedDamage[entryParam.type] = (typedDamage[entryParam.type] ?? 0) + rollResult.diceTotal;
    diceTotal += rollResult.diceTotal;
  }

  // Apply modifiers to typed damage (apply to first entry's type by default)
  for (const mod of modifiers) {
    const firstType = entryParams[0]?.type ?? 'default';
    typedDamage[firstType] = (typedDamage[firstType] ?? 0) + mod.value;
  }

  // Calculate total
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
  const total = diceTotal + modifierTotal;

  return {
    entries: allEntries,
    modifiers,
    total,
    typedDamage,
  };
}

// ── Initiative Roll ──────────────────────────────────────────────

export interface InitiativeRollParams {
  /** Dexterity modifier */
  dexterityMod: number;
  /** Any additional bonuses (e.g., feat) */
  bonus?: number;
  /** Roll modifier (advantage/disadvantage) */
  rollModifier?: RollModifier;
  /** RNG provider */
  rng: RandomProvider;
}

/**
 * Roll initiative
 *
 * @param params - Initiative roll parameters
 * @returns RollResult
 */
export function rollInitiative(params: InitiativeRollParams): RollResult {
  const {
    dexterityMod,
    bonus = 0,
    rollModifier = 'none',
    rng,
  } = params;

  const d20Result = rollD20WithModifier(rng, rollModifier);
  const totalBonus = dexterityMod + bonus;

  return {
    rawRoll: d20Result.total,
    rollModifier,
    bonus: totalBonus,
    total: d20Result.total + totalBonus,
  };
}
