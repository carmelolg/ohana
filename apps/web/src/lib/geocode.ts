// Ricerca e geocodifica inversa su dati OpenStreetMap tramite Photon (photon.komoot.io, gratuito).
// Politica d'uso: richieste moderate (attesa dopo l'ultimo tasto / dopo che la mappa si ferma) e attribuzione «© OpenStreetMap contributors».
import { trackBusy } from './busy';

export interface Place {
  label: string;
  lat: number;
  lng: number;
  /** metri dal centro della mappa al momento della ricerca */
  distance?: number;
}
export interface LatLng {
  lat: number;
  lng: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export function formatPlace(p: PhotonFeature['properties']): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const place = p.city ?? p.town ?? p.village ?? p.county;
  const first = p.name && p.name !== street ? p.name : '';
  return [first, street, [p.postcode, place].filter(Boolean).join(' '), p.state === place ? '' : p.state]
    .filter((x, i, a) => x && a.indexOf(x) === i)
    .join(', ');
}

/** Distanza in metri (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const formatDistance = (m: number) =>
  m < 950
    ? `${Math.round(m / 10) * 10} m`
    : m < 10000
      ? `${(m / 1000).toFixed(1).replace('.', ',')} km`
      : `${Math.round(m / 1000)} km`;

const toPlaces = (features: PhotonFeature[], near?: LatLng): Place[] =>
  features
    .map((f) => {
      const lng = f.geometry.coordinates[0];
      const lat = f.geometry.coordinates[1];
      return {
        label: formatPlace(f.properties),
        lat,
        lng,
        distance: near ? distanceM(near, { lat, lng }) : undefined,
      };
    })
    .filter((p) => p.label);

const PHOTON = 'https://photon.komoot.io';

/**
 * Riquadro attorno a `c` la cui ampiezza dipende dallo zoom (città/quartiere). Null se la mappa è troppo ampia
 * (zoom ≤ 7: vista nazionale) e restringere non avrebbe senso.
 */
export function nearbyBbox(c: LatLng, zoom: number): [number, number, number, number] | null {
  if (zoom <= 7) {
    return null;
  }
  const half = Math.min(1.2, Math.max(0.12, 360 / 2 ** (zoom - 2))); // gradi di latitudine
  const halfLng = half / Math.max(0.2, Math.cos((c.lat * Math.PI) / 180));
  return [c.lng - halfLng, c.lat - half, c.lng + halfLng, c.lat + half];
}

/**
 * URL delle ricerche. Photon NON accetta lang=it (risponde 400): si usa la lingua predefinita.
 * Il bias di vicinanza di Photon da solo è debole (cercando «via roma» a Milano restituisce paesi lontani),
 * quindi la prima ricerca è limitata a un riquadro attorno al centro mappa; la seconda, globale, completa i risultati.
 */
export function buildSearchUrls(
  query: string,
  near: LatLng,
  zoom: number,
): { local: string | null; global: string } {
  const base = {
    q: query.trim(),
    lat: String(near.lat),
    lon: String(near.lng),
    zoom: String(Math.max(8, Math.min(16, Math.round(zoom)))),
    location_bias_scale: '0.6',
  };
  const box = nearbyBbox(near, zoom);
  return {
    local: box
      ? `${PHOTON}/api/?${new URLSearchParams({ ...base, limit: '10', bbox: box.map((n) => n.toFixed(5)).join(',') })}`
      : null,
    global: `${PHOTON}/api/?${new URLSearchParams({ ...base, limit: '8' })}`,
  };
}

/** Cerca luoghi mostrando prima quelli vicini a `near` (ordinati per distanza), poi gli altri. */
export async function searchPlaces(
  query: string,
  near: LatLng,
  zoom: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  if (query.trim().length < 2) {
    return [];
  }
  const urls = buildSearchUrls(query, near, zoom);
  const get = async (u: string): Promise<Place[]> => {
    const r = await trackBusy(() => fetch(u, { signal }));
    if (!r.ok) {
      throw new Error(`Ricerca indirizzi non disponibile (${r.status})`);
    }
    return toPlaces(((await r.json()) as { features: PhotonFeature[] }).features, near);
  };
  const [local, global] = await Promise.all([
    urls.local
      ? get(urls.local).catch((e) => {
          if ((e as Error).name === 'AbortError') {
            throw e;
          }
          return [];
        })
      : [],
    get(urls.global),
  ]);
  const key = (p: Place) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of [...local.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)), ...global]) {
    if (seen.has(key(p)) || seen.has(p.label)) {
      continue;
    }
    seen.add(key(p));
    seen.add(p.label);
    out.push(p);
  }
  return out.slice(0, 8);
}

/** Indirizzo del punto indicato (geocodifica inversa). */
export async function reversePlace(at: LatLng, signal?: AbortSignal): Promise<string | null> {
  const r = await trackBusy(() =>
    fetch(
      `${PHOTON}/reverse?${new URLSearchParams({ lat: String(at.lat), lon: String(at.lng), limit: '1' })}`,
      { signal },
    ),
  );
  if (!r.ok) {
    throw new Error(`Indirizzo non disponibile (${r.status})`);
  }
  const j = (await r.json()) as { features: PhotonFeature[] };
  return j.features[0] ? formatPlace(j.features[0].properties) || null : null;
}

export const coordLabel = (p: LatLng) => `Punto sulla mappa (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})`;
export const osmLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
export const osmDirections = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
