import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// Errori = difetti di correttezza. Avvisi (warn) = soglie di manutenibilità: il codice nuovo le rispetta, quello vecchio le scende un po' alla volta.
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.wrangler/**',
      'apps/web/public/**',
      'apps/web/test-results/**',
      'apps/web/playwright-report/**',
      'supabase/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      // soglie di manutenibilità (SRP / funzioni piccole)
      complexity: ['error', 14],
      'max-depth': ['error', 4],
      'max-params': ['error', 6],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 90, skipBlankLines: true, skipComments: true, IIFEs: true }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // nei componenti ogni `cond && <jsx/>` e ogni `??` conta come ramo: la soglia è più larga, la dimensione resta sotto controllo
    files: ['apps/web/**/*.tsx'],
    rules: { complexity: ['error', 25] },
  },
  {
    files: ['apps/worker/**/*.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['**/*.mjs', 'apps/web/e2e/**', 'apps/web/scripts/**', 'apps/worker/scripts/**', '*.config.*'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier, // disattiva le regole di stile che confliggono con Prettier (la formattazione la decide lui)…
  // …ma `curly` lo riattiviamo: le graffe non si omettono mai. Un `if` su una riga senza blocco nasconde i rami e invita a errori
  // quando si aggiunge una seconda istruzione. (`curly: 'all'` è compatibile con Prettier.)
  { rules: { curly: ['error', 'all'] } },
  // ── Architettura a livelli (vedi CLAUDE.md): le dipendenze vanno sempre verso il basso. Le violazioni sono ERRORI. ──
  {
    // dominio puro: nessun I/O, nessun framework, nessun «adesso» implicito (si passa `now`)
    files: ['packages/shared/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-dom/*', 'react-router-dom', 'lucide-react'],
              message: 'Il dominio non conosce React.',
            },
            {
              group: ['@supabase/*', 'idb-keyval', 'tesseract.js', 'pdfjs-dist', 'leaflet', 'workbox-*'],
              message: 'Il dominio non fa I/O: dati e servizi arrivano da fuori.',
            },
            {
              group: ['@ohana/web', '@ohana/worker', '**/apps/**'],
              message: 'Il dominio non dipende da chi lo usa.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['fetch', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'process'].map(
          (name) => ({
            name,
            message: 'Nel dominio niente I/O né API del browser: passa i dati come argomenti.',
          }),
        ),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Niente «adesso» implicito nel dominio: accetta `now` come parametro.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Niente «adesso» implicito nel dominio: accetta `now` come parametro.',
        },
      ],
    },
  },
  {
    // le schermate e i componenti non conoscono Supabase né l'ambiente: leggono da lib/data, scrivono con useMutate o lib/api
    files: ['apps/web/src/pages/**/*.{ts,tsx}', 'apps/web/src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/*', '**/lib/supabase'],
              message:
                'Le schermate non parlano con Supabase: usa lib/data (letture) o useMutate / lib/api (scritture).',
            },
            { group: ['@ohana/worker', '**/apps/worker/**'], message: 'Il web non importa il worker.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Usa lib/storage.ts: lo storage del browser può mancare o lanciare.',
        },
        { name: 'sessionStorage', message: 'Usa lib/storage.ts.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MetaProperty[meta.name='import'][property.name='meta']",
          message: 'Le costanti d’ambiente stanno in lib/config.ts.',
        },
      ],
    },
  },
  {
    // l'infrastruttura (lib) non dipende dalla UI
    files: ['apps/web/src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/pages/**', '**/components/**'],
              message: 'lib sta sotto la UI: non può importare pagine o componenti.',
            },
            { group: ['@ohana/worker', '**/apps/worker/**'], message: 'Il web non importa il worker.' },
          ],
        },
      ],
    },
  },
  {
    // infrastruttura di base del web: non dipende dagli strati che la usano
    files: [
      'apps/web/src/lib/supabase.ts',
      'apps/web/src/lib/outbox.ts',
      'apps/web/src/lib/storage.ts',
      'apps/web/src/lib/config.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/pages/**',
                '**/components/**',
                './data/*',
                './api/*',
                '**/lib/data/*',
                '**/lib/api/*',
              ],
              message: 'Questo modulo è infrastruttura: non importa i livelli sopra di sé.',
            },
          ],
        },
      ],
    },
  },
  {
    // worker: http → jobs → infrastruttura; mai al contrario
    files: ['apps/worker/src/jobs/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/http/*', '../http'], message: 'I job non conoscono HTTP.' },
            { group: ['@ohana/web', '**/apps/web/**'], message: 'Il worker non importa il web.' },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/worker/src/*.ts'],
    ignores: ['apps/worker/src/index.ts', 'apps/worker/src/scheduled.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./jobs/*', './http/*', '**/jobs/*', '**/http/*'],
              message: 'L’infrastruttura del worker non importa job o handler HTTP.',
            },
            { group: ['@ohana/web', '**/apps/web/**'], message: 'Il worker non importa il web.' },
          ],
        },
      ],
    },
  },
  {
    // i test descrivono scenari: possono essere lunghi e ripetitivi
    files: ['**/test/**', '**/e2e/**'],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off', complexity: 'off' },
  },
);
