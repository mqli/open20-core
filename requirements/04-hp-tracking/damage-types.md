# Requirement 4.5: Damage Types, Resistance & Immunity

> Corresponds to PRD §4.5 (Damage Types and Defenses)

---

## Description

Track damage types and apply damage modifiers (resistance, immunity, vulnerability) when calculating effective damage taken.

---

## Standard Damage Types

```typescript
type DamageType =
  | 'Bludgeoning'
  | 'Piercing'
  | 'Slashing'      // Physical
  | 'Fire'
  | 'Cold'
  | 'Lightning'
  | 'Thunder'
  | 'Acid'
  | 'Poison'
  | 'Psychic'
  | 'Force'
  | 'Necrotic'
  | 'Radiant';      // Magical/Elemental
```

---

## Damage Modifiers

| Modifier | Effect |
|----------|--------|
| **Resistance** | Take half damage (round down) |
| **Immunity** | Take no damage |
| **Vulnerability** | Take double damage |

**Stacking rules**:
- Resistance + Vulnerability = Cancel out (normal damage)
- Multiple resistances = Still half (don't stack)
- Multiple immunities = Still immune

---

## Data Model

### DamageDefenses

```typescript
interface DamageDefenses {
  readonly resistances: readonly DamageType[];
  readonly immunities: readonly DamageType[];
  readonly vulnerabilities: readonly DamageType[];
}

// Added to Character interface
interface Character {
  // ... existing fields
  readonly damageDefenses: DamageDefenses;  // Persistent defenses (defaults to empty arrays)
}
```

### DamageResult

```typescript
interface DamageResult {
  readonly originalDamage: number;
  readonly effectiveDamage: number;  // After defenses
  readonly modifiers: readonly {
    readonly type: 'resistance' | 'immunity' | 'vulnerability';
    readonly damageType: DamageType;
  }[];
}
```

### DamageDefenseSource

```typescript
interface DamageDefenseSource {
  readonly source: string;
  readonly type: 'species' | 'class' | 'equipment' | 'condition' | 'spell' | 'custom';
  readonly defenses: DamageDefenses;
}
```

---

## Sources of Damage Defenses

### 1. Species Features (auto-detected)
- Dwarven Resilience → Resistance: Poison (Hill Dwarf, Mountain Dwarf)
- Dragon Ancestry → Resistance: varies by dragon type

### 2. Class Features (with condition detection)
- Barbarian Rage → Resistance: Bludgeoning, Piercing, Slashing (**only while Raging condition is active**)
- Draconic Sorcerer → Resistance: (dragon type)
- Path of the Battlerager → Resistance: nonmagical B/P/S

### 3. Equipment
- Magic armor with specific damage resistances
- Rings of protection
- Cloaks of displacement

### 4. Active Effects/Conditions
- Spells: "Protection from Energy" (choose one damage type)
- Custom character defenses (optional field)

---

## Acceptance Criteria

- [x] `DamageType` union type defined
- [x] `DamageDefenses` added to Character model (optional field)
- [x] `DamageDefenseSource` for debug/tracking
- [x] `getActiveDamageDefenses(char, dataLoader)` → aggregates all sources
- [x] `getDamageDefenses(char, dataLoader)` → convenience function
- [x] `applyTypedDamage(char, damage, type, defenses)` → applies modifiers
- [x] `applyDamageWithDefenses(char, damage, type, dataLoader)` → auto-aggregates + applies
- [x] Resistance halves damage (round down)
- [x] Immunity negates damage completely
- [x] Vulnerability doubles damage
- [x] Resistance + Vulnerability = normal damage (cancel out)
- [x] Multiple sources don't stack
- [x] `modifyHP` accepts optional damage type and defenses
- [x] Rage condition integration (B/P/S resistance only when Raging)
- [x] 'Raging' condition added to ConditionName type

---

## API Functions

```typescript
// Get all active damage defenses with source tracking
function getActiveDamageDefenses(
  char: Character,
  dataLoader: DataLoader
): { defenses: DamageDefenses; sources: readonly DamageDefenseSource[] };

// Convenience: Get only aggregated defenses
function getDamageDefenses(char: Character, dataLoader: DataLoader): DamageDefenses;

// Apply typed damage with automatic defense aggregation
function applyDamageWithDefenses(
  char: Character,
  damage: number,
  damageType: DamageType,
  dataLoader: DataLoader
): { char: Character; result: DamageResult; defenses: DamageDefenses };

// Apply typed damage with pre-calculated defenses
function applyTypedDamage(
  char: Character,
  damage: number,
  damageType: DamageType,
  defenses: DamageDefenses
): { char: Character; result: DamageResult };

// Modify HP with optional damage type and defenses
function modifyHP(
  char: Character,
  delta: number,
  damageType?: DamageType,
  defenses?: DamageDefenses
): Character;

// Calculate damage without character mutation
function calculateTypedDamage(
  damage: number,
  damageType: DamageType,
  defenses: DamageDefenses
): DamageResult;
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Resistance + Vulnerability on same type | Cancel out (normal damage) |
| Damage exactly 1, resistance applies | 1 / 2 = 0 (minimum 0 effective damage) |
| Immunity to lethal damage | HP doesn't go below 0 from that source |
| Raging Barbarian takes damage | B/P/S resistance applies only while Raging condition is active |
| Multiple resistance sources | Don't double-halve (take highest modifier only) |
| Character has no defenses | Returns empty defenses array |
| Custom character defenses | Merged with auto-detected defenses |

---

## Integration with HP Tracking

```
applyDamageWithDefenses()
    ↓
getActiveDamageDefenses() aggregates:
  - Species features (Dwarven Resilience → Poison)
  - Class features (Barbarian Rage → B/P/S if Raging)
  - Equipment (if equipped items grant resistance)
  - Character custom defenses (optional field)
    ↓
calculateTypedDamage()
  - Check immunity → 0 damage
  - Check resistance → half damage (or cancel if vuln)
  - Check vulnerability → double damage
    ↓
modifyHP() with effective damage
    ↓
Trigger death saves if HP ≤ 0
```

---

## References

- PRD §4.5 Damage Types and Defenses
- 2024 PHB p.26 Damage and Healing
- 2024 PHB p.57-58 Barbarian Rage
- 2024 PHB p.165 Dragonborn Draconic Ancestry
- SRD 5.2: Damage Types
