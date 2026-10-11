import { Pin, PinOff, Trash2 } from 'lucide-react';
import type { BoardNote } from '../../lib/types';

const WHEN = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short' });

interface Props {
  note: BoardNote;
  authorName: string;
  /** Mostrato solo quando la lista mescola più spazi. */
  spaceName?: string;
  expired: boolean;
  /** Scritta dopo l'ultima apertura della bacheca. */
  isNew: boolean;
  /** Chi può fissare o eliminare: l'autore o un admin. */
  canManage: boolean;
  onTogglePinned: () => void;
  onDelete: () => void;
}

/** Quando è stata scritta, fino a quando vale, se è fissata. */
function noteMeta(note: BoardNote, expired: boolean, spaceName?: string): string {
  const parts = [WHEN.format(new Date(note.created_at))];
  if (spaceName) {
    parts.unshift(spaceName);
  }
  if (note.expires_at) {
    parts.push(`${expired ? 'scaduta' : 'fino al'} ${WHEN.format(new Date(note.expires_at))}`);
  }
  if (!note.pinned) {
    parts.push('non fissata');
  }
  return parts.join(' · ');
}

/** Una nota della bacheca. */
export function NoteRow({
  note,
  authorName,
  spaceName,
  expired,
  isNew,
  canManage,
  onTogglePinned,
  onDelete,
}: Props) {
  const dimmed = expired || !note.pinned;
  return (
    <div className={'note-row' + (dimmed ? ' dimmed' : '')}>
      <div className="note-row-body">
        <div className="note-row-text">
          <b>{authorName}:</b> {note.text}
          {isNew && <span className="note-new">Nuova</span>}
        </div>
        <div className="muted note-row-meta">{noteMeta(note, expired, spaceName)}</div>
      </div>
      {canManage && (
        <div className="hstack note-row-actions">
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
