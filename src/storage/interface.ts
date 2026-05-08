// storage/interface.ts
// Storage abstraction layer — ICharacterStorage interface + CharacterSummary type

import type { Character } from '../types/character';

export interface ICharacterStorage {
  save(char: Character): Promise<void>;
  load(id: string): Promise<Character | null>;
  list(): Promise<CharacterSummary[]>;
  delete(id: string): Promise<void>;
}

export interface CharacterSummary {
  id: string;
  name: string;
  classSummary: string; // "Fighter 5" or "Fighter 5 / Wizard 2"
  lastModified: string;
}
