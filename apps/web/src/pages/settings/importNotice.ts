/**
 * Avviso sotto la scelta dello spazio: collegare un calendario personale a uno spazio condiviso lo mostra a tutti i suoi
 * membri. Se si è soli nello spazio non c'è nessuno a cui mostrarlo, quindi niente avviso.
 */
export function importVisibilityNote(spaceName: string, memberCount: number): string | null {
  if (memberCount <= 1) {
    return null;
  }
  const others = memberCount - 1;
  const who = others === 1 ? 'all’altra persona' : `alle altre ${others} persone`;
  return `Gli impegni importati saranno visibili ${who} dello spazio «${spaceName}», non solo a te.`;
}
