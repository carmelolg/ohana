import { useSpace } from '../../lib/data';
import { importVisibilityNote } from './importNotice';
import { useConnectCalendar } from './useConnectCalendar';

/** Modulo per collegare un calendario esterno a uno spazio. Compare solo a chi può scrivere in almeno uno spazio. */
export function ImportCalendarForm({ userId, onClose }: { userId: string; onClose?: () => void }) {
  const { spaces, canWrite } = useSpace();
  const writable = spaces.filter((s) => canWrite(s.id));
  const form = useConnectCalendar({ userId, defaultSpaceId: writable[0]?.id ?? '' });
  if (writable.length === 0) {
    return null;
  }
  async function save() {
    if (await form.submit()) {
      onClose?.();
    }
  }
  const target = writable.find((s) => s.id === form.spaceId);
  const note = target ? importVisibilityNote(target.name, target.space_members.length) : null;
  return (
    <div className="stack import-new">
      <label className="field">
        <span className="label">Nome</span>
        <input
          className="input"
          aria-label="Nome del calendario"
          placeholder="Es. Famiglia"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="label">Indirizzo (ICS)</span>
        <input
          className="input"
          inputMode="url"
          autoCapitalize="none"
          aria-label="Indirizzo del calendario (ICS)"
          placeholder="https://… oppure webcal://…"
          value={form.url}
          onChange={(e) => form.setUrl(e.target.value)}
        />
      </label>
      {writable.length > 1 && (
        <label className="field">
          <span className="label">Importa nello spazio</span>
          <select
            className="input"
            aria-label="Spazio di destinazione"
            value={form.spaceId}
            onChange={(e) => form.setSpaceId(e.target.value)}
          >
            {writable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {note && (
        <p className="muted import-meta" role="note">
          {note}
        </p>
      )}
      {form.error && (
        <p className="error" role="alert">
          {form.error}
        </p>
      )}
      <div className="hstack">
        <button className="btn accent" onClick={() => void save()} disabled={form.busy}>
          {form.busy ? 'Collego…' : 'Collega calendario'}
        </button>
        {onClose && (
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
        )}
      </div>
    </div>
  );
}
