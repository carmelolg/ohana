import { Pin } from 'lucide-react';
import { spaceColor } from '../lib/color';
import { useAuth } from '../lib/auth';
import { useBoardOverview, useSpace } from '../lib/data';

/**
 * Bacheca in Oggi: SOLO la nota fissata più recente tra gli spazi visibili.
 * Le altre note e quelle nuove si raggiungono dalla campanella in barra (`BoardBell`) e da Famiglia.
 */
export function BoardBanner() {
  const { session } = useAuth();
  const { spaceById, memberName } = useSpace();
  const { active } = useBoardOverview();
  const first = active.find((n) => n.pinned);
  if (!first) {
    return null;
  }
  const space = spaceById(first.space_id);
  const mine = first.author_id === session?.user.id;
  return (
    <section aria-label="Bacheca" className="board-banner">
      <Pin size={14} strokeWidth={1.75} className="muted board-pin" aria-hidden />
      <div className="board-note-body">
        <strong>{mine ? 'Tu' : memberName(first.author_id).split(' ')[0] || 'Qualcuno'}:</strong> {first.text}
        <div className="muted board-note-meta">
          <span className="dot" style={{ background: spaceColor(space?.color_hue) }} />
          {space?.name}
        </div>
      </div>
    </section>
  );
}
