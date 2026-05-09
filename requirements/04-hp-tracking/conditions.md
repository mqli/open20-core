# Requirement 4.3.4: Conditions Tracking

> Corresponds to PRD §4.3 (Conditions)

---

## Description

Track character's current conditions. 2024 rules have 14 standard conditions that affect AC/attacks/saves.

---

## Acceptance Criteria

- [x] Support 14 standard conditions (toggle on/off)
- [x] Multiple conditions can be active simultaneously
- [x] Each condition has brief description (tooltip)
- [x] Prone: attacks against character have advantage/disadvantage
- [x] Incapacitated: character can't take actions
- [x] Conditions cleared after long rest
- [x] Query function: `getActiveConditions(char)` → Condition[]

---

## Data Model

See `../../spec/data-model.md` → `Character.conditions`

```typescript
// Character.conditions: readonly ActiveCondition[]

interface ActiveCondition {
  readonly name: ConditionName;
  readonly source?: string;  // What caused it
  readonly duration?: number;  // Rounds remaining (optional)
}

type ConditionName = 
  | "Blinded"
  | "Charmed"
  | "Deafened"
  | "Exhaustion"    // Has levels 1-6
  | "Frightened"
  | "Grappled"
  | "Incapacitated"
  | "Invisible"
  | "Paralyzed"
  | "Petrified"
  | "Poisoned"
  | "Prone"
  | "Restrained"
  | "Stunned"
  | "Unconscious"
  | "Concentrating";  // Not official condition, but track for concentration
```

**Condition effects on calculations** (considered in `derivedStats` calculation):

| Condition | Affected Calculations |
|---|---|
| Blinded | Attack rolls have disadvantage; attacks against have advantage |
| Prone | Melee attack rolls have disadvantage; ranged attack rolls have disadvantage; attacks against have advantage |
| Incapacitated | Can't take actions or bonus actions |
| Grappled | Speed = 0 |
| Restrained | Attack rolls have disadvantage; DEX saves have disadvantage; speed = 0 |
| Stunned | Lose all actions; attack rolls have disadvantage; attacks against have advantage |
| Unconscious | HP = 0 or stabilized; attacks against auto-crit |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Multiple conditions active | Effects stack (take most disadvantageous) |
| Exhaustion | Show level selector (1-6), each level has different effects |
| Concentrating | Taking damage triggers DC10+damage CON save to maintain |
| Long rest | Clear all conditions (Exhaustion needs manual level reduction) |
| Condition count exceeds screen | Horizontal scroll or collapsed display |
| Invalid condition name written | Ignore, don't add to conditions array |

---

## API Functions

```typescript
// Toggle condition on/off
function toggleCondition(char: Character, conditionName: ConditionName): Character;

// Check if condition active
function hasCondition(char: Character, conditionName: ConditionName): boolean;

// Get all active conditions
function getActiveConditions(char: Character): ActiveCondition[];

// Clear all conditions (e.g., after long rest)
function clearAllConditions(char: Character): Character;

// Set exhaustion level
function setExhaustionLevel(char: Character, level: 0|1|2|3|4|5|6): Character;
```

---

## References

- PRD §4.3 Game Mode (Conditions)
- 2024 PHB p.30 Conditions
- 2024 PHB p.363-370 Appendix A: Conditions
- SRD 5.2 Appendix A: Conditions
