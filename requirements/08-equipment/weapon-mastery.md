# Requirement: Weapon Mastery

> Corresponds to PRD §4.8 & 2024 PHB p.30

---

## Description

2024 PHB introduced Weapon Mastery for certain classes.

Aplies special properties to weapon attacks (Push, Sap, Cleave, etc.).

---

## Acceptance Criteria

- [x] Detect if character has Weapon Mastery (Fighter/Ranger/Paladin/Barbarian)
- [x] List available mastery properties for character's weapons
- [x] Apply mastery property effect to attack calculation
- [x] Track mastery uses per turn (if limited)
- [x] Display mastery property in attack list

---

## Data Model

See `../../spec/data-model.md` → `Weapon`, `WeaponMasteryProperty`

```typescript
interface Weapon {
  // ... other fields
  readonly mastery?: WeaponMasteryProperty;
}

type WeaponMasteryProperty = 
  | 'Cleave'
  | 'Push'
  | 'Sap'
  | 'Slow'
  | 'Topple'
  | 'Vex'
  | 'Graze'
  | 'Nick';
```

**Character JSON storage**:
```jsonc
{
  "equipment": [
    {
      "id": "longsword-1",
      "name": "Longsword",
      "type": "weapon",
      "mastery": "Sap",
      "equipped": true
    }
  ]
}
```

---

## Mastery Properties

| Property | Effect |
|---|---|
| Cleave | On kill, bonus action attack against another creature within 5 ft |
| Push | Hit forces Str save (DC = 8 + prof + Str/Dex mod) or be pushed 10 ft |
| Sap | Hit weakens target, next attack against target has disadvantage |
| Slow | Hit reduces target speed by 10 ft until start of next turn |
| Topple | Hit forces Str save (DC = 8 + prof + Str/Dex mod) or be knocked prone |
| Vex | Hit gives advantage on next attack against same target |
| Graze | On miss, deal damage equal to ability modifier |
| Nick | Bonus action attack with different light weapon |

---

## API Functions

```typescript
// Get weapons with mastery properties
function getMasteryWeapons(char: Character): readonly Weapon[];

// Apply mastery property effect to attack
function applyMasteryEffect(
  weapon: Weapon, 
  target: Character, 
  attackRoll: number
): AttackResult;

// Check if character has Weapon Mastery
function hasWeaponMastery(char: Character, data?: DataLoader): boolean;

// Get all mastery properties available to character
function getAvailableMasteries(char: Character, data?: DataLoader): readonly WeaponMasteryProperty[];
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Character doesn't have Weapon Mastery | Don't show mastery properties |
| Multiple weapons with mastery | Each applies independently |
| Push/Topple save failed | Apply condition (prone/pushed) |
| Sap applied | Mark target as "Weakened" (homebrew condition) |
| Cleave triggered | Prompt bonus action attack |

---

## References

- PRD §4.8 Equipment Management
- 2024 PHB p.30 Weapon Mastery Rules
- 2024 PHB p.163-175 Weapon Tables
