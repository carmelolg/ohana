import { useEffect, useState } from 'react';

/** `true` finché la finestra rispetta la media query (es. `(min-width: 1024px)`); si aggiorna al ridimensionamento. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}
