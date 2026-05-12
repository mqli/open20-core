# Open20 Core — High Level Design

**Version**: 3.0 (Layered Architecture)
**Date**: 2026-05-10
**Status**: Active
**Positioning**: Headless TypeScript game engine for D&D 5e 2024

---

## 0. One-Sentence Architecture

> **Layered architecture: Foundation → Mechanics → Entities → Application. Each layer only depends on lower layers.**

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
| A9 | **Layered Dependencies** | Each layer only depends on lower layers, never on same or higher layer | Clear dependency direction, easy to understand, test, and refactor |

---

## 2. Layered Architecture

### 2.1 Layers (Dependency Flow: L1 ← L2 ← L3 ← L4)

| Layer | Name | Modules | Dependencies | Description |
|-------|------|---------|--------------|-------------|
| L1 | Foundation | `types/`, `dice/` | None | Pure types and dice rolling |
| L2 | Mechanics | `engine/`, `spells/` | L1 | Game rule calculations |
| L3 | Entities | `character/`, `monster/` | L1, L2 | State management and mutations |
| L4 | Application | `rolls/` | L1, L2, L3 | Apply mechanics to entities |

### 2.2 Dependency Graph

```
┌──────────────────────────────────────────────────────────────────┐
│                      open20-core (package)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                │
│  L1: Foundation              L2: Mechanics                      │
│  ┌──────────────┐             ┌──────────────┐                  │
│  │   types/     │◄────────────│   engine/    │                  │
│  └──────────────┘             └──────────────┘                  │
│  ┌──────────────┐             ┌──────────────┐                  │
│  │    dice/     │◄────────────│    spells/   │                  │
│  └──────────────┘             └──────────────┘                  │
│                                                                │
│  L3: Entities              L4: Application                      │
│  ┌──────────────┐             ┌──────────────┐                  │
│  │  character/  │◄────────────│    rolls/    │                  │
│  └──────────────┘             └──────────────┘                  │
│  ┌──────────────┐             ┌──────────────┐                  │
│  │   monster/   │◄────────────│    rolls/    │                  │
│  └──────────────┘             └──────────────┘                  │
│                                                                │
└──────────────────────────────────────────────────────────────────┘
```

**Dependency Rules**:
- **L1 (Foundation)**: No dependencies on other modules
- **L2 (Mechanics)**: Can import from L1 only
- **L3 (Entities)**: Can import from L1 and L2 only
- **L4 (Application)**: Can import from L1, L2, and L3

### 2.3 Module Responsibilities

#### L1: Foundation (No Dependencies)
- **`types/`**: All TypeScript interfaces and type definitions
  - Zero dependencies on other modules
- **`dice/`**: Pure dice rolling functions
  - No game logic, no entity references

#### L2: Mechanics (Depends on L1)
- **`engine/`**: Pure functions for D&D 5e rule calculations
  - All functions pure: `(input) => output`
- **`spells/`**: Spell data queries and calculations

#### L3: Entities (Depends on L1, L2)
- **`character/`**: Character state management
  - All mutations return new Character (immutable)
- **`monster/`**: Monster state management
  - Monster state mutations and queries

#### L4: Application (Depends on L1, L2, L3)
- **`rolls/`**: Apply game mechanics to entities
  - Thin orchestration layer

### 2.4 ESLint Enforcement

| Module | CAN Import From | CANNOT Import From |
|--------|-----------------|-------------------|
| `types/` | (nothing) | (anything) |
| `dice/` | `types/` | `engine/`, `spells/`, `character/`, `monster/`, `rolls/` |
| `engine/` | `types/`, `dice/` | `character/`, `monster/`, `rolls/` |
| `spells/` | `types/`, `dice/`, `engine/` | `character/`, `monster/`, `rolls/` |
| `character/` | `types/`, `dice/`, `engine/`, `spells/` | `monster/`, `rolls/` |
| `monster/` | `types/`, `dice/`, `engine/`, `spells/` | `character/`, `rolls/` |
| `rolls/` | `types/`, `dice/`, `engine/`, `spells/`, `character/`, `monster/` | (nothing - top layer) |

---

## 3. Directory Structure

```
open20-core/
├── src/
│   ├── types/                    # L1: Foundation - Type definitions
│   ├── dice/                     # L1: Foundation - Pure dice rolling
│   ├── data/                     # L1: Foundation - Rule data loading
│   ├── engine/                   # L2: Mechanics - Pure rule calculations
│   ├── spells/                   # L2: Mechanics - Spell queries
│   ├── character/                # L3: Entities - Character state & mutations
│   ├── monster/                  # L3: Entities - Monster state & queries
│   ├── rolls/                    # L4: Application - Apply mechanics to entities
│   ├── content/                  # Content pack types & utilities
│   ├── storage/                  # Persistence (interface + implementations)
│   ├── index.ts                  # Public API barrel export (Node.js)
│   └── browser-index.ts          # Public API barrel export (Browser)
│
├── static/                       # Static JSON data files
│   └── srd/                      # SRD content
│
├── scripts/                      # Build and import scripts
│
├── tests/                        # Test suites (mirrors src/ structure)
│   ├── engine/                   # L2: Mechanics unit tests
│   ├── character/                # L3: Character tests
│   ├── monster/                  # L3: Monster tests
│   ├── rolls/                    # L4: Application tests
│   ├── spells/                   # L2: Spell tests
│   ├── storage/                  # Persistence tests
│   ├── data/                     # Data integrity tests
│   └── integration/              # Integration tests
│
├── spec/                         # Documentation
├── requirements/                 # Requirements traceability
├── PRD.md                        # Product Requirements Document
├── agent.md                      # Developer guide for AI agents
├── package.json                  # ESM, vitest, typescript
├── tsconfig.json                 # Strict, noUncheckedIndexedAccess
└── vitest.config.ts              # Test configuration
```

---

## 4. Core Module Specifications

### 4.1 Engine Module (`src/engine/`) — L2: Mechanics

**Purpose**: Pure functions for D&D 5e 2024 rule calculations.

**Design Constraints**:
- All functions must be pure (no side effects)
- Accept state as input, return computed values
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
| `calculateTypedDamage` | `(defenses, damage, type) => DamageResult` | Apply resistances/immunities/vulnerabilities |

### 4.2 Character Module (`src/character/`) — L3: Entities

**Purpose**: Character creation, validation, and state management.

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
| `applyDamage` | `(char, damageResult) => Character` | Apply typed damage to character |
| `addCondition` | `(char, condition) => Character` | Add condition to character |
| `removeCondition` | `(char, condition) => Character` | Remove condition from character |
| `consumeResource` | `(char, id) => Character` | Consume a resource use |
| `recoverResource` | `(char, id) => Character` | Recover a resource use |
| `consumeSpellSlot` | `(char, level) => Character` | Consume a spell slot |
| `recoverSpellSlot` | `(char, level) => Character` | Recover a spell slot |
| `equipItem` | `(char, itemId) => Character` | Equip an item |
| `unequipItem` | `(char, itemId) => Character` | Unequip an item |
| `prepareSpell` | `(char, spellId) => Character` | Mark spell as prepared |
| `unprepareSpell` | `(char, spellId) => Character` | Unmark spell as prepared |
| `prepareSpellForClass` | `(char, classId, spellId) => Character` | Mark spell as prepared for specific class |
| `unprepareSpellForClass` | `(char, classId, spellId) => Character` | Unmark spell as prepared for specific class |

### 4.3 Spells Module (`src/spells/`) — L2: Mechanics

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
| `getClassSpellData` | `(char, classId) => ClassSpellData \| undefined` | Get per-class spell data |
| `knowsSpellForClass` | `(char, classId, spellId) => boolean` | Check if class knows spell |
| `isSpellPreparedForClass` | `(char, classId, spellId) => boolean` | Check if class has spell prepared |
| `getPreparationRule` | `(classId) => PreparationRule` | Get class's spell preparation rule |
| `canChangePreparedSpells` | `(char, classId) => boolean` | Check if can change prepared spells |
| `getMaxPreparedSpellChanges` | `(char, classId) => number` | Max spell changes at long rest |

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

### 4.4 Monster Module (`src/monster/`) — L3: Entities

**Purpose**: Monster data queries and state management.

**Design Constraints**:
- Provide query functions for monster data
- Support monster combat state management
- Handle damage resistances/immunities/vulnerabilities

**Functions**:

| Function | Signature | Description |
|---|---|---|
| `getMonster` | `(id: string) => Monster \| undefined` | Get single monster by ID |
| `searchMonsters` | `(filter: MonsterFilter) => Monster[]` | Search/filter monsters |
| `getMonstersByCR` | `(cr: number) => Monster[]` | Get monsters by challenge rating |
| `getMonstersByType` | `(type: MonsterType) => Monster[]` | Get monsters by type |
| `initializeMonsterForCombat` | `(monster: Monster) => MonsterState` | Initialize monster for combat |
| `applyMonsterDamage` | `(monster: MonsterState, damageResult) => MonsterState` | Apply damage to monster |
| `addMonsterCondition` | `(monster: MonsterState, condition) => MonsterState` | Add condition to monster |

### 4.5 Rolls Module (`src/rolls/`) — L4: Application

**Purpose**: Apply game mechanics to entities.

**Design Constraints**:
- Thin orchestration layer
- Combines L2 (mechanics) with L3 (entities)
- No complex logic, just coordination

**Functions**:

| Function | Signature | Description |
|---|---|---|
| `rollCharacterSkillCheck` | `(char, skill, data?) => RollResult` | Roll skill check for character |
| `rollCharacterSavingThrow` | `(char, ability, data?) => RollResult` | Roll saving throw for character |
| `rollCharacterAttack` | `(char, attack, target, data?) => AttackResult` | Roll attack for character |
| `rollCharacterDamage` | `(char, attack, data?) => DamageResult` | Roll damage for character attack |
| `rollMonsterAttack` | `(monster, attack, target, data?) => AttackResult` | Roll attack for monster |
| `rollMonsterDamage` | `(monster, attack, data?) => DamageResult` | Roll damage for monster attack |
| `rollSpellAttack` | `(char, spell, target, data?) => SpellAttackResult` | Roll spell attack |

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
| S21 | Layered architecture refactoring | 📋 | Planned - reorganize into L1/L2/L3/L4 |

**Current Test Status**: **753+ tests passing**, `tsc --noEmit` ✅

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

### 6.4 Roll Application Flow (L4)

```
rollCharacterAttack(character, attack, target, dataLoader)
    ↓
1. Calculate attack bonus (L2: engine/)
2. Roll attack dice (L1: dice/)
3. Check if hit (compare to target AC)
4. If hit, calculate damage (L2: engine/)
5. Apply damage to target (L3: character/mutate.ts)
6. Return result
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- **Engine functions**: 100% coverage, property-based testing with fast-check
- **Character mutations**: Test immutability, validation, edge cases
- **Spell queries**: Test all filter combinations, edge cases
- **Dice functions**: Test all dice rolling functions with deterministic RNG

### 7.2 Integration Tests
- **Create + Calculate**: Create character, calculate all derived stats
- **Level Up + Validate**: Level up, validate resulting character
- **Rest + Recover**: Short/long rest, verify resource recovery
- **Combat Scenarios**: Character vs monster combat simulations

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
| Content Management (R26) | P1 | ✅ Implemented |
| Monster Data | P2 | SRD monster statistics and queries |
| Magic Items | P2 | SRD magic item data |
| Encounter Builder | P2 | Helper functions for encounter difficulty |

### 9.1 Content Management (R26) — Implemented

**Status**: ✅ Implemented (2026-05-09)

**Key Design Decisions**:
1. **SRD content included in core** — `static/srd/` ships with `@open20/core`
2. **Separate files per content type** — `species.json`, `spells.json`, etc. (not unified)
3. **Import/export support** — `exportContentPack()` and `importContentPack()` for distribution
4. **No override** — Same ID in different sources = separate items

**Components** (implemented):
- `src/content/types.ts` — ContentPack, ContentPackMeta interfaces
- `src/content/io.ts` — `exportContentPack()`, `importContentPack()` functions
- `src/data/default-loader.ts` — Registry for multiple content sources
- `static/srd/` — Separate JSON files for SRD content (source: 'SRD 5.2')
- No-override rule: same ID = separate items coexist

---

*Last updated: 2026-05-10*
*Version: 3.0 (Layered Architecture)*
