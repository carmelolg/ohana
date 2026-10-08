import { LocationField } from '../../components/LocationField';
import { Sheet } from '../../components/ui';
import type { Space } from '../../lib/types';
import type { ContactDraft } from './contactCommands';

const FIELDS = [
  { key: 'name', label: 'Nome' },
  { key: 'role', label: 'Ruolo (es. Cardiologo)' },
  { key: 'phone', label: 'Telefono' },
  { key: 'email', label: 'Email' },
] as const;

interface Props {
  draft: ContactDraft;
  onChange: (draft: ContactDraft) => void;
  /** Spazio preselezionato per un nuovo contatto. */
  defaultSpaceId: string | undefined;
  writableSpaces: Space[];
  onSave: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Creazione e modifica di un contatto della rubrica. */
export function ContactSheet({
  draft,
  onChange,
  defaultSpaceId,
  writableSpaces,
  onSave,
  onDelete,
  onClose,
}: Props) {
  return (
    <Sheet onClose={onClose} label="Contatto">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>{draft.id ? 'Modifica contatto' : 'Nuovo contatto'}</h3>
        {!draft.id && writableSpaces.length > 1 && (
          <select
            className="input"
            aria-label="Spazio"
            value={draft.space_id ?? defaultSpaceId}
            onChange={(e) => onChange({ ...draft, space_id: e.target.value })}
          >
            {writableSpaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {FIELDS.map(({ key, label }) => (
          <input
            key={key}
            className="input"
            aria-label={label}
            placeholder={label}
            value={draft[key] ?? ''}
            onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
          />
        ))}
        <LocationField
          label="Indirizzo"
          emptyLabel="Scegli indirizzo sulla mappa"
          changeLabel="Cambia indirizzo"
          removeLabel="Rimuovi indirizzo"
          value={{
            text: draft.address ?? '',
            lat: draft.address_lat ?? null,
            lng: draft.address_lng ?? null,
          }}
          onChange={(v) => onChange({ ...draft, address: v.text, address_lat: v.lat, address_lng: v.lng })}
        />
        <textarea
          className="input"
          placeholder="Note"
          aria-label="Note"
          value={draft.notes ?? ''}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
        />
        <div className="hstack">
          {draft.id && (
            <button className="btn danger" onClick={() => onDelete(draft.id!)}>
              Elimina
            </button>
          )}
          <button className="btn" style={{ flex: 1 }} onClick={onSave} disabled={!draft.name?.trim()}>
            Salva
          </button>
        </div>
      </div>
    </Sheet>
  );
}
