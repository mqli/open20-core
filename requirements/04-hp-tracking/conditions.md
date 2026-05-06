# 需求 4.3.4：状态（Conditions）追踪

## 1. 需求描述

追踪角色当前状态（Conditions）。2024规则有14个标准状态，影响AC/攻击/豁免等计算。

---

## 2. 验收标准

- [ ] 显示14个标准状态图标（可点击切换）
- [ ] 状态可多选（可同时Prone + Grappled）
- [ ] 每个状态有简短描述（tooltip）
- [ ] Prone状态：攻击角色的攻击掷骰对角色有优势/劣势（视觉提示）
- [ ] Incapacitated状态：角色不能行动（视觉提示）
- [ ] 状态列表可滚动（屏幕空间有限时）
- [ ] 长休后自动清除所有状态

---

## 3. 数据模型

引用 `../../spec/data-model.md` 中的结构：

```typescript
// Character.conditions: string[]
// 存储当前生效的状态名称（枚举值）
Character.conditions = ["Grappled", "Concentrating"]

// 14个标准状态枚举（2024规则）
type ConditionType =
  | "Blinded"
  | "Charmed"
  | "Deafened"
  | "Exhaustion"    // 含等级1-6
  | "Frightened"
  | "Grappled"
  | "Incapacitated"
  | "Invisible"
  | "Paralyzed"
  | "Petrified"
  | "Poisoned"
  | "Prone"
  | "Restrained"
  | "Stunned"
  | "Unconscious"
  | "Concentrating";  // 不是官方状态，但施法集中需追踪
```

状态效果对计算的影响（在 `derivedStats` 计算时考虑）：

| 状态 | 影响的计算 |
|------|-----------|
| Blinded | 攻击掷骰具有劣势；承受攻击掷骰具有优势 |
| Prone | 近战攻击掷骰具有劣势；远程攻击掷骰具有劣势；承受远程攻击掷骰具有优势 |
| Incapacitated | 不能执行动作或Bonus Action |
| Grappled | 速度 = 0 |
| Restrained | 攻击掷骰具有劣势；DEX豁免具有劣势；速度 = 0 |
| Stunned | 失去所有动作；攻击掷骰具有劣势；承受攻击掷骰具有优势 |
| Unconscious | HP = 0 或稳定状态；对角色攻击自动暴击 |

---

## 4. 边界情况

| 场景 | 处理方式 |
|------|----------|
| 同时有多个状态 | 效果叠加（取最不利） |
| Exhaustion | 显示等级选择器（1-6级），每级效果不同 |
| Concentrating | 受到伤害需做DC10+伤害量的CON豁免维持集中 |
| 长休 | 清除所有状态（Exhaustion需手动降低等级） |
| 状态数量超过屏幕 | 横向滚动或折叠显示 |
| 无效状态名写入 | 忽略，不加入 conditions 数组 |

---

## 5. 参考资料

- PRD v4.0 §4.3 游戏模式（状态标记）
- 2024 PHB p.30 状态规则
- 2024 PHB p.363-370 附录A：Conditions
- SRD 5.2 Appendix A: Conditions
