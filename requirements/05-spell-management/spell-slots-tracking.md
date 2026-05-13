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
// Character.spells (per-class tracking)
interface CharacterSpells {
  // Per-class spell tracking (keyed by classId)
  classSpellcasting: Record<string, ClassSpellData>;

  // Unified spell slots (multiclass combination)
  spellSlots: Record<SpellLevel, SpellSlotEntry>;

  // Warlock Pact Magic (separate from regular slots)
  pactMagicSlots: PactMagicSlots | null;
}

interface ClassSpellData {
  classId: string;
  spellcastingAbility: AbilityName;
  spellSaveDC: number;      // 8 + PB + ability mod
  spellAttackBonus: number;

  // Interpretation depends on class's Spellcasting.knownSource:
  // - 'class_list' (Cleric/Druid): ALL spells on class list (auto-populated)
  // - 'spellbook' (Wizard): spells in spellbook
  // - 'limited' (Paladin/Ranger): chosen known spells
  // - 'known' (Sorcerer/Bard/Warlock): chosen known spells
  knownSpells: readonly string[];

  // For preparation casters: currently prepared
  // For known casters: same as knownSpells
  preparedSpells: readonly string[];

  // Always prepared (Domain spells, etc.) — doesn't count against max
  alwaysPreparedSpells?: readonly string[];

  // Max prepared = class level + ability mod (for preparation casters)
  maxPrepared: number;
}
```

> **Note**: `changesPerRest` and `changesPerLevel` in the `Spellcasting` type are **reference fields** (documenting SRD rules). The code does **NOT** enforce these limits — players can manage their own characters freely.

interface SpellSlotEntry {
  total: number;
  used: number;
}

interface PactMagicSlots {
  level: number;    // Pact Magic spell level
  total: number;
  used: number;
  resetOn: "Short Rest"; // Warlock slots always reset on short rest
}
```

**Key changes from previous version**:
- `spellcastingAbility`, `spellSaveDC`, `spellAttackBonus` are now PER CLASS
- `knownSpells` and `preparedSpells` are tracked per class
- `spellSlots` is still a unified pool (correct for D&D 5e multiclassing)
- Added `preparedChangedThisRest` and `knownChangedThisLevel` to enforce SRD change limits

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
| Warlock multiclass | Pact Magic slots displayed separately (reset on short rest) |
| Click when used == total | Don't increase, show "Spell slots depleted" |
| Long rest (Warlock) | Pact Magic not reset (needs short rest) |
| Short rest (non-Warlock) | Spell slots not reset |
| Cleric/Druid (`knownSource: 'class_list'`) | `knownSpells` auto-populated from class list on creation/recompute |
| Paladin/Ranger (`changesPerRest: 1`) | Enforce max 1 prepared spell change per long rest |
| Bard/Sorcerer/Warlock (`changesPerLevel: 1`) | Enforce max 1 known spell change per level gain |

---

## References

- PRD §4.5 Spell Management
- PRD §10 Appendix C Spell Slot Calculation Rules
- 2024 PHB p.30-33 Spellcasting Rules
- 2024 PHB p.154-155 Warlock Pact Magic
