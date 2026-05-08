// storage/memory.ts
// InMemoryStorage — Map-based ICharacterStorage implementation for testing

import type { Character } from '../types/character';
import type { ICharacterStorage, CharacterSummary } from './interface';

export class InMemoryStorage implements ICharacterStorage {
  private map: Map<string, Character> = new Map();

  async save(char: Character): Promise<void> {
    this.map.set(char.name, char);
  }

  async load(id: string): Promise<Character | null> {
    return this.map.get(id) ?? null;
  }

  async list(): Promise<CharacterSummary[]> {
    const summaries: CharacterSummary[] = [];
    for (const char of this.map.values()) {
      summaries.push({
        id: char.name,
        name: char.name,
        classSummary: buildClassSummary(char),
        lastModified: char.updatedAt,
      });
    }
    return summaries;
  }

  async delete(id: string): Promise<void> {
    this.map.delete(id);
  }
}

function buildClassSummary(char: Character): string {
  return char.classes
    .map(c => {
      const parts = [c.classId, String(c.level)];
      return parts.join(' ');
    })
    .join(' / ');
}
