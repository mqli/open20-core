// storage/json-file.ts
// JsonFileStorage — File system ICharacterStorage implementation for CLI use

import { readFile, writeFile, readdir, unlink, mkdir } from 'fs/promises';
import { join } from 'path';

import type { Character } from '../types/character';
import type { ICharacterStorage, CharacterSummary } from './interface';
import { serialize, deserialize, sanitizeFilename } from './serializer';

const FILE_EXTENSION = '.dnd2024.json';

export class JsonFileStorage implements ICharacterStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async save(char: Character): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    const filename = sanitizeFilename(char.name) + FILE_EXTENSION;
    const filepath = join(this.baseDir, filename);
    await writeFile(filepath, serialize(char), 'utf-8');
  }

  async load(id: string): Promise<Character | null> {
    const filename = sanitizeFilename(id) + FILE_EXTENSION;
    const filepath = join(this.baseDir, filename);
    try {
      const json = await readFile(filepath, 'utf-8');
      return deserialize(json);
    } catch {
      return null;
    }
  }

  async list(): Promise<CharacterSummary[]> {
    await mkdir(this.baseDir, { recursive: true });
    let entries: string[];
    try {
      entries = await readdir(this.baseDir);
    } catch {
      return [];
    }

    const summaries: CharacterSummary[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(FILE_EXTENSION)) continue;

      const filepath = join(this.baseDir, entry);
      try {
        const json = await readFile(filepath, 'utf-8');
        const char = deserialize(json);
        summaries.push({
          id: char.name,
          name: char.name,
          classSummary: buildClassSummary(char),
          lastModified: char.updatedAt,
        });
      } catch {
        // Skip malformed files
      }
    }
    return summaries;
  }

  async delete(id: string): Promise<void> {
    const filename = sanitizeFilename(id) + FILE_EXTENSION;
    const filepath = join(this.baseDir, filename);
    try {
      await unlink(filepath);
    } catch {
      // File doesn't exist, no-op
    }
  }
}

function buildClassSummary(char: Character): string {
  return char.classes.map(c => `${c.classId} ${c.level}`).join(' / ');
}
