import { describe, expect, it } from 'vitest';
import { isCompleteLoginCode, normalizeLoginCode } from './loginCode';

describe('codice di accesso', () => {
  it("toglie spazi e trattini incollati dall'email", () => {
    expect(normalizeLoginCode(' 123 456 ')).toBe('123456');
    expect(normalizeLoginCode('1234-5678')).toBe('12345678');
  });

  it('ignora le lettere e taglia oltre 10 cifre', () => {
    expect(normalizeLoginCode('12ab34')).toBe('1234');
    expect(normalizeLoginCode('123456789012')).toBe('1234567890');
  });

  it('accetta codici da 6 e da 8 cifre, rifiuta quelli troppo corti', () => {
    expect(isCompleteLoginCode('12345')).toBe(false);
    expect(isCompleteLoginCode('123456')).toBe(true);
    expect(isCompleteLoginCode('12345678')).toBe(true);
  });
});
