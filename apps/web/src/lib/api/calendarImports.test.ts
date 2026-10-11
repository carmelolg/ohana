import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('../config', () => ({ WORKER_URL: 'https://worker.example.it' }));
const { buildImportRow, syncCalendarNow, syncFailureMessage } = await import('./calendarImports');

const input = { spaceId: 's1', userId: 'u1', name: '  Famiglia  ', url: ' webcal://esempio.it/cal.ics ' };

describe('buildImportRow', () => {
  it('ripulisce nome e indirizzo e genera l’id sul dispositivo (idempotente per la coda)', () => {
    const row = buildImportRow(input);
    expect(row).toMatchObject({
      space_id: 's1',
      user_id: 'u1',
      name: 'Famiglia',
      url: 'https://esempio.it/cal.ics',
    });
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('senza nome', () => {
    expect(() => buildImportRow({ ...input, name: '   ' })).toThrow('Dai un nome al calendario');
  });
  it('indirizzo che non è un sito pubblico', () => {
    expect(() => buildImportRow({ ...input, url: 'http://192.168.1.2/cal.ics' })).toThrow(
      /Indirizzo non valido/,
    );
  });
});

describe('syncCalendarNow', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => Response.json({ ok: true, written: 3, removed: 1 })) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('chiama il Worker con l’accesso dell’utente e restituisce l’esito', async () => {
    expect(await syncCalendarNow('imp1')).toEqual({ ok: true, written: 3, removed: 1 });
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe('https://worker.example.it/calendar/sync');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init!.body as string)).toEqual({ id: 'imp1' });
  });
  it('risposta di errore: messaggio in italiano', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 404 })) as typeof fetch;
    await expect(syncCalendarNow('x')).rejects.toThrow('Calendario non trovato');
  });
  it('rete assente: messaggio chiaro, non l’errore del browser', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    await expect(syncCalendarNow('x')).rejects.toThrow('Controlla la connessione');
  });
});

describe('syncFailureMessage', () => {
  it('per stato', () => {
    expect(syncFailureMessage(401)).toMatch(/Accedi/);
    expect(syncFailureMessage(500)).toMatch(/connessione/);
  });
});
