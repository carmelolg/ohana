import { describe, expect, it } from 'vitest';
import { connectionStatus, knownFacts } from './status';

describe('stato di Emergenza', () => {
  it('offline mostra quando i dati sono stati salvati', () => {
    expect(connectionStatus(true, false, '2026-10-08T10:30:00Z')).toMatch(
      /^Senza connessione · dati salvati il 8 ottobre/,
    );
    expect(connectionStatus(true, false, null)).toBe('Senza connessione · dati salvati');
  });
  it('online: aggiornamento o disponibilità', () => {
    expect(connectionStatus(false, true, null)).toBe('Aggiorno…');
    expect(connectionStatus(false, false, null)).toBe('Disponibile anche senza connessione');
  });
  it('solo le info compilate', () => {
    expect(knownFacts(undefined)).toEqual([]);
    expect(knownFacts({ address: 'Via Roma 1', allergies: '', notes: 'x' })).toEqual([
      ['Indirizzo', 'Via Roma 1'],
      ['Note', 'x'],
    ]);
  });
});
