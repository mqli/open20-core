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
- `ChallengeRating` (`number` | `'1/8'` | `'1/4'` | `'1/2'`)

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
```typescript
interface MonsterFilter {
  name?: string;
  size?: MonsterSize[];
  type?: MonsterType[];
  minCR?: ChallengeRating;
  maxCR?: ChallengeRating;
  environment?: string[];
  source?: string[];
  damageResistances?: DamageType[];    // Filter by damage resistances
  damageImmunities?: DamageType[];     // Filter by damage immunities
  damageVulnerabilities?: DamageType[]; // Filter by damage vulnerabilities
  conditionImmunities?: string[];      // Filter by condition immunities
}
```

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

**Acceptance Criteria**:
- [x] `initializeMonsterForCombat()` sets current HP to max
- [x] `modifyMonsterHP()` applies damage/healing correctly
- [x] `applyMonsterTypedDamage()` applies resistance/immunity/vulnerability
- [x] `setMonsterTemporaryHP()` sets temp HP (with max rule)
- [x] `isMonsterDefeated()` returns true when HP <= 0
- [x] All functions are pure (return new Monster object)
- [x] Tests created and passing (20 tests)

---

## 3. Future Enhancements

### R28.14 — Encounter Builder Utilities (Planned)

**Description**: Provide utilities for building encounters and calculating encounter difficulty.

**Functions** (planned):
```typescript
// Encounter difficulty calculation
calculateEncounterXP(monsters: Monster[]): number
calculateAdjustedXP(monsters: Monster[]): number
getEncounterDifficulty(partyLevel: number, partySize: number, monsters: Monster[]): 'Easy' | 'Medium' | 'Hard' | 'Deadly' | 'Deadly (Extreme)'
getRecommendedMonsterCount(partyLevel: number, partySize: number, monsterCR: ChallengeRating): number
```

**Acceptance Criteria**:
- [ ] `calculateEncounterXP()` returns total XP for monsters
- [ ] `calculateAdjustedXP()` applies multiple monster multiplier
- [ ] `getEncounterDifficulty()` returns difficulty rating
- [ ] `getRecommendedMonsterCount()` returns recommended count for balance

---

## 4. References

- PRD §4.5 Monster Management
- 2024 DMG p.80-85 Encounter Building
- SRD 5.2 Monster List
- D&D 5e Monster Manual (2014/2024)
