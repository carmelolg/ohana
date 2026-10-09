import { describe, expect, it, vi } from 'vitest';
import { romeToDate } from '@ohana/shared';
import { fakeMutate } from '../../test-utils/fakeMutate';
import { saveReportToCare } from './careReport';

const thread = { id: 't1', space_id: 's1', recipient_id: 'r1' };
const file = new File(['x'], 'referto.pdf', { type: 'application/pdf' });

describe('referto scansionato nel filone', () => {
  it('diventa un tassello «esame» con i valori letti e il file allegato', async () => {
    const f = fakeMutate();
    const upload = vi.fn(async () => undefined);
    const id = await saveReportToCare(f.mutate, {
      thread,
      title: 'Referto · Osp. S. Maria',
      text: 'Calprotectina fecale 180 µg/g\nPCR 0,6 mg/dl',
      date: romeToDate(2026, 10, 28, 12),
      file,
      upload,
    });
    expect(f.payloadAt(0)).toMatchObject({
      id,
      type: 'esame',
      thread_id: 't1',
      recipient_id: 'r1',
      entry_date: '2026-10-28',
      title: 'Referto · Osp. S. Maria',
      readings: { calprotectin_ugg: 180, crp_mgdl: 0.6 },
    });
    expect(upload).toHaveBeenCalledWith(id, file);
  });

  it('senza titolo né valori riconosciuti salva comunque il referto', async () => {
    const f = fakeMutate();
    await saveReportToCare(f.mutate, {
      thread,
      title: '  ',
      text: 'testo illeggibile',
      date: romeToDate(2026, 10, 28),
      file,
      upload: async () => undefined,
    });
    expect(f.payloadAt(0)).toMatchObject({ title: 'Referto', readings: {} });
  });
});
