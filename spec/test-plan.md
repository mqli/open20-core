# Test Plan

**Version**: 2.0 (Headless Engine)
**Date**: 2026-05-08
**Goal**: Define test strategy, coverage, and execution plan for Open20 Core

---

## 1. Test Scope

### 1.1 Test Objectives
- Validate all D&D 5e 2024 rule calculations
- Ensure immutable state management correctness
- Validate data integrity (JSON format and content)
- Ensure module dependency rules aren't violated
- Achieve 100% coverage for engine and character modules

### 1.2 Test Levels
1. **Unit Tests** — 415+ tests (✅ Complete)
2. **Integration Tests** — Character creation + calculation flows
3. **Data Integrity Tests** — JSON validation against Zod schemas
4. **Property-Based Tests** — Use fast-check for rule calculations
5. **E2E Tests** — Optional, for CLI/API consumers

---

## 2. Current Test Status

### 2.1 Completed Tests (S1-S20)

| Module | File | Count | Coverage | Status |
|--------|------|-------|----------|--------|
| **Engine** | | **201** | | |
| Ability modifier | `tests/engine/ability-modifier.test.ts` | 14 | 100% | ✅ |
| Proficiency bonus | `tests/engine/proficiency-bonus.test.ts` | 9 | 100% | ✅ |
| Skill bonus | `tests/engine/skill-bonus.test.ts` | 37 | 100% | ✅ |
| Saving throw | `tests/engine/saving-throw.test.ts` | 27 | 100% | ✅ |
| AC calculation | `tests/engine/ac-calculator.test.ts` | 10 | 100% | ✅ |
| HP calculation | `tests/engine/hp-calculator.test.ts` | 17 | 100% | ✅ |
| Spell slots | `tests/engine/spell-slots.test.ts` | 34 | 100% | ✅ |
| Initiative | `tests/engine/initiative.test.ts` | 24 | 100% | ✅ |
| Passive perception | `tests/engine/passive-perception.test.ts` | 20 | 100% | ✅ |
| Attack calculation | `tests/engine/attack-calculator.test.ts` | 19 | 100% | ✅ |
| **Character** | | **144** | | |
| Create | `tests/character/create.test.ts` | 46 | 100% | ✅ |
| Mutate | `tests/character/mutate.test.ts` | 38 | 100% | ✅ |
| Rest | `tests/character/rest.test.ts` | 20 | 100% | ✅ |
| Level up | `tests/character/level-up.test.ts` | 13 | 100% | ✅ |
| Validate | `tests/character/validate.test.ts` | 15 | 100% | ✅ |
| Recompute | `tests/character/recompute.test.ts` | 12 | 100% | ✅ |
| **Storage** | | **20** | | |
| Serializer | `tests/storage/serializer.test.ts` | 20 | 100% | ✅ |
| **Spells** | | **20** | | |
| Query | `tests/spells/query.test.ts` | 20 | 100% | ✅ |
| **Integration** | | **10** | | |
| Create + Calculate | `tests/integration/*.test.ts` | 10 | 100% | ✅ |
| **TOTAL** | **17 test files** | **415+** | **~95%** | ✅ |

### 2.2 Coverage Gaps

1. **Mock Data Issue**: Tests use mock data, not real D&D 2024 data
   - `createCharacter()` tests use mock `DataLoader`, not real classes/species
   - Risk: Real data may expose edge cases or format issues

2. **Multiclass Scenarios**: Tests mainly cover single class, multiclass undertested
   - `calculateSpellSlots()` has multiclass logic but limited test cases
   - `levelUp()` multiclass paths not fully tested

3. **Subclass Testing**: Subclass features not fully tested
   - `recomputeDerivedStats()` should collect all subclass features
   - Current tests use mock features, not real subclasses

4. **Edge Cases**: Some extreme cases untested
   - Death and death saves (`DeathSaves`)
   - Multiple conditions stacked (e.g., temp HP + damage absorption)
   - Spell slot recovery edge cases (multiclass Wizard/Warlock)

5. **Spell Data Validation**: Imported SRD spells not fully validated
   - Need schema validation for all 560+ spells
   - Cross-reference: spells in class lists exist in spells.json

---

## 3. Pending Tests (S20+)

### 3.1 Data Integrity Tests (Priority: HIGH)

**Goal**: Validate all `static/*.json` files for correct format and completeness.

#### 3.1.1 `lookup-tables.json` Validation
- [x] `proficiencyBonus` contains levels 1-20
- [x] `hitDieFixedValue` contains all die types (d4-d12)
- [x] `spellSlots` contains all casting classes
- [x] `multiclassSpellSlots` contains levels 1-20
- [x] `pactMagicSlots` contains levels 1-20
- [x] `weaponMasteryProperties` contains 8 properties
- [x] `conditionNames` contains 16 conditions

#### 3.1.2 `species.json` Validation
- [x] Contains 12 species (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Tiefling, Orc, Goliath, Aasimar, Half-Elf, Half-Orc)
- [x] Each species has correct `abilityBonuses` (use full names)
- [x] Each species has `baseTraits` array
- [x] Each species has `subtypes` array
- [x] `darkvision` field exists and is reasonable

#### 3.1.3 `backgrounds.json` Validation
- [x] Contains 16 backgrounds
- [x] Each background has `skillProficiencies` (1-2 skills)
- [x] Each background has `originFeatId` matching a feat in `feats.json`

#### 3.1.4 `classes.json` Validation
- [x] Contains 12 classes
- [x] Each class has correct `hitDie`
- [x] Each class has `featuresByLevel` for levels 1-20
- [x] Spellcasting classes have `spellcasting` object

#### 3.1.5 `spells.json` Validation
- [ ] Contains 560+ spells (SRD + 2024 PHB)
- [ ] Each spell has required fields (id, name, level, school, description)
- [ ] Spell IDs are kebab-case
- [ ] `classes` array contains valid class names
- [ ] Cross-reference: All spells in class spell lists exist

### 3.2 Property-Based Testing (Priority: MEDIUM)

**Goal**: Use fast-check to test rule calculations with random inputs.

```typescript
import fc from 'fast-check';

describe('getModifier property-based tests', () => {
  it('should always return integer between -5 and +10', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), (score) => {
        const mod = getModifier(score);
        expect(mod).toBeGreaterThanOrEqual(-5);
        expect(mod).toBeLessThanOrEqual(10);
        expect(Number.isInteger(mod)).toBe(true);
      })
    );
  });
});
```

**Targets**:
- [ ] `getModifier()` — All scores 1-30 produce valid modifiers
- [ ] `getProficiencyBonus()` — Monotonic, correct values
- [ ] `calculateMaxHP()` — HP always positive, increases with level
- [ ] `calculateSpellSlots()` — Slot counts always non-negative

### 3.3 Integration Test Expansion (Priority: MEDIUM)

**Goal**: Test complete flows.

| Flow | Description | Status |
|------|-------------|--------|
| Create → Calculate | Create character, calculate all derived stats | ✅ |
| Create → Level Up → Validate | Level up, validate resulting character | ✅ |
| Rest → Recover | Short/long rest, verify resource recovery | ✅ |
| Combat Simulation | Take damage, death saves, healing | 📋 |
| Multiclass Flow | Create multiclass, calculate spell slots | 📋 |

---

## 4. Test Execution Plan

### 4.1 Running Tests

```bash
# Run all tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run specific test file
npx vitest run tests/engine/ability-modifier.test.ts

# Watch mode (development)
npx vitest
```

### 4.2 Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| `src/engine/*` | 100% | ~100% |
| `src/character/*` | 100% | ~100% |
| `src/spells/*` | 100% | ~80% |
| `src/schemas/*` | 100% | 0% (new) |
| `src/storage/*` | 100% | ~100% |

### 4.3 CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm install
    npx vitest run --coverage
    npx tsc --noEmit
```

**Gate**: PR cannot merge if:
- Any test fails
- Coverage drops below 95%
- TypeScript errors exist

---

## 5. Test Patterns

### 5.1 Unit Test Structure

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

### 5.2 Testing Immutable Updates

```typescript
it('should return new object without mutating original', () => {
  const original = createTestCharacter();
  const modified = modifyHP(original, 5);

  expect(modified).not.toBe(original);
  expect(original.hitPoints.current).toBe(oldValue);
  expect(modified.hitPoints.current).toBe(oldValue + 5);
  expect(modified.updatedAt).not.toBe(original.updatedAt);
});
```

### 5.3 Testing with DataLoader

```typescript
import { createDataLoader } from '../../src/data/loader';

const mockTables = {
  proficiencyBonus: { 1: 2, 2: 2, ... },
  // ... other tables
};

const mockLoader = createDataLoader(mockTables);
const result = createCharacter(params, mockLoader);
```

---

## 6. Future Enhancements

| Enhancement | Priority | Description |
|---|---|---|
| Property-based testing | P0 | Use fast-check for all engine functions |
| Snapshot testing | P1 | Snapshot character JSON for regression detection |
| Performance testing | P2 | Benchmark spell queries, large character lists |
| Fuzz testing | P2 | Random character configurations, validate no crashes |

---

*Last updated: 2026-05-09*
*Version: 2.0 (Headless Engine)*
