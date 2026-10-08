interface Checked {
  title: string;
  isChore: boolean;
  assigneeId: string | null;
  startsAt: Date | null;
  spaceId: string;
}

/** Messaggio per l'utente se manca qualcosa di indispensabile, altrimenti `null`. */
export function validateEvent({ title, isChore, assigneeId, startsAt, spaceId }: Checked): string | null {
  if (!title) {
    return 'Scrivi un titolo';
  }
  if (isChore && !assigneeId) {
    return 'Una faccenda deve essere assegnata a una persona';
  }
  if (!startsAt) {
    return 'Scegli quando: scrivilo nel testo (es. «domani alle 15») o impostalo sotto';
  }
  if (!spaceId) {
    return 'Scegli uno spazio';
  }
  return null;
}

/** Conferma mostrata dopo il salvataggio. */
export function savedMessage(isChore: boolean, isUpdate: boolean): string {
  if (isChore) {
    return isUpdate ? 'Faccenda aggiornata' : 'Faccenda salvata';
  }
  return isUpdate ? 'Impegno aggiornato' : 'Impegno salvato';
}
