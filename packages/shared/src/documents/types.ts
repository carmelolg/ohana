// Lettura a regole del testo di un documento (bolletta, referto, ricetta, multa, avviso condominio) uscito dall'OCR.
// Nessuna rete: tutto avviene sul dispositivo. L'utente conferma sempre i campi prima di salvare.

export type DocType = 'bolletta' | 'referto' | 'ricetta' | 'multa' | 'condominio' | 'altro';

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  bolletta: 'Bolletta',
  referto: 'Referto',
  ricetta: 'Ricetta',
  multa: 'Multa',
  condominio: 'Avviso condominio',
  altro: 'Documento',
};
export const DOC_FOLDER: Record<DocType, string> = {
  bolletta: 'Bollette',
  referto: 'Referti',
  ricetta: 'Ricette',
  multa: 'Multe',
  condominio: 'Condominio',
  altro: 'Altro',
};
export const DOC_FOLDERS = [
  'Bollette',
  'Referti',
  'Ricette',
  'Multe',
  'Condominio',
  'Garanzie',
  'Altro',
] as const;

export interface ParsedDocument {
  docType: DocType;
  /** Etichetta più precisa, es. «Bolletta luce» */
  docLabel: string;
  supplier: string | null;
  amount: number | null;
  /** altre cifre trovate, dalla più probabile: l'utente può sceglierne un'altra con un tocco */
  amountCandidates: number[];
  /** scadenza di pagamento (09:00 a Roma) */
  dueDate: Date | null;
  issueDate: Date | null;
  folder: string;
  /** quali campi sono stati riconosciuti con sicurezza */
  found: { type: boolean; supplier: boolean; amount: boolean; dueDate: boolean };
}

/** Un valore trovato nel testo e la posizione in cui compare (serve ad associarlo all'etichetta che lo precede). */
export interface Hit<T> {
  value: T;
  index: number;
}
