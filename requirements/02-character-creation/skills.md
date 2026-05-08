# Requirement: Skill Proficiencies

> Corresponds to PRD §4.1

---

## Description

Skills auto-checked based on class and background. Player can view skill bonuses. Some classes (e.g., Rogue, Bard) gain Expertise (double proficiency), doubling proficiency bonus at specific levels.

**2024 Rule Changes:**
- Skill count remains 18 unchanged
- Class proficiency selection method may change (need to check 2024 PHB)
- Rogue's Expertise levels: 6 and 13 (2024 may adjust)
- Bard's Expertise levels: 3 and 10

**Important Notes:**
- Skill bonus = Ability Modifier + Proficiency Bonus (if proficient) + Expertise bonus (if gained)
- Proficiencies determined by class and background together (stack, don't conflict)
- Expertise only applies to already-proficient skills

---

## Acceptance Criteria

### Skill List Display
- [x] Display all 18 skills, grouped by ability:
  - Strength: Athletics
  - Dexterity: Acrobatics, Sleight of Hand, Stealth
  - Intelligence: Arcana, History, Investigation, Nature, Religion
  - Wisdom: Animal Handling, Insight, Medicine, Perception, Survival
  - Charisma: Deception, Intimidation, Performance, Persuasion
- [x] Each skill displays:
  - Name (Chinese + English)
  - Associated ability (and ability modifier)
  - Proficiency bonus (if proficient)
  - Expertise bonus (if gained)
  - Total bonus (ability + proficiency + expertise)
- [x] Total bonus formatted display: e.g., "+5" (positive + sign), "-1" (negative - sign)

### Auto-Check Proficiencies
- [x] **Class proficiencies**:
  - Auto-checked based on selected class
  - Show selectable count (e.g., "Fighter: select 2")
  - If class proficiency has fixed list (can only select from specific skills), show selectable range
  - Support re-selection (where rules allow)
- [x] **Background proficiencies**:
  - Auto-checked based on selected background
  - Usually fixed 2 skills, no selection needed
  - Stacks with class proficiencies, no conflict
- [x] **Species proficiencies** (if any):
  - Auto-checked based on selected species
  - Show source species name

### Expertise (Double Proficiency)
- [x] **Rogue**:
  - Level 6 gains Expertise, can select 2 skills for double proficiency
  - Level 13 gains Expertise again, can select 2 skills (can repeat or not)
  - Only applies to already-proficient skills
- [x] **Bard**:
  - Level 3 gains Expertise, can select 2 skills
  - Level 10 gains Expertise again, can select 2 skills
  - Only applies to already-proficient skills
- [x] **Other classes** (if any):
  - Check 2024 PHB, e.g., Knowledge Cleric etc.
- [x] Expertise selection UI:
  - Show list of proficient skills
  - Can select 2 (count depends on class/level)
  - Support changing selection (where rules allow)

### Skill Bonus Calculation
- [x] **Ability bonus**: Auto-fetched from `Character.abilityScores.modifier`
- [x] **Proficiency bonus**: Look up table by character level (see data model), add if proficient
- [x] **Expertise bonus**: If Expertise gained, add proficiency bonus again (i.e., proficiency ×2)
- [x] **Total bonus**: Real-time calculation and display
- [x] After ability change, skill bonuses auto-update

### Interaction Features
- [x] Click skill card, copy "1d20+bonus" to clipboard (e.g., "1d20+5")
- [x] Show copy success toast
- [x] Support manual bonus adjustment (DM-permitted cases, P1 feature, MVP reserved entry)
- [x] Skill bonus change history (each change recorded, P2 feature)

### Data Persistence
- [x] Class proficiency selections written to `Character.skills`
- [x] Background proficiencies auto-written to `Character.skills`
- [x] Expertise selections written to `Character.skills`
- [x] Support resetting proficiencies (when re-selecting class/background)

---

## Data Model

See `../../spec/data-model.md` → `Skill`

```typescript
interface SkillEntry {
  readonly proficient: boolean;
  readonly expertise: boolean;  // Double proficiency (some classes gain this)
}

type SkillName = 
  | 'Acrobatics' | 'Animal Handling' | 'Arcana' | 'Athletics'
  | 'Deception' | 'History' | 'Insight' | 'Intimidation'
  | 'Investigation' | 'Medicine' | 'Nature' | 'Perception'
  | 'Performance' | 'Persuasion' | 'Religion' | 'Sleight of Hand'
  | 'Stealth' | 'Survival';

// Character storage
interface Character {
  skills: Record<SkillName, SkillEntry>;
}
```

**Proficiency Bonus Table** (constant):

| Level | 1-4 | 5-8 | 9-12 | 13-16 | 17-20 |
|---|---|---|---|---|---|
| Proficiency Bonus | +2 | +3 | +4 | +5 | +6 |

---

## Edge Cases

| Situation | Handling |
|---|---|
| Multiple sources grant same skill | Don't stack, but can trigger Expertise |
| Expertise selected before proficiency | Invalid, UI should prevent (only show proficient skills) |
| Proficiency bonus changes with level | Auto-recalculate all skill bonuses |
| Custom background grants custom skill | Allow free-text skill name, mark as "Custom" |

---

## References

- PRD §4.1 Character Creation
- PRD §4.2 Automatic Calculations (Skill Bonus)
- 2024 PHB p. 23 Skills Rules
- 2024 PHB p. 78-109 Feats (some feats grant skill proficiencies)
