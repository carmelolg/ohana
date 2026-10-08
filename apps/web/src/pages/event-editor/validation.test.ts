import { describe, expect, it } from 'vitest';
import { savedMessage, validateEvent } from './validation';

const ok = { title: 'Visita', isChore: false, assigneeId: null, startsAt: new Date(), spaceId: 's1' };

describe('validazione del salvataggio', () => {
  it('un impegno completo è valido', () => expect(validateEvent(ok)).toBeNull());
  it('segnala il primo campo che manca, in italiano', () => {
    expect(validateEvent({ ...ok, title: '' })).toBe('Scrivi un titolo');
    expect(validateEvent({ ...ok, startsAt: null })).toMatch(/Scegli quando/);
    expect(validateEvent({ ...ok, spaceId: '' })).toBe('Scegli uno spazio');
  });
  it('una faccenda deve avere un assegnatario', () => {
    expect(validateEvent({ ...ok, isChore: true })).toBe('Una faccenda deve essere assegnata a una persona');
    expect(validateEvent({ ...ok, isChore: true, assigneeId: 'u1' })).toBeNull();
  });
  it('messaggi di conferma', () => {
    expect(savedMessage(true, false)).toBe('Faccenda salvata');
    expect(savedMessage(true, true)).toBe('Faccenda aggiornata');
    expect(savedMessage(false, false)).toBe('Impegno salvato');
    expect(savedMessage(false, true)).toBe('Impegno aggiornato');
  });
});
