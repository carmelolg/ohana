import { supabase } from '../supabase';
import { unwrap } from './result';
import { trackBusy } from '../busy';

/** Cancella tutte le correzioni imparate in uno spazio: la categoria torna a dipendere solo dalle regole di base. */
export async function resetCategoryLearning(spaceId: string): Promise<void> {
  unwrap(await trackBusy(async () => supabase.from('category_feedback').delete().eq('space_id', spaceId)));
}
