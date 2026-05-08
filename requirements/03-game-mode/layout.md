# Game Mode — Layout & Interaction (REMOVED)

> **This requirement is no longer applicable.**

---

## Status: REMOVED (v5.0)

As of v5.0, Open20 Core is a **headless TypeScript engine** with no UI components.

This requirement described UI layout for a character sheet app, which is now out of scope.

---

## Replacement (v5.0)

Instead of game mode UI, the engine provides:

### Derived Stats API
```typescript
import { 
  calculateAC, 
  calculateHP, 
  calculateInitiative,
  calculatePassivePerception 
} from '@open20/core/engine';

const ac = calculateAC(character, equipment, data);
const hp = calculateHP(character, data);
const init = calculateInitiative(character, data);
const pp = calculatePassivePerception(character, data);
```

### Combat Stats
```typescript
interface CombatStats {
  readonly armorClass: number;
  readonly hitPoints: HitPoints;
  readonly initiative: number;
  readonly passivePerception: number;
  readonly attacks: readonly Attack[];
  readonly conditions: readonly ActiveCondition[];
}
```

### Consumer Implementation
UI implementation is left to consumers (web app, CLI, mobile app, VTT).

---

## References

- PRD v5.0 §4.1 Engine Module
- `src/engine/*` — Pure calculation functions
- `src/character/recompute.ts` — Recompute all derived stats
