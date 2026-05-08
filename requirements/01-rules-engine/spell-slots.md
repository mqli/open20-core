# Engine — Spell Slots Calculation

> Corresponds to PRD §4.2 & §10 Appendix C
> **Spell slot calculation is core for spellcasting characters. Warlock has special rules.**

---

## Description

Calculate spell slot count based on spellcaster level using lookup tables.

Warlock uses Pact Magic, which recovers on short rest and is calculated independently from normal spell slots.

Multiclass (P1) requires consulting the multiclass spell slot table.

---

## Acceptance Criteria

### Single-Class Spellcaster
- [x] Look up **Spell Slots by Level** table using `classes[].level` and class
- [x] Non-casters: don't display spell slots
- [x] Casters: correctly display spell slots levels 1-9 (used/total)
- [x] Auto-update spell slot totals on level up

### Warlock Pact Magic (Special)
- [x] Warlock spell slots calculated **independently**, not merged with other casters
- [x] Pact Magic slots recover on **short rest** (normal casters recover on long rest)
- [x] Pact Magic slot level increases with Warlock level (levels 1-5 correspond to spell levels 1-3)
- [x] Warlock slot count fixed (1 at level 1, 2 at levels 2-5, doesn't increase after 6+)

### Spell Slot Consumption/Recovery
- [x] Click spell slot → `used + 1`, total unchanged
- [x] Click used spell slot → `used - 1`
- [x] Long rest → all spell slots `used = 0` (except Warlock)
- [x] Short rest → Warlock's `pactMagicSlots.used = 0`
- [x] Cleric/Druid/Paladin/Wizard: prepared spells cleared after long rest (need re-preparation)

### Multiclass (P1)
- [x] Sum Spellcasting class levels → look up multiclass spell slot table
- [x] Warlock Pact Magic calculated independently (not added to multiclass table)
- [x] Paladin/Ranger levels counted as **half (round down)** for Spellcasting level

---

## Data Model

See `../../spec/data-model.md` → `Spells`

**Spell Slots by Level table** (static data):
```jsonc
// static/lookup-tables.json
{
  "spellSlots": {
    "Wizard": {
      "1": [2, 0, 0, 0, 0, 0, 0, 0, 0],
      "2": [3, 0, 0, 0, 0, 0, 0, 0, 0],
      ...
    },
    "Cleric": { ... },
    "Druid": { ... },
    "Sorcerer": { ... },
    "Bard": { ... }
  },
  "pactMagicSlots": {
    "1": { "slots": 1, "level": 1 },
    "2": { "slots": 2, "level": 1 },
    "5": { "slots": 2, "level": 2 },
    "7": { "slots": 2, "level": 3 },
    "11": { "slots": 3, "level": 5 }
  },
  "multiclassSpellSlots": {
    "1": [2, 0, 0, 0, 0, 0, 0, 0, 0],
    "2": [3, 0, 0, 0, 0, 0, 0, 0, 0],
    // ... total spellcasting levels 1-20
  }
}
```

**Character JSON storage**:
```jsonc
{
  "spells": {
    "spellcastingAbility": "Intelligence",
    "spellSaveDC": 15,
    "spellAttackBonus": 7,
    "knownSpells": ["fireball", "mage-armor", "shield"],
    "preparedSpells": ["fireball", "mage-armor"],
    "spellSlots": {
      "1": { "total": 2, "used": 0 },
      "2": { "total": 0, "used": 0 },
      // ... up to level 9
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

## Spell Slot Calculation Rules

### Single-Class Spellcaster
Look up: `lookup-tables.json.spellSlots[className][classLevel]`

Example: 5th level Wizard
```
Level 1 slots: 2
Level 2 slots: 3
Level 3 slots: 0
...
```

### Warlock Pact Magic
Look up: `lookup-tables.json.pactMagicSlots[warlockLevel]`

| Warlock Level | Pact Magic Slots | Slot Level |
|---|---|---|
| 1-4 | 1 | 1 |
| 2-5 | 2 | 1 |
| 6-10 | 2 | 2 |
| 11-16 | 3 | 3 |
| 17-20 | 4 | 4 |

### Multiclass (P1)
Sum Spellcasting class levels → look up `multiclassSpellSlots[totalSpellcastingLevel]`

**Exceptions**:
- Warlock Pact Magic **not added** (calculated independently)
- Paladin/Ranger levels ÷ 2 (round down) counted

Example: Fighter 5 / Wizard 3 / Warlock 2
```
Spellcasting level = Wizard 3 = 3
Look up table → Spell slots: level 1: 2, level 2: 0...
Warlock Pact Magic independent: 2 level-1 slots (short rest recovery)
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Both Wizard + Cleric | Spell slots by **total spellcasting level** (not separate) |
| Warlock + other casters | Pact Magic independent, other slots merged |
| All spell slots used | Can still cast spells (using higher-level slots) |
| Level up gains new slots | Used count unchanged (e.g., 2/2 → 1/3, not 0/3) |
| Long rest spell recovery | Warlock unaffected (short rest recovery) |
| Cleric/Druid/Wizard after long rest | Prepared spells cleared (need re-preparation) |

---

## Warlock Mystic Arcanum

Warlocks at levels 11/13/15/17 gain **Mystic Arcanum**, can cast 6th/7th/8th/9th level spells once per long rest.

```jsonc
{
  "mysticArcanum": {
    "11": { "spellId": "flesh-to-stone", "used": false },
    "13": { "spellId": "power-word-stun", "used": false }
  }
}
```

All Mystic Arcanum `used = false` after long rest.

---

## References

- PRD §4.2 Automatic Calculations
- PRD §10 Appendix C Spell Slot Calculation Rules
- 2024 PHB p.32-33 Spell Slots Rules
- 2024 PHB p.154-155 Warlock Pact Magic
- 2024 PHB p.36 Multiclass Spell Slot Rules
