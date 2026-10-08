import { describe, expect, it, vi } from 'vitest';
import { chunk, claimLog, fetchAll, releaseLog, type Db } from '../src/db';
import type { Env } from '../src/env';

const sendPush = vi.hoisted(() => vi.fn());
vi.mock('../src/push', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/push')>()),
  sendPush,
}));
const { deliverPush } = await import('../src/notify');
const { GoneError } = await import('../src/push');

describe('fetchAll / chunk', () => {
  it('legge le pagine finché non ne arriva una incompleta', async () => {
    const pages = [[1, 2], [3, 4], [5]];
    const calls: [number, number][] = [];
    const out = await fetchAll<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: pages.shift(), error: null };
    }, 2);
    expect(out).toEqual([1, 2, 3, 4, 5]);
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });
  it('un errore di PostgREST interrompe la lettura', async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom');
  });
  it("chunk spezza in blocchi e gestisce l'elenco vuoto", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe('claimLog / releaseLog', () => {
  const fakeDb = (insertError: unknown) => {
    const deleted: unknown[] = [];
    const db = {
      from: () => ({
        insert: async () => ({ error: insertError }),
        delete: () => ({
          match: async (m: unknown) => {
            deleted.push(m);
          },
        }),
      }),
    } as unknown as Db;
    return { db, deleted };
  };
  it("prenota solo se l'insert riesce (chiave primaria = già inviato)", async () => {
    expect(await claimLog(fakeDb(null).db, 'brief_log', { user_id: 'u', day: 'd' })).toBe(true);
    expect(await claimLog(fakeDb({ code: '23505' }).db, 'brief_log', { user_id: 'u', day: 'd' })).toBe(false);
  });
  it('releaseLog cancella la riga prenotata', async () => {
    const { db, deleted } = fakeDb(null);
    await releaseLog(db, 'brief_log', { user_id: 'u', day: 'd' });
    expect(deleted).toEqual([{ user_id: 'u', day: 'd' }]);
  });
});

describe('deliverPush', () => {
  const subs = ['a', 'b', 'c'].map((id) => ({
    id,
    endpoint: `https://push/${id}`,
    keys: { p256dh: 'k', auth: 'x' },
  }));
  const msg = { title: 't', body: 'b', url: '/oggi' };

  it('conta le consegne, rimuove i dispositivi non più validi e riporta gli altri errori', async () => {
    const removed: string[] = [];
    const db = {
      from: () => ({
        delete: () => ({
          eq: async (_c: string, id: string) => {
            removed.push(id);
          },
        }),
      }),
    } as unknown as Db;
    sendPush
      .mockReset()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new GoneError('https://push/b'))
      .mockRejectedValueOnce(new Error('503'));
    const outcome = await deliverPush({} as Env, db, subs, msg);
    expect(outcome.delivered).toBe(1);
    expect(removed).toEqual(['b']);
    expect(outcome.errors).toHaveLength(1);
  });
});
