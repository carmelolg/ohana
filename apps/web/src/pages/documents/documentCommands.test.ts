import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { DocumentRow } from '../../lib/types';
import { renameDocument } from './documentCommands';

const doc = (over: Partial<DocumentRow> = {}): DocumentRow =>
  ({ id: 'd1', title: 'Bolletta', attachment_id: 'a1', ...over }) as DocumentRow;

describe('renameDocument', () => {
  it('cambia il titolo nel database e in cache, senza toccare il file', async () => {
    const { mutate, calls, payloadOf } = fakeMutate();
    await renameDocument(mutate, doc(), 'Bolletta luce 2026');
    expect(payloadOf('documents')).toMatchObject({
      action: 'update',
      payload: { title: 'Bolletta luce 2026' },
      match: { id: 'd1' },
    });
    const patched = calls[0].optimistic![0].patch([
      doc(),
      doc({ id: 'd2', title: 'Altro' }),
    ]) as DocumentRow[];
    expect(patched.map((d) => d.title)).toEqual(['Bolletta luce 2026', 'Altro']);
    expect(patched[0].attachment_id).toBe('a1');
  });
});
