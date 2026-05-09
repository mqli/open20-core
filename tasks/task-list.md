# Development Task Breakdown

> Aligned with HLD §14 priority. Agents can pick single tasks and update status upon completion.

---

## Task Status Legend

| Marker | Meaning |
|---|---|
| 📋 | Not started |
| 🔄 | In progress |
| ✅ | Completed |
| ❌ | Blocked |

---

## Phase 1 — Engine & Data Layer (S1-S12)

### S1 — Project Scaffolding ✅

| File | Description |
|---|---|
| `package.json` | open20-core, type:module, zod dependency |
| `tsconfig.json` | ES2022, bundler, strict, noUncheckedIndexedAccess |
| `vitest.config.ts` | V8 coverage, path aliases |

### S2 — Type Definitions ✅

| File | Core Types |
|---|---|
| `src/types/ability.ts` | `AbilityName`, `AbilityScores`, `ABILITY_NAMES` |
| `src/types/character.ts` | `Character`, `CharacterClass`, `HitPoints`, `DeathSaves`, `CombatStats` |
| `src/types/spell.ts` | `Spell`, `CharacterSpells`, `SpellSlotEntry` |
| `src/types/equipment.ts` | `Weapon`, `Armor`, `GearItem` |
| `src/types/resource.ts` | `Resource`, `ResetType` |

### S3 — DataLoader Interface + Implementation ✅

| File | Description |
|---|---|
| `src/data/loader.ts` | `DataLoader` interface + `LookupTables` type |
| `src/data/default-loader.ts` | Default implementation (loads from `static/*.json`) |

### S4-S11 — Engine Pure Functions ✅

| Step | File | Core Function | Tests |
|---|---|---|---|
| S4 | `src/engine/ability-modifier.ts` | `getModifier()`, `getTotalScore()` | ✅ 13 |
| S5 | `src/engine/proficiency-bonus.ts` | `getProficiencyBonus()` | ✅ 9 |
| S6 | `src/engine/skill-bonus.ts` | `getSkillBonus()` | ✅ |
| S7 | `src/engine/saving-throw.ts` | `getSavingThrowBonus()` | ✅ |
| S8 | `src/engine/ac-calculator.ts` | `calculateAC()` | ✅ 14 |
| S9 | `src/engine/hp-calculator.ts` | `calculateMaxHP()` | ✅ 14 |
| S10 | `src/engine/spell-slots.ts` | `calculateSpellSlots()` | ✅ |
| S11 | `src/engine/attack-calculator.ts` | `calculateAttacks()` | ✅ |

**Current tests**: 550+ tests passing

### S12 — Static Rule Data ✅

| File | Data Count | Status |
|---|---|---|
| `static/species.json` | 12 species | ✅ Complete |
| `static/backgrounds.json` | 16 backgrounds | ✅ Complete |
| `static/classes.json` | 12 classes | ✅ Complete |
| `static/subclasses.json` | All subclasses | ✅ Complete |
| `static/feats.json` | 75 feats | ✅ Complete |
| `static/spells.json` | 560+ spells | ✅ Imported from SRD |
| `static/weapons.json` | ~40 weapons | ✅ Complete |
| `static/armor.json` | ~20 armors | ✅ Complete |
| `static/gear.json` | ~50 gear items | ✅ Complete |
| `static/lookup-tables.json` | Lookup tables | ✅ Complete |

---

## Phase 2 — Character State Management (S13-S17)

| Step | File | Core Functions | Status |
|---|---|---|---|
| S13 | `src/character/create.ts` | `createCharacter(params)` | ✅ |
| S14 | `src/character/mutate.ts` | `modifyHP()`, `equipItem()`, etc. | ✅ |
| S15 | `src/character/rest.ts` | `shortRest()`, `longRest()` | ✅ |
| S16 | `src/character/level-up.ts` | `levelUp()` | ✅ |
| S17 | `src/character/validate.ts` | `validateCharacter()` | ✅ |

---

## Phase 3 — Spells Module (New in v5.0)

| Step | File | Core Functions | Status |
|---|---|---|---|
| S18 | `src/spells/query.ts` | `getSpell()`, `searchSpells()`, `getSpellsForCharacter()`, etc. | ✅ |
| S19 | `src/spells/filter.ts` | Filter helpers | ❌ Not needed (implemented in query.ts) |
| S20 | `scripts/import_srd_spells.py` | Import from dnd-data | ✅ |

---

## Phase 4 — Persistence & Integration (S21-S23)

| Step | File | Core Functions | Status |
|---|---|---|---|
| S21 | `src/storage/*` | `ICharacterStorage`, `serialize()` | ✅ |
| S22 | `src/schemas/*` | Zod schemas | ✅ |
| S23 | `tests/integration/*` | Integration tests | ✅ |

---

## Supplementary Test Tasks

| File | Coverage Module | Status |
|---|---|---|
| `tests/engine/*.test.ts` | All engine functions | ✅ Complete |
| `tests/character/*.test.ts` | All mutation functions | ✅ Complete |
| `tests/spells/*.test.ts` | Spell queries | ✅ Complete |
| `tests/data/*.test.ts` | Data integrity | ✅ Complete |
| `tests/storage/*.test.ts` | Storage serialization | ✅ Complete |
| `tests/integration/*.test.ts` | Integration tests | ✅ Complete |

---

## Dependency Graph

```
S1 → S2 → S3 → S12
         ↓
    S4 → S6, S7, S8, S9
    S5 → S6, S7, S10
    S4+S5 → S11
    S4-S11+S12 → S13 → S14 → S15, S16
                            S13+S14 → S17
                            S17 → S21 → S22 → S23
```

**Critical path**: S1 → S2 → S4 → S8/S9 → S12 → S13 → S14 → S22

---

## Agent Assignment Format

Update task status:

```
| S6 | `src/engine/skill-bonus.ts` | 🔄 Agent-A |
```

After completion:

```
| S6 | `src/engine/skill-bonus.ts` | ✅ Agent-A |
```

---

*Last updated: 2026-05-09*
