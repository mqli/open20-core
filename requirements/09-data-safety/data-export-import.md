# Requirement: Data Export & Import

> Corresponds to PRD §4.9

---

## Description

As a headless engine, provide functions for serializing/deserializing character data to/from JSON.

Data safety is highest priority — consumers need reliable export/import.

---

## Acceptance Criteria

- [x] `serialize(character)` → JSON string
- [x] `deserialize(json)` → `Character` object
- [x] Validate JSON schema on import (using Zod schemas)
- [x] Validate rule legality on import (ability ranges, feat prerequisites, etc.)
- [x] Incompatible `schemaVersion` → reject import with error message
- [x] Export excludes temporary state fields: `deathSaves`, `notes`
- [x] Import success returns valid `Character` object
- [x] Support batch export/import (for multiple characters)

---

## Data Model

See `../../spec/data-model.md` → `Character`

- `Character` JSON schema — complete character data
- `schemaVersion: "2024.2"` — data version number
- Export excludes: `deathSaves`, `notes` (temporary state)
- Import validates field ranges:
  - `abilities` each 1-30
  - `hitPoints.current` ≤ `hitPoints.max`
  - `classes[].level` sum ≤ 20

---

## API Functions

```typescript
// Serialize character to JSON string
function serialize(character: Character): string;

// Deserialize JSON string to Character
function deserialize(json: string): Character;

// Validate character JSON against schema
function validateCharacterJSON(json: unknown): ValidationResult;

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  code: string;
  message: string;
  path: string;
}
```

---

## Edge Cases

| Situation | Handling |
|---|---|
| Export filename with special chars (`/`, `\`) | Sanitize to safe filename |
| Import file is non-JSON | Clear error "Invalid JSON format" |
| Import `schemaVersion` higher than current | Error "File version too high, please upgrade" |
| Import has same-name character locally | Prompt user to overwrite or rename |
| Batch export with 0 characters | Error "No characters to export" |
| Corrupted JSON | Error "File corrupted", don't crash |

---

## References

- PRD §4.9 Data Safety
- PRD §7 Open Questions (data migration)
- Zod Documentation (runtime validation)
