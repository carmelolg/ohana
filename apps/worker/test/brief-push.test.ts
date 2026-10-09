import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { romeToDate } from '@ohana/shared';
import type { Env } from '../src/env';
import { FakeDb } from './fake-db';

let current: FakeDb;
let pushDelivered = 1;
const sent: { actions?: unknown[] }[] = [];
vi.mock('../src/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/db')>()),
  createDb: () => current.asDb(),
}));
vi.mock('../src/notify', () => ({
  subscriptionsOf: async () => [
    { id: 's', endpoint: 'https://push.example', keys: { p256dh: 'x', auth: 'y' } },
  ],
  deliverPush: async (_e: unknown, _d: unknown, _s: unknown, msg: { actions?: unknown[] }) => {
    sent.push(msg);
    return { delivered: pushDelivered, errors: [] };
  },
  pushToUser: async () => pushDelivered,
}));
const { sendBriefs } = await import('../src/jobs/morning-brief');

const env = { APP_URL: 'http://app', MAIL_PROVIDER: 'gmail' } as Env; // Gmail senza segreti: l'email fallisce
const day = romeToDate(2026, 10, 8, 7, 45);
const seed = () => ({
  profiles: [
    {
      id: 'u1',
      first_name: 'Giulia',
      last_name: 'Neri',
      nickname: null,
      email: 'g@example.it',
      notify_email: true,
      morning_brief: true,
      morning_brief_time: '07:30:00',
    },
  ],
  space_members: [{ space_id: 's1', user_id: 'u1', role: 'member' }],
  events: [
    {
      id: 'e1',
      space_id: 's1',
      title: 'Visita',
      status: 'open',
      rrule: null,
      kind: 'appuntamento',
      starts_at: romeToDate(2026, 10, 8, 16).toISOString(),
      assignee_id: null,
      spaces: { name: 'Casa' },
    },
  ],
  push_subscriptions: [],
});

beforeEach(() => {
  pushDelivered = 1;
  sent.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => undefined); // l'errore dell'email è atteso
});
afterEach(() => vi.restoreAllMocks());

describe('brief del mattino con un canale rotto', () => {
  it("se l'email non parte, il push arriva lo stesso e il brief conta come inviato", async () => {
    current = new FakeDb(seed());
    expect(await sendBriefs(env, day)).toBe(1);
    expect(current.rows('brief_log')).toHaveLength(1);
    expect(sent[0].actions).toEqual([]); // niente «Fatto»/«Rimanda»: il brief non è un impegno
  });

  it('se non parte nessun canale, il log si libera e si riprova', async () => {
    current = new FakeDb(seed());
    pushDelivered = 0;
    expect(await sendBriefs(env, day)).toBe(0);
    expect(current.rows('brief_log')).toHaveLength(0);
  });
});
