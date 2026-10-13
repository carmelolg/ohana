import { createContext, useContext } from 'react';

interface TourControl {
  /** Avvia (o riavvia) la guida dal primo passo. */
  start: () => void;
}

export const TourContext = createContext<TourControl>({ start: () => undefined });

export const useTourControl = (): TourControl => useContext(TourContext);
