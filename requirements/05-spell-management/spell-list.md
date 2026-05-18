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

### Class Spellcasting Type (Discriminated Union)

Defined in `src/types/class.ts`. Replaces the old `Spellcasting` interface with a discriminated union that accurately models D&D 5e SRD rules:

```typescript
// Discriminated union for class spellcasting rules
type Spellcasting =
  | PreparationSpellcasting   // Cleric, Druid, Wizard, Paladin, Ranger
  | KnownSpellcasting;         // Bard, Sorcerer, Warlock

interface PreparationSpellcasting {
  type: 'preparation';
  ability: AbilityName;
  
  // How the caster "knows" spells:
  // - 'class_list'  → Cleric, Druid: automatically knows ALL spells on class list
  // - 'spellbook'   → Wizard: must learn/copy spells into spellbook
  // - 'limited'     → Paladin, Ranger: knows limited number (level + ability mod)
  knownSource: 'class_list' | 'spellbook' | 'limited';
  
  // How many prepared spells can be changed per long rest:
  // - 'all'   → Cleric, Druid, Wizard: can change any number
  // - number  → Paladin, Ranger: can only change 1 per long rest (SRD: "One")
  changesPerRest: 'all' | number;
}

interface KnownSpellcasting {
  type: 'known';
  ability: AbilityName;
  
  // How many known spells can be changed per level (SRD: always 1)
  changesPerLevel: number;
  
  // Warlock-specific: Pact Magic instead of regular slots
  pactMagic?: true;
}
```

**SRD Reference** (Spell Preparation by Class table):
- Cleric/Druid/Wizard: Change when = "Finish a Long Rest", Number = "Any"
- Paladin/Ranger: Change when = "Finish a Long Rest", Number = "One"
- Bard/Sorcerer/Warlock: Change when = "Gain a level", Number = "One"

### Character Spells Data

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

  // Interpretation depends on knownSource:
  // - 'class_list' (Cleric/Druid): ALL spells on class list (auto-populated)
  // - 'spellbook' (Wizard): spells in spellbook
  // - 'limited' (Paladin/Ranger): chosen known spells
  // - 'known' (Sorcerer/Bard/Warlock): chosen known spells
  knownSpells: readonly string[];

  // For preparation casters: currently prepared
  // For known casters: same as knownSpells (not used separately)
  preparedSpells: readonly string[];

  // Always prepared (Domain spells, etc.) — doesn't count against max
  alwaysPreparedSpells?: readonly string[];

  // Max prepared = from SRD 5.2 class table (not level + ability mod)
  // SRD 5.2 uses table values instead of the conventional formula
  maxPrepared: number;
}
```

> **Note**: `changesPerRest` and `changesPerLevel` in the `Spellcasting` type are **reference fields** (documenting SRD rules). The code does **NOT** enforce these limits — players can manage their own characters freely.

Spell details loaded from static data (`static/srd/spells.json`):

```typescript
interface Spell {
  id: string;                    // kebab-case
  name: string;
  level: SpellLevel;              // 0-9 (0 = cantrip)
  school: SpellSchool;
  castingTime: CastingTime;
  range: string;
  components: readonly SpellComponent[];
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: readonly string[]; // Multi-paragraph SRD description
  cantripUpgrade?: readonly CantripUpgradeEntry[];    // Cantrip damage scaling (0-level only)
  usingAHigherLevelSpellSlot?: readonly string[];      // Higher level casting info (1+ level)
  damage?: SpellDamage;
  heal?: SpellHeal;
  save?: AbilityName;
  attack?: boolean;
  source: string;
  classes?: readonly string[];   // Which classes have this in spell list
}

interface CantripUpgradeEntry {
  atCharacterLevel: 5 | 11 | 17;
  damage?: readonly SpellDamageEntry[];
}

interface SpellDamage {
  entries: readonly SpellDamageEntry[];
  additional?: readonly SpellDamageEntry[]; // Extra damage (doesn't scale with upcast)
  perSlot?: readonly SpellDamageEntry[];     // Damage increase per slot level above base
}
```

---

## Query Functions

```typescript
// Get single spell by ID
function getSpell(id: string, data: DataLoader): Spell | undefined;

// Search/filter spells
function searchSpells(filter: SpellFilter, data: DataLoader): Spell[];

// Get class spell list
function getSpellsByClass(classId: string, data: DataLoader): Spell[];

// Get spells for character (known/prepared)
function getSpellsForCharacter(char: Character, data: DataLoader): Spell[];

// Get prepared spells for character
function getPreparedSpells(char: Character, data: DataLoader): Spell[];

// Check if spell is prepared
function isSpellPrepared(char: Character, spellId: string): boolean;

// Check if character knows spell
function knowsSpell(char: Character, spellId: string): boolean;
```

**SpellFilter Interface**:
```typescript
interface SpellFilter {
  name?: string;
  level?: SpellLevel[];
  school?: SpellSchool[];
  class?: string[];              // Filter by which class can cast
  damageType?: DamageType[];     // Filter by damage type
  castingTime?: CastingTime[];   // Filter by casting time
  range?: string;                // Filter by range
  concentration?: boolean;
  ritual?: boolean;
  source?: string[];
}
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Non-spellcasting class | Completely hide spell area, don't render any spell-related UI |
| Cleric/Druid (`knownSource: 'class_list'`) | `knownSpells` auto-populated from class list; can prepare any after long rest |
| Wizard (`knownSource: 'spellbook'`) | `knownSpells` = spellbook only; must learn spells; can prepare any after long rest |
| Paladin/Ranger (`changesPerRest: 1`) | Can only change 1 prepared spell per long rest |
| Bard/Sorcerer/Warlock (`type: 'known'`) | Don't show "Prepared" checkbox; `knownSpells` = all available; can only change 1 known spell per level |
| Warlock (`pactMagic: true`) | Uses Pact Magic slots (short rest recovery), not regular slots |
| Spell description not in SRD | Show "Description not available", don't block UI |
| No spells match filter | Show "No matching spells", not blank |
| Cantrips (level 0) | Grouped under level 0, don't consume spell slots |

---

## References

- PRD §4.5 Spell Management
- 2024 PHB p.30-33 Spellcasting Rules
- SRD 5.2 Spell List (spell description text source)
