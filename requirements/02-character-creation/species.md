# 角色创建 — 物种(Species)

> 对应 PRD v4.0 §4.1 & §6 术语更新
> **这是角色创建的第一步，是后续所有计算的基础。**

---

## 需求描述

玩家从2024 PHB的10个物种中选择一个，获得物种特性、属性加值、速度、语言等。
MVP仅支持2024 PHB物种，2014遗留物种(Half-Elf/Half-Orc)放到P1。

---

## 验收标准

- [ ] 显示10个2024物种卡片（图标+名称+简述）
- [ ] 选择物种后，显示完整特性列表
- [ ] 物种给予的属性加值正确应用到 `AbilityScores.racialBonuses`
- [ ] 物种给予的速度正确应用到 `CombatStats.speed`
- [ ] 物种给予的语言加入角色语言列表
- [ ] 物种特性在角色表的"特性"区域可见
- [ ] 支持Aasimar的Celestial Revelation（含选择变体）
- [ ] 支持Dwarf的Dwarven Resilience（抗性或熟练项选择）
- [ ] 支持Tiefling的Infernal Legacy（法术按等级解锁）

---

## 数据模型

见 `../../spec/data-model.md` → `Species`

**Species静态JSON结构**：
```jsonc
{
  "id": "Dwarf",
  "subtypes": [               // 2024: 物种变体
    {
      "id": "Hill Dwarf",
      "traits": [
        { "name": "Dwarven Toughness", "grants": { "hpPerLevel": 1 } }
      ]
    },
    {
      "id": "Mountain Dwarf",
      "traits": [
        { "name": "Mountain Born", "grants": { "armorTraining": ["Light", "Medium"] } }
      ]
    }
  ],
  "baseTraits": [
    { "name": "Darkvision", "description": "..." },
    { "name": "Dwarven Resilience", "description": "..." }
  ],
  "abilityBonuses": { "Constitution": 2 },  // 固定加值，非+1/+2
  "size": "Medium",
  "speed": 30,
  "languages": ["Common", "Dwarvish"]
}
```

**Character JSON中的记录方式**：
```jsonc
{
  "species": "Dwarf",
  "speciesSubtype": "Mountain Dwarf",   // 如物种有变体
  "speciesTraits": [ "Darkvision", "Dwarven Resilience", "Mountain Born" ]
}
```

---

## 2024 物种完整列表

| 物种 | 属性加值 | 大小 | 速度 | 特殊 |
|---|---|---|---|---|
| Aasimar | Cha+2 | Medium | 30 | Celestial Revelation(3级) |
| Dragonborn | Str+2 | Medium | 30 | Draconic Breath |
| Dwarf | Con+2 | Medium | 30(25 if hill) | Darkvision, Dwarven Resilience |
| Elf | Dex+2 | Medium | 30 | Trance, Keen Senses |
| Gnome | Int+2 | Small | 30 | Gnome Cunning |
| Goliath | Str+2 | Medium | 30 | Large Form, Hill's Tumble |
| Halfling | Dex+2 | Small | 25 | Lucky, Brave |
| Human | 自选两项+1 | Medium | 30 | Versatile(额外背景特性) |
| Orc | Str+2 | Medium | 30 | Adrenaline Rush, Relentless Endurance |
| Tiefling | Cha+2 | Medium | 30 | Infernal Legacy(法术) |

**2014遗留（P1）**：Half-Elf, Half-Orc

---

## 边界情况

| 情况 | 处理方式 |
|---|---|
| Human选择属性加值 | 弹出选择器，选两项各+1（不能选同一项） |
| Aasimar 3级选择Revelation | 升级时弹出选择（Radiant Soul/Transforming Soul/Vengeful Spirit） |
| Orc的Adrenaline Rush使用次数 | 长休重置，记录到Resources |
| 多重物种特性叠加 | 不叠加同名特性；不同特性并存 |
| 物种给予护甲熟练 | 更新CombatStats.armorTraining列表 |

---

## 参考资料

- PRD v4.0 §4.1 角色创建
- PRD v4.0 §6 规则数据范围
- 2024 PHB p. 16-38 物种章节
- 2024 PHB p. 18 术语更新：Race → Species
