import { useState } from 'react';
import { BackLink } from '../components/BackLink';
import { NoteComposer } from '../components/NoteComposer';
import { NoteRow } from '../components/board/NoteRow';
import { useBoardSeen } from '../components/board/useBoardSeen';
import { deleteNote, setNotePinned } from '../lib/api/board';
import { useAuth } from '../lib/auth';
import { noteActive } from '../lib/boardUnread';
import { useMutate, useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';

/** Bacheca: tutte le note degli spazi in vista; in Oggi compare solo la nota fissata più recente. */
export function BachecaPage() {
  const { session } = useAuth();
  const { spaces, selected, canWrite, myRole, memberName, spaceById } = useSpace();
  const { notes, newIds } = useBoardSeen();
  const mutate = useMutate();
  const dialog = useDialog();
  const [composing, setComposing] = useState(false);
  const canCompose = spaces.some((s) => canWrite(s.id));
  const showSpace = selected === 'all' && spaces.length > 1;

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
      <BackLink to="/famiglia" label="Famiglia" />
      <div className="hstack board-head">
        <h2 className="page-title">Bacheca</h2>
        {canCompose && (
          <button className="btn small" onClick={() => setComposing(true)}>
            + Nota
          </button>
        )}
      </div>
      <p className="muted board-hint">
        Messaggi per tutta la famiglia. In Oggi si vede solo la nota fissata più recente; le altre restano
        qui.
      </p>
      <div className="group">
        {notes.map((n) => {
          const mine = n.author_id === session?.user.id;
          const role = myRole(n.space_id);
          return (
            <NoteRow
              key={n.id}
              note={n}
              authorName={mine ? 'Tu' : memberName(n.author_id).split(' ')[0]}
              spaceName={showSpace ? spaceById(n.space_id)?.name : undefined}
              expired={!noteActive(n)}
              isNew={newIds.has(n.id)}
              canManage={canWrite(n.space_id) && (mine || role === 'owner' || role === 'admin')}
              onTogglePinned={() => void setNotePinned(mutate, n.id, !n.pinned)}
              onDelete={() => void confirmDelete(n.id)}
            />
          );
        })}
        {notes.length === 0 && <p className="muted board-empty">Nessuna nota. Scrivine una con «+ Nota».</p>}
      </div>
      {composing && (
        <NoteComposer
          spaceId={selected === 'all' ? undefined : selected}
          onClose={() => setComposing(false)}
        />
      )}
    </>
  );
}
