# 角色创建 — 职业(Class) + 子职业(Subclass)

> 对应 PRD v4.0 §4.1 & §6 术语更新
> **职业特性决定规则引擎的输入参数，是核心基础数据。**

---

## 需求描述

玩家从12个2024 PHB职业中选一个（MVP仅单职业），
在达到子职业等级时选择子职业（非施法者1级/施法者3级）。

---

## 验收标准

### 职业选择
- [ ] 显示12个职业卡片（图标+名称+简述）
- [ ] 选择后显示职业特性列表（按等级）
- [ ] 正确设置 `ArmorTraining`（影响AC计算）
- [ ] 正确设置 `WeaponMastery`（影响武器精通UI）
- [ ] 正确设置 `Spellcasting`（影响法术管理UI）
- [ ] 多维职业预留接口（`classes[]`数组）

### 子职业选择
- [ ] 达到子职业等级时弹出选择（1级非施法者/3级施法者）
- [ ] 显示该职业所有子职业卡片
- [ ] 选择后激活对应特性

### 2024术语更新（必须）
- [ ] Barbarian: Primal Path → Barbarian Subclass
- [ ] Fighter: Martial Archetype → Fighter Subclass
- [ ] Monk: Monastic Tradition → Monk Subclass
- [ ] Paladin: Sacred Oath → Paladin Subclass
- [ ] Warlock: Otherworldly Patron → Warlock Subclass
- [ ] 全部子职业名称更新（见下表）

---

## 2024 子职业名称映射

| 职业 | 2014名称 | 2024名称 |
|---|---|---|
| Barbarian | Path of the Totem Warrior | Path of the Wild Heart |
| Barbarian | (新) | Path of the World Tree |
| Barbarian | (从Xanathar导入) | Path of the Zealot |
| Bard | (新) | College of Dance |
| Bard | (从Xanathar导入) | College of Glamour |
| Druid | (新) | Circle of the Sea |
| Druid | (从Tasha导入) | Circle of the Stars |
| Monk | Way of Mercy | Warrior of Mercy |
| Monk | Way of Shadow | Warrior of Shadow |
| Monk | Way of the Four Elements | Warrior of the Elements |
| Monk | Way of the Open Hand | Warrior of the Open Hand |
| Sorcerer | Aberrant Mind | Aberrant Sorcery |
| Sorcerer | Clockwork Soul | Clockwork Sorcery |
| Sorcerer | Draconic Bloodline | Draconic Sorcery |
| Sorcerer | Wild Magic | Wild Magic Sorcery |
| Warlock | The Archfey | Archfey Patron |
| Warlock | The Celestial | Celestial Patron |
| Warlock | The Fiend | Fiend Patron |
| Warlock | The Great Old One | Great Old One Patron |
| Wizard | School of Abjuration | Abjurer |
| Wizard | School of Divination | Diviner |
| Wizard | School of Evocation | Evoker |
| Wizard | School of Illusion | Illusionist |

---

## 数据模型

见 `../../spec/data-model.md` → `Class & Subclass`

**Class静态JSON结构**：
```jsonc
{
  "id": "Fighter",
  "source": "2024 PHB",
  "hitDie": "d10",
  "savingThrowProficiencies": ["Strength", "Constitution"],
  "armorTraining": ["Light", "Medium", "Heavy", "Shields"],
  "weaponMastery": true,
  "spellcasting": null,   // 或 { "ability": "...", "prepares": true/false }
  "featuresByLevel": {
    "1": [
      { "name": "Fighting Style", "description": "...", "resource": null },
      { "name": "Second Wind", "description": "...", "resource": "Second Wind" }
    ],
    "2": [
      { "name": "Action Surge", "description": "...", "resource": "Action Surge" }
    ]
    // ... 每级
  }
}
```

**Character JSON中的记录方式**：
```jsonc
{
  "classes": [
    {
      "classId": "Fighter",
      "level": 5,
      "subclassId": "Champion",
      "subclassLevel": 3,
      "hitDice": { "die": "d10", "used": 0 }
    }
  ]
}
```

---

## 各职业关键点

| 职业 | 法术？ | 资源追踪 | 特殊 |
|---|---|---|---|
| Barbarian | 否 | Rage (Long Rest) | Unarmored Defense |
| Bard | 是(全施法者) | Bardic Inspiration (Long Rest) | — |
| Cleric | 是(准备) | Channel Divinity (Short Rest) | — |
| Druid | 是(准备) | Wild Shape (Short Rest) | — |
| Fighter | 否(Eldrit等例外) | Second Wind/Action Surge/Indomitable | Weapon Mastery |
| Monk | 否 | Focus Points (Short Rest) | Unarmored Defense |
| Paladin | 是(准备，1/2级) | Channel Divinity/ Lay on Hands | — |
| Ranger | 是(准备，1/2级) | Favored Enemy (Long Rest) | Weapon Mastery |
| Rogue | 否 | Sneak Attack (Per Turn) | Weapon Mastery |
| Sorcerer | 是(全施法者) | Sorcery Points (Long Rest) | Font of Magic |
| Warlock | 是(全施法者) | Pact Magic (Short Rest) | 短休恢复法术位 |
| Wizard | 是(准备) | Arcane Recovery (Long Rest) | Ritual Adept |

---

## 边界情况

| 情况 | 处理方式 |
|---|---|
| 选择子职业时取消 | 保留职业，子职业为空，升级时再次提示 |
| 职业特性给予资源 | 自动在 `Resources[]` 中创建对应条目 |
| 多维职业（P1） | `classes[]` 数组支持多个，法术位按多职业规则计算 |
| 2014遗留子职业（P1） | Cleric的Knowledge/Nature/Tempest；Wizard的Conjuration等 |

---

## 参考资料

- PRD v4.0 §4.1 角色创建
- PRD v4.0 §10 附录A 术语完整更新表
- PRD v4.0 §10 附录B 职业资源追踪清单
- 2024 PHB p.70-160 职业章节
