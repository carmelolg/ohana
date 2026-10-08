import type { Env } from './env';

const utf8 = new TextEncoder();

function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const wrap76 = (s: string) => s.replace(/(.{76})/g, '$1\r\n');

/** Messaggio RFC 5322 (HTML, UTF-8): oggetto codificato come da RFC 2047, corpo in base64. */
export function buildMime(from: string, to: string, subject: string, html: string): string {
  if (/[\r\n]/.test(from + to + subject)) {
    throw new Error('Intestazioni email non valide');
  }
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${b64(utf8.encode(subject))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(utf8.encode(html))),
  ].join('\r\n');
}

let cached: { token: string; exp: number } | null = null;

async function accessToken(env: Env): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) {
    return cached.token;
  }
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
    throw new Error(
      'Gmail non configurato: servono GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REFRESH_TOKEN',
    );
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = (await r.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!r.ok || !j.access_token) {
    throw new Error(
      `Gmail OAuth: ${j.error ?? r.status} ${j.error_description ?? ''}${j.error === 'invalid_grant' ? ' (refresh token scaduto o revocato: se l’app Google è in modalità «Testing» scade dopo 7 giorni)' : ''}`,
    );
  }
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cached.token;
}

export const resetGmailTokenCache = () => {
  cached = null;
};

export async function sendGmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  const raw = b64url(utf8.encode(buildMime(env.MAIL_FROM, to, subject, html)));
  const send = (token: string) =>
    fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
  let r = await send(await accessToken(env));
  if (r.status === 401) {
    cached = null; // token revocato prima della scadenza: ne chiede uno nuovo e riprova una volta
    r = await send(await accessToken(env));
  }
  if (!r.ok) {
    throw new Error(`Gmail ${r.status}: ${await r.text()}`);
  }
}
