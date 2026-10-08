import { fullName } from '../../lib/color';
import type { Member, Space } from '../../lib/types';
import type { SplitMode } from './splits';

interface FieldsProps {
  /** Spazi tra cui scegliere (vuoto o uno solo = nessuna scelta). */
  spaces: Space[];
  spaceId: string;
  onSpace: (id: string) => void;
  desc: string;
  onDesc: (v: string) => void;
  amount: string;
  onAmount: (v: string) => void;
  date: string;
  onDate: (v: string) => void;
  members: Member[];
  me: string;
  payer: string;
  onPayer: (id: string) => void;
}

/** Spazio, descrizione, importo, data e chi ha pagato. */
export function ExpenseFields(f: FieldsProps) {
  return (
    <>
      {f.spaces.length > 1 && (
        <select
          className="input"
          aria-label="Spazio"
          value={f.spaceId}
          onChange={(e) => f.onSpace(e.target.value)}
        >
          {f.spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <input
        className="input"
        placeholder="Descrizione (es. Ticket visita)"
        aria-label="Descrizione"
        value={f.desc}
        onChange={(e) => f.onDesc(e.target.value)}
      />
      <div className="hstack">
        <input
          className="input"
          inputMode="decimal"
          placeholder="Importo €"
          aria-label="Importo"
          value={f.amount}
          onChange={(e) => f.onAmount(e.target.value)}
        />
        <input
          className="input"
          type="date"
          aria-label="Data"
          value={f.date}
          onChange={(e) => f.onDate(e.target.value)}
        />
      </div>
      <select
        className="input"
        aria-label="Pagato da"
        value={f.payer}
        onChange={(e) => f.onPayer(e.target.value)}
      >
        {f.members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            Pagato da {m.user_id === f.me ? 'me' : fullName(m.profiles)}
          </option>
        ))}
      </select>
    </>
  );
}

/** Scelta tra parti uguali e quote personalizzate. */
export function ModeSwitch({ mode, onMode }: { mode: SplitMode; onMode: (m: SplitMode) => void }) {
  return (
    <div className="seg" style={{ marginTop: 0 }} role="group" aria-label="Divisione">
      <button type="button" aria-pressed={mode === 'uguali'} onClick={() => onMode('uguali')}>
        Parti uguali
      </button>
      <button type="button" aria-pressed={mode === 'personalizzate'} onClick={() => onMode('personalizzate')}>
        Personalizzata
      </button>
    </div>
  );
}
