# 需求 4.5.2：法术位追踪

## 1. 需求描述

法术位追踪是施法者在战斗中每轮都可能用到的功能。需要显示每级法术位的已用/总数，支持点击消耗和恢复。

---

## 2. 验收标准

- [ ] 施法者显示法术位追踪器（1-9级）
- [ ] 每级显示：已用/总数（如 1级 2/3）
- [ ] 点击法术位 → used + 1
- [ ] 点击已用法术位 → used - 1（撤销）
- [ ] 长休后所有法术位 used = 0（Warlock除外）
- [ ] Warlock Pact Magic 短休后重置
- [ ] 法术位不足时提示"法术位已用完"

---

## 3. 数据模型

引用 `../../spec/data-model.md` 中的结构：

```typescript
// Character.spells.spellSlots
interface SpellSlots {
  [level: string]: {    // "1" 到 "9"
    total: number;
    used: number;
  };
}

// Character.spells.pactMagicSlots（Warlock专属）
interface PactMagicSlots {
  level: number;    // Pact Magic 法术等级
  total: number;
  used: number;
  resetOn: "Short Rest" | "Long Rest";
}
```

法术位总数按 PRD v4.0 §10 附录C 的规则计算，取决于：
- 职业（Wizard/Cleric/etc.）
- 职业等级
- 法术能力属性值（多职业时取最高）

---

## 4. 边界情况

| 场景 | 处理方式 |
|------|----------|
| 非施法者 | 不显示法术位追踪器 |
| 只有0级法术（戏法） | 不显示法术位追踪器（戏法不消耗法术位） |
| Warlock 多职业 | Pact Magic 法术位与其他法术位分开显示 |
| 点击 used == total | 不再增加，提示"法术位已用完" |
| 长休时 Warlock | Pact Magic 不重置（需短休） |
| 短休时非Warlock | 法术位不重置 |

---

## 5. 参考资料

- PRD v4.0 §4.5 法术管理
- PRD v4.0 §10 附录C 法术位计算规则
- 2024 PHB p.30-33 施法规则
- 2024 PHB p.154-155 Warlock Pact Magic
