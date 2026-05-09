# Agent Context Document

> **Purpose**: This document provides essential context, conventions, and guidelines for AI agents (Codex, Claude, etc.) working on the Open20 Core project. Read this before making any changes.

---

## 1. Project Overview

**Project**: Open20 Core - Headless D&D 5e 2024 Game Engine
**Goal**: A TypeScript library for D&D 5e 2024 rules engine, spell management, and character management. No UI - pure logic, testable via unit tests, usable by any framework.
**Status**: S1-S21 complete (633+ tests passing)

### Key Design Decisions
- **Headless**: Zero UI dependency. Pure functions, immutable state.
- **Immutable State**: All Character fields are `readonly`. Modifications return new objects via spread operator. No Immer/Immutable.js.
- **Dependency Injection**: `DataLoader` interface for testability and future API replacement.
- **ESM**: Project uses `"type": "module"`. Uses native ESM JSON imports (vitest supports `import data from './file.json'`).
- **Zod Schemas**: Runtime validation for all data structures.

---

## 2. Architecture & Module Dependencies

```
types  ←  data  ←  engine  ←  character  ←  storage
(leaf)    ↓        ↓           ↓              ↓
       JSON files  pure       mutations    persistence
                    functions
```

**Rules enforced by ESLint** (`no-restricted-imports`):
- `data` CANNOT import from `engine`, `character`, `storage`
- `engine` CANNOT import from `character`, `storage`
- `character` CANNOT import from `storage`
- `storage` CANNOT import from `engine`, `character`

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
│   ├── high-level-design.md    # HLD v2.1 (S1-S20, R26 complete)
│   ├── data-model.md           # TypeScript interfaces & JSON schema
│   └── test-plan.md           # Test plan and coverage goals
├── requirements/
│   └── README.md               # R1-R21 requirements traceability
├── static/
│   └── srd/                   # SRD 5.2 content (included in core)
│       ├── meta.json           # Content pack metadata
│       ├── species.json        # 9 species (SRD 5.2)
│       ├── backgrounds.json    # 13 backgrounds (SRD 5.2)
│       ├── classes.json        # 12 classes (SRD 5.2)
│       ├── subclasses.json     # Subclasses for SRD classes
│       ├── feats.json          # Limited feats (SRD 5.2)
│       ├── spells.json         # 391+ spells (SRD 5.2)
│       ├── monsters.json       # ~3 SRD monsters (sample)
│       ├── weapons.json        # ~30 weapons (SRD 5.2)
│       ├── armor.json          # ~15 armors (SRD 5.2)
│       ├── gear.json           # ~20 gear items (SRD 5.2)
│       └── lookup-tables.json  # Proficiency, HP, spell slots, etc.
├── src/
│   ├── index.ts                # Node.js barrel export (includes storage)
│   ├── browser-index.ts        # Browser barrel export (excludes Node.js storage)
│   ├── types/
│   │   └── index.ts           # All TypeScript interfaces/types
│   ├── data/
│   │   ├── loader.ts          # DataLoader interface (20+ methods)
│   │   ├── browser-loader.ts  # Browser-compatible DataLoader (bundles JSON)
│   │   └── default-loader.ts  # Node.js JSON file implementation
│   ├── engine/                 # Pure functions for rule calculations
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
│   │   └── combat.ts           # Shared HP helpers (character + monster)
│   ├── character/              # Character creation & validation
│   │   ├── create.ts          # createCharacter()
│   │   ├── mutate.ts          # Immutable mutation functions
│   │   ├── rest.ts            # shortRest(), longRest()
│   │   ├── level-up.ts        # levelUp()
│   │   ├── validate.ts        # validateCharacter()
│   │   ├── recompute.ts       # recomputeDerivedStats()
│   │   └── index.ts           # Barrel export
│   ├── spells/                 # Spell data & queries
│   │   ├── query.ts           # getSpell(), searchSpells(), etc.
│   │   ├── types.ts           # Spell types
│   │   └── index.ts           # Barrel export
│   ├── monster/               # Monster data & queries (R28)
│   │   ├── query.ts           # getMonster(), searchMonsters(), etc.
│   │   ├── calculator.ts      # getMonsterProficiencyBonus(), etc.
│   │   ├── combat.ts          # HP management, damage dealing/taking
│   │   ├── types.ts           # Monster types
│   │   └── index.ts           # Barrel export
│   ├── content/                # R26: Content pack types & utilities
│   │   ├── types.ts           #   ContentPack, ContentPack, ContentPackMeta interfacess
│   │   ├── io.ts             #   exportContentPack(), importContentPack()
│   │   └── index.ts           # Barrel export
│   ├── types/
│   │   ├── attack.ts          # BaseAttack (shared)
│   │   ├── monster.ts         # MonsterSize, MonsterType, etc.
│   │   └── index.ts           # All TypeScript interfaces/types
│   ├── schemas/                # Zod schemas
│   │   ├── character.ts
│   │   ├── spell.ts
│   │   └── index.ts
│   └── storage/                # Persistence (interface + implementations)
│       ├── interface.ts        # ICharacterStorage interface
│       ├── serializer.ts       # JSON serialize/deserialize
│       ├── memory.ts           # InMemoryStorage (for tests)
│       ├── json-file.ts        # JsonFileStorage (file system)
│       └── index.ts           # Barrel export
├── dist/                      # Build output
│   ├── index.js               # Node.js bundle
│   ├── open20-core.js         # Browser UMD bundle
│   └── open20-core.esm.js     # Browser ESM bundle
└── tests/
    ├── engine/*.test.ts        # 11 test files
    ├── character/*.test.ts      # 6 test files
    ├── monster/*.test.ts       # 3 test files (query, calculator, combat)
    ├── storage/*.test.ts       # 1 test file
    ├── data/*.test.ts          # 1 test file
    ├── content/*.test.ts       # 1 test file
    └── integration/*.test.ts   # 8 test files
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

### 4.4 Function Naming Conventions
- `calculate*` - Derived values (no side effects, pure functions)
- `get*` - Lookups from data store
- `create*` - New object creation
- `search*` - Query/filter operations
- `modify*` / `set*` / `toggle*` - State mutations (return new Character)

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

---

## 6. How to Run Tests & Build

```bash
cd /workspaces/open20-core

# Install dependencies (first time only)
npm install

# Run all tests
npx vitest run

# Run specific test file
npx vitest run tests/engine/ability-modifier.test.ts

# Lint (MUST pass before committing)
npm run lint

# Type check (MUST pass before committing)
npm run typecheck

# Run tests with coverage
npx vitest run --coverage

# Build browser bundles
npm run build:browser
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
| Type check | `npm run typecheck` |
| Run all tests | `npx vitest run` |
| Run single test | `npx vitest run tests/path/to/test.test.ts` |
| Install deps | `npm install` |
| Check coverage | `npx vitest run --coverage` |
| Import spells | `python3 scripts/import_srd_spells.py` |

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

*Last updated: 2026-05-09 (added sections 9 Requirement Management and 10 Documentation Maintenance)*
*Maintained by: AI agents working on this project*
