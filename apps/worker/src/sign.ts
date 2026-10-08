// Token firmati (HMAC-SHA256) per i link «Segna fatto» / «Rimanda» che funzionano senza login.
const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function key(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export interface ActionPayload {
  e: string; // event id
  x: number; // scadenza (epoch s)
}

export async function signAction(
  secret: string,
  eventId: string,
  ttlSeconds = 14 * 86400,
  now = Date.now(),
): Promise<string> {
  const body = b64url(
    enc.encode(
      JSON.stringify({ e: eventId, x: Math.floor(now / 1000) + ttlSeconds } satisfies ActionPayload),
    ),
  );
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifyAction(
  secret: string,
  token: string,
  now = Date.now(),
): Promise<ActionPayload | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) {
    return null;
  }
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(secret), fromB64url(sig), enc.encode(body));
    if (!ok) {
      return null;
    }
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as ActionPayload;
    return p.x * 1000 > now ? p : null;
  } catch {
    return null;
  }
}
