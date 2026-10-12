import { describe, expect, it } from 'vitest';
import { areaOf } from './areas';

describe('areaOf', () => {
  it('assegna ogni pagina a una delle quattro aree', () => {
    expect(areaOf('/oggi')).toBe('oggi');
    expect(areaOf('/calendario')).toBe('agenda');
    expect(areaOf('/spesa')).toBe('casa');
    expect(areaOf('/pratiche/abc')).toBe('casa');
    expect(areaOf('/cura/xyz/terapie')).toBe('famiglia');
    expect(areaOf('/altro')).toBe('famiglia');
    expect(areaOf('/bacheca')).toBe('famiglia');
    expect(areaOf('/impostazioni')).toBe('impostazioni');
  });
  it('non evidenzia nulla fuori dalle aree', () => {
    expect(areaOf('/nuovo')).toBeNull();
    expect(areaOf('/evento/1')).toBeNull();
    expect(areaOf('/spesaX')).toBeNull();
    // le impostazioni dello spazio non sono dentro Famiglia: aprirle non deve espandere quel gruppo
    expect(areaOf('/spazio/1')).toBeNull();
  });
});
