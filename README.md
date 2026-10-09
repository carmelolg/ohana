# Ohana

PWA in italiano per la famiglia: impegni, faccende, scadenze, spesa condivisa, rubrica, spese tra familiari e **Cura** (persone assistite, terapie, visite). Costo di esercizio: 0 €.

Stack: React + Vite + TypeScript (PWA) su **Cloudflare Pages**, **Supabase** (login, Postgres con RLS, realtime, storage), **Cloudflare Worker** con cron (promemoria, feed calendario, azioni da email), email via Gmail API o Resend, notifiche push VAPID.

```
apps/web         PWA (React)
apps/worker      Cloudflare Worker: cron, HTTP, invii
packages/shared  dominio puro: parser italiano, date Europe/Rome, ricorrenze, saldi
supabase/        migrazioni SQL, RLS, test di isolamento
docs/            messa online, funzioni e dettagli
```

Regole di codice e architettura: [`CLAUDE.md`](CLAUDE.md). Architettura: [`ARCHITETTURA.md`](ARCHITETTURA.md).

## Avvio in locale

Servono Node 20+, pnpm (`corepack enable pnpm`) e Docker.

```bash
pnpm install
npx supabase start                 # Postgres, login, realtime; le email finiscono in http://127.0.0.1:54324 (Mailpit)
cp apps/web/.env.example apps/web/.env.local
# in .env.local incolla VITE_SUPABASE_ANON_KEY (output di `npx supabase status`)
pnpm dev                           # http://localhost:5173
```

Per entrare: inserisci la tua email, apri Mailpit e clicca il link (o copia il codice). Il primo accesso crea il tuo spazio.

Dati di esempio per la sezione Cura (facoltativo, solo in locale): `SUPABASE_SERVICE_ROLE_KEY=… node apps/web/scripts/seed-cura.mjs la-tua@email.it` (la chiave è nell'output di `npx supabase status`). Crea lo spazio «Mamma e papà» con due persone assistite, filoni, terapie e visite; poi accedi con quell'email da Mailpit.

Worker in locale (facoltativo): `cp apps/worker/.dev.vars.example apps/worker/.dev.vars`, compila i valori, poi `cd apps/worker && pnpm dev`. Per simulare il cron: `curl "http://localhost:8787/__scheduled"`.

## Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` | sviluppo web |
| `pnpm typecheck` · `pnpm lint` | TypeScript e ESLint (anche le regole di architettura) |
| `pnpm format` · `pnpm format:check` | Prettier |
| `pnpm test` | test unitari di shared, worker e web |
| `pnpm test:rls` | isolamento RLS su Postgres in Docker |
| `pnpm test:e2e` | scenari Playwright con Supabase locale attivo |
| `pnpm build` | build del frontend con controllo del bundle |

Prima di dire «fatto»: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`, più `pnpm test:e2e` se hai toccato una schermata.

## Messa online

Il passo per passo è in [`docs/messa-online.md`](docs/messa-online.md): Supabase, chiavi VAPID, email, Worker, frontend.

Rilascio dopo la prima messa online:

```bash
pnpm run release           # Worker + frontend, dopo le verifiche
```

Funzioni, categorie e apprendimento automatico sono descritti in [`docs/funzioni.md`](docs/funzioni.md).
