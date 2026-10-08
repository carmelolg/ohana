import { describe, expect, it } from 'vitest';
import { settingsRedirect } from './settingsRedirect';

describe('impostazioni dello spazio selezionato', () => {
  it('porta alle impostazioni del nuovo spazio scelto dal selettore', () => {
    expect(settingsRedirect('b', 'a')).toBe('/spazio/b');
  });

  it('non si muove se l’URL è già quello dello spazio scelto', () => {
    expect(settingsRedirect('a', 'a')).toBeNull();
  });

  it('con «Tutti gli spazi» resta sulla pagina aperta', () => {
    expect(settingsRedirect('all', 'a')).toBeNull();
  });
});
