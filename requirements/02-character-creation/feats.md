# Requirement: Feat Selection

> Corresponds to PRD §4.1

---

## Description

Player selects from 75 feats in 2024 PHB, categorized into 4 groups. Feats gained at specific levels (usually 4/8/12/16/19), player can choose feat or Ability Score Improvement (ASI).

**2024 Rule Changes:**
- Feat count increased to 75 (significant increase from 2014)
- Feats categorized: Origin / General / Fighting Style / Epic Boon
- Origin Feats granted by background, not selected here (but displayed)
- Epic Boons only available at level 19 (MVP提示 "insufficient level")

**Important Notes:**
- Every 4 levels gains one feat OR ASI (choose one)
- Feat prerequisites must be validated (ability/level/subclass/race)
- Selected feats affect ability bonuses, skills, attack bonuses, etc.

---

## Acceptance Criteria

### Feat List Display
- [x] Feats grouped by category: Origin / General / Fighting Style / Epic Boon
- [x] Each category shows feat count (e.g., "General (58)")
- [x] Display for each feat:
  - Name (Chinese + English)
  - Prerequisites (if any)
  - Description summary (first 50 chars + "expand")
  - Icon/illustration (if available)
- [x] Support search: by name, description, prerequisites
- [x] Support filter: by category, prerequisites, already selected

### Feat Detail View
- [x] Click feat card to expand details
- [x] Details include:
  - Full description
  - Prerequisites (red highlight if unmet)
  - Source (background/PHB/other)
  - Affected abilities/skills/attack bonuses
- [x] Show "Selected" mark (if already selected)
- [x] Show "Available at Level" mark (if not yet reached)

### Feat Selection Interaction
- [x] Click "Select" button to choose feat
- [x] Validate prerequisites on selection:
  - Ability requirement (e.g., Strength 13+)
  - Level requirement (e.g., level 19 for Epic Boon)
  - Subclass requirement (class-specific feats)
  - Race requirement (race-specific feats)
- [x] Disable "Select" button if prerequisites unmet, show tooltip
- [x] Only one feat (or ASI) per eligible level
- [x] Show confirmation dialog on selection: "Confirm select [Feat Name]? (Will consume level X feat selection opportunity)"

### Feat vs ASI Choice
- [x] At feat-eligible levels (4/8/12/16/19), show selection UI:
  - Option A: Select a feat
  - Option B: Ability Score Improvement (+2 to one / +1 to two)
- [x] Show "Pending Selection" mark if not yet chosen
- [x] Support changing selection (before confirmation at level up)
- [x] After confirmation, write to `Character.feats` or `Character.abilityScores.base` (for ASI)

### Special Category Handling
- [x] **Origin Feat**:
  - Auto-granted by background, displayed but not selectable
  - Show source background name
  - Counted in selected feats list
- [x] **Epic Boon**:
  - Only available at level 19
  - MVP stage: show "Insufficient Level" if below 19, disable selection
  - Full version: unlock selection at level 19
- [x] **Fighting Style**:
  - Only selectable by specific classes (Fighter/Ranger/Paladin etc.)
  - Validate class prerequisite

### Custom Feats (P1, MVP reserved entry)
- [x] MVP stage: show "Custom Feat" button (grayed out, click shows "Feature in Development")
- [x] Full version: support free-text input for feat name and effect
- [x] Custom feats marked as "Custom", distinguished from normal feats

### Data Persistence & Display
- [x] Selected feats list written to `Character.feats`
- [x] Feat-affected ability bonuses auto-written to `Character.abilityScores.featBonuses`
- [x] Selected feats visible in character sheet (Feats tab)
- [x] Support deselection (before confirmation at level up)
- [x] Confirmed feats cannot be deselected (unless using "Reassign" feature)

---

## Data Model

See `../../spec/data-model.md` → `Feat`

```typescript
interface Feat {
  readonly id: string;
  readonly name: string;
  readonly category: 'Origin' | 'General' | 'Fighting Style' | 'Epic Boon';
  readonly prerequisites?: FeatPrerequisite[];
  readonly description: string;
  readonly source: string;
  readonly grants?: FeatGrant;
}

interface FeatPrerequisite {
  type: 'ability' | 'level' | 'subclass' | 'species';
  value: string | number;
}

interface FeatGrant {
  abilityBonuses?: Record<string, number>;
  skillProficiencies?: string[];
  toolProficiencies?: string[];
  [key: string]: any;
}

// Character storage
interface Character {
  feats: readonly string[];  // Feat IDs
  abilityScores: {
    featBonuses: Record<string, number>;  // Auto-populated from selected feats
  };
}
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Feat prerequisite unmet at level up | Disable selection, show reason |
| Multiple classes grant Fighting Style | Feat only selectable once, doesn't stack |
| ASI +2 to same ability > 20 | Cap at 20 (or 30 for 2014 legacy) |
| Custom feat name conflict | Allow duplicates, distinguish by "Custom" mark |
| Background grants Origin Feat already selected | Valid, counts as one feat |

---

## References

- PRD §4.1 Character Creation
- 2024 PHB p. 78-109 Feats Chapter
- 2024 PHB p. 40 Origin Feats Explanation
