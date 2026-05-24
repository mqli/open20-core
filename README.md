# Open20 Core

[![npm version](https://img.shields.io/npm/v/open20-core)](https://www.npmjs.com/package/open20-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/open20/open20-core/actions/workflows/ci.yml/badge.svg)](https://github.com/open20/open20-core/actions/workflows/ci.yml)

A headless TypeScript game engine for D&D 5e 2024 — rule calculations, spell & monster management, dice rolling, and character management. Framework-agnostic, UI-free, test-driven.

## Features

- **Headless Core**: Pure TypeScript, no UI framework dependencies
- **Immutable State**: All Character fields are readonly. Modifications return new objects
- **Rule Engine**: Pure functions for AC, HP, spell slots, initiative, attacks, skills, and saving throws
- **Character Management**: Create, validate, level up, rest (short/long), and manage characters with full 2024 PHB support
- **Spell Management**: 330+ SRD spells with full metadata, preparation rules, and query functions
- **Monster Management**: Query, search, and manage monsters with combat state tracking
- **Dice System**: Layered dice engine — core rolls, advantage/disadvantage, skill checks, attacks, and damage
- **Character Storage**: Persistence interface with in-memory implementation, serialization, and deserialization
- **Content Packs**: Import/export character data as portable content packs
- **ESM**: Modern JavaScript module system
- **TypeScript**: Full type safety with strict mode
- **Zod Schemas**: Runtime validation for all data structures
- **Testable**: 826 tests across 51 test files

## Installation

```bash
npm install open20-core
```

## Quick Start

```typescript
import {
  createCharacter,
  calculateAC,
  calculateHP,
  calculateSpellSlots,
  getSpell,
  searchSpells,
} from 'open20-core';

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

// Query monsters
import { getMonster, searchMonsters } from 'open20-core';
const goblin = getMonster('goblin');
const lowCrMonsters = searchMonsters({ maxCR: 2, type: 'Humanoid' });
```

## API Modules

| Module | Import Path | Description |
|---|---|---|
| `engine` | `open20-core` / `open20-core/engine` | Rule calculations (AC, HP, skills, spell slots, initiative, attacks, concentration) |
| `character` | `open20-core` / `open20-core/character` | Character creation, validation, level up, rests, mutations, spellcasting, feats |
| `spells` | `open20-core` / `open20-core/spells` | Spell data, query functions, preparation rules, upcasting |
| `monster` | `open20-core` / `open20-core/monster` | Monster query, stat calculations, combat state management |
| `dice` | `open20-core` / `open20-core/dice` | Core dice engine (d20, advantage, expressions) and game mechanics |
| `rolls` | `open20-core` / `open20-core/rolls` | High-level roll functions for characters and monsters |
| `data` | `open20-core` / `open20-core/data` | Data loaders for static JSON datasets (species, classes, feats, etc.) |
| `types` | `open20-core` / `open20-core/types` | TypeScript type definitions for all game entities |
| `storage` | `open20-core` / `open20-core/storage` | Character persistence, serialization/deserialization |
| `content` | `open20-core` / `open20-core/content` | Content pack management for portable character data |

## Browser Usage

```bash
npm run build:bundle
```

```html
<script src="dist/open20-core.js"></script>
<script>
  const loader = Open20Core.createBrowserDataLoader(lookupTables);
  const char = Open20Core.createCharacter(params, loader);
</script>
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
npm run build:bundle
```

## Documentation

- [PRD.md](./PRD.md) — Product Requirements Document
- [agent.md](./agent.md) — Developer guide for AI agents
- [spec/high-level-design.md](./spec/high-level-design.md) — Technical architecture
- [spec/data-model.md](./spec/data-model.md) — TypeScript interfaces & JSON schema
- [requirements/README.md](./requirements/README.md) — Requirements traceability

## License

MIT
