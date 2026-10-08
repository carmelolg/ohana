import { defineConfig } from 'vitest/config';

// Wrangler importa i file .html come testo (regola in wrangler.toml); in test facciamo lo stesso.
export default defineConfig({
  plugins: [
    {
      name: 'html-as-text',
      transform(code, id) {
        if (id.endsWith('.html')) {
          return { code: `export default ${JSON.stringify(code)};`, map: null };
        }
      },
    },
  ],
});
