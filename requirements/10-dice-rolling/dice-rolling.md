# R22 - Dice Rolling System

## 概述

核心掷骰系统，支持攻击、技能检定、豁免检定和伤害掷骰，包含优势/劣势规则。

## 核心接口

### 基础掷骰

```typescript
// src/engine/dice.ts

/**
 * 随机数提供者（支持 deterministic testing）
 */
export interface RandomProvider {
  roll(min: number, max: number): number;  // [min, max] 闭区间
}

/**
 * 默认随机提供者（Math.random）
 */
export const defaultRandom: RandomProvider = {
  roll: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
};

/**
 * 掷单个骰子
 */
export function rollDie(rng: RandomProvider, die: DieType): number;

/**
 * 掷多个同面数骰子
 */
export function rollDice(rng: RandomProvider, die: DieType, count: number): number;

/**
 * 带优势掷骰（掷2次，取较高）
 */
export function rollWithAdvantage(rng: RandomProvider, die: DieType): number;

/**
 * 带劣势掷骰（掷2次，取较低）
 */
export function rollWithDisadvantage(rng: RandomProvider, die: DieType): number;
```

### 攻击掷骰

```typescript
// src/engine/dice.ts

export type AttackModifier = 'none' | 'advantage' | 'disadvantage';

export interface AttackRollResult {
  rawRoll: number;           // 原始掷骰结果
  modifier: AttackModifier;  // 修正类型
  bonus: number;            // 总加成（含熟练加成）
  final: number;            // 最终结果
  isCritical: boolean;      // 是否重击（掷出20）
  isCriticalFail: boolean;   // 是否重击失败（掷出1）
  hit: boolean;              // 是否命中（最终结果 vs AC）
  isFumble: boolean;         // 是否大失败（重击失败）
}

/**
 * 执行攻击掷骰
 */
export function rollAttack(
  rng: RandomProvider,
  character: Character,
  attack: Attack,
  modifier?: AttackModifier
): AttackRollResult;
```

### 技能检定

```typescript
// src/engine/dice.ts

export interface SkillCheckResult {
  rawRoll: number;
  modifier: 'advantage' | 'disadvantage' | 'none';
  bonus: number;
  final: number;
  skillName: SkillName;
  ability: AbilityName;
}

/**
 * 执行技能检定
 */
export function rollSkillCheck(
  rng: RandomProvider,
  character: Character,
  skill: SkillName,
  modifier?: 'advantage' | 'disadvantage' | 'none'
): SkillCheckResult;
```

### 豁免检定

```typescript
// src/engine/dice.ts

export interface SavingThrowResult {
  rawRoll: number;
  modifier: 'advantage' | 'disadvantage' | 'none';
  bonus: number;
  final: number;
  success: boolean;  // 是否成功（final >= DC）
}

/**
 * 执行豁免检定
 */
export function rollSavingThrow(
  rng: RandomProvider,
  character: Character,
  ability: AbilityName,
  dc: number,
  modifier?: 'advantage' | 'disadvantage' | 'none'
): SavingThrowResult;
```

### 伤害掷骰

```typescript
// src/engine/dice.ts

export interface DamageRollResult {
  rolls: ReadonlyArray<{
    die: DieType;
    count: number;
    results: readonly number[];
    subtotal: number;
  }>;
  modifiers: ReadonlyArray<{
    type: 'ability' | 'flat' | 'extra';
    value: number;
    description: string;
  }>;
  total: number;
}

/**
 * 执行武器伤害掷骰
 */
export function rollWeaponDamage(
  rng: RandomProvider,
  character: Character,
  weapon: Weapon,
  isCritical?: boolean
): DamageRollResult;

/**
 * 执行法术伤害掷骰
 */
export function rollSpellDamage(
  rng: RandomProvider,
  character: Character,
  spell: Spell,
  slotLevel: SpellLevel
): DamageRollResult;
```

## 实现要点

### 1. 优势/劣势规则
- 优势：掷2个d20，取较高者
- 劣势：掷2个d20，取较低者
- **重要**：使用优势时，若其中一个为1，最终结果仍为另一次（不一定是20）
- 熟练加成只加一次，不乘以骰子数量

### 2. 重击规则
- d20 掷出 **20** = 重击，伤害骰子翻倍
- d20 掷出 **1** = 重击失败，大失败
- 重击时，武器伤害骰子数量翻倍（不加 flat 修正）

### 3. 随机数提供者
- 所有函数接受 `RandomProvider` 参数
- 便于单元测试（传入 deterministic RNG）
- 运行时使用 `defaultRandom`

### 4. Character 依赖
- `character.abilityScores` - 属性修正值
- `character.combatStats.proficiencyBonus` - 熟练加成
- `character.skills` - 技能熟练状态

## 导出结构

```typescript
// src/engine/dice.ts
export { rollDie, rollDice, rollWithAdvantage, rollWithDisadvantage };
export type { RandomProvider, AttackModifier, AttackRollResult, SkillCheckResult, SavingThrowResult, DamageRollResult };
export { rollAttack, rollSkillCheck, rollSavingThrow, rollWeaponDamage, rollSpellDamage };

// src/engine/index.ts
export * from './dice';
```

## 测试用例

1. `rollDie` - 验证返回值在有效范围内
2. `rollWithAdvantage` - 验证取较高值
3. `rollWithDisadvantage` - 验证取较低值
4. `rollAttack` - 验证重击判定和命中计算
5. `rollSkillCheck` - 验证技能加成计算
6. `rollSavingThrow` - 验证 DC 对比
7. `rollWeaponDamage` - 验证重击伤害翻倍
8. `rollSpellDamage` - 验证法术伤害计算

## 依赖

- `src/engine/ability-modifier.ts` - 属性修正计算
- `src/engine/proficiency-bonus.ts` - 熟练加成
- `src/engine/skill-bonus.ts` - 技能加成
- `src/types/character.ts` - Character 类型
- `src/types/equipment.ts` - Weapon 类型
- `src/types/spell.ts` - Spell 类型
