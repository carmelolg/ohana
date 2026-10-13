import { defineConfig, devices } from '@playwright/test';

// Richiede Supabase locale attivo (`supabase start`) e le variabili in apps/web/.env.local.
// I test dei progetti «chromium» e «desktop» girano sul server di sviluppo (5173);
// il progetto «prod» gira sulla build di produzione (4173), l'unica in cui c'è il service worker: serve al test offline di Emergenza.
// La guida iniziale è già «vista»: altrimenti coprirebbe la schermata in tutti i test. Lo scenario dedicato la riattiva.
const TOUR_DONE = [{ name: 'ohana-tour-done', value: '1' }];
const storageState = {
  cookies: [],
  origins: ['http://localhost:5173', 'http://localhost:4173'].map((origin) => ({
    origin,
    localStorage: TOUR_DONE,
  })),
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    storageState,
  },
  webServer: [
    { command: 'pnpm dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
    {
      // `--mode e2e`: non legge `.env.production` (che punta al progetto online) ma `.env.local`, cioè il Supabase locale
      command:
        'node scripts/copy-ocr-assets.mjs && vite build --mode e2e && vite preview --mode e2e --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] }, testIgnore: /(emergency-offline|photon-live)/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /(emergency-offline|photon-live)/ },
    {
      name: 'prod',
      use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4173' },
      testMatch: /emergency-offline/,
    },
    { name: 'live', use: { ...devices['Desktop Chrome'] }, testMatch: /photon-live/ },
  ],
});
