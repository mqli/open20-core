# 需求：武器精通（Weapon Mastery）

## 需求描述

Weapon Mastery 是 2024 规则的主要新机制。

具有 Weapon Mastery 的职业（Barbarian / Fighter / Paladin / Ranger / Rogue）可以访问武器精通属性。

## 验收标准

- [ ] 具有 Weapon Mastery 的职业在游戏模式显示 "Weapon Mastery" 区域
- [ ] 装备武器时，显示该武器的精通属性（1-2个）
- [ ] 8个精通属性完整支持：Cleave / Graze / Nick / Push / Sap / Slow / Tople / Vex
- [ ] 精通属性描述可在法术卡片式弹窗中查看
- [ ] 应用中记录使用的精通属性（不自动计算伤害，需DM判定）
- [ ] 多把武器时，显示每把武器的精通属性

## 数据模型

引用 `../../spec/data-model.md` 中的以下结构：

- `Weapon` JSON 含 `masteryProperty: ["Cleave", "Tople"]`
- `Character.resources` 中含 Weapon Mastery 使用次数（如有）
- `Character.classes[].classFeatures` 含 "Weapon Mastery" 特性时激活该功能

## 边界情况

- 非 Weapon Mastery 职业的角色，不显示 Weapon Mastery 区域
- 武器无精通属性时（如即兴武器），不显示精通属性
- 同一角色有多把武器，每把武器的精通属性独立显示
- Weapon Mastery 使用次数受职业等级限制（Fighter 每短休恢复）

## 参考资料

- PRD v4.0 §4.1 角色创建（Weapon Mastery 提到）
- 2024 PHB p.148-149 Weapon Mastery 规则
- 2024 PHB p.214-215 精通属性描述
