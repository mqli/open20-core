// tests/fixtures/equipment.ts
// Shared armor and weapon fixtures for tests

import type { Armor, Weapon } from '../../src/types/equipment';

// ── Armor Fixtures ──────────────────────────────────────

export const LEATHER_ARMOR: Armor = {
  id: 'Leather Armor',
  name: 'Leather Armor',
  type: 'armor',
  category: 'Light',
  baseAC: 11,
  dexBonus: true,
  equipped: true,
  weight: 10,
  cost: '10 gp',
};

export const CHAIN_MAIL: Armor = {
  id: 'Chain Mail',
  name: 'Chain Mail',
  type: 'armor',
  category: 'Heavy',
  baseAC: 16,
  dexBonus: false,
  strengthRequirement: 13,
  stealthDisadvantage: true,
  equipped: true,
  weight: 55,
  cost: '75 gp',
};

export const HALF_PLATE: Armor = {
  id: 'Half Plate',
  name: 'Half Plate',
  type: 'armor',
  category: 'Medium',
  baseAC: 15,
  dexBonus: true,
  dexCap: 2,
  stealthDisadvantage: true,
  equipped: true,
  weight: 40,
  cost: '750 gp',
};

export const SHIELD: Armor = {
  id: 'Shield',
  name: 'Shield',
  type: 'armor',
  category: 'Shield',
  baseAC: 2,
  dexBonus: false,
  equipped: true,
  weight: 6,
  cost: '10 gp',
};

export const STUDDED_LEATHER: Armor = {
  id: 'Studded Leather',
  name: 'Studded Leather',
  type: 'armor',
  category: 'Light',
  baseAC: 12,
  dexBonus: true,
  equipped: true,
  weight: 13,
  cost: '45 gp',
};

// ── Weapon Fixtures ─────────────────────────────────────

export const LONGSWORD: Weapon = {
  id: 'Longsword',
  name: 'Longsword',
  type: 'weapon',
  category: 'Martial',
  weight: 3,
  cost: '15 gp',
  equipped: false,
  damage: { entries: [{ dice: 'd8', type: 'Slashing' }], ability: 'Strength', bonus: 0 },
  properties: ['Versatile'],
  versatileDamage: 'd10',
  mastery: ['Topple'],
};

export const DAGGER: Weapon = {
  id: 'Dagger',
  name: 'Dagger',
  type: 'weapon',
  category: 'Simple',
  weight: 1,
  cost: '2 gp',
  equipped: false,
  damage: { entries: [{ dice: 'd4', type: 'Piercing' }], ability: 'Strength', bonus: 0 },
  properties: ['Finesse', 'Light', 'Thrown'],
  mastery: ['Nick'],
};

export const SHORTBOW: Weapon = {
  id: 'Shortbow',
  name: 'Shortbow',
  type: 'weapon',
  category: 'Simple',
  weight: 2,
  cost: '25 gp',
  equipped: false,
  damage: { entries: [{ dice: 'd6', type: 'Piercing' }], ability: 'Dexterity', bonus: 0 },
  properties: ['Ammunition', 'Two-Handed'],
  mastery: ['Vex'],
};

export const QUARTERSTAFF: Weapon = {
  id: 'Quarterstaff',
  name: 'Quarterstaff',
  type: 'weapon',
  source: 'test',
  category: 'Simple',
  weight: 4,
  cost: '2 sp',
  equipped: false,
  damage: { entries: [{ dice: 'd6', type: 'Bludgeoning' }], ability: 'Strength', bonus: 0 },
  properties: ['Versatile'],
  versatileDamage: 'd8',
  mastery: ['Sap'],
};

export const GREATAXE: Weapon = {
  id: 'Greataxe',
  name: 'Greataxe',
  type: 'weapon',
  category: 'Martial',
  weight: 7,
  cost: '30 gp',
  equipped: false,
  damage: { entries: [{ dice: 'd12', type: 'Slashing' }], ability: 'Strength', bonus: 0 },
  properties: ['Heavy', 'Two-Handed'],
  mastery: ['Cleave'],
};

// ── Helper Functions ────────────────────────────────────

/**
 * Creates an equipped weapon EquipmentItem reference.
 * Use with createMockDataLoader that has weapon data.
 */
export function makeEquippedWeapon(id: string, overrides?: Record<string, unknown>): { id: string; name: string; type: 'weapon'; weight: number; equipped: boolean } {
  return {
    id,
    name: id,
    type: 'weapon',
    weight: 3,
    equipped: true,
    ...overrides,
  };
}

/**
 * Creates an equipped armor EquipmentItem reference.
 */
export function makeEquippedArmor(id: string): { id: string; name: string; type: 'armor'; equipped: boolean } {
  return {
    id,
    name: id,
    type: 'armor',
    equipped: true,
  };
}

/**
 * Returns a Record of all standard weapons for use in mock DataLoader.
 */
export function getStandardWeapons(): Record<string, Weapon> {
  return {
    Longsword: LONGSWORD,
    Dagger: DAGGER,
    Shortbow: SHORTBOW,
    Quarterstaff: QUARTERSTAFF,
    Greataxe: GREATAXE,
  };
}

/**
 * Returns a Record of all standard armor for use in mock DataLoader.
 */
export function getStandardArmor(): Record<string, Armor> {
  return {
    'Leather Armor': LEATHER_ARMOR,
    'Chain Mail': CHAIN_MAIL,
    'Half Plate': HALF_PLATE,
    'Studded Leather': STUDDED_LEATHER,
    Shield: SHIELD,
  };
}
