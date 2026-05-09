# Open20 Core — High Level Design

**Version**: 2.0 (Headless Engine)
**Date**: 2026-05-08
**Status**: Active
**Positioning**: Headless TypeScript game engine for D&D 5e 2024

---

## 0. One-Sentence Architecture

> **Pure function rule engine + immutable character state + injectable dependencies = headless core usable by any framework.**

---

## 1. Architecture Principles

| # | Principle | Meaning | Why |
|---|---|---|---|
| A1 | **Pure Functions** | All engine functions: `(input) => output`, no side effects | Same input = same output, naturally testable, naturally cacheable |
| A2 | **Immutable State** | `Character` object never modified after creation, changes return new object | Eliminates state races, supports undo/redo, easy serialization |
| A3 | **Dependency Injection** | All external dependencies (storage, random) injected via parameters | Replace with mocks in tests, replace with real implementations at runtime |
| A4 | **Schema-First Types** | TypeScript types are single source of truth, runtime validation with Zod | JSON imports must have runtime validation, type definitions serve dual purpose |
| A5 | **Zero UI Dependency** | Core package doesn't depend on any UI framework (React/Vue/etc.) | Core can be reused by CLI/Web/Native any shell |
| A6 | **Barrel Exports** | Each module exports public API via `index.ts` | Clear module boundaries, internal implementations can be freely refactored |
| A7 | **Data-Driven Rules** | Rule data (species/classes/spells) separated from logic code | Rule updates only change JSON, not code |
| A8 | **Headless by Design** | No UI components, no rendering logic, no state management opinions | Framework-agnostic, let consumers choose their stack |

---

## 2. Module Architecture

```
┌──────────────────────────────────────────────────┐
│                  open20-core                      │
│                   (this package)                 │
├──────────┬──────────┬──────────┬─────────────────┤
│  types   │   data   │  engine  │   character     │
│  types   │  rules   │  pure    │   state mgmt     │
│  defs    │  data    │  fns     │   create/mutate  │
├──────────┴──────────┴──────────┴─────────────────┤
│                spells                              │
│            spell data & queries                    │
├──────────────────────────────────────────────────┤
│                   storage                         │
│            persistence abstraction                 │
└──────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   ┌───────────┐                 ┌───────────┐
   │  CLI App  │                 │  Web App  │
   │ (future)  │                 │ (future)   │
   └───────────┘                 └───────────┘
```

**Dependency Direction (unidirectional, reverse prohibited)**:

```
types ← data ← engine ← character ← storage
                ↑                   │
                └───────────────────┘ (character references engine functions)
```

**Prohibited**:
- `types` must not import from any other module
- `data` can only import from `types`
- `engine` can only import from `types` and `data`
- `character` can import from `types`, `data`, `engine`
- `storage` can import from `types`, `character`
- `spells` can import from `types`, `data`

---

## 3. Directory Structure

```
open20-core/
├── src/
│   ├── types/                    # A1: Type definitions (zero dependencies)
│   │   ├── character.ts          #   Character, CharacterClass, HitPoints, DeathSaves,
│   │   │                         #   CombatStats, Attack, ActiveCondition, ConditionName,
│   │   │                         #   Currency, DieType
│   │   ├── species.ts            #   Species, SpeciesTrait, SpeciesGrant, SpeciesSubtype
│   │   ├── background.ts         #   Background (with originFeatId)
│   │   ├── class.ts              #   Class, Subclass, Feature, Spellcasting, MulticlassSpellSlotEntry
│   │   ├── ability.ts            #   AbilityName, AbilityScores, ABILITY_NAMES
│   │   ├── skill.ts              #   SkillName, SkillEntry, SKILL_ABILITY_MAP
│   │   ├── feat.ts               #   Feat, FeatCategory, FeatPrerequisite, FeatGrant
│   │   ├── equipment.ts          #   EquipmentItem, Weapon, Armor, GearItem, WeaponMasteryProperty
│   │   ├── spell.ts              #   Spell, CharacterSpells, SpellSlotEntry, PactMagicSlots, SpellSchool
│   │   ├── resource.ts           #   Resource, ResetType, DisplayType
│   │   └── index.ts              #   barrel export
│   │
│   ├── data/                     # A7: Rule data (depends only on types)
│   │   ├── loader.ts             #   DataLoader interface + LookupTables type + createDataLoader factory
│   │   ├── default-loader.ts     #   Default DataLoader implementation (loads from static/srd/content.json)
│   │   ├── browser-loader.ts     #   Browser-compatible DataLoader (bundles JSON via esbuild)
│   │   ├── content-registry.ts   #   Content pack registry (R26: register/unregister packs)
│   │   └── index.ts
│   │
│   ├── content/                  # R26: Content pack types & utilities
│   │   ├── types.ts              #   ContentPack, ContentPackMeta interfaces
│   │   └── index.ts
│   │
│   ├── engine/                   # A1: Pure function calculations (no side effects)
│   │   ├── ability-modifier.ts   #   getModifier(score), getTotalScore(...)
│   │   ├── proficiency-bonus.ts  #   getProficiencyBonus(level)
│   │   ├── skill-bonus.ts        #   getSkillBonus(char, skillName, data)
│   │   ├── saving-throw.ts       #   getSavingThrowBonus(char, ability, data)
│   │   ├── ac-calculator.ts      #   calculateAC(char, data) → number
│   │   ├── hp-calculator.ts      #   calculateMaxHP(char, data) → number
│   │   ├── spell-slots.ts        #   calculateSpellSlots(char, data) → SpellSlotMap
│   │   ├── initiative.ts         #   calculateInitiative(char, data) → number
│   │   ├── passive-perception.ts #   calculatePassivePerception(char, data) → number
│   │   ├── attack-calculator.ts  #   calculateAttacks(char, data) → Attack[]
│   │   └── index.ts
│   │
│   ├── character/                # A2+A3: State management (immutable + injectable)
│   │   ├── create.ts             #   createCharacter(params) → Character
│   │   ├── level-up.ts           #   levelUp(char, options, data, rng?) → Character
│   │   ├── rest.ts               #   shortRest(char, data) → Character; longRest(char, data) → Character
│   │   ├── mutate.ts             #   All state mutation functions
│   │   │                         #     modifyHP(char, delta) → Character
│   │   │                         #     setTemporaryHP(char, value) → Character
│   │   │                         #     consumeResource(char, id) → Character
│   │   │                         #     recoverResource(char, id) → Character
│   │   │                         #     consumeSpellSlot(char, level) → Character
│   │   │                         #     recoverSpellSlot(char, level) → Character
│   │   │                         #     toggleCondition(char, conditionId) → Character
│   │   │                         #     equipItem(char, itemId) → Character
│   │   │                         #     unequipItem(char, itemId) → Character
│   │   │                         #     prepareSpell(char, spellId) → Character
│   │   │                         #     unprepareSpell(char, spellId) → Character
│   │   ├── validate.ts           #   validateCharacter(char, data) → ValidationResult
│   │   ├── recompute.ts          #   recomputeDerivedStats(char, data) → Character
│   │   └── index.ts
│   │
│   ├── spells/                   # NEW: Spell management module
│   │   ├── query.ts              #   getSpell(id), searchSpells(filter), getSpellsByClass(class)
│   │   ├── filter.ts             #   Filter helpers for spell queries
│   │   ├── types.ts              #   Spell types and interfaces
│   │   └── index.ts
│   │
│   ├── schemas/                  # NEW: Zod schemas for runtime validation
│   │   ├── character.ts          #   CharacterSchema
│   │   ├── spell.ts              #   SpellSchema
│   │   └── index.ts
│   │
│   ├── storage/                  # A3: Persistence (interface + implementations)
│   │   ├── interface.ts          #   ICharacterStorage interface
│   │   ├── memory.ts             #   InMemoryStorage (for tests)
│   │   ├── json-file.ts          #   JsonFileStorage (CLI use)
│   │   ├── serializer.ts         #   serialize(char) → JSON; deserialize(json) → Character
│   │   └── index.ts
│   │
│   ├── index.ts                  # Public API barrel export (Node.js)
│   └── browser-index.ts          # Public API barrel export (Browser, excludes Node.js storage)
│
├── static/                       # Static JSON data files
│   └── srd/                      # SRD content (separate files for maintainability)
│       ├── meta.json              # Content pack metadata
│       ├── species.json           # Species[]
│       ├── backgrounds.json       # Background[]
│       ├── classes.json           # Class[]
│       ├── subclasses.json        # Subclass[]
│       ├── feats.json             # Feat[]
│       ├── spells.json            # Spell[]
│       ├── weapons.json           # Weapon[]
│       ├── armor.json             # Armor[]
│       ├── gear.json              # GearItem[]
│       └── lookup-tables.json    # Proficiency, HP, spell slots, etc.
│
│                           # Future content packs (separate packages):
│                           # @open20/content-phb2024/
│                           #   ├── meta.json
│                           #   ├── species.json
│                           #   └── ...
│                           # @open20/content-xgte/
│                           # my-homebrew/

├── scripts/
│   ├── bundle.mjs                # Browser bundle builder (esbuild)
│   └── import_srd_spells.py     # Import SRD spells from dnd-data GitHub repo
│
├── tests/
│   ├── engine/                   # Rule engine unit tests
│   │   ├── ability-modifier.test.ts
│   │   ├── proficiency-bonus.test.ts
│   │   ├── skill-bonus.test.ts
│   │   ├── saving-throw.test.ts
│   │   ├── ac-calculator.test.ts
│   │   ├── hp-calculator.test.ts
│   │   ├── spell-slots.test.ts
│   │   ├── initiative.test.ts
│   │   ├── passive-perception.test.ts
│   │   └── attack-calculator.test.ts
│   ├── character/                # State management tests
│   │   ├── create.test.ts
│   │   ├── level-up.test.ts
│   │   ├── mutate.test.ts
│   │   ├── rest.test.ts
│   │   ├── validate.test.ts
│   │   └── recompute.test.ts
│   ├── spells/                   # Spell management tests
│   │   └── query.test.ts
│   ├── storage/                  # Persistence tests
│   │   └── serializer.test.ts
│   ├── data/                     # Data integrity tests
│   │   └── spells.test.ts
│   └── integration/              # Integration tests
│       └── create-and-calculate.test.ts
│
├── dist/                         # Build output
│   ├── index.js                  # Node.js bundle
│   ├── open20-core.js            # Browser UMD bundle
│   └── open20-core.esm.js       # Browser ESM bundle
│
├── spec/                         # Documentation
│   ├── high-level-design.md      # This file
│   ├── data-model.md             # TypeScript interfaces & JSON schema
│   └── test-plan.md              # Test plan and coverage goals
│
├── requirements/                 # Requirements traceability
│   └── README.md
│
├── PRD.md                        # Product Requirements Document
├── agent.md                      # Developer guide for AI agents
├── package.json                  # ESM, vitest, typescript
├── tsconfig.json                 # Strict, noUncheckedIndexedAccess
└── vitest.config.ts              # Test configuration
```

---

## 4. Core Module Specifications

### 4.1 Engine Module (`src/engine/`)

**Purpose**: Pure functions for D&D 5e 2024 rule calculations.

**Design Constraints**:
- All functions must be pure (no side effects)
- Accept character state as input, return computed values
- Support both single-class and multiclass calculations
- Handle edge cases: Mage Armor, Unarmored Defense, Fighting Styles, etc.

**Functions**:

| Function | Signature | Description |
|---|---|---|
| `getModifier` | `(score: number) => number` | `(score - 10) / 2` floor |
| `getTotalScore` | `(char, ability, data) => number` | Base + racial + equipment bonuses |
| `getProficiencyBonus` | `(level: number) => number` | PB table by level |
| `getSkillBonus` | `(char, skill, data) => number` | attr mod + PB (if proficient) + expertise |
| `getSavingThrowBonus` | `(char, ability, data) => number` | attr mod + PB (if proficient) |
| `calculateAC` | `(char, equipment, data) => number` | Unarmored/Armored/Mage Armor/Unarmored Defense |
| `calculateMaxHP` | `(char, data) => number` | 1st level max + per-level fixed value |
| `calculateSpellSlots` | `(char, data) => SpellSlotMap` | Single/Multiclass + Pact Magic |
| `calculateInitiative` | `(char, data) => number` | Dex mod + initiative bonuses |
| `calculatePassivePerception` | `(char, data) => number` | 10 + Perception bonus |
| `calculateAttacks` | `(char, data) => Attack[]` | Weapon attacks with bonuses |

### 4.2 Character Module (`src/character/`)

**Purpose**: Character creation, validation, and level-up logic.

**Design Constraints**:
- All mutation functions return new `Character` object (immutable)
- Use spread operator for updates
- Validate input parameters
- Support multiclass characters

**Functions**:

| Function | Signature | Description |
|---|---|---|
| `createCharacter` | `(params, data?) => Character` | Create new character |
| `levelUp` | `(char, options, data?) => Character` | Level up character |
| `shortRest` | `(char, data?) => Character` | Short rest (recover resources) |
| `longRest` | `(char, data?) => Character` | Long rest (full recovery) |
| `validateCharacter` | `(char, data?) => ValidationError[]` | Full rule compliance check |
| `recomputeDerivedStats` | `(char, data?) => Character` | Recompute all derived stats |
| `modifyHP` | `(char, delta) => Character` | Modify current HP |
| `setTemporaryHP` | `(char, value) => Character` | Set temporary HP |
| `consumeResource` | `(char, id) => Character` | Consume a resource use |
| `recoverResource` | `(char, id) => Character` | Recover a resource use |
| `consumeSpellSlot` | `(char, level) => Character` | Consume a spell slot |
| `recoverSpellSlot` | `(char, level) => Character` | Recover a spell slot |
| `toggleCondition` | `(char, conditionId) => Character` | Toggle condition on/off |
| `equipItem` | `(char, itemId) => Character` | Equip an item |
| `unequipItem` | `(char, itemId) => Character` | Unequip an item |
| `prepareSpell` | `(char, spellId) => Character` | Mark spell as prepared |
| `unprepareSpell` | `(char, spellId) => Character` | Unmark spell as prepared |

### 4.3 Spells Module (`src/spells/`)

**Purpose**: Comprehensive spell data and spell-related queries.

**Design Constraints**:
- Provide query functions for spell data
- Support filtering by multiple criteria
- Handle SRD and non-SRD spells appropriately
- Efficient lookups (consider indexing for large datasets)

**Functions**:

| Function | Signature | Description |
|---|---|---|
| `getSpell` | `(id: string) => Spell \| undefined` | Get single spell by ID |
| `searchSpells` | `(filter: SpellFilter) => Spell[]` | Search/filter spells |
| `getSpellsByClass` | `(className: string) => Spell[]` | Get class spell list |
| `getSpellsForCharacter` | `(char, data?) => Spell[]` | Get known/prepared spells for character |
| `getPreparedSpells` | `(char) => string[]` | Get list of prepared spell IDs |
| `isSpellPrepared` | `(char, spellId) => boolean` | Check if spell is prepared |
| `knowsSpell` | `(char, spellId) => boolean` | Check if character knows spell |

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

### 4.4 Schemas Module (`src/schemas/`)

**Purpose**: Zod schemas for runtime validation of all data structures.

**Design Constraints**:
- All data structures must have corresponding Zod schema
- Schemas used for JSON import validation
- Schemas exported for consumer use
- Error messages should be helpful

**Schemas**:

| Schema | Validates |
|---|---|
| `CharacterSchema` | Character object structure and rules |
| `SpellSchema` | Spell object structure |
| `SpeciesSchema` | Species object structure |
| `ClassSchema` | Class object structure |
| `FeatSchema` | Feat object structure |

---

## 5. Implementation Status (S1-S20)

| Step | Content | Status | Notes |
|---|---|---|---|
| S1 | Project scaffolding | ✅ | package.json, tsconfig.json, vitest.config.ts |
| S2 | Type definitions | ✅ | All types in `src/types/` |
| S3 | DataLoader interface + implementation | ✅ | `loader.ts`, `default-loader.ts`, `browser-loader.ts` |
| S4 | Engine: `getModifier()`, `getTotalScore()` | ✅ | `ability-modifier.ts` |
| S5 | Engine: `getProficiencyBonus()` | ✅ | `proficiency-bonus.ts` |
| S6 | Engine: `getSkillBonus()`, `getAllSkillBonuses()` | ✅ | `skill-bonus.ts` |
| S7 | Engine: `getSavingThrowBonus()` | ✅ | `saving-throw.ts` |
| S8 | Engine: `calculateAC()` | ✅ | `ac-calculator.ts` |
| S9 | Engine: HP calculation functions | ✅ | `hp-calculator.ts` |
| S10 | Engine: `calculateSpellSlots()`, `calculatePactMagic()` | ✅ | `spell-slots.ts` |
| S11 | Engine: `calculateInitiative()`, `calculatePassivePerception()`, `calculateAttacks()` | ✅ | `initiative.ts`, `passive-perception.ts`, `attack-calculator.ts` |
| S12 | Static rule data population | ✅ | All static data complete (species, backgrounds, classes, subclasses, feats, spells, weapons, armor, gear) |
| S13 | Character: `createCharacter()` | ✅ | `create.ts` |
| S14 | Character: Mutation functions | ✅ | `mutate.ts` |
| S15 | Character: `levelUp()` | ✅ | `level-up.ts` |
| S16 | Character: `shortRest()`, `longRest()` | ✅ | `rest.ts` |
| S17 | Character: `validateCharacter()`, `recomputeDerivedStats()` | ✅ | `validate.ts`, `recompute.ts` |
| S18 | Storage: Interface + implementations | ✅ | `storage/` module |
| S19 | Public API barrel exports | ✅ | `index.ts`, `browser-index.ts` |
| S20 | Integration tests | ✅ | `tests/integration/` |

**Current Test Status**: **550+ tests passing**, `tsc --noEmit` ✅

---

## 6. Data Flow Examples

### 6.1 Character Creation Flow

```
User Input (params)
    ↓
createCharacter(params, dataLoader)
    ↓
1. Validate input parameters
2. Apply species bonuses
3. Apply background grants
4. Apply class features
5. Calculate derived stats (recomputeDerivedStats)
6. Return immutable Character object
```

### 6.2 Spell Query Flow

```
searchSpells({ school: 'Evocation', level: [1,2,3] })
    ↓
1. Load spells.json (via DataLoader or bundled data)
2. Filter by school === 'Evocation'
3. Filter by level in [1,2,3]
4. Return array of matching Spell objects
```

### 6.3 Rule Calculation Flow

```
calculateAC(character, equipment, dataLoader)
    ↓
1. Determine AC base (unarmored vs armored)
2. Apply Dex modifier (with limits for medium armor)
3. Apply Mage Armor if active
4. Apply Unarmored Defense if applicable (Barbarian/Monk)
5. Apply shield bonus if equipped
6. Apply magic item bonuses
7. Return final AC number
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- **Engine functions**: 100% coverage, property-based testing with fast-check
- **Character mutations**: Test immutability, validation, edge cases
- **Spell queries**: Test all filter combinations, edge cases

### 7.2 Integration Tests
- **Create + Calculate**: Create character, calculate all derived stats
- **Level Up + Validate**: Level up, validate resulting character
- **Rest + Recover**: Short/long rest, verify resource recovery

### 7.3 Data Integrity Tests
- **JSON validation**: All static JSON files valid against schemas
- **Cross-references**: Feat IDs exist, spell IDs in class lists exist
- **Completeness**: All required data present

---

## 8. Performance Considerations

### 8.1 Bundle Size
- **Target**: < 100KB gzipped for core engine (without spell/species data)
- **Strategy**: Dynamic imports for large datasets, tree-shaking friendly exports

### 8.2 Runtime Performance
- **Memoization**: Consider memoizing expensive calculations (AC, spells)
- **Lazy loading**: Load spell data on-demand, not at startup
- **Indexing**: Build indexes for frequent queries (spells by class, by level)

---

## 9. Future Enhancements (v1.1+)

| Feature | Priority | Description |
|---|---|---|
| Multiclassing | P0 | Full multiclass support with correct spell slot calculations |
| 2014 Legacy | P1 | Half-Elf, Half-Orc, legacy subclasses and feats |
| Content Management (R26) | P1 | 📋 Requirements defined, implementation pending |
| Monster Data | P2 | SRD monster statistics and queries |
| Magic Items | P2 | SRD magic item data |
| Encounter Builder | P2 | Helper functions for encounter difficulty |

### 9.1 Content Management (R26) — Requirements Defined

**Status**: 📋 Requirements defined in `requirements/11-content-management/content-management.md`

**Key Design Decisions**:
1. **SRD content included in core** — `static/srd/` ships with `@open20/core`
2. **Separate files per content type** — `species.json`, `spells.json`, etc. (not unified)
3. **Import/export support** — `exportContentPack()` and `importContentPack()` for distribution
4. **No override** — Same ID in different sources = separate items

**Components** (to be implemented):
- `src/content/types.ts` — ContentPack, ContentPackMeta interfaces
- `src/content/io.ts` — `exportContentPack()`, `importContentPack()` functions
- `src/data/content-registry.ts` — Registry for multiple content sources
- `static/srd/` — Separate JSON files for SRD content
- No-override rule: same ID = separate items coexist

**Usage** (planned):
```typescript
import { ContentRegistry, loadContentPack, exportContentPack } from '@open20/core';

// Load SRD content (separate files)
const registry = new ContentRegistry();
registry.register('static/srd/');

// Export to unified file for distribution
const pack = exportContentPack('static/srd/');
// pack is a single ContentPack object with meta + all content

// Import unified file (split into separate files)
importContentPack(pack, 'my-homebrew/');

// Add homebrew
registry.register({
  meta: { id: 'my-homebrew', name: 'My Homebrew', version: '1.0.0', source: 'Homebrew', priority: 10 },
  spells: [{ id: 'custom-spell', name: 'Custom Spell', ... }]
});
```

---

*Last updated: 2026-05-09*
*Version: 2.0 (Headless Engine)*
