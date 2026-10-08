/** Minuscolo e senza accenti: base di ogni confronto tra testi liberi («Caffè» ≡ «caffe»). */
export const normalizeText = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Prima lettera maiuscola, resto invariato. */
export const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Esegue l'escape di un testo da inserire letteralmente in una RegExp. */
export const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
