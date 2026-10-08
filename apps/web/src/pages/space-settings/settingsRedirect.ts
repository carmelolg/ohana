/**
 * Dove portare la pagina impostazioni quando cambia lo spazio selezionato: sulle impostazioni del nuovo spazio.
 * `null` = resta dove sei («Tutti gli spazi» non ha impostazioni sue, e se l'URL è già giusto non serve muoversi).
 */
export function settingsRedirect(selected: string, currentId: string): string | null {
  if (selected === 'all' || selected === currentId) {
    return null;
  }
  return `/spazio/${selected}`;
}
