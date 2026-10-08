import { describe, expect, it } from 'vitest';
import { isFullScreenFlow } from './isFullScreenFlow';
import { isInMore } from './TabBar';
import { pickTabShortcut } from './tabShortcut';

describe('navigazione', () => {
  it('«Altro» è attivo nelle pagine che contiene', () => {
    expect(isInMore('/altro')).toBe(true);
    expect(isInMore('/rubrica')).toBe(true);
    expect(isInMore('/spazio/abc')).toBe(true);
    expect(isInMore('/oggi')).toBe(false);
    expect(isInMore('/spesa')).toBe(false);
  });
  it('«Altro» non si evidenzia se la pagina ha già la sua scheda nella barra', () => {
    expect(isInMore('/rubrica', '/rubrica')).toBe(false);
    expect(isInMore('/spese', '/spese')).toBe(false);
    expect(isInMore('/impostazioni', '/rubrica')).toBe(true);
  });
  it('a destra del «+» c’è la prima funzione accesa, così il «+» resta centrato', () => {
    const only =
      (...on: string[]) =>
      (f: string) =>
        on.includes(f);
    expect(pickTabShortcut(only('spesa', 'spese')).to).toBe('/spesa');
    expect(pickTabShortcut(only('spese')).to).toBe('/spese');
    expect(pickTabShortcut(only()).to).toBe('/rubrica');
  });
  it('flussi a schermo intero', () => {
    expect(isFullScreenFlow('/nuovo')).toBe(true);
    expect(isFullScreenFlow('/evento/1')).toBe(true);
    expect(isFullScreenFlow('/scansiona')).toBe(true);
    expect(isFullScreenFlow('/oggi')).toBe(false);
  });
});
