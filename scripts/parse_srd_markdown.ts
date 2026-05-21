#!/usr/bin/env node
/**
 * Parse SRD 5.2 spell list markdown into spells.json.
 * Reads requirements/05-spell-management/srd-5.2-spell-list.md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Types ────────────────────────────────────────────────────────

interface CantripUpgradeEntry {
  atCharacterLevel: 5 | 11 | 17;
  damage?: { dice: string; type: string }[];
}

interface SpellDamageEntry {
  dice: string;
  type: string;
}

interface SpellDamage {
  entries: SpellDamageEntry[];
  additional?: SpellDamageEntry[];
  perSlot?: SpellDamageEntry[];
}

interface SpellHeal {
  dice: string;
}

interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string[];
  cantripUpgrade?: CantripUpgradeEntry[];
  cantripUpgradeText?: string;
  usingAHigherLevelSpellSlot?: string[];
  damage?: SpellDamage;
  heal?: SpellHeal;
  save?: string;
  attack?: boolean;
  source: string;
  classes?: string[];
}

// ── Helpers ────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const markdownPath = resolve(projectRoot, 'requirements', '05-spell-management', 'srd-5.2-spell-list.md');
const outputPath = resolve(projectRoot, 'static', 'srd', 'spells.json');

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseComponents(compStr: string): string[] {
  const comps: string[] = [];
  if (/V\b/i.test(compStr)) comps.push('V');
  if (/S\b/i.test(compStr)) comps.push('S');
  if (/M\b/i.test(compStr)) comps.push('M');
  return comps;
}

function parseCastingTime(text: string): string {
  if (/bonus\s*action/i.test(text)) return 'Bonus Action';
  if (/reaction/i.test(text)) return 'Reaction';
  if (/minute/i.test(text)) return text.includes('minute') ? text.trim() : '1 minute';
  if (/hour/i.test(text)) return text.trim();
  return 'Action';
}

function parseDuration(text: string): { duration: string; concentration: boolean } {
  if (!text) return { duration: 'Instantaneous', concentration: false };
  return {
    duration: text.replace(/\s*concentration,?\s*/i, '').trim() || text.trim(),
    concentration: /concentration/i.test(text),
  };
}

function checkRitual(castingTime: string, description: string): boolean {
  return /ritual/i.test(castingTime) || /can be cast as a ritual/i.test(description);
}

function extractSave(description: string): string | undefined {
  for (const save of ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']) {
    if (new RegExp(`\\b${save}\\b`, 'i').test(description)) return save;
  }
  return undefined;
}

function checkAttack(description: string): boolean {
  return /spell attack/i.test(description) || /make an? .*attack/i.test(description);
}

export function extractDamage(description: string): SpellDamage | undefined {
  const matches = [...description.matchAll(/(\d+d\d+(?:\s*\+\s*\d+)?)\s+(acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder)/gi)];
  if (matches.length === 0) return undefined;
  return {
    entries: matches.map(m => ({
      dice: m[1],
      type: m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase(),
    })),
  };
}

function extractHeal(description: string): SpellHeal | undefined {
  if (!/regain|heal|hit point/i.test(description)) return undefined;
  const m = description.match(/(\d+d\d+)/);
  return m ? { dice: m[1] } : undefined;
}

// ── Cantrip Upgrade Parser ─────────────────────────────────────

export function parseCantripUpgrade(text: string): CantripUpgradeEntry[] {
  const entries: CantripUpgradeEntry[] = [];

  // Pattern: "levels 5 (2d6), 11 (3d6), and 17 (4d6)" → extract dice inside parentheses
  // Pattern: "at level 5, 2d6; at level 11, 3d6; at level 17, 4d6"
  // Pattern: "increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6)"

  const damageByLevel: Map<number, string> = new Map();

  // Normalize bare "dN" (e.g. Shillelagh's "(d10)") to "1dN" for consistency.
  const normalizeDice = (d: string): string => (/^d\d+$/i.test(d) ? `1${d.toLowerCase()}` : d);

  // Match "level X (YdZ)" or "X (YdZ)" — Y is optional to allow "(d10)".
  const parenMatches = [...text.matchAll(/(?:level\s*)?(5|11|17)\s*\((\d*d\d+)\)/gi)];
  for (const m of parenMatches) {
    damageByLevel.set(parseInt(m[1]), normalizeDice(m[2]));
  }

  // If no parenthetical matches, try "at level 5, 2d6" pattern
  if (damageByLevel.size === 0) {
    for (const level of [5, 11, 17]) {
      const regex = new RegExp(`(?:level\\s*${level}[^,\\d]*)((\\d*d\\d+))`, 'i');
      const match = text.match(regex);
      if (match) damageByLevel.set(level, normalizeDice(match[1]));
    }
  }

  // Determine damage type from text (look for "Acid damage", "Fire damage", etc.)
  const typeMatch = text.match(/(acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder)/i);
  const type = typeMatch
    ? typeMatch[1].charAt(0).toUpperCase() + typeMatch[1].slice(1).toLowerCase()
    : 'Unknown';

  for (const level of [5, 11, 17]) {
    if (damageByLevel.has(level)) {
      entries.push({
        atCharacterLevel: level as 5 | 11 | 17,
        damage: [{ dice: damageByLevel.get(level)!, type }],
      });
    }
  }

  return entries;
}

function parsePerSlotDamage(text: string, defaultType: string): SpellDamageEntry[] | undefined {
  // Pattern: "increases by 1d6 for each spell slot level above N"
  const match = text.match(/increases\s+by\s+(\d+d\d+)/i);
  if (!match) return undefined;

  // Try to find damage type in the text
  const typeMatch = text.match(/(acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder)/i);
  const type = typeMatch
    ? typeMatch[1].charAt(0).toUpperCase() + typeMatch[1].slice(1).toLowerCase()
    : defaultType;

  return [{ dice: match[1], type }];
}

// ── Markdown Parser ────────────────────────────────────────────

export interface ParsedSpell {
  name: string;
  level: number;
  school: string;
  classes: string[];
  castingTime: string;
  range: string;
  components: string;
  material?: string;
  duration: string;
  ritual: boolean;
  descriptionLines: string[];
  cantripUpgradeText?: string;
  usingAHigherLevelSpellSlotText?: string;
}

export function parseMarkdown(content: string): ParsedSpell[] {
  const spells: ParsedSpell[] = [];

  // Split into lines and process
  const lines = content.split('\n');

  let currentSpell: Partial<ParsedSpell> | null = null;
  let inDescription = false;
  let descriptionLines: string[] = [];
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip section headers like "### H Spells" or "## Spells"
    if (line.startsWith('#') && !line.startsWith('####')) {
      // Save previous spell before starting new section
      if (currentSpell && currentSpell.name) {
        currentSpell.descriptionLines = descriptionLines;
        spells.push(currentSpell as ParsedSpell);
      }
      currentSpell = null;
      inDescription = false;
      descriptionLines = [];
      continue;
    }

    // New spell starts with ####
    if (line.startsWith('####')) {
      // Save previous spell
      if (currentSpell && currentSpell.name) {
        currentSpell.descriptionLines = descriptionLines;
        spells.push(currentSpell as ParsedSpell);
      }

      // Start new spell
      const name = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      currentSpell = { name, descriptionLines: [] };
      inDescription = false;
      descriptionLines = [];
      currentSection = '';
      continue;
    }

    if (!currentSpell) continue;

    // Parse level/school line: *Level 2 Evocation (Wizard)* or *Evocation Cantrip (Sorcerer, Wizard)*
    if (line.startsWith('*') && line.includes('(') && !line.includes('**')) {
      const text = line.replace(/[*]/g, '').trim();

      // Check if cantrip
      const cantripMatch = text.match(/(\w+)\s+Cantrip/i);
      if (cantripMatch) {
        currentSpell.level = 0;
        currentSpell.school = cantripMatch[1];
      } else {
        // Level X School
        const levelMatch = text.match(/Level\s*(\d+)\s+(\w+)/i);
        if (levelMatch) {
          currentSpell.level = parseInt(levelMatch[1]);
          currentSpell.school = levelMatch[2];
        }
      }

      // Extract classes
      const classMatch = text.match(/\(([^)]+)\)/);
      if (classMatch) {
        currentSpell.classes = classMatch[1].split(',').map(c => c.trim());
      }

      continue;
    }

    // Parse bold fields
    if (line.includes('**Casting Time:**')) {
      currentSpell.castingTime = line.replace(/\*\*/g, '').replace('Casting Time:', '').trim();
      continue;
    }
    if (line.includes('**Range:**')) {
      currentSpell.range = line.replace(/\*\*/g, '').replace('Range:', '').trim();
      continue;
    }
    if (line.includes('**Components:**')) {
      const compLine = line.replace(/\*\*/g, '').replace('Components:', '').trim();
      currentSpell.components = compLine;
      // Extract material component
      const matMatch = compLine.match(/M\s*\(([^)]+)\)/i);
      if (matMatch) currentSpell.material = matMatch[1];
      continue;
    }
    if (line.includes('**Duration:**')) {
      currentSpell.duration = line.replace(/\*\*/g, '').replace('Duration:', '').trim();
      currentSpell.ritual = /ritual/i.test(currentSpell.duration || '');
      continue;
    }

    // Check for Cantrip Upgrade section (handles both **_Cantrip Upgrade._** and **Cantrip Upgrade.** variants)
    if (/\*\*_?Cantrip Upgrade/i.test(line)) {
      currentSpell.cantripUpgradeText = line
        .replace(/\*\*/g, '')
        .replace(/_?Cantrip Upgrade[._]*_?\s*/i, '')
        .trim();
      inDescription = false;
      continue;
    }

    // Check for Using a Higher-Level Spell Slot section
    if (/\*\*_?Using a Higher-Level Spell Slot/i.test(line)) {
      currentSpell.usingAHigherLevelSpellSlotText = line
        .replace(/\*\*/g, '')
        .replace(/_?Using a Higher-Level Spell Slot[._]*_?\s*/i, '')
        .trim();
      inDescription = false;
      continue;
    }

    // Skip empty lines when not in description
    if (!line.trim()) {
      if (inDescription) {
        descriptionLines.push('');
      }
      continue;
    }

    // Description lines (everything after the fields before Cantrip Upgrade or Using a Higher-Level)
    if (currentSpell.castingTime && !inDescription && !line.startsWith('**') && !line.startsWith('*')) {
      inDescription = true;
    }

    if (inDescription && !line.includes('**_Cantrip') && !line.includes('**_Using')) {
      descriptionLines.push(line.trim());
    }
  }

  // Don't forget the last spell
  if (currentSpell && currentSpell.name) {
    currentSpell.descriptionLines = descriptionLines;
    spells.push(currentSpell as ParsedSpell);
  }

  return spells;
}

// ── Transform to Spell ─────────────────────────────────────────

export function transformSpell(parsed: ParsedSpell): Spell {
  const descLines = parsed.descriptionLines || [];
  const mainDescription: string[] = [];
  let cantripUpgradeText = parsed.cantripUpgradeText || '';
  let usingAHigherLevelSpellSlotText = parsed.usingAHigherLevelSpellSlotText || '';

  // Process description lines (parseMarkdown already extracted Cantrip Upgrade /
  // Using a Higher-Level Spell Slot sections, so this loop just builds the description).
  for (const line of descLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (mainDescription.length > 0 && mainDescription[mainDescription.length - 1] !== '') {
        mainDescription.push('');
      }
      continue;
    }

    mainDescription.push(trimmed);
  }

  // Filter out empty strings at the end
  while (mainDescription.length > 0 && mainDescription[mainDescription.length - 1] === '') {
    mainDescription.pop();
  }

  const durationInfo = parseDuration(parsed.duration || '');
  const fullDesc = mainDescription.join(' ');

  const spell: Spell = {
    id: slugify(parsed.name || ''),
    name: parsed.name || '',
    level: parsed.level ?? 0,
    school: (parsed.school || 'Unknown').charAt(0).toUpperCase() + (parsed.school || 'unknown').slice(1).toLowerCase(),
    castingTime: parseCastingTime(parsed.castingTime || ''),
    range: parsed.range || 'Self',
    components: parseComponents(parsed.components || ''),
    duration: durationInfo.duration,
    concentration: durationInfo.concentration,
    ritual: checkRitual(parsed.castingTime || '', fullDesc),
    description: mainDescription,
    source: 'SRD 5.2',
  };

  if (parsed.classes) spell.classes = parsed.classes;

  // Cantrip upgrade: always preserve the raw text when present (some upgrades scale beams or
  // range rather than damage and can't be structured). Layer the parsed damage table on top
  // when parseCantripUpgrade can extract one.
  if (cantripUpgradeText) {
    spell.cantripUpgradeText = cantripUpgradeText;
    const entries = parseCantripUpgrade(cantripUpgradeText);
    if (entries.length > 0) spell.cantripUpgrade = entries;
  }

  // Parse using a higher level spell slot
  if (usingAHigherLevelSpellSlotText) {
    spell.usingAHigherLevelSpellSlot = [usingAHigherLevelSpellSlotText];
  }

  // Extract damage/heal/save/attack from description
  const damage = extractDamage(fullDesc);
  const heal = extractHeal(fullDesc);
  const save = extractSave(fullDesc);
  const attack = checkAttack(fullDesc);

  if (damage) {
    // If cantripUpgrade has "Unknown" type, try to get it from damage entries
    if (spell.cantripUpgrade) {
      const knownType = damage.entries.find(d => d.type !== 'Unknown')?.type;
      if (knownType) {
        for (const entry of spell.cantripUpgrade) {
          if (entry.damage) {
            for (const d of entry.damage) {
              if (d.type === 'Unknown') d.type = knownType;
            }
          }
        }
      }
    }

    // Parse usingAHigherLevelSpellSlot to get per-slot damage increase
    if (usingAHigherLevelSpellSlotText) {
      const perSlot = parsePerSlotDamage(usingAHigherLevelSpellSlotText, damage.entries[0]?.type || 'Unknown');
      if (perSlot) damage.perSlot = perSlot;
    }

    spell.damage = damage;
  }
  if (heal) spell.heal = heal;
  if (save) spell.save = save as Spell['save'];
  if (attack) spell.attack = attack;

  return spell;
}

// ── Main ──────────────────────────────────────────────────────

function main(): void {
  console.log(`Reading ${markdownPath}...`);
  const content = readFileSync(markdownPath, 'utf-8');

  const parsed = parseMarkdown(content);
  console.log(`Parsed ${parsed.length} spells from markdown`);

  const spells = parsed.map(p => transformSpell(p));

  // Load existing spells and merge
  let existing: Spell[] = [];
  if (existsSync(outputPath)) {
    existing = JSON.parse(readFileSync(outputPath, 'utf-8')) as Spell[];
    console.log(`Loaded ${existing.length} existing spells`);
  }

  // Merge: prefer new parsed spells, keep existing non-SRD spells
  const merged = new Map<string, Spell>();
  for (const s of spells) merged.set(s.id, s);
  for (const s of existing) {
    if (!merged.has(s.id)) merged.set(s.id, s);
  }

  const allSpells = Array.from(merged.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  writeFileSync(outputPath, JSON.stringify(allSpells, null, 2), 'utf-8');
  console.log(`Saved ${allSpells.length} spells to ${outputPath}`);

  // Stats
  const withCantrip = allSpells.filter(s => s.cantripUpgrade).length;
  const withHigherLevel = allSpells.filter(s => s.usingAHigherLevelSpellSlot).length;
  console.log(`Spells with cantripUpgrade: ${withCantrip}`);
  console.log(`Spells with usingAHigherLevelSpellSlot: ${withHigherLevel}`);
}

// Only run as CLI when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
