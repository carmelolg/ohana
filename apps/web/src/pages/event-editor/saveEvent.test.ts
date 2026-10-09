import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { EventRow } from '../../lib/types';
import { saveEvent, type EventToSave } from './saveEvent';

const upload = vi.hoisted(() => vi.fn());
vi.mock('../../lib/files', () => ({ uploadAttachmentToEvent: upload }));

const base: EventToSave = {
  existing: null,
  userId: 'u1',
  spaceId: 's1',
  title: 'Visita oculista',
  categoryId: 'c1',
  startsAt: new Date('2026-10-20T08:30:00Z'),
  isChore: false,
  assigneeId: null,
  contactId: 'k1',
  rrule: '',
  location: { text: '  Via Roma 1 ', lat: 1, lng: 2 },
  notes: '  portare tessera ',
  amount: '84,20',
  reminders: [
    { id: 'r', offset: 1440, email: true, push: false },
    { id: 'x', offset: 60, email: false, push: false },
  ],
  checklist: [
    { id: 'i1', event_id: '', text: ' ECG ', checked: true, position: 0 },
    { id: 'i2', event_id: '', text: '  ', checked: false, position: 1 },
  ],
  files: [],
  followUpId: null,
  careThreadId: null,
};

beforeEach(() => upload.mockReset());

describe('saveEvent', () => {
  it('nuovo impegno: riga, promemoria con almeno un canale, checklist senza voci vuote', async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    const { eventId } = await saveEvent(mutate, base);
    expect(steps()).toEqual(['upsert:events', 'upsert:event_reminders', 'upsert:event_checklist_items']);
    const event = payloadOf('events')!.payload as Record<string, unknown>;
    expect(event).toMatchObject({
      id: eventId,
      space_id: 's1',
      title: 'Visita oculista',
      category_id: 'c1',
      kind: 'appuntamento',
      all_day: false,
      location: 'Via Roma 1',
      location_lat: 1,
      notes: 'portare tessera',
      amount: 84.2,
      contact_id: 'k1',
      rrule: null,
      created_by: 'u1',
    });
    expect(payloadOf('event_reminders')!.payload).toEqual([
      expect.objectContaining({ event_id: eventId, offset_minutes: 1440, channels: ['email'] }),
    ]);
    expect(payloadOf('event_checklist_items')!.payload).toEqual([
      expect.objectContaining({ text: 'ECG', checked: true, position: 0 }),
    ]);
  });

  it('senza luogo non salva le coordinate; importo non valido diventa null', async () => {
    const { mutate, payloadOf } = fakeMutate();
    await saveEvent(mutate, { ...base, location: { text: '  ', lat: 5, lng: 6 }, amount: 'abc' });
    expect(payloadOf('events')!.payload).toMatchObject({
      location: null,
      location_lat: null,
      location_lng: null,
      amount: null,
    });
  });

  it('faccenda: nessun promemoria, nessun contatto, tutto il giorno', async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    await saveEvent(mutate, { ...base, isChore: true, assigneeId: 'u2', checklist: [] });
    expect(steps()).toEqual(['upsert:events']);
    expect(payloadOf('events')!.payload).toMatchObject({
      kind: 'faccenda',
      all_day: true,
      contact_id: null,
      assignee_id: 'u2',
    });
  });

  it('modifica: aggiorna senza created_by e riscrive promemoria e checklist', async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    const existing = { id: 'e1' } as EventRow;
    const { eventId } = await saveEvent(mutate, { ...base, existing });
    expect(eventId).toBe('e1');
    expect(steps()).toEqual([
      'update:events',
      'delete:event_reminders',
      'delete:event_checklist_items',
      'upsert:event_reminders',
      'upsert:event_checklist_items',
    ]);
    expect(payloadOf('events', 'update')!.payload).not.toHaveProperty('created_by');
    expect(payloadOf('events', 'update')!.payload).not.toHaveProperty('id');
  });

  it('allegati: un upload fallito (offline) non blocca gli altri e viene riportato', async () => {
    upload.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ path: 's1/e/ok.pdf' });
    const { mutate, steps, payloadOf } = fakeMutate();
    const result = await saveEvent(mutate, {
      ...base,
      files: [new File(['x'], 'rotto.pdf'), new File(['y'], 'ok.pdf')],
    });
    expect(result.failedUploads).toEqual(['rotto.pdf']);
    expect(steps().filter((s) => s === 'upsert:attachments')).toHaveLength(1);
    expect(payloadOf('attachments')!.payload).toMatchObject({ path: 's1/e/ok.pdf', name: 'ok.pdf' });
  });

  it('collega il prossimo passo del diario al nuovo impegno', async () => {
    const { mutate, payloadOf } = fakeMutate();
    const { eventId } = await saveEvent(mutate, { ...base, followUpId: 'fu1' });
    expect(payloadOf('follow_ups')!.payload).toEqual({ created_event_id: eventId });
  });

  it('un errore sulla scrittura principale si propaga', async () => {
    const { mutate } = fakeMutate((op) => op.table === 'events');
    await expect(saveEvent(mutate, base)).rejects.toThrow('scrittura rifiutata');
  });
});
