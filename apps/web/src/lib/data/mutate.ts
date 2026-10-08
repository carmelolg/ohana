import { useQueryClient } from '@tanstack/react-query';
import { write, type NewOp } from '../outbox';
import { TABLE_KEYS } from './invalidation';

type Patch = (old: unknown) => unknown;
export interface OptimisticUpdate {
  key: unknown[];
  patch: Patch;
}

export type Mutate = (op: NewOp, optimistic?: OptimisticUpdate[]) => Promise<'sent' | 'queued'>;

/**
 * Scrittura con aggiornamento ottimistico della cache e coda offline (vedi `outbox.ts`).
 * Se la scrittura fallisce, la cache viene ricaricata dal server per ripristinare lo stato reale.
 */
export function useMutate(): Mutate {
  const qc = useQueryClient();
  return async (op, optimistic = []) => {
    for (const o of optimistic) {
      qc.setQueriesData({ queryKey: o.key }, o.patch);
    }
    try {
      const result = await write(op);
      if (result === 'sent') {
        for (const k of TABLE_KEYS[op.table] ?? []) {
          await qc.invalidateQueries({ queryKey: [k] });
        }
      }
      return result;
    } catch (e) {
      await qc.invalidateQueries();
      throw e;
    }
  };
}
