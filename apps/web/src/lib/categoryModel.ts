import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildModel, type Feedback } from '@ohana/shared';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Category } from './types';

/** Etichetta stabile di una categoria: lo slug per le predefinite (uguale in ogni spazio), «id:<uuid>» per le personalizzate. */
export const labelOf = (c: Pick<Category, 'id' | 'slug'>) => c.slug ?? `id:${c.id}`;
export const categoryByLabel = (cats: Category[], label: string | null | undefined) =>
  label ? cats.find((c) => labelOf(c) === label) : undefined;

interface FeedbackRow {
  id: string;
  text: string;
  label: string;
  corrected: boolean;
  created_at: string;
}

/** Correzioni e conferme registrate in uno spazio (le ultime 1000: bastano e tengono leggero il modello). */
export function useCategoryFeedback(spaceId: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['feedback', spaceId],
    enabled: !!session && !!spaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_feedback')
        .select('id, text, label, corrected, created_at')
        .eq('space_id', spaceId!)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) {
        throw new Error(error.message);
      }
      return (data as FeedbackRow[]).reverse(); // dal più vecchio al più recente
    },
  });
}

/** Naive Bayes dello spazio: esempi di partenza + correzioni dell'utente (si ricostruisce in pochi ms). */
export function useCategoryModel(spaceId: string | undefined) {
  const { data: rows = [] } = useCategoryFeedback(spaceId);
  const model = useMemo(
    () => buildModel(rows.map<Feedback>((r) => ({ text: r.text, label: r.label, corrected: r.corrected }))),
    [rows],
  );
  return { model, examples: rows.length };
}
