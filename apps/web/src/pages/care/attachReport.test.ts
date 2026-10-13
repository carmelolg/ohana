import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { CareReminderEvent } from '../../lib/data';
import type { CareThread } from '../../lib/types';

const upload = vi.fn();
vi.mock('../../lib/api/careFiles', () => ({ uploadCareFile: (u: unknown) => upload(u) }));

import { attachReports, isVisitEvent } from './attachReport';

const thread = { id: 't1', space_id: 's1', recipient_id: 'r1' } as CareThread;
const file = (name: string) => new File(['x'], name);
const exam = {
  id: 'ev1',
  title: 'ECG',
  starts_at: '2026-03-10T09:00:00Z',
  categories: { slug: 'esame' },
} as unknown as CareReminderEvent;

describe('attachReports', () => {
  beforeEach(() => upload.mockReset());

  it('su un tassello esistente carica soltanto i file', async () => {
    const m = fakeMutate();
    const failed = await attachReports(m.mutate, thread, { kind: 'entry', entryId: 'e1', title: 'ECG' }, [
      file('a.pdf'),
    ]);
    expect(failed).toEqual([]);
    expect(m.calls).toHaveLength(0);
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ entryId: 'e1', recipientId: 'r1' }));
  });

  it('su un esame in calendario crea il tassello legato all’impegno e vi allega i file', async () => {
    const m = fakeMutate();
    await attachReports(m.mutate, thread, { kind: 'event', event: exam }, [file('a.pdf')]);
    expect(m.calls[0].op).toMatchObject({
      action: 'upsert',
      table: 'care_entries',
      payload: { type: 'esame', event_id: 'ev1', title: 'ECG', entry_date: '2026-03-10', thread_id: 't1' },
    });
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ entryId: m.payloadAt<{ id: string }>(0).id }),
    );
  });

  it('elenca i file che non partono senza annullare il tassello', async () => {
    upload.mockRejectedValueOnce(new Error('offline'));
    const m = fakeMutate();
    const failed = await attachReports(m.mutate, thread, { kind: 'event', event: exam }, [
      file('a.pdf'),
      file('b.pdf'),
    ]);
    expect(failed).toEqual(['a.pdf']);
    expect(m.calls).toHaveLength(1);
  });

  it('riconosce le visite dalla categoria', () => {
    expect(isVisitEvent({ categories: { slug: 'visita' } } as CareReminderEvent)).toBe(true);
    expect(isVisitEvent(exam)).toBe(false);
  });
});
