# Data Model Specification

> Core data structures for Open20 Core (headless D&D 5e 2024 engine).

---

## Entity Relationship

```
Character
├── Species
├── Background
├── Classes[] (multiclass support)
├── AbilityScores
├── Skills
├── Feats[]
├── Equipment[] (Weapon | Armor | Gear)
├── Spells (per-class tracking)
│   ├── classSpellcasting[] (per-class data)
│   ├── spellSlots (unified pool)
│   └── pactMagicSlots (Warlock only)
├── Resources[] (consumable counters)
├── HitPoints
├── CombatStats
└── Currency
```

---

## Character

```typescript
interface Character {
  readonly schemaVersion: string;
  readonly name: string;
  readonly species: string;
  readonly background: string;
  readonly classes: readonly CharacterClass[];
  readonly abilityScores: AbilityScores;
  readonly skills: Record<string, SkillEntry>;
  readonly feats: readonly string[];
  readonly equipment: readonly EquipmentItem[];
  readonly spells: CharacterSpells;
  readonly resources: readonly Resource[];
  readonly hitPoints: HitPoints;
  readonly combatStats: CombatStats;
  readonly currency: Currency;
  readonly conditions: readonly ActiveCondition[];
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

**JSON example**: See `static/` files for actual data.

---

## Character Spells (Per-Class Tracking)

In D&D 5e multiclassing, different classes use different spellcasting abilities and track spells separately. The new model supports this:

```typescript
interface CharacterSpells {
  // Per-class spell tracking (keyed by classId)
  readonly classSpellcasting: Record<string, ClassSpellData>;

  // Unified spell slots (multiclass combination)
  readonly spellSlots: Record<SpellLevel, SpellSlotEntry>;

  // Warlock Pact Magic (separate from regular slots)
  readonly pactMagicSlots: PactMagicSlots | null;
}

interface ClassSpellData {
  readonly classId: string;
  readonly spellcastingAbility: AbilityName;
  readonly spellSaveDC: number;  // 8 + PB + ability mod
  readonly spellAttackBonus: number;
  readonly knownSpells: readonly string[];
  readonly preparedSpells: readonly string[];
  readonly alwaysPreparedSpells?: readonly string[];
  readonly maxPrepared: number;  // class level + ability mod
}
```

**Key changes from previous version**:
- `spellcastingAbility`, `spellSaveDC`, `spellAttackBonus` are now PER CLASS
- `knownSpells` and `preparedSpells` are tracked per class
- `spellSlots` is still a unified pool (correct for D&D 5e multiclassing)

---

## Spell

```typescript
interface Spell {
  readonly id: string;                    // kebab-case
  readonly name: string;
  readonly level: number;                 // 0-9 (0 = cantrip)
  readonly school: SpellSchool;
  readonly castingTime: string;
  readonly range: string;
  readonly components: SpellComponents;
  readonly duration: string;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly description: string;
  readonly higherLevel?: string;
  readonly damage?: SpellDamage;
  readonly heal?: SpellHeal;
  readonly save?: Ability;
  readonly attack?: 'ranged' | 'melee';
  readonly source: string;
  readonly classes: readonly string[];
}

interface SpellComponents {
  readonly V?: boolean;
  readonly S?: boolean;
  readonly M?: string | boolean;
}

interface SpellDamage {
  readonly dice?: string;
  readonly type?: DamageType;
  readonly scale?: 'cantrip' | 'level';
}
```

**Data sources**:
- SRD 5.2 (~391 spells): Full descriptions
- 2024 PHB (~200 spells): Metadata only (copyright)
- XGtE/TCoE (~110 spells): SRD-eligible

---

## Species, Background, Class

See `static/species.json`, `static/backgrounds.json`, `static/classes.json` for full examples.

**Key fields**:
- `id`: kebab-case identifier
- `source`: `"2024 PHB"` | `"2014 PHB"` | etc.
- `abilityBonuses`: `{ "Constitution": 2 }` (full ability names)
- `featuresByLevel`: Array format in JSON, `ReadonlyMap` at runtime

---

## AbilityScores

```typescript
interface AbilityScores {
  readonly Strength: number;
  readonly Dexterity: number;
  readonly Constitution: number;
  readonly Intelligence: number;
  readonly Wisdom: number;
  readonly Charisma: number;
}

// Modifier calculation
const getModifier = (score: number): number => Math.floor((score - 10) / 2);
```

---

## Zod Schemas

Located in `src/schemas/`:

```typescript
import { z } from 'zod';

const AbilityScoresSchema = z.object({
  Strength: z.number().min(1).max(30),
  Dexterity: z.number().min(1).max(30),
  Constitution: z.number().min(1).max(30),
  Intelligence: z.number().min(1).max(30),
  Wisdom: z.number().min(1).max(30),
  Charisma: z.number().min(1).max(30),
});

const SpellSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().min(0).max(9),
  school: z.enum(['Abjuration', 'Conjuration', ...]),
  // ... more fields
});
```

**Usage**:
```typescript
import { CharacterSchema } from '@open20/core/schemas';

const result = CharacterSchema.safeParse(json);
if (!result.success) {
  console.error(result.error.issues);
}
```

---

## Data Validation Rules

| Field | Validation |
|---|---|
| `abilityScores.*` | 1-30 |
| `classes[].level` | Sum must equal character level |
| `feats` | All IDs must exist in `feats.json` |
| `equipment[].id` | Must be unique within character |
| `spells.knownSpellIds` | All IDs must exist in `spells.json` |
| `resources[].current` | 0 ≤ current ≤ max |

---

## JSON Data Format Rules

1. **Ability names**: Use full names (`"Strength"`, not `"Str"`)
2. **Feature arrays**: `featuresByLevel` is array in JSON: `[[1, [...]], [2, [...]]]`
3. **Spell slots**: Arrays, not objects: `[4, 3, 2, 0, 0, 0, 0, 0, 0]` (index 0 = level 1)
4. **Spell ID format**: kebab-case (`fire-bolt`, not `FireBolt`)
5. **Weapon mastery**: Single value `"Push"` not array

---

*Last updated: 2026-05-09*
