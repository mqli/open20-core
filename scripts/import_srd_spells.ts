#!/usr/bin/env node
/**
 * Transform SRD spells from dnd-data to local spells.json format.
 * Rewritten from Python to TypeScript.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Types ────────────────────────────────────────────────────────

interface DndDataSpell {
  name: string;
  properties?: { Level?: number; School?: string; 'Casting Time'?: string; Range?: string; 'data-RangeAoe'?: string; Duration?: string; Components?: string; Save?: string };
  description?: string;
  book?: string;
  publisher?: string;
  [key: string]: unknown;
}

interface CantripUpgradeEntry { atCharacterLevel: 5 | 11 | 17; damage?: { dice: string; type: string }[] }
interface SpellDamageEntry { dice: string; type: string }
interface SpellDamage { entries: SpellDamageEntry[]; additional?: SpellDamageEntry[] }
interface SpellHeal { dice: string }
interface Spell {
  id: string; name: string; level: number; school: string;
  castingTime: string; range: string; components: string[]; duration: string;
  concentration: boolean; ritual: boolean; description: string[];
  cantripUpgrade?: CantripUpgradeEntry[]; usingAHigherLevelSpellSlot?: string[];
  damage?: SpellDamage; heal?: SpellHeal; save?: string; attack?: boolean;
  source: string; classes?: string[];
}

// ── Config ───────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localSpellsPath = resolve(__dirname, '..', 'static', 'srd', 'spells.json');

// ── Helpers ────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function parseComponents(compStr: string | undefined): string[] {
  if (!compStr) return [];
  const upper = compStr.toUpperCase();
  const comps: string[] = [];
  if (upper.includes('V')) comps.push('V');
  if (upper.includes('S')) comps.push('S');
  if (upper.includes('M')) comps.push('M');
  return comps;
}

function parseCastingTime(ct: string | undefined): string {
  if (!ct) return 'Action';
  if (/bonus\s*action/i.test(ct)) return 'Bonus Action';
  if (/reaction/i.test(ct)) return 'Reaction';
  return 'Action';
}

function parseDuration(durationStr: string | undefined): { duration: string; concentration: boolean } {
  if (!durationStr) return { duration: 'Instantaneous', concentration: false };
  return { duration: durationStr, concentration: /concentration/i.test(durationStr) };
}

function checkRitual(castingTime: string, description: string): boolean {
  return /ritual/i.test(castingTime) || /ritual/i.test(description);
}

function extractSave(description: string): string | undefined {
  for (const save of ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']) {
    if (new RegExp(`\\b${save}\\b`, 'i').test(description)) return save;
  }
  return undefined;
}

function checkAttack(description: string): boolean {
  return /attack/i.test(description) || /ranged spell attack/i.test(description);
}

function extractDamage(description: string): SpellDamage | undefined {
  const matches = [...description.matchAll(/(\d+d\d+(?:\s*\+\s*\d+)?)\s+(acid|cold|fire|force|lightning|necrotic|poison|radiant|thunder)/gi)];
  if (matches.length === 0) return undefined;
  return { entries: matches.map(m => ({ dice: m[1], type: m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase() })) };
}

function extractHeal(description: string): SpellHeal | undefined {
  if (!/regain|heal|hit point/i.test(description)) return undefined;
  const m = description.match(/(\d+d\d+)/);
  return m ? { dice: m[1] } : undefined;
}

// ── Description Parsing ─────────────────────────────────────────

function parseDescription(fullDescription: string): {
  description: string[]; cantripUpgrade?: CantripUpgradeEntry[]; usingAHigherLevelSpellSlot?: string[];
} {
  let desc = fullDescription.trim();

  // Extract "Cantrip Upgrade." section
  let cantripUpgradeText = '';
  const cantripIdx = desc.search(/Cantrip Upgrade/i);
  if (cantripIdx >= 0) {
    const nextIdx = desc.indexOf('Using a Higher-Level Spell Slot', cantripIdx);
    if (nextIdx >= 0) {
      cantripUpgradeText = desc.substring(cantripIdx, nextIdx).replace(/Cantrip Upgrade\.?\s*/i, '').trim();
      desc = desc.substring(0, cantripIdx) + ' ' + desc.substring(nextIdx);
    } else {
      cantripUpgradeText = desc.substring(cantripIdx).replace(/Cantrip Upgrade\.?\s*/i, '').trim();
      desc = desc.substring(0, cantripIdx);
    }
  }

  // Extract "Using a Higher-Level Spell Slot." section
  let usingAHigherLevelSpellSlotText = '';
  const higherLevelIdx = desc.search(/Using a Higher-Level Spell Slot/i);
  if (higherLevelIdx >= 0) {
    usingAHigherLevelSpellSlotText = desc.substring(higherLevelIdx).replace(/Using a Higher-Level Spell Slot\.?\s*/i, '').trim();
    desc = desc.substring(0, higherLevelIdx);
  }

  desc = desc.replace(/\s+/g, ' ').trim();

  const mainDescription = desc.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  const result: { description: string[]; cantripUpgrade?: CantripUpgradeEntry[]; usingAHigherLevelSpellSlot?: string[] } = {
    description: mainDescription.length > 0 ? mainDescription : (desc ? [desc] : [])
  };

  if (cantripUpgradeText) result.cantripUpgrade = parseCantripUpgrade(cantripUpgradeText);
  if (usingAHigherLevelSpellSlotText) result.usingAHigherLevelSpellSlot = [usingAHigherLevelSpellSlotText];

  return result;
}

function parseCantripUpgrade(text: string): CantripUpgradeEntry[] {
  const entries: CantripUpgradeEntry[] = [];
  for (const m of text.matchAll(/(\d+)\s*\((\d+d\d+)\)/g)) {
    const level = parseInt(m[1], 10);
    if (level === 5 || level === 11 || level === 17) {
      const typeMatch = text.match(/(\d+d\d+)\s+(acid|cold|fire|force|lightning|necrotic|poison|radiant|thunder)/i);
      const type = typeMatch ? typeMatch[2].charAt(0).toUpperCase() + typeMatch[2].slice(1).toLowerCase() : 'Unknown';
      entries.push({ atCharacterLevel: level as 5 | 11 | 17, damage: [{ dice: m[2], type }] });
    }
  }
  return entries;
}

function migrateSpell(old: Record<string, unknown>): Spell {
  const spell = { ...old } as Record<string, unknown>;
  if (typeof spell.description === 'string') spell.description = [spell.description as string];
  delete spell.upcast;
  if (spell.damage && typeof spell.damage === 'object') delete (spell.damage as Record<string, unknown>).higherLevel;
  if (spell.heal && typeof spell.heal === 'object') delete (spell.heal as Record<string, unknown>).higherLevel;
  return spell as unknown as Spell;
}

// ── SRD Filter ────────────────────────────────────────────────

function isSrdSpell(spell: DndDataSpell): boolean {
  const pub = (spell.publisher || '').toLowerCase();
  const book = (spell.book || '').toLowerCase();
  if (pub.includes('wizards')) return true;
  for (const s of ['player', 'free basic', 'essentials', 'monster manual', "player's handbook"]) {
    if (book.includes(s)) return true;
  }
  return false;
}

// ── Transform ──────────────────────────────────────────────────

function transformSpell(spell: DndDataSpell): Spell {
  const props = spell.properties || {};
  const desc = spell.description || '';
  const parsed = parseDescription(desc);

  const result: Spell = {
    id: slugify(spell.name || ''),
    name: spell.name || '',
    level: props.Level ?? 0,
    school: (props.School || 'Unknown').charAt(0).toUpperCase() + (props.School || 'unknown').slice(1).toLowerCase(),
    castingTime: parseCastingTime(props['Casting Time']),
    range: props.Range || props['data-RangeAoe'] || 'Self',
    components: parseComponents(props.Components),
    duration: props.Duration || 'Instantaneous',
    concentration: /concentration/i.test(props.Duration || ''),
    ritual: checkRitual(props['Casting Time'] || '', desc),
    description: parsed.description,
    source: spell.book || spell.publisher || 'Unknown'
  };

  if (parsed.cantripUpgrade) result.cantripUpgrade = parsed.cantripUpgrade;
  if (parsed.usingAHigherLevelSpellSlot) result.usingAHigherLevelSpellSlot = parsed.usingAHigherLevelSpellSlot;

  const damage = extractDamage(desc);
  const heal = extractHeal(desc);
  const save = extractSave(desc);
  const attack = checkAttack(desc);

  if (damage) result.damage = damage;
  if (heal) result.heal = heal;
  if (save) result.save = save;
  if (attack) result.attack = attack;

  return result;
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Fetching dnd-data spells...');
  const url = 'https://raw.githubusercontent.com/nick-aschenbach/dnd-data/main/data/spells.json';
  let dndSpells: DndDataSpell[];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dndSpells = await res.json() as DndDataSpell[];
  } catch (err) {
    console.error('Failed to fetch:', err);
    process.exit(1);
  }

  console.log(`Total: ${dndSpells.length}`);
  const srdSpells = dndSpells.filter(isSrdSpell);
  console.log(`SRD: ${srdSpells.length}`);

  const transformed = srdSpells.map(s => transformSpell(s));
  console.log(`Transformed: ${transformed.length}`);

  // Load existing
  let existing: Spell[] = [];
  if (existsSync(localSpellsPath)) {
    existing = JSON.parse(readFileSync(localSpellsPath, 'utf-8')) as Spell[];
    console.log(`Existing: ${existing.length}`);
  }

  // Merge: prefer transformed for SRD spells
  const merged = new Map<string, Spell>();
  for (const s of transformed) merged.set(s.id, s);
  for (const s of existing) {
    if (!merged.has(s.id)) merged.set(s.id, migrateSpell(s as unknown as Record<string, unknown>));
  }

  // Sort
  const allSpells = Array.from(merged.values()).sort((a, b) => a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name));

  writeFileSync(localSpellsPath, JSON.stringify(allSpells, null, 2), 'utf-8');
  console.log(`Saved ${allSpells.length} spells to ${localSpellsPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
