# Content Management System

**Requirement ID**: R26
**Priority**: P1
**Status**: ✅ implemented
**Created**: 2026-05-09
**Implemented**: 2026-05-09

---

## 1. Overview

Define how game content (species, classes, spells, feats, equipment) is organized, shipped, and extended. The system must support:

1. **SRD content included in core** — Base SRD content ships with `@open20/core`
2. **Separate files per content type** — JSON files kept separate for maintainability (NOT merged into one file by default)
3. **Import/export support** — Ability to import from and export to a single unified JSON file (for content pack distribution)
4. **No override** — Content from different sources coexists; same ID in different sources = different items

### Design Decision

**Keep JSON files separate** (one per content type) for ease of maintenance. A single unified file is hard to maintain for large datasets (e.g., 600+ spells). Instead:
- **Development**: Edit separate files (`species.json`, `spells.json`, etc.)
- **Distribution**: Export to unified file for easy sharing/installation
- **Installation**: Import unified file, optionally split into separate files

---

## 2. Requirements

### R26.1 — SRD Content Included in Core

**Description**: The core package (`@open20/core`) must include SRD content out of the box.

**Acceptance Criteria**:
- [ ] SRD species (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling)
- [ ] SRD backgrounds (Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin)
- [ ] SRD classes (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard)
- [ ] SRD subclasses (basic archetypes for each class)
- [ ] SRD feats (limited set)
- [ ] SRD spells (~391+ spells from SRD 5.2)
- [ ] SRD equipment (basic weapons, armor, gear)

**Implementation Notes**:
- SRD content located in `static/srd/` directory as separate files:
  ```
  static/srd/
  ├── meta.json          # Content pack metadata
  ├── species.json
  ├── backgrounds.json
  ├── classes.json
  ├── subclasses.json
  ├── feats.json
  ├── spells.json
  ├── weapons.json
  ├── armor.json
  ├── gear.json
  └── lookup-tables.json
  ```
- Automatically loaded when using default `createDataLoader()`
- All SRD content has `source: 'SRD 5.2'` tag

---

### R26.2 — Separate Files + Import/Export Support

**Description**: Each content source uses separate JSON files per content type for maintainability. Support importing from and exporting to a single unified JSON file for content pack distribution.

**File Structure** (maintainability):
```
static/
└── srd/                         # SRD content (included in core)
    ├── meta.json                 # Content pack metadata
    ├── species.json              # Separate file for maintainability
    ├── backgrounds.json
    ├── classes.json
    ├── subclasses.json
    ├── feats.json
    ├── spells.json
    ├── weapons.json
    ├── armor.json
    ├── gear.json
    └── lookup-tables.json
```

**Import/Export Functions**:
```typescript
// src/content/io.ts

/** Export separate files to unified ContentPack object */
export function exportContentPack(dirPath: string): ContentPack;

/** Import unified ContentPack object, split into separate files */
export function importContentPack(pack: ContentPack, dirPath: string): void;

/** Load content pack from directory (separate files) or unified object */
export function loadContentPack(source: string | ContentPack): ContentPack;
```

**Content Pack Metadata** (`meta.json`):
```typescript
interface ContentPackMeta {
  id: string;              // 'srd-5.2', 'phb-2024', 'my-homebrew'
  name: string;            // 'SRD 5.2', 'Player's Handbook 2024', etc.
  version: string;         // '1.0.0'
  source: string;          // 'SRD 5.2', '2024 PHB', 'Homebrew'
  author?: string;         // 'Wizards of the Coast', 'Me', etc.
  url?: string;            // Link to source
  priority?: number;       // Higher = wins ID conflicts (default: 0)
}
```

**Unified ContentPack Interface** (for import/export):
```typescript
interface ContentPack {
  meta: ContentPackMeta;
  species?: Species[];
  backgrounds?: Background[];
  classes?: Class[];
  subclasses?: Subclass[];
  feats?: Feat[];
  spells?: Spell[];
  weapons?: Weapon[];
  armor?: Armor[];
  gear?: GearItem[];
}
```

**Acceptance Criteria**:
- [ ] SRD content in `static/srd/` with separate files per type
- [ ] `meta.json` schema defined and validated
- [ ] Loader can load from directory structure (separate files)
- [ ] `exportContentPack()` — Merge separate files into unified `ContentPack` object
- [ ] `importContentPack()` — Split unified `ContentPack` into separate files
- [ ] `loadContentPack()` — Load from either separate files or unified object
- [ ] Each content file matches existing JSON schema (species.json, classes.json, etc.)

---

### R26.3 — No Content Override

**Description**: When multiple content sources define items with the same ID, they are treated as separate items. No automatic overriding.

**Example**:
```typescript
// SRD content
{ "id": "fireball", "name": "Fireball", "source": "SRD 5.2", ... }

// Homebrew content
{ "id": "fireball", "name": "Fireball (Enhanced)", "source": "my-homebrew", ... }
```

**Behavior**:
- Both spells are accessible
- `getSpell('fireball')` → Returns first registered version (by priority/registration order)
- `getSpells()` → Returns ALL versions
- `getSpellsBySource('my-homebrew')` → Returns only homebrew version

**Content Source Priority** (for `getSpell(id)` disambiguation):
1. Higher `priority` number in metadata wins
2. If same priority, first registered wins

**Acceptance Criteria**:
- [ ] Multiple items with same ID can coexist
- [ ] `getSpell(id)` returns highest priority version
- [ ] `getSpells()` returns all versions (including duplicates)
- [ ] Add `source` filter to query functions (`getSpellsBySource`, etc.)
- [ ] Content pack metadata includes `priority: number` field

---

## 3. Data Model Changes

### 3.1 ContentPackMeta Interface

```typescript
// src/types/content.ts

export interface ContentPackMeta {
  id: string;              // Unique content pack ID (e.g., 'srd-5.2', 'phb-2024')
  name: string;            // Display name (e.g., 'SRD 5.2')
  version: string;         // SemVer (e.g., '1.0.0')
  source: string;          // Tag for all content in this pack (e.g., 'SRD 5.2')
  author?: string;         // Author name
  url?: string;            // Link to source
  priority?: number;       // Higher = wins ID conflicts (default: 0)
}
```

### 3.2 ContentPack Interface (Unified Format)

```typescript
// src/types/content.ts

export interface ContentPack {
  meta: ContentPackMeta;
  species?: Species[];
  backgrounds?: Background[];
  classes?: Class[];
  subclasses?: Subclass[];
  feats?: Feat[];
  spells?: Spell[];
  weapons?: Weapon[];
  armor?: Armor[];
  gear?: GearItem[];
}
```

### 3.3 Updated DataLoader Interface

```typescript
// src/data/loader.ts

export interface DataLoader {
  // ... existing methods ...
  
  /** Register a content pack (from directory or unified object) */
  registerContentPack(source: string | ContentPack): void;
  
  /** Unregister a content pack by ID */
  unregisterContentPack(packId: string): void;
  
  /** Get all registered content packs */
  getContentPacks(): ContentPackMeta[];
  
  /** Get all items from a specific source */
  getSpellsBySource(source: string): Spell[];
  getSpeciesBySource(source: string): Species[];
  // ... etc for other content types ...
}
```

---

## 4. Implementation Plan

### Phase 1: SRD Content Organization (P0)
1. [ ] Create `static/srd/meta.json` with SRD metadata
2. [ ] Move existing `static/*.json` files to `static/srd/` (if not already there)
3. [ ] Update `source` field to `'SRD 5.2'` in all SRD content
4. [ ] Update `default-loader.ts` to load from `static/srd/` directory
5. [ ] Tests: Verify SRD content loads correctly

### Phase 2: Import/Export Support (P1)
1. [ ] Create `src/content/types.ts` with `ContentPackMeta` and `ContentPack` interfaces
2. [ ] Create `src/content/io.ts` with `exportContentPack()` and `importContentPack()` functions
3. [ ] Implement `exportContentPack()` — Merge separate files into unified `ContentPack`
4. [ ] Implement `importContentPack()` — Split unified `ContentPack` into separate files
5. [ ] Tests: Export then import returns identical data

### Phase 3: Content Pack Registration (P1)
1. [ ] Update `DataLoader` interface to support `registerContentPack()`
2. [ ] Implement `registerContentPack()` — Accept directory path or `ContentPack` object
3. [ ] Implement `unregisterContentPack()` — Remove content pack by ID
4. [ ] Add `source` filter to query functions (`getSpellsBySource`, etc.)
5. [ ] Tests: Register/unregister content packs
6. [ ] Tests: Same ID in multiple packs coexists

### Phase 4: Homebrew Support (P1)
1. [ ] Create example homebrew content pack (e.g., `examples/homebrew/`)
2. [ ] Document content pack creation process in `docs/content-packs.md`
3. [ ] Add validation for `meta.json` schema
4. [ ] Tests: Load homebrew content from directory

### Phase 5: Cleanup (P2)
1. [ ] Remove old `static/*.json` files (after migration to `static/srd/`)
2. [ ] Update documentation (PRD, HLD, agent.md)
3. [ ] Add deprecation warning for old loading mechanism

---

## 5. Edge Cases

1. **Circular references**: Content pack A depends on B? (Not supported initially)
2. **Version conflicts**: Same content pack ID with different versions? (Use highest version)
3. **Missing dependencies**: Content references non-existent species/class? (Warn, skip item)
4. **Invalid JSON**: Malformed content pack? (Throw error with helpful message)
5. **Very large content packs**: 1000+ spells? (Lazy loading? Currently load all)
6. **Same ID, different sources**: Both items coexist, `getSpell(id)` returns highest priority
7. **Import conflict**: Importing unified pack with same ID as existing? (Warn user, require manual resolution)

---

## 6. References

- **SRD 5.2**: https://www.dndbeyond.com/srd
- **PRD Section 1.4**: Static Data & Content Management
- **HLD Section 3**: Directory Structure
- **HLD Section 4**: Data Loader

---

## 7. Open Questions

1. **Should content packs be npm packages or JSON files?**
   - Option A: npm packages (`@open20/content-phb2024`)
   - Option B: JSON files (user downloads and imports)
   - **Decision**: Support both (npm for official, JSON for homebrew)

2. **How to handle content pack dependencies?**
   - Example: XGtE subclasses reference XGtE classes
   - **Decision**: Content packs are self-contained (bundle all dependencies)

3. **Should we support content pack enable/disable?**
   - **Decision**: Yes, via `register`/`unregister`

4. **Should we validate content on import?**
   - **Decision**: Yes, validate against Zod schemas before registering

---

*Last updated: 2026-05-09*
