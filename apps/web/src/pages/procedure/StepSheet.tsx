import { useRef, useState } from 'react';
import { formatDay, formatTime } from '@ohana/shared';
import { Sheet } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useCategories, useContacts, useMutate } from '../../lib/data';
import { uploadAttachment } from '../../lib/files';
import { fromDateTimeInput } from '../../lib/date-input';
import { useDialog } from '../../lib/dialog';
import { useToast } from '../../lib/toast';
import type { Procedure, ProcedureStep } from '../../lib/types';
import { attachToStep, deleteStep, linkStepToCalendar, updateStep } from './procedureCommands';

interface Props {
  step: ProcedureStep;
  procedure: Procedure;
  /** Data dell'impegno collegato, se c'è. */
  linkedAt: string | undefined;
  writable: boolean;
  onClose: () => void;
}

interface LinkProps {
  linkedAt: string | undefined;
  writable: boolean;
  when: string;
  onWhen: (v: string) => void;
  onLink: () => void;
  onUnlink: () => void;
}

/** Collegamento del passaggio al calendario: data collegata (scollegabile), campo per collegarlo, o nulla. */
function CalendarLink({ linkedAt, writable, when, onWhen, onLink, onUnlink }: LinkProps) {
  if (linkedAt) {
    return (
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <span>
          {formatDay(new Date(linkedAt))} · {formatTime(new Date(linkedAt))}
        </span>
        {writable && (
          <button className="btn ghost small" onClick={onUnlink}>
            Scollega
          </button>
        )}
      </div>
    );
  }
  if (!writable) {
    return <span className="muted">Non collegato a un impegno</span>;
  }
  return (
    <div className="hstack">
      <input
        className="input"
        type="datetime-local"
        aria-label="Data e ora dell'appuntamento"
        value={when}
        onChange={(e) => onWhen(e.target.value)}
      />
      <button className="btn small" onClick={onLink}>
        Aggiungi
      </button>
    </div>
  );
}

type Outcome = ProcedureStep['quote_outcome'];

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: null, label: 'Nessuno' },
  { value: 'scelto', label: 'Scelto' },
  { value: 'scartato', label: 'Scartato' },
];

/** Importo, ditta ed esito del preventivo di una fase, come li digita l'utente. */
export interface CostValues {
  amount: string;
  contactId: string;
  outcome: Outcome;
}

export const costOf = (step: ProcedureStep): CostValues => ({
  amount: step.amount != null ? String(step.amount).replace('.', ',') : '',
  contactId: step.contact_id ?? '',
  outcome: step.quote_outcome,
});

interface CostProps {
  procedure: Procedure;
  value: CostValues;
  onChange: (value: CostValues) => void;
  disabled: boolean;
}

/** Importo, ditta ed esito del preventivo di una fase. */
function CostFields({ procedure, value, onChange, disabled }: CostProps) {
  const { data: contacts = [] } = useContacts();
  return (
    <>
      <div className="label">Importo e ditta</div>
      <div className="hstack">
        <input
          className="input"
          inputMode="decimal"
          aria-label="Importo della fase"
          placeholder="0,00 €"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
          disabled={disabled}
        />
        <select
          className="input"
          aria-label="Ditta della fase"
          value={value.contactId}
          onChange={(e) => onChange({ ...value, contactId: e.target.value })}
          disabled={disabled}
        >
          <option value="">Nessuna ditta</option>
          {contacts
            .filter((c) => c.space_id === procedure.space_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
      <div className="chips-row" role="group" aria-label="Esito del preventivo">
        {OUTCOMES.map((o) => (
          <button
            key={o.label}
            type="button"
            className="chip"
            aria-pressed={value.outcome === o.value}
            disabled={disabled}
            onClick={() => onChange({ ...value, outcome: o.value })}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** «+ Allegato»: carica un file e lo lega alla fase. */
function AttachButton({
  procedure,
  step,
  onError,
}: {
  procedure: Procedure;
  step: ProcedureStep;
  onError: (message: string) => void;
}) {
  const mutate = useMutate();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  async function attach(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const saved = await uploadAttachment(procedure.space_id, file, file.name, {
        folder: `pratiche/${procedure.id}`,
      });
      await attachToStep(mutate, procedure, step, { attachmentId: saved.id, name: file.name });
      toast(`«${file.name}» allegato`);
    } catch (e) {
      onError('Caricamento non riuscito: ' + (e as Error).message);
    }
  }
  return (
    <>
      <button type="button" className="pill" onClick={() => input.current?.click()}>
        + Allegato
      </button>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/*,application/pdf"
        aria-label="Allega un file alla fase"
        onChange={(e) => {
          void attach(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}

function SaveBar({ onRemove, onSave }: { onRemove: () => void; onSave: () => void }) {
  return (
    <div className="hstack">
      <button className="btn danger small" onClick={onRemove}>
        Elimina
      </button>
      <span style={{ flex: 1 }} />
      <button className="btn accent" onClick={onSave}>
        Salva
      </button>
    </div>
  );
}

interface NameProps {
  title: string;
  note: string;
  onTitle: (v: string) => void;
  onNote: (v: string) => void;
  disabled: boolean;
}

function NameFields({ title, note, onTitle, onNote, disabled }: NameProps) {
  return (
    <>
      <input
        className="input"
        aria-label="Titolo passaggio"
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        disabled={disabled}
      />
      <textarea
        className="input"
        aria-label="Nota del passaggio"
        placeholder="Nota (es. CAF Via Roma · fatto da Chiara)"
        value={note}
        onChange={(e) => onNote(e.target.value)}
        disabled={disabled}
      />
    </>
  );
}

/** Dettaglio di un passaggio: titolo, nota, costi, allegati, collegamento al calendario, eliminazione. */
export function StepSheet({ step, procedure, linkedAt, writable, onClose }: Props) {
  const { session, profile } = useAuth();
  const { data: categories = [] } = useCategories();
  const mutate = useMutate();
  const toast = useToast();
  const dialog = useDialog();
  const [title, setTitle] = useState(step.title);
  const [note, setNote] = useState(step.note ?? '');
  const [when, setWhen] = useState('');
  const [error, setError] = useState('');
  const [cost, setCost] = useState(() => costOf(step));

  async function save() {
    const amount = cost.amount.trim() ? Number(cost.amount.replace(',', '.')) : null;
    if (amount !== null && !(amount >= 0)) {
      return setError('Importo non valido');
    }
    await updateStep(mutate, procedure, step.id, {
      title: title.trim() || step.title,
      note: note.trim() || null,
      amount,
      contact_id: cost.contactId || null,
      quote_outcome: cost.outcome,
    });
    onClose();
  }

  async function link() {
    const at = fromDateTimeInput(when);
    if (!at) {
      return setError('Scegli data e ora');
    }
    try {
      await linkStepToCalendar(mutate, {
        procedure,
        step,
        at,
        userId: session!.user.id,
        categoryId: categories.find((c) => c.space_id === procedure.space_id && c.slug === 'burocrazia')?.id,
        reminderMinutes: profile?.default_reminder_minutes ?? 1440,
      });
      toast('Aggiunto al calendario');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function unlink() {
    await updateStep(mutate, procedure, step.id, { event_id: null });
    onClose();
  }

  async function remove() {
    if (
      !(await dialog.confirm({ title: `Eliminare «${step.title}»?`, confirmLabel: 'Elimina', danger: true }))
    ) {
      return;
    }
    await deleteStep(mutate, procedure, step.id);
    onClose();
  }

  return (
    <Sheet onClose={onClose} label="Passaggio">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Passaggio</h3>
        <NameFields title={title} note={note} onTitle={setTitle} onNote={setNote} disabled={!writable} />
        <CostFields procedure={procedure} value={cost} onChange={setCost} disabled={!writable} />
        {writable && <AttachButton procedure={procedure} step={step} onError={setError} />}
        <div className="label">Calendario</div>
        <CalendarLink
          linkedAt={linkedAt}
          writable={writable}
          when={when}
          onWhen={setWhen}
          onLink={link}
          onUnlink={unlink}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {writable && <SaveBar onRemove={remove} onSave={save} />}
      </div>
    </Sheet>
  );
}
