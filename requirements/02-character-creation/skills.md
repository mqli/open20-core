# 需求：技能熟练项 (Skills Proficiency)

## 1. 需求描述

根据职业和背景自动勾选熟练技能，玩家可查看技能加值。某些职业（如Rogue、Bard）可获得Expertise（双重熟练），在特定等级加倍熟练加值。

**2024规则变更：**
- 技能数量保持18个不变
- 职业熟练项选择方式可能变化（需查阅2024 PHB）
- Rogue的Expertise获得等级：6级和13级（2024可能调整）
- Bard的Expertise获得等级：3级和10级

**重要说明：**
- 技能加值 = 属性调整加值 + 熟练加值（如熟练）+ Expertise加值（如获得Expertise）
- 熟练项由职业和背景共同决定（叠加，不冲突）
- Expertise仅在已熟练的技能上生效

---

## 2. 验收标准

### 2.1 技能列表显示
- [ ] 显示全部18个技能，按属性分组：
  - 力量：运动（Athletics）
  - 敏捷：巧手（Sleight of Hand）、隐匿（Stealth）
  - 智力：奥秘（Arcana）、历史（History）、调查（Investigation）、自然（Nature）、宗教（Religion）
  - 感知：安抚动物（Animal Handling）、洞察（Insight）、医药（Medicine）、察觉（Perception）、生存（Survival）
  - 魅力：欺瞒（Deception）、威吓（Intimidation）、表演（Performance）、游说（Persuasion）
- [ ] 每个技能显示：
  - 名称（中英文）
  - 关联属性（及属性加值）
  - 熟练加值（如熟练）
  - Expertise加值（如获得Expertise）
  - 总加值（属性加值 + 熟练加值 + Expertise加值）
- [ ] 总加值格式化显示：如"+5"（正数加+号）、"-1"（负数加-号）

### 2.2 熟练项自动勾选
- [ ] **职业熟练项**：
  - 根据所选职业自动勾选
  - 显示可选择数量（如"Fighter：选择2个"）
  - 如果职业熟练项有固定列表（如只能从特定技能中选），显示可选范围
  - 支持重新选择（在规则允许的情况下）
- [ ] **背景熟练项**：
  - 根据所选背景自动勾选
  - 通常固定2个技能，无需选择
  - 与职业熟练项叠加，不冲突
- [ ] **种族熟练项**（如有）：
  - 根据所选物种自动勾选（如Elf的察觉）
  - 显示来源物种名称

### 2.3 Expertise（双重熟练）
- [ ] **Rogue**：
  - 6级获得Expertise，可选择2个技能加倍熟练加值
  - 13级再次获得Expertise，可选择2个技能（可与6级重复或不重复）
  - 仅适用于已熟练的技能
- [ ] **Bard**：
  - 3级获得Expertise，可选择2个技能
  - 10级再次获得Expertise，可选择2个技能
  - 仅适用于已熟练的技能
- [ ] **其他职业**（如有）：
  - 查阅2024 PHB，如Knowledge Cleric等
- [ ] Expertise选择界面：
  - 显示已熟练的技能列表
  - 可选择2个（数量根据职业/等级而定）
  - 支持更换选择（在规则允许的情况下）

### 2.4 技能加值计算
- [ ] **属性加值**：从 `Character.abilityScores.modifier` 自动获取
- [ ] **熟练加值**：根据角色等级查表（见数据模型），如熟练则加对应值
- [ ] **Expertise加值**：如获得Expertise，再加一次熟练加值（即熟练加值×2）
- [ ] **总加值**：实时计算并显示
- [ ] 属性变化后，技能加值自动更新

### 2.5 交互功能
- [ ] 点击技能卡片，复制 "1d20+加值" 到剪贴板（如"1d20+5"）
- [ ] 显示复制成功提示（toast）
- [ ] 支持手动调整加值（DM允许的情况，P1功能，MVP预留入口）
- [ ] 技能加值历史记录（每次变化记录，P2功能）

### 2.6 数据持久化
- [ ] 职业熟练项选择写入 `Character.skills`
- [ ] 背景熟练项自动写入 `Character.skills`
- [ ] Expertise选择写入 `Character.skills`
- [ ] 支持重置熟练项（重新选择职业/背景时）

---

## 3. 数据模型

引用 `spec/data-model.md` 中的定义：

```javascript
Character.skills = {
  "Athletics": {
    "proficient": true,
    "expertise": false,
    "source": ["Fighter"]     // 来源：职业/背景/种族
  },
  "Stealth": {
    "proficient": true,
    "expertise": true,        // Rogue的Expertise
    "source": ["Rogue", "Urchin"]
  },
  "Perception": {
    "proficient": true,
    "expertise": false,
    "source": ["Elf"]         // 种族授予的熟练项
  },
  "Arcana": {
    "proficient": false,
    "expertise": false,
    "source": []
  }
  // ... 其他14个技能
}

// 熟练加值表（根据角色等级）
ProficiencyBonus = {
  1: 2,  2: 2,  3: 2,  4: 2,  5: 3,
  6: 3,  7: 3,  8: 3,  9: 4,  10: 4,
  11: 4, 12: 4, 13: 5, 14: 5, 15: 5,
  16: 5, 17: 6, 18: 6, 19: 6, 20: 6
}

// 自动计算的技能加值（不手动输入，实时计算）
Character.skillBonuses = {
  "Athletics": 5,    // 属性加值(3) + 熟练加值(2)
  "Stealth": 8,      // 属性加值(4) + 熟练加值(2) + Expertise(2)
  "Perception": 3    // 属性加值(1) + 熟练加值(2)
  // ...
}
```

**18个技能完整列表（中英文对照）：**

| 英文名称 | 中文名称 | 关联属性 |
|---------|---------|---------|
| Athletics | 运动 | Strength |
| Sleight of Hand | 巧手 | Dexterity |
| Stealth | 隐匿 | Dexterity |
| Arcana | 奥秘 | Intelligence |
| History | 历史 | Intelligence |
| Investigation | 调查 | Intelligence |
| Nature | 自然 | Intelligence |
| Religion | 宗教 | Intelligence |
| Animal Handling | 安抚动物 | Wisdom |
| Insight | 洞察 | Wisdom |
| Medicine | 医药 | Wisdom |
| Perception | 察觉 | Wisdom |
| Survival | 生存 | Wisdom |
| Deception | 欺瞒 | Charisma |
| Intimidation | 威吓 | Charisma |
| Performance | 表演 | Charisma |
| Persuasion | 游说 | Charisma |

---

## 4. 边界情况

### 4.1 熟练项冲突
- **重复熟练**：同一技能从职业和背景都获得熟练，不叠加（只算一次）
- **熟练项超限**：如果职业允许选择数量超过可用技能（不可能，但需防御），提示"所有技能已熟练"
- **移除熟练项**：如果重新选择职业/背景，旧熟练项需移除（需确认）

### 4.2 Expertise冲突
- **未熟练的Expertise**：如果技能不熟练，Expertise不生效（需提示）
- **Expertise超限**：Rogue 6级只能选2个Expertise，尝试选第3个时提示"已达到上限"
- **重复Expertise**：同一技能在不同等级获得Expertise，不叠加（只算一次）

### 4.3 数据兼容性
- **2014角色**：检测 `Character.version === "2014"`，使用2014的Expertise规则
- **自定义背景**：如果背景允许自定义熟练项，需支持手动勾选
- **导入角色**：从D&D Beyond导入时，保留原始熟练项选择

### 4.4 等级变化
- **升级时获得Expertise**：自动检测到新等级可获得Expertise，提示"第X级可获得Expertise"
- **降级时**（如管理员调整等级）：已获得的Expertise保留但标记为"未激活"
- **Multi-class**：多职业时Expertise按各职业规则分别计算（如Rogue 5 / Bard 3，可有Rogue的Expertise但未获得Bard的Expertise）

### 4.5 计算精度
- **熟练加值查表**：根据 `Character.level` 查 `ProficiencyBonus` 表
- **Expertise加值**：熟练加值×2（不是熟练加值+熟练加值，而是直接×2）
- **总加值计算**：`attributeModifier + (proficient ? proficiencyBonus : 0) + (expertise ? proficiencyBonus : 0)`

### 4.6 并发与状态
- **中途退出**：已选择的熟练项/Eexpertise暂存到LocalStorage
- **恢复状态**：重新进入时恢复上次选择状态
- **多设备冲突**：同一角色在不同设备编辑时，以最后保存为准

### 4.7 特殊技能
- **巧手（Sleight of Hand）**：某些职业（如Rogue）可用巧手作为攻击加值（需标注）
- **察觉（Perception）**：通常是最常用的技能，建议默认展开或高亮
- **生存（Survival）**：在某些环境下（如荒野）重要性提升（P2功能，环境加成）

---

## 5. 参考资料

- **PRD v4.0 §4.1 角色创建** - 技能熟练项需求定义
- **PRD v4.0 §4.2 自动计算** - 技能加值自动计算规则
- **2024 PHB p.20-21 技能熟练项规则** - 技能列表和熟练项规则
- **2024 PHB p.185-186 技能描述** - 每个技能的完整描述
- **2014 PHB p.174-175 技能** - 对比2014规则差异
- **D&D Beyond 技能界面** - UI设计参考（https://www.dndbeyond.com/）
- **Roll20 技能卡** - 技能卡片设计参考

---

**优先级**：P0（MVP必须）  
**依赖**：属性分配、职业选择、背景选择、等级计算  
**前置需求**：ability-assignment.md、class-subclass.md、background.md  
**后续需求**：无
