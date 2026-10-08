import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LMap } from 'leaflet';
import { coordLabel, reversePlace, type LatLng } from '../../lib/geocode';
import { readJson, writeJson } from '../../lib/storage';
import { createMap } from './leaflet';
import type { LocationValue } from './types';
import type { MapView } from './usePlaceSearch';

const ITALY: LatLng = { lat: 42.5, lng: 12.5 };
const LAST_VIEW_KEY = 'ohana-map-center';
const REVERSE_DELAY_MS = 700;
const DETAIL_ZOOM = 17;
const COUNTRY_ZOOM = 6;

const isCoord = (v: unknown, limit: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;

/** L'ultima vista salvata, solo se ha coordinate e zoom sensati (un valore vecchio o rovinato non deve rompere la mappa). */
export function validView(saved: { c?: Partial<LatLng>; z?: number } | null | undefined): MapView | null {
  const { c, z } = saved ?? {};
  if (!c || !isCoord(c.lat, 90) || !isCoord(c.lng, 180) || !isCoord(z, 22) || z < 1) {
    return null;
  }
  return { center: { lat: c.lat, lng: c.lng }, zoom: z };
}

/** Vista da cui parte la mappa: il luogo già scelto, l'ultima vista usata, altrimenti tutta l'Italia. */
export function startView(initial: LocationValue): MapView {
  if (initial.lat != null && initial.lng != null) {
    return { center: { lat: initial.lat, lng: initial.lng }, zoom: DETAIL_ZOOM };
  }
  return validView(readJson(LAST_VIEW_KEY)) ?? { center: ITALY, zoom: COUNTRY_ZOOM };
}

interface Args {
  initial: LocationValue;
  /** Esc chiude il selettore (e solo quello, non la finestra sotto). */
  onCancel: () => void;
  /** L'utente ha spostato la mappa a mano. */
  onUserMove: () => void;
}

/** Posizione dell'utente (geolocalizzazione del browser) con i messaggi per i casi in cui non è disponibile. */
function useUserLocation(onFound: (p: LatLng) => void) {
  const [here, setHere] = useState<LatLng | null>(null);
  const [note, setNote] = useState('');
  const locate = (silent = false) => {
    if (!('geolocation' in navigator)) {
      return !silent && setNote('Posizione non disponibile su questo dispositivo.');
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHere(p);
        setNote('');
        onFound(p);
      },
      () => !silent && setNote('Non riesco a leggere la tua posizione: controlla i permessi del browser.'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };
  return { here, note, locate };
}

/** Dopo una pausa del trascinamento cerca l'indirizzo del punto e lo scrive nel luogo scelto (se è ancora quel punto). */
function useReverseAddress(setPicked: (update: (p: LocationValue) => LocationValue) => void) {
  const timer = useRef<number>();
  const ctrl = useRef<AbortController>();
  const cancel = () => {
    window.clearTimeout(timer.current);
    ctrl.current?.abort();
  };
  const schedule = (at: LatLng) => {
    cancel();
    timer.current = window.setTimeout(async () => {
      const current = (ctrl.current = new AbortController());
      const apply = (text: string) =>
        setPicked((p) => (p.lat === at.lat && p.lng === at.lng ? { ...p, text } : p));
      try {
        apply((await reversePlace(at, current.signal)) ?? coordLabel(at));
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          apply(coordLabel(at));
        }
      }
    }, REVERSE_DELAY_MS);
  };
  return { schedule, cancel };
}

/**
 * Mappa con il segnaposto fisso al centro: trascinandola l'indirizzo si aggiorna (geocodifica inversa con attesa),
 * `flyTo` la sposta senza rifare la geocodifica, `locate` usa la posizione dell'utente.
 */
export function useMapPicker({ initial, onCancel, onUserMove }: Args) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const programmaticMoves = useRef(0);
  const userMoved = useRef(onUserMove);
  userMoved.current = onUserMove;
  const [picked, setPicked] = useState<LocationValue>(initial);
  const start = useMemo(() => startView(initial), []); // eslint-disable-line react-hooks/exhaustive-deps
  const reverse = useReverseAddress(setPicked);

  const flyTo = (p: LatLng, zoom = DETAIL_ZOOM) => {
    programmaticMoves.current++;
    mapRef.current?.setView([p.lat, p.lng], zoom, { animate: true });
  };
  const user = useUserLocation((p) => {
    if (initial.lat == null) {
      flyTo(p, 16);
    }
  });

  const onMoveEnd = (map: LMap) => {
    const c = map.getCenter();
    if (validView({ c, z: map.getZoom() })) {
      writeJson(LAST_VIEW_KEY, { c: { lat: c.lat, lng: c.lng }, z: map.getZoom() });
    }
    if (programmaticMoves.current > 0) {
      programmaticMoves.current--; // spostamento causato da noi: l'indirizzo è già noto
      return;
    }
    const at = { lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6) };
    setPicked({ text: '', lat: at.lat, lng: at.lng });
    userMoved.current();
    reverse.schedule(at);
  };

  useEffect(() => {
    let disposed = false;
    void (async () => {
      if (!el.current) {
        return;
      }
      const L = await import('leaflet');
      const map = await createMap(
        el.current,
        { zoomControl: false, attributionControl: true },
        { ...start.center, zoom: start.zoom },
      );
      if (disposed) {
        map.remove();
        return;
      }
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      map.on('moveend', () => onMoveEnd(map));
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 50); // il pannello Leaflet si dimensiona dopo la comparsa del modale
    })();
    // la posizione dell'utente si usa subito solo se il permesso è già stato concesso
    void navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((s) => s.state === 'granted' && user.locate(true))
      .catch(() => undefined); // senza Permissions API si aspetta il pulsante «La mia posizione»
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => {
      disposed = true;
      window.removeEventListener('keydown', closeOnEscape, true);
      reverse.cancel();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // il selettore crea la mappa una volta sola per tutta la sua vita
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    el,
    picked,
    setPicked,
    here: user.here,
    note: user.note,
    flyTo,
    locate: user.locate,
    /** Cosa guarda la mappa adesso (prima che esista: la vista di partenza). */
    currentView: (): MapView => {
      const map = mapRef.current;
      return map ? { center: map.getCenter(), zoom: map.getZoom() } : start;
    },
  };
}
