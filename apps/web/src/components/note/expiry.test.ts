import { describe, expect, it } from 'vitest';
import { romeParts, romeToDate } from '@ohana/shared';
import { expiryDate } from './expiry';

const now = romeToDate(2026, 10, 8, 10, 0); // giovedì

describe('scadenza di una nota in bacheca', () => {
  it('non scade → nessuna data', () => expect(expiryDate('none', 'x', now)).toBeNull());
  it('fine di oggi, domani, 7 e 30 giorni: sempre le 23:59 di Roma', () => {
    expect(romeParts(expiryDate('today', '', now)!)).toMatchObject({ d: 8, h: 23, min: 59 });
    expect(romeParts(expiryDate('tomorrow', '', now)!)).toMatchObject({ d: 9, h: 23, min: 59 });
    expect(romeParts(expiryDate('week', '', now)!)).toMatchObject({ d: 15, h: 23, min: 59 });
    expect(romeParts(expiryDate('month', '', now)!)).toMatchObject({ m: 11, d: 7, h: 23, min: 59 });
  });
  it('«dal testo»: usa quanto scritto («fino a domenica»)', () => {
    expect(romeParts(expiryDate('auto', 'le chiavi le ho io fino a domenica', now)!)).toMatchObject({
      d: 11,
    });
    expect(expiryDate('auto', 'nessuna scadenza qui', now)).toBeNull();
  });
});
