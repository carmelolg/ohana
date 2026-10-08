import { useState } from 'react';
import { Pin, X } from 'lucide-react';
import { noteActive, useBoardNotes, useMutate, useSpace } from '../lib/data';
import { useAuth } from '../lib/auth';
import { spaceColor } from '../lib/color';

/**
 * Bacheca in Oggi: SOLO la nota fissata più recente tra gli spazi visibili; le altre si aprono con «+N note».
 * La gestione completa delle note è nella pagina dello spazio.
 */
export function BoardBanner() {
  const { session } = useAuth();
  const { selected, spaceById, memberName, canWrite } = useSpace();
  const { data: notes = [] } = useBoardNotes();
  const mutate = useMutate();
  const [open, setOpen] = useState(false);

  const active = notes.filter(
    (n) => n.pinned && noteActive(n) && (selected === 'all' || n.space_id === selected),
  );
  if (active.length === 0) {
    return null;
  }
  const [first, ...others] = active;

  const row = (n: (typeof active)[number], showClose: boolean) => {
    const sp = spaceById(n.space_id);
    const mine = n.author_id === session?.user.id;
    return (
      <div key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span className="mono muted" style={{ fontSize: 11, paddingTop: 2 }} aria-hidden>
          <Pin size={14} strokeWidth={1.75} />
        </span>
        <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4, minWidth: 0 }}>
          <strong>{mine ? 'Tu' : memberName(n.author_id).split(' ')[0] || 'Qualcuno'}:</strong> {n.text}
          <div
            className="muted"
            style={{
              fontSize: 12,
              marginTop: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span className="dot" style={{ background: spaceColor(sp?.color_hue) }} />
            {sp?.name}
            {showClose && others.length > 0 && (
              <button
                style={{ color: 'var(--accent-ink)', fontWeight: 600, minHeight: 28 }}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
              >
                · {open ? 'comprimi' : `+${others.length} ${others.length === 1 ? 'nota' : 'note'}`}
              </button>
            )}
          </div>
        </div>
        {(mine || canWrite(n.space_id)) && mine && (
          <button
            className="icon-btn"
            style={{ minWidth: 32, minHeight: 32 }}
            aria-label="Togli dalla bacheca"
            onClick={() =>
              void mutate({
                table: 'board_notes',
                action: 'update',
                payload: { pinned: false },
                match: { id: n.id },
              })
            }
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <section
      aria-label="Bacheca"
      style={{
        margin: '16px 0 0',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {row(first, true)}
      {open && others.map((n) => row(n, false))}
    </section>
  );
}
