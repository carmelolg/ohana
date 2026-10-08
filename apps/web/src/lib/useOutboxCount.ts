import { useEffect, useState } from 'react';
import { onOutboxChange, pendingCount } from './outbox';

/** Quante modifiche sono in coda in attesa di rete. */
export function useOutboxCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => void pendingCount().then(setCount);
    refresh();
    return onOutboxChange(refresh);
  }, []);
  return count;
}
