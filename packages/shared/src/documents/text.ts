/** Testo senza accenti e con gli spazi compattati: gli indici di etichette e cifre devono riferirsi a QUESTA stringa. */
export const flat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
