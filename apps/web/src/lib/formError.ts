/** Quanto aspettare perché React abbia disegnato l'avviso prima di portarlo in vista. */
const RENDER_DELAY_MS = 60;

/**
 * Mostra l'errore di un modulo e porta in vista l'avviso (`<FormError>`): chi dimentica un campo obbligatorio non deve
 * cercare il messaggio in fondo alla pagina. Anche se il testo è identico al tentativo precedente, la pagina scorre.
 */
export function showFormError(set: (message: string) => void, message: string): void {
  set(message);
  if (message) {
    window.setTimeout(() => {
      document.querySelector('[data-form-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, RENDER_DELAY_MS);
  }
}
