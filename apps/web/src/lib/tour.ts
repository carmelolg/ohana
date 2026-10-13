import { readStorage, writeStorage } from './storage';

const TOUR_KEY = 'ohana-tour-done';

/** La guida iniziale si mostra una volta per dispositivo; senza storage disponibile riparte a ogni visita (innocuo). */
export const isTourDone = (): boolean => readStorage(TOUR_KEY) === '1';
export const markTourDone = (): void => writeStorage(TOUR_KEY, '1');
