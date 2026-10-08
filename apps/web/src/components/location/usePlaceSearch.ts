import { useEffect, useState } from 'react';
import { searchPlaces, type LatLng, type Place } from '../../lib/geocode';

/** Zoom fino al quale la mappa mostra un'area troppo vasta per cercare «vicino»: si usa la posizione dell'utente. */
const COUNTRY_ZOOM = 7;
const NEAR_ME_ZOOM = 13;
const DEBOUNCE_MS = 350;

export interface MapView {
  center: LatLng;
  zoom: number;
}

interface Args {
  /** Cosa sta guardando la mappa adesso. */
  currentView: () => MapView;
  /** Posizione dell'utente, se nota. */
  here: LatLng | null;
}

/** Punto e zoom attorno a cui cercare: la mappa, oppure l'utente se la mappa mostra ancora tutta l'Italia. */
export function searchAnchor(view: MapView, here: LatLng | null): MapView {
  return view.zoom <= COUNTRY_ZOOM && here ? { center: here, zoom: NEAR_ME_ZOOM } : view;
}

function failureNote(): string {
  return navigator.onLine
    ? 'Ricerca non disponibile al momento.'
    : 'Sei offline: puoi usare il testo che hai scritto.';
}

/** Ricerca di indirizzi con attesa dopo l'ultimo tasto, annullamento delle richieste superate e messaggi per l'utente. */
export function usePlaceSearch({ currentView, here }: Args) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      const { center, zoom } = searchAnchor(currentView(), here);
      setBusy(true);
      try {
        const found = await searchPlaces(q, center, zoom, ctrl.signal);
        setResults(found);
        setNote(
          found.length
            ? ''
            : 'Nessun indirizzo trovato qui vicino. Prova a spostare la mappa o a scrivere anche la città.',
        );
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setNote(failureNote());
        }
      } finally {
        setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
    // ripete la ricerca quando arriva la posizione dell'utente (i suggerimenti diventano «vicini a te»);
    // `currentView` legge la mappa al momento e non deve rilanciarla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, here]);

  return {
    q,
    setQ,
    results,
    busy,
    note,
    /** Svuota i suggerimenti (la mappa è stata spostata a mano). */
    clearResults: () => setResults(null),
    /** Azzera ricerca, risultati e messaggio. */
    reset: () => {
      setQ('');
      setResults(null);
      setNote('');
    },
  };
}
