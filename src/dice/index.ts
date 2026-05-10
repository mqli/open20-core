// dice/index.ts
// Dice rolling system - Layered Architecture
// This file re-exports from the layered dice system for backward compatibility
// New code should import from core.ts, mechanics.ts, or entity.ts

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

// Layer 3: Entity Application
export {
  type CharacterSkillCheckParams,
  type CharacterSavingThrowParams,
  type CharacterAttackParams,
  type CharacterWeaponDamageParams,
  type SpellAttackParams,
  type SpellDamageParams,
  type MonsterAttackParams,
  type MonsterDamageParams,
  type CharacterInitiativeParams,
  type MonsterInitiativeParams,
  rollCharacterSkillCheck,
  rollCharacterSavingThrow,
  rollCharacterAttack,
  rollCharacterWeaponDamage,
  rollSpellAttack,
  rollSpellDamage as rollSpellDamageFn,
  rollMonsterAttack as rollMonsterAttackFn,
  rollMonsterDamage,
  rollCharacterInitiative,
  rollMonsterInitiative,
} from './entity';

// ── Deprecated Functions (kept for backward compatibility) ──────

import type { RandomProvider } from './core';
import type { Character } from '../types/character';
import type { Weapon } from '../types/equipment';
import type { Spell, SpellLevel } from '../types/spell';
import { defaultRandom } from './core';
import { rollCharacterWeaponDamage } from './entity';
import { rollSpellDamage as rollSpellDamageNew } from './entity';

/**
 * @deprecated Use rollCharacterWeaponDamage from entity instead
 */
export function rollWeaponDamage(
  rng: RandomProvider,
  character: Character,
  weapon: Weapon,
  isCritical: boolean = false
): import('./mechanics').DamageRollResult {
  return rollCharacterWeaponDamage({
    character,
    weapon,
    isCritical,
    rng,
  });
}

/**
 * @deprecated Use rollSpellDamage from entity instead
 */
export function rollSpellDamage(
  rng: RandomProvider,
  character: Character,
  spell: Spell,
  slotLevel: SpellLevel
): import('./mechanics').DamageRollResult {
  // Use the import from line 81
  return rollSpellDamageNew({
    character,
    spell,
    slotLevel,
    rng,
  });
}
