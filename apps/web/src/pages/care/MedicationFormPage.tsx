import { useParams } from 'react-router-dom';
import { BackLink } from '../../components/BackLink';
import { Field } from '../../components/Field';
import { FormError } from '../../components/FormError';
import { ScheduleField } from '../../components/care/ScheduleField';
import { useDialog } from '../../lib/dialog';
import type { CareRecipient, CareThread, Medication, MedicationDose } from '../../lib/types';
import type { MedForm } from './medicationForm';
import { useMedicationForm } from './useMedicationForm';
import { useRecipientData } from './useRecipientData';

interface FieldsProps {
  form: MedForm;
  threads: CareThread[];
  patch: (p: Partial<MedForm>) => void;
  invalid?: boolean;
}

/** Nome, posologia, filone e scorta. */
function BasicFields({ form, threads, patch, invalid }: FieldsProps) {
  return (
    <>
      <Field label="Nome">
        <input
          className="input"
          aria-invalid={invalid && !form.name.trim() ? true : undefined}
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>
      <Field label="Dosaggio (es. 2,5 mg)">
        <input
          className="input"
          value={form.strength}
          onChange={(e) => patch({ strength: e.target.value })}
        />
      </Field>
      <div className="hstack">
        <Field label="Quante per volta" flex>
          <input
            className="input"
            inputMode="decimal"
            value={form.doseUnits}
            onChange={(e) => patch({ doseUnits: e.target.value })}
          />
        </Field>
        <Field label="Unità" flex>
          <input className="input" value={form.unit} onChange={(e) => patch({ unit: e.target.value })} />
        </Field>
      </div>
      <ScheduleField value={form.schedule} onChange={(schedule) => patch({ schedule })} />
      <Field label="Note (es. a digiuno)">
        <input className="input" value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
      </Field>
      <Field label="Filone di cura">
        <select className="input" value={form.threadId} onChange={(e) => patch({ threadId: e.target.value })}>
          <option value="">Generale (medico di base)</option>
          {threads.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="hstack">
        <Field label="Scorta attuale" flex>
          <input
            className="input"
            inputMode="decimal"
            value={form.stock}
            onChange={(e) => patch({ stock: e.target.value })}
          />
        </Field>
        <Field label="Pezzi per confezione" flex>
          <input
            className="input"
            inputMode="numeric"
            value={form.packageUnits}
            onChange={(e) => patch({ packageUnits: e.target.value })}
          />
        </Field>
      </div>
    </>
  );
}

/** Chi prescrive, chi fa la ricetta e il piano terapeutico. */
function PrescriptionFields({ form, patch }: Omit<FieldsProps, 'threads'>) {
  return (
    <>
      <Field label="Prescritto da">
        <input
          className="input"
          value={form.prescriber}
          onChange={(e) => patch({ prescriber: e.target.value })}
        />
      </Field>
      <Field label="Ricetta fatta da (se diverso)">
        <input
          className="input"
          value={form.refillBy}
          onChange={(e) => patch({ refillBy: e.target.value })}
        />
      </Field>
      <Field label="Piano terapeutico: scadenza">
        <input
          className="input"
          type="date"
          value={form.planDate}
          onChange={(e) => patch({ planDate: e.target.value })}
        />
      </Field>
      <Field label="Piano terapeutico: ente">
        <input
          className="input"
          value={form.planIssuer}
          onChange={(e) => patch({ planIssuer: e.target.value })}
        />
      </Field>
    </>
  );
}

interface ScreenProps {
  recipient: CareRecipient;
  existing: Medication | null;
  threads: CareThread[];
  doses: MedicationDose[];
}

function MedicationScreen({ recipient, existing, threads, doses }: ScreenProps) {
  const dialog = useDialog();
  const { form, error, busy, save, toggleActive, remove, patch } = useMedicationForm(
    recipient,
    existing,
    doses,
  );

  const confirmRemove = async () => {
    const ok = await dialog.confirm({
      title: `Eliminare ${form.name || 'questa terapia'}?`,
      message: 'Spariscono anche le dosi segnate. Per tenerne lo storico, sospendila.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (ok) {
      await remove();
    }
  };

  return (
    <div className="care-form">
      <BackLink to={`/cura/${recipient.id}/terapie`} label="Terapie" />
      <h1 className="care-name">{existing ? existing.name : 'Nuovo farmaco'}</h1>
      <FormError message={error} />
      <BasicFields form={form} threads={threads} patch={patch} invalid={!!error} />
      <PrescriptionFields form={form} patch={patch} />
      <button className="btn accent" disabled={busy} onClick={() => void save()}>
        Salva
      </button>
      {existing && (
        <div className="hstack">
          <button className="btn ghost small" onClick={() => void toggleActive()}>
            {existing.active ? 'Sospendi' : 'Riattiva'}
          </button>
          <button className="btn danger small" onClick={() => void confirmRemove()}>
            Elimina
          </button>
        </div>
      )}
    </div>
  );
}

/** Aggiunta e modifica di un farmaco: posologia, scorta, ricetta e piano terapeutico. */
export function CareMedicationFormPage() {
  const { rid, mid } = useParams();
  const data = useRecipientData(rid);
  const existing = mid && mid !== 'nuova' ? (data.meds.find((m) => m.id === mid) ?? null) : null;
  if (!data.recipient) {
    return data.loading ? (
      <div className="empty" role="status" aria-busy="true">
        Caricamento…
      </div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  if (mid && mid !== 'nuova' && !existing) {
    return <div className="empty">Terapia non trovata</div>;
  }
  if (!data.canWrite) {
    return <div className="empty">Hai accesso in sola lettura.</div>;
  }
  return (
    <MedicationScreen
      key={existing?.id ?? 'nuova'}
      recipient={data.recipient}
      existing={existing}
      threads={data.threads.filter((t) => t.status === 'attivo')}
      doses={data.doses}
    />
  );
}
