import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { handleCalendarSync } from '../src/http/calendar-sync';
import { ImportError } from '../src/ics-fetch';
import { syncCalendarImports, syncImport, type CalendarImport } from '../src/jobs/calendar-sync';
import { FakeDb } from './fake-db';

const NOW = new Date('2026-10-08T08:00:00Z');
const SECRET_URL = 'https://calendar.google.com/calendar/ical/x/private-SEGRETO/basic.ics';
const imp: CalendarImport = {
  id: 'imp1',
  space_id: 's1',
  user_id: 'u1',
  url: SECRET_URL,
  last_synced_at: null,
};
const ICS = (...events: string[][]) =>
  ['BEGIN:VCALENDAR', ...events.flatMap((e) => ['BEGIN:VEVENT', ...e, 'END:VEVENT']), 'END:VCALENDAR'].join(
    '\r\n',
  );
const cena = ['UID:cena', 'DTSTART:20261020T070000Z', 'DTEND:20261020T080000Z', 'SUMMARY:Cena'];
const dentista = ['UID:dentista', 'DTSTART:20261021T080000Z', 'SUMMARY:Dentista'];
const stub = (text: string) => vi.fn(async () => text);
const logged: unknown[][] = [];

beforeEach(() => {
  logged.length = 0;
  vi.spyOn(console, 'error').mockImplementation((...args) => void logged.push(args));
});
afterEach(() => vi.restoreAllMocks());

const eventsOf = (db: FakeDb) => db.rows('events').filter((e) => e.import_id === 'imp1');

describe('syncImport', () => {
  it('crea gli impegni importati con spazio, autore e identificatore esterno', async () => {
    const db = new FakeDb({ calendar_imports: [{ ...imp }] });
    const result = await syncImport(db.asDb(), imp, NOW, stub(ICS(cena, dentista)));
    expect(result).toEqual({ ok: true, written: 2, removed: 0 });
    expect(eventsOf(db)).toHaveLength(2);
    expect(eventsOf(db)[0]).toMatchObject({
      space_id: 's1',
      import_id: 'imp1',
      external_id: 'cena',
      kind: 'appuntamento',
      created_by: 'u1',
      title: 'Cena',
    });
    expect(db.rows('calendar_imports')[0]).toMatchObject({
      last_synced_at: NOW.toISOString(),
      last_error: null,
    });
  });

  it('ripetuta non duplica e non riscrive ciò che non è cambiato', async () => {
    const db = new FakeDb({ calendar_imports: [{ ...imp }] });
    await syncImport(db.asDb(), imp, NOW, stub(ICS(cena)));
    db.rows('events').forEach((e, i) => (e.id = `ev${i}`)); // il database assegna gli id
    const second = await syncImport(db.asDb(), imp, NOW, stub(ICS(cena)));
    expect(second).toEqual({ ok: true, written: 0, removed: 0 });
    expect(eventsOf(db)).toHaveLength(1);
  });

  it('aggiorna ciò che cambia e toglie ciò che sparisce, senza toccare stato e assegnatario', async () => {
    const db = new FakeDb({ calendar_imports: [{ ...imp }] });
    await syncImport(db.asDb(), imp, NOW, stub(ICS(cena, dentista)));
    db.rows('events').forEach((e, i) => (e.id = `ev${i}`));
    eventsOf(db)[0].status = 'done';
    eventsOf(db)[0].assignee_id = 'u2';
    const result = await syncImport(
      db.asDb(),
      imp,
      NOW,
      stub(ICS(['UID:cena', 'DTSTART:20261020T090000Z', 'SUMMARY:Cena tardi'])),
    );
    expect(result).toEqual({ ok: true, written: 1, removed: 1 });
    expect(eventsOf(db)).toHaveLength(1);
    expect(eventsOf(db)[0]).toMatchObject({
      title: 'Cena tardi',
      starts_at: '2026-10-20T09:00:00.000Z',
      status: 'done',
      assignee_id: 'u2',
    });
  });

  it('non tocca gli impegni di altri calendari né quelli creati a mano', async () => {
    const db = new FakeDb({
      calendar_imports: [{ ...imp }],
      events: [
        { id: 'mio', title: 'Creato a mano', starts_at: '2026-10-20T07:00:00.000Z', import_id: null },
        {
          id: 'altro',
          title: 'Altro',
          starts_at: '2026-10-20T07:00:00.000Z',
          import_id: 'imp2',
          external_id: 'z',
        },
      ],
    });
    await syncImport(db.asDb(), imp, NOW, stub(ICS(cena)));
    expect(db.rows('events').map((e) => e.id)).toEqual(expect.arrayContaining(['mio', 'altro']));
    expect(db.rows('events')).toHaveLength(3);
  });

  it('errore noto: messaggio per l’utente sul collegamento, nessun indirizzo nei log', async () => {
    const db = new FakeDb({ calendar_imports: [{ ...imp }] });
    const result = await syncImport(db.asDb(), imp, NOW, async () => {
      throw new ImportError('Il link non è un calendario');
    });
    expect(result).toMatchObject({ ok: false, error: 'Il link non è un calendario' });
    expect(db.rows('calendar_imports')[0]).toMatchObject({ last_error: 'Il link non è un calendario' });
    expect(JSON.stringify(logged)).not.toContain('SEGRETO');
  });

  it('errore imprevisto: messaggio generico, senza dettagli tecnici né indirizzo', async () => {
    const db = new FakeDb({ calendar_imports: [{ ...imp }] });
    const result = await syncImport(db.asDb(), imp, NOW, async () => {
      throw new TypeError(`fetch failed ${SECRET_URL}`);
    });
    expect(result.error).toBe('Sincronizzazione non riuscita');
    expect(db.rows('calendar_imports')[0].last_error).toBe('Sincronizzazione non riuscita'); // la riga ha l'URL: conta solo il messaggio
    expect(JSON.stringify(logged)).not.toContain('SEGRETO');
  });

  it('un errore non cancella gli impegni già importati', async () => {
    const db = new FakeDb({ calendar_imports: [{ ...imp }] });
    await syncImport(db.asDb(), imp, NOW, stub(ICS(cena)));
    await syncImport(db.asDb(), imp, NOW, async () => {
      throw new ImportError('Il calendario non risponde');
    });
    expect(eventsOf(db)).toHaveLength(1);
  });
});

describe('syncCalendarImports (cron)', () => {
  const env = {} as Env;
  it('sincronizza solo i calendari che ne hanno bisogno; un fallimento non ferma gli altri', async () => {
    const fresh = new Date(NOW.getTime() - 60_000).toISOString();
    const db = new FakeDb({
      calendar_imports: [
        { ...imp, id: 'imp1', url: 'https://a.example.it/x.ics' },
        { ...imp, id: 'imp2', url: 'https://rotto.example.it/x.ics' },
        { ...imp, id: 'imp3', url: 'https://c.example.it/x.ics', last_synced_at: fresh },
      ],
    });
    const fetchText = vi.fn(async (url: string) => {
      if (url.includes('rotto')) {
        throw new ImportError('Il calendario non risponde');
      }
      return ICS(cena);
    });
    const count = await syncCalendarImports(env, NOW, fetchText, db.asDb());
    expect(count).toBe(2);
    expect(fetchText).toHaveBeenCalledTimes(2);
    expect(eventsOf(db)).toHaveLength(1);
    expect(db.rows('calendar_imports').find((c) => c.id === 'imp2')?.last_error).toBe(
      'Il calendario non risponde',
    );
    expect(db.rows('calendar_imports').find((c) => c.id === 'imp1')?.last_error).toBeNull();
  });
});

describe('POST /calendar/sync', () => {
  const env = { APP_URL: 'https://app.example.it' } as Env;
  const seed = () =>
    new FakeDb({
      calendar_imports: [{ ...imp }],
      space_members: [
        { space_id: 's1', user_id: 'u1', role: 'member' },
        { space_id: 's1', user_id: 'viewer', role: 'viewer' },
      ],
    });
  const asUser = (db: FakeDb) =>
    Object.assign(db.asDb(), {
      auth: {
        getUser: async (token: string) => ({
          data: { user: ['u1', 'viewer', 'stranger'].includes(token) ? { id: token } : null },
        }),
      },
    });
  const post = (db: FakeDb, token: string | null, body: unknown, fetchText = stub(ICS(cena))) =>
    handleCalendarSync(
      new Request('https://w/calendar/sync', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(body),
      }),
      env,
      asUser(db),
      fetchText,
      NOW,
    );

  it('senza accesso: 401', async () => {
    expect((await post(seed(), null, { id: 'imp1' })).status).toBe(401);
    expect((await post(seed(), 'sconosciuto', { id: 'imp1' })).status).toBe(401);
  });

  it('richiesta senza id: 400', async () => {
    expect((await post(seed(), 'u1', {})).status).toBe(400);
  });

  it('chi non può scrivere nello spazio, o non ne fa parte, non lo vede: 404', async () => {
    const fetchText = stub(ICS(cena));
    expect((await post(seed(), 'viewer', { id: 'imp1' }, fetchText)).status).toBe(404);
    expect((await post(seed(), 'stranger', { id: 'imp1' }, fetchText)).status).toBe(404);
    expect(fetchText).not.toHaveBeenCalled();
  });

  it('un membro sincronizza subito e riceve l’esito, senza l’indirizzo', async () => {
    const db = seed();
    const res = await post(db, 'u1', { id: 'imp1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, written: 1, removed: 0 });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.it');
    expect(eventsOf(db)).toHaveLength(1);
  });

  it('premuto di nuovo subito dopo: non riscarica il calendario', async () => {
    const db = seed();
    db.rows('calendar_imports')[0].last_synced_at = new Date(NOW.getTime() - 5000).toISOString();
    const fetchText = stub(ICS(cena));
    const res = await post(db, 'u1', { id: 'imp1' }, fetchText);
    expect(await res.json()).toEqual({ ok: true, skipped: true });
    expect(fetchText).not.toHaveBeenCalled();
  });
});
