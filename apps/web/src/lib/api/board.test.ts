import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import { deleteNote, markBoardRead, publishNote, setNotePinned } from './board';

describe('bacheca', () => {
  it("pubblica una nota fissata, con scadenza e avviso scelti dall'autore", async () => {
    const f = fakeMutate();
    await publishNote(f.mutate, {
      id: 'n1',
      spaceId: 's1',
      authorId: 'u1',
      text: 'Chiavi da me',
      expiresAt: new Date('2026-10-11T21:59:00Z'),
      notifyPush: true,
    });
    expect(f.payloadAt(0)).toEqual({
      id: 'n1',
      space_id: 's1',
      author_id: 'u1',
      text: 'Chiavi da me',
      pinned: true,
      expires_at: '2026-10-11T21:59:00.000Z',
      notify_push: true,
    });
  });
  it('senza scadenza scrive null', async () => {
    const f = fakeMutate();
    await publishNote(f.mutate, {
      id: 'n1',
      spaceId: 's',
      authorId: 'u',
      text: 't',
      expiresAt: null,
      notifyPush: false,
    });
    expect(f.payloadAt<{ expires_at: unknown }>(0).expires_at).toBeNull();
  });
  it('fissa/toglie e cancella', async () => {
    const f = fakeMutate();
    await setNotePinned(f.mutate, 'n1', false);
    await deleteNote(f.mutate, 'n1');
    expect(f.steps()).toEqual(['update:board_notes', 'delete:board_notes']);
    expect(f.calls[0].op).toMatchObject({ payload: { pinned: false }, match: { id: 'n1' } });
  });
});

describe('bacheca letta', () => {
  it('segna gli spazi come letti con una sola scrittura', async () => {
    const f = fakeMutate();
    await markBoardRead(f.mutate, ['s1', 's2'], new Date('2026-10-11T08:00:00Z'));
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].op).toMatchObject({
      table: 'board_reads',
      action: 'upsert',
      onConflict: 'space_id,user_id',
    });
    expect(f.payloadAt(0)).toEqual([
      { space_id: 's1', read_at: '2026-10-11T08:00:00.000Z' },
      { space_id: 's2', read_at: '2026-10-11T08:00:00.000Z' },
    ]);
  });
});
