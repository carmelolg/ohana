interface Access {
  isNew: boolean;
  canWriteSpace: boolean;
  hasDefaultSpace: boolean;
}

/**
 * Si può modificare l'impegno? Anche uno importato da un calendario esterno: di quello restano bloccati titolo e orario
 * (`originLocked`), il resto è nostro. Un impegno nuovo si può sempre iniziare se c'è uno spazio dove salvarlo.
 */
export function canEditEvent({ isNew, canWriteSpace, hasDefaultSpace }: Access): boolean {
  return canWriteSpace || (isNew && hasDefaultSpace);
}
