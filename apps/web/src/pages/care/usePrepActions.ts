import { useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import { useMutate } from '../../lib/data';
import {
  addQuestion,
  deleteQuestion,
  ensureVisitPrep,
  setBringList,
  setQuestionDone,
} from '../../lib/api/visitPrep';
import type { VisitPrep, VisitQuestion } from '../../lib/types';

const DEFAULT_BRING = ['Tessera sanitaria', 'Elenco terapie'];

/** Azioni sulla preparazione di una visita: la prima volta la crea (stesso id dell'impegno), poi aggiunge o aggiorna. */
export function usePrepActions(
  target: { spaceId: string; eventId: string; threadId: string | null },
  prep: VisitPrep | null | undefined,
) {
  const mutate = useMutate();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  return useMemo(() => {
    const ensure = async () => {
      if (!prep) {
        await ensureVisitPrep(
          mutate,
          target,
          DEFAULT_BRING.map((text) => ({ text, done: false })),
        );
      }
    };
    return {
      me,
      async add(text: string) {
        await ensure();
        await addQuestion(mutate, {
          spaceId: target.spaceId,
          prepId: target.eventId,
          text,
          position: (prep?.visit_questions.length ?? 0) + 1,
        });
      },
      toggle: (q: VisitQuestion) => setQuestionDone(mutate, q.id, !q.done),
      remove: (q: VisitQuestion) => deleteQuestion(mutate, q.id),
      async setBring(bring: { text: string; done: boolean }[]) {
        await ensure();
        await setBringList(mutate, target.eventId, bring);
      },
    };
  }, [mutate, me, target.spaceId, target.eventId, target.threadId, prep]); // eslint-disable-line react-hooks/exhaustive-deps
}
