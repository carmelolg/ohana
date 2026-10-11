import { describe, expect, it } from 'vitest';
import {
  importedEvents,
  importIsDue,
  importWindow,
  MAX_IMPORTED,
  planSync,
  SYNC_EVERY_MS,
  type ImportedEvent,
  type StoredImport,
} from '../src/calendar-import';
import { parseIcs } from '../src/ics-parse';

const NOW = new Date('2026-10-08T08:00:00Z');
const WIN = importWindow(NOW);
const ics = (...events: string[][]) =>
  parseIcs(
    ['BEGIN:VCALENDAR', ...events.flatMap((e) => ['BEGIN:VEVENT', ...e, 'END:VEVENT']), 'END:VCALENDAR'].join(
      '\r\n',
    ),
  );
const ids = (events: ImportedEvent[]) => events.map((e) => e.external_id);

describe('importedEvents', () => {
  it('un impegno singolo dentro la finestra: id = UID, durata mantenuta', () => {
    const [e] = importedEvents(
      ics([
        'UID:a',
        'DTSTART:20261020T070000Z',
        'DTEND:20261020T083000Z',
        'SUMMARY:Cena',
        'LOCATION:Da Marta',
      ]),
      WIN,
    );
    expect(e).toMatchObject({
      external_id: 'a',
      title: 'Cena',
      starts_at: '2026-10-20T07:00:00.000Z',
      ends_at: '2026-10-20T08:30:00.000Z',
      all_day: false,
      location: 'Da Marta',
    });
  });

  it('fuori finestra: troppo vecchio o troppo lontano', () => {
    const out = importedEvents(
      ics(
        ['UID:vecchio', 'DTSTART:20250101T070000Z', 'SUMMARY:x'],
        ['UID:lontano', 'DTSTART:20300101T070000Z', 'SUMMARY:x'],
        ['UID:ok', 'DTSTART:20261020T070000Z', 'SUMMARY:x'],
      ),
      WIN,
    );
    expect(ids(out)).toEqual(['ok']);
  });

  it('annullato: sparisce, sia il singolo sia la serie', () => {
    const out = importedEvents(
      ics(
        ['UID:a', 'DTSTART:20261020T070000Z', 'STATUS:CANCELLED', 'SUMMARY:x'],
        ['UID:b', 'DTSTART:20261020T070000Z', 'RRULE:FREQ=DAILY;COUNT=3', 'STATUS:CANCELLED', 'SUMMARY:x'],
      ),
      WIN,
    );
    expect(out).toEqual([]);
  });

  it('giorno intero: mezzanotte di Roma, nessuna fine', () => {
    const [e] = importedEvents(
      ics(['UID:g', 'DTSTART;VALUE=DATE:20261101', 'DTEND;VALUE=DATE:20261102', 'SUMMARY:Ponte']),
      WIN,
    );
    expect(e).toMatchObject({ starts_at: '2026-10-31T23:00:00.000Z', ends_at: null, all_day: true });
  });

  it('titolo vuoto, testi lunghi', () => {
    const [e] = importedEvents(
      ics(['UID:t', 'DTSTART:20261020T070000Z', 'SUMMARY:', `DESCRIPTION:${'x'.repeat(5000)}`]),
      WIN,
    );
    expect(e.title).toBe('Senza titolo');
    expect(e.notes).toHaveLength(2000);
  });

  describe('ricorrenze', () => {
    const weekly = [
      'UID:palestra',
      'DTSTART;TZID=Europe/Rome:20261019T100000',
      'DTEND;TZID=Europe/Rome:20261019T110000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=6',
      'SUMMARY:Palestra',
    ];

    it('si espande in occorrenze con l’ora di Roma costante attraverso il cambio ora legale', () => {
      const out = importedEvents(ics(weekly), WIN);
      expect(out.map((e) => e.starts_at)).toEqual([
        '2026-10-19T08:00:00.000Z', // ora legale
        '2026-10-26T09:00:00.000Z', // dal 25 ottobre: ora solare
        '2026-11-02T09:00:00.000Z',
        '2026-11-09T09:00:00.000Z',
        '2026-11-16T09:00:00.000Z',
        '2026-11-23T09:00:00.000Z',
      ]);
      expect(out[1].ends_at).toBe('2026-10-26T10:00:00.000Z');
      expect(out[0].external_id).toBe('palestra@20261019T080000Z');
    });

    it('le date escluse (EXDATE) non compaiono', () => {
      const out = importedEvents(ics([...weekly, 'EXDATE;TZID=Europe/Rome:20261102T100000']), WIN);
      expect(out.map((e) => e.starts_at.slice(0, 10))).toEqual([
        '2026-10-19',
        '2026-10-26',
        '2026-11-09',
        '2026-11-16',
        '2026-11-23',
      ]);
    });

    it('un’occorrenza spostata sostituisce l’originale con lo stesso identificatore', () => {
      const out = importedEvents(
        ics(weekly, [
          'UID:palestra',
          'RECURRENCE-ID;TZID=Europe/Rome:20261026T100000',
          'DTSTART;TZID=Europe/Rome:20261026T150000',
          'SUMMARY:Palestra (spostata)',
        ]),
        WIN,
      );
      const moved = out.filter((e) => e.external_id === 'palestra@20261026T090000Z');
      expect(moved).toHaveLength(1);
      expect(moved[0]).toMatchObject({ title: 'Palestra (spostata)', starts_at: '2026-10-26T14:00:00.000Z' });
      expect(out).toHaveLength(6); // nessun doppione
    });

    it('un’occorrenza annullata (override CANCELLED) non compare', () => {
      const out = importedEvents(
        ics(weekly, [
          'UID:palestra',
          'RECURRENCE-ID;TZID=Europe/Rome:20261026T100000',
          'DTSTART;TZID=Europe/Rome:20261026T100000',
          'STATUS:CANCELLED',
          'SUMMARY:x',
        ]),
        WIN,
      );
      expect(out.map((e) => e.starts_at.slice(0, 10))).not.toContain('2026-10-26');
      expect(out).toHaveLength(5);
    });

    it('una serie infinita si ferma alla finestra', () => {
      const out = importedEvents(
        ics(['UID:d', 'DTSTART:20260101T070000Z', 'RRULE:FREQ=DAILY', 'SUMMARY:x']),
        WIN,
      );
      expect(out.length).toBeGreaterThan(300);
      expect(out.length).toBeLessThan(400);
      expect(new Date(out[out.length - 1].starts_at) <= WIN.to).toBe(true);
    });
  });

  it('oltre il tetto si tengono i più vicini', () => {
    const many = Array.from({ length: MAX_IMPORTED + 50 }, (_, i) => [
      `UID:e${i}`,
      `DTSTART:${new Date(Date.UTC(2026, 9, 9, 0, 0) + i * 60_000)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')}`,
      'SUMMARY:x',
    ]);
    const out = importedEvents(ics(...many), WIN);
    expect(out).toHaveLength(MAX_IMPORTED);
    expect(out[0].external_id).toBe('e0');
  });
});

describe('planSync', () => {
  const ev = (over: Partial<ImportedEvent>): ImportedEvent => ({
    external_id: 'a',
    title: 'Cena',
    starts_at: '2026-10-20T07:00:00.000Z',
    ends_at: null,
    all_day: false,
    location: null,
    notes: null,
    ...over,
  });
  const stored = (over: Partial<StoredImport>): StoredImport => ({ id: 'row-a', ...ev({}), ...over });

  it('ripetere la stessa sincronizzazione non scrive nulla', () => {
    expect(planSync([stored({})], [ev({})], WIN)).toEqual({ upserts: [], removeIds: [] });
  });

  it('un orario scritto in altro formato (stesso istante) non conta come cambio', () => {
    const plan = planSync([stored({ starts_at: '2026-10-20T07:00:00+00:00' })], [ev({})], WIN);
    expect(plan.upserts).toEqual([]);
  });

  it('nuovo e modificato vanno scritti', () => {
    const plan = planSync(
      [stored({}), stored({ id: 'row-b', external_id: 'b' })],
      [ev({ title: 'Cena da Luca' }), ev({ external_id: 'b' }), ev({ external_id: 'c' })],
      WIN,
    );
    expect(plan.upserts.map((u) => u.external_id)).toEqual(['a', 'c']);
    expect(plan.removeIds).toEqual([]);
  });

  it('sparito dal calendario: si toglie se è nella finestra, si conserva se è più vecchio', () => {
    const plan = planSync(
      [
        stored({ id: 'dentro', external_id: 'x', starts_at: '2026-10-25T07:00:00.000Z' }),
        stored({ id: 'storia', external_id: 'y', starts_at: '2025-01-01T07:00:00.000Z' }),
      ],
      [],
      WIN,
    );
    expect(plan.removeIds).toEqual(['dentro']);
  });
});

describe('importIsDue', () => {
  it('mai sincronizzato', () => {
    expect(importIsDue({ last_synced_at: null }, NOW)).toBe(true);
  });
  it('subito dopo un giro di cron no, al giro successivo sì', () => {
    const last = new Date(NOW.getTime() - SYNC_EVERY_MS + 1000).toISOString();
    expect(importIsDue({ last_synced_at: last }, NOW)).toBe(false);
    expect(importIsDue({ last_synced_at: new Date(NOW.getTime() - SYNC_EVERY_MS).toISOString() }, NOW)).toBe(
      true,
    );
  });
});
