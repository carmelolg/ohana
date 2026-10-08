import type { Mutate } from '../lib/data';

type Call = { op: Parameters<Mutate>[0]; optimistic: Parameters<Mutate>[1] };

/** `mutate` finto: registra le operazioni senza rete né cache, per provare i casi d'uso di scrittura. */
export function fakeMutate(failOn?: (op: Call['op']) => boolean) {
  const calls: Call[] = [];
  const mutate: Mutate = async (op, optimistic) => {
    if (failOn?.(op)) {
      throw new Error(`scrittura rifiutata: ${op.table}`);
    }
    calls.push({ op, optimistic });
    return 'sent';
  };
  /** «azione:tabella» di ogni operazione, nell'ordine in cui sono avvenute. */
  const steps = () => calls.map((c) => `${c.op.action}:${c.op.table}`);
  const payloadOf = (table: string, action?: string) =>
    calls.find((c) => c.op.table === table && (!action || c.op.action === action))?.op as
      { payload?: unknown } | undefined;
  /** Contenuto (`payload`) della n-esima operazione. */
  const payloadAt = <T>(index: number): T => (calls[index].op as { payload: T }).payload;
  return { mutate, calls, steps, payloadOf, payloadAt };
}
