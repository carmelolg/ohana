/** Condivide il link d'invito col foglio del sistema, o lo copia se il dispositivo non lo offre. */
export async function shareInviteLink(spaceName: string, url: string): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    try {
      await navigator.share({ title: `Invito a ${spaceName}`, url });
      return 'shared';
    } catch {
      /* condivisione annullata: si ripiega sulla copia del link */
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
