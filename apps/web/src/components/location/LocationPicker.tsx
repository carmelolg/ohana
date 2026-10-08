import { useRef } from 'react';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';
import { formatDistance, type Place } from '../../lib/geocode';
import type { LocationValue } from './types';
import { useMapPicker } from './useMapPicker';
import { usePlaceSearch } from './usePlaceSearch';

type Search = ReturnType<typeof usePlaceSearch>;

function SearchBar({ search, onCancel }: { search: Search; onCancel: () => void }) {
  return (
    <div className="hstack" style={{ gap: 6 }}>
      <button type="button" className="icon-btn picker-btn" aria-label="Chiudi" onClick={onCancel}>
        <X size={22} />
      </button>
      <div className="picker-search">
        <Search size={18} strokeWidth={1.75} aria-hidden />
        <input
          role="combobox"
          aria-label="Cerca un indirizzo o un posto"
          aria-expanded={!!search.results?.length}
          aria-controls="picker-results"
          autoComplete="off"
          autoFocus
          placeholder="Cerca un indirizzo o un posto"
          value={search.q}
          onChange={(e) => search.setQ(e.target.value)}
        />
        {search.q && (
          <button type="button" className="icon-btn" aria-label="Svuota ricerca" onClick={search.reset}>
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

interface ResultsProps {
  search: Search;
  /** Messaggio della mappa (posizione non disponibile…), mostrato se la ricerca non ne ha uno. */
  mapNote: string;
  onChoose: (place: Place) => void;
  onTextOnly: (text: string) => void;
}

function Results({ search, mapNote, onChoose, onTextOnly }: ResultsProps) {
  const note = search.note || mapNote;
  const typed = search.q.trim();
  return (
    <ul id="picker-results" role="listbox" className="picker-results">
      {search.busy && !search.results?.length && (
        <li className="muted" style={{ padding: '10px 14px' }}>
          Cerco vicino a te…
        </li>
      )}
      {search.results?.map((p, i) => (
        <li key={i} role="option" aria-selected={false}>
          <button type="button" className="picker-opt" onClick={() => onChoose(p)}>
            <MapPin size={18} strokeWidth={1.75} style={{ flex: 'none' }} />
            <span style={{ flex: 1 }}>{p.label}</span>
            {p.distance != null && (
              <span className="mono muted" style={{ fontSize: 12 }}>
                {formatDistance(p.distance)}
              </span>
            )}
          </button>
        </li>
      ))}
      {note && (
        <li className="muted" style={{ padding: '10px 14px', fontSize: 13 }}>
          {note}
        </li>
      )}
      {typed.length > 2 && (
        <li>
          <button type="button" className="picker-opt" onClick={() => onTextOnly(typed)}>
            <span style={{ flex: 1 }}>Usa solo il testo «{typed}» (senza mappa)</span>
          </button>
        </li>
      )}
    </ul>
  );
}

function SelectionCard({ picked, onConfirm }: { picked: LocationValue; onConfirm: () => void }) {
  const canConfirm = picked.text.trim().length > 0 && picked.lat != null;
  const label =
    picked.text || (picked.lat != null ? 'Cerco l’indirizzo…' : 'Sposta la mappa o cerca un indirizzo');
  return (
    <div className="picker-card">
      <div className="label">Luogo selezionato</div>
      <div style={{ fontSize: 17, fontWeight: 600, minHeight: 26 }}>{label}</div>
      <button type="button" className="btn accent" disabled={!canConfirm} onClick={onConfirm}>
        Conferma luogo
      </button>
    </div>
  );
}

interface Props {
  initial: LocationValue;
  onCancel: () => void;
  onConfirm: (v: LocationValue) => void;
}

/**
 * Selettore stile sito di mappe: mappa a tutto schermo con il segnaposto al centro; trascini la mappa e l'indirizzo
 * si aggiorna, oppure cerchi e ottieni indirizzi VICINI al punto che stai guardando (o alla tua posizione).
 */
export function LocationPicker({ initial, onCancel, onConfirm }: Props) {
  const clearResults = useRef<() => void>(() => undefined);
  const map = useMapPicker({ initial, onCancel, onUserMove: () => clearResults.current() });
  const search = usePlaceSearch({ currentView: map.currentView, here: map.here });
  clearResults.current = search.clearResults;

  const choose = (p: Place) => {
    map.setPicked({ text: p.label, lat: p.lat, lng: p.lng });
    search.reset();
    map.flyTo(p);
  };
  const showResults = !!(search.results?.length || search.note || map.note || search.busy);

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="Scegli il luogo">
      <div className="picker-top">
        <SearchBar search={search} onCancel={onCancel} />
        {showResults && (
          <Results
            search={search}
            mapNote={map.note}
            onChoose={choose}
            onTextOnly={(text) => onConfirm({ text, lat: null, lng: null })}
          />
        )}
      </div>

      <div ref={map.el} className="picker-map" />
      <div className="picker-pin" aria-hidden>
        <MapPin size={44} strokeWidth={1.5} fill="var(--accent-fill)" color="#fff" />
      </div>
      <button
        type="button"
        className="picker-btn picker-locate"
        aria-label="La mia posizione"
        onClick={() => (map.here ? map.flyTo(map.here) : map.locate())}
      >
        <LocateFixed size={22} strokeWidth={1.75} />
      </button>
      <SelectionCard picked={map.picked} onConfirm={() => onConfirm(map.picked)} />
    </div>
  );
}
