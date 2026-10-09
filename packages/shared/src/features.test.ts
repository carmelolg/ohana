import { describe, expect, it } from 'vitest';
import { featureOn, featureOnForRoles, featureOnIn, toggleFeature } from './features';

const space = (...disabled: string[]) => ({ disabled_features: disabled });

describe('funzioni opzionali per spazio', () => {
  it('di default tutto è acceso', () => {
    expect(featureOnIn({}, 'spesa')).toBe(true);
    expect(featureOnIn(space(), 'spese')).toBe(true);
  });
  it("spenta solo dove è nell'elenco", () => {
    expect(featureOnIn(space('spesa'), 'spesa')).toBe(false);
    expect(featureOnIn(space('spesa'), 'spese')).toBe(true);
  });
  it('in una vista composta basta uno spazio che la usa', () => {
    expect(featureOn([space('spesa'), space()], 'spesa')).toBe(true);
    expect(featureOn([space('spesa'), space('spesa')], 'spesa')).toBe(false);
  });
  it('senza spazi (caricamento) resta accesa', () => {
    expect(featureOn([], 'spesa')).toBe(true);
  });
  it('accendere e spegnere senza duplicati', () => {
    expect(toggleFeature([], 'spesa', false)).toEqual(['spesa']);
    expect(toggleFeature(['spesa'], 'spesa', false)).toEqual(['spesa']);
    expect(toggleFeature(['spesa', 'pratiche'], 'spesa', true)).toEqual(['pratiche']);
  });
  it('«cura» è una funzione di spazio come le altre', () => {
    expect(featureOnIn(space('cura'), 'cura')).toBe(false);
    expect(featureOnIn(space('spesa'), 'cura')).toBe(true);
  });
  it('chi è solo care_viewer in uno spazio ci vede soltanto la Cura', () => {
    const spaces = [
      { id: 'a', ...space() },
      { id: 'b', ...space() },
    ];
    const role = (id: string) => (id === 'b' ? 'care_viewer' : 'member');
    expect(featureOnForRoles(spaces, 'spesa', role)).toBe(true); // basta lo spazio A
    expect(featureOnForRoles([spaces[1]], 'spesa', role)).toBe(false);
    expect(featureOnForRoles([spaces[1]], 'cura', role)).toBe(true);
    expect(featureOnForRoles([], 'spesa', role)).toBe(true); // caricamento
  });
});
