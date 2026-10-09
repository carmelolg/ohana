import { useState } from 'react';
import type { CareThread } from '../../lib/types';

interface Props {
  threads: CareThread[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Crea un filone nuovo con questo nome e lo seleziona. */
  onCreate: (title: string) => Promise<void>;
}

/** Scelta del filone di una visita, con «+ Nuovo filone» sul posto. */
export function ThreadPicker({ threads, selectedId, onSelect, onCreate }: Props) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <div className="stack">
      <span className="label">Filone</span>
      <div className="chips" role="group" aria-label="Filone">
        {threads.map((t) => (
          <button
            key={t.id}
            className="chip"
            aria-pressed={t.id === selectedId}
            onClick={() => onSelect(t.id)}
          >
            {t.title}
          </button>
        ))}
        <button className="chip" onClick={() => setTitle('')}>
          + Nuovo filone
        </button>
      </div>
      {title !== null && (
        <div className="hstack">
          <input
            className="input"
            autoFocus
            aria-label="Nome del nuovo filone"
            placeholder="Es. Tachicardia"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            className="btn small"
            disabled={!title.trim()}
            onClick={() => void onCreate(title).then(() => setTitle(null))}
          >
            Crea
          </button>
        </div>
      )}
    </div>
  );
}
