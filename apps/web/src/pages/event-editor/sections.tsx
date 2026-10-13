import type { EventForm } from './useEventForm';

const HEADER_LABEL = {
  new: { chore: 'Nuova faccenda', event: 'Nuovo impegno' },
  edit: { chore: 'Modifica faccenda', event: 'Modifica impegno' },
} as const;

const headerLabel = ({ isNew, isChore }: EventForm) =>
  HEADER_LABEL[isNew ? 'new' : 'edit'][isChore ? 'chore' : 'event'];

/** Testata fissa: «Annulla · titolo della schermata · Salva». */
export function EditorHeader({ form }: { form: EventForm }) {
  return (
    <div className="editor-head">
      <button type="button" className="btn ghost small editor-cancel" onClick={() => form.back()}>
        Annulla
      </button>
      <span className="label editor-head-title">{headerLabel(form)}</span>
      <button
        type="button"
        className="btn accent small editor-save"
        onClick={form.save}
        disabled={form.busy || !form.writable}
      >
        Salva
      </button>
    </div>
  );
}

/** Impegno o faccenda: solo per le nuove voci. */
export function KindSwitch({ form }: { form: EventForm }) {
  return (
    <div className="seg" style={{ marginTop: 10 }} role="group" aria-label="Tipo">
      <button
        type="button"
        aria-pressed={!form.isChore}
        onClick={() => form.override('kind', 'appuntamento')}
      >
        Impegno
      </button>
      <button type="button" aria-pressed={form.isChore} onClick={() => form.override('kind', 'faccenda')}>
        Faccenda
      </button>
    </div>
  );
}

export function NotesField({ form }: { form: EventForm }) {
  return (
    <div className="field" style={{ marginTop: 14 }}>
      <label className="label" htmlFor="notes">
        Note
      </label>
      <textarea
        id="notes"
        className="input"
        value={form.notes}
        onChange={(e) => form.setNotes(e.target.value)}
        placeholder="Es. portare tessera sanitaria, essere a digiuno"
      />
    </div>
  );
}

export function AmountField({ form }: { form: EventForm }) {
  return (
    <div className="field" style={{ marginTop: 14 }}>
      <label className="label" htmlFor="amount">
        Importo (€)
      </label>
      <input
        id="amount"
        className="input"
        inputMode="decimal"
        value={form.amount}
        onChange={(e) => form.setAmount(e.target.value)}
        placeholder="0,00"
      />
    </div>
  );
}
