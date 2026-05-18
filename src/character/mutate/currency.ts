// character/mutate/currency.ts
// Currency-related character mutations

import type { Character, Currency } from '../../types/character';
import { withUpdate } from './hp';

export function modifyCurrency(char: Character, currency: Partial<Currency>): Character {
  const newCurrency: Currency = {
    cp: Math.max(0, char.currency.cp + (currency.cp ?? 0)),
    sp: Math.max(0, char.currency.sp + (currency.sp ?? 0)),
    ep: Math.max(0, char.currency.ep + (currency.ep ?? 0)),
    gp: Math.max(0, char.currency.gp + (currency.gp ?? 0)),
    pp: Math.max(0, char.currency.pp + (currency.pp ?? 0)),
  };

  return withUpdate(char, { currency: newCurrency });
}
