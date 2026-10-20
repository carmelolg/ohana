import { useSyncExternalStore } from 'react';

// Contatore delle operazioni di rete in corso (upload, RPC, chiamate al Worker, geocodifica).
// Le letture React Query e le scritture in coda hanno già il loro stato: qui c'è il resto.
let active = 0;
const listeners = new Set<() => void>();

function setActive(delta: number) {
  active += delta;
  listeners.forEach((listener) => listener());
}

/**
 * Segna un'operazione come in corso per tutta la sua durata. Il contatore torna indietro anche se l'operazione fallisce,
 * altrimenti l'indicatore resterebbe acceso per sempre.
 */
export async function trackBusy<T>(work: () => Promise<T>): Promise<T> {
  setActive(1);
  try {
    return await work();
  } finally {
    setActive(-1);
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Vero mentre almeno un'operazione di rete è in corso. */
export const isNetworkBusy = (): boolean => active > 0;

export const useNetworkBusy = (): boolean => useSyncExternalStore(subscribe, isNetworkBusy);
