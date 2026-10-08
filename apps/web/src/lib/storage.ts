// localStorage può mancare o lanciare (finestra privata, dati del sito bloccati, anteprime): ogni accesso passa da qui
// e l'app deve funzionare comunque senza.

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage non disponibile: la preferenza vale solo per questa sessione */
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readStorage(key);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const writeJson = (key: string, value: unknown): void => writeStorage(key, JSON.stringify(value));
