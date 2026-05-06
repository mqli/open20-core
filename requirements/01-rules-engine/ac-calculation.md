# 规则引擎 — AC计算

> 对应 PRD v4.0 §4.2 & §10附录D

---

## 需求描述

AC(Armor Class)是所有职业/装备组合中最容易算错的值。
AC计算需覆盖：**无甲 / 轻甲 / 中甲 / 重甲 / 盾牌 / Mage Armor / Unarmored Defense**。

---

## 验收标准

- [ ] 无甲生物 AC = 10 + Dex调整值
- [ ] Mage Armor 法术 AC = 13 + Dex调整值
- [ ] 轻甲 AC = 护甲基础值 + Dex调整值（无上限）
- [ ] 中甲 AC = 护甲基础值 + Dex调整值（上限+2）
- [ ] 重甲 AC = 护甲基础值（不加Dex）
- [ ] 盾牌 +2 AC（可与任何护甲叠加）
- [ ] Barbarian Unarmored Defense AC = 10 + Dex调整值 + Con调整值
- [ ] Monk Unarmored Defense AC = 10 + Dex调整值 + Wis调整值
- [ ] 重甲力量不足时移动力减半（不直接影响AC，但需提示）
- [ ] 中甲/重甲需要熟练才能穿着（不熟练则Dex调整值视为0，且劣势）
- [ ] 修改装备"已装备"状态时，AC自动重算

---

## 数据模型

见 `../spec/data-model.md` → `Equipment` 和 `CombatStats`

**Armor JSON 结构**：
```jsonc
{
  "id": "Chain Mail",
  "baseAC": 16,
  "dexBonus": false,        // 是否加Dex
  "dexCap": null,            // 中甲填2，轻甲填null
  "strengthRequirement": 13,
  "equipped": true
}
```

**计算函数签名**（伪代码）：
```
calculateAC(equipmentList, abilityScores, characterTraits) → number
```

---

## 边界情况

| 情况 | 处理方式 |
|---|---|
| 同时装备多套护甲 | 只允许一件护甲+一个盾牌 equiped=true |
| Mage Armor + 物理护甲 | Mage Armor被覆盖（取高者） |
| 多重Unarmored Defense来源 | 只应用最高AC（不叠加） |
| 重甲但Str不足 | 提示"力量不足"，AC仍计算但不熟练惩罚需另外处理 |
| 无装备任何护甲 | 自动使用无甲公式 |

---

## 参考资料

- PRD v4.0 §4.2 自动计算
- PRD v4.0 §10 附录D AC计算规则
- 2024 PHB p.20-21 护甲表
- 2024 PHB p.152-153 Barbarian Unarmored Defense
- 2024 PHB p.170-171 Monk Unarmored Defense
