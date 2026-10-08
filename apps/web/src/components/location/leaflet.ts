import type { Map as LMap } from 'leaflet';

export const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Carica Leaflet solo al bisogno (pesa ~44 KB gzip) e restituisce il modulo. */
export const loadLeaflet = () => import('leaflet');

/** Mappa con i tile di OpenStreetMap. */
export async function createMap(
  el: HTMLElement,
  options: import('leaflet').MapOptions,
  view: { lat: number; lng: number; zoom: number },
): Promise<LMap> {
  const L = await loadLeaflet();
  const map = L.map(el, options).setView([view.lat, view.lng], view.zoom);
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
  return map;
}
