// storage/serializer.ts
// Serialization utilities — serialize, deserialize, schema validation, filename sanitization

import { z } from 'zod';
import type { Character } from '../types/character';

// ── Schema Validation Result ──────────────────────────────────────

export interface SchemaValidationResult {
  compatible: boolean;
  message?: string;
}

// ── Zod Schema (top-level structure validation) ───────────────────

const FeatEntrySchema = z.object({
  featId: z.string(),
  skillChoices: z.array(z.string()).optional(),
  abilityChoices: z.record(z.string(), z.number()).optional(),
  spellChoices: z.any().optional(),
});

const CharacterSchema = z.object({
  schemaVersion: z.string(),
  name: z.string(),
  species: z.string(),
  speciesSubtype: z.string().nullable(),
  background: z.string(),
  classes: z.array(z.any()),
  abilityScores: z.object({
    base: z.record(z.string(), z.number()),
    racialBonuses: z.record(z.string(), z.number()).optional(),
    backgroundBonuses: z.record(z.string(), z.number()).optional(),
    featBonuses: z.record(z.string(), z.number()).optional(),
    featGrants: z.record(z.string(), z.number()).optional(),
    temporaryBonuses: z.record(z.string(), z.number()).optional(),
  }),
  skills: z.record(z.string(), z.any()),
  feats: z.array(z.union([z.string(), FeatEntrySchema])),
  equipment: z.array(z.any()),
  spells: z.any(),
  resources: z.union([z.array(z.any()), z.record(z.string(), z.any())]),
  hitPoints: z.object({
    max: z.number(),
    current: z.number(),
    temporary: z.number(),
    deathSaves: z.object({
      successes: z.number(),
      failures: z.number(),
      isStable: z.boolean(),
    }),
  }),
  combatStats: z.any(),
  currency: z.object({
    cp: z.number(),
    sp: z.number(),
    ep: z.number(),
    gp: z.number(),
    pp: z.number(),
  }),
  conditions: z.array(z.any()),
  damageDefenses: z
    .object({
      resistances: z.array(z.string()),
      immunities: z.array(z.string()),
      vulnerabilities: z.array(z.string()),
    })
    .optional()
    .default({ resistances: [], immunities: [], vulnerabilities: [] }),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ── Compatible Schema Versions ────────────────────────────────────

const COMPATIBLE_VERSIONS = ['2024.1'];

// ── Public Functions ──────────────────────────────────────────────

/**
 * Serialize a Character to a JSON string.
 */
export function serialize(char: Character): string {
  return JSON.stringify(char, null, 2);
}

/**
 * Deserialize a JSON string to a Character, with Zod runtime validation.
 * Throws on invalid JSON, incompatible schema version, or schema mismatch.
 */
export function deserialize(json: string): Character {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: unable to parse');
  }

  // Validate schema version before full validation
  if (typeof raw === 'object' && raw !== null && 'schemaVersion' in raw) {
    const version = (raw as { schemaVersion: unknown }).schemaVersion;
    if (typeof version !== 'string' || !COMPATIBLE_VERSIONS.includes(version)) {
      throw new Error(
        `Incompatible schema version: "${version}". Compatible versions: ${COMPATIBLE_VERSIONS.join(', ')}`
      );
    }
  } else {
    throw new Error('Missing schemaVersion field');
  }

  // Migrate old feats format (string[]) to new format (CharacterFeatEntry[])
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).feats)) {
    const feats = (raw as Record<string, unknown>).feats as unknown[];
    if (feats.length > 0 && typeof feats[0] === 'string') {
      (raw as Record<string, unknown>).feats = (feats as string[]).map(featId => ({ featId }));
    }
  }

  return CharacterSchema.parse(raw) as Character;
}

/**
 * Validate whether a JSON string has a compatible schema version.
 */
export function validateSchemaVersion(json: string): SchemaValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { compatible: false, message: 'Invalid JSON: unable to parse' };
  }

  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)) {
    return { compatible: false, message: 'Missing schemaVersion field' };
  }

  const version = (raw as { schemaVersion: unknown }).schemaVersion;
  if (typeof version !== 'string') {
    return { compatible: false, message: `schemaVersion is not a string: ${typeof version}` };
  }

  if (COMPATIBLE_VERSIONS.includes(version)) {
    return { compatible: true };
  }

  return {
    compatible: false,
    message: `Incompatible schema version: "${version}". Compatible versions: ${COMPATIBLE_VERSIONS.join(', ')}`,
  };
}

/**
 * Sanitize a character name into a safe filename.
 * - Replace non-alphanumeric chars with hyphens
 * - Lowercase
 * - Remove leading/trailing hyphens
 * - Limit length to 64 chars
 * - Return "unnamed-character" for empty results
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return sanitized || 'unnamed-character';
}
