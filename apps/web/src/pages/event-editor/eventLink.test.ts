import { describe, expect, it } from 'vitest';
import { eventSections, linkColumns, linkKey, linkKeyOfEvent, parseLinkKey } from './eventLink';

describe('collegamento dell’impegno', () => {
  it('chiave ⇄ collegamento', () => {
    const key = linkKey({ kind: 'procedure', id: 'p1' });
    expect(key).toBe('procedure:p1');
    expect(parseLinkKey(key)).toEqual({ kind: 'procedure', id: 'p1' });
    expect(parseLinkKey('')).toBeNull();
    expect(parseLinkKey('altro:x')).toBeNull();
  });

  it('colonne: una sola valorizzata, nessun collegamento le azzera entrambe', () => {
    expect(linkColumns('maintenance:m1')).toEqual({ linked_procedure_id: null, linked_maintenance_id: 'm1' });
    expect(linkColumns('procedure:p1')).toEqual({ linked_procedure_id: 'p1', linked_maintenance_id: null });
    expect(linkColumns('')).toEqual({ linked_procedure_id: null, linked_maintenance_id: null });
  });

  it('dall’impegno salvato alla chiave', () => {
    expect(linkKeyOfEvent({ linked_procedure_id: 'p1', linked_maintenance_id: null })).toBe('procedure:p1');
    expect(linkKeyOfEvent({ linked_procedure_id: null, linked_maintenance_id: 'm1' })).toBe('maintenance:m1');
    expect(linkKeyOfEvent({ linked_procedure_id: null, linked_maintenance_id: null })).toBe('');
  });
});

describe('eventSections', () => {
  const none = { isChore: false, careThreadId: '', linkKey: '' };
  it('visita: sezione Cura, niente collegamento', () => {
    expect(eventSections({ ...none, categorySlug: 'visita' })).toEqual({ care: true, link: false });
  });
  it('altra categoria: collegamento a pratica o manutenzione, niente Cura', () => {
    expect(eventSections({ ...none, categorySlug: 'burocrazia' })).toEqual({ care: false, link: true });
  });
  it('una faccenda non ha né l’una né l’altro', () => {
    expect(eventSections({ ...none, isChore: true, categorySlug: 'visita' })).toEqual({
      care: false,
      link: false,
    });
  });
  it('un collegamento già scelto non sparisce cambiando categoria', () => {
    expect(eventSections({ ...none, categorySlug: 'visita', linkKey: 'procedure:p1' }).link).toBe(true);
    expect(eventSections({ ...none, categorySlug: 'scadenza', careThreadId: 't1' }).care).toBe(true);
  });
});
