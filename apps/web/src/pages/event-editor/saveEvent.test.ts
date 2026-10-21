import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { EventRow } from '../../lib/types';
import type { VisitRecord } from '../../lib/api/careThreadMove';
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
  careRecipientId: null,
  visit: null,
  linkKey: '',
};

const visitOfThread1: VisitRecord = {
  entryId: 'entry1',
  recipientId: 'r1',
  threadId: 't1',
  followUpEventIds: ['f1', 'f2'],
};
const existingVisit = { id: 'ev1', care_thread_id: 't1' } as unknown as EventRow;

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

describe('saveEvent: visita spostata in un altro filone', () => {
  it("cambia filone: sposta tassello e scadenze insieme all'impegno", async () => {
    const { mutate, steps, payloadOf, calls } = fakeMutate();
    await saveEvent(mutate, {
      ...base,
      existing: existingVisit,
      visit: visitOfThread1,
      careThreadId: 't2',
      careRecipientId: 'r1',
    });
    // dopo la riga dell'impegno: tassello e scadenze, poi promemoria e checklist
    expect(steps().slice(0, 4)).toEqual([
      'update:events',
      'update:care_entries',
      'update:events',
      'update:events',
    ]);
    expect(payloadOf('care_entries')).toMatchObject({
      payload: { thread_id: 't2', recipient_id: 'r1' },
      match: { id: 'entry1' },
    });
    expect(calls.slice(2, 4).map((c) => c.op)).toEqual([
      { table: 'events', action: 'update', payload: { care_thread_id: 't2' }, match: { id: 'f1' } },
      { table: 'events', action: 'update', payload: { care_thread_id: 't2' }, match: { id: 'f2' } },
    ]);
  });

  it('cambia persona: sposta anche i file del referto', async () => {
    const { mutate, payloadOf } = fakeMutate();
    await saveEvent(mutate, {
      ...base,
      existing: existingVisit,
      visit: visitOfThread1,
      careThreadId: 't9',
      careRecipientId: 'r2',
    });
    expect(payloadOf('care_files', 'update')).toMatchObject({
      payload: { recipient_id: 'r2' },
      match: { entry_id: 'entry1' },
    });
  });

  it('stesso filone: non tocca tassello né scadenze', async () => {
    const { mutate, steps } = fakeMutate();
    await saveEvent(mutate, {
      ...base,
      existing: existingVisit,
      visit: visitOfThread1,
      careThreadId: 't1',
      careRecipientId: 'r1',
    });
    expect(steps()).not.toContain('update:care_entries');
    expect(steps()).not.toContain('update:care_files');
  });

  it('impegno nuovo o non visita: nessuno spostamento', async () => {
    const { mutate, steps } = fakeMutate();
    await saveEvent(mutate, { ...base, careThreadId: 't2', careRecipientId: 'r1' });
    expect(steps()).not.toContain('update:care_entries');
  });
});

describe('saveEvent: collegamento a pratiche e manutenzioni', () => {
  it('collegato a una pratica: scrive solo quella colonna', async () => {
    const { mutate, payloadOf } = fakeMutate();
    await saveEvent(mutate, { ...base, linkKey: 'procedure:p1' });
    expect(payloadOf('events')!.payload).toMatchObject({
      linked_procedure_id: 'p1',
      linked_maintenance_id: null,
    });
  });

  it('in modifica, togliere il collegamento lo azzera', async () => {
    const { mutate, payloadOf } = fakeMutate();
    const existing = { id: 'e1', linked_maintenance_id: 'm1' } as unknown as EventRow;
    await saveEvent(mutate, { ...base, existing, linkKey: '' });
    expect(payloadOf('events', 'update')!.payload).toMatchObject({
      linked_procedure_id: null,
      linked_maintenance_id: null,
    });
  });

  it('una faccenda non si collega a nulla', async () => {
    const { mutate, payloadOf } = fakeMutate();
    await saveEvent(mutate, { ...base, isChore: true, assigneeId: 'u1', linkKey: 'maintenance:m1' });
    expect(payloadOf('events')!.payload).toMatchObject({
      linked_procedure_id: null,
      linked_maintenance_id: null,
    });
  });

  describe('impegno importato da un calendario esterno', () => {
    const imported = {
      id: 'ev1',
      import_id: 'imp1',
      location: 'Via Roma 1',
      notes: null,
      local_overrides: [],
    } as unknown as EventRow; // solo i campi che saveEvent legge

    it('non scrive titolo, orario né ripetizione; scrive i campi nostri e segna cosa è cambiato', async () => {
      const { mutate, payloadOf } = fakeMutate();
      await saveEvent(mutate, {
        ...base,
        existing: imported,
        title: 'Titolo cambiato',
        location: { text: 'Studio dott. Rossi', lat: null, lng: null },
        notes: '',
        linkKey: 'procedure:p1',
      });
      const payload = payloadOf('events', 'update')!.payload as Record<string, unknown>;
      expect(payload).not.toHaveProperty('title');
      expect(payload).not.toHaveProperty('starts_at');
      expect(payload).not.toHaveProperty('all_day');
      expect(payload).not.toHaveProperty('rrule');
      expect(payload).not.toHaveProperty('kind');
      expect(payload).toMatchObject({
        location: 'Studio dott. Rossi',
        notes: null,
        local_overrides: ['location'],
        category_id: 'c1',
        linked_procedure_id: 'p1',
      });
    });

    it('un campo già cambiato a mano resta tale anche se non lo si tocca', async () => {
      const { mutate, payloadOf } = fakeMutate();
      await saveEvent(mutate, {
        ...base,
        existing: { ...imported, notes: 'mie note', local_overrides: ['notes'] },
        location: { text: 'Via Roma 1', lat: 1, lng: 2 },
        notes: 'mie note',
      });
      expect(payloadOf('events', 'update')!.payload).toMatchObject({ local_overrides: ['notes'] });
    });
  });
});
