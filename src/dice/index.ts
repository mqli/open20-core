// dice/index.ts
// Dice rolling system - Layered Architecture
// This file re-exports from Layer 1 (core) and Layer 2 (mechanics) only.
// Layer 4 functions have been moved to src/rolls/

// ── Re-exports from layered architecture ────────────────────────

// Layer 1: Core Dice Engine
export {
  type RandomProvider,
  defaultRandom,
  createDeterministicRNG,
  type DieType,
  type DiceRollResult,
  rollDie,
  rollDice,
  rollWithAdvantage,
  rollWithDisadvantage,
  type RollModifier,
  rollD20WithModifier,
  type DiceTerm,
  type DiceExpression,
  parseDiceExpression,
  rollExpression,
  rollDiceExpression,
  isCriticalHit,
  isCriticalFail,
} from './core';

// Layer 2: Game Mechanics
export {
  type RollResult,
  type CheckResult,
  type SkillCheckParams,
  type SavingThrowParams,
  type AttackRollParams,
  type AttackRollResult,
  type DamageRollParams,
  type DamageEntry,
  type DamageRollResult,
  type InitiativeRollParams,
  rollSkillCheck,
  rollSavingThrow,
  rollAttack,
  rollDamage,
  rollInitiative,
} from './mechanics';
