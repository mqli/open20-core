# Requirement 4.5.2: Spell Slot Tracking

> Corresponds to PRD §4.5

---

## Description

Spell slot tracking is used by casters every round in combat. Need to display used/total for each level, support click to consume/recover.

---

## Acceptance Criteria

- [x] Casters display spell slot tracker (levels 1-9)
- [x] Each level shows: used/total (e.g., Level 1: 2/3)
- [x] Click spell slot → used + 1
- [x] Click used spell slot → used - 1 (undo)
- [x] After long rest, all spell slots used = 0 (except Warlock)
- [x] Warlock Pact Magic resets after short rest
- [x] When spell slots exhausted,提示 "Spell slots depleted"
- [x] Query function: `calculateSpellSlots(char, data) → SpellSlotMap`

---

## Data Model

See `../../spec/data-model.md` → `Spells`

```typescript
// Character.spells.spellSlots
interface SpellSlotEntry {
  total: number;
  used: number;
}

// Character.spells.pactMagicSlots (Warlock only)
interface PactMagicSlots {
  level: number;    // Pact Magic spell level
  total: number;
  used: number;
  resetOn: "Short Rest" | "Long Rest";
}
```

Spell slot totals calculated per PRD §10 Appendix C rules, depends on:
- Class (Wizard/Cleric/etc.)
- Class level
- Spellcasting ability score (multiclass)

---

## Calculation Rules

### Single-Class Caster
Look up `lookup-tables.json.spellSlots[className][classLevel]`

### Warlock Pact Magic
Look up `lookup-tables.json.pactMagicSlots[warlockLevel]`

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

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Non-spellcaster | Don't display spell slot tracker |
| Only cantrips (level 0) | Don't display spell slot tracker (cantrips don't consume slots) |
| Warlock multiclass | Pact Magic slots displayed separately |
| Click when used == total | Don't increase, show "Spell slots depleted" |
| Long rest (Warlock) | Pact Magic not reset (needs short rest) |
| Short rest (non-Warlock) | Spell slots not reset |

---

## References

- PRD §4.5 Spell Management
- PRD §10 Appendix C Spell Slot Calculation Rules
- 2024 PHB p.30-33 Spellcasting Rules
- 2024 PHB p.154-155 Warlock Pact Magic
