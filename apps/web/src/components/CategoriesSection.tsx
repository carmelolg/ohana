import { useQueryClient } from '@tanstack/react-query';
import { resetCategoryLearning } from '../lib/api/categoryFeedback';
import { createCategory, deleteCategory, updateCategory } from '../lib/api/categories';
import { useCategoryFeedback } from '../lib/categoryModel';
import { useCategories, useMutate, useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { newId } from '../lib/outbox';
import { useToast } from '../lib/toast';
import type { Category } from '../lib/types';
import { SettingsCard } from './SettingsCard';
import { CategoryRow } from './categories/CategoryRow';
import { LearningCard } from './categories/LearningCard';
import { NewCategoryForm } from './categories/NewCategoryForm';
import { parseKeywords } from './categories/keywords';

const DUPLICATE_MESSAGE = 'Esiste già una categoria con questo nome';

/** Azioni sulle categorie di uno spazio, con conferme e messaggi per l'utente. */
function useCategoryActions(spaceId: string, categories: Category[]) {
  const mutate = useMutate();
  const toast = useToast();
  const dialog = useDialog();
  const qc = useQueryClient();

  const update = async (c: Category, patch: Partial<Pick<Category, 'name' | 'keywords'>>) => {
    try {
      await updateCategory(mutate, c.id, patch);
    } catch (e) {
      toast((e as Error).message.includes('duplicate') ? DUPLICATE_MESSAGE : (e as Error).message);
    }
  };

  const remove = async (c: Category) => {
    const confirmed = await dialog.confirm({
      title: `Eliminare «${c.name}»?`,
      message: 'Gli impegni di questa categoria passeranno ad «Altro».',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (confirmed) {
      await deleteCategory(mutate, c.id);
    }
  };

  const add = async (name: string, keywords: string) => {
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return toast(DUPLICATE_MESSAGE);
    }
    await createCategory(mutate, {
      id: newId(),
      spaceId,
      name,
      keywords: parseKeywords(keywords),
      position: categories.length,
    });
  };

  const resetLearning = async () => {
    const confirmed = await dialog.confirm({
      title: 'Azzerare l’apprendimento?',
      message:
        'L’app dimentica le correzioni fatte finora in questo spazio e torna a usare solo le regole di base.',
      confirmLabel: 'Azzera',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await resetCategoryLearning(spaceId);
    } catch (e) {
      return toast((e as Error).message);
    }
    await qc.invalidateQueries({ queryKey: ['feedback'] });
    toast('Apprendimento azzerato');
  };

  return { update, remove, add, resetLearning };
}

/** Gestione delle categorie di uno spazio: rinomina, parole chiave per l'aggiunta rapida, nuove categorie. */
export function CategoriesSection({ spaceId }: { spaceId: string }) {
  const { canWrite, myRole } = useSpace();
  const { data: all = [] } = useCategories();
  const { data: feedback = [] } = useCategoryFeedback(spaceId);
  const list = all.filter((c) => c.space_id === spaceId);
  const actions = useCategoryActions(spaceId, list);
  const writable = canWrite(spaceId);
  const role = myRole(spaceId);

  return (
    <SettingsCard
      id="categorie"
      title="Categorie degli impegni"
      hint="Le parole chiave servono all’aggiunta rapida: scrivendo «dal veterinario» l’impegno va in «Animali» se ha la parola «veterinario»."
    >
      {list.map((c) => (
        <CategoryRow
          key={c.id}
          category={c}
          writable={writable}
          onRename={(name) => void actions.update(c, { name })}
          onKeywords={(keywords) => void actions.update(c, { keywords })}
          onDelete={() => void actions.remove(c)}
        />
      ))}
      <LearningCard
        examples={feedback.length}
        canReset={role === 'owner' || role === 'admin'}
        onReset={() => void actions.resetLearning()}
      />
      {writable && <NewCategoryForm onAdd={(name, keywords) => void actions.add(name, keywords)} />}
    </SettingsCard>
  );
}
