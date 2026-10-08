import { useAuth } from '../lib/auth';
import { useSpace, useVisitNotes } from '../lib/data';
import type { EventRow } from '../lib/types';
import { FollowUps } from './visit-diary/FollowUps';
import { NotesCard } from './visit-diary/NotesCard';
import { VisitHistory } from './visit-diary/VisitHistory';

/**
 * «Com'è andata» (3d): diario in 30 secondi per una visita conclusa — nota libera, referto, ticket → Spese,
 * prossimi passi trasformabili in impegni o promemoria, storico con lo stesso medico.
 */
export function VisitDiary({ ev, writable }: { ev: EventRow; writable: boolean }) {
  const { session } = useAuth();
  const { memberName } = useSpace();
  const { data: notes = [] } = useVisitNotes(ev.id);
  const firstAuthor = notes[0]?.author_id;
  return (
    <section aria-label="Com'è andata" style={{ marginTop: 18 }}>
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <span className="label">Com’è andata</span>
        {firstAuthor && (
          <span className="muted" style={{ fontSize: 12 }}>
            scritto da {firstAuthor === session?.user.id ? 'te' : memberName(firstAuthor).split(' ')[0]}
          </span>
        )}
      </div>
      <NotesCard visit={ev} writable={writable} />
      <FollowUps visit={ev} writable={writable} />
      <VisitHistory visit={ev} />
    </section>
  );
}
