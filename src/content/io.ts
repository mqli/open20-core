// content/io.ts
// Import/export ContentPack to/from separate files (Node.js only)
// R26.2: Separate files for maintainability, unified format for distribution

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { ContentPack, ContentPackMeta } from './types';
import type { Species } from '../types/species';
import type { Background } from '../types/background';
import type { Class, Subclass } from '../types/class';
import type { Feat } from '../types/feat';
import type { Spell } from '../types/spell';
import type { Weapon, Armor, GearItem } from '../types/equipment';

const require = createRequire(import.meta.url);

// ── Helpers ──────────────────────────────────────────────────

/** Read a JSON file from disk (Node.js) */
function readJsonFile<T>(dirPath: string, filename: string): T | undefined {
  try {
    const filePath = join(dirPath, filename);
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return undefined;
  }
}

/** Write a JSON file to disk (Node.js) */
function writeJsonFile(dirPath: string, filename: string, data: unknown): void {
  const filePath = join(dirPath, filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Export: Separate files → Unified ContentPack ─────────────

/**
 * Export separate content files to a unified ContentPack object.
 * Reads meta.json + all content files from the directory.
 *
 * @param dirPath - Path to directory containing meta.json and content files
 * @returns ContentPack object with all content merged
 *
 * @example
 * const pack = exportContentPack('static/srd/');
 * // pack is a single object with meta + all content
 */
export function exportContentPack(dirPath: string): ContentPack {
  const resolvedPath = resolve(dirPath);

  // Read metadata
  const meta = readJsonFile<ContentPackMeta>(resolvedPath, 'meta.json');
  if (!meta) {
    throw new Error(`meta.json not found in ${resolvedPath}`);
  }

  // Read all content files
  const species = readJsonFile<Species[]>(resolvedPath, 'species.json');
  const backgrounds = readJsonFile<Background[]>(resolvedPath, 'backgrounds.json');
  const classes = readJsonFile<Class[]>(resolvedPath, 'classes.json');
  const subclasses = readJsonFile<Subclass[]>(resolvedPath, 'subclasses.json');
  const feats = readJsonFile<Feat[]>(resolvedPath, 'feats.json');
  const spells = readJsonFile<Spell[]>(resolvedPath, 'spells.json');
  const weapons = readJsonFile<Weapon[]>(resolvedPath, 'weapons.json');
  const armor = readJsonFile<Armor[]>(resolvedPath, 'armor.json');
  const gear = readJsonFile<GearItem[]>(resolvedPath, 'gear.json');

  // Build ContentPack
  const pack: ContentPack = { meta };

  if (species) pack.species = species;
  if (backgrounds) pack.backgrounds = backgrounds;
  if (classes) pack.classes = classes;
  if (subclasses) pack.subclasses = subclasses;
  if (feats) pack.feats = feats;
  if (spells) pack.spells = spells;
  if (weapons) pack.weapons = weapons;
  if (armor) pack.armor = armor;
  if (gear) pack.gear = gear;

  return pack;
}

// ── Import: Unified ContentPack → Separate Files ───────────

/**
 * Import a unified ContentPack object, splitting it into separate files.
 * Writes meta.json + all content files to the directory.
 *
 * @param pack - ContentPack object to import
 * @param dirPath - Path to directory where files should be written
 *
 * @example
 * const pack = { meta: {...}, spells: [...] };
 * importContentPack(pack, 'my-homebrew/');
 * // Creates my-homebrew/meta.json, my-homebrew/spells.json, etc.
 */
export function importContentPack(pack: ContentPack, dirPath: string): void {
  const resolvedPath = resolve(dirPath);

  // Create directory if it doesn't exist
  mkdirSync(resolvedPath, { recursive: true });

  // Write metadata
  writeJsonFile(resolvedPath, 'meta.json', pack.meta);

  // Write all content files
  if (pack.species) writeJsonFile(resolvedPath, 'species.json', pack.species);
  if (pack.backgrounds) writeJsonFile(resolvedPath, 'backgrounds.json', pack.backgrounds);
  if (pack.classes) writeJsonFile(resolvedPath, 'classes.json', pack.classes);
  if (pack.subclasses) writeJsonFile(resolvedPath, 'subclasses.json', pack.subclasses);
  if (pack.feats) writeJsonFile(resolvedPath, 'feats.json', pack.feats);
  if (pack.spells) writeJsonFile(resolvedPath, 'spells.json', pack.spells);
  if (pack.weapons) writeJsonFile(resolvedPath, 'weapons.json', pack.weapons);
  if (pack.armor) writeJsonFile(resolvedPath, 'armor.json', pack.armor);
  if (pack.gear) writeJsonFile(resolvedPath, 'gear.json', pack.gear);
}

// ── Load: Handle both directory and ContentPack ─────────────

/**
 * Load content pack from directory path or ContentPack object.
 *
 * @param source - Directory path (string) or ContentPack object
 * @returns ContentPack object
 *
 * @example
 * // Load from directory (separate files)
 * const pack1 = loadContentPack('static/srd/');
 *
 * // Load from unified object
 * const pack2 = loadContentPack({ meta: {...}, spells: [...] });
 */
export function loadContentPack(source: string | ContentPack): ContentPack {
  if (typeof source === 'string') {
    // Load from directory
    return exportContentPack(source);
  } else {
    // Already a ContentPack object
    return source;
  }
}
