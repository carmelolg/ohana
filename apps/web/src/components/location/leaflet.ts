import type { Map as LMap } from 'leaflet';

export const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Carica Leaflet solo al bisogno (pesa ~44 KB gzip) e restituisce il modulo. */
export const loadLeaflet = () => import('leaflet');

/** Dopo quanti errori di fila (senza nessun tassello caricato) si considera la mappa non raggiungibile. */
const BROKEN_AFTER_ERRORS = 4;

/**
 * Mappa con i tile di OpenStreetMap. `onTilesBroken(true)` avvisa quando i tasselli non si caricano (rete, estensioni
 * che bloccano le richieste, limiti del servizio): senza, l'utente vedrebbe solo un riquadro vuoto.
 */
export async function createMap(
  el: HTMLElement,
  options: import('leaflet').MapOptions,
  view: { lat: number; lng: number; zoom: number },
  onTilesBroken?: (broken: boolean) => void,
): Promise<LMap> {
  const L = await loadLeaflet();
  const map = L.map(el, options).setView([view.lat, view.lng], view.zoom);
  // `origin`: il servizio di OpenStreetMap pretende un Referer; così parte sempre (e solo il dominio, niente percorso)
  const layer = L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION, referrerPolicy: 'origin' });
  let errors = 0;
  layer.on('tileerror', () => {
    errors += 1;
    if (errors >= BROKEN_AFTER_ERRORS) {
      onTilesBroken?.(true);
    }
  });
  layer.on('tileload', () => {
    errors = 0;
    onTilesBroken?.(false);
  });
  layer.addTo(map);
  return map;
}

export const TILES_BROKEN_MESSAGE =
  'Non riesco a caricare la mappa di OpenStreetMap. Controlla la connessione o i blocchi del browser (estensioni, modalità privacy): il luogo resta valido.';
