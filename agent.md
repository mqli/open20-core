# Agent Context Document

> **Purpose**: This document provides essential context, conventions, and guidelines for AI agents (Codex, Claude, etc.) working on the Open20 Core project. Read this before making any changes.

---

## 1. Project Overview

**Project**: Open20 Core - Headless D&D 5e 2024 Game Engine
**Goal**: A TypeScript library for D&D 5e 2024 rules engine, spell management, and character management. No UI - pure logic, testable via unit tests, usable by any framework.
**Status**: S1-S21 complete (753+ tests passing)

### Key Design Decisions
- **Headless**: Zero UI dependency. Pure functions, immutable state.
- **Immutable State**: All Character fields are `readonly`. Modifications return new objects via spread operator. No Immer/Immutable.js.
- **Dependency Injection**: `DataLoader` interface for testability and future API replacement.
- **ESM**: Project uses `"type": "module"`. Uses native ESM JSON imports (vitest supports `import data from './file.json'`).
- **Zod Schemas**: Runtime validation for all data structures.

---

## 2. Architecture & Module Dependencies

### 2.1 Layered Architecture

The codebase is organized into 4 layers with unidirectional dependencies:

```
L1: Foundation  ←  L2: Mechanics  ←  L3: Entities  ←  L4: Application
types/, dice/        engine/, spells/    character/,        rolls/
                        data/          monster/
```

**Dependency Rules**:
- **L1 (Foundation)**: No dependencies on other modules
- **L2 (Mechanics)**: Can import from L1 only
- **L3 (Entities)**: Can import from L1 and L2 only
- **L4 (Application)**: Can import from L1, L2, and L3

### 2.2 Dependency Matrix

| Module | CAN Import From | CANNOT Import From |
|--------|-----------------|-------------------|
| `types/` | (nothing) | (anything) |
| `dice/` | `types/` | `engine/`, `spells/`, `character/`, `monster/`, `rolls/` |
| `data/` | `types/` | `engine/`, `spells/`, `character/`, `monster/`, `rolls/` |
| `engine/` | `types/`, `dice/`, `data/` | `spells/`, `character/`, `monster/`, `rolls/` |
| `spells/` | `types/`, `dice/`, `data/` | `engine/`, `character/`, `monster/`, `rolls/` |
| `character/` | `types/`, `dice/`, `data/`, `engine/`, `spells/` | `monster/`, `rolls/` |
| `monster/` | `types/`, `dice/`, `data/`, `engine/`, `spells/` | `character/`, `rolls/` |
| `rolls/` | `types/`, `dice/`, `data/`, `engine/`, `spells/`, `character/`, `monster/` | (nothing - top layer) |
| `storage/` | `types/`, `character/` | `engine/`, `spells/`, `monster/`, `rolls/` |

**Import path convention**: Use relative paths (e.g., `../types`, `../../data/loader`). Do NOT use `@/` aliases in test files (Vitest doesn't resolve them reliably).

---

## 3. Directory Structure

```
open20-core/
├── agent.md                    # This file
├── PRD.md                     # Product Requirements Document
├── package.json                # ESM, vitest, typescript
├── tsconfig.json               # Strict, noUncheckedIndexedAccess
├── vitest.config.ts            # Test config
├── scripts/
│   ├── bundle.mjs             # Browser bundle builder (esbuild)
│   └── import_srd_spells.py   # Import SRD spells from dnd-data repo
├── spec/
│   ├── high-level-design.md    # HLD v3.0 (Layered Architecture)
│   ├── data-model.md           # TypeScript interfaces & JSON schema
│   └── test-plan.md           # Test plan and coverage goals
├── requirements/
│   └── README.md               # R1-R26 requirements traceability
├── static/
│   └── srd/                   # SRD 5.2 content (included in core)
│       ├── meta.json           # Content pack metadata
│       ├── species.json        # 9 species (SRD 5.2)
│       ├── backgrounds.json    # 13 backgrounds (SRD 5.2)
│       ├── classes.json        # 12 classes (SRD 5.2)
│       ├── subclasses.json     # Subclasses for SRD classes
│       ├── feats.json          # Limited feats (SRD 5.2)
│       ├── spells.json         # 391+ spells (SRD 5.2)
│       ├── weapons.json        # ~30 weapons (SRD 5.2)
│       ├── armor.json          # ~15 armors (SRD 5.2)
│       ├── gear.json           # ~20 gear items (SRD 5.2)
│       └── lookup-tables.json  # Proficiency, HP, spell slots, etc.
├── src/
│   ├── index.ts                # Node.js barrel export (includes storage)
│   ├── browser-index.ts        # Browser barrel export (excludes Node.js storage)
│   │
│   ├── types/                  # L1: Foundation - Type definitions (zero dependencies)
│   │   ├── ability.ts
│   │   ├── skill.ts
│   │   ├── damage.ts
│   │   ├── attack.ts          # BaseAttack (shared)
│   │   ├── character.ts
│   │   ├── species.ts
│   │   ├── background.ts
│   │   ├── class.ts
│   │   ├── feat.ts
│   │   ├── equipment.ts
│   │   ├── spell.ts
│   │   ├── resource.ts
│   │   ├── monster.ts         # MonsterSize, MonsterType, etc.
│   │   └── index.ts           # Barrel export
│   │
│   ├── dice/                   # L1: Foundation - Pure dice rolling (zero dependencies)
│   │   ├── core.ts
│   │   └── index.ts
│   │
│   ├── data/                   # L1: Foundation - Rule data loading (depends on types/)
│   │   ├── loader.ts          # DataLoader interface
│   │   ├── browser-loader.ts  # Browser-compatible DataLoader
│   │   ├── default-loader.ts  # Node.js JSON file implementation
│   │   └── index.ts
│   │
│   ├── engine/                 # L2: Mechanics - Pure rule calculations (depends on L1)
│   │   ├── ability-modifier.ts
│   │   ├── proficiency-bonus.ts
│   │   ├── skill-bonus.ts
│   │   ├── saving-throw.ts
│   │   ├── ac-calculator.ts
│   │   ├── hp-calculator.ts
│   │   ├── spell-slots.ts
│   │   ├── initiative.ts
│   │   ├── passive-perception.ts
│   │   ├── attack-calculator.ts
│   │   ├── damage-calculator.ts
│   │   └── index.ts
│   │
│   ├── spells/                 # L2: Mechanics - Spell queries (depends on L1)
│   │   ├── query.ts           # getSpell(), searchSpells(), etc.
│   │   └── index.ts
│   │
│   ├── character/              # L3: Entities - Character state & mutations (depends on L1, L2)
│   │   ├── create.ts          # createCharacter()
│   │   ├── mutate.ts          # modifyHP(), applyDamage(), etc.
│   │   ├── rest.ts            # shortRest(), longRest()
│   │   ├── level-up.ts        # levelUp()
│   │   ├── validate.ts        # validateCharacter()
│   │   ├── recompute.ts       # recomputeDerivedStats()
│   │   └── index.ts           # Barrel export
│   │
│   ├── monster/               # L3: Entities - Monster state & queries (depends on L1, L2)
│   │   ├── types.ts           # Monster interface
│   │   ├── query.ts           # getMonster(), searchMonsters(), etc.
│   │   ├── calculator.ts      # getMonsterProficiencyBonus(), etc.
│   │   ├── combat.ts          # applyDamage(), addCondition(), etc.
│   │   └── index.ts           # Barrel export
│   │
│   ├── rolls/                  # L4: Application - Apply mechanics to entities (depends on L1+L2+L3)
│   │   ├── character-rolls.ts  # rollCharacterSkillCheck(), etc.
│   │   ├── monster-rolls.ts  # rollMonsterAttack(), etc.
│   │   ├── spell-rolls.ts    # rollSpellAttack(), etc.
│   │   └── index.ts
│   │
│   ├── content/                # Content pack types & utilities
│   │   ├── types.ts           # ContentPack, ContentPackMeta interfaces
│   │   ├── io.ts             # exportContentPack(), importContentPack()
│   │   └── index.ts           # Barrel export
│   │
│   └── storage/                # Persistence (interface + implementations)
│       ├── interface.ts        # ICharacterStorage interface
│       ├── serializer.ts       # JSON serialize/deserialize
│       ├── memory.ts           # InMemoryStorage (for tests)
│       ├── json-file.ts        # JsonFileStorage (file system)
│       └── index.ts           # Barrel export
│
├── dist/                      # Build output
│   ├── index.js               # Node.js bundle
│   ├── open20-core.js         # Browser UMD bundle
│   └── open20-core.esm.js     # Browser ESM bundle
│
└── tests/
    ├── engine/                   # L2: Mechanics unit tests
    ├── character/                # L3: Character tests
    ├── monster/                  # L3: Monster tests
    ├── rolls/                    # L4: Application tests
    ├── spells/                   # L2: Spell tests
    ├── storage/                  # Persistence tests
    ├── data/                     # Data integrity tests
    └── integration/              # Integration tests
```

---

## 4. TypeScript Conventions

### 4.1 Strict Settings
- `strict: true`
- `noUncheckedIndexedAccess: true` → **ALL array/object accesses return `T | undefined`**
- `moduleResolution: "bundler"` (NOT "Node16" - avoids forcing `.js` extensions)

### 4.2 Handling `noUncheckedIndexedAccess`
**WRONG** (will cause TypeScript error):
```typescript
const bonus = array[index];  // Type: number | undefined
const value = obj[key];      // Type: number | undefined
```

**RIGHT**:
```typescript
const bonus = array[index] ?? 0;  // Provide default
const value = obj[key]!;          // Non-null assertion (only if you're SURE it exists)
const value = obj[key] ?? default; // Safe access with fallback
```

### 4.3 Immutable Update Pattern
ALL mutation functions MUST return a new object. Use spread operator:

```typescript
// ✅ CORRECT
export function modifyHP(char: Character, delta: number): Character {
  return {
    ...char,
    hitPoints: {
      ...char.hitPoints,
      current: Math.max(0, char.hitPoints.current + delta),
    },
    updatedAt: new Date().toISOString(),
  };
}

// ❌ WRONG - mutates original object
export function modifyHP(char: Character, delta: number): Character {
  char.hitPoints.current += delta;  // MUTATION!
  return char;
}
```

### 4.4 Function Naming Conventions (by Layer)

#### L1: Foundation
- `types/`: Type definitions only (no functions)
- `dice/core.ts`: `rollDie()`, `rollDice()`, `parseDiceExpression()`, etc.
  - Pure dice rolling, no game logic

#### L2: Mechanics
- `engine/`: `calculate*` (pure calculations), `get*` (lookups)
  - `calculateAC()`, `getModifier()`, `getSkillBonus()`, etc.
- `spells/`: `get*` (queries), `search*` (filter operations)
  - `getSpell()`, `searchSpells()`, etc.

#### L3: Entities
- `character/`: `create*` (creation), `modify*` (mutations), `apply*` (apply effects)
  - `createCharacter()`, `modifyHP()`, `applyDamage()`, etc.
- `monster/`: `get*` (queries), `apply*` (apply effects)
  - `getMonster()`, `applyDamage()`, `addCondition()`, etc.

#### L4: Application
- `rolls/`: `rollCharacter*()`, `rollMonster*()`, `rollSpell*()`
  - `rollCharacterSkillCheck()`, `rollMonsterAttack()`, `rollSpellDamage()`, etc.
  - Thin orchestration layer, no complex logic

### 4.5 Export Syntax
**WRONG**:
```typescript
export const { TypeA, TypeB } from './types';  // Invalid!
```

**RIGHT**:
```typescript
export type { TypeA, TypeB } from './types';  // For types
export { value1, value2 } from './types';     // For values
```

---

## 5. Common Pitfalls & Fixes

### 5.1 ESM JSON Loading
**Problem**: `require()` doesn't work in ESM.
**Fix**: Use native ESM imports (vitest/Vite supports JSON imports natively):
```typescript
// ✅ RIGHT - Native ESM JSON import
import data from './file.json';

// ❌ WRONG - Don't use createRequire in test files
import { createRequire } from 'node:module';
```
**Note**: `src/data/default-loader.ts` uses `createRequire` for Node.js production code where JSON imports may not be supported. Test files should use native ESM imports.

### 5.2 `ReadonlyMap` Serialization
**Problem**: `ReadonlyMap` can't be serialized to JSON.
**Fix**: Store as array in JSON, convert to Map in `default-loader.ts`:
```typescript
// JSON format (array of [key, value] tuples)
"featuresByLevel": [[1, [...]], [2, [...]]]

// In default-loader.ts
function parseFeaturesByLevel(json: any): ReadonlyMap<number, readonly Feature[]> {
  const map = new Map<number, Feature[]>();
  for (const [level, features] of json) {
    map.set(level, features);
  }
  return map;
}
```

### 5.3 Test File Imports
**Problem**: `@/` path aliases don't work in test files.
**Fix**: Use relative paths:
```typescript
// ❌ WRONG
import { calculateModifier } from '@/src/engine/ability-modifier';

// ✅ RIGHT
import { calculateModifier } from '../../src/engine/ability-modifier';
```

### 5.4 `LookupTables` Type Mismatch
**Problem**: `spellSlots` in JSON is stored as arrays, but TypeScript type expects nested objects.
**Fix**: Type definition in `loader.ts`:
```typescript
spellSlots: Record<string, Record<number, readonly number[]>>;
// Inner value is `readonly number[]`, not `Record<number, number>`
```

### 5.5 Per-Class Spell Tracking (New in v0.x)
**Context**: Spell data is now tracked PER CLASS, not on the character directly.

**Old way (WRONG)**:
```typescript
// ❌ WRONG - These fields no longer exist on CharacterSpells
const dc = char.spells.spellSaveDC;
const known = char.spells.knownSpells;
```

**New way (CORRECT)**:
```typescript
// ✅ RIGHT - Access per-class data
const classSpellData = char.spells.classSpellcasting[classId];
if (classSpellData) {
  const dc = classSpellData.spellSaveDC;
  const known = classSpellData.knownSpells;
  const prepared = classSpellData.preparedSpells;
}

// Or use query functions
const classData = getClassSpellData(char, 'wizard');
const knows = knowsSpellForClass(char, 'wizard', 'fireball');
```

**Key changes**:
- `classSpellcasting: Record<string, ClassSpellData>` - keyed by classId
- `spellSlots` is still a unified pool (correct for D&D 5e multiclassing)
- Use `getClassSpellData()`, `knowsSpellForClass()`, `isSpellPreparedForClass()` for queries
- Use `prepareSpellForClass()`, `unprepareSpellForClass()` for mutations

---

## 6. How to Run Tests & Build

> **CRITICAL**: Before committing, you MUST run the same validation steps as CI (see `.github/workflows/ci.yml`).

```bash
cd /workspaces/open20-core

# Install dependencies (first time only)
npm install

# Run all tests (same as CI Step 5)
npm test

# Run specific test file
npx vitest run tests/engine/ability-modifier.test.ts

# Lint (MUST pass before committing - same as CI Step 4)
npm run lint
# or with auto-fix:
npm run lint:fix

# Type check (MUST pass before committing - same as CI Step 3)
npm run typecheck

# Run tests with coverage
npm test -- --coverage

# Build Node.js bundle (same as CI Step 6)
npm run build

# Build browser bundles (same as CI Step 7)
npm run build:bundle

# Test Node.js artifact (same as CI Step 8)
npm run test:artifact

# Test browser artifact (same as CI Step 9)
npm run test:browser-artifact

# Minimum required before commit (Steps 3-5):
npm run typecheck && npm run lint && npm test

# Full CI validation (run before committing):
npm run typecheck && npm run lint && npm test && npm run build && npm run build:bundle && npm run test:artifact && npm run test:browser-artifact
```

### 6.1 CI Validation Steps

These are the **exact steps** run in CI (see `.github/workflows/ci.yml`). Run them locally before committing:

| Step | Command | CI Step |
|------|---------|---------|
| 1 | `npm ci` | Install deps |
| 2 | `npm run typecheck` | Type check |
| 3 | `npm run lint` | Lint |
| 4 | `npm test` | Run tests |
| 5 | `npm run build` | Build Node.js |
| 6 | `npm run build:bundle` | Build browser bundle |
| 7 | `npm run test:artifact` | Test Node.js artifact |
| 8 | `npm run test:browser-artifact` | Test browser artifact |

**Minimum required before commit** (Steps 2-4):
```bash
npm run typecheck && npm run lint && npm test
```

**Target**: 100% coverage for `engine/` and `character/` modules.

---

## 7. How to Add New Features

### 7.1 Adding a New Engine Function
1. Create `src/engine/new-function.ts`
2. Implement as pure function with `calculate*` or `get*` prefix
3. Add export to `src/engine/index.ts` (if exists) or `src/index.ts`
4. Write tests in `tests/engine/new-function.test.ts`
5. Update `spec/high-level-design.md` S-xx status

### 7.2 Adding a New Mutation Function
1. Add function to `src/character/mutate.ts`
2. Follow immutable update pattern (see §4.3)
3. Update return type `Character`
4. Write tests in `tests/character/mutate.test.ts`
5. Export via `src/character/index.ts`

### 7.3 Adding New Static Data (SRD 5.2)
> **Status**: ✅ Complete. All content aligned with SRD 5.2.

1. Update JSON schema in `spec/data-model.md`
2. Add data to `static/srd/*.json` (NOT `static/*.json`)
3. Ensure `source: 'SRD 5.2'` tag on all content
4. Update `default-loader.ts` if new `DataLoader` methods needed
5. Update `LookupTables` interface in `src/data/loader.ts`
6. Write data integrity tests in `tests/data/` (S20)

### 7.4 Creating Content Packs (Homebrew/Official)
Content packs are directories with `meta.json` + JSON files:
```
my-content-pack/
├── meta.json          # ContentPackMeta
├── species.json       # Additional species
├── spells.json        # Additional spells
└── ...
```

**meta.json schema**:
```json
{
  "id": "my-homebrew",
  "name": "My Homebrew Content",
  "version": "1.0.0",
  "source": "Homebrew",
  "author": "Your Name",
  "priority": 0
}
```

**Loading content packs**:
```typescript
import { registerContentPack } from '@open20/core';

const meta = { id: 'my-homebrew', name: '...', version: '1.0.0', source: 'Homebrew' };
const data = {
  spells: [{ id: 'custom-spell', name: 'Custom Spell', source: 'Homebrew', ... }]
};
registerContentPack(meta, data);
```

**Key rules**:
- Same ID in different packs = separate items (no override)
- `getSpell('custom-spell')` returns first registered version
- Use `getSpellsBySource('Homebrew')` to filter by source

### 7.4 Adding Spell Data
1. Use `scripts/import_srd_spells.py` to import from dnd-data repo
2. Validate imported data against spell schema
3. Update `static/spells.json`
4. Write tests for new spell queries

---

## 8. Spell Data Management

### Current Status
- ✅ `spells.json` populated with 391+ SRD 5.2 spells
- ✅ Import script at `scripts/import_srd_spells.py`
- ✅ Source: dnd-data GitHub repo (nick-aschenbach/dnd-data)

### Adding New Spells
```bash
# Import SRD spells from dnd-data
python3 scripts/import_srd_spells.py

# Validate imported data
npx vitest run tests/data/spells.test.ts
```

### Spell Data Format Rules
1. **ID format**: kebab-case (`fire-bolt`, not `FireBolt`)
2. **Ability names**: Use full names (`Strength`, not `Str`)
3. **Components**: `{ V?: boolean; S?: boolean; M?: string | boolean }`
4. **Damage**: `{ dice?: string; type?: DamageType; scale?: 'cantrip' | 'level' }`
5. **Source**: Include full source string for attribution

---

## 9. Requirement Management

### 9.1 Requirement Tracking System
Requirements are tracked in `requirements/README.md` with IDs R1-R26:

```markdown
### R11: Spell Query Functions
**Description**: Provide functions to query spell data
**Status**: ✅ Completed
**对应源码**:
- `src/spells/query.ts` - Query functions
- `tests/spells/query.test.ts` - Tests
```

### 9.2 Requirement Status Indicators
- ✅ **Completed**: Fully implemented with tests
- 📋 **Planned**: Documented but not started
- 🚧 **In Progress**: Partially implemented
- ❌ **Blocked**: Cannot implement due to dependencies

### 9.3 How to Mark a Requirement as Complete
1. Implement all functionality described in the requirement
2. Write tests covering the requirement
3. Update `requirements/README.md`:
   - Change status to ✅
   - Add "对应源码" section with file paths
4. Update `spec/high-level-design.md` S-xx status if applicable
5. Run `npm test` to verify all tests pass
6. Commit with prefix `[Rx]` (e.g., `[R11]`)

### 9.4 How to Add a New Requirement
1. Add entry to `requirements/README.md` with format:
   ```markdown
   ### Rxx: [Requirement Name]
   **Description**: [What it does]
   **Status**: 📋 Planned
   ```
2. Create directory `requirements/Rxx-name/` if detailed spec needed
3. Update `spec/high-level-design.md` if it affects architecture
4. Add to PRD.md if it's a user-facing feature

### 9.5 Requirement Implementation Checklist
- [ ] Code implemented in `src/`
- [ ] Unit tests written in `tests/`
- [ ] All tests pass (`npx vitest run`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Requirement marked as ✅ in `requirements/README.md`
- [ ] `对应源码` links added

### 9.6 Traceability Matrix
Keep requirements traceable through implementation:

| Requirement | Specification | Source Files | Tests |
|-------------|---------------|--------------|-------|
| R1 | S1 | `src/engine/*.ts` | `tests/engine/*.test.ts` |
| R11 | S14 | `src/spells/query.ts` | `tests/spells/query.test.ts` |

Update this matrix in `requirements/README.md` when adding new requirements.

---

## 10. Documentation Maintenance

### 10.1 Documentation Suite Overview
| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `PRD.md` | Product requirements | Major features only |
| `spec/high-level-design.md` | Technical architecture | Every S1-S20 change |
| `spec/data-model.md` | TypeScript interfaces | Every type change |
| `requirements/README.md` | Requirement traceability | Every R1-R26 change |
| `agent.md` | AI agent guidelines | Every convention/pitfall |
| `README.md` | User-facing docs | Every public API change |

### 10.2 When to Update Each Document

#### `PRD.md`
- Project scope or positioning changes
- New major features added
- Target audience changes
- Release planning updates

#### `spec/high-level-design.md`
- Added/modified/removed any S1-S20 functionality
- Changed function signatures (update §12 function list)
- Changed module dependencies
- Update status column (✅/📋/🚧)
- Update test count after adding tests

#### `spec/data-model.md`
- Changed TypeScript interfaces in `src/types/index.ts`
- Changed JSON schema in `static/*.json`
- Added/removed fields from core types
- Updated Zod schemas in `src/schemas/`

#### `requirements/README.md`
- Implemented a new requirement (mark Rxx as ✅)
- Changed requirement scope
- Add "对应源码" links when implementing
- Update status indicators regularly

#### `agent.md` (This File)
- New common pitfalls discovered
- New conventions established
- Project structure changed
- New tooling added
- Test count changes
- New sections needed (like this one!)

### 10.3 Documentation Sync Checklist
After completing any code change:

1. **Identify affected documents** (see §10.2)
2. **Update specification status** (S-xx, R-xx)
3. **Update test counts** if tests added/removed
4. **Update directory structure** if files added/removed
5. **Add new pitfalls** discovered during implementation
6. **Cross-reference check**: Ensure links between documents work
7. **Build and verify**: `npm run lint && npm run typecheck && npx vitest run`

### 10.4 Writing Guidelines for Documentation
- **Be concise**: No narration, get to the point
- **Use examples**: Code snippets speak louder than words
- **Keep tables readable**: Don't let them get too wide
- **Update the "Last updated" line** at bottom of each document
- **Use status indicators**: ✅ 📋 🚧 ❌ for quick visual scanning
- **Link to source**: Use "对应源码" sections for traceability

### 10.5 Common Documentation Mistakes to Avoid
- ❌ Forgetting to update test counts after adding tests
- ❌ Not marking requirements as complete in `requirements/README.md`
- ❌ Letting `agent.md` get out of date with actual project structure
- ❌ Not updating function signatures in `spec/high-level-design.md` §12
- ❌ Breaking markdown table formatting (triple pipes `|||`)

---

## 11. Testing Patterns

### 11.1 Unit Test Structure
```typescript
import { describe, it, expect } from 'vitest';
import { functionUnderTest } from '../../src/module/file';

describe('functionUnderTest', () => {
  it('should do X when Y', () => {
    const result = functionUnderTest(input);
    expect(result).toBe(expected);
  });

  it('should handle edge case Z', () => {
    const result = functionUnderTest(edgeCase);
    expect(result).toEqual(expected);
  });
});
```

### 11.2 Testing with DataLoader
```typescript
import { createDataLoader, type DataLoader } from '../../src/data/loader';

// Create mock data
const mockTables = {
  proficiencyBonus: { 1: 2, 2: 2, ... },
  // ... other tables
};

const mockLoader: DataLoader = createDataLoader(mockTables);

// Use in tests
const result = createCharacter(params, mockLoader);
```

### 11.3 Testing Immutable Updates
```typescript
it('should return new object without mutating original', () => {
  const original = createTestCharacter();
  const modified = modifyHP(original, 5);

  // New object
  expect(modified).not.toBe(original);

  // Original unchanged
  expect(original.hitPoints.current).toBe(oldValue);

  // Modified has changes
  expect(modified.hitPoints.current).toBe(oldValue + 5);

  // updatedAt changed
  expect(modified.updatedAt).not.toBe(original.updatedAt);
});
```

### 11.4 Testing Spell Queries
```typescript
it('should filter spells by school and level', () => {
  const spells = searchSpells({ 
    school: 'Evocation', 
    level: [1, 2, 3] 
  });
  
  expect(spells.length).toBeGreaterThan(0);
  spells.forEach(spell => {
    expect(spell.school).toBe('Evocation');
    expect(spell.level).toBeLessThanOrEqual(3);
  });
});
```

---

## 12. Git Commit Guidelines

Since this project uses AI agents, commit messages should be:
- **Clear**: What changed, why
- **Atomic**: One logical change per commit
- **Prefixed**: `[Sxx]` for specification item, `[Fix]` for bug fixes, `[Docs]` for documentation

Examples:
```
[S11] Implement attack calculator engine function
[Fix] Handle undefined access in hp-calculator (noUncheckedIndexedAccess)
[Docs] Update PRD to reflect headless engine direction
[S12] Add species.json with 12 species
[Spells] Import 560+ SRD spells from dnd-data repo
```

---

## 13. Quick Reference

| Task | Command |
|------|---------|
| Lint | `npm run lint` |
| Lint with auto-fix | `npm run lint:fix` |
| Type check | `npm run typecheck` |
| Run all tests | `npm test` |
| Run single test | `npx vitest run tests/path/to/test.test.ts` |
| Install deps | `npm install` |
| Check coverage | `npm test -- --coverage` |
| Import spells | `python3 scripts/import_srd_spells.py` |
| Full CI validation | `npm run typecheck && npm run lint && npm test && npm run build && npm run build:bundle && npm run test:artifact && npm run test:browser-artifact` |

| File | Purpose |
|------|---------|
| `PRD.md` | Product Requirements Document |
| `agent.md` | This file - read first! |
| `spec/high-level-design.md` | Technical architecture (S1-S20) |
| `spec/data-model.md` | TypeScript interfaces & JSON schema |
| `requirements/README.md` | Requirements traceability (R1-R26) |
| `src/types/index.ts` | All core types |
| `src/data/loader.ts` | DataLoader interface |
| `requirements/11-content-management/` | Content management spec (R26) |
| `src/content/types.ts` | ContentPack, ContentPackMeta interfaces |
| `static/srd/` | SRD 5.2 content (included in core) |

---

## 14. Contact / Escalation

If you're stuck or unsure:
1. Read `spec/high-level-design.md` for architecture context
2. Check `tests/` for usage examples
3. Look at existing implementations in `src/` for patterns
4. If still stuck, ask the user for clarification

**Remember**: When in doubt, follow existing patterns in the codebase. Consistency is more important than perfection.

---

*Last updated: 2026-05-10 (updated CI validation steps, test count to 753+, added section 6.1)*
*Maintained by: AI agents working on this project*
