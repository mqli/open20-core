# 测试计划 (Test Plan)

> **版本**: v1.0
> **日期**: 2025-07-17
> **目标**: 定义 DND 2024 Character Sheet 项目的测试策略、覆盖范围和执行计划

---

## 1. 测试范围

### 1.1 测试目标
- 验证所有 DND 2024 规则计算的正确性
- 确保不可变状态管理的正确性
- 验证数据完整性 (JSON 文件格式和内容)
- 确保模块化架构的依赖规则不被破坏
- 达到 MVP 可用的质量标准

### 1.2 测试级别
1. **单元测试 (Unit Tests)** - 已完成 375 个测试
2. **集成测试 (Integration Tests)** - S20，未开始
3. **数据完整性测试 (Data Integrity Tests)** - S20 的一部分
4. **端到端测试 (E2E Tests)** - 可选，CLI demo 时补充

---

## 2. 当前测试状态

### 2.1 已完成的测试 (S1-S11, S13-S19)

| 模块 | 文件 | 测试数 | 覆盖率 | 状态 |
|------|------|--------|--------|------|
| **Engine** | | **201** | | |
| 能力值调整值 | `tests/engine/ability-modifier.test.ts` | 14 | 100% | ✅ |
| 熟练加值 | `tests/engine/proficiency-bonus.test.ts` | 9 | 100% | ✅ |
| 技能加值 | `tests/engine/skill-bonus.test.ts` | 37 | 100% | ✅ |
| 豁免加值 | `tests/engine/saving-throw.test.ts` | 27 | 100% | ✅ |
| AC 计算 | `tests/engine/ac-calculator.test.ts` | 10 | 100% | ✅ |
| HP 计算 | `tests/engine/hp-calculator.test.ts` | 17 | 100% | ✅ |
| 法术位 | `tests/engine/spell-slots.test.ts` | 34 | 100% | ✅ |
| 先攻 | `tests/engine/initiative.test.ts` | 24 | 100% | ✅ |
| 被动感知 | `tests/engine/passive-perception.test.ts` | 20 | 100% | ✅ |
| 攻击计算 | `tests/engine/attack-calculator.test.ts` | 19 | 100% | ✅ |
| **Character** | | **144** | | |
| 创建角色 | `tests/character/create.test.ts` | 46 | 100% | ✅ |
| 变更操作 | `tests/character/mutate.test.ts` | 38 | 100% | ✅ |
| 休息系统 | `tests/character/rest.test.ts` | 20 | 100% | ✅ |
| 升级系统 | `tests/character/level-up.test.ts` | 13 | 100% | ✅ |
| 验证系统 | `tests/character/validate.test.ts` | 15 | 100% | ✅ |
| 重计算 | `tests/character/recompute.test.ts` | 12 | 100% | ✅ |
| **Storage** | | **20** | | |
| 序列化 | `tests/storage/serializer.test.ts` | 20 | 100% | ✅ |
| **总计** | **17 个测试文件** | **375** | **~95%** | ✅ |

### 2.2 覆盖率的盲区
虽然测试数量多，但存在以下盲区：

1. **Mock 数据问题**: 所有测试使用 mock 数据，不是真实 DND 2024 数据
   - 例: `createCharacter()` 测试用 mock `DataLoader`，不是真实职业/种族
   - 风险: 真实数据可能暴露边界情况或格式问题

2. **多职业场景**: 测试主要覆盖单职业，多职业测试不足
   - `calculateSpellSlots()` 有多职业逻辑，但测试用例有限
   - `levelUp()` 的多职业升级路径未充分测试

3. **子职业测试**: 子职业特性未充分测试
   - `recomputeDerivedStats()` 应该收集所有子职业特性
   - 目前测试用 mock 特性，未测试真实子职业

4. **边界情况**: 一些极端情况未测试
   - 死亡和死亡豁免 (`DeathSaves`)
   - 多种状态叠加 (例如: 临时 HP + 伤害吸收)
   - 法术位恢复的边缘情况 (多职业法师/邪术师)

---

## 3. 待完成的测试 (S20)

### 3.1 数据完整性测试 (Priority: HIGH)

**目标**: 验证所有 `static/*.json` 文件的格式正确、内容完整。

#### 3.1.1 `lookup-tables.json` 验证
- [ ] `proficiencyBonus` 包含 1-20 所有等级
- [ ] `hitDieFixedValue` 包含所有骰子类型 (d4-d12, d20)
- [ ] `spellSlots` 包含所有施法职业 (Wizard, Cleric, Druid, Sorcerer, Bard, Paladin, Ranger, 非施法者)
- [ ] `multiclassSpellSlots` 包含 1-20 级
- [ ] `pactMagicSlots` 包含 1-20 级
- [ ] `weaponMasteryProperties` 包含 8 个属性
- [ ] `conditionNames` 包含 16 个状态

#### 3.1.2 `species.json` 验证
- [ ] 包含 12 个种族 (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Tiefling, Orc, Goliath, Half-Elf, Half-Orc, Aasimar)
- [ ] 每个种族有正确的 `abilityBonuses` (使用全名: "Strength", not "Str")
- [ ] 每个种族有 `baseTraits` 数组
- [ ] 每个种族有 `subtypes` 数组
- [ ] `darkvision` 字段存在且合理

#### 3.1.3 `backgrounds.json` 验证
- [ ] 包含 16 个背景
- [ ] 每个背景有 `skillProficiencies` (1-2 个技能)
- [ ] 每个背景有 `originFeatId` (字符串，不是对象)
- [ ] 每个背景有 `startingGold`

#### 3.1.4 `classes.json` 验证
- [ ] 包含 12 个职业
- [ ] 每个职业有 `hitDie` (d6-d12)
- [ ] 每个职业有 `savingThrowProficiencies` (2 个能力值)
- [ ] 每个职业有 `featuresByLevel` (数组格式: `[[1, [...]], [2, [...]]]`)
- [ ] 施法职业有正确的 `spellcasting` 对象

#### 3.1.5 `subclasses.json` 验证
- [ ] 每个职业至少有一个子职业
- [ ] 每个子职业有 `parentClass` 匹配父职业
- [ ] 每个子职业有 `grantedAtLevel` (通常是 3)
- [ ] 每个子职业有 `featuresByLevel` (数组格式)

#### 3.1.6 `feats.json` 验证 (待填充)
- [ ] 包含 75 个专长
- [ ] 每个专长有正确的字段 (`name`, `description`, `prerequisites`, `benefits`)
- [ ] 专长分类正确 (Origin, Fighting Style, Epic Boon, General)

#### 3.1.7 `weapons.json` 验证 (待填充)
- [ ] 包含 ~40 把武器
- [ ] 每个武器有 `mastery` (单个值，不是数组)
- [ ] 每个武器有 `damage`, `properties`, `weight`, `cost`

#### 3.1.8 `armor.json` 验证 (待填充)
- [ ] 包含 ~20 套护甲/盾牌
- [ ] 每个护甲有 `ac`, `dexBonus`, `maxDexBonus`, `stealthDisadvantage`

#### 3.1.9 `gear.json` 验证 (待填充)
- [ ] 包含 ~50 件装备
- [ ] 每个装备有 `weight`, `cost`, `category`

#### 3.1.10 `spells.json` 验证 (待填充)
- [ ] 包含 ~391 个法术
- [ ] 每个法术有 `level`, `school`, `castingTime`, `range`, `components`, `duration`

**实现方式**: 创建 `tests/data/integrity.test.ts`，使用 `default-loader.ts` 加载所有 JSON 文件，验证格式和内容。

---

### 3.2 端到端集成测试 (Priority: MEDIUM)

**目标**: 验证完整角色生命周期 (创建 → 游戏 → 升级)。

#### 3.2.1 完整角色创建流程
- [ ] 创建等级 1 角色 (所有种族 + 职业组合，至少覆盖 3-5 个典型组合)
- [ ] 验证初始 HP 正确 (固定值或掷骰)
- [ ] 验证初始法术 (如果有)
- [ ] 验证初始装备 (如果有)
- [ ] 验证 `recomputeDerivedStats()` 计算正确

**典型测试用例**:
```
1. 人类战士 (Human Fighter)
   - 种族特性: 2 个免费能力值提升
   - 背景: Soldier (Athletics, Perception)
   - 职业特性: Fighting Style, Second Wind
   - 初始装备: Chain Mail, Longsword, Shield
   - 验证: AC=18, HP=10+Con, 熟练豁免: Str+Con

2. 精灵法师 (High Elf Wizard)
   - 种族特性: Keen Senses, Fey Ancestry, Trance, Elf Weapon Training, Extra Cantrip
   - 背景: Sage (Arcana, History)
   - 职业特性: Spellcasting, Ritual Casting
   - 初始法术: 3 戏法, 4 1级法术
   - 验证: 法术位=2, 法术豁免DC=8+Prof+Int, 黑暗视觉 60ft

3. 半身_halfling_rogue (Lightfoot Halfling Rogue)
   - 种族特性: Brave, Halfling Nimbleness, Lucky
   - 背景: Charlatan (Deception, Sleight of Hand)
   - 职业特性: Sneak Attack, Thieves' Cant
   - 验证: 技能熟练: Deception, Sleight of Hand, Stealth, Investigation (4个)
```

#### 3.2.2 游戏过程模拟
- [ ] 受到伤害 → `modifyHP()` → 验证 HP 减少
- [ ] 获得临时 HP → `setTemporaryHP()` → 验证临时 HP 吸收伤害
- [ ] 短休 → `shortRest()` → 花费生命骰，恢复 HP
- [ ] 长休 → `longRest()` → 完全恢复
- [ ] 使用法术位 → `consumeSpellSlot()` → 验证法术位减少
- [ ] 准备法术 → `prepareSpell()` / `unprepareSpell()` → 验证准备列表
- [ ] 获得状态 → `toggleCondition()` → 验证状态影响 (例如: 倒地 → 攻击劣势)
- [ ] 装备物品 → `equipItem()` / `unequipItem()` → 验证 AC 重计算

#### 3.2.3 升级流程
- [ ] 等级 1 → 2 (典型升级)
- [ ] 等级 3 → 4 (获得专长/能力值提升)
- [ ] 等级 2 → 3 (获得子职业)
- [ ] 验证 HP 增加 (固定值或掷骰，测试两种)
- [ ] 验证新特性解锁
- [ ] 验证法术位升级 (施法者)
- [ ] 验证新法术获得 (施法者)

**多职业升级测试** (重要！):
```
1. 战士 1 / 法师 1 → 选择升级哪个职业
   - 升级战士: HP + d10, 新战士特性
   - 升级法师: HP + d6, 新戏法/法术, 法术位变化 (多职业法术位表)

2. 邪术师 2 / 法师 1 → 邪术师法术位 vs 法师法术位
   - Pact Magic (邪术师) 和 Spell Slots (法师) 分开计算
   - 验证 shortRest() 只恢复邪术师法术位
```

#### 3.2.4 不可变状态验证
- [ ] 所有变更函数返回新对象 (`expect(result).not.toBe(original)`)
- [ ] 原始对象不被修改 (`expect(original.hitPoints.current).toBe(oldValue)`)
- [ ] `updatedAt` 时间戳更新

#### 3.2.5 序列化和反序列化
- [ ] 创建复杂角色 → `serialize()` → `deserialize()` → 验证恢复正确
- [ ] 验证 Zod 校验捕获无效 JSON
- [ ] 验证 `validateCharacter()` 捕获无效状态

**实现方式**: 创建 `tests/integration/character-lifecycle.test.ts` 和 `tests/integration/multiclass.test.ts`。

---

### 3.3 性能和边界测试 (Priority: LOW - MVP 后可做)

- [ ] 创建 100 个角色的时间 (< 1s)
- [ ] `recomputeDerivedStats()` 对复杂角色的时间 (< 100ms)
- [ ] 大型法术列表的序列化性能
- [ ] 内存泄漏检测 (重复创建/销毁角色)

---

## 4. 测试执行计划

### 4.1 阶段 1: 数据完整性测试 (预计 2-3 小时)
**前提**: 需要先填充部分数据 (至少 feats, weapons, armor)
1. 创建 `tests/data/integrity.test.ts`
2. 验证所有 JSON 文件格式
3. 验证所有必需字段存在
4. 验证枚举值合理 (例如: `abilityBonuses` 使用有效能力值名称)

### 4.2 阶段 2: 端到端集成测试 (预计 3-4 小时)
**前提**: 完成阶段 1，数据完整性通过
1. 创建 `tests/integration/character-lifecycle.test.ts`
2. 实现 3-5 个典型角色的完整流程测试
3. 创建 `tests/integration/multiclass.test.ts`
4. 测试多职业升级和法术位计算

### 4.3 阶段 3: 数据填充 (预计 6-8 小时)
**与测试并行**: 填充数据时发现格式问题，立即写测试验证
1. 填充 `feats.json` (75 个专长)
2. 填充 `weapons.json` (~40 把武器)
3. 填充 `armor.json` (~20 套护甲)
4. 填充 `gear.json` (~50 件装备)
5. 增量填充 `spells.json` (~391 个法术，优先级: 戏法 → 1级 → 2级 → ...)

### 4.4 阶段 4: 覆盖率和质量检查 (预计 1-2 小时)
1. 运行 `npx vitest run --coverage`
2. 确保 `engine/` 和 `character/` 100% 覆盖率
3. 修复任何失败的测试
4. `npx tsc --noEmit` 确保零错误

---

## 5. 验收标准 (MVP)

### 5.1 功能验收
- [ ] 可以创建任意种族 + 职业的等级 1 角色
- [ ] 可以正确计算所有衍生数值 (AC, HP, 技能, 豁免, 攻击加值, 法术DC)
- [ ] 可以执行短休和长休
- [ ] 可以升级 (单职业和多职业)
- [ ] 可以装备/卸下物品，自动重计算 AC
- [ ] 可以准备/取消准备法术
- [ ] 可以序列化和反序列化角色 (JSON)
- [ ] 可以验证角色状态有效性

### 5.2 质量验收
- [ ] 所有 375 个现有测试通过
- [ ] 数据完整性测试通过 (S20)
- [ ] 至少 5 个端到端集成测试通过 (S20)
- [ ] `engine/` 和 `character/` 覆盖率 100%
- [ ] `tsc --noEmit` 零错误
- [ ] 所有 JSON 数据文件填充完成 (或至少核心数据: feats, weapons, armor)

### 5.3 性能验收 (目标，非强制)
- [ ] 创建角色 < 100ms
- [ ] 重计算衍生数值 < 50ms
- [ ] 序列化/反序列化 < 50ms

---

## 6. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| DND 2024 规则理解错误 | 高 | 交叉验证多个来源 (Player's Handbook, D&D Beyond) |
| 数据填充错误 (例如: 法术数据格式错误) | 中 | 数据完整性测试 (S20) 捕获格式错误 |
| 多职业法术位计算错误 | 高 | 专门的集成测试覆盖多职业场景 |
| 不可变状态被破坏 | 中 | 所有变更函数的测试都验证不可变性 |
| 大型数据集性能问题 (391 个法术) | 低 | MVP 不强制所有法术，可增量添加 |

---

## 7. 工具和环境

### 7.1 测试框架
- **Vitest**: 单元测试和集成测试运行器
- **@vitest/coverage**: 覆盖率报告 (v8/v9)

### 7.2 测试辅助工具
- **Zod**: 运行时 schema 验证 (仅用于 JSON 导入边界)
- **createRequire**: ESM 环境下的 JSON 加载

### 7.3 CI/CD (未来)
- 每次提交自动运行 `npx vitest run`
- 每次 PR 检查覆盖率不低于 95%
- 每次 PR 检查 `tsc --noEmit` 零错误

---

## 8. 附录: 测试文件清单

### 8.1 现有测试文件 (17 个)
```
tests/
├── engine/
│   ├── ability-modifier.test.ts          (14 tests)
│   ├── proficiency-bonus.test.ts         (9 tests)
│   ├── skill-bonus.test.ts               (37 tests)
│   ├── saving-throw.test.ts              (27 tests)
│   ├── ac-calculator.test.ts             (10 tests)
│   ├── hp-calculator.test.ts             (17 tests)
│   ├── spell-slots.test.ts               (34 tests)
│   ├── initiative.test.ts                (24 tests)
│   ├── passive-perception.test.ts        (20 tests)
│   └── attack-calculator.test.ts         (19 tests)
├── character/
│   ├── create.test.ts                    (46 tests)
│   ├── mutate.test.ts                    (38 tests)
│   ├── rest.test.ts                      (20 tests)
│   ├── level-up.test.ts                  (13 tests)
│   ├── validate.test.ts                  (15 tests)
│   └── recompute.test.ts                 (12 tests)
└── storage/
    └── serializer.test.ts                (20 tests)
```

### 8.2 待创建测试文件 (S20)
```
tests/
├── data/
│   └── integrity.test.ts                 (预计 50+ tests)
└── integration/
    ├── character-lifecycle.test.ts        (预计 20+ tests)
    └── multiclass.test.ts                 (预计 15+ tests)
```

---

## 9. 总结

| 任务 | 优先级 | 预计时间 | 依赖 |
|------|--------|----------|------|
| 数据完整性测试 | HIGH | 2-3h | 部分数据填充 |
| 端到端集成测试 | MEDIUM | 3-4h | 数据完整性测试 |
| 填充 feats.json | HIGH | 1-2h | 无 |
| 填充 weapons.json | HIGH | 1h | 无 |
| 填充 armor.json | HIGH | 30min | 无 |
| 填充 gear.json | MEDIUM | 1h | 无 |
| 填充 spells.json | LOW | 4-6h | 无 |
| 性能和边界测试 | LOW | 1-2h | 所有数据填充完成 |

**推荐顺序**:
1. **先填充核心数据** (feats → weapons → armor, 预计 2.5-3.5h)
2. **数据完整性测试** (预计 2-3h)
3. **端到端集成测试** (预计 3-4h)
4. **填充剩余数据** (gear → spells, 可增量)
5. **性能和边界测试** (可选)

---

*最后更新: 2025-07-17*
*作者: AI Agent (WorkBuddy)*
