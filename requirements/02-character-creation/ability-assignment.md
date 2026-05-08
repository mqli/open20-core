# Requirement: Ability Score Assignment

> Corresponds to PRD §4.1

---

## Description

Player assigns 6 ability scores (Str, Dex, Con, Int, Wis, Cha) during character creation.

**2024 Rule Changes:**
- Standard array fixed at: 15, 14, 13, 12, 10, 8 (not adjustable)
- Point buy cost table unchanged
- Manual input range: 8-15 (2014 legacy characters can go to 20)

**Important Notes:**
- Racial bonuses (`racialBonuses`) not input here, auto-applied after species selection
- Feat bonuses (`featBonuses`) not input here, auto-applied when gaining feats
- Final ability score = base + racialBonuses + featBonuses

---

## Acceptance Criteria

### General Requirements
- [x] Support 3 assignment methods: Standard Array / Point Buy / Manual Input
- [x] Can switch between methods, preserving entered values (where applicable)
- [x] On confirmation, write to `Character.abilityScores.base`
- [x] Display current value, modifier, racial bonuses, feat bonuses, final value

### Standard Array Mode
- [x] Display 6 fixed number cards: 15, 14, 13, 12, 10, 8
- [x] Support drag-and-drop to 6 ability slots
- [x] Support click-to-select (touchscreen compatible)
- [x] All 6 numbers must be assigned, no duplicates
- [x] Unassigned numbers highlighted

### Point Buy Mode
- [x] Display current total points (initial 27)
- [x] Real-time remaining points calculation
- [x] Point buy cost table displayed
- [x] Each ability adjustable between 8-15 (buttons +/-)
- [x] Disable + button when insufficient points remain
- [x] Disable confirm button when total cost > 27 points

### Manual Input Mode
- [x] Numeric input field for each ability
- [x] Input range limit: 8-15 (2014 legacy can go to 20, needs detection)
- [x] Real-time validation: out-of-range shows error
- [x] Support keyboard up/down arrows (+1/-1)
- [x] 6 abilities can have different values (uniqueness not required)

### Data Persistence
- [x] On "Confirm", write to `Character.abilityScores.base`
- [x] Auto-calculate and write `Character.abilityScores.modifier`
- [x] Support temporary save (incomplete assignment)
- [x] Preserve entered data when going back

---

## Data Model

See `../../spec/data-model.md` → `AbilityScores`

```typescript
interface AbilityScores {
  readonly base: {
    readonly Strength: number;    // Base value (output of this requirement)
    readonly Dexterity: number;
    readonly Constitution: number;
    readonly Intelligence: number;
    readonly Wisdom: number;
    readonly Charisma: number;
  };
  readonly racialBonuses: Record<string, number>;     // Auto-applied after species selection
  readonly featBonuses: Record<string, number>;       // Auto-applied when gaining feats
  readonly modifier: Record<string, number>;          // Auto-calculated: (value-10)/2 floor
  readonly total: Record<string, number>;             // Auto-calculated: base + racial + feat
}
```

**Point Buy Cost Table** (constant):

| Ability Score | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|
| Cost | 0 | 1 | 2 | 3 | 4 | 5 | 7 | 9 |

---

## Edge Cases

| Situation | Handling |
|---|---|
| Switching methods mid-assignment | Preserve ability values, recalculate remaining points |
| Point buy exceeds 27 | Disable confirm, show error "Cost exceeds 27 points" |
| Manual input out of range | Show error, disable confirm |
| 2014 legacy character | Allow scores up to 20, detect via `schemaVersion` |
| Species/Feat bonuses applied | Recalculate `total` and `modifier` automatically |

---

## References

- PRD §4.1 Character Creation
- 2024 PHB p. 20-21 Ability Scores
- 2024 PHB p. 22 Point Buy Rules
