import type { Db } from '../db';
import type { Env } from '../env';
import { llmExtract, rateLimited } from '../scan';
import { jsonResponse } from './respond';

export const scanCors = (env: Env) => ({
  'Access-Control-Allow-Origin': env.APP_URL,
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});

const MIN_TEXT_LENGTH = 10;

/** `POST /scan/parse`: fallback AI per la scansione. Riceve solo testo OCR e solo se l'utente lo ha attivato nelle impostazioni. */
export async function handleScanParse(req: Request, env: Env, db: Db): Promise<Response> {
  const reply = (body: unknown, status = 200) => jsonResponse(body, status, scanCors(env));
  const token = /^Bearer (.+)$/.exec(req.headers.get('Authorization') ?? '')?.[1];
  if (!token) {
    return reply({ error: 'auth' }, 401);
  }
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) {
    return reply({ error: 'auth' }, 401);
  }
  const { data: profile } = await db
    .from('profiles')
    .select('scan_llm_fallback')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (!profile?.scan_llm_fallback) {
    return reply({ error: 'disattivato nelle impostazioni' }, 403);
  } // attivabile solo dall'utente
  if (!env.GEMINI_API_KEY) {
    return reply({ error: 'non configurato' }, 501);
  }
  if (rateLimited(auth.user.id)) {
    return reply({ error: 'troppe richieste' }, 429);
  }
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof body?.text !== 'string' || body.text.trim().length < MIN_TEXT_LENGTH) {
    return reply({ error: 'testo mancante' }, 400);
  }
  try {
    return reply(await llmExtract(env, body.text));
  } catch (e) {
    console.error('llm', e);
    return reply({ error: 'servizio AI non disponibile' }, 502);
  }
}
