# Monster Support System

**Requirement ID**: R28
**Priority**: P2
**Status**: 📋 Planned
**Created**: 2026-05-09

---

## 1. Overview

Add support for D&D 5e monsters (SRD and homebrew) with query functions and combat calculations. Follows the same pattern as the `spells/` module.

**Design Decisions**:
1. **Structured data** for attacks/actions (not parsed text)
2. **Simple CR filtering** (not full encounter building)
3. **Integrate with combat system** (share logic with `engine/attack-calculator.ts`)
4. **Share types/code with Character** where appropriate (AbilityScores, Attack, DamageType)

---

## 2. Requirements

### R28.1 — Monster Data Model

**Description**: Define TypeScript interfaces for monster data, extending/sharing types with Character where appropriate.

**Shared Types** (from `src/types/`):
- `AbilityScores` (same 6 abilities)
- `Attack` (extend with `MonsterAttack`)
- `DamageType` (same damage types)
- `ConditionName` (both can have conditions)

**New Types** (in `src/types/monster.ts`):
- `MonsterSize` (`'Tiny'` | `'Small'` | `'Medium'` | `'Large'` | `'Huge'` | `'Gargantuan'`)
- `MonsterType` (`'Aberration'` | `'Beast'` | `'Celestial'` | ... 14 types)
- `ChallengeRating` (`number | '1/8' | '1/4' | '1/2'`)

**Acceptance Criteria**:
- [ ] `src/types/monster.ts` created with `MonsterSize`, `MonsterType`, `ChallengeRating`
- [ ] `src/monsters/types.ts` created with `Monster`, `MonsterAttack`, etc.
- [ ] `MonsterAttack` extends `Attack` interface
- [ ] All types exported via `src/types/index.ts`

---

### R28.2 — Monster Query Functions

**Description**: Provide query functions to search/filter monsters by various criteria.

**Functions** (in `src/monsters/query.ts`):
```typescript
getMonster(id: string, data: DataLoader): Monster | undefined
searchMonsters(filter: MonsterFilter, data: DataLoader): Monster[]
getMonstersByCR(minCR: ChallengeRating, maxCR: ChallengeRating, data: DataLoader): Monster[]
getMonstersByType(type: MonsterType, data: DataLoader): Monster[]
```

**Filter Criteria**:
- `name?: string`
- `size?: MonsterSize[]`
- `type?: MonsterType[]`
- `minCR?: ChallengeRating`
- `maxCR?: ChallengeRating`
- `environment?: string[]`
- `source?: string`

**Acceptance Criteria**:
- [ ] `getMonster()` returns monster by ID
- [ ] `searchMonsters()` supports all filter criteria
- [ ] `getMonstersByCR()` returns monsters within CR range
- [ ] `getMonstersByType()` returns monsters of given type
- [ ] All functions pass `DataLoader` as parameter

---

### R28.3 — Monster Calculation Functions

**Description**: Calculate monster-specific values (attack bonus, save DC, proficiency bonus from CR).

**Functions** (in `src/monsters/calculator.ts`):
```typescript
getMonsterProficiencyBonus(cr: ChallengeRating): number
calculateMonsterAttackBonus(monster: Monster, attack: MonsterAttack, data: DataLoader): number
calculateMonsterSaveDC(monster: Monster, ability: AbilityName, data: DataLoader): number
calculateMonsterAC(monster: Monster): number
calculateMonsterHP(monster: Monster): number
```

**Proficiency Bonus by CR** (D&D 5e rule):
- CR 0-4: +2
- CR 5-8: +3
- CR 9-12: +4
- CR 13-16: +5
- CR 17-20: +6
- CR 21-24: +7
- CR 25-28: +8
- CR 29-30: +9

**Acceptance Criteria**:
- [ ] `getMonsterProficiencyBonus()` returns correct value based on CR
- [ ] `calculateMonsterAttackBonus()` shares logic with `engine/attack-calculator.ts`
- [ ] `calculateMonsterSaveDC()` calculates DC correctly
- [ ] All calculations are pure functions (no side effects)

---

### R28.4 — DataLoader Integration

**Description**: Add monster methods to `DataLoader` interface and implement in `default-loader.ts`.

**Interface Changes** (in `src/data/loader.ts`):
```typescript
export interface DataLoader {
  // ... existing methods
  getMonster(id: string): Monster | undefined;
  getAllMonsters(): Monster[];
}
```

**Implementation** (in `src/data/default-loader.ts`):
- Load `static/srd/monsters.json`
- Implement `getMonster()` and `getAllMonsters()`
- Update `browser-loader.ts` if needed

**Acceptance Criteria**:
- [ ] `DataLoader` interface updated with monster methods
- [ ] `default-loader.ts` loads `monsters.json`
- [ ] `browser-loader.ts` bundles monster data (if needed)

---

### R28.5 — SRD Monster Data

**Description**: Import SRD 5.2 monster data into `static/srd/monsters.json`.

**Data Source**: SRD 5.2 (~300 monsters)

**Import Script**: Create `scripts/import_srd_monsters.py` (similar to `scripts/import_srd_spells.py`)

**Data Format**: Structured JSON (not parsed text):
```json
{
  "id": "goblin",
  "name": "Goblin",
  "size": "Small",
  "type": "Humanoid",
  "alignment": "neutral evil",
  "armorClass": [{ "value": 15, "type": "hide armor" }],
  "hitPoints": { "value": 7, "formula": "2d6+2" },
  "abilityScores": { "Strength": 8, ... },
  "challengeRating": { "rating": "1/4", "xp": 50 },
  "actions": [
    {
      "name": "Scimitar",
      "attacks": [
        {
          "name": "Scimitar",
          "attackBonus": 4,
          "damageEntries": [{ "dice": "1d6", "type": "Slashing", "bonus": 2 }],
          "damage": "1d6+2",
          "damageType": "Slashing"
        }
      ]
    }
  ]
}
```

**Acceptance Criteria**:
- [ ] `static/srd/monsters.json` populated with SRD monsters
- [ ] All monsters have structured attack data (not parsed text)
- [ ] Data validated against Zod schema
- [ ] Import script created and tested

---

## 3. Data Model Changes

### 3.1 New Types (in `src/types/monster.ts`)

```typescript
export type MonsterSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

export type MonsterType = 
  | 'Aberration' | 'Beast' | 'Celestial' | 'Construct' | 'Dragon'
  | 'Elemental' | 'Fey' | 'Fiend' | 'Giant' | 'Humanoid'
  | 'Monstrosity' | 'Ooze' | 'Plant' | 'Undead';

export type ChallengeRating = number | '1/8' | '1/4' | '1/2';
```

### 3.2 Monster Interface (in `src/monsters/types.ts`)

```typescript
export interface Monster {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly size: MonsterSize;
  readonly type: MonsterType;
  readonly alignment: string;
  readonly armorClass: ArmorClassEntry[];
  readonly hitPoints: HPInfo;
  readonly speed: SpeedInfo;
  readonly abilityScores: AbilityScores; // Shared with Character
  readonly challengeRating: ChallengeRatingInfo;
  readonly traits?: MonsterFeature[];
  readonly actions?: MonsterAction[];
  readonly reactions?: MonsterReaction[];
  readonly legendaryActions?: MonsterLegendaryAction[];
  readonly environments?: readonly string[];
}

export interface MonsterAttack extends Attack {
  // Inherited: name, attackBonus, damage, damageType, mastery
  readonly reach?: number;
  readonly range?: { normal: number; long?: number };
  readonly damageEntries: readonly MonsterDamageEntry[];
}

export interface MonsterDamageEntry {
  readonly dice: string;
  readonly type: DamageType;
  readonly bonus?: number;
}
```

### 3.3 Updated DataLoader Interface

```typescript
// src/data/loader.ts
export interface DataLoader {
  // ... existing methods
  getMonster(id: string): Monster | undefined;
  getAllMonsters(): Monster[];
}
```

---

## 4. Implementation Plan

### Phase 1: Data Model (1 hour)
1. [ ] Create `src/types/monster.ts` with `MonsterSize`, `MonsterType`, `ChallengeRating`
2. [ ] Create `src/monsters/types.ts` with `Monster`, `MonsterAttack`, etc.
3. [ ] Update `src/types/index.ts` to export monster types
4. [ ] Create `src/schemas/monster.ts` with Zod schema

### Phase 2: DataLoader Integration (1 hour)
1. [ ] Add `getMonster()` and `getAllMonsters()` to `DataLoader` interface
2. [ ] Update `default-loader.ts` to load `monsters.json`
3. [ ] Update `browser-loader.ts` if needed

### Phase 3: Query Functions (2 hours)
1. [ ] Create `src/monsters/query.ts`
2. [ ] Implement `getMonster()`, `searchMonsters()`, etc.
3. [ ] Add filtering by name, size, type, CR, environment

### Phase 4: Calculator Functions (2 hours)
1. [ ] Create `src/monsters/calculator.ts`
2. [ ] Implement `getMonsterProficiencyBonus()` (CR-based)
3. [ ] Implement `calculateMonsterAttackBonus()` (shares logic with `attack-calculator.ts`)
4. [ ] Implement `calculateMonsterSaveDC()`

### Phase 5: Monster Data (3-4 hours)
1. [ ] Create `scripts/import_srd_monsters.py`
2. [ ] Import from dnd-data repo or SRD 5.2
3. [ ] Validate data against schema
4. [ ] Add to `static/srd/monsters.json`

### Phase 6: Tests (2-3 hours)
1. [ ] Create `tests/monsters/query.test.ts`
2. [ ] Create `tests/monsters/calculator.test.ts`
3. [ ] Test all query and calculation functions
4. [ ] Test edge cases (fractional CR, etc.)

### Phase 7: Documentation (1 hour)
1. [ ] Update `PRD.md` to mark R28 as in progress/complete
2. [ ] Update `spec/high-level-design.md` with monster module
3. [ ] Update `agent.md` with monster module conventions

---

## 5. Edge Cases

1. **Fractional CR**: Monsters can have CR "1/8", "1/4", "1/2" — need special handling for filtering
2. **Multiple Armor Class entries**: Some monsters have conditional AC (e.g., "13 (natural armor), 15 (while not incapacitated)")
3. **Legendary Actions**: Cost can be 1, 2, or 3 actions — need to handle cost field
4. **Innate Spellcasting**: Some monsters cast spells without using Charisma/Wisdom/Intelligence
5. **Environment filtering**: Monsters can have multiple environments (e.g., "forest" and "hill")
6. **Missing data**: Some monsters missing speed, senses, etc. — need defaults

---

## 6. References

- **SRD 5.2**: https://www.dndbeyond.com/srd
- **dnd-data repo**: https://github.com/nick-aschenbach/dnd-data (for import)
- **PRD Section 1.3**: Spell Management (follows same pattern)
- **HLD Section 4**: Module Architecture
- **Existing `spells/` module**: Pattern to follow

---

## 7. Open Questions

1. **Should `Monster` have `CombatStats` like `Character`?**
   - Option A: Yes, for consistency
   - Option B: No, monsters don't need derived stats cached
   - **Decision**: No, calculate on demand (monsters don't change state)

2. **Should monster attacks use `mastery` field (from `Attack`)?**
   - Option A: Yes, for compatibility
   - Option B: No, monsters don't have Weapon Mastery
   - **Decision**: Keep for compatibility, but always empty array

3. **How to handle monster spellcasting?**
   - Option A: Reuse `CharacterSpells` interface
   - Option B: Create separate `MonsterSpellcasting` interface
   - **Decision**: Create separate interface (monsters cast differently)

---

*Last updated: 2026-05-09*
