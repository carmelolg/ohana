import { readStorage, writeStorage } from './storage';

const SPACE_KEY = 'ohana-space';

/** Spazio selezionato l'ultima volta (un valore non più valido ricade sul primo spazio). */
export const loadSelectedSpace = (): string => readStorage(SPACE_KEY) ?? 'all';
export const saveSelectedSpace = (id: string): void => writeStorage(SPACE_KEY, id);
