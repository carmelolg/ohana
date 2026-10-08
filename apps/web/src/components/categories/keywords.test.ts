import { describe, expect, it } from 'vitest';
import { parseKeywords, sameKeywords } from './keywords';

describe('parole chiave delle categorie', () => {
  it('separa per virgola, punto e virgola o a capo; minuscole, senza doppioni', () => {
    expect(parseKeywords('Cane, gatto;  VETERINARIO\ncane, ')).toEqual(['cane', 'gatto', 'veterinario']);
  });
  it('testo vuoto → nessuna parola chiave', () => expect(parseKeywords('  , ; ')).toEqual([]));
  it('confronto per contenuto e ordine', () => {
    expect(sameKeywords(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameKeywords(['a'], ['b'])).toBe(false);
  });
});
