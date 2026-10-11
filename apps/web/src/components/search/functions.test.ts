import { describe, expect, it } from 'vitest';
import { searchFunctions } from './functions';

describe('searchFunctions', () => {
  it('trova per nome e per parola chiave', () => {
    expect(searchFunctions('bollette', () => true).map((f) => f.to)).toEqual(['/scadenze']);
    expect(searchFunctions('PRATI', () => true).map((f) => f.to)).toEqual(['/pratiche']);
  });
  it('nasconde le funzioni spente', () => {
    expect(searchFunctions('spesa', (f) => f !== 'spesa')).toEqual([]);
  });
  it('senza testo non propone nulla', () => {
    expect(searchFunctions('  ', () => true)).toEqual([]);
  });
});
