# 需求 4.2.3：职业资源追踪

## 1. 需求描述

追踪职业专属的可消耗资源（如Rage次数、Focus Points、Second Wind等）。
每个资源有固定的重置方式（短休/长休/每回合/每日）。

---

## 2. 验收标准

- [ ] 根据职业自动创建资源计数器
- [ ] 资源显示：当前值/最大值（如 Rage ●●○）
- [ ] 点击资源 → used + 1（消耗）
- [ ] 点击已用资源 → used - 1（恢复）
- [ ] [短休] 按钮：重置 resetOn="Short Rest" 的资源
- [ ] [长休] 按钮：重置所有资源 + 恢复HP + 恢复法术位
- [ ] 资源数据结构记录 resetOn 字段

---

## 3. 数据模型

引用 `../../spec/data-model.md` 中的结构：

```typescript
// Character.resources: Resource[]
interface Resource {
  name: string;
  current: number;
  max: number;
  resetOn: "Short Rest" | "Long Rest" | "Per Turn" | "Daily" | "Never";
  displayType: "counter" | "dots" | "points";
}

// 示例数据
Character.resources = [
  { name: "Rage", current: 2, max: 3, resetOn: "Long Rest", displayType: "dots" },
  { name: "Focus Points", current: 3, max: 6, resetOn: "Short Rest", displayType: "points" },
  { name: "Second Wind", current: 0, max: 1, resetOn: "Short Rest", displayType: "counter" },
  { name: "Sneak Attack", current: 1, max: 1, resetOn: "Per Turn", displayType: "counter" },
]
```

resetOn 枚举说明：

| resetOn 值 | 含义 | 典型资源 |
|-----------|------|----------|
| Short Rest | 短休后重置 | Second Wind, Focus Points |
| Long Rest | 长休后重置 | Rage, Wild Shape |
| Per Turn | 每回合重置 | Sneak Attack |
| Daily | 每日重置 | 某些 DMG 可选规则 |
| Never | 永不自动重置 | 需手动管理 |

---

## 4. 边界情况

| 场景 | 处理方式 |
|------|----------|
| 多职业角色 | 合并所有职业资源，同名资源不重复 |
| current > max | 自动钳制到 max |
| current < 0 | 自动钳制到 0 |
| 点击 used == max | 不再增加 |
| 长休触发 | 重置所有 resetOn="Long Rest" 和 resetOn="Short Rest" 的资源 |
| 短休触发 | 仅重置 resetOn="Short Rest" 的资源 |
| 每回合重置资源 | 在"新回合"操作时自动重置（需回合追踪功能支持） |

---

## 5. 参考资料

- PRD v4.0 §4.2 自动计算
- PRD v4.0 §10 附录B 职业资源追踪清单
- 2024 PHB 各职业章节（Barbarian p.20, Monk p.45, Fighter p.30 等）
