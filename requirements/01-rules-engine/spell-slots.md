# 规则引擎 — 法术位计算

> 对应 PRD v4.0 §4.2 & §10 附录C
> **法术位计算是施法者角色表的核心，Warlock有特殊规则。**

---

## 需求描述

根据施法者等级查表计算法术位数量。
Warlock使用Pact Magic，短休恢复，与普通法术位独立计算。
多维职业(P1)需要查多职业法术位表。

---

## 验收标准

### 单职业施法者
- [ ] 根据 `classes[].level` 和职业查 **Spell Slots by Level** 表
- [ ] 非施法者：不显示法术位区域
- [ ] 施法者：正确显示1-9级法术位（已用/总数）
- [ ] 升级时自动更新法术位总数

### Warlock Pact Magic（特殊）
- [ ] Warlock法术位**独立计算**，不与其他施法者合并
- [ ] Pact Magic法术位**短休恢复**（普通施法者长休恢复）
- [ ] Pact Magic法术位等级随Warlock等级提升（1-5级对应1-3级法术位）
- [ ] Warlock法术位数量固定（1级1个，2-5级2个，6+级不增加）

### 法术位消耗/恢复
- [ ] 点击法术位 → `used + 1`，总数不变
- [ ] 点击已用法术位 → `used - 1`
- [ ] 长休 → 所有法术位 `used = 0`（Warlock除外）
- [ ] 短休 → Warlock的 `pactMagicSlots.used = 0`
- [ ] 施法者牧师/德鲁伊/圣武士/法师：长休后已准备法术清空（需重新准备）

### 多维职业(P1)
- [ ] 多个Spellcasting职业等级相加 → 查多职业法术位表
- [ ] Warlock Pact Magic独立计算（不加入多职业表）
- [ ] Paladin/Ranger等级**减半向下取整**计入Spellcasting等级

---

## 数据模型

见 `../../spec/data-model.md` → `Spells`

**Spell Slots by Level 表**（静态数据）：
```jsonc
// static/rules-lookup.json
{
  "spellSlotsByClassLevel": {
    "Bard":    { "1": [2,0,0,0,0,0,0,0,0,0], "2": [3,0,0,...], ... },
    "Cleric":  { "1": [2,0,0,0,0,0,0,0,0,0], ... },
    "Druid":   { "1": [2,0,0,0,0,0,0,0,0,0], ... },
    "Sorcerer": { "1": [2,0,0,0,0,0,0,0,0,0], ... },
    "Warlock": { "1": [1,0,0,0,0,0,0,0,0,0], ... },  // 普通法术位（非Pact Magic）
    "Wizard":  { "1": [2,0,0,0,0,0,0,0,0,0], ... }
  },
  "warlockPactSlots": {
    "1": { "slots": 1, "level": 1 },
    "2": { "slots": 2, "level": 1 },
    "5": { "slots": 2, "level": 2 },
    "7": { "slots": 2, "level": 3 },      // 此处省略部分等级
    "11": { "slots": 3, "level": 5 }
  },
  "multiclassSpellSlots": {
    "1": [2,0,0,0,0,0,0,0,0,0],
    "2": [3,0,0,0,0,0,0,0,0,0],
    // ... 1-20 总施法者等级
  }
}
```

**Character JSON 中的记录方式**：
```jsonc
{
  "spells": {
    "spellcastingAbility": "Intelligence",
    "spellSaveDC": 15,
    "spellAttackBonus": 7,
    "knownSpells": ["Fireball", "Mage Armor", "Shield"],
    "preparedSpells": ["Fireball", "Mage Armor"],
    "spellSlots": {
      "1": { "total": 2, "used": 0 },
      "2": { "total": 0, "used": 0 },
      // ... 到9级
    },
    "pactMagicSlots": {
      "level": 2,
      "total": 2,
      "used": 0,
      "resetOn": "Short Rest"
    }
  }
}
```

---

## 法术位计算规则

### 单职业施法者

查表：`rules-lookup.json.spellSlotsByClassLevel[className][classLevel]`

示例：5级Wizard
```
1级法术位: 2
2级法术位: 3
3级法术位: 0
...
```

### Warlock Pact Magic

查表：`rules-lookup.json.warlockPactSlots[warlockLevel]`

| Warlock等级 | Pact Magic法术位数量 | 法术位等级 |
|---|---|---|
| 1-4 | 1 | 1 |
| 2-5 | 2 | 1 |
| 6-10 | 2 | 2 |
| 11-16 | 3 | 3 |
| 17-20 | 4 | 4 |

### 多维职业(P1)

Spellcasting职业等级相加 → 查 `multiclassSpellSlots[totalSpellcastingLevel]`

**例外**：
- Warlock Pact Magic**不加入**（独立计算）
- Paladin/Ranger等级 ÷ 2（向下取整）计入

示例：Fighter 5 / Wizard 3 / Warlock 2
```
Spellcasting等级 = Wizard 3 = 3
查表 → 法术位: 1级2个, 2级0个...
Warlock Pact Magic独立: 2个1级法术位（短休恢复）
```

---

## 边界情况

| 情况 | 处理方式 |
|---|---|
| 同时是Wizard + Cleric | 法术位按**总施法者等级**查表（不分开算） |
| Warlock + 其他施法者 | Pact Magic独立，其他法术位合并 |
| 法术位全部用完 | 仍可施展法术（消耗更高等级法术位） |
| 升级获得新法术位 | 已用数不变（如2/2 → 1/3，不是0/3） |
| 长休后法术位恢复 | Warlock不受影响（短休恢复） |
| 牧师/德鲁伊/法师长休后 | 已准备法术清空（需重新准备） |

---

## Warlock Mystic Arcanum（Pact of the Tome高级特性）

Warlock在11/13/15/17级获得**Mystic Arcanum**，可以施展6/7/8/9级法术各1次/长休。

```jsonc
{
  "mysticArcanum": {
    "11": { "spellId": "Flesh to Stone", "used": false },
    "13": { "spellId": "Power Word Stun", "used": false }
  }
}
```

长休后所有Mystic Arcanum `used = false`。

---

## 参考资料

- PRD v4.0 §4.2 自动计算
- PRD v4.0 §10 附录C 法术位计算规则
- 2024 PHB p.32-33 法术位规则
- 2024 PHB p.154-155 Warlock Pact Magic
- 2024 PHB p.36 多维职业法术位规则
