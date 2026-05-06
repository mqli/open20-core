// storage/index.ts
// Barrel export — storage module public API

export type { ICharacterStorage, CharacterSummary } from './interface';
export { InMemoryStorage } from './memory';
export { JsonFileStorage } from './json-file';
export { serialize, deserialize, validateSchemaVersion, sanitizeFilename } from './serializer';
export type { SchemaValidationResult } from './serializer';
