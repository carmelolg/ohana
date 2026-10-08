import { Pin, PinOff, Trash2 } from 'lucide-react';
import type { BoardNote } from '../../lib/types';

const WHEN = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short' });

interface Props {
  note: BoardNote;
  authorName: string;
  expired: boolean;
  /** Chi può fissare o eliminare: l'autore o un admin. */
  canManage: boolean;
  onTogglePinned: () => void;
  onDelete: () => void;
}

/** Quando è stata scritta, fino a quando vale, se è fissata. */
function noteMeta(note: BoardNote, expired: boolean): string {
  const parts = [WHEN.format(new Date(note.created_at))];
  if (note.expires_at) {
    parts.push(`${expired ? 'scaduta' : 'fino al'} ${WHEN.format(new Date(note.expires_at))}`);
  }
  if (!note.pinned) {
    parts.push('non fissata');
  }
  return parts.join(' · ');
}

/** Una nota della bacheca nella pagina dello spazio. */
export function NoteRow({ note, authorName, expired, canManage, onTogglePinned, onDelete }: Props) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        opacity: expired || !note.pinned ? 0.6 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, lineHeight: 1.4 }}>
          <b>{authorName}:</b> {note.text}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {noteMeta(note, expired)}
        </div>
      </div>
      {canManage && (
        <div className="hstack" style={{ gap: 0 }}>
          <button
            className="icon-btn"
            aria-label={note.pinned ? 'Togli dall’alto' : 'Fissa in alto'}
            onClick={onTogglePinned}
          >
            {note.pinned ? <PinOff size={18} /> : <Pin size={18} />}
          </button>
          <button className="icon-btn" aria-label="Elimina la nota" onClick={onDelete}>
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
