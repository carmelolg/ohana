import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { FakeDb } from './fake-db';

let current: FakeDb;
const pushed: { userId: string; msg: { title: string; body: string; url: string; actions?: unknown[] } }[] =
  [];
vi.mock('../src/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/db')>()),
  createDb: () => current.asDb(),
}));
let outcome: { delivered: number; errors: unknown[] } = { delivered: 1, errors: [] };
vi.mock('../src/notify', () => ({
  subscriptionsOf: async (_d: unknown, userId: string) => [
    { id: `sub-${userId}`, endpoint: 'https://push.example', keys: { p256dh: 'x', auth: 'y' } },
  ],
  deliverPush: async (
    _e: unknown,
    _d: unknown,
    subs: { id: string }[],
    msg: (typeof pushed)[number]['msg'],
  ) => {
    pushed.push({ userId: subs[0].id.replace('sub-', ''), msg });
    return outcome;
  },
}));
const { sendBoardPushes } = await import('../src/jobs/board-push');

const env = {} as Env;
const now = new Date('2026-10-08T08:00:00Z');
const note = (over: Record<string, unknown> = {}) => ({
  id: 'n1',
  space_id: 's1',
  author_id: 'u1',
  text: 'Il latte è finito',
  expires_at: null,
  notify_push: true,
  notified_at: null,
  created_at: now.toISOString(),
  spaces: { name: 'Casa' },
  ...over,
});
const seed = (notes: Record<string, unknown>[]) =>
  new FakeDb({
    board_notes: notes,
    space_members: [
      { space_id: 's1', user_id: 'u1', role: 'owner' },
      { space_id: 's1', user_id: 'u2', role: 'member' },
      { space_id: 's1', user_id: 'u3', role: 'care_viewer' },
      { space_id: 's2', user_id: 'u4', role: 'member' },
    ],
    profiles: [{ id: 'u1', first_name: 'Giulia', last_name: 'Neri', nickname: null }],
  });

beforeEach(() => {
  pushed.length = 0;
  outcome = { delivered: 1, errors: [] };
  vi.spyOn(console, 'error').mockImplementation(() => undefined); // gli errori d'invio simulati sono attesi
});

describe('sendBoardPushes: chi riceve l’avviso', () => {
  it('avvisa gli altri membri dello spazio, non l’autore, chi consulta solo la Cura né altri spazi', async () => {
    current = seed([note()]);
    expect(await sendBoardPushes(env, now)).toBe(1);
    expect(pushed.map((p) => p.userId)).toEqual(['u2']);
  });

  it('il messaggio dice spazio, autore e testo, e non ha pulsanti da promemoria', async () => {
    current = seed([note()]);
    await sendBoardPushes(env, now);
    expect(pushed[0].msg).toMatchObject({
      title: 'Bacheca · Casa',
      body: 'Giulia: Il latte è finito',
      url: '/oggi',
      actions: [],
    });
  });

  it('senza richiesta dell’autore non invia nulla', async () => {
    current = seed([note({ notify_push: false })]);
    await sendBoardPushes(env, now);
    expect(pushed).toEqual([]);
  });

  it('una nota già notificata o scaduta non riparte, e il secondo giro non rimanda', async () => {
    current = seed([
      note({ id: 'old', notified_at: '2026-10-08T07:00:00Z' }),
      note({ id: 'exp', expires_at: '2026-10-01T00:00:00Z' }),
      note({ id: 'ok' }),
    ]);
    await sendBoardPushes(env, now);
    await sendBoardPushes(env, now);
    expect(pushed.map((p) => p.userId)).toEqual(['u2']);
  });

  it('ignora le note più vecchie di 24 ore', async () => {
    current = seed([note({ created_at: '2026-10-06T08:00:00Z' })]);
    await sendBoardPushes(env, now);
    expect(pushed).toEqual([]);
  });
});

describe('sendBoardPushes: invio fallito', () => {
  const notifiedAt = () => current.rows('board_notes')[0].notified_at;

  it('se ogni invio fallisce rilascia la prenotazione, così il giro dopo riprova', async () => {
    current = seed([note()]);
    outcome = { delivered: 0, errors: [new Error('Push 500')] };
    expect(await sendBoardPushes(env, now)).toBe(0);
    expect(notifiedAt()).toBeNull();

    outcome = { delivered: 1, errors: [] };
    expect(await sendBoardPushes(env, now)).toBe(1);
    expect(notifiedAt()).not.toBeNull();
  });

  it('se almeno un dispositivo ha ricevuto l’avviso la prenotazione resta, per non duplicarlo', async () => {
    current = seed([note()]);
    outcome = { delivered: 1, errors: [new Error('Push 500')] };
    await sendBoardPushes(env, now);
    expect(notifiedAt()).not.toBeNull();
  });
});
