import { useEffect, useState } from 'react';
import { markBoardRead } from '../../lib/api/board';
import { useBoardOverview, useMutate } from '../../lib/data';

/**
 * Note degli spazi in vista e quali erano nuove all'apertura della vista (pagina Bacheca o menu della campanella).
 * Montare la vista le segna come lette, ma l'evidenza «Nuova» resta finché la vista è aperta.
 */
export function useBoardSeen() {
  const overview = useBoardOverview();
  const mutate = useMutate();
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const fresh = overview.unread.filter((n) => !newIds.has(n.id));
    if (fresh.length === 0) {
      return;
    }
    setNewIds((prev) => new Set([...prev, ...fresh.map((n) => n.id)]));
    const spaceIds = [...new Set(fresh.map((n) => n.space_id))];
    // Il badge non è essenziale: se la scrittura fallisce si riprova alla prossima apertura.
    markBoardRead(mutate, spaceIds, new Date()).catch(() => undefined);
  }, [overview.unread, newIds, mutate]);

  return { notes: overview.notes, newIds };
}
