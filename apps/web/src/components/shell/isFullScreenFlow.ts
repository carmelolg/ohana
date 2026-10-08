/** Flussi a schermo intero (Annulla · Salva): niente barra inferiore. */
export const isFullScreenFlow = (pathname: string): boolean =>
  pathname === '/nuovo' || pathname.startsWith('/evento/') || pathname === '/scansiona';
