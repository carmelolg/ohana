import { describe, expect, it } from 'vitest';
import { validView } from './useMapPicker';

describe('vista salvata della mappa', () => {
  it('accetta coordinate e zoom sensati', () => {
    expect(validView({ c: { lat: 40.8, lng: 14.2 }, z: 12 })).toEqual({
      center: { lat: 40.8, lng: 14.2 },
      zoom: 12,
    });
  });
  it('scarta valori mancanti, vecchi o rovinati', () => {
    expect(validView(null)).toBeNull();
    expect(validView({})).toBeNull();
    expect(validView({ c: { lat: NaN, lng: 14 }, z: 12 })).toBeNull();
    expect(validView({ c: { lat: 40, lng: 14 }, z: 0 })).toBeNull();
    expect(validView({ c: { lat: 400, lng: 14 }, z: 5 })).toBeNull();
    expect(validView({ c: { lat: '40' as unknown as number, lng: 14 }, z: 5 })).toBeNull();
  });
});
