import { useMemo, useRef } from 'react';
import { chooseCategory, type Choice, type ParsedEvent } from '@ohana/shared';
import { useAuth } from '../../lib/auth';
import { categoryByLabel, labelOf, useCategoryModel } from '../../lib/categoryModel';
import { useMutate } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import { newId } from '../../lib/outbox';
import { useToast } from '../../lib/toast';
import type { Category } from '../../lib/types';
import { createCategory, deleteCategory, recordCategoryFeedback } from '../../lib/api/categories';
import { feedbackKind } from './categoryFeedback';

interface Args {
  isNew: boolean;
  parsed: ParsedEvent | null;
  spaceId: string;
  categoriesOfSpace: Category[];
  /** Categoria scelta a mano (se c'è, il suggerimento non conta più). */
  chosenId: string | undefined;
  /** Categoria con cui l'impegno era stato salvato (solo in modifica). */
  savedId: string | null;
  choose: (id: string) => void;
  onError: (message: string) => void;
}

/** La categoria che le regole del parser hanno riconosciuto nel testo, se c'è. */
const categoryRecognizedByRules = (
  parsed: ParsedEvent | null,
  categories: Category[],
): Category | undefined =>
  parsed?.categoryRecognized ? categories.find((c) => c.id === parsed.categoryId) : undefined;

interface SuggestionArgs {
  isNew: boolean;
  parsed: ParsedEvent | null;
  spaceId: string;
  categoriesOfSpace: Category[];
  chosenId: string | undefined;
}

/**
 * Categoria proposta per un impegno: le regole del parser sono la prima linea; il Naive Bayes dello spazio
 * (addestrato sulle correzioni dell'utente) interviene quando ha imparato.
 */
function useCategorySuggestion({ isNew, parsed, spaceId, categoriesOfSpace, chosenId }: SuggestionArgs) {
  const { model } = useCategoryModel(spaceId);
  const fallbackId = categoriesOfSpace.find((c) => c.slug === 'altro')?.id ?? '';
  const ruleCategory = categoryRecognizedByRules(parsed, categoriesOfSpace);
  const suggestion: Choice | null = useMemo(
    () =>
      isNew && parsed?.title
        ? chooseCategory({
            text: parsed.title,
            ruleLabel: ruleCategory ? labelOf(ruleCategory) : null,
            ruleIsCustom: !!ruleCategory && !ruleCategory.slug,
            model,
            allowed: categoriesOfSpace.map(labelOf),
          })
        : null,
    [isNew, parsed?.title, ruleCategory, model, categoriesOfSpace],
  );
  const suggestedId =
    categoryByLabel(categoriesOfSpace, suggestion?.label)?.id ?? parsed?.categoryId ?? fallbackId;
  const categoryId = (chosenId ?? suggestedId) || fallbackId;
  return {
    suggestion,
    suggestedId,
    fallbackId,
    categoryId,
    selected: categoriesOfSpace.find((c) => c.id === categoryId),
    /** Il suggerimento viene dal modello e non è stato scelto a mano: va spiegato all'utente. */
    learnedHint: suggestion?.source === 'model' && chosenId === undefined,
  };
}

interface CommandArgs {
  spaceId: string;
  categoriesOfSpace: Category[];
  categoryId: string;
  fallbackId: string;
  selected: Category | undefined;
  choose: (id: string) => void;
  onError: (message: string) => void;
}

/**
 * Creazione ed eliminazione di categorie personalizzate dall'editor. Le operazioni in corso si tengono in una coda:
 * il salvataggio le attende (altrimenti l'impegno potrebbe puntare a una categoria non ancora creata o già eliminata).
 */
function useCategoryCommands({
  spaceId,
  categoriesOfSpace,
  categoryId,
  fallbackId,
  selected,
  choose,
  onError,
}: CommandArgs) {
  const mutate = useMutate();
  const toast = useToast();
  const dialog = useDialog();
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const track = <T>(p: Promise<T>): Promise<T> => {
    pending.current = Promise.allSettled([pending.current, p]);
    return p;
  };

  async function deleteSelected() {
    if (!selected || selected.slug) {
      return;
    }
    const confirmed = await dialog.confirm({
      title: `Eliminare «${selected.name}»?`,
      message: 'Gli impegni di questa categoria passeranno ad «Altro».',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    const previous = categoryId;
    choose(fallbackId); // subito: così nessun salvataggio può puntare alla categoria che sta sparendo
    try {
      await track(deleteCategory(mutate, selected.id));
      toast('Categoria eliminata');
    } catch (e) {
      choose(previous);
      onError((e as Error).message);
    }
  }

  async function createNew() {
    const typed = await dialog.prompt({
      title: 'Nuova categoria',
      label: 'Nome',
      placeholder: 'Es. Animali, Scuola, Sport',
      confirmLabel: 'Crea',
    });
    const name = typed?.trim();
    if (!name) {
      return;
    }
    const same = categoriesOfSpace.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (same) {
      return choose(same.id);
    }
    const id = newId();
    const previous = categoryId;
    choose(id);
    try {
      await track(createCategory(mutate, { id, spaceId, name, position: categoriesOfSpace.length }));
    } catch (e) {
      choose(previous);
      onError((e as Error).message);
    }
  }

  return { createNew, deleteSelected, settled: () => pending.current };
}

/** Ogni correzione (o conferma di un suggerimento) diventa un esempio per il modello dello spazio. */
function useFeedbackRecorder(
  spaceId: string,
  savedId: string | null,
  suggestedId: string,
  suggestion: Choice | null,
) {
  const { session } = useAuth();
  const mutate = useMutate();
  return (finalCategory: Category | undefined, title: string) => {
    if (!finalCategory || title.length < 2) {
      return;
    }
    const kind = feedbackKind({
      finalId: finalCategory.id,
      proposedId: savedId ?? suggestedId,
      suggestedLabel: suggestion?.label,
    });
    if (!kind) {
      return;
    }
    // l'apprendimento non deve mai far fallire il salvataggio dell'impegno
    recordCategoryFeedback(mutate, {
      id: newId(),
      spaceId,
      userId: session!.user.id,
      text: title,
      label: labelOf(finalCategory),
      corrected: kind.corrected,
    }).catch(() => undefined);
  };
}

/** Categoria di un impegno: proposta, scelta a mano, creazione/eliminazione e apprendimento dalle correzioni. */
export function useEventCategory({
  isNew,
  parsed,
  spaceId,
  categoriesOfSpace,
  chosenId,
  savedId,
  choose,
  onError,
}: Args) {
  const proposal = useCategorySuggestion({ isNew, parsed, spaceId, categoriesOfSpace, chosenId });
  const { categoryId, fallbackId, selected, suggestedId, suggestion } = proposal;
  const commands = useCategoryCommands({
    spaceId,
    categoriesOfSpace,
    categoryId,
    fallbackId,
    selected,
    choose,
    onError,
  });
  const recordFeedback = useFeedbackRecorder(spaceId, savedId, suggestedId, suggestion);
  return {
    categoryId,
    selected,
    suggestion,
    learnedHint: proposal.learnedHint,
    createNew: commands.createNew,
    deleteSelected: commands.deleteSelected,
    settled: commands.settled,
    recordFeedback,
  };
}
