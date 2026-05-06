# DND 2024 角色表 App — 需求索引

> 本文档是需求文件的入口。每个需求对应一个独立文件，方便 agent 认领实现。

---

## 需求与文件映射

| # | 需求 | 对应文件 | 对应源码 | 优先级 | 状态 |
|---|---|---|---|---|
| R1 | 规则引擎 — 属性/技能/豁免计算 | - | `src/engine/ability-modifier.ts`, `skill-bonus.ts`, `saving-throw.ts` | P0 | ✅ S4-S7 已完成 |
| R2 | 规则引擎 — AC计算 | - | `src/engine/ac-calculator.ts` | P0 | ✅ S8 已完成 |
| R3 | 规则引擎 — HP计算 | - | `src/engine/hp-calculator.ts` | P0 | ✅ S9 已完成 |
| R4 | 规则引擎 — 法术位计算 | - | `src/engine/spell-slots.ts` | P0 | ✅ S10 已完成 |
| R5 | 角色创建 — 物种(Species) | - | `src/data/default-loader.ts` + `src/character/create.ts` | P0 | ✅ S12 已完成 |
| R6 | 角色创建 — 背景(Background) | - | `src/data/default-loader.ts` + `src/character/create.ts` | P0 | ✅ S12 已完成 |
| R7 | 角色创建 — 职业(Class) + 子职业 | - | `src/data/default-loader.ts` + `src/character/create.ts` | P0 | ✅ S12 已完成 |
| R8 | 角色创建 — 属性分配 | - | `src/engine/ability-modifier.ts` + `src/character/create.ts` | P0 | ✅ S12 已完成 |
| R9 | 角色创建 — 专长(Feats) | - | `src/data/default-loader.ts` + `src/character/validate.ts` | P0 | ✅ S12 已完成 |
| R10 | 角色创建 — 技能(Skills) | - | `src/engine/skill-bonus.ts` | P0 | ✅ S12 已完成 |
| R11 | 游戏模式 — 布局与交互 | - | **UI层(未来)** — 消费 Character + CombatStats | P0 | 📋 待开发 |
| R12 | HP追踪 — 当前HP/临时HP/死亡豁免 | - | `src/character/mutate.ts` | P0 | ✅ S13 已完成 |
| R13 | 法术管理 — 法术列表/准备 | - | `src/character/mutate.ts` + `recompute.ts` | P0 | ✅ S12/S13 已完成 |
| R14 | 法术管理 — 法术位追踪 | - | `src/character/mutate.ts` | P0 | ✅ S13 已完成 |
| R15 | 资源追踪 — 职业资源计数器 | - | `src/character/mutate.ts` | P0 | ✅ S13 已完成 |
| R16 | 等级提升 — 升级向导 | - | `src/character/level-up.ts` | P0 | ✅ S15 已完成 |
| R17 | 装备管理 — 武器/护甲/物品/金币 | - | `src/character/mutate.ts` + `recompute.ts` | P0 | 🔄 S12 数据完成 |
| R18 | 武器精通(Weapon Mastery) | - | `src/engine/attack-calculator.ts` | P0 | ✅ S11 已完成 |
| R19 | 数据安全 — 保存/导出/导入 | - | `src/storage/*` | P0 | ✅ S17 已完成 |
| R20 | 状态标记(Conditions) | - | `src/character/mutate.ts` | P0 | ✅ S13 已完成 |
| R21 | 多职业(Multiclassing) | - | `src/engine/spell-slots.ts` + `src/character/create.ts` | P1 | 🔄 引擎完成 |

---

## P1 需求索引

| # | 需求 | 说明 | 状态 |
|---|---|---|---|
| R21 | 多职业(Multiclassing) | `calculateMulticlassSpellSlots()` 已实现引擎层 | 🔄 引擎完成 |
| R22 | 2014遗留内容支持 | Half-Elf/Half-Orc + 遗留子职业/专长 | 📋 |
| R23 | 自定义特性(Homebrew free text) | 允许手动添加特性描述 | 📋 |
| R24 | 多角色管理 | 角色列表+快速切换 | 📋 |
| R25 | 快速掷骰复制到剪贴板 | 所有加值字段支持点击复制 | 📋 |

---

## 实现进度总览 (HLD S1-S20)

| HLD步骤 | 内容 | 状态 |
|---|---|---|
| S1 | 项目脚手架 | ✅ |
| S2 | 类型定义 | ✅ |
| S3 | DataLoader接口+实现 | ✅ |
| S4-S11 | Engine纯函数 (8个) | ✅ (201 tests) |
| S12 | 静态规则数据填充 | 🔄 大部分完成 |
| S13-S19 | 角色状态管理 | ✅ (144 tests) |
| S20 | 集成测试 | ✅ (40 tests) |

**当前测试状态**: **415 tests passing**, `tsc --noEmit` ✅

---

## 文件命名规范

```
<目录>/<功能名>.md
```

示例:
```
01-rules-engine/ac-calculation.md
02-character-creation/species.md
```

每个文件包含：
- **需求描述** — 这个功能做什么
- **验收标准** — 怎样算做完
- **数据模型** — 需要什么数据结构
- **边界情况** — 容易出错的地方
- **参考资料** — 对应PRD的章节

---

## Agent 认领规范

在开始实现某个需求前，请在对应文件的顶部更新状态：

```markdown
---
status: in-progress
agent: <agent-name>
started: YYYY-MM-DD
---
```

完成后：

```markdown
---
status: done
agent: <agent-name>
started: YYYY-MM-DD
finished: YYYY-MM-DD
---
```

---

## 快速导航

- **PRD主文档**: `PRD.md`（项目根目录）
- **技术设计(HLD)**: `spec/high-level-design.md`
- **数据模型**: `spec/data-model.md`
- **任务拆解**: `tasks/task-list.md`
- **Agent指南**: `agent.md`
- **测试计划**: `spec/test-plan.md`
