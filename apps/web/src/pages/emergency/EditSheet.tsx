import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/ui';
import { moveItem, removeItem, updateItem } from '../../lib/lists';
import type { EmergencyContact, EmergencyInfo } from '../../lib/types';

interface Props {
  info: EmergencyInfo | undefined;
  spaceId: string;
  onClose: () => void;
  onSave: (row: Record<string, unknown>) => Promise<void>;
}

const emptyToNull = (value: string) => value.trim() || null;

interface EditorProps {
  contact: EmergencyContact;
  index: number;
  count: number;
  onField: (field: keyof EmergencyContact, value: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

const CONTACT_FIELDS: { field: keyof EmergencyContact; label: string; placeholder: string; tel?: boolean }[] =
  [
    { field: 'name', label: 'Nome contatto', placeholder: 'Nome (es. Dott.ssa Neri)' },
    { field: 'role', label: 'Ruolo contatto', placeholder: 'Ruolo (es. Medico di base · lun–ven 9–12)' },
    { field: 'phone', label: 'Telefono contatto', placeholder: 'Telefono', tel: true },
  ];

function ContactEditor({ contact, index, count, onField, onMove, onRemove }: EditorProps) {
  return (
    <div className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
      {CONTACT_FIELDS.map(({ field, label, placeholder, tel }) => (
        <input
          key={field}
          className="input"
          aria-label={`${label} ${index + 1}`}
          inputMode={tel ? 'tel' : undefined}
          placeholder={placeholder}
          value={contact[field]}
          onChange={(e) => onField(field, e.target.value)}
        />
      ))}
      <div className="hstack">
        <button
          type="button"
          className="icon-btn"
          aria-label="Sposta su"
          onClick={() => onMove(-1)}
          disabled={index === 0}
        >
          <ArrowUp size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Sposta giù"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
        >
          <ArrowDown size={18} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="icon-btn"
          aria-label={`Elimina ${contact.name || 'contatto'}`}
          onClick={onRemove}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

interface TextFields {
  address: string;
  intercom: string;
  allergies: string;
  notes: string;
}

const TEXT_FIELDS: { key: keyof Omit<TextFields, 'notes'>; label: string; placeholder: string }[] = [
  { key: 'address', label: 'Indirizzo', placeholder: 'Indirizzo (es. Via Garibaldi 14, 2° piano)' },
  { key: 'intercom', label: 'Citofono', placeholder: 'Citofono (es. Moretti · codice 2417)' },
  { key: 'allergies', label: 'Allergie', placeholder: 'Allergie (es. Penicillina)' },
];

function InfoFields({
  values,
  onChange,
}: {
  values: TextFields;
  onChange: (key: keyof TextFields, v: string) => void;
}) {
  return (
    <>
      {TEXT_FIELDS.map(({ key, label, placeholder }) => (
        <input
          key={key}
          className="input"
          aria-label={label}
          placeholder={placeholder}
          value={values[key]}
          onChange={(e) => onChange(key, e.target.value)}
        />
      ))}
      <textarea
        className="input"
        aria-label="Note"
        placeholder="Note libere (terapie, esenzioni, dove sono le chiavi…)"
        value={values.notes}
        onChange={(e) => onChange('notes', e.target.value)}
      />
    </>
  );
}

/** Modifica dei dati di emergenza dello spazio: contatti ordinabili, indirizzo, citofono, allergie, note. */
export function EditSheet({ info, spaceId, onClose, onSave }: Props) {
  const [contacts, setContacts] = useState<EmergencyContact[]>(info?.contacts ?? []);
  const [text, setText] = useState<TextFields>({
    address: info?.address ?? '',
    intercom: info?.intercom ?? '',
    allergies: info?.allergies ?? '',
    notes: info?.notes ?? '',
  });
  const [error, setError] = useState('');

  async function save() {
    if (!contacts.every((c) => c.name.trim() && c.phone.trim())) {
      return setError('Ogni contatto ha bisogno di nome e telefono');
    }
    try {
      await onSave({
        space_id: spaceId,
        contacts: contacts.map((c) => ({ name: c.name.trim(), role: c.role.trim(), phone: c.phone.trim() })),
        address: emptyToNull(text.address),
        intercom: emptyToNull(text.intercom),
        allergies: emptyToNull(text.allergies),
        notes: emptyToNull(text.notes),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Sheet onClose={onClose} label="Modifica emergenza">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Emergenza</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Il 112 è sempre il primo. Qui sotto i contatti, nell'ordine in cui compaiono.
        </p>
        {contacts.map((c, i) => (
          <ContactEditor
            key={i}
            contact={c}
            index={i}
            count={contacts.length}
            onField={(field, value) => setContacts((l) => updateItem(l, i, { [field]: value }))}
            onMove={(dir) => setContacts((l) => moveItem(l, i, dir))}
            onRemove={() => setContacts((l) => removeItem(l, i))}
          />
        ))}
        <button
          type="button"
          className="btn ghost small"
          onClick={() => setContacts((l) => [...l, { name: '', role: '', phone: '' }])}
        >
          <Plus size={16} /> Aggiungi contatto
        </button>
        <InfoFields values={text} onChange={(key, value) => setText((t) => ({ ...t, [key]: value }))} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="hstack">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Annulla
          </button>
          <button className="btn accent" style={{ flex: 1 }} onClick={save}>
            Salva
          </button>
        </div>
      </div>
    </Sheet>
  );
}
