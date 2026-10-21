import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { CareEntry } from '../types';

const storage = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('../supabase', () => ({
  supabase: { storage: { from: () => storage } },
}));

const { removeEntryWithFiles } = await import('./care');

const entry = (over: Partial<CareEntry> = {}): CareEntry =>
  ({
    id: 'n1',
    title: 'Visita',
    care_files: [],
    ...over,
  }) as CareEntry;

beforeEach(() => storage.remove.mockReset());

describe('removeEntryWithFiles', () => {
  it('senza referti: cancella solo la riga, senza toccare lo storage', async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    await removeEntryWithFiles(mutate, entry());
    expect(storage.remove).not.toHaveBeenCalled();
    expect(steps()).toEqual(['delete:care_entries']);
    expect(payloadOf('care_entries')).toMatchObject({ match: { id: 'n1' } });
  });

  it('con referti: toglie i file dallo storage prima della riga', async () => {
    storage.remove.mockResolvedValue({ error: null });
    const { mutate, steps } = fakeMutate();
    const withFiles = entry({
      care_files: [{ id: 'f1', path: 's/r/referto.pdf' } as CareEntry['care_files'][number]],
    });
    await removeEntryWithFiles(mutate, withFiles);
    expect(storage.remove).toHaveBeenCalledWith(['s/r/referto.pdf']);
    expect(steps()).toEqual(['delete:care_entries']);
  });

  it('se lo storage fallisce non cancella il tassello', async () => {
    storage.remove.mockResolvedValue({ error: { message: 'offline' } });
    const { mutate, calls } = fakeMutate();
    const withFiles = entry({
      care_files: [{ id: 'f1', path: 's/r/referto.pdf' } as CareEntry['care_files'][number]],
    });
    await expect(removeEntryWithFiles(mutate, withFiles)).rejects.toThrow(
      'Non riesco a eliminare i referti: serve la connessione',
    );
    expect(calls).toHaveLength(0);
  });
});
