# Open20 Core - Headless D&D 5e 2024 Game Engine

**Version**: 5.0 | **Date**: 2026-05-09 | **License**: MIT

---

## 0. One-Sentence Definition

> A headless TypeScript library for D&D 5e 2024: rule calculations, spell data, and character management. Framework-agnostic, UI-free, test-driven.

**Not doing**: UI rendering, state management, networking, dice rolling UI.

---

## 1. Core Modules

### 1.1 Rules Engine (`@open20/core/engine`)

Pure functions for D&D 5e 2024 calculations:

| Function | Description |
|---|---|
| `calculateAbilityModifier(score)` | `(score - 10) / 2` floor |
| `calculateProficiencyBonus(level)` | PB table |
| `calculateSkillBonus(character, skill)` | attr mod + PB + expertise |
| `calculateAC(character, equipment)` | Unarmored/Armored/Mage Armor/Unarmored Defense |
| `calculateHP(character)` | 1st level max + per-level fixed value |
| `calculateSpellSlots(character)` | Single/Multiclass + Pact Magic |
| `calculateSpellAttackDC(character)` | `8 + PB + spellcasting attr mod` |
| `validateCharacter(character)` | Full rule compliance |

**Design**: All functions pure, accept state as input, return computed values.

### 1.2 Character Management (`@open20/core/character`)

```typescript
// Create
const character = createCharacter({ species: 'Dwarf', background: 'Soldier', ... })

// Validate
const errors = validateCharacter(character)

// Level up
const updated = levelUp(character, { class: 'Fighter', hitDieResult: 'fixed', ... })
```

**Creation order**: Species → Background → Class(es) → Ability Scores → Feats → Skills → Languages → Equipment

**Validation rules**: Ability score constraints, proficiency matching, feat prerequisites, spell list membership, multiclass prerequisites.

### 1.3 Spell Management (`@open20/core/spells`)

```typescript
// Query
const spell = getSpell('fireball')
const spells = searchSpells({ school: 'Evocation', level: [1,2,3] })
const wizardSpells = getSpellsByClass('Wizard')
```

**Spell data structure**:
```typescript
interface Spell {
  id: string; name: string; level: number; school: SpellSchool;
  castingTime: string; range: string;
  components: { V?: boolean; S?: boolean; M?: string | boolean };
  duration: string; concentration: boolean; ritual: boolean;
  description: string; higherLevel?: string;
  damage?: { dice?: string; type?: DamageType; scale?: 'cantrip' | 'level' };
  heal?: { dice?: string; type: 'fixed' | 'dice' };
  save?: Ability; attack?: 'ranged' | 'melee';
  source: string; classes: string[];
}
```

**Data sources**: SRD 5.2 (~391+ spells, full descriptions), 2024 PHB (~200, metadata), XGtE/TCoE (~110, SRD-eligible).

### 1.4 Monster Management (`@open20/core/monsters`)

```typescript
// Query
const monster = getMonster('goblin')
const monsters = searchMonsters({ minCR: 0, maxCR: 2, type: ['Beast'] })
const partyMonsters = getMonstersForParty(3, 4)
```

**Monster data structure**:
```typescript
interface Monster {
  id: string; name: string; source: string;
  size: MonsterSize; type: MonsterType; alignment: string;
  armorClass: ArmorClassEntry[]; hitPoints: HPInfo;
  speed: SpeedInfo; abilityScores: AbilityScores;
  challengeRating: ChallengeRatingInfo;
  traits?: MonsterFeature[]; actions?: MonsterAction[];
  reactions?: MonsterReaction[]; legendaryActions?: MonsterLegendaryAction[];
  environments?: readonly string[];
}
```

**Data sources**: SRD 5.2 (~300 monsters, structured attack data).

### 1.4 Static Data & Content Management (`@open20/core/data`)

**Content Management Requirements (R26)**:
1. **SRD content included** — Core package ships with SRD content
2. **Separate files per content type** — JSON files kept separate for maintainability
3. **Import/export support** — Ability to import from and export to a single unified JSON file (for distribution)
4. **No override** — Same ID in different sources = separate items, no overwriting

#### SRD Content (included in core)

Located in `static/srd/` as separate files:

| Dataset | File | Count | Source |
|---|---|---|---|
| Species | `species.json` | 9 | SRD 5.2 |
| Backgrounds | `backgrounds.json` | 13 | SRD 5.2 |
| Classes | `classes.json` | 12 | SRD 5.2 |
| Subclasses | `subclasses.json` | ~12 | SRD 5.2 |
| Feats | `feats.json` | Limited set | SRD 5.2 |
| Spells | `spells.json` | 391+ | SRD 5.2 |
| Equipment | `weapons.json`, `armor.json`, `gear.json` | ~100 | SRD 5.2 |

#### Content Pack System

**File Structure** (separate files for maintainability):
```
static/srd/
├── meta.json          # Content pack metadata
├── species.json       # Separate file for easy maintenance
├── backgrounds.json
├── classes.json
├── subclasses.json
├── feats.json
├── spells.json
├── weapons.json
├── armor.json
├── gear.json
└── lookup-tables.json
```

**Import/Export Support** (for distribution):
- `exportContentPack(dirPath)` — Merge separate files into unified `ContentPack` object
- `importContentPack(pack, dirPath)` — Split unified `ContentPack` into separate files
- Enables easy sharing of content packs as single JSON files

**Distribution**:
- **SRD**: Included in `@open20/core` (`static/srd/`)
- **Official**: Separate npm packages (`@open20/content-phb2024`, etc.)
- **Homebrew**: User-provided JSON files or unified `ContentPack` objects

**No Override Rule**:
- Same ID in multiple packs = separate items coexist
- `getSpell('fireball')` → highest priority pack wins
- `getSpellsBySource('homebrew')` → filter by source field
- `priority` field in `meta.json` controls disambiguation

---

## 2. API Design Principles

1. **Functional** — Pure functions, no mutable state
2. **Immutable** — Return new state, don't mutate inputs
3. **Composable** — Small functions that compose well
4. **Type-Safe** — Full TypeScript + Zod runtime validation
5. **Testable** — 100% test coverage with property-based testing

---

## 3. Architecture

### 3.1 Layered Architecture

The codebase is organized into 4 layers with unidirectional dependencies:

| Layer | Name | Modules | Dependencies | Description |
|-------|------|---------|--------------|-------------|
| L1 | Foundation | `types/`, `dice/` | None | Pure types and dice rolling |
| L2 | Mechanics | `engine/`, `spells/` | L1 | Game rule calculations |
| L3 | Entities | `character/`, `monster/` | L1, L2 | State management and mutations |
| L4 | Application | `rolls/` | L1, L2, L3 | Apply mechanics to entities |

**Dependency Rules**:
- L1: No dependencies on other modules
- L2: Can import from L1 only
- L3: Can import from L1 and L2 only
- L4: Can import from L1, L2, and L3

### 3.2 Directory Structure

```
src/
├── types/              # L1: Foundation - Type definitions (zero dependencies)
├── dice/               # L1: Foundation - Pure dice rolling (zero dependencies)
├── data/               # L1: Foundation - Rule data loading (depends on types/)
├── engine/             # L2: Mechanics - Pure rule calculations (depends on L1)
├── spells/             # L2: Mechanics - Spell queries (depends on L1)
├── character/          # L3: Entities - Character state & mutations (depends on L1, L2)
├── monster/            # L3: Entities - Monster state & queries (depends on L1, L2)
├── rolls/              # L4: Application - Apply mechanics to entities (depends on L1+L2+L3)
├── content/            # Content pack types & utilities
├── storage/            # Persistence (interface + implementations)
├── index.ts            # Public API barrel export (Node.js)
└── browser-index.ts    # Public API barrel export (Browser)
```

**Static Data** (`static/`):
```
static/
└── srd/                      # SRD content (separate files for maintainability)
    ├── meta.json              # Content pack metadata
    ├── species.json           # Species[]
    ├── backgrounds.json       # Background[]
    ├── classes.json           # Class[]
    ├── subclasses.json        # Subclass[]
    ├── feats.json             # Feat[]
    ├── spells.json            # Spell[]
    ├── weapons.json           # Weapon[]
    ├── armor.json             # Armor[]
    ├── gear.json              # GearItem[]
    └── lookup-tables.json    # Proficiency, HP, spell slots, etc.
```

---

## 4. Priorities

### P0 (Must Have)
- [x] Character creation (single class)
- [x] Rule calculations (AC, HP, skills, spell slots)
- [x] Character validation
- [x] Complete TypeScript types
- [x] Zod schemas for runtime validation
- [x] Spell data (SRD spells imported)
- [x] JSON export/import

### P1 (Should Have)
- [x] Multiclassing support (R21)
- [x] ~~Homebrew data structures~~ → **R26 Content Management** (see below)
- [x] Spell preparation helpers
- [ ] Equipment effect calculations

### P2 (Nice to Have)
- [ ] 2014 legacy content (R23) - Deprioritized
- [ ] Monster data
- [ ] Magic item data
- [ ] Encounter building helpers

### P1 — Content Management (R26) ✅
- [x] SRD content as separate files (`static/srd/*.json`)
- [x] ContentPack type definition + import/export support
- [x] Content registry (register/unregister packs)
- [x] No-override rule implementation
- [x] Source filtering in query functions

### P2 (Nice to Have)
- [ ] Monster data
- [ ] Magic item data
- [ ] Encounter building helpers

---

## 5. Usage Examples

```typescript
import { createCharacter, calculateAC, searchSpells } from '@open20/core'

// Create character
const character = createCharacter({
  species: 'Dwarf', background: 'Soldier',
  classes: [{ name: 'Fighter', level: 5 }],
  abilityScores: { str: 16, dex: 12, con: 15, int: 10, wis: 13, cha: 8 },
})

// Calculate stats
const ac = calculateAC(character, { armor: 'Chain Mail', shield: true })
const hp = calculateHP(character)

// Query spells
const evocation = searchSpells({ school: 'Evocation', level: [1,2,3] })
```

---

## 6. Design Principles

1. **Headless** — No UI, no rendering opinions
2. **Framework-agnostic** — React/Vue/Svelte/vanilla/Node.js
3. **Pure functions** — Predictable, testable
4. **Rule accuracy > features** — Correct > complete
5. **Small core** — Core < 100KB gzipped
6. **Well-tested** — Property-based testing

---

## 7. Appendix

### A. HP Calculation
- **Level 1**: `HP = hitDieMax + Con mod`
- **Levels 2+**: `increment = floor(hitDie/2) + 1 + Con mod` (d6→4, d8→5, d10→6, d12→7)

### B. Spell Slots
- **Full casters**: Bard, Cleric, Druid, Sorcerer, Wizard → total level
- **Half casters**: Paladin, Ranger → floor(total / 2)
- **Third casters**: Fighter (Eldritch Knight), Rogue (Arcane Trickster) → floor(total / 3)
- **Warlock**: Pact Magic separate, short rest recovery

### C. 2024 Terminology
| 2014 | 2024 |
|---|---|
| Race | Species |
| Ki | Focus Points |
| Inspiration | Heroic Inspiration |
| Cast a Spell | Magic (action) |
