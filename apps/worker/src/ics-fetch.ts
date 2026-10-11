import { normalizeIcsUrl } from '@ohana/shared';

/** Errore con un messaggio già adatto all'utente (italiano, senza dettagli tecnici): finisce in `last_error`. */
export class ImportError extends Error {}

export type FetchText = (url: string) => Promise<string>;

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5_000_000;

/** Scarica il file ICS. L'indirizzo è una credenziale: non si scrive mai nei log né nei messaggi d'errore. */
export const fetchIcsText: FetchText = async (rawUrl) => {
  const url = normalizeIcsUrl(rawUrl);
  if (!url) {
    throw new ImportError('Indirizzo non valido');
  }
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'text/calendar, text/plain;q=0.5' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new ImportError('Il calendario non risponde'); // rete assente o troppo lento: ritenta alla prossima volta
  }
  // un reindirizzamento non deve portare a un indirizzo interno
  if (!res.ok || !normalizeIcsUrl(res.url || url)) {
    throw new ImportError(
      res.status === 403 || res.status === 404
        ? 'L’indirizzo non è più valido: copialo di nuovo dalle impostazioni del calendario'
        : 'Il calendario non risponde',
    );
  }
  const text = await res.text();
  if (text.length > MAX_BYTES) {
    throw new ImportError('Il calendario è troppo grande');
  }
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new ImportError('Il link non è un calendario');
  }
  return text;
};
