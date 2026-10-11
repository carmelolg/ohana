import { AreaCard } from './AreaCard';
import { useBoardOverview } from '../lib/data';

/** La card «Bacheca» di Famiglia: quante note ci sono e quante sono nuove. */
export function BoardCard() {
  const { active, unread } = useBoardOverview();
  const sub = active.length
    ? `${active.length} ${active.length === 1 ? 'nota' : 'note'} per la famiglia`
    : 'Messaggi per tutta la famiglia';
  const state = unread.length ? `${unread.length} ${unread.length === 1 ? 'nuova' : 'nuove'}` : undefined;
  return <AreaCard to="/bacheca" title="Bacheca" sub={sub} state={state} />;
}
