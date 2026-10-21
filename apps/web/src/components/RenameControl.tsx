import { useState } from 'react';

interface Props {
  /** Cosa si rinomina, per il nome accessibile del campo («Nuovo nome di Referto»). */
  label: string;
  current: string;
  onRename: (name: string) => void;
}

/** «Rinomina»: apre un campo con il nome attuale. Un nome vuoto non si salva; annullare non scrive nulla. */
export function RenameControl({ label, current, onRename }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) {
    return (
      <button className="pill" aria-label={`Rinomina ${label}`} onClick={() => setDraft(current)}>
        Rinomina
      </button>
    );
  }
  const name = draft.trim();
  const save = () => {
    if (name && name !== current) {
      onRename(name);
    }
    setDraft(null);
  };
  return (
    <form
      className="hstack"
      style={{ flexWrap: 'wrap' }}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        className="input"
        aria-label={`Nuovo nome di ${label}`}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
      />
      <button className="pill" type="submit" disabled={!name}>
        Salva
      </button>
      <button className="pill" type="button" onClick={() => setDraft(null)}>
        Annulla
      </button>
    </form>
  );
}
