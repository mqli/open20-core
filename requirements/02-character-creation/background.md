# 角色创建 — 背景(Background)

> 对应 PRD v4.0 §4.1
> **2024规则中背景授予Origin Feat，是区别于2014规则的核心变化。**

---

## 需求描述

玩家从16个2024 PHB背景中选择一个，获得技能熟练项、工具熟练项、语言、Origin Feat。

---

## 验收标准

- [ ] 显示16个背景卡片（图标+名称+简述）
- [ ] 选择背景后，显示授予的技能/工具/语言/Origin Feat
- [ ] 授予的技能自动勾选到 `Skills`
- [ ] 授予的工具自动添加到 `Equipment` 或 `toolProficiencies`
- [ ] 授予的语言自动添加到角色语言列表
- [ ] Origin Feat自动添加到 `feats[]`
- [ ] 支持自定义背景（2024规则鼓励）
- [ ] 支持6个新背景：Farmer、Guard、Guide、Merchant、Scribe、Wayfarer

---

## 2024 背景完整列表

| 背景 | 技能 | 工具 | 语言 | Origin Feat |
|---|---|---|---|---|
| Acolyte | Insight, Religion | — | 2自选 | Blessed Warrior |
| Charlatatan | Deception, Sleight of Hand | Forgery Kit | — | Skilled |
| Criminal | Deception, Stealth | Gaming Set | Thieves' Cant | Criminal Contact |
| Entertainer | Acrobatics, Performance | Disguise Kit | — | Menacing |
| Farmer 🆕 | Animal Handling, Survival | Artisan's Tools | — | Tough |
| Gladiator | Acrobatics, Performance | Disguise Kit | — | Tavern Brawler |
| Guard 🆕 | Athletics, Perception | Gaming Set | — | Alert |
| Guide 🆕 | Survival, Perception | Vehicles(land) | — | Skilled |
| Hermit | Medicine, Religion | Herbalism Kit | 1自选 | Wakeful |
| Merchant 🆕 | Persuasion, Insight | Navigators' Tools | 1自选 | Lucky |
| Noble | History, Persuasion | Gaming Set | 1自选 | Blessed Warrior |
| Sage | Arcana, History | — | 2自选 | Studious |
| Sailor | Athletics, Perception | Navigator's Tools | — | Tavern Brawler |
| Scribe 🆕 | Investigation, Percepion | Calligrapher's Supplies | 2自选 | Skilled |
| Soldier | Athletics, Intimidation | Gaming Set | — | Savage Attacker |
| Wayfarer 🆕 | Insight, Survival | Artisan's Tools | 1自选 | Alert |

---

## 数据模型

见 `../../spec/data-model.md` → `Background`

**Background静态JSON结构**：
```jsonc
{
  "id": "Soldier",
  "source": "2024 PHB",
  "skillProficiencies": ["Athletics", "Intimidation"],
  "toolProficiencies": ["Gaming Set"],
  "languages": ["Common"],
  "originFeatId": "Savage Attacker",
  "startingEquipment": [
    { "itemId": "Uniform", "quantity": 1 },
    { "itemId": "Gaming Set", "quantity": 1 }
  ],
  "startingGold": 15
}
```

**Character JSON中的记录方式**：
```jsonc
{
  "background": "Soldier",
  "originFeat": "Savage Attacker",   // 方便查找
  "backgroundGranted": {
    "skills": ["Athletics", "Intimidation"],
    "tools": ["Gaming Set"],
    "languages": ["Common"]
  }
}
```

---

## Origin Feat 说明

2024规则中，**每个背景授予一个Origin Feat**，在1级获得。
Origin Feat是专长的一种，计入专长总数（不影响其他等级获得专长）。

**常见Origin Feat**：
- Alert, Blessed Warrior, Crafter, Lucky, Menacing
- Savage Attacker, Skilled, Studious, Tavern Brawler, Tough, Wakeful

---

## 边界情况

| 情况 | 处理方式 |
|---|---|
| 自定义背景 | 弹出选择器，玩家自选2个技能 + 1个工具/语言 + 1个Origin Feat |
| Origin Feat有前提(如Str 13+) | 检查属性是否符合，不符合提示更换 |
| 多个背景授予同一技能 | 不叠加，但可触发双重熟练(Expertise) |
| 背景授予的工具已拥有 | 忽略重复，不报错 |

---

## 参考资料

- PRD v4.0 §4.1 角色创建
- 2024 PHB p. 39-62 背景章节
- 2024 PHB p. 40 Origin Feats说明
