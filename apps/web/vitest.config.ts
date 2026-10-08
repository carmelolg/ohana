import { defineConfig } from 'vitest/config';

// Test unitari dei moduli senza interfaccia (comandi di scrittura, regole di schermata, utilità).
// Le schermate vere si provano con Playwright (`pnpm test:e2e`).
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
