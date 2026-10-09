import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import { addQuestion, ensureVisitPrep } from './visitPrep';

describe('preparazione della visita', () => {
  it("ha lo stesso id dell'impegno: crearla due volte non duplica", async () => {
    const f = fakeMutate();
    await ensureVisitPrep(f.mutate, { spaceId: 's1', eventId: 'ev1', threadId: 't1' });
    await ensureVisitPrep(f.mutate, { spaceId: 's1', eventId: 'ev1', threadId: 't1' });
    expect(f.payloadAt(0)).toMatchObject({ id: 'ev1', event_id: 'ev1', thread_id: 't1' });
    expect(f.payloadAt(1)).toMatchObject({ id: 'ev1' });
  });

  it('le domande si aggiungono con testo ripulito e posizione', async () => {
    const f = fakeMutate();
    await addQuestion(f.mutate, {
      spaceId: 's1',
      prepId: 'ev1',
      text: '  Serve la colonscopia?  ',
      position: 3,
    });
    expect(f.payloadAt(0)).toMatchObject({ prep_id: 'ev1', text: 'Serve la colonscopia?', position: 3 });
  });
});
