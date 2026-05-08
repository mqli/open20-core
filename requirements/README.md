# Open20 Core — Requirements Index

> This document is the entry point for requirements. Each requirement corresponds to a separate file for easy agent implementation.

---

## Requirements & File Mapping

| # | Requirement | File | Source | Priority | Status |
|---|---|---|---|---|---|
| R1 | Engine — Ability/Skill/Save calculation | - | `src/engine/ability-modifier.ts`, `skill-bonus.ts`, `saving-throw.ts` | P0 | ✅ S4-S7 done |
| R2 | Engine — AC calculation | - | `src/engine/ac-calculator.ts` | P0 | ✅ S8 done |
| R3 | Engine — HP calculation | - | `src/engine/hp-calculator.ts` | P0 | ✅ S9 done |
| R4 | Engine — Spell slots calculation | - | `src/engine/spell-slots.ts` | P0 | ✅ S10 done |
| R5 | Character — Species | - | `src/data/default-loader.ts` + `create.ts` | P0 | ✅ S12 done |
| R6 | Character — Background | - | `src/data/default-loader.ts` + `create.ts` | P0 | ✅ S12 done |
| R7 | Character — Class + Subclass | - | `src/data/default-loader.ts` + `create.ts` | P0 | ✅ S12 done |
| R8 | Character — Ability Scores | - | `src/engine/ability-modifier.ts` + `create.ts` | P0 | ✅ S12 done |
| R9 | Character — Feats | - | `src/data/default-loader.ts` + `validate.ts` | P0 | ✅ S12 done |
| R10 | Character — Skills | - | `src/engine/skill-bonus.ts` | P0 | ✅ S12 done |
| R11 | Spells — Query & filter | - | `src/spells/query.ts` | P0 | ✅ Done |
| R12 | Spells — Data import (SRD) | - | `scripts/import_srd_spells.py` | P0 | ✅ Done |
| R13 | Character — State mutations | - | `src/character/mutate.ts` | P0 | ✅ S13 done |
| R14 | Character — Spell slot tracking | - | `src/character/mutate.ts` | P0 | ✅ S13 done |
| R15 | Character — Resource tracking | - | `src/character/mutate.ts` | P0 | ✅ S13 done |
| R16 | Character — Level up | - | `src/character/level-up.ts` | P0 | ✅ S15 done |
| R17 | Equipment — Weapon/Armor/Gear | - | `src/character/mutate.ts` + `recompute.ts` | P0 | 🔄 Data done |
| R18 | Engine — Weapon Mastery | - | `src/engine/attack-calculator.ts` | P0 | ✅ S11 done |
| R19 | Storage — Save/Export/Import | - | `src/storage/*` | P0 | ✅ S17 done |
| R20 | Character — Conditions | - | `src/character/mutate.ts` | P0 | ✅ S13 done |
| R21 | Multiclassing | - | `src/engine/spell-slots.ts` + `create.ts` | P1 | 🔄 Engine done |

---

## P1 Requirements

| # | Requirement | Description | Status |
|---|---|---|---|
| R21 | Multiclassing | `calculateMulticlassSpellSlots()` implemented | 🔄 Engine done |
| R22 | 2014 Legacy | Half-Elf/Half-Orc + legacy subclasses/feats | 📋 |
| R23 | Homebrew support | Data structures for homebrew content | 📋 |
| R24 | Multiple character management | Character list + quick switch | 📋 |
| R25 | Quick roll to clipboard | Copy "1d20+bonus" to clipboard | 📋 |

---

## Implementation Progress (HLD S1-S20)

| HLD Step | Content | Status |
|---|---|---|
| S1 | Project scaffolding | ✅ |
| S2 | Type definitions | ✅ |
| S3 | DataLoader interface + implementation | ✅ |
| S4-S11 | Engine pure functions (11 functions) | ✅ (201 tests) |
| S12 | Static rule data | 🔄 Most complete |
| S13-S19 | Character state management | ✅ (144 tests) |
| S20 | Integration tests | ✅ (40 tests) |

**Current test status**: **415+ tests passing**, `tsc --noEmit` ✅

---

## File Naming Convention

```
<directory>/<feature-name>.md
```

Example:
```
01-rules-engine/ac-calculation.md
02-character-creation/species.md
```

Each file contains:
- **Requirement description** — What this feature does
- **Acceptance criteria** — How to verify completion
- **Data model** — Required data structures
- **Edge cases** — Easy to miss details
- **References** — Related PRD sections

---

## Agent Assignment Convention

Before implementing a requirement, update the file header:

```markdown
---
status: in-progress
agent: <agent-name>
started: YYYY-MM-DD
---
```

After completion:

```markdown
---
status: done
agent: <agent-name>
started: YYYY-MM-DD
finished: YYYY-MM-DD
---
```

---

## Quick Navigation

- **PRD**: `PRD.md` (project root)
- **Technical Design (HLD)**: `spec/high-level-design.md`
- **Data Model**: `spec/data-model.md`
- **Task Breakdown**: `tasks/task-list.md`
- **Agent Guide**: `agent.md`
- **Test Plan**: `spec/test-plan.md`

---

*Last updated: 2026-05-08*
