# Requirement: Level Up

> Corresponds to PRD §4.7

---

## Description

When character levels up, automatically gain new features, HP increment, new spells (for casters), ASI or feat (specific levels).

MVP supports single-class level up only.

---

## Acceptance Criteria

- [x] Increase character level (single or multiple)
- [x] Auto-calculate HP increment (ceil(hitDie/2) + ConMod)
- [x] Display all features gained at new level (from class feature list)
- [x] At levels 4/8/12/16/19, show ASI/Feat selection (ability +2 or feat +1)
- [x] At level 19, show Epic Boon selection (feat category)
- [x] Casters gain new spells at specific levels (auto-add to knownSpells)
- [x] After level up, auto-update: proficiency bonus, HP max, spell slots
- [x] Support HP increment choice: fixed value or roll
- [x] Write `Character.updatedAt` on level up

---

## Data Model

See `../../spec/data-model.md` → `Character`, `Class`

```typescript
interface Character {
  readonly classes: readonly CharacterClass[];
  readonly hitPoints: HitPoints;
  readonly resources: readonly Resource[];
  readonly updatedAt: string;
}

interface CharacterClass {
  readonly classId: string;
  readonly level: number;
  readonly subclassId?: string;
  readonly subclassLevel?: number;
  readonly hitDice: HitDice;
}

interface HitDice {
  readonly die: DieType;
  readonly total: number;      // = total character level
  readonly used: number;       // consumed this long rest cycle
}
```

**Level Up Options**:
```typescript
interface LevelUpOptions {
  readonly classId: string;          // For multiclass (P1)
  readonly hitDieResult: 'fixed' | number;  // 'fixed' or actual roll result
  readonly abilityScoreImprovement?: {
    readonly type: 'ability' | 'feat';
    readonly abilities?: Record<string, number>;  // For ASI: { "Strength": 2 }
    readonly featId?: string;                 // For feat selection
  };
  readonly newSpells?: readonly string[];   // New spells gained
  readonly newFeatures?: readonly string[]; // New features (auto-detected)
}
```

---

## API Function

```typescript
// Level up character
function levelUp(
  char: Character, 
  options: LevelUpOptions,
  data?: DataLoader
): Character;

// Get available features for a class at a specific level
function getFeaturesForLevel(classId: string, level: number, data?: DataLoader): readonly Feature[];

// Get available feats for level up (filtered by prerequisites)
function getEligibleFeats(char: Character): readonly Feat[];

// Calculate HP increment for level up
function calculateHPIncrement(char: Character, classId: string, data?: DataLoader): number;
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Multiple consecutive level ups | Apply each level's features in order (can't skip intermediate) |
| HP increment roll result needs recording | Save roll result for export/import consistency |
| ASI/Feat selection conflict (e.g., duplicate feat) | Prompt user, prevent duplicate |
| Multiclass level up (MVP unsupported) | Show "Multiclass not supported in MVP" |
| Character data illegal before level up | Block level up, show validation errors |
| Subclass not selected yet | Prompt subclass selection before level up |

---

## Level Up Flow

```
1. Validate character (must be legal before level up)
2. Increment class level (or add new class for multiclass)
3. Calculate HP increment (fixed or roll)
4. Update max HP
5. Check for new features (add to character)
6. Check for ASI/Feat opportunity (prompt if applicable)
7. Check for new spells (add to knownSpells if auto-gained)
8. Update derived stats (proficiency bonus, spell slots, etc.)
9. Write updatedAt timestamp
10. Return new Character object
```

---

## References

- PRD §4.7 Level Up
- 2024 PHB p.22-23 Level Up Rules
- 2024 PHB class chapters (level-by-level feature tables)
