import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import type { Occurrence } from '../../lib/types';
import { isDeadline, metaLine, timeColumn } from './rowText';

const occ = (event: Partial<Occurrence['event']>, at = romeToDate(2026, 10, 8, 9, 0)): Occurrence =>
  ({
    key: 'k',
    at,
    event: { id: 'e', all_day: false, rrule: null, contacts: null, categories: null, ...event },
  }) as Occurrence;

describe('testi della riga di un impegno', () => {
  it("scadenza alle 09:00 → «ENTRO»; stesso orario di un impegno normale → l'orario", () => {
    const due = occ({ categories: { name: 'Scadenza', slug: 'scadenza' } });
    expect(isDeadline(due)).toBe(true);
    expect(timeColumn(due)).toBe('ENTRO');
    expect(timeColumn(occ({ categories: { name: 'Visita', slug: 'visita' } }))).toBe('09:00');
    expect(
      timeColumn(
        occ({ categories: { name: 'Scadenza', slug: 'scadenza' } }, romeToDate(2026, 10, 8, 15, 30)),
      ),
    ).toBe('15:30');
  });
  it('un giorno passato dalla pagina vince; «GIORNO» per gli eventi di tutto il giorno', () => {
    expect(timeColumn(occ({}), 'GIO 8')).toBe('GIO 8');
    expect(timeColumn(occ({ all_day: true }))).toBe('GIORNO');
  });
  it('dettagli: salta «Altro» e i vuoti', () => {
    const o = occ({
      categories: { name: 'Altro', slug: 'altro' },
      contacts: { name: 'Dott. Rossi', phone: null },
      rrule: 'FREQ=MONTHLY',
    });
    expect(metaLine(o, 'Casa mia', 'Luca')).toBe('Casa mia · accompagna Luca · Dott. Rossi · ogni mese');
    expect(metaLine(occ({}), undefined, null)).toBe('');
    // una cura dice anche a chi appartiene
    expect(metaLine(o, 'Casa mia', null, 'Papà · Morbo di Crohn')).toContain(
      'Casa mia · Papà · Morbo di Crohn',
    );
  });
});
