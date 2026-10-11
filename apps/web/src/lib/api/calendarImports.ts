import { normalizeIcsUrl } from '@ohana/shared';
import { WORKER_URL } from '../config';
import { newId } from '../outbox';
import { supabase } from '../supabase';
import { unwrap } from './result';

export interface ImportInput {
  spaceId: string;
  userId: string;
  name: string;
  url: string;
}

const MAX_NAME = 80;

/** La riga da scrivere, con l'indirizzo già controllato. Gli errori sono messaggi per l'utente. */
export function buildImportRow(input: ImportInput) {
  const name = input.name.trim().slice(0, MAX_NAME);
  if (!name) {
    throw new Error('Dai un nome al calendario');
  }
  const url = normalizeIcsUrl(input.url);
  if (!url) {
    throw new Error(
      'Indirizzo non valido: incolla il link ICS del calendario (inizia con https:// o webcal://)',
    );
  }
  return { id: newId(), space_id: input.spaceId, user_id: input.userId, name, url };
}

/** Collega il calendario. Richiede la rete: la sincronizzazione parte subito dopo, con `syncCalendarNow`. */
export async function connectCalendar(input: ImportInput): Promise<string> {
  const row = buildImportRow(input);
  try {
    unwrap(await supabase.from('calendar_imports').insert(row));
  } catch {
    throw new Error('Non sono riuscito a collegare il calendario. Controlla la connessione e riprova.');
  }
  return row.id;
}

export async function disconnectCalendar(id: string): Promise<void> {
  try {
    unwrap(await supabase.from('calendar_imports').delete().eq('id', id));
  } catch {
    throw new Error('Non sono riuscito a scollegare il calendario. Controlla la connessione e riprova.');
  }
}

export interface SyncOutcome {
  ok: boolean;
  skipped?: boolean;
  written?: number;
  removed?: number;
  /** Messaggio del server, già in italiano. */
  error?: string;
}

/** Cosa dire all'utente quando il Worker non risponde con un esito. */
export function syncFailureMessage(status: number): string {
  if (status === 401) {
    return 'Accedi di nuovo per sincronizzare';
  }
  return status === 404
    ? 'Calendario non trovato'
    : 'Non riesco a sincronizzare ora. Controlla la connessione e riprova.';
}

/** Chiede al Worker di sincronizzare subito il calendario; il cron lo farebbe comunque entro un'ora. */
export async function syncCalendarNow(id: string): Promise<SyncOutcome> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error(syncFailureMessage(401));
  }
  let res: Response;
  try {
    res = await fetch(`${WORKER_URL}/calendar/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {
    throw new Error(syncFailureMessage(0)); // offline o Worker irraggiungibile
  }
  if (!res.ok) {
    throw new Error(syncFailureMessage(res.status));
  }
  return (await res.json()) as SyncOutcome;
}
