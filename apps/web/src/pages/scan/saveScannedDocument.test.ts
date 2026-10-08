import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import { saveScannedDocument, type ScannedDocument } from './saveScannedDocument';

const upload = vi.hoisted(() => vi.fn());
vi.mock('../../lib/files', () => ({ uploadAttachment: upload }));

const doc: ScannedDocument = {
  file: new File(['x'], 'bolletta.png'),
  userId: 'u1',
  spaceId: 's1',
  memberIds: ['u1', 'u2'],
  deadlineCategoryId: 'cat-scadenza',
  title: 'Bolletta luce · Enel',
  docType: 'bolletta',
  label: 'Bolletta luce',
  supplier: 'Enel',
  amount: 84.2,
  due: '2026-10-15',
  dueDate: new Date('2026-10-15T07:00:00Z'),
  folder: 'Bollette',
  text: 'testo OCR',
  createDue: true,
  daysBefore: 3,
  attach: true,
  split: false,
};

beforeEach(() => {
  upload.mockReset();
  upload.mockResolvedValue({ id: 'att1', path: 'p' });
});

describe('saveScannedDocument', () => {
  it('scadenza + promemoria + allegato + voce in Documenti', async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    expect(await saveScannedDocument(mutate, doc)).toBe(true);
    expect(steps()).toEqual([
      'upsert:events',
      'upsert:event_reminders',
      'update:attachments',
      'upsert:documents',
    ]);
    expect(payloadOf('events')!.payload).toMatchObject({
      title: 'Bolletta luce · Enel',
      category_id: 'cat-scadenza',
      amount: 84.2,
    });
    expect(payloadOf('event_reminders')!.payload).toMatchObject({ offset_minutes: 3 * 1440 });
    expect(payloadOf('documents')!.payload).toMatchObject({
      attachment_id: 'att1',
      folder: 'Bollette',
      expires_at: '2026-10-15',
    });
  });

  it('solo archiviazione: niente evento', async () => {
    const { mutate, steps } = fakeMutate();
    expect(await saveScannedDocument(mutate, { ...doc, createDue: false })).toBe(false);
    expect(steps()).toEqual(['upsert:documents']);
  });

  it('né scadenza né archivio: non carica nemmeno il file', async () => {
    const { mutate, steps } = fakeMutate();
    await saveScannedDocument(mutate, { ...doc, createDue: false, attach: false });
    expect(upload).not.toHaveBeenCalled();
    expect(steps()).toEqual([]);
  });

  it('dividere la spesa crea le quote uguali collegate alla scadenza', async () => {
    const { mutate, calls, payloadOf } = fakeMutate();
    await saveScannedDocument(mutate, { ...doc, split: true });
    const shares = payloadOf('expense_shares')!.payload as { user_id: string; amount: number }[];
    expect(shares.map((s) => [s.user_id, s.amount])).toEqual([
      ['u1', 42.1],
      ['u2', 42.1],
    ]);
    const eventId = (payloadOf('events')!.payload as { id: string }).id;
    expect((payloadOf('expenses')!.payload as { event_id: string }).event_id).toBe(eventId);
    expect(calls.at(-1)!.op.table).toBe('expense_shares');
  });
});
