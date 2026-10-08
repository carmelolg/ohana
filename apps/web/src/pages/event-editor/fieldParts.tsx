import { Trash2 } from 'lucide-react';
import { describeRrule, formatDay, formatTime } from '@ohana/shared';
import { fullName } from '../../lib/color';
import { fromDateInput, fromDateTimeInput, toDateInput, toDateTimeInput } from '../../lib/date-input';
import type { EventForm } from './useEventForm';

/** Un campo del blocco «Ho capito». Ognuno legge dal form solo ciò che gli serve. */
interface FieldProps {
  form: EventForm;
}

export function SpaceField({ form }: FieldProps) {
  const { isNew, space, spaceId, spaces, canWrite, override } = form;
  return (
    <label className="kv">
      <span>Spazio</span>
      <span>
        <span className="dot" />
        <select
          className="inline-select sr-select"
          aria-label="Spazio"
          value={spaceId}
          onChange={(e) => override('spaceId', e.target.value)}
          disabled={!isNew}
        >
          {spaces
            .filter((s) => canWrite(s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          {!isNew && space && !canWrite(space.id) && <option value={space.id}>{space.name}</option>}
        </select>
      </span>
    </label>
  );
}

/** «Giorno» per le faccende (senza orario), «Quando» con data e ora per gli impegni. */
export function WhenField({ form }: FieldProps) {
  const { isChore, startsAt, override } = form;
  if (isChore) {
    return (
      <label className="kv">
        <span>Giorno</span>
        <input
          type="date"
          className="inline-select date-field"
          aria-label="Giorno"
          value={toDateInput(startsAt)}
          onChange={(e) => {
            const day = fromDateInput(e.target.value, 0);
            if (day) {
              override('startsAt', day);
            }
          }}
        />
      </label>
    );
  }
  return (
    <>
      <label className="kv">
        <span>Quando</span>
        <span>
          <input
            type="datetime-local"
            className="inline-select datetime-field"
            aria-label="Data e ora"
            value={toDateTimeInput(startsAt)}
            onChange={(e) => override('startsAt', fromDateTimeInput(e.target.value))}
          />
        </span>
      </label>
      {startsAt && (
        <div className="muted" style={{ fontSize: 13, padding: '6px 0 0', textTransform: 'capitalize' }}>
          {formatDay(startsAt)} · {formatTime(startsAt)}
        </div>
      )}
    </>
  );
}

export function CategoryField({ form }: FieldProps) {
  const { category, spaceId, canWrite, override, categoriesOfSpace } = form;
  const { selected, suggestion } = category;
  return (
    <>
      <label className="kv">
        <span>Categoria</span>
        <select
          className="inline-select"
          aria-label="Categoria"
          value={category.categoryId}
          onChange={(e) =>
            e.target.value === '__new' ? void category.createNew() : override('categoryId', e.target.value)
          }
        >
          {categoriesOfSpace.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {canWrite(spaceId) && <option value="__new">＋ Nuova categoria…</option>}
        </select>
      </label>
      {category.learnedHint && suggestion?.prob != null && (
        <div className="muted" style={{ fontSize: 12, textAlign: 'right', paddingTop: 2 }} role="note">
          Suggerita da ciò che hai scelto in passato · {Math.round(suggestion.prob * 100)}%
        </div>
      )}
      {selected && !selected.slug && canWrite(spaceId) && (
        <div style={{ textAlign: 'right', paddingTop: 4 }}>
          <button type="button" className="pill" onClick={category.deleteSelected}>
            <Trash2 size={14} /> Elimina categoria «{selected.name}»
          </button>
        </div>
      )}
    </>
  );
}

export function ContactField({ form }: FieldProps) {
  return (
    <label className="kv">
      <span>Contatto</span>
      <select
        className="inline-select"
        aria-label="Contatto"
        value={form.contactId ?? ''}
        onChange={(e) => form.override('contactId', e.target.value || null)}
      >
        <option value="">Nessuno</option>
        {form.contactsOfSpace.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.role ? ` · ${c.role}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AssigneeField({ form }: FieldProps) {
  const label = form.isChore ? 'Assegnata a' : 'Assegnato a';
  return (
    <label className="kv">
      <span>{label}</span>
      <select
        className="inline-select"
        aria-label={label}
        value={form.assigneeId ?? ''}
        onChange={(e) => form.override('assigneeId', e.target.value || null)}
      >
        {!form.isChore && <option value="">Nessuno</option>}
        {form.members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {fullName(m.profiles)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RepeatField({ form }: FieldProps) {
  const { ruleOptions, rrule } = form;
  const knownRule = ruleOptions.some(([value]) => value === rrule);
  return (
    <label className="kv">
      <span>Ripeti</span>
      <select
        className="inline-select"
        aria-label="Ripeti"
        value={knownRule ? rrule : '__custom'}
        onChange={(e) => form.override('rrule', e.target.value)}
      >
        {ruleOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
        {!knownRule && <option value="__custom">{describeRrule(rrule)}</option>}
      </select>
    </label>
  );
}
