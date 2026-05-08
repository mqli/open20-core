# Engine — AC Calculation

> Corresponds to PRD §4.2 & §10 Appendix D

---

## Description

AC (Armor Class) is the most error-prone calculation across all classes/equipment combinations.

AC calculation must cover: **Unarmored / Light Armor / Medium Armor / Heavy Armor / Shield / Mage Armor / Unarmored Defense**.

---

## Acceptance Criteria

- [x] Unarmored AC = 10 + Dex modifier
- [x] Mage Armor spell AC = 13 + Dex modifier
- [x] Light armo AC = base AC + Dex modifier (no cap)
- [x] Medium armo AC = base AC + Dex modifier (cap +2)
- [x] Heavy armo AC = base AC (no Dex)
- [x] Shield +2 AC (stacks with any armo)
- [x] Barbarian Unarmored Defense: 10 + Dex + Con
- [x] Monk Unarmored Defense: 10 + Dex + Wis
- [x] Heavy armo strength requirement (movement halved if insufficient)
- [x] Armor training required for medium/heavy (disadvantage if not proficient)
- [x] AC auto-recalculates when equipment "equipped" status changes

---

## Data Model

See `../../spec/data-model.md` → `Equipment` and `CombatStats`

**Armor JSON structure**:
```jsonc
{
  "baseAC": 16,
  "dexBonus": false,        // whether Dex applies
  "dexCap": null,            // medium = 2, light = null
  "strengthRequirement": 13,
  "equipped": true
}
```

**Function signature**:
```typescript
calculateAC(character: Character, equipment: EquipmentItem[], data: DataLoader): number
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Multiple armor pieces equipped | Only one armor + one shield can be equipped=true |
| Mage Armor + physical armor | Mage Armor overridden (use higher) |
| Multiple Unarmored Defense sources | Only highest AC applied (don't stack) |
| Heavy armor but Str insufficient | Warning "insufficient strength", AC calculated but penalty applies |
| No armor equipped | Automatically use unarmored formula |

---

## References

- PRD §4.2 Automatic Calculations
- PRD §10 Appendix D AC Calculation Rules
- 2024 PHB p.20-21 Armor Table
- 2024 PHB p.152-153 Barbarian Unarmored Defense
- 2024 PHB p.170-171 Monk Unarmored Defense
