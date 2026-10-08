import { describe, expect, it, vi } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { Maintenance } from '../../lib/types';
import { completeMaintenance, saveMaintenance } from './maintenanceCommands';

const due = new Date('2027-11-01T08:00:00Z');
const existing = {
  id: 'm1',
  space_id: 's1',
  title: 'Caldaia',
  events: [{ id: 'e1', starts_at: '2026-11-01T08:00:00Z', status: 'open' }],
} as unknown as Maintenance;
const input = {
  editing: null,
  spaceId: 's1',
  title: 'Caldaia',
  rrule: 'FREQ=YEARLY',
  contactId: '',
  lastDone: '',
  cost: '120,5',
  templateKey: 'caldaia',
  dueDate: due,
};

describe('saveMaintenance', () => {
  it('nuova: crea la manutenzione e la scadenza', async () => {
    const { mutate, payloadOf } = fakeMutate();
    const schedule = vi.fn();
    await saveMaintenance(mutate, schedule, input);
    expect(payloadOf('maintenances')!.payload).toMatchObject({
      space_id: 's1',
      title: 'Caldaia',
      last_cost: 120.5,
      contact_id: null,
      last_done_at: null,
      template_key: 'caldaia',
    });
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({ space_id: 's1', title: 'Caldaia' }), due);
  });

  it("modifica con scadenza aperta: la sposta senza crearne un'altra", async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    const schedule = vi.fn();
    await saveMaintenance(mutate, schedule, { ...input, editing: existing });
    expect(steps()).toEqual(['update:maintenances', 'update:events']);
    expect(payloadOf('events')!.payload).toMatchObject({ starts_at: due.toISOString() });
    expect(schedule).not.toHaveBeenCalled();
  });

  it('modifica senza scadenza aperta: ne crea una nuova', async () => {
    const { mutate } = fakeMutate();
    const schedule = vi.fn();
    await saveMaintenance(mutate, schedule, { ...input, editing: { ...existing, events: [] } });
    expect(schedule).toHaveBeenCalledOnce();
  });
});

describe('completeMaintenance', () => {
  it('chiude la scadenza aperta e programma la successiva', async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    const schedule = vi.fn();
    await completeMaintenance(mutate, schedule, existing, {
      doneAt: new Date('2026-10-08T07:00:00Z'),
      doneOn: '2026-10-08',
      cost: '',
      contactId: 'k1',
      next: due,
    });
    expect(steps()).toEqual(['update:maintenances', 'update:events']);
    expect(payloadOf('maintenances')!.payload).toMatchObject({
      last_done_at: '2026-10-08',
      last_cost: null,
      contact_id: 'k1',
    });
    expect(payloadOf('events')!.payload).toMatchObject({ status: 'done' });
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', contact_id: 'k1' }), due);
  });
});
