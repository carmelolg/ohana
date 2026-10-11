import { describe, expect, it } from 'vitest';
import { parseIcs, parseIcsDate, parseIcsDuration, wallToInstant } from '../src/ics-parse';

const wrap = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n');
const vevent = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');

describe('parseIcsDate', () => {
  it('UTC', () => {
    expect(parseIcsDate('20261020T070000Z')).toEqual({
      date: new Date('2026-10-20T07:00:00Z'),
      allDay: false,
    });
  });
  it('senza fuso vale Roma, estate e inverno', () => {
    expect(parseIcsDate('20261020T090000')?.date.toISOString()).toBe('2026-10-20T07:00:00.000Z');
    expect(parseIcsDate('20261201T090000')?.date.toISOString()).toBe('2026-12-01T08:00:00.000Z');
  });
  it('con TZID usa quel fuso', () => {
    expect(parseIcsDate('20261020T090000', { TZID: 'America/New_York' })?.date.toISOString()).toBe(
      '2026-10-20T13:00:00.000Z',
    );
  });
  it('fuso sconosciuto (nomi di Windows): ripiega su Roma', () => {
    expect(parseIcsDate('20261020T090000', { TZID: 'W. Europe Standard Time' })?.date.toISOString()).toBe(
      '2026-10-20T07:00:00.000Z',
    );
  });
  it('solo data: giorno intero, mezzanotte di Roma', () => {
    const r = parseIcsDate('20261101', { VALUE: 'DATE' });
    expect(r).toEqual({ date: new Date('2026-10-31T23:00:00Z'), allDay: true });
  });
  it('valore che non è una data', () => {
    expect(parseIcsDate('boh')).toBeNull();
  });
  it('wallToInstant: giorno del cambio ora (Roma, 25 ottobre 2026)', () => {
    expect(wallToInstant(2026, 10, 25, 12, 0, 'Europe/Rome').toISOString()).toBe('2026-10-25T11:00:00.000Z');
  });
});

describe('parseIcsDuration', () => {
  it.each([
    ['PT1H', 3_600_000],
    ['PT1H30M', 5_400_000],
    ['P1D', 86_400_000],
    ['P1W', 604_800_000],
    ['-PT15M', -900_000],
  ])('%s', (value, ms) => {
    expect(parseIcsDuration(value)).toBe(ms);
  });
  it('testo qualsiasi', () => {
    expect(parseIcsDuration('un’ora')).toBeNull();
  });
});

describe('parseIcs', () => {
  it('legge un impegno con testo protetto e righe piegate', () => {
    const [e] = parseIcs(
      wrap(
        vevent(
          'UID:abc@google.com',
          'DTSTART:20261020T070000Z',
          'DTEND:20261020T080000Z',
          String.raw`SUMMARY:Cena\, da Marta\; ore 20`,
          String.raw`DESCRIPTION:riga uno\nriga due con un testo molto lungo che viene pie`,
          ' gato dal programma',
          'LOCATION:Via Roma 1',
        ),
      ),
    );
    expect(e).toMatchObject({
      uid: 'abc@google.com',
      summary: 'Cena, da Marta; ore 20',
      description: 'riga uno\nriga due con un testo molto lungo che viene piegato dal programma',
      location: 'Via Roma 1',
      allDay: false,
      cancelled: false,
      rrule: null,
    });
    expect(e.end?.toISOString()).toBe('2026-10-20T08:00:00.000Z');
  });

  it('DURATION al posto di DTEND', () => {
    const [e] = parseIcs(wrap(vevent('UID:a', 'DTSTART:20261020T070000Z', 'DURATION:PT90M', 'SUMMARY:x')));
    expect(e.end?.toISOString()).toBe('2026-10-20T08:30:00.000Z');
  });

  it('ricorrenza con EXDATE (anche più date su una riga) e annullato', () => {
    const [e] = parseIcs(
      wrap(
        vevent(
          'UID:serie',
          'DTSTART;TZID=Europe/Rome:20261019T100000',
          'RRULE:FREQ=WEEKLY;BYDAY=MO',
          'EXDATE;TZID=Europe/Rome:20261026T100000,20261102T100000',
          'EXDATE;TZID=Europe/Rome:20261109T100000',
          'STATUS:CANCELLED',
          'SUMMARY:Palestra',
        ),
      ),
    );
    expect(e.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(e.exdates.map((d) => d.toISOString())).toEqual([
      '2026-10-26T09:00:00.000Z',
      '2026-11-02T09:00:00.000Z',
      '2026-11-09T09:00:00.000Z',
    ]);
    expect(e.cancelled).toBe(true);
  });

  it('occorrenza modificata (RECURRENCE-ID)', () => {
    const [e] = parseIcs(
      wrap(
        vevent(
          'UID:serie',
          'RECURRENCE-ID;TZID=Europe/Rome:20261026T100000',
          'DTSTART;TZID=Europe/Rome:20261026T150000',
          'SUMMARY:Palestra (spostata)',
        ),
      ),
    );
    expect(e.recurrenceId?.toISOString()).toBe('2026-10-26T09:00:00.000Z');
    expect(e.start.toISOString()).toBe('2026-10-26T14:00:00.000Z');
  });

  it('salta gli allarmi e gli impegni senza UID o senza inizio', () => {
    const events = parseIcs(
      wrap(
        vevent(
          'UID:a',
          'DTSTART:20261020T070000Z',
          'SUMMARY:ok',
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:non io',
          'TRIGGER:-PT15M',
          'END:VALARM',
        ),
        vevent('DTSTART:20261020T070000Z', 'SUMMARY:senza uid'),
        vevent('UID:b', 'SUMMARY:senza inizio'),
      ),
    );
    expect(events).toHaveLength(1);
    expect(events[0].description).toBeNull();
  });

  it('parametri tra virgolette con i due punti, fine riga LF', () => {
    const [e] = parseIcs(
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:q\nDTSTART:20261020T070000Z\nSUMMARY;LANGUAGE="it:IT":Ciao\nEND:VEVENT\nEND:VCALENDAR\n',
    );
    expect(e.summary).toBe('Ciao');
  });
});
