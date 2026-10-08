/** URL del Cloudflare Worker (feed ICS, azioni da email, fallback AI della scansione). Vuoto in sviluppo senza Worker. */
export const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) ?? '';
