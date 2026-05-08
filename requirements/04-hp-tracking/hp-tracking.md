# HP Tracking — Current HP/Temporary HP/Death Saves

> Corresponds to PRD §4.4

---

## Description

Track character current HP, temporary HP, and death save counts.

When HP ≤ 0, automatically enter death save flow.

---

## Acceptance Criteria

### HP Modification
- [x] `modifyHP(char, delta)` → new Character with updated HP
- [x] HP > maxHP → clamp to maxHP
- [x] HP < 0 → continue death save flow

### Temporary HP
- [x] Separate temporary HP field (visually distinct in data)
- [x] Temporary HP doesn't stack (take higher)
- [x] Damage consumes temporary HP first, then current HP
- [x] Temporary HP cleared after long rest

### Death Saves
- [x] HP drops to 0 or below → auto-expand death save tracker
- [x] Display: successes ○○○ / failures ○○○
- [x] Click success → light one ●; click failure → light one ●
- [x] 3 successes → character stabilizes (isStable=true), clear failures
- [x] 3 failures → character dies, show "Character has died"
- [x] Restore HP (any > 0) → clear death saves, isStable=false

### Short/Long Rest
- [x] `shortRest(char)` → recover HP using hit dice
- [x] Short rest consumes 1 hit die (increment `hitDice.used`)
- [x] `longRest(char)` → restore currentHP to maxHP
- [x] Long rest recovers hit dice (half total level, round up, minimum 1)

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
    "total": 5,
    "used": 2
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
| HP modified to negative | Record normally (e.g., -5), continue death save flow |
| Temporary HP & current HP modified simultaneously | Process temporary HP first, then damage/healing |
| Death saves in progress, then healed | Clear deathSaves, isStable=false |
| Long rest when hitDice.used > total | Clamp to 0 (shouldn't happen, defensive) |
| Multiple temporary HP sources | Take highest value, don't stack (2024 rules) |

---

## API Functions

```typescript
// Modify HP
function modifyHP(char: Character, delta: number): Character;

// Set temporary HP
function setTemporaryHP(char: Character, value: number): Character;

// Consume death save success
function recordDeathSaveSuccess(char: Character): Character;

// Consume death save failure
function recordDeathSaveFailure(char: Character): Character;

// Stabilize character
function stabilize(char: Character): Character;

// Short rest
function shortRest(char: Character, data?: DataLoader): Character;

// Long rest
function longRest(char: Character, data?: DataLoader): Character;
```

---

## References

- PRD §4.4 HP Tracking
- PRD §10 Appendix E HP Calculation Rules
- 2024 PHB p.22-23 Hit Points Rules
- 2024 PHB p.25 Short/Long Rest Rules
- 2024 PHB p.30 Death and Death Saves
