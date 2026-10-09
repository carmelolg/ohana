import { useEffect, useRef, useState } from 'react';
import type { CircleMarker, Map as LMap } from 'leaflet';
import { createMap, loadLeaflet, TILES_BROKEN_MESSAGE } from './leaflet';

/** Mappa di sola visualizzazione con segnaposto. */
export function MapView({ lat, lng }: { lat: number; lng: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const marker = useRef<CircleMarker | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      if (!el.current) {
        return;
      }
      const created = await createMap(
        el.current,
        { zoomControl: true, scrollWheelZoom: false },
        { lat, lng, zoom: 16 },
        setBroken,
      );
      if (disposed) {
        created.remove();
        return;
      }
      const L = await loadLeaflet();
      marker.current = L.circleMarker([lat, lng], {
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: '#b8613f',
        fillOpacity: 1,
      }).addTo(created);
      map.current = created;
    })();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // la mappa si crea una volta sola; le coordinate successive le sposta l'effetto qui sotto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    marker.current?.setLatLng([lat, lng]);
    map.current?.setView([lat, lng]);
  }, [lat, lng]);

  return (
    <>
      <div ref={el} role="img" aria-label="Mappa del luogo" className="map-view" />
      {broken && (
        <p className="muted" role="alert" style={{ fontSize: 13, marginTop: 6 }}>
          {TILES_BROKEN_MESSAGE}
        </p>
      )}
    </>
  );
}
