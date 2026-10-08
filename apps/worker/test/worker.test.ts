import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import { buildQueueRows, type QEvent, type QRecipient } from '../src/reminders';
import { buildIcs, fold } from '../src/ics';
import { signAction, verifyAction } from '../src/sign';
import { renderTemplate } from '../src/email';

const NOW = romeToDate(2026, 10, 7, 10, 0);
const base: QEvent = {
  id: 'e1',
  space_id: 's1',
  title: 'Cardiologo',
  starts_at: romeToDate(2026, 10, 9, 15, 0).toISOString(),
  rrule: null,
  status: 'open',
  assignee_id: null,
  event_reminders: [{ offset_minutes: 1440, channels: ['email', 'push'] }],
};
const users = (over: Partial<QRecipient> = {}): Map<string, QRecipient[]> =>
  new Map([
    [
      's1',
      [
        { id: 'u1', notify_email: true, morning_brief: false, hasPush: true, ...over },
        { id: 'u2', notify_email: true, morning_brief: false, hasPush: false },
      ],
    ],
  ]);

describe('coda promemoria', () => {
  it('un promemoria per utente e canale, alla data giusta', () => {
    const rows = buildQueueRows([base], users(), NOW);
    expect(rows).toHaveLength(3); // u1 email+push, u2 email (niente push)
    expect(new Set(rows.map((r) => r.send_at))).toEqual(
      new Set([romeToDate(2026, 10, 8, 15, 0).toISOString()]),
    );
  });
  it('rispetta preferenze e brief del mattino', () => {
    expect(
      buildQueueRows([base], users({ notify_email: false }), NOW).filter((r) => r.user_id === 'u1'),
    ).toHaveLength(1);
    expect(
      buildQueueRows([base], users({ morning_brief: true }), NOW).filter((r) => r.user_id === 'u1'),
    ).toHaveLength(0);
  });
  it('assegnatario: solo lui', () => {
    const rows = buildQueueRows([{ ...base, assignee_id: 'u2' }], users(), NOW);
    expect(new Set(rows.map((r) => r.user_id))).toEqual(new Set(['u2']));
  });
  it('ricorrenze mensili entro 60 giorni', () => {
    const ev = { ...base, rrule: 'FREQ=MONTHLY', starts_at: romeToDate(2026, 9, 20, 9, 0).toISOString() };
    const occ = new Set(buildQueueRows([ev], users(), NOW).map((r) => r.occurrence_at));
    expect(occ.size).toBe(2); // 20 ott, 20 nov (20 dic è oltre i 60 giorni)
  });
  it('impegni fatti e passati sono ignorati', () => {
    expect(buildQueueRows([{ ...base, status: 'done' }], users(), NOW)).toHaveLength(0);
    expect(
      buildQueueRows([{ ...base, starts_at: romeToDate(2026, 9, 1, 9, 0).toISOString() }], users(), NOW),
    ).toHaveLength(0);
  });
  it('è deterministica (idempotenza delle chiavi)', () => {
    expect(buildQueueRows([base], users(), NOW)).toEqual(buildQueueRows([base], users(), NOW));
  });
});

describe('ics', () => {
  it('struttura base, RRULE e allarmi', () => {
    const ics = buildIcs(
      [
        {
          id: 'x',
          title: 'Bolletta, luce',
          starts_at: '2026-10-20T07:00:00Z',
          ends_at: null,
          all_day: false,
          location: null,
          notes: 'a;b',
          rrule: 'FREQ=MONTHLY',
          status: 'open',
          space_name: 'Casa',
          event_reminders: [{ offset_minutes: 1440 }],
        },
      ],
      'Ohana',
      new Date('2026-10-07T08:00:00Z'),
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261020T070000Z');
    expect(ics).toContain('SUMMARY:Bolletta\\, luce');
    expect(ics).toContain('a\\;b'); // RFC 5545: il punto e virgola nel testo va preceduto da una barra inversa
    expect(ics).toContain('RRULE:FREQ=MONTHLY');
    expect(ics).toContain('TRIGGER:-PT1440M');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('piega le righe lunghe a 75 ottetti', () => {
    const folded = fold('DESCRIPTION:' + 'è'.repeat(100));
    for (const l of folded.split('\r\n')) {
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    }
  });
});

describe('token azione', () => {
  it('firma e verifica', async () => {
    const t = await signAction('segreto', 'e1');
    expect((await verifyAction('segreto', t))?.e).toBe('e1');
    expect(await verifyAction('altro', t)).toBeNull();
    expect(await verifyAction('segreto', t + 'x')).toBeNull();
  });
  it('scade', async () => {
    const t = await signAction('s', 'e1', 10, 0);
    expect(await verifyAction('s', t, 5_000)).not.toBeNull();
    expect(await verifyAction('s', t, 11_000)).toBeNull();
  });
});

describe('template email', () => {
  it("sostituisce ed esegue l'escape", () => {
    expect(renderTemplate('<b>{{a}}</b> {{b}}', { a: '<x>&' })).toBe('<b>&lt;x&gt;&amp;</b> —');
  });
});

import { afterEach, vi } from 'vitest';
import { buildMime, resetGmailTokenCache } from '../src/gmail';
import { sendEmail } from '../src/email';
import type { Env } from '../src/env';

describe('Gmail API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetGmailTokenCache();
  });
  const env = {
    MAIL_PROVIDER: 'gmail',
    MAIL_FROM: 'Ohana <me@gmail.com>',
    GMAIL_CLIENT_ID: 'id',
    GMAIL_CLIENT_SECRET: 'sec',
    GMAIL_REFRESH_TOKEN: 'rt',
  } as Env;
  const decode = (b64url: string) =>
    new TextDecoder().decode(
      Uint8Array.from(atob(b64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
    );

  it('MIME: oggetto UTF-8 codificato, corpo base64, niente header injection', () => {
    const m = buildMime('Ohana <me@gmail.com>', 'a@b.it', 'Domani: Visita è ok', '<p>Ciao è</p>');
    expect(m).toContain('Subject: =?UTF-8?B?');
    expect(m).toContain('Content-Type: text/html; charset=UTF-8');
    const body = m.split('\r\n\r\n')[1].replace(/\r\n/g, '');
    expect(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)))).toBe(
      '<p>Ciao è</p>',
    );
    expect(() => buildMime('x', 'a@b.it\r\nBcc: evil@x.it', 's', 'h')).toThrow();
  });

  it('scambia il refresh token, invia e riusa l’access token', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'AT', expires_in: 3600 }));
      }
      return new Response('{}', { status: 200 });
    });
    await sendEmail(env, 'dest@x.it', 'Oggetto', '<b>x</b>');
    await sendEmail(env, 'dest@x.it', 'Oggetto 2', '<b>y</b>');
    expect(calls.filter((c) => c.url.includes('oauth2')).length).toBe(1); // token in cache
    const send = calls.filter((c) => c.url.includes('gmail.googleapis.com'));
    expect(send).toHaveLength(2);
    expect((send[0].init!.headers as Record<string, string>).Authorization).toBe('Bearer AT');
    const raw = JSON.parse(String(send[0].init!.body)).raw as string;
    expect(decode(raw)).toContain('To: dest@x.it');
  });

  it('401: rinnova il token e riprova una volta', async () => {
    let n = 0;
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('oauth2')) {
        return new Response(JSON.stringify({ access_token: 'AT' + ++n, expires_in: 3600 }));
      }
      return new Response('{}', { status: n === 1 ? 401 : 200 });
    });
    await expect(sendEmail(env, 'd@x.it', 's', 'h')).resolves.toBeUndefined();
    expect(n).toBe(2);
  });

  it('errori chiari: refresh token scaduto e configurazione mancante', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
    );
    await expect(sendEmail(env, 'd@x.it', 's', 'h')).rejects.toThrow(/Testing/);
    await expect(
      sendEmail({ ...env, GMAIL_REFRESH_TOKEN: undefined } as Env, 'd@x.it', 's', 'h'),
    ).rejects.toThrow(/non configurato/);
  });

  it('senza MAIL_PROVIDER usa Resend', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (u: string) => {
      urls.push(u);
      return new Response('{}');
    });
    await sendEmail({ MAIL_FROM: 'a', RESEND_API_KEY: 'k' } as Env, 'd@x.it', 's', 'h');
    expect(urls).toEqual(['https://api.resend.com/emails']);
  });
});

import { buildChoreDigest, inDigestWindow } from '../src/digest';
import { llmExtract, rateLimited, sanitizeLlm } from '../src/scan';

describe('riepilogo faccende (push alle 8:00)', () => {
  const today = romeToDate(2026, 10, 8, 8, 0);
  const c = (over: Record<string, unknown>) => ({
    id: 'c',
    title: 'Plastica fuori',
    assignee_id: 'u1',
    rrule: 'FREQ=WEEKLY;BYDAY=TH',
    starts_at: romeToDate(2026, 10, 8).toISOString(),
    last_done_at: null,
    ...over,
  });
  it('conta di oggi e rinviate, non le fatte né quelle di altri', () => {
    const d = buildChoreDigest(
      [
        c({}),
        c({ id: 'b', title: 'Annaffiare', starts_at: romeToDate(2026, 10, 6).toISOString() }),
        c({
          id: 'd',
          title: 'Lavatrice',
          starts_at: romeToDate(2026, 10, 15).toISOString(),
          last_done_at: romeToDate(2026, 10, 8, 7).toISOString(),
        }),
        c({ id: 'x', assignee_id: 'u2' }),
        c({ id: 'f', starts_at: romeToDate(2026, 10, 9).toISOString() }),
      ],
      'u1',
      today,
    )!;
    expect(d.count).toBe(2);
    expect(d.title).toBe('Faccende di oggi: 2');
    expect(d.body).toContain('Annaffiare');
  });
  it('niente da fare → nessun riepilogo', () => {
    expect(
      buildChoreDigest([c({ starts_at: romeToDate(2026, 10, 9).toISOString() })], 'u1', today),
    ).toBeNull();
  });
  it('elenco lungo abbreviato', () => {
    const many = ['A', 'B', 'C', 'D', 'E'].map((t, i) => c({ id: String(i), title: t }));
    expect(buildChoreDigest(many, 'u1', today)!.body).toBe('A, B, C e altre 2');
  });
  it('finestra 8:00–11:00', () => {
    expect(inDigestWindow(romeToDate(2026, 10, 8, 7, 59))).toBe(false);
    expect(inDigestWindow(romeToDate(2026, 10, 8, 8, 0))).toBe(true);
    expect(inDigestWindow(romeToDate(2026, 10, 8, 10, 59))).toBe(true);
    expect(inDigestWindow(romeToDate(2026, 10, 8, 11, 30))).toBe(false);
  });
  it('le faccende non generano promemoria in coda (niente email)', () => {
    const rows = buildQueueRows(
      [{ ...base, kind: 'faccenda', rrule: 'FREQ=WEEKLY;BYDAY=TH', assignee_id: 'u1' }],
      users(),
      NOW,
    );
    expect(rows).toHaveLength(0);
  });
});

describe('fallback AI: output non fidato', () => {
  it('sanifica i campi', () => {
    expect(
      sanitizeLlm({ docType: 'bolletta', supplier: '  Enel  ', amount: 84.2, dueDate: '2026-10-15' }),
    ).toEqual({ docType: 'bolletta', supplier: 'Enel', amount: 84.2, dueDate: '2026-10-15' });
    expect(sanitizeLlm({ docType: 'hack', supplier: 5, amount: -3, dueDate: '15/10/2026' })).toEqual({
      docType: null,
      supplier: null,
      amount: null,
      dueDate: null,
    });
    expect(sanitizeLlm({ supplier: 'x'.repeat(500), amount: 1e9 })).toMatchObject({
      supplier: 'x'.repeat(80),
      amount: null,
    });
    expect(sanitizeLlm(null)).toEqual({ docType: null, supplier: null, amount: null, dueDate: null });
  });
  it('chiama Gemini con il solo testo e restituisce campi puliti', async () => {
    let sent = '';
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      sent = String(init.body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '{"docType":"multa","supplier":"Polizia Locale","amount":42,"dueDate":"2026-10-30","extra":"x"}',
                  },
                ],
              },
            },
          ],
        }),
      );
    });
    const r = await llmExtract({ GEMINI_API_KEY: 'k' } as Env, 'VERBALE di violazione importo 42,00 euro');
    vi.unstubAllGlobals();
    expect(r).toEqual({ docType: 'multa', supplier: 'Polizia Locale', amount: 42, dueDate: '2026-10-30' });
    expect(sent).toContain('VERBALE di violazione');
    expect(sent).not.toContain('"k"');
  });
  it('JSON non valido → campi vuoti, non errore', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'non json' }] } }] })),
    );
    expect(await llmExtract({ GEMINI_API_KEY: 'k' } as Env, 'testo')).toEqual({
      docType: null,
      supplier: null,
      amount: null,
      dueDate: null,
    });
    vi.unstubAllGlobals();
  });
  it('limite di 10 richieste al minuto', () => {
    const t = Date.now();
    for (let i = 0; i < 10; i++) {
      expect(rateLimited('u', t + i)).toBe(false);
    }
    expect(rateLimited('u', t + 11)).toBe(true);
    expect(rateLimited('u', t + 61_000)).toBe(false);
  });
});
