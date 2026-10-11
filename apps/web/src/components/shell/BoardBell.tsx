import { Bell } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useBoardOverview } from '../../lib/data';
import { useDismiss } from '../../lib/useDismiss';
import { BoardPopover } from '../board/BoardPopover';

/** Campanella in barra: badge con le note nuove; al tocco apre, agganciato a lei, il menu delle ultime note. */
export function BoardBell() {
  const { unread } = useBoardOverview();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrap, close);
  const count = unread.length;
  const label = count ? `Bacheca, ${count} ${count === 1 ? 'nuova' : 'nuove'}` : 'Bacheca';
  return (
    <div className="avatar-menu" ref={wrap}>
      <button
        className="icon-btn bell"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={22} strokeWidth={1.75} />
        {count > 0 && (
          <span className="bell-badge" aria-hidden>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && <BoardPopover onClose={close} />}
    </div>
  );
}
