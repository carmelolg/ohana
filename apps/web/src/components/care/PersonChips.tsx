import { careName } from '@ohana/shared';
import { Link } from 'react-router-dom';
import type { CareRecipient } from '../../lib/types';

/** Chip per passare da una persona assistita all'altra, mantenendo la stessa sezione (`section`). */
export function PersonChips({
  people,
  currentId,
  section = '',
  canAdd = false,
}: {
  people: CareRecipient[];
  currentId: string;
  section?: string;
  /** Mostra «+ Persona»: serve anche con una sola persona, altrimenti non si potrebbe aggiungerne un'altra. */
  canAdd?: boolean;
}) {
  if (people.length < 2 && !canAdd) {
    return null;
  }
  return (
    <div className="chips" role="group" aria-label="Persona assistita">
      {people.map((p) => (
        <Link
          key={p.id}
          className="chip"
          aria-pressed={p.id === currentId}
          to={`/cura/${p.id}${section}`}
          replace
        >
          {careName(p)}
        </Link>
      ))}
      {canAdd && (
        <Link className="chip add" to="/cura/nuova" aria-label="Aggiungi una persona assistita">
          + Persona
        </Link>
      )}
    </div>
  );
}
