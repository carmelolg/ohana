import { useState } from 'react';
import { deleteNote, setNotePinned } from '../lib/api/board';
import { useAuth } from '../lib/auth';
import { noteActive, useBoardNotes, useMutate, useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { NoteRow } from './board/NoteRow';
import { NoteComposer } from './NoteComposer';

/** Bacheca dello spazio: in Oggi compare solo la nota fissata più recente, qui ci sono tutte le altre. */
export function BoardSection({ spaceId }: { spaceId: string }) {
  const { session } = useAuth();
  const { canWrite, myRole, memberName } = useSpace();
  const { data: all = [] } = useBoardNotes();
  const mutate = useMutate();
  const dialog = useDialog();
  const [composing, setComposing] = useState(false);
  const notes = all.filter((n) => n.space_id === spaceId);
  const writable = canWrite(spaceId);
  const isAdmin = myRole(spaceId) === 'owner' || myRole(spaceId) === 'admin';

  const confirmDelete = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Eliminare la nota?',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (confirmed) {
      await deleteNote(mutate, id);
    }
  };

  return (
    <>
      <div id="bacheca" className="hstack" style={{ justifyContent: 'space-between' }}>
        <div className="label section-label">Bacheca</div>
        {writable && (
          <button className="btn small" style={{ marginTop: 14 }} onClick={() => setComposing(true)}>
            + Nota
          </button>
        )}
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        In Oggi si vede solo la nota fissata più recente; le altre restano qui.
      </p>
      <div className="group">
        {notes.map((n) => {
          const mine = n.author_id === session?.user.id;
          return (
            <NoteRow
              key={n.id}
              note={n}
              authorName={mine ? 'Tu' : memberName(n.author_id).split(' ')[0]}
              expired={!noteActive(n)}
              canManage={writable && (mine || isAdmin)}
              onTogglePinned={() => void setNotePinned(mutate, n.id, !n.pinned)}
              onDelete={() => void confirmDelete(n.id)}
            />
          );
        })}
        {notes.length === 0 && (
          <p className="muted" style={{ padding: '12px 0' }}>
            Nessuna nota.
          </p>
        )}
      </div>
      {composing && <NoteComposer spaceId={spaceId} onClose={() => setComposing(false)} />}
    </>
  );
}
