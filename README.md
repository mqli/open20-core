# open20-core

A TypeScript library for managing D&D 2024 character sheets. Zero UI dependency — pure logic, testable via unit tests, usable by CLI or web apps.

## Features

- **Headless Core**: Pure TypeScript, no UI framework dependencies
- **Immutable State**: All Character fields are readonly. Modifications return new objects
- **Rule Engine**: Pure functions for AC, HP, spell slots, initiative, attacks, etc.
- **ESM**: Modern JavaScript module system
- **TypeScript**: Full type safety with strict mode
- **Testable**: 415 tests with 100% coverage for engine/character modules

## Installation

```bash
npm install open20-core
```

## Quick Start

```typescript
import { createDataLoader, createCharacter, calculateAC } from 'open20-core';

// Load rule data
const loader = createDataLoader();

// Create a character
const char = createCharacter({
  name: 'Borin Ironforge',
  speciesId: 'Dwarf',
  backgroundId: 'Soldier',
  classId: 'Fighter',
  abilityScores: {
    Strength: 15, Dexterity: 12, Constitution: 14,
    Intelligence: 10, Wisdom: 13, Charisma: 8
  }
}, loader);

// Calculate stats
console.log(calculateAC(char, loader));  // AC value
console.log(char.hitPoints.max);          // Max HP
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

## Documentation

- [agent.md](./agent.md) — Developer guide for AI agents
- [spec/high-level-design.md](./spec/high-level-design.md) — Technical architecture
- [spec/data-model.md](./spec/data-model.md) — TypeScript interfaces & JSON schema
- [requirements/README.md](./requirements/README.md) — Requirements traceability

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