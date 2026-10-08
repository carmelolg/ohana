interface Inputs {
  /** Categoria con cui l'impegno viene salvato. */
  finalId: string;
  /** Categoria proposta all'utente (suggerimento) o già salvata (in modifica). */
  proposedId: string;
  /** Etichetta suggerita dal sistema, se c'è. */
  suggestedLabel: string | null | undefined;
}

/**
 * Che esempio insegnare al modello delle categorie: una correzione (l'utente ha scelto altro rispetto alla proposta)
 * o una conferma (ha accettato un suggerimento vero, non «altro»). `null` se non c'è nulla da imparare.
 */
export function feedbackKind({ finalId, proposedId, suggestedLabel }: Inputs): { corrected: boolean } | null {
  const corrected = finalId !== proposedId;
  const confirmed = !corrected && !!suggestedLabel && suggestedLabel !== 'altro';
  return corrected || confirmed ? { corrected } : null;
}
