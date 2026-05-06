# 需求 4.5.1：法术列表与法术卡片

## 1. 需求描述

法术管理是施法者角色表的核心功能。施法者需要查看已知法术列表、准备法术（Wizard/Cleric等）、查看法术卡片（含SRD描述）。

---

## 2. 验收标准

- [ ] 施法者显示已知法术列表（按等级分组）
- [ ] 准备法术职业（Wizard/Cleric/Druid/Paladin）显示"已准备"复选框
- [ ] 长休后准备法术清空（需重新准备）
- [ ] 点击法术显示法术卡片：名称、等级、学校、施法时间、射程、成分、持续时间、SRD描述
- [ ] 法术可以按等级、学校、是否准备过滤
- [ ] 非施法者隐藏法术区域
- [ ] 支持从SRD加载法术描述文本

---

## 3. 数据模型

引用 `../../spec/data-model.md` 中的结构：

```typescript
// Character.spells
interface CharacterSpells {
  knownSpells: string[];        // ["Fireball", "Shield", ...]
  preparedSpells: string[];     // ["Fireball", ...]
  spellcastingAbility: string;  // "Intelligence" | "Wisdom" | "Charisma"
}
```

法术详情从 SRD 静态数据加载：

```typescript
interface SRDSpell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: { V: boolean; S: boolean; M?: string };
  duration: string;
  description: string;   // SRD 描述文本
  classes: string[];     // 可获取该法术的职业
}
```

---

## 4. 边界情况

| 场景 | 处理方式 |
|------|----------|
| 非施法者职业 | 完全隐藏法术区域，不渲染任何法术相关 UI |
| Wizard（准备施法者） | 显示"已准备"复选框，长休后清空 preparedSpells |
| Sorcerer/Warlock（已知施法者） | 不显示"已准备"复选框，knownSpells 即全部可用 |
| 法术描述在 SRD 中不存在 | 显示"描述暂不可用"，不阻断 UI |
| 过滤后无匹配法术 | 显示"无匹配法术"，而非空白 |
| 法术等级 0（戏法） | 按等级 0 分组，不消耗法术位 |

---

## 5. 参考资料

- PRD v4.0 §4.5 法术管理
- 2024 PHB p.30-33 施法规则
- SRD 5.2 Spell List（法术描述文本来源）
