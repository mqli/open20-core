// dice/entity.ts
// DEPRECATED: This file is kept for backward compatibility only.
// All functions have been moved to src/rolls/ (Layer 4: Application).
//
// New code should import from '../rolls/character' or '../rolls/monster' instead.

import type { Character } from '../types/character';
import type { Monster } from '../monster/types';
import type { Spell, SpellLevel } from '../types/spell';
import type { Weapon } from '../types/equipment';
import type { AbilityName } from '../types/ability';
import type { SkillName } from '../types/skill';
import type { DamageType } from '../types/damage';
import type { RandomProvider } from './core';
import type { CheckResult, AttackRollResult, DamageRollResult, RollResult } from './mechanics';

// Re-export everything from rolls/character
export type { CharacterSkillCheckParams } from '../rolls/character';
export type { CharacterSavingThrowParams } from '../rolls/character';
export type { CharacterAttackParams } from '../rolls/character';
export type { CharacterWeaponDamageParams } from '../rolls/character';
export type { SpellAttackParams } from '../rolls/character';
export type { SpellDamageParams } from '../rolls/character';
export type { CharacterInitiativeParams } from '../rolls/character';

export { rollCharacterSkillCheck } from '../rolls/character';
export { rollCharacterSavingThrow } from '../rolls/character';
export { rollCharacterAttack } from '../rolls/character';
export { rollCharacterWeaponDamage } from '../rolls/character';
export { rollSpellAttack } from '../rolls/character';
export { rollSpellDamage } from '../rolls/character';
export { rollCharacterInitiative } from '../rolls/character';

// Re-export everything from rolls/monster
export type { MonsterAttackParams } from '../rolls/monster';
export type { MonsterDamageParams } from '../rolls/monster';
export type { MonsterFullAttackParams } from '../rolls/monster';
export type { MonsterInitiativeParams } from '../rolls/monster';

export { rollMonsterAttack } from '../rolls/monster';
export { rollMonsterDamage } from '../rolls/monster';
export { rollMonsterAttackDamage } from '../rolls/monster';
export { rollMonsterFullAttack } from '../rolls/monster';
export { rollMonsterInitiative } from '../rolls/monster';
