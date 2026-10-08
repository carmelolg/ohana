import { describe, expect, it } from 'vitest';
import { subtitleOf } from './ProcedureHeader';

describe('sottotitolo della pratica', () => {
  it('spazio e responsabile (solo nome)', () => {
    expect(subtitleOf('Mamma e papà', 'Chiara Rossi')).toBe('Mamma e papà · segue Chiara');
  });
  it('senza responsabile o senza spazio', () => {
    expect(subtitleOf('Casa', null)).toBe('Casa');
    expect(subtitleOf(undefined, 'Luca')).toBe('segue Luca');
    expect(subtitleOf(undefined, null)).toBe('');
  });
});
