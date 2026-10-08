const SAVED_AT = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** Riga di stato sotto il titolo: offline (con data di salvataggio), in aggiornamento o disponibile. */
export function connectionStatus(
  offline: boolean,
  loading: boolean,
  savedAt: string | number | null | undefined,
) {
  if (offline) {
    return `Senza connessione · dati salvati${savedAt ? ` il ${SAVED_AT.format(new Date(savedAt))}` : ''}`;
  }
  return loading ? 'Aggiorno…' : 'Disponibile anche senza connessione';
}

/** Le informazioni «Da sapere» realmente compilate, nell'ordine di lettura. */
export function knownFacts(
  info:
    | { address?: string | null; intercom?: string | null; allergies?: string | null; notes?: string | null }
    | undefined,
): [string, string][] {
  const all: [string, string | null | undefined][] = [
    ['Indirizzo', info?.address],
    ['Citofono', info?.intercom],
    ['Allergie', info?.allergies],
    ['Note', info?.notes],
  ];
  return all.filter((f): f is [string, string] => !!f[1]);
}
