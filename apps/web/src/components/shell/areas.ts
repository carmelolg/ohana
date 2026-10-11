export type Area = 'oggi' | 'agenda' | 'casa' | 'famiglia';

/** Prefissi di route per area: ogni pagina dell'app sta sotto una delle quattro aree. */
const AREA_PATHS: Record<Exclude<Area, 'oggi'>, string[]> = {
  agenda: ['/calendario', '/agenda'],
  casa: ['/casa', '/spesa', '/spese', '/scadenze', '/manutenzioni', '/pratiche', '/documenti', '/scansiona'],
  famiglia: ['/famiglia', '/altro', '/rubrica', '/emergenza', '/cura', '/impostazioni', '/spazio'],
};

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + '/');

/** Area evidenziata nella navigazione; null per le pagine fuori dalle aree (editor impegno, accesso). */
export function areaOf(pathname: string): Area | null {
  if (isUnder(pathname, '/oggi')) {
    return 'oggi';
  }
  const found = (Object.keys(AREA_PATHS) as (keyof typeof AREA_PATHS)[]).find((a) =>
    AREA_PATHS[a].some((p) => isUnder(pathname, p)),
  );
  return found ?? null;
}
