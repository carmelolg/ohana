import { useMemo, useState } from 'react';
import { parseNoteExpiry } from '@ohana/shared';
import { publishNote } from '../lib/api/board';
import { useAuth } from '../lib/auth';
import { useMutate, useSpace } from '../lib/data';
import { newId } from '../lib/outbox';
import { useToast } from '../lib/toast';
import { expiryDate, EXPIRY_OPTIONS, type ExpiryChoice } from './note/expiry';
import { Sheet } from './ui';

const MAX_CHARS = 280;
const LONG_DATE = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

interface Props {
  initialText?: string;
  /** Spazio già deciso (dalla pagina dello spazio): non si chiede. */
  spaceId?: string;
  onClose: () => void;
}

interface FieldsProps {
  text: string;
  setText: (v: string) => void;
  spaces: { id: string; name: string }[];
  spaceId: string;
  setSpaceId: (v: string) => void;
  expiry: ExpiryChoice;
  setExpiry: (v: ExpiryChoice) => void;
  autoExpiry: Date | null;
  notify: boolean;
  setNotify: (v: boolean) => void;
}

function NoteFields(f: FieldsProps) {
  return (
    <>
      <label className="sr-only" htmlFor="note-text">
        Testo della nota
      </label>
      <textarea
        id="note-text"
        className="input"
        autoFocus
        maxLength={MAX_CHARS}
        placeholder="Es. le chiavi di casa di mamma le ho io fino a domenica"
        value={f.text}
        onChange={(e) => f.setText(e.target.value)}
      />
      <div
        className="mono muted"
        style={{ fontSize: 12, textAlign: 'right', marginTop: -6 }}
        aria-live="polite"
      >
        {f.text.length}/{MAX_CHARS}
      </div>
      {f.spaces.length > 1 && (
        <select
          className="input"
          aria-label="Spazio"
          value={f.spaceId}
          onChange={(e) => f.setSpaceId(e.target.value)}
        >
          {f.spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <select
        className="input"
        aria-label="Scadenza"
        value={f.expiry}
        onChange={(e) => f.setExpiry(e.target.value as ExpiryChoice)}
      >
        {f.autoExpiry && <option value="auto">Fino al {LONG_DATE.format(f.autoExpiry)} (dal testo)</option>}
        {EXPIRY_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="hstack" style={{ minHeight: 44 }}>
        <input
          type="checkbox"
          style={{ width: 22, height: 22 }}
          checked={f.notify}
          onChange={(e) => f.setNotify(e.target.checked)}
        />
        <span>Avvisa i membri con una notifica push</span>
      </label>
    </>
  );
}

/** Nota in bacheca di spazio: max 280 caratteri, scadenza opzionale, avviso push solo se lo sceglie l'autore. */
export function NoteComposer({ initialText = '', spaceId: presetSpace, onClose }: Props) {
  const { session } = useAuth();
  const { spaces, defaultSpace, canWrite } = useSpace();
  const mutate = useMutate();
  const toast = useToast();
  const now = useMemo(() => new Date(), []);
  const autoExpiry = useMemo(() => parseNoteExpiry(initialText, now), [initialText, now]);
  const [text, setText] = useState(initialText.slice(0, MAX_CHARS));
  const [spaceId, setSpaceId] = useState(presetSpace ?? defaultSpace?.id ?? '');
  const [expiry, setExpiry] = useState<ExpiryChoice>(autoExpiry ? 'auto' : 'none');
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState('');
  const choosable = presetSpace ? [] : spaces.filter((s) => canWrite(s.id));

  async function save() {
    if (!text.trim()) {
      return setError('Scrivi la nota');
    }
    if (!spaceId) {
      return setError('Scegli uno spazio');
    }
    try {
      await publishNote(mutate, {
        id: newId(),
        spaceId,
        authorId: session!.user.id,
        text: text.trim(),
        expiresAt: expiryDate(expiry, text, now),
        notifyPush: notify,
      });
      toast('Nota pubblicata in bacheca');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Sheet onClose={onClose} label="Nota in bacheca">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Nota in bacheca</h3>
        <NoteFields
          {...{ text, setText, spaceId, setSpaceId, expiry, setExpiry, autoExpiry, notify, setNotify }}
          spaces={choosable}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="hstack">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Annulla
          </button>
          <button className="btn accent" style={{ flex: 1 }} onClick={save} disabled={!text.trim()}>
            Pubblica
          </button>
        </div>
      </div>
    </Sheet>
  );
}
