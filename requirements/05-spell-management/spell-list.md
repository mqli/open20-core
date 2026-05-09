# Requirement 4.5.1: Spell List & Spell Cards

> Corresponds to PRD §4.5

---

## Description

Spell management is core functionality for spellcasting characters. Casters need to view known spell list, prepare spells (Wizard/Cleric/etc.), and view spell cards (with SRD descriptions).

---

## Acceptance Criteria

- [x] Casters display known spells list (grouped by level)
- [x] Preparation casters (Wizard/Cleric/Druid/Paladin) show "Prepared" checkbox
- [x] Prepared spells cleared after long rest (need re-preparation)
- [x] Click spell to show spell card: name, level, school, casting time, range, components, duration, SRD description
- [x] Spells can be filtered by level, school, prepared status
- [x] Non-casters hide spell area
- [x] Support loading spell descriptions from SRD static data
- [x] Query functions: `getSpell()`, `searchSpells()`, `getSpellsByClass()`

---

## Data Model

See `../../spec/data-model.md` → `Spell`

```typescript
// Character.spells
interface CharacterSpells {
  knownSpells: string[];        // ["fire-bolt", "mage-hand", "shield"]
  preparedSpells: string[];     // ["shield", "magic-missile"]
  spellcastingAbility: string;   // "Intelligence" | "Wisdom" | "Charisma"
  spellSlots: Record<number, SpellSlotEntry>;
  pactMagicSlots: PactMagicSlots | null;
}
```

Spell details loaded from static data (`static/spells.json`):

```typescript
interface Spell {
  id: string;                    // kebab-case
  name: string;
  level: number;                 // 0-9 (0 = cantrip)
  school: SpellSchool;
  castingTime: string;
  range: string;
  components: SpellComponents;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;           // SRD description text
  higherLevel?: string;
  damage?: SpellDamage;
  heal?: SpellHeal;
  save?: Ability;
  attack?: 'ranged' | 'melee';
  source: string;
  classes: string[];             // Which classes have this in spell list
}
```

---

## Query Functions

```typescript
// Get single spell by ID
function getSpell(id: string): Spell | undefined;

// Search/filter spells
function searchSpells(filter: SpellFilter): Spell[];

// Get class spell list
function getSpellsByClass(className: string): Spell[];

// Get spells for character (known/prepared)
function getSpellsForCharacter(char: Character): Spell[];
```

**SpellFilter Interface**:
```typescript
interface SpellFilter {
  name?: string;
  level?: number[];
  school?: SpellSchool;
  concentration?: boolean;
  ritual?: boolean;
  classes?: string[];
  source?: string;
}
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Non-spellcasting class | Completely hide spell area, don't render any spell-related UI |
| Wizard (preparation caster) | Show "Prepared" checkbox, preparedSpells cleared after long rest |
| Sorcerer/Warlock (known caster) | Don't show "Prepared" checkbox, knownSpells = all available |
| Spell description not in SRD | Show "Description not available", don't block UI |
| No spells match filter | Show "No matching spells", not blank |
| Cantrips (level 0) | Grouped under level 0, don't consume spell slots |

---

## References

- PRD §4.5 Spell Management
- 2024 PHB p.30-33 Spellcasting Rules
- SRD 5.2 Spell List (spell description text source)
