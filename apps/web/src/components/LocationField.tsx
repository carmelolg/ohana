import { useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { osmDirections, osmLink } from '../lib/geocode';
import { LocationPicker } from './location/LocationPicker';
import { MapView } from './location/MapView';
import { NO_LOCATION, type LocationValue } from './location/types';
import 'leaflet/dist/leaflet.css';

export { MapView } from './location/MapView';
export type { LocationValue } from './location/types';

/** Campo «Luogo» dell'impegno: riepilogo con mappa e apertura del selettore. */
export function LocationField({
  value,
  onChange,
  label = 'Luogo',
  emptyLabel = 'Scegli luogo sulla mappa',
  changeLabel = 'Cambia luogo',
  removeLabel = 'Rimuovi luogo',
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  label?: string;
  emptyLabel?: string;
  changeLabel?: string;
  removeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasPoint = value.lat != null && value.lng != null;
  return (
    <div className="field" style={{ marginTop: 14 }}>
      <span className="label">{label}</span>
      {value.text ? (
        <div className="card" style={{ padding: 14 }}>
          <div className="hstack" style={{ alignItems: 'flex-start' }}>
            <MapPin size={20} strokeWidth={1.75} style={{ flex: 'none', marginTop: 2 }} />
            <div style={{ flex: 1, fontWeight: 600 }}>{value.text}</div>
            <button
              type="button"
              className="icon-btn"
              aria-label={removeLabel}
              onClick={() => onChange(NO_LOCATION)}
            >
              <X size={18} />
            </button>
          </div>
          {hasPoint && <MapView lat={value.lat!} lng={value.lng!} />}
          <div className="hstack" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn ghost small" onClick={() => setOpen(true)}>
              {changeLabel}
            </button>
            {hasPoint && (
              <a
                className="btn ghost small"
                target="_blank"
                rel="noreferrer"
                href={osmDirections(value.lat!, value.lng!)}
              >
                <Navigation size={16} /> Indicazioni
              </a>
            )}
            {hasPoint && (
              <a
                className="btn ghost small"
                target="_blank"
                rel="noreferrer"
                href={osmLink(value.lat!, value.lng!)}
              >
                Apri in OpenStreetMap
              </a>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn ghost"
          style={{ justifyContent: 'flex-start' }}
          onClick={() => setOpen(true)}
        >
          <MapPin size={18} strokeWidth={1.75} /> {emptyLabel}
        </button>
      )}
      {open && (
        <LocationPicker
          initial={value}
          onCancel={() => setOpen(false)}
          onConfirm={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
