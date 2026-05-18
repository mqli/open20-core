// character/mutate/equipment.ts
// Equipment-related character mutations//

import type { Character, EquipmentItem } from '../../types';
import { recomputeDerivedStats } from '../recompute';
import { withUpdate } from './hp';

export function equipItem(char: Character, itemId: string): Character {
  const idx = char.equipment.findIndex(e => e.id === itemId);
  if (idx === -1) return char;

  const item = char.equipment[idx]!;
  if (item.equipped) return char;

  const newEquipment = [...char.equipment];
  newEquipment[idx] = { ...item, equipped: true };

  return withUpdate(char, { equipment: newEquipment });
}

export function unequipItem(char: Character, itemId: string): Character {
  const idx = char.equipment.findIndex(e => e.id === itemId);
  if (idx === -1) return char;

  const item = char.equipment[idx]!;
  if (!item.equipped) return char;

  const newEquipment = [...char.equipment];
  newEquipment[idx] = { ...item, equipped: false };

  return withUpdate(char, { equipment: newEquipment });
}

/**
 * Equip an item and recalculate derived stats (AC, attacks)
 * Use this for UI actions where stats need immediate update
 */
export function equipItemAndRecompute(
  char: Character,
  itemId: string,
  data: import('../../data/loader').DataLoader
): Character {
  const updatedChar = equipItem(char, itemId);
  if (updatedChar === char) return char;

  return recomputeDerivedStats(updatedChar, data);
}

/**
 * Unequip an item and recalculate derived stats (AC, attacks)
 * Use this for UI actions where stats need immediate update
 */
export function unequipItemAndRecompute(
  char: Character,
  itemId: string,
  data: import('../../data/loader').DataLoader
): Character {
  const updatedChar = unequipItem(char, itemId);
  if (updatedChar === char) return char;

  return recomputeDerivedStats(updatedChar, data);
}

export function addEquipment(char: Character, item: EquipmentItem): Character {
  return withUpdate(char, {
    equipment: [...char.equipment, item],
  });
}

export function removeEquipment(char: Character, itemId: string): Character {
  const idx = char.equipment.findIndex(e => e.id === itemId);
  if (idx === -1) return char;

  return withUpdate(char, {
    equipment: char.equipment.filter((_, i) => i !== idx),
  });
}
