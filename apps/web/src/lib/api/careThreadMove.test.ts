import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import { moveVisitToThread, visitRecordOf, type VisitRecord } from './careThreadMove';

const visit: VisitRecord = {
  entryId: 'entry1',
  recipientId: 'r1',
  threadId: 't1',
  followUpEventIds: ['f1', 'f2'],
};

describe('visitRecordOf', () => {
  it('raccoglie solo le scadenze già diventate impegni', () => {
    const record = visitRecordOf({
      id: 'entry1',
      recipient_id: 'r1',
      thread_id: 't1',
      follow_ups: [
        { title: 'Esami', event_id: 'f1' },
        { title: 'Dieta', due_hint: '6 mesi', event_id: null },
      ],
    });
    expect(record).toEqual({
      entryId: 'entry1',
      recipientId: 'r1',
      threadId: 't1',
      followUpEventIds: ['f1'],
    });
  });
});

describe('moveVisitToThread', () => {
  it('stessa persona: tassello e scadenze nel nuovo filone, nessun file toccato', async () => {
    const { mutate, steps, calls } = fakeMutate();
    await moveVisitToThread(mutate, visit, { threadId: 't2', recipientId: 'r1' });
    expect(steps()).toEqual(['update:care_entries', 'update:events', 'update:events']);
    expect(calls[0].op).toEqual({
      table: 'care_entries',
      action: 'update',
      payload: { thread_id: 't2', recipient_id: 'r1' },
      match: { id: 'entry1' },
    });
  });

  it('altra persona: aggiorna anche i file del referto', async () => {
    const { mutate, steps, calls } = fakeMutate();
    await moveVisitToThread(mutate, visit, { threadId: 't9', recipientId: 'r2' });
    expect(steps()).toEqual(['update:care_entries', 'update:care_files', 'update:events', 'update:events']);
    expect(calls[1].op).toEqual({
      table: 'care_files',
      action: 'update',
      payload: { recipient_id: 'r2' },
      match: { entry_id: 'entry1' },
    });
  });

  it('senza scadenze scrive solo il tassello', async () => {
    const { mutate, steps } = fakeMutate();
    await moveVisitToThread(
      mutate,
      { ...visit, followUpEventIds: [] },
      { threadId: 't2', recipientId: 'r1' },
    );
    expect(steps()).toEqual(['update:care_entries']);
  });

  it("se una scrittura fallisce, l'errore arriva al chiamante", async () => {
    const { mutate } = fakeMutate((op) => op.table === 'events');
    await expect(moveVisitToThread(mutate, visit, { threadId: 't2', recipientId: 'r1' })).rejects.toThrow(
      'scrittura rifiutata: events',
    );
  });
});
