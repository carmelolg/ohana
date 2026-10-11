import type { EventRow } from '../../lib/types';

interface Access {
  existing: Pick<EventRow, 'import_id'> | null;
  isNew: boolean;
  canWriteSpace: boolean;
  hasDefaultSpace: boolean;
}

/**
 * Si può modificare l'impegno? Uno importato da un calendario esterno no: la prossima sincronizzazione riscriverebbe le
 * modifiche, quindi si cambia nel calendario d'origine. Un impegno nuovo si può sempre iniziare se c'è uno spazio dove salvarlo.
 */
export function canEditEvent({ existing, isNew, canWriteSpace, hasDefaultSpace }: Access): boolean {
  if (existing?.import_id) {
    return false;
  }
  return canWriteSpace || (isNew && hasDefaultSpace);
}
