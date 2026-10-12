import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { noteActive } from '../../lib/boardUnread';
import { useSpace } from '../../lib/data';
import { useBoardSeen } from './useBoardSeen';

const RECENT = 5;
const WHEN = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short' });

/** Contenuto del menu della campanella: le ultime note, quelle nuove evidenziate, e il passaggio alla Bacheca. */
export function BoardPopover({ onClose }: { onClose: () => void }) {
  const { session } = useAuth();
  const { selected, spaces, memberName, spaceById } = useSpace();
  const { notes, newIds } = useBoardSeen();
  const nav = useNavigate();
  const recent = notes.filter((n) => noteActive(n)).slice(0, RECENT);
  const showSpace = selected === 'all' && spaces.length > 1;

  const openBoard = () => {
    onClose();
    nav('/bacheca');
  };

  return (
    <div className="menu board-menu" role="dialog" aria-label="Ultime note della bacheca">
      <div className="board-menu-head">
        <span>Bacheca</span>
        {newIds.size > 0 && <span className="note-new">{newIds.size} nuove</span>}
      </div>
      {recent.length === 0 && <p className="muted board-empty">Nessuna nota per ora.</p>}
      {recent.map((n) => {
        const author = n.author_id === session?.user.id ? 'Tu' : memberName(n.author_id).split(' ')[0];
        const where = showSpace ? `${spaceById(n.space_id)?.name} · ` : '';
        const isNew = newIds.has(n.id);
        return (
          <div key={n.id} className="pop-note">
            <div className="pop-note-meta">
              {isNew && <span className="pop-note-dot" aria-hidden />}
              <b>{author}</b>
              <span className="muted">
                {where}
                {WHEN.format(new Date(n.created_at))}
              </span>
              {isNew && <span className="sr-only">Nuova</span>}
            </div>
            <div className="pop-note-text">{n.text}</div>
          </div>
        );
      })}
      <button className="menu-item board-menu-all" onClick={openBoard}>
        Vedi tutta la bacheca ›
      </button>
    </div>
  );
}
