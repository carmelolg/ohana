import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { FollowUp } from '../../lib/types';
import { createFollowUpReminder } from './visitCommands';

const step: FollowUp = {
  id: 'fu1',
  event_id: 'visit1',
  title: 'Holter 24 h',
  due_hint: null,
  due_date: null,
  created_event_id: null,
};

const visit = {
  space_id: 's1',
  contact_id: 'k1',
  assignee_id: 'a1',
  care_thread_id: 'crohn',
};

describe('createFollowUpReminder', () => {
  it('il promemoria del prossimo passo è del filone della visita, così compare tra i passi del filone', async () => {
    const { mutate, payloadOf } = fakeMutate();
    const ok = await createFollowUpReminder(mutate, {
      visit,
      followUp: step,
      date: '2026-12-31',
      userId: 'u1',
      categoryId: 'c1',
    });
    expect(ok).toBe(true);
    expect(payloadOf('events', 'upsert')!.payload).toMatchObject({
      title: 'Holter 24 h',
      care_thread_id: 'crohn',
      contact_id: 'k1',
    });
  });

  it('una visita senza filone crea un impegno senza filone', async () => {
    const { mutate, payloadOf } = fakeMutate();
    await createFollowUpReminder(mutate, {
      visit: { ...visit, care_thread_id: null },
      followUp: step,
      date: '2026-12-31',
      userId: 'u1',
      categoryId: undefined,
    });
    expect(payloadOf('events', 'upsert')!.payload).toMatchObject({ care_thread_id: null });
  });
});
