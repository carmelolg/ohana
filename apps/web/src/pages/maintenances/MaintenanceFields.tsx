import type { MaintenanceTemplate } from '@ohana/shared';
import type { Contact, Space } from '../../lib/types';
import { ruleOptions } from './formState';

export interface Values {
  spaceId: string;
  title: string;
  rrule: string;
  contactId: string;
  lastDone: string;
  cost: string;
  next: string;
}

interface Props {
  values: Values;
  onChange: (patch: Partial<Values>) => void;
  template: MaintenanceTemplate;
  disabled: boolean;
  /** Spazi tra cui scegliere (vuoto = nessuna scelta). */
  spaces: Space[];
  contacts: Contact[];
}

function Field({ label, flex, children }: { label: string; flex?: boolean; children: React.ReactNode }) {
  return (
    <label className="field" style={flex ? { flex: 1 } : undefined}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  contacts: Contact[];
  disabled: boolean;
}

function ProfessionalSelect({ value, onChange, contacts, disabled }: SelectProps) {
  return (
    <select
      className="input"
      aria-label="Professionista"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">Fai da te / nessuno</option>
      {contacts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.role ? ` · ${c.role}` : ''}
        </option>
      ))}
    </select>
  );
}

/** I campi del modulo manutenzione. */
export function MaintenanceFields({ values: v, onChange, template, disabled, spaces, contacts }: Props) {
  return (
    <>
      {spaces.length > 1 && (
        <select
          className="input"
          aria-label="Spazio"
          value={v.spaceId}
          onChange={(e) => onChange({ spaceId: e.target.value })}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <input
        className="input"
        aria-label="Titolo"
        placeholder="Titolo (es. Revisione caldaia)"
        value={v.title}
        onChange={(e) => onChange({ title: e.target.value })}
        disabled={disabled}
      />
      <Field label="Si ripete">
        <select
          className="input"
          aria-label="Si ripete"
          value={v.rrule}
          onChange={(e) => onChange({ rrule: e.target.value })}
          disabled={disabled}
        >
          {ruleOptions(template, v.rrule).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Professionista">
        <ProfessionalSelect
          value={v.contactId}
          onChange={(contactId) => onChange({ contactId })}
          contacts={contacts.filter((c) => c.space_id === v.spaceId)}
          disabled={disabled}
        />
      </Field>
      <div className="hstack">
        <Field label="Ultima volta" flex>
          <input
            className="input"
            type="date"
            aria-label="Ultima volta"
            value={v.lastDone}
            onChange={(e) => onChange({ lastDone: e.target.value })}
            disabled={disabled}
          />
        </Field>
        <Field label="Costo ultima (€)" flex>
          <input
            className="input"
            inputMode="decimal"
            aria-label="Costo ultima volta"
            placeholder="facoltativo"
            value={v.cost}
            onChange={(e) => onChange({ cost: e.target.value })}
            disabled={disabled}
          />
        </Field>
      </div>
      <Field label="Prossima scadenza">
        <input
          className="input"
          type="date"
          aria-label="Prossima scadenza"
          value={v.next}
          onChange={(e) => onChange({ next: e.target.value })}
          disabled={disabled}
        />
      </Field>
    </>
  );
}
