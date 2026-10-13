import { describe, expect, it } from 'vitest';
import { overridesAfterEdit } from '../src/import-overrides';

const saved = { location: 'Via Roma 1', notes: null };

describe('overridesAfterEdit', () => {
  it('nessuna modifica: niente da tenere', () => {
    expect(overridesAfterEdit([], saved, saved)).toEqual([]);
  });
  it('un campo cambiato diventa «a mano»', () => {
    expect(overridesAfterEdit([], saved, { ...saved, location: 'Studio' })).toEqual(['location']);
    expect(overridesAfterEdit([], saved, { ...saved, notes: 'Portare la tessera' })).toEqual(['notes']);
  });
  it('un campo già a mano resta tale anche se non toccato', () => {
    expect(overridesAfterEdit(['notes'], saved, saved)).toEqual(['notes']);
  });
  it('ignora nomi sconosciuti', () => {
    expect(overridesAfterEdit(['title'], saved, saved)).toEqual([]);
  });
});
