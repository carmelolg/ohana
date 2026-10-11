import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText, selectFeedEvents, type IcsEvent } from '../src/ics';

const base: IcsEvent = {
  id: 'e1',
  title: 'Idraulico',
  starts_at: '2026-10-20T07:00:00Z',
  ends_at: null,
  all_day: false,
  location: 'Via Roma 1',
  notes: 'portare chiavi',
  rrule: null,
  status: 'open',
  space_name: 'Casa',
  event_reminders: [],
};
const NOW = new Date('2026-10-07T08:00:00Z');
const ics = (e: Partial<IcsEvent>) => buildIcs([{ ...base, ...e }], 'Ohana', NOW);

describe('escapeIcsText', () => {
  it('protegge barra, punto e virgola, virgola e a capo', () => {
    expect(escapeIcsText('a\\b;c,d\ne\r\nf')).toBe(String.raw`a\\b\;c\,d\ne\nf`);
  });
  it('non tocca i caratteri HTML (non è un testo HTML)', () => {
    expect(escapeIcsText('Tom & <Jerry>')).toBe('Tom & <Jerry>');
  });
});

describe('buildIcs', () => {
  it('un impegno singolo resta in UTC e non porta il fuso', () => {
    const out = ics({});
    expect(out).toContain('DTSTART:20261020T070000Z');
    expect(out).toContain('DTEND:20261020T080000Z');
    expect(out).not.toContain('VTIMEZONE');
  });

  it('una ricorrenza porta l’ora di Roma e il fuso, così l’orario regge il cambio ora legale', () => {
    const out = ics({ rrule: 'FREQ=WEEKLY;BYDAY=MO' });
    expect(out).toContain('DTSTART;TZID=Europe/Rome:20261020T090000');
    expect(out).toContain('DTEND;TZID=Europe/Rome:20261020T100000');
    expect(out).toContain('TZID:Europe/Rome');
    expect(out).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
  });

  it('inverno: la stessa ricorrenza alle 10:00 solari è 09:00 UTC', () => {
    const out = ics({ starts_at: '2026-12-01T09:00:00Z', rrule: 'FREQ=DAILY' });
    expect(out).toContain('DTSTART;TZID=Europe/Rome:20261201T100000');
  });

  it('giorno intero: la data è quella di Roma, non quella UTC', () => {
    // mezzanotte romana del 1° novembre = 31 ottobre alle 23:00 UTC
    const out = ics({ all_day: true, starts_at: '2026-10-31T23:00:00Z' });
    expect(out).toContain('DTSTART;VALUE=DATE:20261101');
    expect(out).not.toContain('DTEND');
  });

  it('un impegno di Cura esce senza titolo, luogo, note né nome dello spazio', () => {
    const out = ics({
      title: 'Visita cardiologica papà',
      location: 'Ospedale',
      notes: 'ECG, pressione alta',
      private: true,
      event_reminders: [{ offset_minutes: 60 }],
    });
    expect(out).toContain('SUMMARY:Impegno di cura');
    expect(out).toContain('DTSTART:20261020T070000Z');
    for (const secret of ['cardiolog', 'papà', 'Ospedale', 'ECG', 'pressione', 'Casa']) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain('TRIGGER:-PT60M'); // il promemoria resta, con il titolo anonimo
  });

  it('suggerisce l’aggiornamento orario e dà un nome al calendario', () => {
    const out = ics({});
    expect(out).toContain('X-WR-CALNAME:Ohana');
    expect(out).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
  });
});

describe('selectFeedEvents', () => {
  const now = new Date('2026-10-07T08:00:00Z').getTime();
  const row = (over: Partial<IcsEvent>): IcsEvent => ({ ...base, ...over });

  it('esclude faccende e impegni importati (tornerebbero duplicati nel calendario d’origine)', () => {
    const rows = [
      row({ id: 'a' }),
      row({ id: 'b', kind: 'faccenda' }),
      row({ id: 'c', import_id: 'imp1' }),
      row({ id: 'd', kind: 'appuntamento', import_id: null }),
    ];
    expect(selectFeedEvents(rows, now).map((e) => e.id)).toEqual(['a', 'd']);
  });

  it('tiene gli ultimi 90 giorni e le ricorrenze di qualsiasi data', () => {
    const rows = [
      row({ id: 'recente', starts_at: '2026-08-01T08:00:00Z' }),
      row({ id: 'vecchio', starts_at: '2026-05-01T08:00:00Z' }),
      row({ id: 'serie', starts_at: '2024-01-01T08:00:00Z', rrule: 'FREQ=YEARLY' }),
    ];
    expect(selectFeedEvents(rows, now).map((e) => e.id)).toEqual(['recente', 'serie']);
  });
});
