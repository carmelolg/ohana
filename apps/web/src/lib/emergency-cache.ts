import { del, get, set } from 'idb-keyval';
import type { EmergencyInfo } from './types';

// Copia locale dei dati di emergenza: la pagina deve funzionare senza rete, anche dopo giorni.
// Viene aggiornata a ogni lettura e a ogni modifica, ed è condivisa con il service worker (Cache API).
const KEY = 'ohana-emergency-snapshot';
const CACHE = 'ohana-emergency-v1';

export interface Snapshot {
  savedAt: string;
  infos: EmergencyInfo[];
  spaces: { id: string; name: string; color_hue: number }[];
}

export async function saveSnapshot(s: Snapshot): Promise<void> {
  await set(KEY, s);
  try {
    // il service worker precarica e aggiorna la stessa copia (vedi sw.ts)
    navigator.serviceWorker?.controller?.postMessage({ type: 'emergency-cache', snapshot: s });
  } catch {
    /* nessun service worker (sviluppo) */
  }
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  const fromIdb = (await get<Snapshot>(KEY)) ?? null;
  if (fromIdb) {
    return fromIdb;
  }
  try {
    const r = await caches.match('/__emergency.json', { cacheName: CACHE });
    return r ? ((await r.json()) as Snapshot) : null;
  } catch {
    return null;
  }
}

/** Da chiamare all'uscita: i dati sensibili non devono restare sul dispositivo. */
export async function clearSnapshot(): Promise<void> {
  await del(KEY);
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'emergency-clear' });
    await caches.delete(CACHE);
  } catch {
    /* ignora */
  }
}
