# R22 - Dice Rolling System

## 概述

核心掷骰系统，支持攻击、技能检定、豁免检定和伤害掷骰，包含优势/劣势规则。

**重要**: 伤害掷骰必须支持**复合伤害类型**（composed damage types），例如：
- 武器： "2d6 piercing + 1d4 poison" (如 Poisoned Weapon)
- 法术： "2d6 fire + 1d6 poison" (如 Melf's Acid Arrow)
- 特殊： "1d8 slashing + 1d6 fire" (如 Flametongue Sword)

**更新 (2026-05-09)**: 统一伤害类型定义，消除 `dice`/`type` 与 `additional` 的冗余，使用统一的 `entries[]` 数组。

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

### 伤害掷骰（支持复合伤害类型）

```typescript
// src/engine/dice.ts

// 伤害掷骰条目（支持多种伤害类型）
export interface DamageRollEntry {
  damageType: string;        // 伤害类型，如 "Piercing", "Poison"
  die: DieType;
  count: number;
  results: readonly number[];
  subtotal: number;
}

export interface DamageRollResult {
  rolls: ReadonlyArray<DamageRollEntry>;
  modifiers: ReadonlyArray<{
    type: 'ability' | 'flat' | 'extra';
    value: number;
    description: string;
  }>;
  total: number;
  typedDamage: Record<string, number>;  // 按伤害类型分解的伤害值
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

## 数据结构要求

### WeaponDamage 类型（src/types/equipment.ts）

武器伤害使用统一的 `entries` 数组，消除 `dice`/`type` 与 `additional` 的冗余。

```typescript
// 武器伤害条目
export interface WeaponDamageEntry {
  readonly dice: string; // 如 "1d8", "2d6", "1d4"
  readonly type: string;   // 伤害类型，如 "Piercing", "Poison", "Fire"
}

// 武器伤害（统一使用 entries 数组）
export interface WeaponDamage {
  readonly entries: readonly WeaponDamageEntry[]; // 所有伤害条目，第一条为基础伤害（应用能力加值）
  readonly ability: AbilityName;
  readonly bonus: number;
}
```

**示例**：
```typescript
// 普通长剑：1d8 slashing
{ entries: [{ dice: "1d8", type: "Slashing" }], ability: "Strength", bonus: 0 }

// 淬毒匕首：1d4 piercing + 1d4 poison
{ entries: [{ dice: "1d4", type: "Piercing" }, { dice: "1d4", type: "Poison" }], ability: "Dexterity", bonus: 0 }

// 火焰舌剑：1d8 slashing + 1d6 fire
{ entries: [{ dice: "1d8", type: "Slashing" }, { dice: "1d6", type: "Fire" }], ability: "Strength", bonus: 0 }
```

### SpellDamage 类型（src/types/spell.ts）

法术伤害使用统一的 `entries` 数组。

```typescript
// 法术伤害条目
export interface SpellDamageEntry {
  readonly dice: string; // 如 "2d6", "1d6"
  readonly type: string;   // 伤害类型，如 "Fire", "Poison"
}

export interface SpellDamage {
  readonly entries: readonly SpellDamageEntry[]; // 法术伤害条目（升环时第一条伤害骰增加）
  readonly higherLevel?: readonly string[];       // 升环伤害（对应 entries[0]）
  readonly additional?: readonly SpellDamageEntry[]; // 额外伤害（不随升环增加，如 Melf's Acid Arrow 的 poison）
}
```

**示例**：
```typescript
// Firebolt：1d10 fire（0级法术）
{ entries: [{ dice: "1d10", type: "Fire" }], higherLevel: ["2d10", "3d10", ...] }

// Melf's Acid Arrow：2d6 piercing + 1d6 poison（额外 poison 不随升环增加）
{ entries: [{ dice: "2d6", type: "Piercing" }], higherLevel: ["3d6", "4d6", ...], additional: [{ dice: "1d6", type: "Poison" }] }
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

### 5. 复合伤害类型处理（新增）
- **基础伤害**：从 `weapon.damage.dice` 或 `spell.damage.dice` 解析
- **额外伤害**：从 `weapon.damage.additional` 或 `spell.damage.additional` 解析
- **伤害类型分解**：`typedDamage` 记录每种伤害类型的具体值
- **能力加值应用**：
  - 能力加值只加到**物理伤害**（Bludgeoning/Piercing/Slashing）
  - 如果没有物理伤害，则加到第一种伤害类型上
- **重击规则**：
  - 只有**基础伤害骰**翻倍（D&D 5e 规则）
  - 额外伤害骰（如 poison）不翻倍
  - 能力加值不翻倍
- **示例**：
  - 武器：1d8 piercing + 1d4 poison
  - 重击：2d8 piercing + 1d4 poison（poison 不翻倍）
  - 力量 +3：1d8+3 piercing + 1d4 poison

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

### 基础测试
1. `rollDie` - 验证返回值在有效范围内
2. `rollWithAdvantage` - 验证取较高值
3. `rollWithDisadvantage` - 验证取较低值
4. `rollAttack` - 验证重击判定和命中计算
5. `rollSkillCheck` - 验证技能加成计算
6. `rollSavingThrow` - 验证 DC 对比
7. `rollWeaponDamage` - 验证重击伤害翻倍
8. `rollSpellDamage` - 验证法术伤害计算

### 复合伤害类型测试（新增）
9. `rollWeaponDamage` - 验证武器基础伤害 + 额外伤害
   - 测试：武器 "1d8 piercing + 1d4 poison"
   - 验证：`typedDamage` 包含 `Piercing` 和 `Poison` 两个条目
   - 验证：`total` = 所有伤害之和
10. `rollSpellDamage` - 验证法术复合伤害
    - 测试：法术 "2d6 fire + 1d6 poison"
    - 验证：`typedDamage` 包含 `Fire` 和 `Poison` 两个条目
11. `rollWeaponDamage` - 验证重击时所有伤害骰都翻倍
    - 测试：武器 "1d8 piercing + 1d4 poison"，重击
    - 验证：`Piercing` 伤害 = 2d8，`Poison` 伤害 = 1d4（额外伤害不翻倍）
12. 能力加值应用 - 验证能力加值只加到物理伤害
    - 测试：武器 "1d8 slashing + 1d6 fire"，力量 +3
    - 验证：`Slashing` 伤害包含 +3，`Fire` 伤害不包含 +3

## 依赖

- `src/engine/ability-modifier.ts` - 属性修正计算
- `src/engine/proficiency-bonus.ts` - 熟练加成
- `src/engine/skill-bonus.ts` - 技能加成
- `src/types/character.ts` - Character 类型
- `src/types/equipment.ts` - Weapon 类型
- `src/types/spell.ts` - Spell 类型
