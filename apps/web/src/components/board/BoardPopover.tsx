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
      <div className="board-menu-head">Bacheca</div>
      {recent.length === 0 && <p className="muted board-empty">Nessuna nota per ora.</p>}
      {recent.map((n) => {
        const author = n.author_id === session?.user.id ? 'Tu' : memberName(n.author_id).split(' ')[0];
        const where = showSpace ? `${spaceById(n.space_id)?.name} · ` : '';
        return (
          <div key={n.id} className="note-row">
            <div className="note-row-body">
              <div className="note-row-text">
                <b>{author}:</b> {n.text}
                {newIds.has(n.id) && <span className="note-new">Nuova</span>}
              </div>
              <div className="muted note-row-meta">
                {where}
                {WHEN.format(new Date(n.created_at))}
              </div>
            </div>
          </div>
        );
      })}
      <button className="menu-item board-menu-all" onClick={openBoard}>
        Vedi tutta la bacheca ›
      </button>
    </div>
  );
}
