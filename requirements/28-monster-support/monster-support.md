# Monster Support System

**Requirement ID**: R28
**Priority**: P2
**Status**: 🔶 In Progress
**Created**: 2026-05-09
**Updated**: 2026-05-10

---

## Current Status Summary

Based on comparison with SRD 5.2 Monsters document:

| Component | Status | Notes |
|-----------|--------|-------|
| Data Model | ✅ Complete | All SRD 5.2 fields added (R28.7) |
| Query Functions | ✅ Complete | All basic queries implemented |
| Calculator Functions | ✅ Complete | Proficiency, attack bonus, save DC |
| Combat Functions | ✅ Complete | HP management, damage defenses |
| DataLoader Integration | ✅ Complete | Loader interface updated |
| Attack Notation | ✅ Complete | Hit, Miss, Hit or Miss notations (R28.8) |
| Saving Throw Notation | ✅ Complete | For effects forcing saves (R28.9) |
| Damage Notation | ✅ Complete | Fixed value vs die expression (R28.10) |
| Spellcasting Details | ✅ Complete | Components, at-will, daily (R28.11) |
| Limited Usage | ✅ Complete | X/Day, Recharge mechanics (R28.12) |
| SRD Data Import | 🔶 Partial | 4 sample monsters, need ~300 more |
| Zod Schema | ❌ Missing | Validation not implemented (R28.13) |

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
- [x] `src/types/monster.ts` created with `MonsterSize`, `MonsterType`, `ChallengeRating`
- [x] `src/monsters/types.ts` created with `Monster`, `MonsterAttack`, etc.
- [x] `MonsterAttack` extends `BaseAttack` interface (refactored from `Attack`)
- [x] All types exported via `src/types/index.ts`

---

### R28.2 — Monster Query Functions

**Description**: Provide query functions to search/filter monsters by various criteria.

**Functions** (in `src/monsters/query.ts`):
```typescript
// Basic queries
getMonster(id: string, data: DataLoader): Monster | undefined
searchMonsters(filter: MonsterFilter, data: DataLoader): Monster[]
getMonstersByCR(minCR: ChallengeRating, maxCR: ChallengeRating, data: DataLoader): Monster[]
getMonstersByType(type: MonsterType, data: DataLoader): Monster[]
getMonstersForParty(partyLevel: number, partySize: number, data: DataLoader): Monster[]

// Action/Trait/Reaction queries
getMonsterActions(monsterId: string, data: DataLoader): readonly MonsterAction[]
getMonsterTraits(monsterId: string, data: DataLoader): readonly MonsterFeature[]
getMonsterReactions(monsterId: string, data: DataLoader): readonly MonsterReaction[]
getMonsterLegendaryActions(monsterId: string, data: DataLoader): readonly MonsterLegendaryAction[]
getMonstersWithTrait(traitName: string, data: DataLoader): Monster[]
getLegendaryMonsters(data: DataLoader): Monster[]
getMonsterAllAttacks(monsterId: string, data: DataLoader): MonsterAction[]
searchActionsByName(actionName: string, data: DataLoader): Array<{ monsterId, monsterName, action }>
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
- [x] `getMonster()` returns monster by ID
- [x] `searchMonsters()` supports all filter criteria
- [x] `getMonstersByCR()` returns monsters within CR range
- [x] `getMonstersByType()` returns monsters of given type
- [x] `getMonsterActions()` returns actions for a monster
- [x] `getMonsterTraits()` returns traits for a monster
- [x] `getMonsterReactions()` returns reactions for a monster
- [x] `getMonsterLegendaryActions()` returns legendary actions
- [x] `getMonstersWithTrait()` finds monsters by trait name
- [x] `getLegendaryMonsters()` returns only legendary monsters
- [x] `getMonsterAllAttacks()` returns actions with attacks
- [x] `searchActionsByName()` searches actions across all monsters
- [x] All functions pass `DataLoader` as parameter
- [x] Tests created and passing (30 tests)

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
- [x] `getMonsterProficiencyBonus()` returns correct value based on CR
- [x] `calculateMonsterAttackBonus()` handles explicit attack bonus
- [x] `calculateMonsterSaveDC()` calculates DC correctly
- [x] All calculations are pure functions (no side effects)
- [x] Tests created and passing (14 tests)

---

### R28.6 — Monster Combat Functions (NEW)

**Description**: Enable monsters to deal damage and take damage in combat. Handles HP management, damage defenses (resistances/immunities/vulnerabilities), and attack damage calculation.

**Design Decision**: Share HP manipulation logic with Character module via `engine/combat.ts` helpers.

**Shared Helpers** (in `src/engine/combat.ts`):
```typescript
// Shared HP manipulation (used by both Character and Monster)
applyHPChange(currentHP: number, maxHP: number, temporaryHP: number, delta: number): { currentHP: number; temporaryHP: number }
applyTypedDamageToHP(currentHP: number, maxHP: number, temporaryHP: number, damage: number, damageType: DamageType, defenses: DamageDefenses): { currentHP: number; temporaryHP: number; result: DamageResult }
setTemporaryHPShared(currentTempHP: number, value: number): number
isDefeatedShared(currentHP: number): boolean

// HP Accessor Helpers (for API consistency)
getCharacterCurrentHP(char): number
getCharacterMaxHP(char): number
getCharacterTemporaryHP(char): number
getMonsterCurrentHP(monster): number
getMonsterMaxHP(monster): number
getMonsterTemporaryHP(monster): number

// Damage Defense Helpers (shared)
addDamageResistance(defenses, damageType): DamageDefenses
addDamageImmunity(defenses, damageType): DamageDefenses
addDamageVulnerability(defenses, damageType): DamageDefenses
emptyDefenses(): DamageDefenses
mergeDefenses(a, b): DamageDefenses
```

**Monster Combat Functions** (in `src/monster/combat.ts`):
```typescript
// HP Management (uses shared helpers)
initializeMonsterForCombat(monster: Monster): Monster
modifyMonsterHP(monster: Monster, delta: number, damageType?: DamageType): Monster
applyMonsterTypedDamage(monster: Monster, damage: number, damageType: DamageType): { monster: Monster; result: DamageResult }
setMonsterTemporaryHP(monster: Monster, value: number): Monster
isMonsterDefeated(monster: Monster): boolean

// Attack Helpers
rollMonsterAttack(attack: MonsterAttack, monster: Monster, data: DataLoader): { d20: number; total: number; critical: boolean }
rollMonsterAttackDamage(attack: MonsterAttack): number
getMonsterAC(monster: Monster): number

// Damage Defenses (uses shared helpers)
addMonsterDamageResistance(monster: Monster, damageType: DamageType): Monster
addMonsterDamageImmunity(monster: Monster, damageType: DamageType): Monster
addMonsterDamageVulnerability(monster: Monster, damageType: DamageType): Monster
```

**Monster Type Updates**:
- Added `damageDefenses?: DamageDefenses` (resistances, immunities, vulnerabilities)
- Added `conditionImmunities?: readonly string[]`
- Added `currentHP?: number` (for combat state)
- Added `temporaryHP?: number` (for combat state)

**Acceptance Criteria**:
- [x] `initializeMonsterForCombat()` sets currentHP to max HP
- [x] `modifyMonsterHP()` applies damage/healing with temporary HP support
- [x] `applyMonsterTypedDamage()` applies damage defenses correctly
- [x] `isMonsterDefeated()` returns true when HP <= 0
- [x] `rollMonsterAttackDamage()` calculates damage from attack
- [x] Damage defenses (resistance/immunity/vulnerability) work correctly
- [x] Tests created and passing (29 tests)

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
- [x] `DataLoader` interface updated with monster methods
- [x] `default-loader.ts` loads `monsters.json`
- [x] `browser-loader.ts` bundles monster data
- [x] `ContentPack` type updated to include `monsters?: Monster[]`

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
```

**Acceptance Criteria**:
- [x] `static/srd/monsters.json` populated with sample monsters (4 including legendary)
- [x] All monsters have structured attack data (not parsed text)
- [x] Sample data includes traits, actions, reactions, and legendary actions
- [ ] Import script created and tested (for full SRD import)
- [ ] Full SRD monster data imported (~300 monsters)
```

**Sample Data Includes**:
- `goblin` - Has traits and actions with attacks
- `orc` - Has traits and actions
- `wolf` - Has multiple traits and actions
- `young-red-dragon` - Has traits, actions, reactions, and legendary actions
**Acceptance Criteria**:
- [ ] `static/srd/monsters.json` populated with SRD monsters
- [ ] All monsters have structured attack data (not parsed text)
- [ ] Data validated against Zod schema
- [ ] Import script created and tested

---

### R28.7 — Missing Monster Fields (NEW)

**Description**: Add missing SRD 5.2 fields to the Monster type definition.

**Missing Fields** (from SRD 5.2 Monsters document):
1. **Initiative**: `initiativeModifier` and `initiativeScore` (e.g., "+4 (14)")
2. **Bonus Actions**: Separate from Actions
3. **Descriptive Tags**: Tags in parentheses after creature type (e.g., "Dragon (Chromatic)")
4. **Gear**: Equipment entry
5. **Resistances and Vulnerabilities**: Separate entries (currently in `damageDefenses`, but SRD lists them separately)
6. **Skills**: Skill bonuses (e.g., "Perception +13, Stealth +6")
7. **Senses**: Senses including Passive Perception (e.g., "blindsight 60 ft., darkvision 120 ft.; Passive Perception 23")
8. **Languages**: Spoken languages (e.g., "Common, Draconic")
9. **Saving Throws**: Override ability save bonuses (e.g., DEX save +6 when mod is +0)
10. **Lair XP**: CR with lair XP (e.g., "CR 17 (XP 18,000, or 20,000 in lair)")

**Updated Monster Interface**:
```typescript
export interface Monster {
  // ... existing fields ...
  readonly initiative?: {
    modifier: number;
    score?: number;
  };
  readonly bonusActions?: MonsterAction[];
  readonly descriptiveTags?: string[];
  readonly gear?: string[];
  readonly resistances?: DamageType[];
  readonly vulnerabilities?: DamageType[];
  readonly skills?: Record<string, number>;  // Skill name -> bonus
  readonly senses?: {
    darkvision?: number;
    blindsight?: number;
    tremorsense?: number;
    truesight?: number;
    passivePerception: number;
  };
  readonly languages?: string[];
  readonly savingThrows?: Record<string, number>;  // Ability name -> save bonus
  readonly challengeRating?: {
    rating: ChallengeRating;
    xp: number;
    lairXp?: number;
  };
}
```

**Acceptance Criteria**:
- [x] Add `initiative` field to `Monster` interface
- [x] Add `bonusActions` field to `Monster` interface
- [x] Add `descriptiveTags` field to `Monster` interface
- [x] Add `gear` field to `Monster` interface
- [x] Add `resistances` and `vulnerabilities` fields to `Monster` interface
- [x] Add `skills` field to `Monster` interface
- [x] Add `senses` field to `Monster` interface
- [x] Add `languages` field to `Monster` interface
- [x] Add `savingThrows` field to `Monster` interface
- [x] Update `challengeRating` to support lair XP
- [x] Update sample data to include these fields
- [x] Tests created and passing (18 tests in `tests/monster/r28-7-fields.test.ts`)

---

### R28.8 — Attack Notation (NEW)

**Description**: Implement Attack Notation parsing (Hit, Miss, Hit or Miss) from SRD 5.2.

**Notation Types**:
1. **Hit**: Effects on successful attack
2. **Miss**: Effects on failed attack
3. **Hit or Miss**: Effects regardless of attack outcome

**Updated Action Structure**:
```typescript
export interface MonsterAction {
  // ... existing fields ...
  attackNotation?: {
    hit?: string;
    miss?: string;
    hitOrMiss?: string;
  };
}
```

**Acceptance Criteria**:
- [x] Add `attackNotation` field to `MonsterAction` interface
- [x] Implement parsing for Hit notation
- [x] Implement parsing for Miss notation
- [x] Implement parsing for Hit or Miss notation
- [x] Update sample data with attack notation
- [x] Tests created and passing (9 tests in `tests/monster/r28-8-attack-notation.test.ts`)

---

### R28.9 — Saving Throw Effect Notation (NEW)

**Description**: Implement Saving Throw Effect Notation for effects that force saves.

**Notation**: Identifies save type, DC, creatures affected, and effects on success/failure.

**New Interface**:
```typescript
export interface SavingThrowEffect {
  saveType: AbilityName;
  dc: number;
  description: string;
  onSaveSuccess?: string;
  onSaveFailure: string;
  halfDamageOnSuccess?: boolean;
}
```

**Acceptance Criteria**:
- [x] Create `SavingThrowEffect` interface
- [x] Add to `MonsterAction` interface
- [x] Implement parsing for saving throw effects
- [x] Update sample data with saving throw effects
- [x] Tests created and passing (8 tests in `tests/monster/r28-9-saving-throw-notation.test.ts`)

---

### R28.10 — Damage Notation (NEW)

**Description**: Implement Damage Notation (number vs die expression) from SRD 5.2.

**Notation**: Both a number and a die expression are provided (e.g., "4 (1d4 + 2)").

**Updated Attack Structure**:
```typescript
export interface MonsterAttack {
  // ... existing fields ...
  damageNotation?: {
    fixedValue?: number;
    dieExpression?: string;
  };
}
```

**Acceptance Criteria**:
- [x] Add `damageNotation` field to `MonsterAttack` interface
- [x] Implement parsing for damage notation
- [x] Update sample data with damage notation
- [x] Tests created and passing (9 tests in `tests/monster/r28-10-damage-notation.test.ts`)

---

### R28.11 — Spellcasting Details (NEW)

**Description**: Implement detailed Spellcasting rules from SRD 5.2.

**Details**:
1. **Spell Components**: Whether components are ignored
2. **Casting Times of 1+ Minutes**: Special handling
3. **Self Only Restrictions**: Some spells have restrictions

**Updated Spellcasting Interface**:
```typescript
export interface MonsterSpellcasting {
  // ... existing fields ...
  ignoresComponents?: ('V' | 'S' | 'M')[];
  castingTime?: string;
  restrictions?: string[];
}
```

**Acceptance Criteria**:
- [x] Add `ignoresComponents` field to `MonsterSpellcasting` interface
- [x] Add `atWill` field to `MonsterSpellcasting` interface
- [x] Add `daily` field to `MonsterSpellcasting` interface
- [x] Add `spellcasting` field to `Monster` interface
- [x] Implement handling for spell components
- [x] Update sample data with spellcasting details
- [x] Tests created and passing (10 tests in `tests/monster/r28-11-spellcasting-details.test.ts`)

---

### R28.12 — Limited Usage (NEW)

**Description**: Implement Limited Usage notation from SRD 5.2.

**Usage Types**:
1. **X/Day**: Use X times, recharge on Long Rest
2. **Recharge X–Y**: Recharge on d6 roll of X-Y
3. **Recharge after Short or Long Rest**: Recharge on rest

**Updated Action Interface**:
```typescript
export interface MonsterAction {
  // ... existing fields ...
  limitedUsage?: {
    type: 'x_per_day' | 'recharge' | 'recharge_after_rest';
    uses?: number;  // for x_per_day
    rechargeRange?: [number, number];  // for recharge
    rechargeOn?: 'short_rest' | 'long_rest';  // for recharge_after_rest
  };
}
```

**Acceptance Criteria**:
- [x] Add `limitedUsage` field to `MonsterAction` interface
- [x] Implement X/Day usage tracking
- [x] Implement Recharge X-Y mechanics
- [x] Implement Recharge after Rest mechanics
- [x] Update sample data with limited usage
- [x] Tests created and passing (11 tests in `tests/monster/r28-12-limited-usage.test.ts`)

---

### R28.13 — Zod Schema Validation (NEW)

**Description**: Create Zod schema for monster data validation.

**Schema File**: `src/schemas/monster.ts`

**Acceptance Criteria**:
- [ ] Create `src/schemas/monster.ts` with Zod schemas
- [ ] Validate all monster data against schema
- [ ] Add schema validation to import script
- [ ] Export schemas via `src/schemas/index.ts`
- [ ] Tests created and passing

---

### R28.14 — Full SRD Data Import (NEW)

**Description**: Create import script and import full SRD 5.2 monster data.

**Import Script**: `scripts/import_srd_monsters.py`

**Acceptance Criteria**:
- [ ] Create `scripts/import_srd_monsters.py` script
- [ ] Script parses SRD 5.2 format
- [ ] Script validates data against Zod schema
- [ ] Import full SRD monster data (~300 monsters)
- [ ] All imported data passes validation
- [ ] Update `static/srd/monsters.json` with full data
- [ ] Tests updated to cover more monsters

---

## 3. Data Model Changes

### 3.1 New Types (in `src/types/monster.ts`) — Updated for SRD 5.2

```typescript
export type MonsterSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

export type MonsterType = 
  | 'Aberration' | 'Beast' | 'Celestial' | 'Construct' | 'Dragon'
  | 'Elemental' | 'Fey' | 'Fiend' | 'Giant' | 'Humanoid'
  | 'Monstrosity' | 'Ooze' | 'Plant' | 'Undead';

export type ChallengeRating = number | '1/8' | '1/4' | '1/2';

// R28.7 - Missing SRD Fields
export interface InitiativeInfo {
  modifier: number;
  score?: number;
}

export interface SensesInfo {
  darkvision?: number;
  blindsight?: number;
  tremorsense?: number;
  truesight?: number;
  passivePerception: number;
}

export interface ChallengeRatingInfo {
  rating: ChallengeRating;
  xp: number;
  lairXp?: number;
}

export interface SavingThrowEffect {
  saveType: AbilityName;
  dc: number;
  description: string;
  onSaveSuccess?: string;
  onSaveFailure: string;
  halfDamageOnSuccess?: boolean;
}

// R28.8 - Attack Notation
export interface AttackNotation {
  hit?: string;
  miss?: string;
  hitOrMiss?: string;
}

// R28.11 - Spellcasting Details
export interface SpellcastingDetails {
  ignoresComponents?: ('V' | 'S' | 'M')[];
  castingTime?: string;
  restrictions?: string[];
}
```

### 3.2 Monster Interface (in `src/monster/types.ts`) — Updated for SRD 5.2

```typescript
export interface Monster {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly size: MonsterSize;
  readonly type: MonsterType;
  readonly alignment: string;
  readonly descriptiveTags?: string[];  // R28.7 - e.g., "(Chromatic)"
  readonly armorClass: ArmorClassEntry[];
  readonly hitPoints: HPInfo;
  readonly speed: SpeedInfo;
  readonly initiative?: InitiativeInfo;  // R28.7
  readonly abilityScores: AbilityScores;
  readonly savingThrows?: Record<string, number>;  // R28.7 - Override save bonuses
  readonly skills?: Record<string, number>;  // R28.7 - e.g., { "Perception": 13 }
  readonly challengeRating: ChallengeRatingInfo;  // Updated for lair XP
  readonly resistances?: DamageType[];  // R28.7 - Separate from damageDefenses
  readonly vulnerabilities?: DamageType[];  // R28.7 - Separate from damageDefenses
  readonly senses?: SensesInfo;  // R28.7 - Senses and Passive Perception
  readonly languages?: string[];  // R28.7 - Spoken languages
  readonly gear?: string[];  // R28.7 - Equipment
  
  // Existing fields
  readonly traits?: MonsterFeature[];
  readonly actions?: MonsterAction[];
  readonly bonusActions?: MonsterAction[];  // R28.7 - Separate from actions
  readonly reactions?: MonsterReaction[];
  readonly legendaryActions?: MonsterLegendaryAction[];
  readonly environments?: readonly string[];
  readonly damageDefenses?: DamageDefenses;
  readonly conditionImmunities?: readonly string[];
  readonly currentHP?: number;
  readonly temporaryHP?: number;
}

export interface MonsterAction {
  readonly name: string;
  readonly description?: string;
  readonly attacks?: MonsterAttack[];
  
  // R28.8 - Attack Notation
  readonly attackNotation?: AttackNotation;
  
  // R28.9 - Saving Throw Effect
  readonly savingThrowEffect?: SavingThrowEffect;
  
  // R28.12 - Limited Usage
  readonly limitedUsage?: {
    type: 'x_per_day' | 'recharge' | 'recharge_after_rest';
    uses?: number;
    rechargeRange?: [number, number];
    rechargeOn?: 'short_rest' | 'long_rest';
  };
  
  readonly legendary?: boolean;
}

export interface MonsterAttack {
  // ... existing fields ...
  readonly name: string;
  readonly attackBonus?: number;
  readonly reach?: number;
  readonly range?: { normal: number; long?: number };
  readonly damageEntries: readonly MonsterDamageEntry[];
  
  // R28.10 - Damage Notation
  readonly damageNotation?: {
    fixedValue?: number;
    dieExpression?: string;
  };
}
```

### 3.3 DataLoader Interface

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

### Phase 1: Data Model (1 hour) ✅
1. [x] Create `src/types/monster.ts` with `MonsterSize`, `MonsterType`, `ChallengeRating`
2. [x] Create `src/monsters/types.ts` with `Monster`, `MonsterAttack`, etc.
3. [x] Update `src/types/index.ts` to export monster types
4. [ ] Create `src/schemas/monster.ts` with Zod schema

### Phase 2: DataLoader Integration (1 hour) ✅
1. [x] Add `getMonster()` and `getAllMonsters()` to `DataLoader` interface
2. [x] Update `default-loader.ts` to load `monsters.json`
3. [x] Update `browser-loader.ts` if needed

### Phase 3: Query Functions (2 hours) ✅
1. [x] Create `src/monsters/query.ts`
2. [x] Implement `getMonster()`, `searchMonsters()`, etc.
3. [x] Add filtering by name, size, type, CR, environment
4. [x] Add `getMonsterActions()`, `getMonsterTraits()`, `getMonsterReactions()`, `getMonsterLegendaryActions()`
5. [x] Add `getMonstersWithTrait()`, `getLegendaryMonsters()`, `getMonsterAllAttacks()`, `searchActionsByName()`
6. [x] Tests created and passing (30 tests)

### Phase 4: Calculator Functions (2 hours) ✅
1. [x] Create `src/monsters/calculator.ts`
2. [x] Implement `getMonsterProficiencyBonus()` (CR-based)
3. [x] Implement `calculateMonsterAttackBonus()`
4. [x] Implement `calculateMonsterSaveDC()`
5. [x] Tests created and passing (14 tests)

### Phase 5: Monster Data (3-4 hours) 📋
1. [ ] Create `scripts/import_srd_monsters.py` (R28.14)
2. [ ] Import from dnd-data repo or SRD 5.2 (R28.14)
3. [ ] Validate data against schema (R28.13)
4. [x] Add sample data to `static/srd/monsters.json` (4 monsters)

### Phase 6: Tests (2-3 hours) ✅
1. [x] Create `tests/monster/query.test.ts` (30 tests)
2. [x] Create `tests/monster/calculator.test.ts` (14 tests)
3. [x] Create `tests/monster/combat.test.ts` (29 tests)
4. [x] Test all query, calculation, and combat functions
5. [x] Test edge cases (fractional CR, damage defenses, etc.)

### Phase 7: Documentation (1 hour) ✅
1. [x] Update `PRD.md` to mark R28 as in progress/complete
2. [ ] Update `spec/high-level-design.md` with monster module
3. [x] Update `agent.md` with monster module conventions

### Phase 8: Combat Support & API Consolidation (2 hours) ✅
1. [x] Add `damageDefenses` and `conditionImmunities` to Monster type
2. [x] Create `src/monster/combat.ts` with HP management functions
3. [x] Implement `initializeMonsterForCombat()`, `modifyMonsterHP()`, `applyMonsterTypedDamage()`
4. [x] Implement `addMonsterDamageResistance/Immunity/Vulnerability()`
5. [x] Add `rollMonsterAttack()` and `rollMonsterAttackDamage()`
6. [x] Create `tests/monster/combat.test.ts` (29 tests)
7. [x] Update sample data with damage defenses (Young Red Dragon)
8. [x] Create `src/engine/combat.ts` with shared HP helpers
9. [x] Refactor `character/mutate.ts` and `monster/combat.ts` to use shared helpers
10. [x] Add HP accessor helpers for API consistency
11. [x] Rename `src/monsters/` to `src/monster/` (consistent with `src/character/`)
12. [x] Update all imports across codebase
13. [x] Add tests for shared combat helpers (31 tests)

### Phase 9: Missing Monster Fields (3-4 hours) ✅ (R28.7)
1. [x] Add `initiative` field to `Monster` interface
2. [x] Add `bonusActions` field to `Monster` interface
3. [x] Add `descriptiveTags` field to `Monster` interface
4. [x] Add `gear` field to `Monster` interface
5. [x] Add `resistances` and `vulnerabilities` fields to `Monster` interface
6. [x] Add `skills` field to `Monster` interface
7. [x] Add `senses` field to `Monster` interface
8. [x] Add `languages` field to `Monster` interface
9. [x] Add `savingThrows` field to `Monster` interface
10. [x] Update `challengeRating` to support lair XP
11. [x] Update sample data to include these fields
12. [x] Tests created and passing (18 tests in `tests/monster/r28-7-fields.test.ts`)

### Phase 10: Attack Notation (2-3 hours) ✅ (R28.8)
1. [x] Add `attackNotation` field to `MonsterAction` interface
2. [x] Implement parsing for Hit notation
3. [x] Implement parsing for Miss notation
4. [x] Implement parsing for Hit or Miss notation
5. [x] Update sample data with attack notation
6. [x] Tests created and passing (9 tests in `tests/monster/r28-8-attack-notation.test.ts`)

### Phase 11: Saving Throw Effect Notation (2-3 hours) ✅ (R28.9)
1. [x] Create `SavingThrowEffect` interface
2. [x] Add to `MonsterAction` interface
3. [x] Implement parsing for saving throw effects
4. [x] Update sample data with saving throw effects
5. [x] Tests created and passing (8 tests in `tests/monster/r28-9-saving-throw-notation.test.ts`)

### Phase 12: Damage Notation (2-3 hours) ✅ (R28.10)
1. [x] Add `damageNotation` field to `MonsterAttack` interface
2. [x] Implement parsing for damage notation
3. [x] Update sample data with damage notation
4. [x] Tests created and passing (9 tests in `tests/monster/r28-10-damage-notation.test.ts`)

### Phase 13: Spellcasting Details (2-3 hours) ✅ (R28.11)
1. [x] Add `ignoresComponents` field to `MonsterSpellcasting` interface
2. [x] Add `atWill` field to `MonsterSpellcasting` interface
3. [x] Add `daily` field to `MonsterSpellcasting` interface
4. [x] Add `spellcasting` field to `Monster` interface
5. [x] Implement handling for spell components
6. [x] Update sample data with spellcasting details
7. [x] Tests created and passing (10 tests in `tests/monster/r28-11-spellcasting-details.test.ts`)

### Phase 14: Limited Usage (2-3 hours) ✅ (R28.12)
1. [x] Add `limitedUsage` field to `MonsterAction` interface
2. [x] Implement X/Day usage tracking
3. [x] Implement Recharge X-Y mechanics
4. [x] Implement Recharge after Rest mechanics
5. [x] Update sample data with limited usage
6. [x] Tests created and passing (11 tests in `tests/monster/r28-12-limited-usage.test.ts`)

### Phase 15: Zod Schema Validation (2-3 hours) 📋 (R28.13)
1. [ ] Create `src/schemas/monster.ts` with Zod schemas
2. [ ] Validate all monster data against schema
3. [ ] Add schema validation to import script
4. [ ] Export schemas via `src/schemas/index.ts`
5. [ ] Tests created and passing

### Phase 16: Full SRD Data Import (4-5 hours) 📋 (R28.14)
1. [ ] Create `scripts/import_srd_monsters.py` script
2. [ ] Script parses SRD 5.2 format
3. [ ] Script validates data against Zod schema
4. [ ] Import full SRD monster data (~300 monsters)
5. [ ] All imported data passes validation
6. [ ] Update `static/srd/monsters.json` with full data
7. [ ] Tests updated to cover more monsters

---

## 5. Edge Cases

### Existing Edge Cases
1. **Fractional CR**: Monsters can have CR "1/8", "1/4", "1/2" — need special handling for filtering
2. **Multiple Armor Class entries**: Some monsters have conditional AC (e.g., "13 (natural armor), 15 (while not incapacitated)")
3. **Legendary Actions**: Cost can be 1, 2, or 3 actions — need to handle cost field
4. **Innate Spellcasting**: Some monsters cast spells without using Charisma/Wisdom/Intelligence
5. **Environment filtering**: Monsters can have multiple environments (e.g., "forest" and "hill")
6. **Missing data**: Some monsters missing speed, senses, etc. — need defaults

### New Edge Cases (from SRD 5.2)
7. **Initiative**: Some monsters have additional modifiers (e.g., Proficiency Bonus) applied to Initiative
8. **Bonus Actions**: Monsters may have Bonus Actions that need to be used optimally in combat
9. **Descriptive Tags**: Tags in parentheses after creature type (e.g., "Dragon (Chromatic)") — need to handle for filtering
10. **Gear**: Monsters may have retrievable equipment — need to handle loot generation
11. **Attack Notation**: Some attacks have effects on miss or regardless of hit/miss
12. **Saving Throw Effects**: Some effects force saving throws with different outcomes for success/failure
13. **Damage Notation**: Both fixed value and die expression provided — need to handle both
14. **Limited Usage**: Recharge mechanics need d6 roll simulation
15. **Saving Throws Override**: Monster save bonuses can differ from ability modifiers (e.g., DEX mod +0, save +6)
16. **Skills**: Monsters may have skill bonuses that differ from ability modifiers
17. **Senses**: Multiple senses with different ranges (darkvision, blindsight, etc.)
18. **Lair XP**: Challenge rating may have different XP when in lair
19. **Multiattack Replacement**: Multiattack may allow replacing one attack with another action (e.g., "replace one attack with a use of Spellcasting")
20. **Spellcasting at Will vs Limited**: Spells can be "At Will" or "X/Day Each"

---

## 6. References

- **SRD 5.2 Monsters**: `requirements/28-monster-support/srd-5.2-monsters.md` (correct version)
- **SRD 5.2**: https://www.dndbeyond.com/srd
- **dnd-data repo**: https://github.com/nick-aschenbach/dnd-data (for import)
- **PRD Section 1.3**: Spell Management (follows same pattern)
- **HLD Section 4**: Module Architecture
- **Existing `spells/` module**: Pattern to follow

---

## 7. Open Questions

### Existing Questions
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

### New Questions (from SRD 5.2 update)
4. **Should `initiative` be calculated or stored?**
   - Option A: Store both modifier and score (as SRD provides)
   - Option B: Calculate score from modifier (10 + modifier)
   - **Decision**: Store both (SRD provides both)

5. **How to handle Bonus Actions separately from Actions?**
   - Option A: Separate `bonusActions` field
   - Option B: Add `type: 'action' | 'bonus_action'` to `MonsterAction`
   - **Decision**: Separate field (clearer separation)

6. **How to handle Attack Notation (Hit, Miss, Hit or Miss)?**
   - Option A: Add to `MonsterAttack` interface
   - Option B: Add to `MonsterAction` interface
   - **Decision**: Add to `MonsterAction` (notation is per-action, not per-attack)

7. **How to simulate Recharge X-Y mechanics?**
   - Option A: Roll d6 at start of each turn
   - Option B: Let user manually recharge
   - **Decision**: Automatic roll at start of turn (as per SRD)

---

*Last updated: 2026-05-10*
