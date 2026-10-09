import { useParams } from 'react-router-dom';
import { CARE_PARAMS, PARAM_KEYS } from '@ohana/shared';
import { BackLink } from '../../components/BackLink';
import { Field } from '../../components/Field';
import { FormError } from '../../components/FormError';
import { HueSwatches } from '../../components/HueSwatches';
import { useContacts } from '../../lib/data';
import type { CareRecipient, CareThread } from '../../lib/types';
import type { ThreadForm } from './threadForm';
import { useRecipientData } from './useRecipientData';
import { useThreadForm } from './useThreadForm';

interface FieldsProps {
  form: ThreadForm;
  patch: (p: Partial<ThreadForm>) => void;
  recipient: CareRecipient;
  invalid?: boolean;
}

function ThreadFields({ form, patch, recipient, invalid }: FieldsProps) {
  const { data: contacts = [] } = useContacts();
  const toggleParam = (key: string) =>
    patch({
      trackedParams: form.trackedParams.includes(key)
        ? form.trackedParams.filter((k) => k !== key)
        : [...form.trackedParams, key],
    });
  return (
    <>
      <Field label="Nome del filone (es. Tachicardia)">
        <input
          className="input"
          aria-invalid={invalid && !form.title.trim() ? true : undefined}
          value={form.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </Field>
      <div className="hstack">
        <Field label="Specialità" flex>
          <input
            className="input"
            value={form.specialty}
            onChange={(e) => patch({ specialty: e.target.value })}
          />
        </Field>
        <Field label="Medico" flex>
          <input className="input" value={form.doctor} onChange={(e) => patch({ doctor: e.target.value })} />
        </Field>
      </div>
      <Field label="Medico in Rubrica">
        <select
          className="input"
          value={form.contactId}
          onChange={(e) => patch({ contactId: e.target.value })}
        >
          <option value="">Nessuno</option>
          {contacts
            .filter((c) => c.space_id === recipient.space_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Data di inizio">
        <input
          className="input"
          type="date"
          value={form.startedAt}
          onChange={(e) => patch({ startedAt: e.target.value })}
        />
      </Field>
      <div className="stack">
        <span className="label">Colore</span>
        <HueSwatches
          value={form.colorHue}
          onChange={(colorHue) => patch({ colorHue })}
          labelPrefix="Colore del filone"
        />
      </div>
      <fieldset className="stack">
        <legend className="label">Parametri da monitorare</legend>
        {PARAM_KEYS.map((key) => (
          <label key={key} className="hstack" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              checked={form.trackedParams.includes(key)}
              onChange={() => toggleParam(key)}
            />
            {CARE_PARAMS[key].label}
          </label>
        ))}
      </fieldset>
    </>
  );
}

function Screen({
  recipient,
  existing,
  usedHues,
}: {
  recipient: CareRecipient;
  existing: CareThread | null;
  usedHues: number[];
}) {
  const c = useThreadForm(recipient, existing, usedHues);
  const back = existing ? `/cura/${recipient.id}/filone/${c.id}` : `/cura/${recipient.id}`;
  return (
    <div className="care-form">
      <BackLink to={back} label="Indietro" />
      <h1 className="care-name">{existing ? 'Modifica filone' : 'Nuovo filone'}</h1>
      <FormError message={c.error} />
      <ThreadFields form={c.form} patch={c.patch} recipient={recipient} invalid={!!c.error} />
      <button className="btn accent" disabled={c.busy} onClick={() => void c.save()}>
        Salva
      </button>
      {existing && (
        <div className="hstack">
          <button className="btn ghost small" onClick={() => void c.toggleStatus()}>
            {existing.status === 'attivo' ? 'Chiudi il filone' : 'Riapri il filone'}
          </button>
          <button className="btn danger small" onClick={() => void c.remove()}>
            Elimina
          </button>
        </div>
      )}
    </div>
  );
}

/** Nuovo filone di cura o modifica di uno esistente. */
export function CareThreadFormPage() {
  const { rid, tid } = useParams();
  const data = useRecipientData(rid);
  const existing = tid ? (data.threads.find((t) => t.id === tid) ?? null) : null;
  if (!data.recipient) {
    return data.loading ? (
      <div className="empty">Caricamento…</div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  if (tid && !existing) {
    return <div className="empty">Filone non trovato</div>;
  }
  if (!data.canWrite) {
    return <div className="empty">Hai accesso in sola lettura.</div>;
  }
  return (
    <Screen
      key={existing?.id ?? 'nuovo'}
      recipient={data.recipient}
      existing={existing}
      usedHues={data.threads.map((t) => t.color_hue)}
    />
  );
}
