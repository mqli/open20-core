# 开发任务拆解列表

> 本文档与 HLD §14 实现优先级对齐，按 S1-S20 步骤管理。
> Agent 可直接认领单个任务，完成后更新状态。

---

## 任务状态说明

| 标记 | 含义 |
|---|---|
| 📋 | 待开发 |
| 🔄 | 进行中 |
| ✅ | 已完成 |
| ❌ | 已阻塞 |

---

## Phase 1 — 规则引擎与数据层（S1-S12）

### S1 — 项目脚手架 ✅

| 文件 | 说明 |
|---|---|
| `package.json` | @dnd2024/core, type:module, zod运行时依赖 |
| `tsconfig.json` | ES2022, Node16, strict, noUncheckedIndexedAccess |
| `vitest.config.ts` | V8 coverage, @/ path alias |

### S2 — 类型定义 ✅

| 文件 | 核心类型 |
|---|---|
| `src/types/ability.ts` | `AbilityName`, `AbilityScores`, `ABILITY_NAMES` |
| `src/types/character.ts` | `Character`, `CharacterClass`, `HitPoints`, `DeathSaves`, `CombatStats`, `Attack`, `ActiveCondition`, `ConditionName`, `Currency`, `DieType` |
| `src/types/species.ts` | `Species`, `SpeciesTrait`, `SpeciesGrant`, `SpeciesSubtype` |
| `src/types/background.ts` | `Background` (含 `originFeatId`) |
| `src/types/class.ts` | `Class`, `Subclass`, `Feature`, `Spellcasting`, `MulticlassSpellSlotEntry` |
| `src/types/skill.ts` | `SkillName`, `SKILL_NAMES`, `SKILL_ABILITY_MAP`, `SkillEntry` |
| `src/types/feat.ts` | `Feat`, `FeatCategory`, `FeatPrerequisite`, `FeatGrant` |
| `src/types/equipment.ts` | `EquipmentItem`, `Weapon`, `Armor`, `GearItem`, `WeaponMasteryProperty`, `WeaponProperty`, `WeaponDamage`, `WeaponRange` |
| `src/types/spell.ts` | `Spell`, `CharacterSpells`, `SpellSlotEntry`, `PactMagicSlots`, `SpellLevel`, `SpellSchool`, `CastingTime`, `SpellComponent` |
| `src/types/resource.ts` | `Resource`, `ResetType`, `DisplayType` |
| `src/types/index.ts` | barrel export |

### S3 — DataLoader 接口 + 默认实现 ✅

| 文件 | 说明 |
|---|---|
| `src/data/loader.ts` | `DataLoader` 接口(20+方法) + `LookupTables` 类型 + `createDataLoader()` 工厂 |
| `src/data/default-loader.ts` | 默认实现（从 `static/*.json` 加载） |

### S4-S11 — Engine 纯函数 ✅

| 步骤 | 文件 | 核心函数 | 测试 |
|---|---|---|---|
| S4 | `src/engine/ability-modifier.ts` | `getModifier()`, `getTotalScore()` | ✅ 13 tests |
| S5 | `src/engine/proficiency-bonus.ts` | `getProficiencyBonus()` | ✅ 9 tests |
| S6 | `src/engine/skill-bonus.ts` | `getSkillBonus()`, `getAllSkillBonuses()` | 📋 待补 |
| S7 | `src/engine/saving-throw.ts` | `getSavingThrowBonus()` | 📋 待补 |
| S8 | `src/engine/ac-calculator.ts` | `calculateAC()` | ✅ 14 tests |
| S9 | `src/engine/hp-calculator.ts` | `getHitDieFixedValue()`, `calculateHPAtLevel1()`, `calculateHPIncrement()`, `calculateMaxHP()` | ✅ 14 tests |
| S10 | `src/engine/spell-slots.ts` | `calculateSpellSlots()`, `calculatePactMagic()`, `getMulticlassSpellcasterLevel()`, `calculateMulticlassSpellSlots()` | 📋 待补 |
| S11a | `src/engine/initiative.ts` | `calculateInitiative()` | 📋 待补 |
| S11b | `src/engine/passive-perception.ts` | `calculatePassivePerception()` | 📋 待补 |
| S11c | `src/engine/attack-calculator.ts` | `calculateAttacks()` | 📋 待补 |

> **当前测试**: 50 tests passing（ability-modifier 13 + proficiency-bonus 9 + hp-calculator 14 + ac-calculator 14）

### S12 — 静态规则数据填充 📋

| 文件 | 数据量 | 状态 |
|---|---|---|
| `static/species.json` | 12个物种 | 📋 骨架 |
| `static/backgrounds.json` | 16个背景 | 📋 骨架 |
| `static/classes.json` | 12个职业 | 📋 骨架 |
| `static/subclasses.json` | 所有子职业 | 📋 骨架 |
| `static/feats.json` | 75个专长 | 📋 骨架 |
| `static/spells.json` | ~391个法术 | 📋 骨架 |
| `static/weapons.json` | 武器列表 | 📋 骨架 |
| `static/armor.json` | 护甲列表 | 📋 骨架 |
| `static/gear.json` | 冒险装备 | 📋 骨架 |
| `static/lookup-tables.json` | 查表数据 | 📋 骨架 |

---

## Phase 2 — 角色状态管理（S13-S17）

| 步骤 | 文件 | 核心函数 | 状态 |
|---|---|---|---|
| S13 | `src/character/create.ts` | `createCharacter(params, data)` | 📋 |
| S14 | `src/character/mutate.ts` | `modifyHP()`, `setTemporaryHP()`, `consumeResource()`, `recoverResource()`, `consumeSpellSlot()`, `recoverSpellSlot()`, `toggleCondition()`, `equipItem()`, `unequipItem()`, `prepareSpell()`, `unprepareSpell()`, `addEquipment()`, `removeEquipment()`, `modifyCurrency()` | 📋 |
| S15 | `src/character/rest.ts` | `shortRest()`, `longRest()` | 📋 |
| S16 | `src/character/level-up.ts` | `levelUp()` | 📋 |
| S17 | `src/character/validate.ts` + `recompute.ts` | `validateCharacter()`, `recomputeDerivedStats()` | 📋 |

---

## Phase 3 — 持久化与集成（S18-S20）

| 步骤 | 文件 | 核心函数 | 状态 |
|---|---|---|---|
| S18 | `src/storage/*` | `ICharacterStorage`, `InMemoryStorage`, `JsonFileStorage`, `serialize()`, `deserialize()` | 📋 |
| S19 | `src/index.ts` | 完整公共API barrel export | 📋 |
| S20 | `tests/data/`, `tests/character/` | 数据完整性测试 + 集成测试 | 📋 |

---

## 补充测试任务

| 文件 | 覆盖模块 | 状态 |
|---|---|---|
| `tests/engine/skill-bonus.test.ts` | `getSkillBonus()`, `getAllSkillBonuses()` | 📋 |
| `tests/engine/saving-throw.test.ts` | `getSavingThrowBonus()` | 📋 |
| `tests/engine/spell-slots.test.ts` | `calculateSpellSlots()`, `calculatePactMagic()`, `getMulticlassSpellcasterLevel()`, `calculateMulticlassSpellSlots()` | 📋 |
| `tests/engine/initiative.test.ts` | `calculateInitiative()` | 📋 |
| `tests/engine/passive-perception.test.ts` | `calculatePassivePerception()` | 📋 |
| `tests/engine/attack-calculator.test.ts` | `calculateAttacks()` | 📋 |

---

## 依赖关系

```
S1 → S2 → S3 → S12
         ↓
    S4 → S6, S7, S8, S9
    S5 → S6, S7, S10
    S4+S5 → S11
    S4-S11+S12 → S13 → S14 → S15, S16
                            S13+S14 → S17
                            S17 → S18 → S19 → S20
```

**关键路径**: S1 → S2 → S4 → S8/S9 → S12 → S13 → S14 → S19

---

## Agent 认领格式

在任务状态栏更新：

```
| S6 | `src/engine/skill-bonus.ts` | 🔄 Agent-A |
```

完成后：

```
| S6 | `src/engine/skill-bonus.ts` | ✅ Agent-A |
```
