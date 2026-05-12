# Open20 Core

A headless TypeScript game engine for D&D 5e 2024 — rule calculations, spell management, and character management. Framework-agnostic, UI-free, test-driven.

## Features

- **Headless Core**: Pure TypeScript, no UI framework dependencies
- **Immutable State**: All Character fields are readonly. Modifications return new objects
- **Rule Engine**: Pure functions for AC, HP, spell slots, initiative, attacks, skills
- **Spell Management**: 560+ SRD spells with full metadata and query functions
- **Character Management**: Create, validate, level up characters with full 2024 PHB support
- **ESM**: Modern JavaScript module system
- **TypeScript**: Full type safety with strict mode
- **Zod Schemas**: Runtime validation for all data structures
- **Testable**: 750+ tests with 100% coverage for engine/character modules

## Installation

```bash
npm install open20-core
```

## Quick Start

```typescript
import { createCharacter, calculateAC, calculateHP, searchSpells } from 'open20-core';

// Create a character
const character = createCharacter({
  name: 'Borin Ironforge',
  species: 'Dwarf',
  background: 'Soldier',
  classes: [{ name: 'Fighter', level: 5 }],
  abilityScores: { str: 16, dex: 12, con: 15, int: 10, wis: 13, cha: 8 },
  feats: ['Alert'],
  skills: ['Athletics', 'Intimidation', 'Perception'],
});

// Calculate derived stats
const ac = calculateAC(character, { armor: 'Chain Mail', shield: true });
const hp = calculateHP(character);
const spellSlots = calculateSpellSlots(character);

// Query spells
const fireball = getSpell('fireball');
const evocationSpells = searchSpells({ school: 'Evocation', level: [1, 2, 3] });
```

## Browser Usage

```bash
npm run build:browser
```

```html
<script src="dist/open20-core.js"></script>
<script>
  const loader = Open20Core.createBrowserDataLoader(lookupTables);
  const char = Open20Core.createCharacter(params, loader);
</script>
```

## API Modules

| Module | Description |
|---|---|
| `@open20/core/engine` | Rule calculations (AC, HP, skills, spell slots, etc.) |
| `@open20/core/character` | Character creation, validation, level up |
| `@open20/core/spells` | Spell data and query functions |
| `@open20/core/data` | Static JSON datasets (species, classes, feats, etc.) |
| `@open20/core/schemas` | Zod schemas for runtime validation |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
npm run build:browser
```

## Documentation

- [PRD.md](./PRD.md) — Product Requirements Document
- [agent.md](./agent.md) — Developer guide for AI agents
- [spec/high-level-design.md](./spec/high-level-design.md) — Technical architecture
- [spec/data-model.md](./spec/data-model.md) — TypeScript interfaces & JSON schema
- [requirements/README.md](./requirements/README.md) — Requirements traceability

## License

MIT
