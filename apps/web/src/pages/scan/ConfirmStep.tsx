import { useState } from 'react';
import { DOC_FOLDERS, DOC_TYPE_LABEL, formatEuro, type DocType } from '@ohana/shared';
import { CheckButton } from '../../components/CheckButton';
import { spaceColor } from '../../lib/color';
import type { Space } from '../../lib/types';
import type { ScanForm } from './useScanForm';

const SHORT_DATE = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const NOTICE_DAYS = [1, 2, 3, 5, 7, 14];
const MISSING = (
  <span className="muted" style={{ fontWeight: 400 }}>
    non letto
  </span>
);

interface RowProps {
  id: string;
  label: string;
  display: React.ReactNode;
  editing: string | null;
  onEdit: (id: string | null) => void;
  children: React.ReactNode;
}

/** Riga «etichetta — valore letto»: un tocco apre l'editor del campo. */
function FieldRow({ id, label, display, editing, onEdit, children }: RowProps) {
  const open = editing === id;
  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <button
        type="button"
        className="kv"
        style={{ width: '100%', border: 0, textAlign: 'left' }}
        onClick={() => onEdit(open ? null : id)}
        aria-expanded={open}
        aria-label={`${label}: tocca per correggere`}
      >
        <span>{label}</span>
        <span style={{ textAlign: 'right' }}>{display}</span>
      </button>
      {open && <div style={{ paddingBottom: 10 }}>{children}</div>}
    </div>
  );
}

/** Riga con casella e testo che contiene controlli (es. il numero di giorni di preavviso). */
function OptionRow({
  label,
  checked,
  disabled,
  onToggle,
  children,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 15,
        minHeight: 44,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <CheckButton
        checked={checked}
        label={label}
        disabled={disabled}
        onToggle={() => onToggle(!checked)}
        style={{ margin: '0 -12px' }}
      />
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

const stopClick = (e: React.MouseEvent) => e.stopPropagation();

/** Editor dell'importo: campo libero e, se il documento ha più cifre plausibili, le alternative da toccare. */
function AmountEditor({ form }: { form: ScanForm }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <input
        className="input"
        aria-label="Importo"
        inputMode="decimal"
        placeholder="Es. 84,20"
        value={form.amount}
        onChange={(e) => form.setAmount(e.target.value)}
      />
      {form.candidates.length > 1 && (
        <>
          <span className="muted" style={{ fontSize: 13 }}>
            Altre cifre trovate nel documento: tocca quella giusta
          </span>
          <div className="pill-row" style={{ marginTop: 0 }} role="group" aria-label="Importi trovati">
            {form.candidates.map((c) => (
              <button
                key={c}
                type="button"
                className="pill"
                aria-pressed={form.amountValue === c}
                onClick={() => form.chooseAmount(c)}
              >
                {formatEuro(c)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Editor del tipo di documento. */
function TypeEditor({ form }: { form: ScanForm }) {
  return (
    <select
      className="input"
      aria-label="Tipo di documento"
      value={form.docType}
      onChange={(e) => form.chooseType(e.target.value as DocType)}
    >
      {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => (
        <option key={t} value={t}>
          {DOC_TYPE_LABEL[t]}
        </option>
      ))}
    </select>
  );
}

/** Editor dello spazio in cui salvare (solo quelli in cui si può scrivere). */
function SpaceEditor({ form, spaces, canWrite }: Pick<Props, 'form' | 'spaces' | 'canWrite'>) {
  return (
    <select
      className="input"
      aria-label="Spazio"
      value={form.spaceId}
      onChange={(e) => form.setSpaceId(e.target.value)}
    >
      {spaces
        .filter((s) => canWrite(s.id))
        .map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
    </select>
  );
}

interface Props {
  form: ScanForm;
  spaces: Space[];
  space: Space | undefined;
  canWrite: (spaceId: string) => boolean;
}

/** Elenco dei campi letti, correggibili con un tocco. */
export function ReadFields({ form, spaces, space, canWrite }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const row = { editing, onEdit: setEditing };
  const { amountValue, dueDate } = form;
  return (
    <div className="card" style={{ padding: '4px 16px' }}>
      <FieldRow id="tipo" label="Tipo" display={<b>{form.label || DOC_TYPE_LABEL[form.docType]}</b>} {...row}>
        <TypeEditor form={form} />
      </FieldRow>
      <FieldRow
        id="fornitore"
        label="Fornitore"
        display={form.supplier ? <b>{form.supplier}</b> : MISSING}
        {...row}
      >
        <input
          className="input"
          aria-label="Fornitore"
          value={form.supplier}
          onChange={(e) => form.setSupplier(e.target.value)}
        />
      </FieldRow>
      <FieldRow
        id="importo"
        label="Importo"
        display={amountValue != null ? <b>{formatEuro(amountValue)}</b> : MISSING}
        {...row}
      >
        <AmountEditor form={form} />
      </FieldRow>
      <FieldRow
        id="scadenza"
        label="Scadenza"
        display={
          dueDate ? <b style={{ color: 'var(--accent-ink)' }}>{SHORT_DATE.format(dueDate)}</b> : MISSING
        }
        {...row}
      >
        <input
          className="input"
          type="date"
          aria-label="Scadenza"
          value={form.due}
          onChange={(e) => form.setDue(e.target.value)}
        />
      </FieldRow>
      <FieldRow
        id="spazio"
        label="Spazio"
        display={
          <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="dot" style={{ background: spaceColor(space?.color_hue) }} />
            {space?.name ?? '—'}
          </b>
        }
        {...row}
      >
        <SpaceEditor form={form} spaces={spaces} canWrite={canWrite} />
      </FieldRow>
    </div>
  );
}

/** Cosa fare del documento: scadenza con promemoria, archiviazione, divisione della spesa. */
export function SaveOptions({ form, memberCount }: { form: ScanForm; memberCount: number }) {
  const { daysBefore, dueDate, amountValue } = form;
  const dayWord = daysBefore === 1 ? 'giorno' : 'giorni';
  return (
    <div style={{ margin: '18px 4px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <OptionRow
        checked={form.createDue && !!dueDate}
        disabled={!dueDate}
        onToggle={form.setCreateDue}
        label={`Crea scadenza e ricordamelo ${daysBefore} ${dayWord} prima`}
      >
        Crea scadenza e ricordamelo{' '}
        <select
          className="inline-select chip"
          aria-label="Giorni di preavviso"
          value={daysBefore}
          onChange={(e) => form.setDaysBefore(Number(e.target.value))}
          onClick={stopClick}
        >
          {NOTICE_DAYS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        {dayWord} prima
      </OptionRow>
      <OptionRow
        checked={form.attach}
        onToggle={form.setAttach}
        label={`Allega a Documenti › ${form.folder}`}
      >
        Allega a Documenti ›{' '}
        <select
          className="inline-select chip"
          aria-label="Cartella"
          value={form.folder}
          onChange={(e) => form.setFolder(e.target.value)}
          onClick={stopClick}
        >
          {[...new Set([...DOC_FOLDERS, form.folder])].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </OptionRow>
      <OptionRow
        checked={form.split}
        disabled={amountValue == null}
        onToggle={form.setSplit}
        label="Dividi la spesa"
      >
        Dividi la spesa
        {form.split && amountValue
          ? ` (${memberCount} persone, ${formatEuro(amountValue / Math.max(1, memberCount))} a testa)`
          : ''}
      </OptionRow>
    </div>
  );
}
