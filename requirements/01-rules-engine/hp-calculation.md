# Engine — HP Calculation

> Corresponds to PRD §4.2 & §10 Appendix E
> **One of the easiest rules to miscalculate — must be 100% accurate.**

---

## Description

HP (Hit Points) calculation has two phases:
1. **Level 1**: Max hit die + Con modifier
2. **Each level up**: Previous HP + fixed value (ceil(hit die/2)) + Con modifier

---

## Acceptance Criteria

- [x] Level 1 HP = max hit die + Con modifier
- [x] HP increment per level = `ceil(hitDieSize / 2)` + Con modifier
- [x] Negative Con modifier can reduce HP (but total HP can't be < 1)
- [x] Player can choose: fixed value (recommended) or roll
- [x] Short rest can recover HP using hit dice (number = number of short rests, cap = total level)
- [x] Long rest recovers all HP and all hit dice (half total level, round up, minimum 1)
- [x] Multiclass: HP accumulates from each class
- [x] `hitDice.total` = total character level; `hitDice.used` tracks consumed hit dice

---

## Calculation Formula

### Level 1 HP
```
hp = hitDieMaximum + conMod
```

### Level Up HP Increment
```
hpIncrement = ceil(hitDieSize / 2) + conMod
```

**Fixed value table**:

| Hit Die | Fixed Value |
|---|---|
| d6 | 4 |
| d8 | 5 |
| d10 | 6 |
| d12 | 7 |

### Total HP Example
5th level Fighter, Con +3:
```
Level 1: 10 + 3 = 13
Level 2: 13 + 6 + 3 = 22
Level 3: 22 + 6 + 3 = 31
Level 4: 31 + 6 + 3 = 40
Level 5: 40 + 6 + 3 = 49
```

### Hit Dice Recovery (Long Rest)
```
recovered = max(ceil(totalLevel / 2), 1)
```

---

## Data Model

See `../../spec/data-model.md` → `HitPoints`

```jsonc
{
  "max": 49,
  "current": 38,
  "temporary": 0,
  "hitDice": {
    "die": "d10",
    "total": 5,      // = total level
    "used": 2         // consumed this long rest cycle
  },
  "deathSaves": {
    "successes": 0,
    "failures": 0,
    "isStable": false
  }
}
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Negative Con modifier | HP increment may be < 0, allowed (but total HP can't be < 1) |
| Multiple hit die types (multiclass) | Each class tracks hitDie independently, recovery calculated combined |
| Unconscious then healed | Clear deathSaves, isStable=true |
| Temporary HP | Tracked separately, doesn't count toward current, expires/replaces |
| Short rest HP recovery | Consume 1 hit die, roll or fixed value + Con |

---

## References

- PRD §4.2 Automatic Calculations
- PRD §10 Appendix E HP Calculation Rules
- 2024 PHB p.22-23 Hit Points Rules
- 2024 PHB p.25 Short/Long Rest Rules
