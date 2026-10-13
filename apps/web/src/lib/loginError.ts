/** Frase con cui l'hook di registrazione (migrazione 0025) rifiuta un'email non autorizzata: serve a riconoscerlo. */
const CLOSED_SIGNUP_MARKER = 'Accesso riservato';

const CLOSED_SIGNUP_MESSAGE =
  'Questo indirizzo non è autorizzato. Ohana è su invito: chiedi a chi la gestisce di invitarti con questa email.';

/** Messaggio per l'utente quando l'invio del link di accesso fallisce. */
export function sendLinkErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes(CLOSED_SIGNUP_MARKER)) {
    return CLOSED_SIGNUP_MESSAGE;
  }
  return 'Non riesco a inviare il link: ' + message;
}

/** Dopo Google il rifiuto torna nell'indirizzo della pagina (query o hash): lo trasformiamo in un messaggio. */
export function oauthErrorMessage(search: string, hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, '') || search);
  if (!params.get('error')) {
    return null;
  }
  const description = params.get('error_description') ?? '';
  if (description.includes(CLOSED_SIGNUP_MARKER)) {
    return CLOSED_SIGNUP_MESSAGE;
  }
  return 'Accesso non riuscito. Riprova o usa il link via email.';
}
