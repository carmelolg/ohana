import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { BackLink } from '../../components/BackLink';
import { Field } from '../../components/Field';
import { FormError } from '../../components/FormError';
import { ExemptionsField } from '../../components/care/ExemptionsField';
import { useCareRecipients, useSpace } from '../../lib/data';
import type { CareRecipient } from '../../lib/types';
import type { RecipientForm } from './recipientForm';
import { LinkedMemberField } from './LinkedMemberField';
import { useRecipientForm } from './useRecipientForm';

interface FieldsProps {
  form: RecipientForm;
  patch: (p: Partial<RecipientForm>) => void;
  /** C'è stato un errore di salvataggio: i campi obbligatori vuoti si evidenziano. */
  invalid?: boolean;
}

/** Nome, nascita, codice fiscale, allergie ed esenzioni. */
function PersonFields({ form, patch, invalid }: FieldsProps) {
  return (
    <>
      <div className="hstack">
        <Field label="Nome" flex>
          <input
            className="input"
            aria-invalid={invalid && !form.firstName.trim() ? true : undefined}
            value={form.firstName}
            onChange={(e) => patch({ firstName: e.target.value })}
          />
        </Field>
        <Field label="Cognome" flex>
          <input
            className="input"
            value={form.lastName}
            onChange={(e) => patch({ lastName: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Come la chiamate (es. Papà)">
        <input className="input" value={form.label} onChange={(e) => patch({ label: e.target.value })} />
      </Field>
      <Field label="Data di nascita">
        <input
          className="input"
          type="date"
          value={form.birthDate}
          onChange={(e) => patch({ birthDate: e.target.value })}
        />
      </Field>
      <Field label="Codice fiscale">
        <input className="input" value={form.taxCode} onChange={(e) => patch({ taxCode: e.target.value })} />
      </Field>
      <Field label="Allergie (separate da virgola)">
        <input
          className="input"
          value={form.allergies}
          onChange={(e) => patch({ allergies: e.target.value })}
        />
      </Field>
      <ExemptionsField value={form.exemptions} onChange={(exemptions) => patch({ exemptions })} />
    </>
  );
}

interface CaregiversProps extends FieldsProps {
  me: string;
}

/** Chi fa da caregiver: membri dello spazio (non chi può solo consultare la Cura). */
function CaregiversField({ form, patch, me }: CaregiversProps) {
  const { spaces, memberName } = useSpace();
  const people = (spaces.find((s) => s.id === form.spaceId)?.space_members ?? []).filter(
    (m) => m.role !== 'care_viewer',
  );
  const toggle = (userId: string) =>
    patch({
      caregiverIds: form.caregiverIds.includes(userId)
        ? form.caregiverIds.filter((x) => x !== userId)
        : [...form.caregiverIds, userId],
    });
  return (
    <fieldset className="stack">
      <legend className="label">Caregiver</legend>
      {people.map((m) => (
        <label key={m.user_id} className="hstack" style={{ minHeight: 44 }}>
          <input
            type="checkbox"
            checked={form.caregiverIds.includes(m.user_id)}
            onChange={() => toggle(m.user_id)}
          />
          {m.user_id === me ? 'Tu' : memberName(m.user_id)}
        </label>
      ))}
      <span className="muted" style={{ fontSize: 13 }}>
        Ricevono il promemoria delle terapie; di turno c’è il primo, si cambia dalla scheda.
      </span>
    </fieldset>
  );
}

function Screen({ existing }: { existing: CareRecipient | null }) {
  const c = useRecipientForm(existing);
  const photoInput = useRef<HTMLInputElement>(null);
  return (
    <div className="care-form">
      <BackLink to={existing ? `/cura/${c.id}` : '/altro'} label={existing ? 'Scheda' : 'Altro'} />
      <h1 className="care-name">{existing ? 'Modifica scheda' : 'Nuova persona assistita'}</h1>
      <FormError message={c.error} />
      {!existing && (
        <Field label="Spazio">
          <select
            className="input"
            value={c.form.spaceId}
            onChange={(e) => c.patch({ spaceId: e.target.value, caregiverIds: [c.me], userId: '' })}
          >
            {c.writableSpaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <LinkedMemberField
        spaceId={c.form.spaceId}
        recipientId={c.id}
        userId={c.form.userId}
        onChange={c.linkMember}
      />
      <PersonFields form={c.form} patch={c.patch} invalid={!!c.error} />
      <CaregiversField form={c.form} patch={c.patch} me={c.me} />
      <button type="button" className="btn ghost small" onClick={() => photoInput.current?.click()}>
        {c.photo ? `Foto: ${c.photo.name}` : existing?.photo_path ? 'Cambia foto' : 'Aggiungi foto'}
      </button>
      <input
        ref={photoInput}
        type="file"
        hidden
        accept="image/*"
        onChange={(e) => c.setPhoto(e.target.files?.[0] ?? null)}
      />
      <button className="btn accent" disabled={c.busy} onClick={() => void c.save()}>
        Salva
      </button>
      {existing && (
        <button className="btn danger small" onClick={() => void c.remove()}>
          Elimina persona
        </button>
      )}
    </div>
  );
}

/** Nuova persona assistita o modifica della scheda. */
export function CareRecipientFormPage() {
  const { rid } = useParams();
  const { data: all = [], isLoading } = useCareRecipients();
  const existing = rid ? (all.find((r) => r.id === rid) ?? null) : null;
  if (rid && !existing) {
    return isLoading ? (
      <div className="empty">Caricamento…</div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  return <Screen key={existing?.id ?? 'nuova'} existing={existing} />;
}
