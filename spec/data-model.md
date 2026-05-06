# 数据模型规格

> 本文档定义角色表app的核心数据结构。所有需求文件应与此数据模型对齐。

---

## 核心实体关系

```
Character (角色)
├── Species (物种)
├── Background (背景)
├── Classes[] (职业列表，支持多维职业)
│   └── Subclass (子职业)
├── AbilityScores (属性值)
├── Skills (技能熟练)
├── Feats[] (专长列表)
├── Equipment[] (装备列表)
│   ├── Weapon
│   ├── Armor
│   └── Item
├── Spells (法术)
│   ├── KnownSpells[] (已知法术)
│   ├── PreparedSpells[] (已准备法术，施法者用)
│   └── SpellSlots (法术位)
├── Resources[] (可消耗资源)
├── HitPoints (生命值)
├── CombatStats (战斗统计)
└── Currency (金币)
```

---

## Character（角色）

```jsonc
{
  "schemaVersion": "2024.1",          // 数据模型版本，用于迁移
  "name": "Borin Ironforge",
  "species": "Dwarf",                 // 见 Species 实体
  "background": "Soldier",            // 见 Background 实体
  "classes": [                       // 数组，支持多维职业
    {
      "classId": "Fighter",
      "level": 5,
      "subclassId": "Champion",
      "subclassLevel": 3,             // 获得子职业的等级
      "hitDice": { "die": "d10", "used": 0 }
    }
  ],
  "abilityScores": { /* 见 AbilityScores */ },
  "skills": { /* 见 Skills */ },
  "feats": [ "Fighting Style", "Tough" ],
  "equipment": [ /* 见 Equipment */ ],
  "spells": { /* 见 Spells */ },
  "resources": [ /* 见 Resources */ },
  "hitPoints": { /* 见 HitPoints */ },
  "combatStats": { /* 见 CombatStats */ },
  "currency": { "cp": 0, "sp": 0, "ep": 0, "gp": 100, "pp": 0 },
  "conditions": [],                  // 当前状态，见 Conditions
  "notes": "",                       // 自由笔记
  "createdAt": "2025-04-28T00:00:00Z",
  "updatedAt": "2025-04-28T00:00:00Z"
}
```

---

## Species（物种）

```jsonc
{
  "id": "Dwarf",
  "source": "2024 PHB",          // "2014 PHB" | "2024 PHB"
  "description": "...",
  "size": "Medium",
  "speed": 30,
  "languages": ["Common", "Dwarvish"],
  "darkvision": 60,
  "abilityBonuses": { "Constitution": 2 },  // 2024: 使用完整AbilityName，非缩写
  "baseTraits": [
    {
      "name": "Darkvision",
      "description": "..."
    },
    {
      "name": "Dwarven Resilience",
      "grants": { "toolProficiencies": ["Resistance"] }
    }
  ],
  "subtypes": [  // 物种变体（如Hill Dwarf / Mountain Dwarf）
    {
      "id": "hill-dwarf",
      "name": "Hill Dwarf",
      "description": "...",
      "traits": [...]
    }
  ]
}
```

**2024规则要点**：物种特性不再给+1/+2属性，而是固定加值（如 Mountain Dwarf: Constitution+2, Strength+2）。`abilityBonuses` 使用完整属性名（如 `"Constitution"` 而非 `"Con"`），与 `AbilityName` 类型保持一致。

---

## Background（背景）

```jsonc
{
  "id": "Soldier",
  "source": "2024 PHB",
  "name": "Soldier",
  "description": "...",
  "skillProficiencies": ["Athletics", "Intimidation"],
  "toolProficiencies": ["Gaming Set", "Vehicles(land)"],
  "languages": ["Common"],
  "originFeatId": "Savage Attacker",   // Origin Feat（背景授予），与Feat.id对应
  "startingEquipment": [ /* GearItem[] */ ],
  "startingGold": 15   // gp
}
```

---

## Class & Subclass（职业 & 子职业）

```jsonc
// Class 模板（静态数据，不存角色JSON）
{
  "id": "Fighter",
  "source": "2024 PHB",
  "hitDie": "d10",
  "savingThrowProficiencies": ["Strength", "Constitution"],
  "armorTraining": ["Light", "Medium", "Heavy", "Shields"],
  "weaponMastery": true,        // 是否有Weapon Mastery
  "featuresByLevel": [           // 数组形式（JSON中存储），运行时转为 ReadonlyMap
    { "level": 1, "features": [
      { "name": "Fighting Style", "description": "..." },
      { "name": "Second Wind", "resourceId": "Second Wind" }
    ]},
    { "level": 2, "features": [
      { "name": "Action Surge", "resourceId": "Action Surge" }
    ]},
    { "level": 5, "features": [
      { "name": "Extra Attack", "description": "..." }
    ]}
    // ... 每级特性
  ],
  "spellcasting": null           // 或 { "ability": "Intelligence", "prepares": true }
}

// ⚠️ 注意：代码中 Class.featuresByLevel 类型为 ReadonlyMap<number, readonly Feature[]>
// JSON序列化时使用数组，default-loader 加载时转为 Map

// Subclass 模板
{
  "id": "Champion",
  "parentClass": "Fighter",
  "grantedAtLevel": 3,
  "featuresByLevel": {
    "3": [{ "name": "Improved Critical", "description": "..." }],
    "7": [{ "name": "Remarkable Athlete", "description": "..." }]
    // ...
  }
}
```

---

## AbilityScores（属性值）

```jsonc
{
  "base": {              // 分配值（非调整值）
    "Strength": 15,
    "Dexterity": 12,
    "Constitution": 14,
    "Intelligence": 10,
    "Wisdom": 13,
    "Charisma": 8
  },
  "racialBonuses": { "Constitution": 2 },   // 来自物种
  "featBonuses": { "Strength": 1 },         // 来自专长
  "temporaryBonuses": {}                    // 法术/特性临时加值
}
```

**计算规则**：
```
value = base + racialBonuses + featBonuses + temporaryBonuses
modifier = floor((value - 10) / 2)
```

---

## Skills（技能）

```jsonc
{
  "Athletics":    { "ability": "Strength",  "proficient": true,  "expertise": false },
  "Acrobatics":  { "ability": "Dexterity", "proficient": false, "expertise": false },
  "Sleight of Hand": { "ability": "Dexterity", "proficient": false, "expertise": false },
  "Stealth":      { "ability": "Dexterity", "proficient": false, "expertise": false },
  "Arcana":       { "ability": "Intelligence", "proficient": false, "expertise": false },
  // ... 全部18个技能
  "Perception":   { "ability": "Wisdom",    "proficient": true,  "expertise": false },
  "Survival":     { "ability": "Wisdom",    "proficient": false, "expertise": false },
  "Insight":     { "ability": "Wisdom",    "proficient": false, "expertise": false },
  "Persuasion":  { "ability": "Charisma",  "proficient": false, "expertise": false }
}
```

**加值计算**：
```
bonus = abilityModifier
if proficient: bonus += proficiencyBonus
if expertise:   bonus += proficiencyBonus * 2
```

---

## Feats（专长）

```jsonc
// 专长模板（静态数据）
{
  "id": "Great Weapon Master",
  "source": "2024 PHB",
  "category": "General",       // Origin | General | Fighting Style | Epic Boon
  "prerequisites": { "Strength": 13 },
  "description": "...",
  "grants": {
    // 专长给予的属性加值、熟练项等
  }
}
```

---

## Equipment（装备）

### Weapon

```jsonc
{
  "id": "Longsword",
  "type": "weapon",
  "name": "Longsword",
  "category": "Martial",        // Simple | Martial
  "properties": ["Versatile"],  // 武器属性（WeaponProperty[]）
  "mastery": "Topple",          // 2024 Weapon Mastery（单值，非数组）
  "damage": { "dice": "d8", "ability": "Strength", "bonus": 0 },
  "versatileDamage": "d10",    // 双手使用时
  "range": { "normal": 5 },     // 近战5尺
  "weight": 3,
  "cost": "15 gp",
  "equipped": true               // 是否装备（影响AC/攻击加值）
}
```

> **注意**：`mastery` 字段在代码中为 `WeaponMasteryProperty | undefined`（单值），而非数组。
> 武器精通属性(Cleave/Graze/Nick/Push/Sap/Slow/Topple/Vex)取决于角色对该武器的精通，同一武器在不同角色手中可能有不同的mastery效果。

### Armor

```jsonc
{
  "id": "Chain Mail",
  "type": "armor",
  "category": "Heavy",          // Light | Medium | Heavy | Shield
  "baseAC": 16,
  "dexBonus": false,           // 是否加Dex调整值
  "dexCap": null,              // 中甲: 2, 轻甲: null(unlimited)
  "strengthRequirement": 13,    // 重甲力量需求
  "stealthDisadvantage": true,
  "weight": 55,
  "cost": "75 gp",
  "equipped": true
}
```

### Item（普通物品）

```jsonc
{
  "id": "Potion of Healing",
  "type": "consumable",
  "quantity": 2,
  "weight": 0.5,
  "cost": "50 gp",
  "effect": "Restore 2d4+2 HP"
}
```

---

## Spells（法术）

### Spell 模板（静态数据）

```jsonc
{
  "id": "Fireball",
  "level": 3,
  "school": "Evocation",
  "castingTime": "Action",
  "range": "150 ft.",
  "components": ["V", "S", "M"],
  "materialDescription": "A tiny ball of bat guano and sulfur",
  "duration": "Instantaneous",
  "description": "(SRD text here)",
  "source": "2024 PHB",
  "upcast": "When you cast this spell using a spell slot of 4th level or higher..."
}
```

### CharacterSpells（角色法术数据）

```jsonc
{
  "spellcastingAbility": "Intelligence",   // 来自职业
  "spellSaveDC": 15,
  "spellAttackBonus": 7,
  "knownSpells": ["Fireball", "Mage Armor", "Shield"],  // 法术ID列表
  "preparedSpells": ["Fireball", "Mage Armor"],        // 已准备（Wizard/Cleric等）
  "spellSlots": {
    "1": { "total": 2, "used": 0 },
    "2": { "total": 0, "used": 0 },
    "3": { "total": 0, "used": 0 }
    // ... 到9级
  },
  "pactMagicSlots": null   // Warlock专用，见下方
}
```

### Warlock Pact Magic

```jsonc
{
  "pactMagicSlots": {
    "level": 2,        // Warlock法术位等级（不是职业等级）
    "total": 2,
    "used": 0,
    "resetOn": "Short Rest"   // Warlock法术位短休恢复
  }
}
```

---

## Resources（可消耗资源）

```jsonc
{
  "id": "Second Wind",
  "max": 1,
  "used": 0,
  "resetOn": "Short Rest",     // Short Rest | Long Rest | Per Turn | Daily
  "description": "You can use a bonus action to regain 1d10 + fighter level HP."
}

// 职业资源清单（见PRD v4.0 §10附录B）
// Barbarian: Rage (Long Rest)
// Fighter: Second Wind (Short Rest), Action Surge (Short Rest), Indomitable (Long Rest)
// Monk: Focus Points (Short Rest)
// Wizard: Arcane Recovery (Long Rest)
// etc.
```

**resetOn 枚举**：
- `Short Rest` — 短休后重置
- `Long Rest` — 长休后重置
- `Per Turn` — 每回合重置（如Sneak Attack）
- `Daily` — 每日次数（长休重置）
- `Never` — 永久资源（如Fighter Action Surge次数固定为1）

---

## HitPoints（生命值）

```jsonc
{
  "max": 42,
  "current": 38,
  "temporary": 0,
  "deathSaves": { "successes": 0, "failures": 0, "isStable": false }
}
```

> **注意**：`hitDice` 不在 HitPoints 中，而是在 `CharacterClass` 中。
> 每个职业条目有自己的 hitDice：`{ die: "d10", used: 0 }`。
> 这样设计是因为多维职业中不同职业有不同的生命骰。

**HP计算规则**（见PRD v4.0 §10附录E）：
```
1级: maxHP = hitDieMax + ConMod
升级: newMaxHP = oldMaxHP + hitDieValue + ConMod
     hitDieValue = ceil(hitDieMax / 2)   // d10→6, d6→4, d8→5, d12→7
```

---

## CombatStats（战斗统计）

```jsonc
{
  "AC": 18,
  "initiative": 1,          // Dex调整值 + 其他加值
  "speed": 25,
  "passivePerception": 13,   // 10 + Perception加值
  "proficiencyBonus": 3,     // 由总等级决定
  "attacks": [
    {
      "name": "Longsword",
      "attackBonus": 7,       // 熟练加值 + Str调整值
      "damage": "1d8+4",
      "damageType": "Slashing",
      "mastery": ["Cleave", "Topple"]   // 武器精通
    }
  ]
}
```

**AC计算规则**（见PRD v4.0 §10附录D）：
- 无甲: 10 + Dex
- 轻甲: 护甲值 + Dex
- 中甲: 护甲值 + Dex(min+2)
- 重甲: 护甲值
- 盾牌: +2
- Mage Armor: 13 + Dex
- Unarmored Defense(Barbarian): 10 + Dex + Con

---

## Conditions（状态）

```jsonc
[
  { "id": "Grappled", "source": "Player A", "appliedAt": "2025-04-28T12:00:00Z" },
  { "id": "Concentrating", "source": "Hold Person", "appliedAt": "..." }
]
```

**2024标准状态列表**：Blinded、Charmed、Deafened、Exhaustion、Frightened、Grappled、Incapacitated、Invisible、Paralyzed、Petrified、Poisoned、Prone、Restrained、Stunned、Unconscious、Concentrating（专注，非官方状态但需追踪）

---

## Currency（金币）

```jsonc
{
  "cp": 0,   // Copper Piece
  "sp": 0,   // Silver Piece
  "ep": 0,   // Electrum Piece
  "gp": 100,  // Gold Piece
  "pp": 0    // Platinum Piece
}
```

---

## 多维职业数据结构（P1）

```jsonc
"classes": [
  { "classId": "Fighter", "level": 5, "subclassId": "Champion", "subclassLevel": 3 },
  { "classId": "Wizard", "level": 2, "subclassId": null, "subclassLevel": null }
]

// 法术位计算（多维职业）：
// Spellcasting全职业等级相加 → 查多职业法术位表
// 例外：Warlock Pact Magic独立计算
// 例外：Ranger/Paladin等级减半（向下取整）计入Spellcasting
```

---

## JSON导出格式

导出文件命名为：`<character-name>-<timestamp>.dnd2024.json`

```jsonc
{
  // 完整 Character 对象
  // 用于：备份、迁移、分享（不含DM敏感信息）
}
```

导入时校验：
1. `schemaVersion` 是否兼容
2. 规则合法性（属性值范围、专长前提等）
3. 如不兼容，提示用户并拒绝导入

---

## 静态规则数据库

以下数据以**静态JSON文件**存储（不存角色JSON），随app更新而更新：

```
static/
├── species.json          // 12个物种（10+2遗留）
├── backgrounds.json     // 16个背景
├── classes.json         // 12个职业（含特性列表，数组形式）
├── subclasses.json      // 所有子职业
├── feats.json          // 75个专长
├── spells.json         // ~391个法术（描述来自SRD）
├── weapons.json        // 武器列表（含mastery属性）
├── armor.json          // 护甲列表
├── gear.json           // 冒险装备列表
└── lookup-tables.json   // 熟练加值表、法术位表、Pact Magic表、多维职业法术位表
```

> **数据加载流程**：`default-loader.ts` 使用 `require()` 加载 `static/*.json`，通过 `createDataLoader(tables)` 工厂函数创建 `DataLoader` 实例。JSON数据中 `featuresByLevel` 使用数组格式，运行时转换为 `ReadonlyMap`。

**规则更新流程**：
1. WotC发布errata
2. 更新对应静态JSON文件
3. App检测到新版本，提示用户"规则数据有更新"
4. 用户确认后，重新计算角色数据
