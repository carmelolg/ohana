import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { romeToDate } from '@ohana/shared';
import type { Env } from '../src/env';
import { FakeDb } from './fake-db';

let current: FakeDb;
vi.mock('../src/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/db')>()),
  createDb: () => current.asDb(),
}));
const { dispatch } = await import('../src/jobs/dispatch');
const { enqueue } = await import('../src/jobs/enqueue');
const { sendBriefs } = await import('../src/jobs/morning-brief');
const { sendBoardPushes } = await import('../src/jobs/board-push');

const env = {
  SUPABASE_URL: 'x',
  SUPABASE_SERVICE_ROLE_KEY: 'x',
  RESEND_API_KEY: 'k',
  MAIL_FROM: 'Ohana <a@b.it>',
  ACTION_SECRET: 'segreto',
  APP_URL: 'http://app',
  WORKER_URL: 'http://worker',
  VAPID_PUBLIC_KEY: '',
  VAPID_PRIVATE_KEY: '',
  VAPID_SUBJECT: 'mailto:a@b.it',
} as Env;
const now = new Date('2026-10-08T08:00:00Z');
const emails: { to: string; subject: string; html: string }[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  emails.length = 0;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (String(url).startsWith('https://api.resend.com')) {
      emails.push(JSON.parse(String(init?.body)));
      return new Response('{}');
    }
    return realFetch(url, init);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const user = {
  id: 'u1',
  first_name: 'Giulia',
  last_name: 'Neri',
  nickname: null,
  email: 'giulia@example.it',
  notify_email: true,
  morning_brief: false,
  notify_chores_push: false,
  morning_brief_time: '07:30:00',
};
const event = (over: Record<string, unknown> = {}) => ({
  id: 'e1',
  space_id: 's1',
  title: 'Visita <b>oculista</b>',
  location: null,
  notes: null,
  status: 'open',
  rrule: null,
  kind: 'appuntamento',
  starts_at: '2026-10-08T14:00:00Z',
  assignee_id: null,
  spaces: { name: 'Casa', color_hue: 42 },
  contacts: null,
  event_reminders: [{ offset_minutes: 360, channels: ['email'] }],
  ...over,
});
const queued = (over: Record<string, unknown> = {}) => ({
  id: 'q1',
  event_id: 'e1',
  occurrence_at: '2026-10-08T14:00:00Z',
  send_at: '2026-10-08T08:00:00Z',
  user_id: 'u1',
  channel: 'email',
  sent_at: null,
  attempts: 0,
  ...over,
});

describe('dispatch', () => {
  it("invia l'email una sola volta, con i link firmati e il titolo escapato", async () => {
    current = new FakeDb({
      reminder_queue: [queued()],
      events: [event()],
      profiles: [user],
      push_subscriptions: [],
    });
    expect(await dispatch(env, now)).toEqual({ sent: 1, failed: 0 });
    expect(await dispatch(env, now)).toEqual({ sent: 0, failed: 0 });
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('giulia@example.it');
    expect(emails[0].html).toContain('/azione/');
    expect(emails[0].html).not.toContain('<b>oculista</b>');
    expect(emails[0].html).toContain('&lt;b&gt;oculista&lt;/b&gt;');
    expect(current.rows('reminder_queue')[0].sent_at).not.toBeNull();
  });

  it("non invia se l'impegno è già fatto, è scomparso o il promemoria è troppo vecchio", async () => {
    current = new FakeDb({
      reminder_queue: [
        queued({ id: 'a', event_id: 'done' }),
        queued({ id: 'b', event_id: 'gone' }),
        queued({ id: 'c', event_id: 'old', send_at: '2026-10-06T08:00:00Z' }),
      ],
      events: [event({ id: 'done', status: 'done' }), event({ id: 'old' })],
      profiles: [user],
    });
    expect(await dispatch(env, now)).toEqual({ sent: 0, failed: 0 });
    expect(emails).toHaveLength(0);
    expect(current.rows('reminder_queue').every((r) => r.sent_at)).toBe(true); // prenotate comunque: non verranno riprovate
  });

  it('un invio fallito torna in coda; al quinto tentativo si smette', async () => {
    vi.stubGlobal('fetch', async () => new Response('boom', { status: 500 }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // l'errore di invio è atteso: il job lo registra
    current = new FakeDb({ reminder_queue: [queued()], events: [event()], profiles: [user] });
    expect(await dispatch(env, now)).toEqual({ sent: 0, failed: 1 });
    expect(current.rows('reminder_queue')[0]).toMatchObject({ sent_at: null, attempts: 1 });
    current.rows('reminder_queue')[0].attempts = 4;
    await dispatch(env, now);
    expect(current.rows('reminder_queue')[0]).toMatchObject({ attempts: 5 });
    expect(current.rows('reminder_queue')[0].sent_at).not.toBeNull();
  });
});

describe('enqueue', () => {
  const member = { space_id: 's1', profiles: { id: 'u1', notify_email: true, morning_brief: false } };
  it('accoda i promemoria in modo idempotente e toglie quelli non più validi', async () => {
    current = new FakeDb({
      events: [event()],
      space_members: [member],
      push_subscriptions: [],
      reminder_queue: [queued({ id: 'stale', event_id: 'removed' })],
    });
    expect(await enqueue(env, now)).toBe(1);
    await enqueue(env, now);
    const rows = current.rows('reminder_queue');
    expect(rows.map((r) => r.event_id)).toEqual(['e1']); // quello di un impegno scomparso è stato tolto
    expect(rows[0]).toMatchObject({ user_id: 'u1', channel: 'email', send_at: '2026-10-08T08:00:00.000Z' });
  });
  it('legge oltre 1000 righe (paginazione)', async () => {
    const many = Array.from({ length: 1200 }, (_, i) =>
      event({ id: `e${i}`, starts_at: '2026-10-20T10:00:00Z' }),
    );
    current = new FakeDb({ events: many, space_members: [member], push_subscriptions: [] });
    expect(await enqueue(env, now)).toBe(1200);
  });
});

describe('sendBriefs', () => {
  it("manda il brief una volta al giorno, solo nella finestra dell'orario scelto", async () => {
    const seed = {
      profiles: [{ ...user, morning_brief: true }],
      space_members: [{ space_id: 's1', user_id: 'u1' }],
      events: [event({ id: 'today', starts_at: '2026-10-08T14:00:00Z' })],
      push_subscriptions: [],
    };
    current = new FakeDb(seed);
    expect(await sendBriefs(env, romeToDate(2026, 10, 8, 7, 0))).toBe(0); // prima dell'orario
    expect(await sendBriefs(env, romeToDate(2026, 10, 8, 8, 0))).toBe(1);
    expect(await sendBriefs(env, romeToDate(2026, 10, 8, 8, 5))).toBe(0); // già inviato oggi
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toBe('La tua giornata: 1 impegno');
    expect(current.rows('brief_log')).toHaveLength(1);
  });
  it("se l'invio fallisce libera il log per riprovare", async () => {
    vi.stubGlobal('fetch', async () => new Response('x', { status: 500 }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    current = new FakeDb({
      profiles: [{ ...user, morning_brief: true }],
      space_members: [{ space_id: 's1', user_id: 'u1' }],
      events: [event()],
      push_subscriptions: [],
    });
    expect(await sendBriefs(env, romeToDate(2026, 10, 8, 8, 0))).toBe(0);
    expect(current.rows('brief_log')).toHaveLength(0);
  });
});

describe('sendBoardPushes', () => {
  it('prenota la nota una sola volta e non avvisa note scadute', async () => {
    const note = (id: string, expires_at: string | null) => ({
      id,
      space_id: 's1',
      author_id: 'u1',
      text: 'Latte finito',
      expires_at,
      notify_push: true,
      notified_at: null,
      created_at: now.toISOString(),
      spaces: { name: 'Casa' },
    });
    current = new FakeDb({
      board_notes: [note('n1', null), note('n2', '2026-10-01T00:00:00Z')],
      space_members: [
        { space_id: 's1', user_id: 'u1' },
        { space_id: 's1', user_id: 'u2' },
      ],
      profiles: [user],
      push_subscriptions: [],
    });
    await sendBoardPushes(env, now);
    await sendBoardPushes(env, now);
    expect(current.rows('board_notes').every((n) => n.notified_at)).toBe(true);
  });
});
