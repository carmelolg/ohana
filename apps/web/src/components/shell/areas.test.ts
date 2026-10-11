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
    expect(areaOf('/spazio/1')).toBe('famiglia');
  });
  it('non evidenzia nulla fuori dalle aree', () => {
    expect(areaOf('/nuovo')).toBeNull();
    expect(areaOf('/evento/1')).toBeNull();
    expect(areaOf('/spesaX')).toBeNull();
  });
});
