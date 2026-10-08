import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import { createCategory, deleteCategory, recordCategoryFeedback, updateCategory } from './categories';

describe('comandi sulle categorie', () => {
  it('crea una categoria: upsert con id del client e aggiornamento ottimistico', async () => {
    const f = fakeMutate();
    await createCategory(f.mutate, { id: 'c1', spaceId: 's1', name: 'Sport', position: 6 });
    expect(f.steps()).toEqual(['upsert:categories']);
    expect(f.payloadAt(0)).toEqual({ id: 'c1', space_id: 's1', name: 'Sport', keywords: [], position: 6 });
    const patch = f.calls[0].optimistic![0].patch;
    expect(patch([{ id: 'a' }])).toEqual([{ id: 'a' }, expect.objectContaining({ id: 'c1', slug: null })]);
    expect(patch(undefined)).toHaveLength(1); // cache ancora vuota
  });

  it('elimina: delete per id e la riga sparisce subito dalla cache', async () => {
    const f = fakeMutate();
    await deleteCategory(f.mutate, 'c1');
    expect(f.calls[0].op).toMatchObject({ table: 'categories', action: 'delete', match: { id: 'c1' } });
    expect(f.calls[0].optimistic![0].patch([{ id: 'c1' }, { id: 'c2' }])).toEqual([{ id: 'c2' }]);
  });

  it("registra l'esempio troncando il testo a 200 caratteri", async () => {
    const f = fakeMutate();
    await recordCategoryFeedback(f.mutate, {
      id: 'f1',
      spaceId: 's1',
      userId: 'u1',
      text: 'x'.repeat(300),
      label: 'id:c1',
      corrected: true,
    });
    const payload = f.payloadAt<{ text: string; corrected: boolean; user_id: string }>(0);
    expect(payload.text).toHaveLength(200);
    expect(payload).toMatchObject({ corrected: true, user_id: 'u1' });
  });

  it('aggiorna nome e parole chiave senza toccare le altre righe', async () => {
    const f = fakeMutate();
    await updateCategory(f.mutate, 'c1', { keywords: ['cane', 'gatto'] });
    expect(f.calls[0].op).toMatchObject({
      action: 'update',
      match: { id: 'c1' },
      payload: { keywords: ['cane', 'gatto'] },
    });
    const patch = f.calls[0].optimistic![0].patch;
    expect(
      patch([
        { id: 'c1', name: 'Animali' },
        { id: 'c2', name: 'Altro' },
      ]),
    ).toEqual([
      { id: 'c1', name: 'Animali', keywords: ['cane', 'gatto'] },
      { id: 'c2', name: 'Altro' },
    ]);
  });

  it('propaga il rifiuto della scrittura (la schermata decide cosa mostrare)', async () => {
    const f = fakeMutate(() => true);
    await expect(deleteCategory(f.mutate, 'c1')).rejects.toThrow('scrittura rifiutata');
  });
});
