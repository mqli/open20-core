# Open20 Core - Headless D&D 5e 2024 Game Engine

**Version**: 5.0 | **Date**: 2026-05-09 | **License**: MIT

---

## 0. One-Sentence Definition

> A headless TypeScript library for D&D 5e 2024: rule calculations, spell data, and character management. Framework-agnostic, UI-free, test-driven.

**Not doing**: UI rendering, state management, networking, dice rolling UI.

---

## 1. Core Modules

### 1.1 Rules Engine (`@open20/core/engine`)

Pure functions for D&D 5e 2024 calculations:

| Function | Description |
|---|---|
| `calculateAbilityModifier(score)` | `(score - 10) / 2` floor |
| `calculateProficiencyBonus(level)` | PB table |
| `calculateSkillBonus(character, skill)` | attr mod + PB + expertise |
| `calculateAC(character, equipment)` | Unarmored/Armored/Mage Armor/Unarmored Defense |
| `calculateHP(character)` | 1st level max + per-level fixed value |
| `calculateSpellSlots(character)` | Single/Multiclass + Pact Magic |
| `calculateSpellAttackDC(character)` | `8 + PB + spellcasting attr mod` |
| `validateCharacter(character)` | Full rule compliance |

**Design**: All functions pure, accept state as input, return computed values.

### 1.2 Character Management (`@open20/core/character`)

```typescript
// Create
const character = createCharacter({ species: 'Dwarf', background: 'Soldier', ... })

// Validate
const errors = validateCharacter(character)

// Level up
const updated = levelUp(character, { class: 'Fighter', hitDieResult: 'fixed', ... })
```

**Creation order**: Species → Background → Class(es) → Ability Scores → Feats → Skills → Languages → Equipment

**Validation rules**: Ability score constraints, proficiency matching, feat prerequisites, spell list membership, multiclass prerequisites.

### 1.3 Spell Management (`@open20/core/spells`)

```typescript
// Query
const spell = getSpell('fireball')
const spells = searchSpells({ school: 'Evocation', level: [1,2,3] })
const wizardSpells = getSpellsByClass('Wizard')
```

**Spell data structure**:
```typescript
interface Spell {
  id: string; name: string; level: number; school: SpellSchool;
  castingTime: string; range: string;
  components: { V?: boolean; S?: boolean; M?: string | boolean };
  duration: string; concentration: boolean; ritual: boolean;
  description: string; higherLevel?: string;
  damage?: { dice?: string; type?: DamageType; scale?: 'cantrip' | 'level' };
  heal?: { dice?: string; type: 'fixed' | 'dice' };
  save?: Ability; attack?: 'ranged' | 'melee';
  source: string; classes: string[];
}
```

**Data sources**: SRD 5.1 (~391 spells, full descriptions), 2024 PHB (~200, metadata), XGtE/TCoE (~110, SRD-eligible).

### 1.4 Static Data (`@open20/core/data`)

| Dataset | Count | Source |
|---|---|---|
| Species | 12 | 2024 PHB + legacy |
| Backgrounds | 16 | 2024 PHB |
| Classes | 12 | 2024 PHB |
| Subclasses | ~48 | 2024 PHB |
| Feats | 75 | 2024 PHB |
| Spells | 560+ | SRD + 2024 PHB |
| Equipment | ~200 | 2024 PHB |

---

## 2. API Design Principles

1. **Functional** — Pure functions, no mutable state
2. **Immutable** — Return new state, don't mutate inputs
3. **Composable** — Small functions that compose well
4. **Type-Safe** — Full TypeScript + Zod runtime validation
5. **Testable** — 100% test coverage with property-based testing

---

## 3. Architecture

```
src/
├── engine/           # Rule calculations (pure functions)
│   ├── ability-modifier.ts
│   ├── proficiency-bonus.ts
│   ├── skill-bonus.ts
│   ├── saving-throw.ts
│   ├── ac-calculator.ts
│   ├── hp-calculator.ts
│   ├── spell-slots.ts
│   ├── initiative.ts
│   ├── passive-perception.ts
│   ├── attack-calculator.ts
│   ├── damage-calculator.ts
│   └── dice.ts
├── character/        # Character creation & validation
│   ├── create.ts
│   ├── validate.ts
│   ├── level-up.ts
│   ├── recompute.ts
│   ├── mutate.ts
│   └── rest.ts
├── spells/           # Spell data & queries
│   ├── query.ts
│   └── types.ts
├── data/             # Static JSON loading
│   ├── loader.ts
│   ├── default-loader.ts
│   └── browser-loader.ts
├── schemas/          # Zod schemas
│   ├── character.ts
│   ├── spell.ts
│   └── index.ts
├── storage/          # Persistence (serializer, storage implementations)
│   ├── interface.ts
│   ├── serializer.ts
│   ├── memory.ts
│   └── json-file.ts
└── index.ts          # Public API
```

---

## 4. Priorities

### P0 (Must Have)
- [x] Character creation (single class)
- [x] Rule calculations (AC, HP, skills, spell slots)
- [x] Character validation
- [x] Complete TypeScript types
- [x] Zod schemas for runtime validation
- [x] Spell data (SRD spells imported)
- [x] JSON export/import

### P1 (Should Have)
- [ ] Multiclassing support
- [ ] 2014 legacy content
- [ ] Homebrew data structures
- [ ] Spell preparation helpers
- [ ] Equipment effect calculations

### P2 (Nice to Have)
- [ ] Monster data
- [ ] Magic item data
- [ ] Encounter building helpers

---

## 5. Usage Examples

```typescript
import { createCharacter, calculateAC, searchSpells } from '@open20/core'

// Create character
const character = createCharacter({
  species: 'Dwarf', background: 'Soldier',
  classes: [{ name: 'Fighter', level: 5 }],
  abilityScores: { str: 16, dex: 12, con: 15, int: 10, wis: 13, cha: 8 },
})

// Calculate stats
const ac = calculateAC(character, { armor: 'Chain Mail', shield: true })
const hp = calculateHP(character)

// Query spells
const evocation = searchSpells({ school: 'Evocation', level: [1,2,3] })
```

---

## 6. Design Principles

1. **Headless** — No UI, no rendering opinions
2. **Framework-agnostic** — React/Vue/Svelte/vanilla/Node.js
3. **Pure functions** — Predictable, testable
4. **Rule accuracy > features** — Correct > complete
5. **Small core** — Core < 100KB gzipped
6. **Well-tested** — Property-based testing

---

## 7. Appendix

### A. HP Calculation
- **Level 1**: `HP = hitDieMax + Con mod`
- **Levels 2+**: `increment = floor(hitDie/2) + 1 + Con mod` (d6→4, d8→5, d10→6, d12→7)

### B. Spell Slots
- **Full casters**: Bard, Cleric, Druid, Sorcerer, Wizard → total level
- **Half casters**: Paladin, Ranger → floor(total / 2)
- **Third casters**: Fighter (Eldritch Knight), Rogue (Arcane Trickster) → floor(total / 3)
- **Warlock**: Pact Magic separate, short rest recovery

### C. 2024 Terminology
| 2014 | 2024 |
|---|---|
| Race | Species |
| Ki | Focus Points |
| Inspiration | Heroic Inspiration |
| Cast a Spell | Magic (action) |
