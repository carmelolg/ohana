import { doneActionPatch, snoozeActionPatch, type ActionEvent } from '@ohana/shared';
import type { Db } from '../db';
import type { Env } from '../env';
import { verifyAction } from '../sign';
import { PUBLIC_CORS, messagePage, paragraph } from './respond';

type ActionName = 'done' | 'snooze';
const ACTIONS: readonly string[] = ['done', 'snooze'] satisfies ActionName[];
const SNOOZE_CHOICES = [60, 1440];
const DEFAULT_SNOOZE_MINUTES = 60;

interface ActionRequest {
  action: ActionName;
  minutes: number;
}
interface ActionResult {
  ok: boolean;
  msg: string;
}

/** Legge `?a=done|snooze&m=60|1440`; `null` se l'azione non è riconosciuta. */
export function parseActionRequest(url: URL): ActionRequest | null {
  const action = url.searchParams.get('a') ?? 'done';
  if (!ACTIONS.includes(action)) {
    return null;
  }
  const minutes = Number(url.searchParams.get('m'));
  return {
    action: action as ActionName,
    minutes: SNOOZE_CHOICES.includes(minutes) ? minutes : DEFAULT_SNOOZE_MINUTES,
  };
}

const snoozeLabel = (minutes: number) => (minutes >= 1440 ? 'un giorno' : `${minutes / 60} ora`);

type ActionTarget = ActionEvent & { id: string; title: string };

async function applyAction(
  db: Db,
  ev: ActionTarget,
  { action, minutes }: ActionRequest,
): Promise<ActionResult> {
  if (action === 'done') {
    await db.from('events').update(doneActionPatch(ev, new Date())).eq('id', ev.id);
    return { ok: true, msg: `«${ev.title}» segnato come fatto.` };
  }
  const patch = snoozeActionPatch(ev, minutes);
  if (!patch) {
    return { ok: false, msg: 'Questo impegno è ricorrente: aprilo in Ohana per cambiare l’orario.' };
  }
  await db.from('events').update(patch).eq('id', ev.id);
  return { ok: true, msg: `«${ev.title}» rimandato di ${snoozeLabel(minutes)}.` };
}

async function runAction(env: Env, db: Db, token: string, request: ActionRequest): Promise<ActionResult> {
  const payload = await verifyAction(env.ACTION_SECRET, token);
  if (!payload) {
    return { ok: false, msg: 'Link scaduto o non valido.' };
  }
  const { data: ev } = await db
    .from('events')
    .select('id, title, starts_at, ends_at, rrule, status')
    .eq('id', payload.e)
    .maybeSingle();
  if (!ev) {
    return { ok: false, msg: 'Impegno non trovato (forse è stato eliminato).' };
  }
  return applyAction(db, ev as ActionTarget, request);
}

const confirmLabel = ({ action, minutes }: ActionRequest) =>
  action === 'done' ? 'Segna come fatto' : `Rimanda di ${minutes >= 1440 ? '1 giorno' : '1 ora'}`;

const CONFIRM_FORM =
  '<form method="post"><button style="min-height:48px;padding:0 24px;border-radius:24px;border:0;background:#26211c;color:#fffdf9;font-size:16px;font-weight:600">Conferma</button></form>';

/**
 * `/azione/:token`. GET mostra solo una conferma esplicita (gli anti-spam che aprono i link non eseguono l'azione);
 * POST esegue e risponde con una pagina oppure, per le chiamate dalle notifiche push, con testo semplice.
 */
export async function handleAction(req: Request, env: Env, db: Db, token: string): Promise<Response> {
  const request = parseActionRequest(new URL(req.url));
  if (!request) {
    return messagePage('Azione non valida', paragraph('Link non valido.'), 400);
  }
  if (req.method !== 'POST') {
    return messagePage(confirmLabel(request), CONFIRM_FORM);
  }
  const result = await runAction(env, db, token, request);
  const status = result.ok ? 200 : 400;
  if (req.headers.get('accept')?.includes('text/html')) {
    return messagePage(result.ok ? 'Fatto' : 'Ops', paragraph(result.msg), status);
  }
  return new Response(result.msg, { status, headers: PUBLIC_CORS });
}
