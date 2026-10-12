import { useRef, useState, type ButtonHTMLAttributes } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, Trash2 } from 'lucide-react';
import { formatDay, formatTime } from '@ohana/shared';
import { FormError } from '../components/FormError';
import { LocationField } from '../components/LocationField';
import { VisitDiary } from '../components/VisitDiary';
import { VisitCareLink, VisitCareOutcome } from '../components/care/VisitCarePanel';
import { spaceColor } from '../lib/color';
import { useEventExpenses, useSpace, useSpaceRecipients } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { useEventActions } from '../lib/eventActions';
import { AttachmentList } from './event-editor/AttachmentList';
import { ChecklistField } from './event-editor/ChecklistField';
import { EventFields } from './event-editor/EventFields';
import { LinkedExpenses } from './event-editor/LinkedExpenses';
import { QuickText } from './event-editor/QuickText';
import { TITLE_REQUIRED } from './event-editor/validation';
import { AmountField, EditorHeader, KindSwitch, NotesField } from './event-editor/sections';
import { StatusBar } from './event-editor/StatusBar';
import { useEventForm, type EventForm } from './event-editor/useEventForm';
import { ExpenseForm } from './expenses/ExpenseForm';

/** Rimonta l'editor a ogni cambio di impegno o di parametri (altrimenti da «modifica» a «nuovo» resterebbero i dati precedenti). */
export function EventEditor() {
  const { id } = useParams();
  const { search } = useLocation();
  return <EventEditorScreen key={`${id ?? 'nuovo'}${search}`} />;
}

function EventEditorScreen() {
  const { id } = useParams();
  const form = useEventForm(id);
  const { isNew, existing, writable, space } = form;

  if (!isNew && form.isLoading) {
    return (
      <div className="empty" role="status" aria-busy="true">
        Caricamento…
      </div>
    );
  }
  if (!isNew && !existing) {
    return (
      <div className="empty">
        Impegno non trovato. <Link to="/oggi">Torna a Oggi</Link>
      </div>
    );
  }

  return (
    <div style={{ ['--space' as string]: spaceColor(space?.color_hue) }}>
      <EditorHeader form={form} />
      {existing && writable && <StatusBar form={form} />}
      <FormError message={form.error} />
      {existing?.categories?.slug === 'visita' && existing.status === 'done' && (
        <CompletedVisit form={form} />
      )}
      {existing?.categories?.slug === 'visita' && <VisitCareLink ev={existing} />}
      {form.isImported && (
        <p className="banner warn">
          Impegno importato da un calendario esterno: per cambiarlo modificalo lì, si aggiornerà da solo.
        </p>
      )}
      {!writable && !form.isImported && (
        <p className="banner warn">Hai accesso in sola lettura a questo spazio.</p>
      )}
      <EditorBody form={form} />
      {existing && writable && <DeleteAction form={form} />}
    </div>
  );
}

/** Testo libero, campi, note, allegati ed extra: tutto ciò che si compila. */
function EditorBody({ form }: { form: EventForm }) {
  const { isNew, isChore, existing } = form;
  return (
    <>
      {isNew && <KindSwitch form={form} />}
      <QuickText
        text={form.text}
        tokens={form.parsed?.tokens ?? null}
        isNew={isNew}
        isChore={isChore}
        readOnly={!form.writable}
        invalid={form.error === TITLE_REQUIRED}
        onChange={form.setText}
      />
      {isNew && (
        <div className="label" style={{ marginTop: 22 }}>
          Ho capito
        </div>
      )}
      <EventFields form={form} />
      {!isChore && <OptionalSections form={form} />}
      <NotesField form={form} />
      {form.showAmount && <AmountField form={form} />}
      <AttachmentList
        saved={existing?.attachments ?? []}
        pending={form.files}
        onRemovePending={form.removeFile}
      />
      {existing && <LinkedExpenses eventId={existing.id} />}
      {!isChore && <ExtrasBar form={form} />}
    </>
  );
}

/** Il luogo è sempre visibile; la checklist compare solo dopo averla aperta con «+ Checklist». */
function OptionalSections({ form }: { form: EventForm }) {
  return (
    <>
      <LocationField value={form.location} onChange={form.setLocation} />
      {form.showChecklist && (
        <ChecklistField
          items={form.checklist}
          eventId={form.existing?.id ?? ''}
          onChange={form.setChecklist}
        />
      )}
    </>
  );
}

/** Riepilogo di una visita già conclusa con il diario («com'è andata», prossimi passi). */
function CompletedVisit({ form }: { form: EventForm }) {
  const { memberName } = useSpace();
  const { existing, space, writable } = form;
  const hasCare = useSpaceRecipients(existing?.space_id).length > 0;
  if (!existing) {
    return null;
  }
  const when = new Date(existing.starts_at);
  const assignee = existing.assignee_id ? memberName(existing.assignee_id).split(' ')[0] : null;
  return (
    <>
      <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          className="muted"
          style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span className="dot" />
          {space?.name} · {existing.categories?.name}
        </span>
        <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1 }}>
          {existing.title}
        </h2>
        <span className="muted" style={{ fontSize: 14, textTransform: 'capitalize' }}>
          {[`${formatDay(when)} · ${formatTime(when)}`, existing.contacts?.name, assignee]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      {hasCare ? (
        <VisitCareOutcome ev={existing} writable={writable} />
      ) : (
        <VisitDiary ev={existing} writable={writable} />
      )}
      <div className="label" style={{ margin: '28px 0 4px' }}>
        Dettagli dell’impegno
      </div>
    </>
  );
}

/** Pulsante di aggiunta: pieno quando la voce ha già un contenuto (luogo, checklist, allegati), così si distingue dagli altri. */
function ExtraPill({
  isSet,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { isSet: boolean }) {
  return (
    <button type="button" className={isSet ? 'pill set' : 'pill'} {...props}>
      {isSet && <Check size={14} strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** «+ Allegato», «+ Checklist» e «+ Spesa». La spesa si apre sopra l'impegno, senza lasciarlo. */
function ExtrasBar({ form }: { form: EventForm }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const { existing } = form;
  const hasFiles = form.files.length > 0 || (existing?.attachments.length ?? 0) > 0;
  const hasExpenses = useEventExpenses(existing?.id).length > 0;
  return (
    <>
      <div className="pill-row">
        <ExtraPill isSet={hasFiles} onClick={() => fileInput.current?.click()}>
          + Allegato
        </ExtraPill>
        <ExtraPill isSet={form.checklist.length > 0} onClick={form.openChecklist}>
          + Checklist
        </ExtraPill>
        {existing && (
          <ExtraPill isSet={hasExpenses} onClick={() => setExpenseOpen(true)}>
            + Spesa
          </ExtraPill>
        )}
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => form.addFiles(Array.from(e.target.files ?? []))}
        />
      </div>
      {existing && expenseOpen && (
        <ExpenseForm
          initialSpace={existing.space_id}
          eventId={existing.id}
          initialDesc={existing.title}
          initialAmount={existing.amount != null ? String(existing.amount) : ''}
          onClose={() => setExpenseOpen(false)}
        />
      )}
    </>
  );
}

/** «Elimina» in fondo, rosso e secondario. */
function DeleteAction({ form }: { form: EventForm }) {
  const dialog = useDialog();
  const actions = useEventActions();
  const { existing, back } = form;
  if (!existing) {
    return null;
  }
  const remove = async () => {
    const confirmed = await dialog.confirm({
      title: 'Eliminare questo impegno?',
      message: existing.rrule ? 'Verranno eliminate tutte le occorrenze.' : undefined,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await actions.remove(existing);
    back();
  };
  return (
    <div className="hstack" style={{ marginTop: 22 }}>
      <button className="btn danger small" onClick={remove}>
        <Trash2 size={16} /> Elimina
      </button>
    </div>
  );
}
