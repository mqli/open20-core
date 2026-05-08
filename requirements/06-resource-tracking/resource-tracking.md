# Requirement 4.2.3: Resource Tracking

> Corresponds to PRD §4.2 & §10 Appendix B

---

## Description

Track class-specific consumable resources (e.g., Rage uses, Focus Points, Second Wind, etc.).

Each resource has a fixed reset type (Short Rest/Long Rest/Per Turn/Daily).

---

## Acceptance Criteria

- [x] Auto-create resource counters based on class
- [x] Resource display: current/max (e.g., Rage ●●○)
- [x] Click resource → used + 1 (consume)
- [x] Click used resource → used - 1 (recover)
- [x] `shortRest(char)` → reset `resetOn="Short Rest"` resources
- [x] `longRest(char)` → reset all resources + recover HP + spell slots
- [x] Resource data structure records `resetOn` field

---

## Data Model

See `../../spec/data-model.md` → `Resource`

```typescript
interface Resource {
  readonly id: string;           // kebab-case ID
  readonly name: string;        // Display name
  readonly current: number;      // Currently available
  readonly max: number;          // Maximum uses
  readonly resetOn: ResetType;
  readonly displayType: DisplayType;
}

type ResetType = 'Short Rest' | 'Long Rest' | 'Per Turn' | 'Daily' | 'Never';

type DisplayType = 'counter' | 'dots' | 'points';
```

**Example data**:
```jsonc
{
  "resources": [
    { "id": "rage", "name": "Rage", "current": 2, "max": 2, "resetOn": "Long Rest", "displayType": "dots" },
    { "id": "focus-points", "name": "Focus Points", "current": 3, "max": 6, "resetOn": "Short Rest", "displayType": "points" },
    { "id": "second-wind", "name": "Second Wind", "current": 1, "max": 1, "resetOn": "Short Rest", "displayType": "counter" }
  ]
}
```

**ResetType enum**:

| ResetType | Meaning | Typical Resource |
|---|---|---|
| Short Rest | Reset after short rest | Second Wind, Focus Points |
| Long Rest | Reset after long rest | Rage, Wild Shape |
| Per Turn | Reset each turn | Sneak Attack |
| Daily | Reset each day | Some DMG optional rules |
| Never | Never auto-reset | Manual management |

---

## API Functions

```typescript
// Consume one use of a resource
function consumeResource(char: Character, resourceId: string): Character;

// Recover one use of a resource
function recoverResource(char: Character, resourceId: string): Character;

// Get all resources for character
function getResources(char: Character): readonly Resource[];

// Check if resource is available
function isResourceAvailable(char: Character, resourceId: string): boolean;

// Reset resources by reset type (used internally by shortRest/longRest)
function resetResources(char: Character, resetType: ResetType): Character;
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Multiclass character | Merge all class resources, don't duplicate same-name |
| current > max | Clamp to max |
| current < 0 | Clamp to 0 |
| Click when used == max | Don't increase |
| Long rest trigger | Reset all `resetOn="Long Rest"` AND `resetOn="Short Rest"` |
| Short rest trigger | Only reset `resetOn="Short Rest"` |
| Per-turn reset | Auto-reset at "new turn" (needs turn tracking support) |

---

## Class Resource Reference

| Class | Resource | Reset |
|---|---|---|
| Barbarian | Rage | Long Rest |
| Bard | Bardic Inspiration | Long Rest (level 5+ Short Rest) |
| Cleric | Channel Divinity | Short Rest |
| Druid | Wild Shape | Short Rest |
| Fighter | Second Wind | Short Rest |
| Fighter | Action Surge | Short Rest |
| Fighter | Indomitable | Long Rest |
| Monk | Focus Points | Short Rest |
| Paladin | Channel Divinity | Short Rest |
| Paladin | Lay on Hands | Long Rest |
| Ranger | Favored Enemy | Long Rest |
| Rogue | Sneak Attack | Per Turn |
| Sorcerer | Sorcery Points | Long Rest |
| Warlock | Pact Magic Slots | Short Rest |

---

## References

- PRD §4.2 Automatic Calculations
- PRD §10 Appendix B Class Resource Tracking List
- 2024 PHB class chapters (Barbarian p.20, Monk p.45, Fighter p.30, etc.)
