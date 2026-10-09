import type { Mutate } from '../data';
import { newId } from '../outbox';

export interface PrepTarget {
  spaceId: string;
  eventId: string;
  threadId: string | null;
}

/**
 * La preparazione di una visita ha lo stesso id dell'impegno: una sola per visita e creabile più volte senza duplicati
 * (anche da due persone insieme o dalla coda offline).
 */
export const ensureVisitPrep = (mutate: Mutate, t: PrepTarget, bring?: { text: string; done: boolean }[]) =>
  mutate({
    table: 'visit_prep',
    action: 'upsert',
    payload: {
      id: t.eventId,
      space_id: t.spaceId,
      event_id: t.eventId,
      thread_id: t.threadId,
      ...(bring ? { bring } : {}),
    },
  });

export const setBringList = (mutate: Mutate, prepId: string, bring: { text: string; done: boolean }[]) =>
  mutate({ table: 'visit_prep', action: 'update', payload: { bring }, match: { id: prepId } });

export interface QuestionToAdd {
  spaceId: string;
  prepId: string;
  text: string;
  position: number;
}

export const addQuestion = (mutate: Mutate, q: QuestionToAdd) =>
  mutate({
    table: 'visit_questions',
    action: 'upsert',
    payload: {
      id: newId(),
      space_id: q.spaceId,
      prep_id: q.prepId,
      text: q.text.trim(),
      position: q.position,
    },
  });

export const setQuestionDone = (mutate: Mutate, id: string, done: boolean) =>
  mutate({ table: 'visit_questions', action: 'update', payload: { done }, match: { id } });

export const deleteQuestion = (mutate: Mutate, id: string) =>
  mutate({ table: 'visit_questions', action: 'delete', match: { id } });
