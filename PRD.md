# DND 2024 角色表 App - 产品需求文档 (PRD) v4.0

**版本**: 4.0 (MVP 精简版)  
**日期**: 2025-04-28  
**定位**: 独立app，不考虑商业化与社区功能  
**原则**: 少即是多 —— 做少，做好

---

## 修订记录

| 版本 | 说明 |
|---|---|
| v1.0-v3.0 | 逐步膨胀：业务指标、竞争分析、社区功能、DM工具、可访问性……P0需求从6个涨到25+个，时间线从18周涨到26周 |
| **v4.0** | **回归本质**：砍掉一切非核心内容，聚焦"在游戏桌上能不能用"这一个判断标准 |

---

## 0. 一句话定义

> **一个基于DND 2024规则的数字角色表，让玩家在游戏桌上能快速创建角色、准确查看数据、方便追踪资源。**

不做的：赚钱、社交、当VTT、替代PHB。

---

## 1. 问题

**玩家用现有工具跑2024规则的团，体验很差。**

具体表现：
- 现有app(D&D Beyond、Roll20)对2024规则支持不完整或不准确
- 物种改名、新子职业、武器精通等新机制没有覆盖
- 纸质角色表无法自动计算，手工填表容易出错
- 游戏中要翻好几页才能找到AC是多少，太慢了
- 施法者用法术位全靠脑子记，经常忘记还剩几个

**不解决的话**：玩家继续用纸+笔或凑合用旧工具，2024规则的体验永远差一截。

---

## 2. 目标

### 唯一核心目标
**让玩家在游戏桌上拿起手机，3秒内找到想要的数据。**

### 衡量标准(非商业指标)
| 标准 | 说明 |
|---|---|
| 规则准确 | 创建的角色100%符合2024 PHB规则(自动化测试覆盖) |
| 速度够快 | 游戏中找到AC/HP/技能加值 ≤ 3次点击 |
| 不会丢数据 | 本地自动保存 + 可导出备份，不会因崩溃丢角色 |
| 施法者能用 | 法术位追踪、法术列表、法术卡片一应俱全 |

---

## 3. 不做 (Non-Goals)

以下功能**明确不做**，不是"以后做"，是"这个app不会做"：

| 不做 | 理由 |
|---|---|
| 商业化(广告/订阅/内购) | 独立app，为爱发电 |
| 社区功能(分享/评论/点赞) | 角色表是个人工具，不是社交平台 |
| 完整战斗追踪器(initiative tracker/全组HP) | 那是VTT的活 |
| 多人协作/DM实时查看 | 需要服务端，复杂度高，与独立app定位矛盾 |
| 内置骰子roller | 物理骰子才是D&D的灵魂 |
| 完整PHB内容 | 版权问题。只提供SRD内容和规则摘要 |
| VTT集成 | 那是另一个产品 |
| 云同步 | 独立app用本地存储 + JSON导出/导入，够用 |

**v3.0中的DM工具(NPC创建/怪物数据库/战役笔记)也砍掉**——不是不需要，而是角色表app的核心不是DM工具。DM用纸+脑子的效率其实更高。

---

## 4. 核心功能

### 4.1 角色创建

**目标**：按照2024 PHB规则，创建一个合法角色。

| 功能 | 说明 | 规则细节 |
|---|---|---|
| 选择物种(Species) | 10个2024物种 + 2个2014遗留(Half-Elf、Half-Orc) | Aasimar、Dragonborn、Dwarf、Elf、Gnome、Goliath、Halfling、Human、Orc、Tiefling |
| 选择背景(Background) | 16个2024背景 | 每个背景授予: 技能熟练项 + 工具熟练项 + 语言 + Origin Feat |
| 选择职业(Class) | 12个职业，含2024更新特性 | 如Weapon Mastery、Monk's Focus Points等 |
| 选择子职业(Subclass) | 2024名称 + 新增子职业 | 如Path of the Wild Heart(原Totem Warrior)、Path of the World Tree(新) |
| 分配属性(Ability Scores) | 标准数组 / 点买法 / 手动输入 | 2024规则: 标准数组不变，点买法可能修订 |
| 选择专长(Feats) | 75个专长，分4类 | Origin(背景)/ General / Fighting Style / Epic Boon(19级) |
| 选择技能(Skills) | 根据职业+背景自动计算 | 支持Expertise(双重熟练) |
| 选择语言(Languages) | 根据物种+背景自动计算 | 新增Common Sign Language |
| 自定义内容 | 允许添加自定义特性/专长/法术(free text) | **不是Homebrew系统**，只是让玩家可以手动填文字 |

> **关于多维职业(Multiclassing)**：MVP先支持单职业。多维职业的法术位计算极其复杂(需要处理pact magic、spellcasting混搭)，放在v1.1。但角色表的数据结构必须预留多维职业扩展空间。

> **关于2014遗留**：MVP只支持2024 PHB内容。2014遗留子职业(Cleric的Knowledge/Nature/Tempest Domain、Wizard的Conjuration/Enchantment/Necromancy/Transmutation)放到v1.1。

### 4.2 自动计算

**原则：凡能算的，不算错。**

| 计算项 | 公式/规则 | 易错点 |
|---|---|---|
| 属性调整值 | ⌊(属性值 - 10) / 2⌋ | 无 |
| 熟练加值(Proficiency Bonus) | 1-4级: +2; 5-8级: +3; 9-12级: +4; 13-16级: +5; 17-20级: +6 | 无 |
| 技能加值 | 属性调整值 + 熟练加值(如果熟练) | 需区分: 熟练/ 双重熟练(Expertise)/ 不熟练 |
| 豁免加值 | 属性调整值 + 熟练加值(如果熟练) | 每个职业的熟练豁免不同 |
| **AC** | 根据护甲类型计算: 无甲10+Dex、轻甲11+Dex、中甲护甲值+Dex(max+2)、重甲护甲值、+盾牌 | ⚠️ 需要处理: Mage Armor、Unarmored Defense、护甲+盾牌叠加 |
| **HP** | **1级**: 生命骰最大值 + Con调整值; **每升一级**: 上一级HP + 生命骷固定值(die面/2+1)或掷骰 + Con调整值 | ⚠️ v1.0公式错误已修正 |
| 先攻(Initiative) | Dex调整值 + 其他加值 | 某些专长/特性影响先攻 |
| 被动感知(Passive Perception) | 10 + 感知(观察)加值 | 优势/劣势会±5 |
| 法术位(Spell Slots) | 根据施法者等级查表 | ⚠️ Warlock的Pact Magic单独计算 |
| 法术攻击/DC | 攻击=熟练加值+施法属性调整值; DC=8+熟练加值+施法属性调整值 | 施法属性因职业而异(Int/Wis/Cha) |

### 4.3 游戏模式 ⭐

**这是整个app最重要的视图。** 玩家90%的使用时间在这里。

设计原则：
- 打开app**默认进入**游戏模式(不是角色创建页)
- 所有关键信息**一屏显示**，不需要滚动
- 大字体、高对比度、**支持黑暗模式**
- 手机单手可操作

```
┌─────────────────────────────┐
│  ┌─────┐  Borin Ironforge   │
│  │ 🛡️  │  Dwarf Fighter 5   │
│  └─────┘  AC 18  HP 38/42   │
│           Init +2  PP 13    │
├─────────────────────────────┤
│  ⚔️ Longsword +7  1d8+4    │
│  ⚔️ Hand Axe   +7  1d6+4   │
├─────────────────────────────┤
│  Skills          Bonus      │
│  Athletics  ⚡   +7         │
│  Intimidation    +4         │
│  Perception      +3         │
│  ...更多(展开)               │
├─────────────────────────────┤
│  Resources                  │
│  Second Wind   ● ○          │
│  Action Surge  ● ○          │
│  Weapon Mastery Cleave/Topple│
├─────────────────────────────┤
│  Spell Slots  (none)        │
├─────────────────────────────┤
│  [Short Rest] [Long Rest]   │
│  [Full Sheet]  [Edit]       │
└─────────────────────────────┘
```

游戏模式必须包含的信息：
1. **角色标识**: 名字、物种、职业、等级
2. **战斗核心**: AC、当前/最大HP、临时HP、先攻加值、被动感知
3. **武器/攻击**: 常用武器的攻击加值和伤害
4. **常用技能**: 3-5个置顶技能(玩家自选) + 展开查看全部
5. **资源追踪**: 职业特性使用次数(如Rage、Second Wind、Focus Points等)
6. **法术位**: 施法者的法术位使用情况(如: 1级 3/4, 2级 2/3)
7. **状态标记**: 当前状态(倒地、中毒等)快捷标记
8. **快捷操作**: 短休/长休按钮

### 4.4 HP追踪

| 功能 | 说明 |
|---|---|
| 修改当前HP | +/- 按钮 + 直接输入 |
| 临时HP | 单独显示和修改，先扣临时HP再扣当前HP |
| 死亡豁免 | HP≤0时自动显示，3成功/3失败 |
| HP恢复 | 短休: 消耗生命骰恢复HP; 长休: 恢复全部HP |

### 4.5 法术管理

| 功能 | 说明 |
|---|---|
| 法术列表 | 按等级分组显示已知/已准备法术 |
| 法术卡片 | 点击法术显示详情: 施法时间、射程、成分、持续时间、描述(SRD) |
| 法术位追踪 | 显示每级已用/总数，点击消耗/恢复 |
| 法术过滤 | 按等级、学校(防护/咒法等)、是否准备过滤 |
| 准备法术 | 每日准备法术的职业(Wizard/Cleric/Druid/Paladin)可以标记已准备 |

### 4.6 资源追踪

**核心原则：简单计数器 + 一键重置。**

不搞复杂的"短休重置/长休重置/每次战斗/每日"分类体系——那是过度工程。玩家自己知道什么短休回、什么长休回。app只需要：

| 功能 | 说明 |
|---|---|
| 计数器 | 每个可消耗资源有 +/- 按钮(如Rage 2/3) |
| 手动重置 | 一键将指定资源重置到最大值 |
| 短休按钮 | 重置标记为"短休恢复"的资源 + 消耗生命骰恢复HP |
| 长休按钮 | 重置所有资源 + 恢复全部HP + 恢复法术位 |

> 资源数据结构需要**记录重置类型**(短休/长休)，用于一键重置。但UI层面不需要让玩家操心分类——app根据规则自动标记。

### 4.7 等级提升

| 功能 | 说明 |
|---|---|
| 升级向导 | 选择提升到哪个职业(为多维职业预留) → 显示新等级获得的特性 → 自动计算HP增量 |
| ASI/Feat选择 | 特定等级(4/8/12/16/19)选择+2属性或feat |
| 新法术 | 施法者升级时选择新法术 |
| 新特性 | 自动显示新等级获得的职业特性 |

### 4.8 装备管理

| 功能 | 说明 |
|---|---|
| 武器列表 | 名称、伤害、属性、**武器精通属性**(如有) |
| 护甲列表 | 名称、AC加值、Dex限制、**是否装备**(影响AC计算) |
| 物品列表 | 名称、数量(消耗品如治疗药水) |
| 金币 | CP/SP/EP/GP/PP |

> MVP不需要负重计算和容器系统。玩家如果想要，可以用"自定义笔记"字段手动记。

### 4.9 数据安全

**独立app最怕丢数据。** 没有云端，数据安全全靠本地。

| 功能 | 说明 |
|---|---|
| 自动保存 | 每次修改后自动保存到本地存储 |
| JSON导出 | 导出角色数据为JSON文件(备份/迁移/分享) |
| JSON导入 | 从JSON文件导入角色(换设备时使用) |
| 数据校验 | 导入时校验JSON格式和规则合法性 |

---

## 5. 优先级

### P0 — 没有这些不能发布

| # | 功能 | 说明 |
|---|---|---|
| 1 | 角色创建(单职业) | Species + Background + Class + Subclass + Ability Scores + Feats + Skills |
| 2 | 自动计算 | 属性调整值、技能加值、AC、HP、法术位、先攻、被动感知 |
| 3 | 游戏模式 | 一屏显示所有关键数据，黑暗模式 |
| 4 | HP追踪 | 当前HP + 临时HP + 死亡豁免 + 短休/长休恢复 |
| 5 | 法术位追踪 | 已用/总数，一键消耗/恢复 |
| 6 | 法术列表 | 已知/已准备法术，按等级分组 |
| 7 | 法术卡片 | 法术详情(施法时间、射程、成分、持续时间、SRD描述) |
| 8 | 资源追踪 | 计数器 + 短休/长休一键重置 |
| 9 | 等级提升 | 升级向导 + ASI/Feat选择 + 新特性显示 |
| 10 | 装备管理 | 武器/护甲/物品/金币，影响AC计算 |
| 11 | 武器精通 | 显示可用武器精通属性 |
| 12 | 数据安全 | 自动保存 + JSON导出/导入 |
| 13 | 2024术语 | 所有术语已更新(Race→Species、Ki→Focus Points等) |
| 14 | 状态标记 | 常见状态快捷标记(倒地、中毒、束缚等) |

### P1 — 发布后第一版更新

| # | 功能 | 说明 |
|---|---|---|
| 1 | 多维职业 | 支持多职业角色，正确计算混合法术位 |
| 2 | 2014遗留 | 支持Half-Elf/Half-Orc、遗留子职业、遗留feat |
| 3 | 自定义特性 | 允许添加自定义专长/法术/特性(free text + 手动填加值) |
| 4 | 多角色管理 | 角色列表，快速切换 |
| 5 | 快速掷骰 | 点击技能/攻击，复制"1d20+加值"到剪贴板 |

### P2 — 有空再做

| # | 功能 | 说明 |
|---|---|---|
| 1 | PDF导出 | 打印友好的角色表 |
| 2 | 角色肖像 | 上传自定义肖像 |
| 3 | 背景故事/笔记 | 自由文本区域 |
| 4 | 可访问性 | 字体大小调整、色盲模式 |
| 5 | SRD怪物查询 | 基础怪物统计块查看 |

---

## 6. 规则数据范围

### 必须支持(MVP)

| 类别 | 数量 | 来源 |
|---|---|---|
| 物种(Species) | 10 + 2遗留 | 2024 PHB + 2014 PHB遗留 |
| 背景(Background) | 16 | 2024 PHB |
| 职业(Class) | 12 | 2024 PHB |
| 子职业(Subclass) | 每职业2-4个 | 2024 PHB |
| 专长(Feat) | 75(37新+35修订+3不变) | 2024 PHB |
| 法术(Spell) | ~391 | 2024 PHB(描述来自SRD) |
| 武器 | 全部2024 PHB武器 | 含武器精通属性 |
| 护甲 | 全部2024 PHB护甲 | 含AC计算 |
| 冒险装备 | 全部2024 PHB装备 | 含价格和重量 |

### 术语更新(MVP必须)

| 2014 | 2024 |
|---|---|
| Race | Species |
| Armor Proficiency | Armor Training |
| Ki / Ki Points | Monk's Focus / Focus Points |
| Inspiration | Heroic Inspiration |
| Cast a Spell | Magic |
| Use an Object | Utilize |
| Path of the Totem Warrior | Path of the Wild Heart |
| Way of the Open Hand | Warrior of the Open Hand |
| (全部术语更新见附录) | |

---

## 7. 开放问题

| # | 问题 | 阻塞? | 说明 |
|---|---|---|---|
| 1 | SRD 2024何时可用？包含哪些内容？ | ⚠️ 是 | 如果SRD 2024不可用，法术描述只能显示名称+摘要，不能显示完整描述 |
| 2 | 技术选型：Web App还是Native App？ | 否 | 建议Web App(响应式)先上线，后续可包装为PWA或Electron桌面app |
| 3 | 法术描述版权边界在哪？ | ⚠️ 是 | SRD允许显示哪些法术描述？需要法务确认 |
| 4 | 2024 PHB的errata如何持续跟进？ | 否 | 建立规则数据版本管理，定期检查WotC官方errata |

---

## 8. 时间线

### MVP开发: 10-12周

| 阶段 | 时间 | 交付物 |
|---|---|---|
| **规则引擎** | 3周 | 所有自动计算逻辑(属性、AC、HP、法术位、技能等) + 单元测试覆盖 |
| **角色创建流程** | 2周 | Species→Background→Class→Ability Scores→Feats→Skills 完整流程 |
| **游戏模式** | 2周 | 一屏核心数据视图 + HP追踪 + 法术位追踪 + 资源追踪 |
| **法术管理** | 1.5周 | 法术列表 + 法术卡片 + 过滤 + 准备法术 |
| **等级提升 + 装备** | 1.5周 | 升级向导 + 武器/护甲/物品/金币管理 |
| **数据安全 + 打磨** | 1周 | 自动保存 + JSON导出/导入 + 黑暗模式 + bug修复 |
| **测试 + 修bug** | 1周 | 规则准确性验证 + 真实玩家测试 |

> **为什么比v3.0的26周短这么多？** 因为砍掉了：DM工具(-4周)、社区功能(-3周)、云同步(-2周)、可访问性(-1周)、打印优化(-1周)、多人协作(-2周)、竞争分析/业务指标(不需要开发时间)。专注核心功能，做得精而不是做得广。

### MVP后迭代

| 版本 | 时间 | 内容 |
|---|---|---|
| v1.1 | +3周 | 多维职业 + 2014遗留 + 自定义特性 |
| v1.2 | +2周 | 多角色管理 + 快速掷骰 |
| v1.3 | +2周 | PDF导出 + 肖像 + 笔记 |
| v1.4 | +2周 | 可访问性 + SRD怪物查询 |

---

## 9. 设计原则

1. **游戏桌上3秒找到数据** — 这是一切设计的核心判据
2. **打开即游戏模式** — 不需要每次都导航到正确页面
3. **规则准确>功能丰富** — 宁可少做，不能算错
4. **本地优先** — 所有数据存在设备上，不依赖网络
5. **手机单手操作** — 游戏中一只手拿手机，另一只手拿骰子
6. **暗色主题** — 多数游戏环境偏暗，白底刺眼
7. **预留扩展** — 数据结构预留多维职业、Homebrew扩展空间，但UI暂不实现
8. **不替玩家做决定** — 规则有歧义的地方，让玩家手动选择，不要擅自推断

---

## 10. 附录

### A. 2024术语完整更新表

| 2014术语 | 2024术语 |
|---|---|
| Race | Species |
| Armor Proficiency | Armor Training |
| Ki / Ki Points | Monk's Focus / Focus Points |
| Primal Path | Barbarian Subclass |
| Martial Archetype | Fighter Subclass |
| Monastic Tradition | Monk Subclass |
| Sacred Oath | Paladin Subclass |
| Otherworldly Patron | Warlock Subclass |
| Natural Explorer | Deft Explorer |
| Flexible Casting | Font of Magic |
| Deflect Missiles | Deflect Attacks |
| Destroy Undead | Sear Undead |
| Diamond Soul | Disciplined Survivor |
| Empty Body | Superior Defense |
| Ki-Empowered Strikes | Empowered Strikes |
| Improved Divine Smite | Radiant Strikes |
| Cleansing Touch | Restoring Touch |
| Perfect Self | Perfect Focus |
| Vanish | Nature's Veil |
| Inspiration | Heroic Inspiration |
| Cast a Spell (action) | Magic (action) |
| Use an Object (action) | Utilize (action) |
| Branding Smite (spell) | Shining Smite |
| Feeblemind (spell) | Befuddlement |
| Path of the Totem Warrior | Path of the Wild Heart |
| Way of Mercy | Warrior of Mercy |
| Way of Shadow | Warrior of Shadow |
| Way of the Four Elements | Warrior of the Elements |
| Way of the Open Hand | Warrior of the Open Hand |
| Aberrant Mind (Sorcerer) | Aberrant Sorcery |
| Clockwork Soul | Clockwork Sorcery |
| Draconic Bloodline | Draconic Sorcery |
| Wild Magic | Wild Magic Sorcery |
| The Archfey | Archfey Patron |
| The Celestial | Celestial Patron |
| The Fiend | Fiend Patron |
| The Great Old One | Great Old One Patron |
| School of Abjuration | Abjurer |
| School of Divination | Diviner |
| School of Evocation | Evoker |
| School of Illusion | Illusionist |

### B. 2024职业资源追踪清单

| 职业 | 资源 | 重置方式 | 2024术语 |
|---|---|---|---|
| Barbarian | Rage | 长休 | Rage |
| Bard | Bardic Inspiration | 长休(5级后短休) | Bardic Inspiration |
| Cleric | Channel Divinity | 短休 | Channel Divinity |
| Druid | Wild Shape | 短休 | Wild Shape |
| Fighter | Second Wind | 短休 | Second Wind |
| Fighter | Action Surge | 短休 | Action Surge |
| Fighter | Indomitable | 长休 | Indomitable |
| Monk | Focus Points | 短休 | Focus Points(原Ki Points) |
| Paladin | Channel Divinity | 短休 | Channel Divinity |
| Paladin | Lay on Hands | 长休 | Lay on Hands |
| Ranger | Favored Enemy | 长休 | — |
| Rogue | Sneak Attack | 每回合 | Sneak Attack |
| Sorcerer | Sorcery Points | 长休 | Sorcery Points |
| Warlock | Pact Magic | 短休 | Pact Magic Spell Slots |
| Wizard | Arcane Recovery | 长休 | Arcane Recovery |

### C. 法术位计算规则

**单职业施法者**: 根据施法者等级查表。

**Warlock(特殊)**: Pact Magic单独计算，短休恢复。与普通法术位独立。

**多维职业(P1)**: 
- Spellcasting职业等级相加，查多职业施法者表
- Pact Magic(Warlock)单独计算
- Paladin/Ranger算半级(向下取整)

### D. AC计算规则

| 情况 | AC公式 |
|---|---|
| 无甲(无特性) | 10 + Dex调整值 |
| 无甲 + Mage Armor | 13 + Dex调整值 |
| 无甲 + Unarmored Defense(Barbarian) | 10 + Con调整值 + Dex调整值 |
| 无甲 + Unarmored Defense(Monk) | 10 + Wis调整值 + Dex调整值 |
| 轻甲 | 护甲AC + Dex调整值 |
| 中甲 | 护甲AC + Dex调整值(max +2) |
| 重甲 | 护甲AC |
| 盾牌 | +2 AC(与以上任何情况叠加) |
| 魔法护甲/盾牌 | 按物品描述加值 |

### E. HP计算规则(修正!)

**1级HP**:
```
HP = 职业生命骰最大值 + Constitution调整值
例: Fighter (d10) with Con +3 → HP = 10 + 3 = 13
```

**每升一级HP**:
```
HP增量 = 生命骰固定值(die面/2向上取整) + Constitution调整值
例: Fighter升级 → HP增量 = 6 (10/2+1) + 3 = 9
```

**总HP** (5级Fighter, Con +3):
```
1级: 10 + 3 = 13
2级: 13 + 6 + 3 = 22
3级: 22 + 6 + 3 = 31
4级: 31 + 6 + 3 = 40
5级: 40 + 6 + 3 = 49
```

> 生命骰固定值对照: d6=4, d8=5, d10=6, d12=7

---

*本文档是MVP范围的精确定义。任何超出本文档的功能需求，都是v1.1+的事情。*
