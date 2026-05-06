# DND 2024 Character Sheet — High Level Design

**版本**: 1.1  
**日期**: 2025-05-03  
**状态**: Active  
**定位**: Headless Core — 纯TypeScript，零UI依赖，单元测试可验证

---

## 0. 一句话架构

> **纯函数规则引擎 + 不可变角色状态 + 可注入依赖 = 任何UI都能驱动的headless核心。**

---

## 1. 架构原则

| # | 原则 | 含义 | 为什么 |
|---|---|---|---|
| A1 | **Pure Functions** | 规则引擎所有函数：`(input) => output`，无副作用 | 相同输入永远相同输出，天然可测试，天然可缓存 |
| A2 | **Immutable State** | `Character`对象创建后不修改，变更返回新对象 | 消除状态竞争，支持undo/redo，方便序列化 |
| A3 | **Dependency Injection** | 所有外部依赖(存储、随机数)通过参数注入 | 测试时替换为mock，运行时替换为真实实现 |
| A4 | **Schema-First Types** | TypeScript类型是唯一真相源，运行时用Zod校验 | 导入JSON时必须有运行时校验，类型定义同时服务两用 |
| A5 | **Zero UI Dependency** | 核心包不依赖任何UI框架(React/Vue/etc.) | 核心可以被CLI/Web/Native任何壳子复用 |
| A6 | **Barrel Exports** | 每个模块通过`index.ts`导出公共API | 模块边界清晰，内部实现可自由重构 |
| A7 | **Data-Driven Rules** | 规则数据(物种/职业/法术)与逻辑代码分离 | 规则更新只改JSON，不改代码 |

---

## 2. 模块架构

```
┌──────────────────────────────────────────────────┐
│                  @dnd2024/core                    │
│                   (本包全部)                       │
├──────────┬──────────┬──────────┬─────────────────┤
│  types   │   data   │  engine  │   character     │
│ 类型定义  │ 规则数据  │ 纯函数   │  状态管理        │
│          │          │  计算     │  创建/变更/校验   │
├──────────┴──────────┴──────────┴─────────────────┤
│                   storage                         │
│            持久化抽象层(接口+实现)                   │
└──────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   ┌───────────┐                 ┌───────────┐
   │  CLI App  │                 │  Web App  │
   │ (未来)    │                 │ (未来)     │
   └───────────┘                 └───────────┘
```

**依赖方向（单向，禁止反向）**：

```
types ← data ← engine ← character ← storage
                   ↑                   │
                   └───────────────────┘ (character引用engine的函数)
```

**禁止**：
- `types` 不得 import 任何其他模块
- `data` 只能 import `types`
- `engine` 只能 import `types` 和 `data`
- `character` 可以 import `types`、`data`、`engine`
- `storage` 可以 import `types`、`character`

---

## 3. 目录结构

```
dnd2024-character-sheet/
├── src/
│   ├── types/                    # A1: 类型定义（零依赖）
│   │   ├── character.ts          #   Character, CharacterClass, HitPoints, DeathSaves,
│   │   │                         #   CombatStats, Attack, ActiveCondition, ConditionName,
│   │   │                         #   Currency, DieType
│   │   ├── species.ts            #   Species, SpeciesTrait, SpeciesGrant, SpeciesSubtype
│   │   ├── background.ts         #   Background (含 originFeatId)
│   │   ├── class.ts              #   Class, Subclass, Feature, Spellcasting, MulticlassSpellSlotEntry
│   │   ├── ability.ts            #   AbilityName, AbilityScores, ABILITY_NAMES
│   │   ├── skill.ts              #   SkillName, SkillEntry, SKILL_ABILITY_MAP
│   │   ├── feat.ts               #   Feat, FeatCategory, FeatPrerequisite, FeatGrant
│   │   ├── equipment.ts          #   EquipmentItem, Weapon, Armor, GearItem, WeaponMasteryProperty
│   │   ├── spell.ts              #   Spell, CharacterSpells, SpellSlotEntry, PactMagicSlots, SpellSchool
│   │   ├── resource.ts           #   Resource, ResetType, DisplayType
│   │   └── index.ts              #   barrel export
│   │
│   ├── data/                     # A7: 规则数据（只依赖types）
│   │   ├── loader.ts             #   DataLoader 接口 + LookupTables 类型 + createDataLoader 工厂
│   │   ├── default-loader.ts     #   默认 DataLoader 实现（从 static/*.json 加载）
│   │   └── index.ts
│   │
│   ├── engine/                   # A1: 纯函数计算（无副作用）
│   │   ├── ability-modifier.ts   #   getModifier(score), getTotalScore(...)
│   │   ├── proficiency-bonus.ts  #   getProficiencyBonus(level)
│   │   ├── skill-bonus.ts        #   getSkillBonus(char, skillName, data)
│   │   ├── saving-throw.ts       #   getSavingThrowBonus(char, ability, data)
│   │   ├── ac-calculator.ts      #   calculateAC(char, data) → number
│   │   ├── hp-calculator.ts      #   calculateMaxHP(char, data) → number
│   │   ├── spell-slots.ts        #   calculateSpellSlots(char, data) → SpellSlotMap
│   │   ├── initiative.ts         #   calculateInitiative(char, data) → number
│   │   ├── passive-perception.ts #   calculatePassivePerception(char, data) → number
│   │   ├── attack-calculator.ts  #   calculateAttacks(char, data) → Attack[]
│   │   └── index.ts
│   │
│   ├── character/                # A2+A3: 状态管理（不可变+可注入）
│   │   ├── create.ts             #   createCharacter(params) → Character
│   │   ├── level-up.ts           #   levelUp(char, options, data, rng?) → Character
│   │   ├── rest.ts               #   shortRest(char, data) → Character; longRest(char, data) → Character
│   │   ├── mutate.ts             #   所有状态变更函数
│   │   │                         #     modifyHP(char, delta) → Character
│   │   │                         #     setTemporaryHP(char, value) → Character
│   │   │                         #     consumeResource(char, id) → Character
│   │   │                         #     recoverResource(char, id) → Character
│   │   │                         #     consumeSpellSlot(char, level) → Character
│   │   │                         #     recoverSpellSlot(char, level) → Character
│   │   │                         #     toggleCondition(char, conditionId) → Character
│   │   │                         #     equipItem(char, itemId) → Character
│   │   │                         #     unequipItem(char, itemId) → Character
│   │   │                         #     prepareSpell(char, spellId) → Character
│   │   │                         #     unprepareSpell(char, spellId) → Character
│   │   ├── validate.ts           #   validateCharacter(char, data) → ValidationResult
│   │   ├── recompute.ts          #   recomputeDerivedStats(char, data) → Character
│   │   └── index.ts
│   │
│   ├── storage/                  # A3: 持久化（接口+实现分离）
│   │   ├── interface.ts          #   ICharacterStorage 接口
│   │   ├── memory.ts             #   InMemoryStorage (测试用)
│   │   ├── json-file.ts          #   JsonFileStorage (CLI用)
│   │   ├── serializer.ts         #   serialize(char) → JSON; deserialize(json) → Character
│   │   └── index.ts
│   │
│   └── index.ts                  # 公共API barrel export
│
├── tests/
│   ├── engine/                   # 规则引擎单元测试
│   │   ├── ability-modifier.test.ts
│   │   ├── proficiency-bonus.test.ts
│   │   ├── skill-bonus.test.ts
│   │   ├── saving-throw.test.ts
│   │   ├── ac-calculator.test.ts
│   │   ├── hp-calculator.test.ts
│   │   ├── spell-slots.test.ts
│   │   ├── initiative.test.ts
│   │   ├── passive-perception.test.ts
│   │   └── attack-calculator.test.ts
│   ├── character/                # 状态管理测试
│   │   ├── create.test.ts
│   │   ├── level-up.test.ts
│   │   ├── rest.test.ts
│   │   ├── mutate.test.ts
│   │   ├── validate.test.ts
│   │   └── recompute.test.ts
│   ├── data/                     # 数据完整性测试
│   │   └── data-integrity.test.ts
│   └── storage/                  # 存储层测试
│       ├── serializer.test.ts
│       └── import-export.test.ts
│
├── package.json
├── tsconfig.json
├── vitest.config.ts              # 测试配置
├── static/                       # A7: 静态规则数据（JSON）
│   ├── species.json              #   12个物种
│   ├── backgrounds.json          #   16个背景
│   ├── classes.json              #   12个职业
│   ├── subclasses.json           #   所有子职业
│   ├── feats.json                #   75个专长
│   ├── spells.json               #   ~391个法术
│   ├── weapons.json              #   武器列表
│   ├── armor.json                #   护甲列表
│   ├── gear.json                 #   冒险装备
│   └── lookup-tables.json        #   查表数据（熟练加值/法术位/Pact Magic等）
└── PRD.md                        # 产品需求文档
```

---

## 4. 命名规范

### 4.1 文件命名

| 规则 | 示例 | 说明 |
|---|---|---|
| kebab-case | `ac-calculator.ts` | 所有源码文件 |
| 文件名=模块主职责 | `spell-slots.ts` | 一个文件一个职责 |
| 测试文件同目录或 `tests/` | `ac-calculator.test.ts` | 与源文件一一对应 |
| barrel文件 | `index.ts` | 模块公共API |

### 4.2 TypeScript命名

| 类别 | 规则 | 示例 |
|---|---|---|
| **Interface** | PascalCase, 不加I前缀 | `Character`, `Species`, `DataLoader` |
| **Type Alias** | PascalCase | `AbilityName`, `FeatCategory`, `ResetType` |
| **Enum** | PascalCase(名), PascalCase(值) | `ResetType.ShortRest` |
| **Function** | camelCase, 动词开头 | `calculateAC`, `getModifier`, `createCharacter` |
| **Constant** | SCREAMING_SNAKE_CASE | `PROFICIENCY_BONUS_TABLE`, `HIT_DIE_FIXED_VALUES` |
| **Generic Parameter** | 单大写字母或有意义名称 | `T`, `TData`, `TCharacter` |

### 4.3 函数命名约定

| 前缀 | 含义 | 示例 |
|---|---|---|
| `calculate*` | 从输入计算一个派生值 | `calculateAC(char, data)` |
| `get*` | 简单取值/查表 | `getModifier(score)`, `getProficiencyBonus(level)` |
| `create*` | 创建新对象 | `createCharacter(params)` |
| `validate*` | 校验，返回Result | `validateCharacter(char, data)` |
| `recompute*` | 重算所有派生属性 | `recomputeDerivedStats(char, data)` |
| `modify*` / `set*` / `toggle*` | 状态变更，返回新对象 | `modifyHP(char, delta)` |

### 4.4 枚举/常量命名

```typescript
// 属性名 — 字符串字面量联合类型，不用enum
type AbilityName = 'Strength' | 'Dexterity' | 'Constitution' 
                  | 'Intelligence' | 'Wisdom' | 'Charisma';

// 重置类型 — 用enum（有限选项，运行时需要反向映射）
enum ResetType {
  ShortRest = 'Short Rest',
  LongRest = 'Long Rest',
  PerTurn = 'Per Turn',
  Daily = 'Daily',
  Never = 'Never',
}

// 专长类别 — 字符串字面量联合类型
type FeatCategory = 'Origin' | 'General' | 'Fighting Style' | 'Epic Boon';

// 护甲类别
type ArmorCategory = 'Light' | 'Medium' | 'Heavy' | 'Shield';

// 武器类别
type WeaponCategory = 'Simple' | 'Martial';

// 法术学校
type SpellSchool = 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' 
                  | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';

// 条件状态
type ConditionName = 'Blinded' | 'Charmed' | 'Deafened' | 'Exhaustion' 
                   | 'Frightened' | 'Grappled' | 'Incapacitated' | 'Invisible' 
                   | 'Paralyzed' | 'Petrified' | 'Poisoned' | 'Prone' 
                   | 'Restrained' | 'Stunned' | 'Unconscious';
```

> **设计决策：什么时候用enum vs 字符串字面量？**
> - 有限选项且需要运行时遍历 → `enum`（如ResetType）
> - 有限选项但只做类型检查 → 字符串字面量联合（如AbilityName，更接近JSON数据格式）
> - 原因：JSON序列化时enum可能产生意外值，字符串字面量天然兼容JSON

---

## 5. 核心类型设计

### 5.1 属性(Ability)

```typescript
// types/ability.ts

export type AbilityName = 'Strength' | 'Dexterity' | 'Constitution' 
                        | 'Intelligence' | 'Wisdom' | 'Charisma';

export const ABILITY_NAMES: readonly AbilityName[] = [
  'Strength', 'Dexterity', 'Constitution', 
  'Intelligence', 'Wisdom', 'Charisma',
];

export interface AbilityScores {
  base: Record<AbilityName, number>;        // 玩家分配的原始值
  racialBonuses: Partial<Record<AbilityName, number>>;  // 物种加值
  featBonuses: Partial<Record<AbilityName, number>>;    // 专长加值
  temporaryBonuses: Partial<Record<AbilityName, number>>; // 临时加值（法术等）
}
```

### 5.2 角色(Character)

```typescript
// types/character.ts

export interface Character {
  readonly schemaVersion: string;
  readonly name: string;
  readonly species: string;                    // Species.id
  readonly speciesSubtype: string | null;      // 物种变体
  readonly background: string;                 // Background.id
  readonly classes: readonly CharacterClass[];  // 支持多维职业
  readonly abilityScores: AbilityScores;
  readonly skills: Record<string, SkillEntry>;
  readonly feats: readonly string[];            // Feat.id 列表
  readonly equipment: readonly EquipmentItem[];
  readonly spells: CharacterSpells;
  readonly resources: readonly Resource[];
  readonly hitPoints: HitPoints;
  readonly combatStats: CombatStats;
  readonly currency: Currency;
  readonly conditions: readonly ActiveCondition[];
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CharacterClass {
  readonly classId: string;          // Class.id
  readonly level: number;
  readonly subclassId: string | null;
  readonly subclassLevel: number | null;
  readonly hitDice: { readonly die: DieType; readonly used: number };
}

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface HitPoints {
  readonly max: number;
  readonly current: number;
  readonly temporary: number;
  readonly deathSaves: DeathSaves;
}

export interface DeathSaves {
  readonly successes: number;  // 0-3
  readonly failures: number;   // 0-3
  readonly isStable: boolean;
}

export interface Currency {
  readonly cp: number;
  readonly sp: number;
  readonly ep: number;
  readonly gp: number;
  readonly pp: number;
}
```

> **设计决策：`readonly` everywhere？**
> 是的。Character及其所有子字段标记`readonly`，强制不可变。修改通过`character/mutate.ts`中的函数完成，返回新对象。这样：
> - 类型系统阻止意外修改
> - 支持undo栈（保存旧引用即可）
> - 序列化安全（对象不会被其他代码偷偷改掉）

### 5.3 规则数据接口

```typescript
// data/loader.ts

export interface DataLoader {
  // ── 物种（Species）───
  getSpecies(id: string): Species | undefined;
  getSpeciesSubtype(speciesId: string, subtypeId: string): SpeciesSubtype | undefined;
  getAllSpecies(): Species[];

  // ── 背景（Background）───
  getBackground(id: string): Background | undefined;
  getAllBackgrounds(): Background[];

  // ── 职业（Class）/ 子职业（Subclass）───
  getClass(id: string): Class | undefined;
  getAllClasses(): Class[];
  getSubclass(id: string): Subclass | undefined;
  getSubclassesForClass(classId: string): Subclass[];
  getAllSubclasses(): Subclass[];

  // ── 专长（Feat）───
  getFeat(id: string): Feat | undefined;
  getFeatsByCategory(category: FeatCategory): Feat[];
  getAllFeats(): Feat[];

  // ── 装备 / 武器 / 护甲 ──────────────────────────────
  getWeapon(id: string): Weapon | undefined;
  getAllWeapons(): Weapon[];
  getArmor(id: string): Armor | undefined;
  getAllArmor(): Armor[];
  getGearItem(id: string): GearItem | undefined;
  getAllGear(): GearItem[];

  // ── 法术（Spell）───
  getSpell(id: string): Spell | undefined;
  getSpellsByLevel(level: SpellLevel): Spell[];
  getAllSpells(): Spell[];

  // ── 查表数据（Lookup Tables）────────────────────
  getProficiencyBonus(level: number): number;
  getHitDieFixedValue(die: DieType): number;
  getSpellSlots(classId: string, classLevel: number): Record<number, number>;
  getMulticlassSpellSlots(totalSpellcastingLevel: number): Record<number, number>;
  getPactMagicSlots(warlockLevel: number): { slots: number; slotLevel: number };
  getWeaponMasteryProperties(): readonly string[];
  getConditionNames(): readonly string[];
}

// 查表数据辅助类型
export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface LookupTables {
  proficiencyBonus: Record<number, number>;
  hitDieFixedValue: Record<DieType, number>;
  spellSlots: Record<string, Record<number, Record<number, number>>>;
  multiclassSpellSlots: Record<number, Record<number, number>>;
  pactMagicSlots: Record<number, { slots: number; slotLevel: number }>;
  weaponMasteryProperties: readonly string[];
  conditionNames: readonly string[];
}

// 默认工厂函数 — 接收 LookupTables，返回 DataLoader 实例
export function createDataLoader(tables: LookupTables): DataLoader;
```

> **设计决策：为什么用接口而不是直接import JSON？**
> 1. 测试时可以注入mock数据（比如只加载Fighter相关的数据进行测试）
> 2. 未来可以从远程API加载（不需要改engine代码）
> 3. 默认实现从静态JSON加载，但接口允许灵活替换

### 5.4 随机数注入

```typescript
// character/level-up.ts

export interface RandomProvider {
  d(max: number): number;  // 掷1-max的骰子
}

// 默认实现（使用Math.random）
export const defaultRng: RandomProvider = {
  d: (max) => Math.floor(Math.random() * max) + 1,
};

// 确定性实现（测试用）
export function createDeterministicRng(sequence: number[]): RandomProvider {
  let index = 0;
  return {
    d: (max) => {
      const value = sequence[index % sequence.length];
      index++;
      return Math.min(value, max);
    },
  };
}
```

> **为什么注入随机数？**
> 升级HP时玩家可以选择掷骰，测试时需要确定性结果。`RandomProvider`让测试100%可重复。

---

## 6. 核心函数签名

### 6.1 Engine模块（纯函数）

```typescript
// engine/ability-modifier.ts
export function getModifier(score: number): number;
export function getTotalScore(scores: AbilityScores, ability: AbilityName): number;

// engine/proficiency-bonus.ts
export function getProficiencyBonus(totalLevel: number): number;

// engine/skill-bonus.ts
export function getSkillBonus(
  scores: AbilityScores, 
  skill: SkillEntry, 
  abilityName: AbilityName,
  proficiencyBonus: number
): number;
export function getAllSkillBonuses(
  scores: AbilityScores,
  skills: Record<string, SkillEntry>,
  skillAbilityMap: Record<string, AbilityName>,
  proficiencyBonus: number
): Record<string, number>;

// engine/saving-throw.ts
export function getSavingThrowBonus(
  scores: AbilityScores,
  ability: AbilityName,
  proficientAbilities: readonly AbilityName[],
  proficiencyBonus: number
): number;

// engine/ac-calculator.ts
export function calculateAC(
  scores: AbilityScores,
  equipment: readonly EquipmentItem[],
  features: readonly Feature[],
  data: DataLoader
): number;

// engine/hp-calculator.ts
export function calculateMaxHP(
  classes: readonly CharacterClass[],
  conModifier: number,
  data: DataLoader
): number;
export function getHitDieFixedValue(die: DieType): number;
export function calculateHPAtLevel1(hitDie: DieType, conModifier: number): number;
export function calculateHPIncrement(hitDie: DieType, conModifier: number): number;

// engine/spell-slots.ts
export interface SpellSlotEntry { readonly total: number; readonly used: number; }
export interface PactMagicResult { readonly slotLevel: number; readonly slots: number; }

export function calculateSpellSlots(
  classId: string,
  classLevel: number,
  data: DataLoader
): Record<number, SpellSlotEntry>;
export function calculatePactMagic(warlockLevel: number, data: DataLoader): PactMagicResult | null;
export function getMulticlassSpellcasterLevel(
  classes: readonly CharacterClass[],
  data: DataLoader
): number;
export function calculateMulticlassSpellSlots(
  totalSpellcasterLevel: number,
  data: DataLoader
): Record<number, SpellSlotEntry>;

// engine/initiative.ts
export function calculateInitiative(
  scores: AbilityScores,
  featIds: readonly string[],
  features: readonly Feature[]
): number;

// engine/passive-perception.ts
export function calculatePassivePerception(
  scores: AbilityScores,
  skills: Record<string, SkillEntry>,
  proficiencyBonus: number,
  conditions: readonly ActiveCondition[]
): number;

// engine/attack-calculator.ts
export function calculateAttacks(
  scores: AbilityScores,
  equipment: readonly EquipmentItem[],
  proficiencyBonus: number,
  features: readonly Feature[],
  data: DataLoader
): Attack[];
```

**函数签名统一模式**：
```
function calculateXxx(char: Character, data: DataLoader): Result
// 或更精细的（不依赖完整Character）：
function calculateXxx(specificInput1, specificInput2, ..., data: DataLoader): Result
```

> **设计决策：为什么有的函数接收`Character`，有的只接收部分字段？**
> - 如果函数只需要2-3个字段，用具体参数（减少对完整对象的依赖）
> - 如果函数需要5+个字段，用`Character`整体（减少参数数量）
> - `data: DataLoader`始终在最后（可选依赖，测试可mock）

### 6.2 Character模块（状态变更）

```typescript
// character/create.ts
export function createCharacter(params: CreateCharacterParams, data: DataLoader): Character;

export interface CreateCharacterParams {
  name: string;
  speciesId: string;
  speciesSubtypeId?: string;
  backgroundId: string;
  classId: string;
  abilityScores: Record<AbilityName, number>;  // base值
  featIds?: string[];    // 初始专长（含Origin Feat）
  skillChoices?: string[];  // 职业技能选择
}

// character/mutate.ts — 所有变更函数返回新Character
export function modifyHP(char: Character, delta: number): Character;
export function setTemporaryHP(char: Character, value: number): Character;
export function consumeResource(char: Character, resourceId: string): Character;
export function recoverResource(char: Character, resourceId: string): Character;
export function consumeSpellSlot(char: Character, level: number): Character;
export function recoverSpellSlot(char: Character, level: number): Character;
export function toggleCondition(char: ConditionName): (char: Character) => Character;
export function equipItem(char: Character, itemId: string): Character;
export function unequipItem(char: Character, itemId: string): Character;
export function prepareSpell(char: Character, spellId: string): Character;
export function unprepareSpell(char: Character, spellId: string): Character;
export function addEquipment(char: Character, item: EquipmentItem): Character;
export function removeEquipment(char: Character, itemId: string): Character;
export function modifyCurrency(char: Character, currency: Partial<Currency>): Character;

// character/level-up.ts
export function levelUp(
  char: Character, 
  options: LevelUpOptions, 
  data: DataLoader, 
  rng?: RandomProvider
): Character;

export interface LevelUpOptions {
  classId: string;                     // 升哪个职业(MVP=唯一职业)
  subclassId?: string;                 // 如达到子职业等级
  hpChoice: 'fixed' | 'roll';          // HP增量方式
  asiOrFeat?: {                        // ASI/Feat选择(4/8/12/16级)
    type: 'asi' | 'feat';
    asi?: Partial<Record<AbilityName, number>>;
    featId?: string;
  };
  newSpells?: string[];                // 施法者新法术
}

// character/rest.ts
export function shortRest(
  char: Character, 
  hitDiceToSpend: number,
  data: DataLoader,
  rng?: RandomProvider
): Character;

export function longRest(char: Character, data: DataLoader): Character;

// character/validate.ts
export function validateCharacter(
  char: Character, 
  data: DataLoader
): ValidationResult;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;        // 如 'abilityScores.base.Strength'
  message: string;      // 如 'Strength must be between 8 and 15'
  severity: 'error' | 'warning';
}

// character/recompute.ts
export function recomputeDerivedStats(char: Character, data: DataLoader): Character;
// 重新计算: combatStats.AC, combatStats.initiative, combatStats.passivePerception,
//           combatStats.proficiencyBonus, combatStats.attacks, spells.spellSaveDC,
//           spells.spellAttackBonus, spells.spellSlots
```

### 6.3 Storage模块

```typescript
// storage/interface.ts

export interface ICharacterStorage {
  save(char: Character): Promise<void>;
  load(id: string): Promise<Character | null>;
  list(): Promise<CharacterSummary[]>;
  delete(id: string): Promise<void>;
}

export interface CharacterSummary {
  id: string;
  name: string;
  classSummary: string;   // "Fighter 5" or "Fighter 5 / Wizard 2"
  lastModified: string;
}

// storage/serializer.ts
export function serialize(char: Character): string;                    // → JSON string
export function deserialize(json: string): Character;                  // JSON string → Character (含Zod校验)
export function validateSchemaVersion(json: string): SchemaValidationResult;
export function sanitizeFilename(name: string): string;                // 角色名 → 安全文件名
```

---

## 7. 关键设计决策

### 7.1 为什么用函数式而不是Class？

```
❌ class Character { modifyHP(delta) { this.hitPoints.current += delta; } }
✅ function modifyHP(char: Character, delta: number): Character { ... }
```

| 对比 | Class | 函数式 |
|---|---|---|
| 可测试性 | 需要实例化，隐式this | 纯函数，直接调用 |
| 不可变性 | 需要手动保护 | TypeScript `readonly` 强制 |
| 序列化 | 需要toJSON/fromJSON | 对象本身就是数据 |
| 组合性 | 继承链复杂 | 函数组合简单 |
| 摇树优化 | Class整体引入 | 函数级引入 |

### 7.2 为什么Character用`readonly`而不是Immutable.js？

```
✅ 使用 TypeScript readonly + spread operator
❌ 使用 Immutable.js / Immer
```

| 对比 | readonly + spread | Immutable.js / Immer |
|---|---|---|
| 零依赖 | ✅ | ❌ 引入外部包 |
| JSON兼容 | ✅ 天然兼容 | ❌ 需要转换 |
| 调试 | ✅ 普通对象 | ❌ 自定义数据结构 |
| 学习成本 | ✅ TypeScript原生 | ❌ 需要学习API |
| 性能 | 足够好(角色数据量小) | 大数据量更优 |

角色数据量极小(几KB)，spread operator的性能完全足够。不需要Immer。

```typescript
// 修改示例
function modifyHP(char: Character, delta: number): Character {
  const newCurrent = Math.max(0, Math.min(char.hitPoints.current + delta, char.hitPoints.max));
  return {
    ...char,
    hitPoints: {
      ...char.hitPoints,
      current: newCurrent,
    },
    updatedAt: new Date().toISOString(),
  };
}
```

### 7.3 为什么DataLoader用接口而不是直接import？

```typescript
❌ import { SPECIES } from '../data/species-data';
✅ function calculateAC(char, data: DataLoader) { ... }
```

1. **测试隔离**：测试只加载需要的数据（ Fighter测试不需要Bard数据）
2. **数据替换**：未来可以从API、从用户自定义JSON加载
3. **明确依赖**：函数签名声明它需要什么数据

### 7.4 Zod校验策略

```typescript
// 只在边界校验：JSON导入时
// 内部代码信任TypeScript类型，不做重复校验

import { z } from 'zod';

const CharacterSchema = z.object({
  schemaVersion: z.string(),
  name: z.string(),
  species: z.string(),
  // ... 完整schema
});

// storage/serializer.ts
export function deserialize(json: string): Character {
  const raw = JSON.parse(json);
  return CharacterSchema.parse(raw);  // 运行时校验，失败抛ZodError
}
```

> **原则**：信任边界内，校验边界外。
> - 导入JSON → Zod校验（不信任外部数据）
> - engine函数内部 → 信任TypeScript类型（不重复校验）
> - validateCharacter() → 专门用于规则合法性校验（不是类型校验）

---

## 8. 测试策略

### 8.1 测试分层

```
┌─────────────────────────────┐
│      E2E Tests (未来)        │  CLI/Web集成测试
├─────────────────────────────┤
│   Integration Tests          │  createCharacter + validate + serialize
├─────────────────────────────┤
│     Unit Tests (核心)        │  engine/* + character/mutate + character/rest
├─────────────────────────────┤
│     Data Integrity Tests     │  静态数据完整性（ID唯一、引用完整）
└─────────────────────────────┘
```

### 8.2 单元测试规范

```typescript
// tests/engine/ac-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAC } from '@/engine/ac-calculator';
import { createTestDataLoader } from '@/test-utils/test-data-loader';

describe('calculateAC', () => {
  const data = createTestDataLoader();  // 轻量测试数据

  it('returns 10 + Dex for unarmored character', () => {
    const char = createTestCharacter({ 
      equipment: [], 
      abilityScores: { base: { Dexterity: 14 } } 
    });
    expect(calculateAC(char, data)).toBe(12);  // 10 + 2(Dex)
  });

  it('adds shield bonus', () => { ... });
  it('caps Dex for medium armor', () => { ... });
  // ...
});
```

### 8.3 测试数据工具

```typescript
// test-utils/test-data-loader.ts
// 提供轻量级DataLoader，只包含测试所需的最小数据集

// test-utils/test-character-factory.ts  
// 工厂函数，快速创建测试用Character
export function createTestCharacter(overrides?: Partial<Character>): Character;
export function createFighter(level?: number, overrides?: ...): Character;
export function createWizard(level?: number, overrides?: ...): Character;
export function createWarlock(level?: number, overrides?: ...): Character;
```

### 8.4 覆盖率要求

| 模块 | 最低覆盖率 | 说明 |
|---|---|---|
| `engine/*` | 100% | 纯函数，必须全覆盖 |
| `character/mutate.ts` | 95% | 状态变更，必须全覆盖 |
| `character/validate.ts` | 95% | 规则校验，必须全覆盖 |
| `character/rest.ts` | 90% | 短休/长休逻辑 |
| `character/level-up.ts` | 85% | 升级逻辑复杂 |
| `data/*` | 70% | 主要是静态数据，数据完整性测试覆盖 |
| `storage/*` | 80% | 序列化/反序列化 |

---

## 9. 依赖清单

### 9.1 运行时依赖

| 包 | 用途 | 为什么 |
|---|---|---|
| `zod` | JSON导入时的运行时类型校验 | 唯一的外部运行时依赖，轻量且类型安全 |

**仅此一个。** 核心包不依赖任何其他运行时包。

### 9.2 开发依赖

| 包 | 用途 |
|---|---|
| `typescript` | 编译 |
| `vitest` | 测试框架 |
| `@vitest/coverage-v8` | 覆盖率 |
| `prettier` | 代码格式 |
| `eslint` | 静态分析 |
| `tsx` | 开发时直接运行TS |

### 9.3 未来UI层依赖（不在本包中）

| 场景 | 包 |
|---|---|
| Web UI | `react`, `vite`, `tailwindcss` |
| CLI | `commander`, `inquirer`, `chalk` |
| Native | `react-native` |

---

## 10. 构建与发布

### 10.1 package.json 关键配置

```json
{
  "name": "@dnd2024/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js",
    "./data": "./dist/data/index.js",
    "./engine": "./dist/engine/index.js",
    "./character": "./dist/character/index.js",
    "./storage": "./dist/storage/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  }
}
```

### 10.2 tsconfig.json 关键配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 11. 模块间依赖规则

### 11.1 允许的依赖

```
types ← (无依赖)
data  ← types
engine ← types, data
character ← types, data, engine
storage ← types, character
```

### 11.2 禁止的依赖

| 禁止 | 原因 |
|---|---|
| `types` → 任何模块 | 类型定义是基础，不能反向依赖 |
| `engine` → `character` | 纯函数不应依赖状态管理 |
| `engine` → `storage` | 纯函数不应依赖IO |
| 任何模块 → UI框架 | 核心包零UI依赖 |
| 循环依赖 | 任何形式 |

### 11.3 ESLint强制执行

```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        // engine不能import character或storage
        { group: ['../character/*', '../storage/*'], message: 'engine模块不能依赖character或storage' },
        // data不能import engine或character或storage
        { group: ['../engine/*', '../character/*', '../storage/*'], message: 'data模块不能依赖engine/character/storage' },
        // types不能import任何其他模块
        { group: ['../data/*', '../engine/*', '../character/*', '../storage/*'], message: 'types模块零依赖' },
      ],
    }],
  },
};
```

---

## 12. 公共API设计

### 12.1 顶层导出

```typescript
// src/index.ts

// Types
export type { Character, CharacterClass, HitPoints, DeathSaves, Currency } from './types';
export type { AbilityName, AbilityScores } from './types';
export type { Species, SpeciesTrait } from './types';
export type { Background } from './types';
export type { Class, Subclass, Feature, Spellcasting } from './types';
export type { Feat, FeatCategory } from './types';
export type { Weapon, Armor, Item as GearItem, EquipmentItem } from './types';
export type { Spell, CharacterSpells, SpellSlotEntry, PactMagicSlots } from './types';
export type { Resource, ResetType } from './types';
export type { CombatStats, Attack, ActiveCondition, ConditionName } from './types';
export type { DieType } from './types';

// Data
export { DataLoader } from './data';
export { createDataLoader } from './data';  // 默认实现

// Engine (纯函数)
export { getModifier, getTotalScore } from './engine';
export { getProficiencyBonus } from './engine';
export { getSkillBonus } from './engine';
export { getSavingThrowBonus } from './engine';
export { calculateAC } from './engine';
export { calculateMaxHP, calculateHPAtLevel1, calculateHPIncrement } from './engine';
export { calculateSpellSlots, calculatePactMagic } from './engine';
export { calculateInitiative } from './engine';
export { calculatePassivePerception } from './engine';
export { calculateAttacks } from './engine';

// Character (状态管理)
export { createCharacter } from './character';
export { levelUp } from './character';
export { shortRest, longRest } from './character';
export { modifyHP, setTemporaryHP, consumeResource, recoverResource,
         consumeSpellSlot, recoverSpellSlot, toggleCondition,
         equipItem, unequipItem, prepareSpell, unprepareSpell,
         addEquipment, removeEquipment, modifyCurrency } from './character';
export { validateCharacter } from './character';
export { recomputeDerivedStats } from './character';

// Storage
export { ICharacterStorage, CharacterSummary } from './storage';
export { InMemoryStorage } from './storage';
export { JsonFileStorage } from './storage';
export { serialize, deserialize, sanitizeFilename } from './storage';
```

### 12.2 典型使用流程

```typescript
import { 
  createDataLoader, createCharacter, modifyHP, 
  calculateAC, shortRest, longRest,
  validateCharacter, serialize, deserialize,
  InMemoryStorage
} from '@dnd2024/core';

// 1. 加载规则数据
const data = createDataLoader();

// 2. 创建角色
const char = createCharacter({
  name: 'Borin Ironforge',
  speciesId: 'Dwarf',
  backgroundId: 'Soldier',
  classId: 'Fighter',
  abilityScores: { Strength: 15, Dexterity: 12, Constitution: 14, 
                   Intelligence: 10, Wisdom: 13, Charisma: 8 },
}, data);

// 3. 查看计算结果
console.log(calculateAC(char, data));  // 16 (Chain Mail)
console.log(char.hitPoints.max);       // 13 (10 + 3 Con)

// 4. 修改状态
const hurt = modifyHP(char, -5);
console.log(hurt.hitPoints.current);   // 8

// 5. 长休
const rested = longRest(hurt, data);
console.log(rested.hitPoints.current); // 13 (恢复满)

// 6. 校验
const result = validateCharacter(char, data);
console.log(result.valid);  // true

// 7. 序列化
const json = serialize(char);

// 8. 反序列化
const restored = deserialize(json);

// 9. 存储
const storage = new InMemoryStorage();
await storage.save(char);
```

---

## 13. 与需求文件的映射

| 需求文件 | 对应源码 | 核心函数 |
|---|---|---|
| `01-rules-engine/ac-calculation.md` | `src/engine/ac-calculator.ts` | `calculateAC()` |
| `01-rules-engine/hp-calculation.md` | `src/engine/hp-calculator.ts` | `calculateMaxHP()`, `calculateHPAtLevel1()`, `calculateHPIncrement()` |
| `01-rules-engine/spell-slots.md` | `src/engine/spell-slots.ts` | `calculateSpellSlots()`, `calculatePactMagic()` |
| `02-character-creation/species.md` | `src/data/species-data.ts` + `src/character/create.ts` | `createCharacter()` |
| `02-character-creation/background.md` | `src/data/background-data.ts` + `src/character/create.ts` | `createCharacter()` |
| `02-character-creation/class-subclass.md` | `src/data/class-data.ts` + `src/character/create.ts` | `createCharacter()` |
| `02-character-creation/ability-assignment.md` | `src/engine/ability-modifier.ts` + `src/character/create.ts` | `getModifier()`, `getTotalScore()` |
| `02-character-creation/feats.md` | `src/data/feat-data.ts` + `src/character/validate.ts` | `validateCharacter()` |
| `02-character-creation/skills.md` | `src/engine/skill-bonus.ts` | `getSkillBonus()` |
| `03-game-mode/layout.md` | **UI层(未来)** — 消费 `Character` + `CombatStats` | `recomputeDerivedStats()` |
| `04-hp-tracking/hp-tracking.md` | `src/character/mutate.ts` | `modifyHP()`, `setTemporaryHP()` |
| `04-hp-tracking/conditions.md` | `src/character/mutate.ts` | `toggleCondition()` |
| `05-spell-management/spell-list.md` | `src/data/spell-data.ts` | `DataLoader.getSpell()`, `getSpellsByLevel()` |
| `05-spell-management/spell-slots-tracking.md` | `src/character/mutate.ts` | `consumeSpellSlot()`, `recoverSpellSlot()` |
| `06-resource-tracking/resource-tracking.md` | `src/character/mutate.ts` | `consumeResource()`, `recoverResource()` |
| `07-level-up/level-up.md` | `src/character/level-up.ts` | `levelUp()` |
| `08-equipment/equipment.md` | `src/character/mutate.ts` | `equipItem()`, `unequipItem()`, `addEquipment()` |
| `08-equipment/weapon-mastery.md` | `src/engine/attack-calculator.ts` | `calculateAttacks()` |
| `09-data-safety/data-export-import.md` | `src/storage/serializer.ts` | `serialize()`, `deserialize()` |

---

## 14. 实现优先级

Agent应按以下顺序实现，每步完成后运行测试确认：

| 步骤 | 内容 | 前置依赖 | 交付物 | 状态 |
|---|---|---|---|---|
| **S1** | 项目脚手架 + tsconfig + vitest | 无 | `package.json`, `tsconfig.json`, `vitest.config.ts` | ✅ |
| **S2** | `src/types/*` — 全部类型定义 | S1 | 所有interface/type/enum | ✅ |
| **S3** | `src/data/loader.ts` + `default-loader.ts` — DataLoader接口 + 默认实现 | S2 | 接口+工厂+LookupTables | ✅ |
| **S4** | `src/engine/ability-modifier.ts` | S2 | `getModifier()`, `getTotalScore()` + 测试 | ✅ |
| **S5** | `src/engine/proficiency-bonus.ts` | S2 | `getProficiencyBonus()` + 测试 | ✅ |
| **S6** | `src/engine/skill-bonus.ts` | S4, S5 | `getSkillBonus()`, `getAllSkillBonuses()` | ✅ |
| **S7** | `src/engine/saving-throw.ts` | S4, S5 | `getSavingThrowBonus()` | ✅ |
| **S8** | `src/engine/ac-calculator.ts` | S2, S4 | `calculateAC()` + 测试 | ✅ |
| **S9** | `src/engine/hp-calculator.ts` | S2, S4 | `calculateMaxHP()` + 测试 | ✅ |
| **S10** | `src/engine/spell-slots.ts` | S2, S5 | `calculateSpellSlots()`, `calculatePactMagic()`, `getMulticlassSpellcasterLevel()`, `calculateMulticlassSpellSlots()` | ✅ |
| **S11** | `src/engine/initiative.ts` + `passive-perception.ts` + `attack-calculator.ts` | S4, S5 | + 测试 | ✅ |
| **S12** | `static/*.json` — 填充静态规则数据 | S3 | 所有JSON数据（feats/weapons/armor/gear/spells 已填充） | ✅ |
| **S13** | `src/character/create.ts` | S4-S11, S12 | `createCharacter()` + 测试 | 📋 |
| **S14** | `src/character/mutate.ts` | S13 | 所有mutate函数 + 测试 | 📋 |
| **S15** | `src/character/rest.ts` | S14 | `shortRest()`, `longRest()` + 测试 | 📋 |
| **S16** | `src/character/level-up.ts` | S14 | `levelUp()` + 测试 | 📋 |
| **S17** | `src/character/validate.ts` + `recompute.ts` | S13, S14 | `validateCharacter()`, `recomputeDerivedStats()` + 测试 | 📋 |
| **S18** | `src/storage/*` | S17 | 序列化/反序列化/存储 + 测试 | 📋 |
| **S19** | `src/index.ts` — barrel export | S18 | 完整公共API | 📋 |
| **S20** | 数据完整性测试 + 集成测试 | S19 | `tests/data/`, `tests/character/` | ✅ (40 tests) |

**关键路径**：S1 → S2 → S4 → S8/S9 → S13 → S14 → S19  
**预计耗时**：2-3个agent session（每个session处理5-6个步骤）

---

*本文档是技术实现的唯一约束源。任何实现必须遵守本文档中的命名规范、模块边界、依赖规则和函数签名。*
