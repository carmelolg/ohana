import { describe, expect, it } from 'vitest';
import { parseActionRequest } from '../src/http/action';
import { messagePage } from '../src/http/respond';
import { route } from '../src/http/router';
import { escapeHtml } from '../src/escape-html';
import { inSendWindow, parseClock } from '../src/window';
import { romeToDate } from '@ohana/shared';
import type { Env } from '../src/env';

const env = {
  APP_URL: 'http://app',
  WORKER_URL: 'http://worker',
  SUPABASE_URL: 'http://localhost:1',
  SUPABASE_SERVICE_ROLE_KEY: 'x',
  ACTION_SECRET: 's',
} as Env;
const call = (path: string, init?: RequestInit) => route(new Request(`http://w${path}`, init), env);

describe('escapeHtml / messagePage', () => {
  it('neutralizza i caratteri speciali', () =>
    expect(escapeHtml(`<img src=x onerror="a()">&`)).toBe('&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;'));
  it('il titolo della pagina è escapato', async () => {
    const html = await messagePage('<script>x</script>', '<p>ok</p>').text();
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('parseActionRequest', () => {
  const parse = (q: string) => parseActionRequest(new URL(`http://w/azione/t${q}`));
  it('default: fatto', () => expect(parse('')).toEqual({ action: 'done', minutes: 60 }));
  it("rimanda di un giorno o un'ora, altro valore → un'ora", () => {
    expect(parse('?a=snooze&m=1440')).toEqual({ action: 'snooze', minutes: 1440 });
    expect(parse('?a=snooze&m=7')).toEqual({ action: 'snooze', minutes: 60 });
  });
  it('azione sconosciuta → null', () => expect(parse('?a=boom')).toBeNull());
});

describe('router', () => {
  it('health', async () => expect(await (await call('/health')).text()).toBe('ok'));
  it('percorso sconosciuto: risposta di cortesia', async () =>
    expect((await call('/nope')).status).toBe(200));
  it('azione: GET mostra solo la conferma (non esegue)', async () => {
    const r = await call('/azione/qualunque?a=done');
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('Conferma');
  });
  it('azione non valida → 400', async () => expect((await call('/azione/x?a=boom')).status).toBe(400));
  it('azione con token falso (POST) → 400', async () =>
    expect((await call('/azione/falso.token?a=done', { method: 'POST' })).status).toBe(400));
  it("CORS del preflight di /scan/parse è limitato all'app", async () => {
    const r = await call('/scan/parse', { method: 'OPTIONS' });
    expect(r.headers.get('access-control-allow-origin')).toBe('http://app');
  });
});

describe('finestra di invio', () => {
  it('parseClock accetta HH:MM e HH:MM:SS', () => {
    expect(parseClock('07:30')).toBe(450);
    expect(parseClock('07:30:00')).toBe(450);
  });
  it('inSendWindow: da orario a +3h', () => {
    const start = parseClock('07:30');
    expect(inSendWindow(romeToDate(2026, 10, 8, 7, 29), start)).toBe(false);
    expect(inSendWindow(romeToDate(2026, 10, 8, 7, 30), start)).toBe(true);
    expect(inSendWindow(romeToDate(2026, 10, 8, 10, 30), start)).toBe(true);
    expect(inSendWindow(romeToDate(2026, 10, 8, 10, 31), start)).toBe(false);
  });
});
