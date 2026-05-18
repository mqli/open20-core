// character/mutate/index.ts
// Barrel export — all mutation functions

export {
  withUpdate,
  modifyHP,
  setTemporaryHP,
  applyTypedDamage,
} from './hp';

export {
  consumeResource,
  recoverResource,
} from './resources';

export {
  consumeSpellSlot,
  recoverSpellSlot,
  addAlwaysPreparedSpell,
  removeAlwaysPreparedSpell,
  addKnownSpell,
  removeKnownSpell,
  prepareSpellForClass,
  unprepareSpellForClass,
  learnCantripForClass,
  replaceCantripForClass,
  prepareSpell,
  unprepareSpell,
  learnCantrip,
  replaceCantrip,
} from './spells';

export {
  toggleCondition,
  startConcentration,
  endConcentration,
  makeConcentrationCheck,
} from './conditions';

export {
  equipItem,
  unequipItem,
  equipItemAndRecompute,
  unequipItemAndRecompute,
  addEquipment,
  removeEquipment,
} from './equipment';

export {
  modifyCurrency,
} from './currency';
