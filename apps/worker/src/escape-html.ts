const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** Escape per testo e attributi HTML. Ogni valore proveniente da utenti passa da qui prima di entrare in un documento. */
export const escapeHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);
