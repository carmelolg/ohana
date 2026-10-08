// Test di integrazione contro un Supabase locale (`supabase start`).
// Esegui con:  SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=… pnpm test
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { enqueue, dispatch, sendBoardPushes, sendChoreDigests } from '../src/index';
import type { Env } from '../src/env';
import worker from '../src/index';
import { signAction } from '../src/sign';

declare const process: { env: Record<string, string | undefined> };
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const run = url && key ? describe : describe.skip;
const realFetch = globalThis.fetch;

run('worker + Supabase locale', () => {
  const env = {
    SUPABASE_URL: url!,
    SUPABASE_SERVICE_ROLE_KEY: key!,
    RESEND_API_KEY: 'x',
    MAIL_FROM: 'Ohana <a@b.it>',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: 'mailto:a@b.it',
    ACTION_SECRET: 'segreto',
    APP_URL: 'http://app',
    WORKER_URL: 'http://worker',
  } as Env;
  const sb = createClient(url ?? 'http://localhost', key ?? 'none', { auth: { persistSession: false } });
  const sent: { to: string; subject: string; html: string }[] = [];
  let userId = '';
  let eventId = '';

  beforeAll(async () => {
    vi.stubGlobal('fetch', async (u: RequestInfo | URL, init?: RequestInit) => {
      if (String(u).startsWith('https://api.resend.com')) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response('{}', { status: 200 });
      }
      return realFetch(u, init);
    });
    const email = `w${Date.now()}@ohana.test`;
    const { data } = await sb.auth.admin.createUser({ email, password: 'pw123456', email_confirm: true });
    userId = data.user!.id;
    const sid = crypto.randomUUID();
    await sb.from('spaces').insert({ id: sid, name: 'Casa test', created_by: userId });
    eventId = crypto.randomUUID();
    // impegno tra 20 ore con promemoria 1 giorno prima => send_at già passato (4 ore fa)
    await sb.from('events').insert({
      id: eventId,
      space_id: sid,
      title: 'Visita test',
      starts_at: new Date(Date.now() + 20 * 3600000).toISOString(),
      created_by: userId,
    });
    await sb.from('event_reminders').insert({ event_id: eventId, offset_minutes: 1440, channels: ['email'] });
  });
  afterAll(() => vi.unstubAllGlobals());

  it('accoda e invia una sola volta (idempotente)', async () => {
    await enqueue(env);
    await enqueue(env); // seconda esecuzione: nessun duplicato
    const { data: q } = await sb.from('reminder_queue').select('*').eq('event_id', eventId);
    expect(q).toHaveLength(1);

    const first = await dispatch(env);
    const second = await dispatch(env);
    expect(first.sent).toBeGreaterThanOrEqual(1);
    void second; // il DB locale può contenere altri promemoria: il controllo di idempotenza è sul conteggio delle email di QUESTO impegno (sotto)
    const mine = sent.filter((m) => m.html.includes('Visita test'));
    expect(mine).toHaveLength(1);
    expect(mine[0].html).toContain('/azione/');
    expect(mine[0].html).not.toContain('{{');
    const { data: after } = await sb.from('reminder_queue').select('sent_at').eq('event_id', eventId);
    expect(after![0].sent_at).not.toBeNull();
  });

  it('ritira dalla coda i promemoria non più validi', async () => {
    const id2 = crypto.randomUUID();
    const { data: sp } = await sb.from('spaces').select('id').eq('created_by', userId).single();
    await sb.from('events').insert({
      id: id2,
      space_id: sp!.id,
      title: 'Futuro',
      starts_at: new Date(Date.now() + 5 * 86400000).toISOString(),
      created_by: userId,
    });
    await sb.from('event_reminders').insert({ event_id: id2, offset_minutes: 1440, channels: ['email'] });
    await enqueue(env);
    expect((await sb.from('reminder_queue').select('id').eq('event_id', id2)).data).toHaveLength(1);
    await sb.from('event_reminders').delete().eq('event_id', id2);
    await enqueue(env);
    expect((await sb.from('reminder_queue').select('id').eq('event_id', id2)).data).toHaveLength(0);
  });

  it('link firmati: GET conferma, POST esegue; token falsi rifiutati', async () => {
    const token = await signAction(env.ACTION_SECRET, eventId);
    const get = await worker.fetch(new Request(`http://w/azione/${token}?a=done`), env);
    expect(get.status).toBe(200);
    expect((await sb.from('events').select('status').eq('id', eventId).single()).data!.status).toBe('open');
    const post = await worker.fetch(new Request(`http://w/azione/${token}?a=done`, { method: 'POST' }), env);
    expect(post.status).toBe(200);
    expect((await sb.from('events').select('status').eq('id', eventId).single()).data!.status).toBe('done');
    const bad = await worker.fetch(new Request(`http://w/azione/${token}x?a=done`, { method: 'POST' }), env);
    expect(bad.status).toBe(400);
  });

  it("snooze sposta l'orario di 1 ora", async () => {
    const id3 = crypto.randomUUID();
    const { data: sp } = await sb.from('spaces').select('id').eq('created_by', userId).single();
    const start = new Date(Date.now() + 3 * 86400000);
    await sb.from('events').insert({
      id: id3,
      space_id: sp!.id,
      title: 'Da rimandare',
      starts_at: start.toISOString(),
      created_by: userId,
    });
    const token = await signAction(env.ACTION_SECRET, id3);
    await worker.fetch(new Request(`http://w/azione/${token}?a=snooze&m=60`, { method: 'POST' }), env);
    const { data } = await sb.from('events').select('starts_at').eq('id', id3).single();
    expect(new Date(data!.starts_at).getTime() - start.getTime()).toBe(3600000);
  });

  it('feed ICS per token', async () => {
    const { data: feed } = await sb.from('calendar_feeds').insert({ user_id: userId }).select().single();
    const res = await worker.fetch(new Request(`http://w/ics/${feed!.token}.ics`), env);
    expect(res.headers.get('content-type')).toContain('text/calendar');
    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('SUMMARY:Da rimandare');
    expect((await worker.fetch(new Request('http://w/ics/nope.ics'), env)).status).toBe(404);
  });
});

run('v2: bacheca push, riepilogo faccende, fallback AI', () => {
  const env = {
    SUPABASE_URL: url!,
    SUPABASE_SERVICE_ROLE_KEY: key!,
    RESEND_API_KEY: 'x',
    MAIL_FROM: 'a <a@b.it>',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: 'mailto:a@b.it',
    ACTION_SECRET: 's',
    APP_URL: 'http://app',
    WORKER_URL: 'http://worker',
  } as Env;
  const sb = createClient(url ?? 'http://localhost', key ?? 'none', { auth: { persistSession: false } });
  const anon = process.env.SUPABASE_ANON_KEY;
  let userId = '';
  let token = '';
  let spaceId = '';

  beforeAll(async () => {
    const email = `v2${Date.now()}@ohana.test`;
    const { data } = await sb.auth.admin.createUser({ email, password: 'pw123456', email_confirm: true });
    userId = data.user!.id;
    spaceId = crypto.randomUUID();
    await sb.from('spaces').insert({ id: spaceId, name: 'Casa v2', created_by: userId });
    if (anon) {
      const c = createClient(url!, anon, { auth: { persistSession: false } });
      token = (await c.auth.signInWithPassword({ email, password: 'pw123456' })).data.session!.access_token;
    }
  });

  it('nota con avviso: viene marcata come inviata una volta sola', async () => {
    const id = crypto.randomUUID();
    await sb.from('board_notes').insert({
      id,
      space_id: spaceId,
      author_id: userId,
      text: 'Chiavi da me fino a domenica',
      notify_push: true,
    });
    await sendBoardPushes(env); // nessun altro membro né dispositivo: niente push, ma il claim avviene
    const { data: n } = await sb.from('board_notes').select('notified_at').eq('id', id).single();
    expect(n!.notified_at).not.toBeNull();
    const first = n!.notified_at;
    await sendBoardPushes(env);
    expect((await sb.from('board_notes').select('notified_at').eq('id', id).single()).data!.notified_at).toBe(
      first,
    );
  });

  it('nota senza avviso: non viene toccata', async () => {
    const id = crypto.randomUUID();
    await sb
      .from('board_notes')
      .insert({ id, space_id: spaceId, author_id: userId, text: 'Solo in bacheca', notify_push: false });
    await sendBoardPushes(env);
    expect(
      (await sb.from('board_notes').select('notified_at').eq('id', id).single()).data!.notified_at,
    ).toBeNull();
  });

  it('riepilogo faccende: solo con opzione attiva, una volta al giorno, solo nella finestra 8:00', async () => {
    await sb.from('profiles').update({ notify_chores_push: true }).eq('id', userId);
    const cid = crypto.randomUUID();
    const { romeToDate: r } = await import('@ohana/shared');
    const day = new Date();
    await sb.from('events').insert({
      id: cid,
      space_id: spaceId,
      title: 'Plastica',
      kind: 'faccenda',
      all_day: true,
      assignee_id: userId,
      rrule: 'FREQ=DAILY',
      starts_at: r(day.getFullYear(), day.getMonth() + 1, day.getDate()).toISOString(),
      created_by: userId,
    });
    const at = (h: number) => r(day.getFullYear(), day.getMonth() + 1, day.getDate(), h, 5);
    expect(await sendChoreDigests(env, at(7))).toBe(0); // troppo presto
    expect(await sendChoreDigests(env, at(9))).toBe(0); // in finestra ma senza dispositivi push: nessun invio, e non resta segnato
    expect((await sb.from('digest_log').select('*').eq('user_id', userId)).data).toHaveLength(0);
  });

  it('fallback AI: serve login, opzione attiva e chiave configurata', async () => {
    const call = (headers: Record<string, string>, e = env) =>
      worker.fetch(
        new Request('http://w/scan/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ text: 'Bolletta luce totale da pagare 84,20 scadenza 15/10/2026' }),
        }),
        e,
      );
    expect((await call({})).status).toBe(401);
    expect((await call({ Authorization: 'Bearer falso' })).status).toBe(401);
    if (!token) {
      return;
    } // senza SUPABASE_ANON_KEY si fermano i controlli con utente reale
    await sb.from('profiles').update({ scan_llm_fallback: false }).eq('id', userId);
    expect((await call({ Authorization: `Bearer ${token}` })).status).toBe(403); // non attivato dall'utente
    await sb.from('profiles').update({ scan_llm_fallback: true }).eq('id', userId);
    expect((await call({ Authorization: `Bearer ${token}` })).status).toBe(501); // attivo ma server senza chiave
    vi.stubGlobal('fetch', async (u: string, init?: RequestInit) =>
      u.includes('generativelanguage')
        ? new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: '{"docType":"bolletta","supplier":"Enel","amount":84.2,"dueDate":"2026-10-15"}',
                      },
                    ],
                  },
                },
              ],
            }),
          )
        : realFetch(u, init),
    );
    const ok = await call({ Authorization: `Bearer ${token}` }, { ...env, GEMINI_API_KEY: 'k' } as Env);
    vi.unstubAllGlobals();
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({
      docType: 'bolletta',
      supplier: 'Enel',
      amount: 84.2,
      dueDate: '2026-10-15',
    });
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://app');
  });

  it('azione «fatto» su una faccenda ricorrente: avanza e ricorda last_done_at', async () => {
    const cid = crypto.randomUUID();
    const { romeToDate: r } = await import('@ohana/shared');
    const d = new Date();
    await sb.from('events').insert({
      id: cid,
      space_id: spaceId,
      title: 'Annaffiare',
      kind: 'faccenda',
      all_day: true,
      assignee_id: userId,
      rrule: 'FREQ=DAILY;INTERVAL=3',
      starts_at: r(d.getFullYear(), d.getMonth() + 1, d.getDate() - 1).toISOString(),
      created_by: userId,
    });
    const t = await signAction(env.ACTION_SECRET, cid);
    expect(
      (await worker.fetch(new Request(`http://w/azione/${t}?a=done`, { method: 'POST' }), env)).status,
    ).toBe(200);
    const { data } = await sb.from('events').select('starts_at, last_done_at, status').eq('id', cid).single();
    expect(data!.last_done_at).not.toBeNull();
    expect(new Date(data!.starts_at).getTime()).toBeGreaterThan(Date.now());
    expect(data!.status).toBe('open');
  });
});

run('archivio grande: oltre 1000 righe non si perdono (limite max_rows di PostgREST)', () => {
  const env = {
    SUPABASE_URL: url!,
    SUPABASE_SERVICE_ROLE_KEY: key!,
    RESEND_API_KEY: 'x',
    MAIL_FROM: 'a <a@b.it>',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: 'mailto:a@b.it',
    ACTION_SECRET: 's',
    APP_URL: 'http://app',
    WORKER_URL: 'http://worker',
  } as Env;
  const sb = createClient(url ?? 'http://localhost', key ?? 'none', { auth: { persistSession: false } });
  const ids: string[] = [];
  let spaceId = '';

  afterAll(async () => {
    if (spaceId) {
      await sb.from('spaces').delete().eq('id', spaceId);
    }
  });

  it("il promemoria dell'ultimo impegno (oltre la millesima riga) viene comunque accodato", async () => {
    const email = `big${Date.now()}@ohana.test`;
    const { data } = await sb.auth.admin.createUser({ email, password: 'pw123456', email_confirm: true });
    const uid = data.user!.id;
    spaceId = crypto.randomUUID();
    await sb.from('spaces').insert({ id: spaceId, name: 'Archivio grande', created_by: uid });
    const start = new Date(Date.now() + 5 * 86400000).toISOString();
    // 1100 impegni ricorrenti (sempre inclusi dalla query) + uno con id massimo che deve restare in coda alla lista
    const rows = Array.from({ length: 1100 }, () => ({
      id: crypto.randomUUID(),
      space_id: spaceId,
      title: 'bulk',
      starts_at: start,
      rrule: 'FREQ=YEARLY',
      created_by: uid,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      expect((await sb.from('events').insert(rows.slice(i, i + 500))).error).toBeNull();
    }
    const last = 'ffffffff-ffff-4fff-8fff-fffffffffff0';
    ids.push(last);
    expect(
      (
        await sb
          .from('events')
          .insert({ id: last, space_id: spaceId, title: 'Ultimo', starts_at: start, created_by: uid })
      ).error,
    ).toBeNull();
    expect(
      (await sb.from('event_reminders').insert({ event_id: last, offset_minutes: 1440, channels: ['email'] }))
        .error,
    ).toBeNull();
    await enqueue(env);
    const { data: q } = await sb.from('reminder_queue').select('id').eq('event_id', last);
    expect(q).toHaveLength(1);
  }, 120_000);
});
