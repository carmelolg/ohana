const MAX_URL_LENGTH = 2000;
const PRIVATE_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home.arpa'];
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Indirizzo di un calendario ICS che il Worker può scaricare: accetta `webcal://` (Apple) e `https://` e restituisce
 * sempre `https://`. Rifiuta tutto ciò che non è un sito pubblico (indirizzi IP, nomi interni, credenziali nell'URL),
 * perché a scaricarlo è un server: un indirizzo interno sarebbe una porta verso la rete di chi lo ospita.
 */
export function normalizeIcsUrl(input: string): string | null {
  const text = input.trim().replace(/^webcal:\/\//i, 'https://');
  if (!text || text.length > MAX_URL_LENGTH) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null; // testo che non è un indirizzo: l'utente vede «Indirizzo non valido»
  }
  const host = url.hostname.toLowerCase();
  const internal = !host.includes('.') || host.startsWith('[') || IPV4.test(host);
  if (url.protocol !== 'https:' || url.username || url.password || internal) {
    return null;
  }
  return PRIVATE_SUFFIXES.some((s) => host.endsWith(s)) ? null : url.toString();
}
