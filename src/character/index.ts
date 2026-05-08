// character/index.ts
// Barrel export — character module public API

export { createCharacter } from './create';
export type { CreateCharacterParams } from './create';

export { levelUp } from './level-up';
export type { LevelUpOptions } from './level-up';
export type { RandomProvider } from './level-up';

export { shortRest, longRest } from './rest';

export {
  modifyHP,
  setTemporaryHP,
  consumeResource,
  recoverResource,
  consumeSpellSlot,
  recoverSpellSlot,
  toggleCondition,
  equipItem,
  unequipItem,
  equipItemAndRecompute,
  unequipItemAndRecompute,
  addEquipment,
  removeEquipment,
  prepareSpell,
  unprepareSpell,
  modifyCurrency,
} from './mutate';

export { validateCharacter } from './validate';
export type { ValidationError, ValidationResult } from './validate';

export { recomputeDerivedStats } from './recompute';
