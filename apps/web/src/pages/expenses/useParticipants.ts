import { useEffect, useState } from 'react';
import type { Member } from '../../lib/types';

/**
 * Chi partecipa alla spesa e chi paga. Al cambio di spazio partecipano tutti i suoi membri;
 * il pagante torna a essere chi scrive se non fa parte del nuovo spazio.
 */
export function useParticipants(members: Member[], me: string) {
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [payer, setPayer] = useState(me);

  useEffect(() => {
    setIncluded(new Set(members.map((m) => m.user_id)));
    setPayer((current) => (members.some((m) => m.user_id === current) ? current : me));
  }, [members, me]);

  const toggle = (id: string) =>
    setIncluded((s) => {
      const next = new Set(s);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  return { included, toggle, payer, setPayer };
}
