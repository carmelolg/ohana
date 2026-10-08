import { useState } from 'react';
import { formatDay, formatTime } from '@ohana/shared';
import { Sheet } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useCategories, useMutate } from '../../lib/data';
import { fromDateTimeInput } from '../../lib/date-input';
import { useDialog } from '../../lib/dialog';
import { useToast } from '../../lib/toast';
import type { Procedure, ProcedureStep } from '../../lib/types';
import { deleteStep, linkStepToCalendar, updateStep } from './procedureCommands';

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

/** Dettaglio di un passaggio: titolo, nota, collegamento al calendario, eliminazione. */
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

  async function save() {
    await updateStep(mutate, procedure, step.id, {
      title: title.trim() || step.title,
      note: note.trim() || null,
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
        <input
          className="input"
          aria-label="Titolo passaggio"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!writable}
        />
        <textarea
          className="input"
          aria-label="Nota del passaggio"
          placeholder="Nota (es. CAF Via Roma · fatto da Chiara)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={!writable}
        />
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
