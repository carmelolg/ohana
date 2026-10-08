# Ohana

PWA in italiano per gestire impegni familiari, visite mediche, scadenze ricorrenti, lista spesa condivisa, rubrica e spese tra familiari. Costo di esercizio: 0 €.

Stack: React 18 + Vite + TypeScript (PWA) su **Cloudflare Pages** · **Supabase** (Auth, Postgres con RLS, Realtime, Storage) · **Cloudflare Worker** con Cron (promemoria, feed ICS, azioni da email) · **Gmail API o Resend** (email) · Web Push VAPID. Dettagli in [`ARCHITETTURA.md`](ARCHITETTURA.md); il riferimento visivo (`Ohana Design.dc.html`) e il prompt originale restano in `../Gestore impegni familiare/`.

```
apps/web        PWA (React): pagine → hook di schermata → livello dati
apps/worker     Cloudflare Worker: job del cron (jobs/), HTTP (http/), infrastruttura
packages/shared dominio puro: parser in italiano, date Europe/Rome, ricorrenze, saldi
supabase/       migrazioni SQL, policy RLS, test di isolamento
```

## Sviluppo in locale

Servono Node 20+, pnpm (`corepack enable pnpm`) e Docker.

```bash
pnpm install
npx supabase start                       # Postgres, Auth, Realtime, Storage, Mailpit (le email arrivano su http://127.0.0.1:54324)
cp apps/web/.env.example apps/web/.env.local
# incolla in .env.local VITE_SUPABASE_ANON_KEY: la trovi nell'output di `npx supabase status`
pnpm dev                                 # http://localhost:5173
```

L'accesso avviene con il link magico: apri Mailpit, clicca il link ricevuto. Al primo accesso l'onboarding crea il tuo primo spazio. Per provare gli inviti usa un secondo browser/profilo con un'altra email.

Worker in locale (opzionale): `cp apps/worker/.dev.vars.example apps/worker/.dev.vars`, compila i valori, poi `cd apps/worker && pnpm dev` e, per simulare il cron, `curl "http://localhost:8787/__scheduled"`.

### Test

| Comando | Cosa verifica |
|---|---|
| `pnpm lint` · `pnpm typecheck` | ESLint e TypeScript rigoroso su tutti i pacchetti. ESLint fa rispettare anche l'architettura a livelli (il dominio in `packages/shared` non importa React né Supabase; pagine e componenti non toccano Supabase né `localStorage`; `lib` non importa dalle pagine), le graffe obbligatorie e le soglie di manutenibilità (funzione ≤ 90 righe, complessità ≤ 14, file ≤ 300 righe). Regole di stile e architettura in [`CLAUDE.md`](CLAUDE.md). |
| `pnpm format` · `pnpm format:check` | Prettier (110 colonne, apici singoli): applica o verifica la formattazione di tutto il repository. |
| `pnpm test` | Vitest (shared, worker, web): comandi di scrittura del web con `mutate` finto, job del Worker (`dispatch`, `enqueue`, brief…) su un database in memoria, parser italiano (tipi: faccenda, manutenzione, pratica, nota), faccende rinviate, prossima manutenzione, lettura documenti con 12 testi di bollette/referti/ricette/multe/avvisi, saldi e semplificazione debiti, ricorrenze (ora legale), coda promemoria, ICS, token firmati. Con `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (e `SUPABASE_ANON_KEY` per il fallback AI) impostati esegue anche l'integrazione del Worker sul Supabase locale: usa un database locale di prova, perché invia/«consuma» i promemoria in coda. |
| `pnpm test:rls` | Postgres 15 usa-e-getta in Docker: applica le migrazioni ed esegue 149 controlli di isolamento RLS (`supabase/tests/isolation.sql`). |
| `pnpm test:e2e` | Playwright con Supabase locale attivo. Progetti `chromium` (mobile) e `desktop` sul server di sviluppo: login, aggiunta rapida, isolamento tra spazi, spesa in tempo reale, categorie, mappa, navigazione, **faccende dal «+», bacheca, manutenzioni, pratiche, diario visite, scansione con OCR reale su un'immagine di esempio**. Progetto `prod` sulla build di produzione (la costruisce da solo): **pagina Emergenza aperta senza rete**. `npx playwright test --project=live` con `PHOTON_LIVE=1` controlla i servizi di indirizzi reali. |

## Messa online (tutto gratuito)

### 1. Supabase
1. Crea un progetto su supabase.com (piano Free).
2. Collega la CLI e applica lo schema: `npx supabase link --project-ref <ref>` poi `npx supabase db push`.
3. **Authentication → URL Configuration**: *Site URL* = il dominio di Pages; aggiungi lo stesso dominio (e `https://<dominio>/**`) in *Redirect URLs*.
4. **Google (opzionale)**: crea credenziali OAuth su Google Cloud Console, redirect `https://<ref>.supabase.co/auth/v1/callback`, poi inserisci client id/secret in *Authentication → Providers → Google*.
5. **SMTP**: il servizio email integrato è limitato; in *Authentication → SMTP* usa Resend (host `smtp.resend.com`, utente `resend`, password = API key) così i link magici partono dal tuo dominio.
6. Copia da *Project Settings → API*: URL, `anon` key, `service_role` key (quest'ultima solo per il Worker, mai nel frontend).

Il progetto Free va in pausa dopo 7 giorni senza attività: il cron del Worker ogni 5 minuti lo tiene sveglio.

### 2. Chiavi VAPID (push)
```bash
npx web-push generate-vapid-keys
```
Chiave pubblica → `VITE_VAPID_PUBLIC_KEY` (frontend) e `VAPID_PUBLIC_KEY` (Worker); privata → `VAPID_PRIVATE_KEY` (solo Worker).

### 3. Email: Gmail personale (consigliato per iniziare) oppure Resend

Le email partono da due punti: i **link di accesso** (Supabase Auth) e i **promemoria** (Worker). Vanno configurati entrambi.

**3a. Link di accesso via SMTP di Gmail** (nessun codice)
1. Attiva la verifica in due passaggi sull'account Google e crea una «password per le app» su myaccount.google.com/apppasswords.
2. Supabase → *Authentication → SMTP Settings*: host `smtp.gmail.com`, porta `465`, utente = il tuo Gmail, password = password per le app, mittente = il tuo Gmail.

**3b. Promemoria via Gmail API** (`MAIL_PROVIDER = "gmail"` in `wrangler.toml`)
1. [Google Cloud Console](https://console.cloud.google.com) → nuovo progetto → *API e servizi → Libreria* → abilita **Gmail API**.
2. *Schermata consenso OAuth*: tipo *Esterno*, aggiungi il tuo Gmail come utente di test, aggiungi lo scope `.../auth/gmail.send`. Poi **pubblica l'app («In produzione»)**: in modalità *Testing* il refresh token scade dopo 7 giorni. Per l'uso personale non serve la verifica Google; al consenso vedrai l'avviso «app non verificata» → *Avanzate → Vai a…*.
3. *Credenziali → Crea credenziali → ID client OAuth* → tipo **App desktop**. Copia client id e secret.
4. Ottieni il refresh token (si apre il browser, accetti, il token compare nel terminale):
   ```bash
   cd apps/worker
   GMAIL_CLIENT_ID=… GMAIL_CLIENT_SECRET=… node scripts/gmail-token.mjs
   ```
5. Salva i tre segreti nel Worker:
   ```bash
   npx wrangler secret put GMAIL_CLIENT_ID
   npx wrangler secret put GMAIL_CLIENT_SECRET
   npx wrangler secret put GMAIL_REFRESH_TOKEN
   ```
6. In `wrangler.toml` imposta `MAIL_FROM = "Ohana <tuonome@gmail.com>"` (Gmail usa sempre il tuo indirizzo come mittente).

Limiti: circa 500 email al giorno per un account personale. Se il refresh token viene revocato o scade, nei log del Worker compare `Gmail OAuth: invalid_grant`: rigenera il token al passo 4.

**Alternativa: Resend** (`MAIL_PROVIDER = "resend"`). Crea un account su resend.com, aggiungi il tuo dominio e inserisci i record DNS (SPF, DKIM); crea una API key (`wrangler secret put RESEND_API_KEY`) e usa un `MAIL_FROM` di quel dominio. Free: 100 email/giorno, 3.000/mese. Può servire anche come SMTP per Supabase Auth (host `smtp.resend.com`, utente `resend`, password = API key).

### 4. Worker
```bash
cd apps/worker
# modifica le [vars] in wrangler.toml (APP_URL, WORKER_URL, MAIL_PROVIDER, MAIL_FROM, VAPID_SUBJECT)
npx wrangler login
for s in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY ACTION_SECRET; do npx wrangler secret put $s; done
# + i segreti email del passo 3 (GMAIL_* oppure RESEND_API_KEY)
npx wrangler deploy   # non `pnpm deploy`: è un comando interno di pnpm e non esegue lo script
```
`ACTION_SECRET` è una stringa lunga e casuale che firma i link «Segna fatto / Rimanda» (`openssl rand -hex 32`). Il cron `*/5 * * * *` è già in `wrangler.toml` (promemoria, brief del mattino, riepilogo faccende alle 8:00, avvisi push delle note in bacheca). Verifica con `curl https://<worker>/health`.

### 5. Cloudflare Pages
Il collegamento Git del monorepo richiede più impostazioni in dashboard; è più semplice pubblicare da terminale.
1. Crea `apps/web/.env.production` (ignorato da git) con valori **pubblici**, letti in fase di build:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<chiave anon>
   VITE_VAPID_PUBLIC_KEY=<chiave pubblica VAPID>
   VITE_WORKER_URL=https://<worker>.workers.dev
   ```
2. Crea il progetto una volta sola: `npx wrangler pages project create ohana --production-branch main`.
3. Pubblica con lo script del passo 7. `apps/web/public/_redirects` gestisce il routing della SPA.
4. Se preferisci il collegamento Git: *Workers & Pages → Create → Pages → Connect to Git*, build `pnpm install && pnpm --filter @ohana/web build`, output `apps/web/dist`, le stesse variabili `VITE_*` e `NODE_VERSION=20`.

### 6. Backup settimanale
La GitHub Action `.github/workflows/backup.yml` esegue `pg_dump` ogni domenica. Secrets del repository: `SUPABASE_DB_URL` (stringa «Session pooler» da *Project Settings → Database*) e, per Cloudflare R2, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`. Il dump viene anche conservato 30 giorni come artifact. Se non usi R2, rimuovi lo step «Carica su Cloudflare R2».

### 7. Rilasci successivi: script di deploy
`scripts/deploy.sh` pubblica Worker e frontend con un comando, dopo le stesse verifiche richieste prima di dire «fatto».

```bash
pnpm run release           # Worker + frontend
pnpm run release:web       # solo frontend
pnpm run release:worker    # solo Worker
bash scripts/deploy.sh all --skip-checks   # salta le verifiche
```
Usa `pnpm run release`: `pnpm deploy` è un comando interno di pnpm.

Cosa fa, in ordine:
1. **Verifiche**: `typecheck`, `lint`, `format:check`, `test`. Se una fallisce, non pubblica nulla.
2. **Worker**: `wrangler deploy`, poi controlla `WORKER_URL/health` (letto da `wrangler.toml`) e fallisce se non risponde.
3. **Frontend**: controlla che `apps/web/.env.production` abbia le quattro variabili `VITE_*` valorizzate (niente segnaposto), costruisce con `pnpm build` e pubblica con `wrangler pages deploy` sul progetto `ohana`, ramo `main`.

Requisiti: `npx wrangler login` già fatto e segreti del Worker già salvati (passo 4). I segreti restano in Cloudflare e non vengono toccati dallo script; nel repo non finisce nulla di sensibile.

Se la PWA installata mostra ancora la versione vecchia dopo un rilascio, chiudila e riaprila: il service worker si aggiorna al riavvio.

### 8. Accesso: link ed email di Supabase
Il login manda un link e un codice numerico (6–10 cifre, a seconda di `otp_length`). Il codice serve nella PWA installata, dove il link si aprirebbe nel browser. Perché arrivi nell'email, il template in *Authentication → Email Templates* (**Magic Link** e **Confirm signup**) deve contenere `{{ .Token }}`. Un template pronto, con logo, è in `supabase/templates/accesso.html`: copialo nei due template. In *URL Configuration* imposta *Site URL* e *Redirect URLs* sul dominio di Pages.

## Funzioni v2

Riferimento visivo: `ohana-v2-nuove-funzioni/Ohana Nuove Funzioni.dc.html` (schermate 3a–3h).

| Funzione | Dove | Note |
|---|---|---|
| Menu «+» | tab centrale · pulsante *Nuovo* · tasto `N` | un solo punto d'ingresso: Impegno, Faccenda, Scansiona documento, Pratica, Nota in bacheca. Il testo libero (anche a voce) riconosce il tipo: «caldaia ogni anno a novembre» → manutenzione, «plastica ogni giovedì @Francesca» → faccenda, «nota: …» → bacheca, «ISEE mamma» → pratica |
| Faccende e bacheca | Oggi | una sola nota fissata in cima (le altre con «+N note»); blocco *Faccende* con filtro «solo le tue / tutte»; le non fatte passano a oggi come «rinviata» |
| Altro | tab Altro | griglia di card con lo stato: Pratiche, Manutenzioni, Rubrica, Spese, Documenti, Emergenza; sotto Profilo e impostazioni, Spazi e inviti |
| Pratiche | Altro → Pratiche | modelli ISEE, 730, carta d'identità, patente, invalidità, residenza; passaggi, documenti richiesti (chip), avanzamento, passaggio collegabile a un impegno |
| Manutenzioni | Altro → Manutenzioni | modelli caldaia, gomme, filtri, revisione auto, estintore, grondaie, decalcificazione, canna fumaria; ultima volta, prossima scadenza |
| Diario visite | impegno di categoria *Visita* segnato fatto | «Com'è andata», referto, ticket → Spese, prossimi passi → impegno/promemoria, storico con il medico |
| Emergenza | Altro → Emergenza · shortcut `/emergenza` dell'icona app | 112 sempre primo; funziona senza rete |
| Documenti e scansione | «+» → Scansiona documento · Altro → Documenti | foto o PDF → OCR sul dispositivo → campi da confermare → scadenza, allegato, spesa divisa |

Per l'OCR la prima scansione scarica il motore (circa 6 MB, servito da `/ocr`) e poi resta sul dispositivo. Il fallback AI è opzionale: imposta `GEMINI_API_KEY` nel Worker (`wrangler secret put GEMINI_API_KEY`) e ogni utente deve attivarlo in *Impostazioni → Scansione documenti*; viene inviato solo il testo letto, mai la foto.

## Apprendimento delle categorie (Naive Bayes)

Quando scrivi un impegno, la categoria viene proposta in due passi: prima le **regole** del parser (parole chiave, precise sui casi chiari), poi un **Naive Bayes** per spazio che ha imparato dalle tue scelte. Funziona nel browser, senza AI esterne e senza inviare il testo a nessuno.

- **Come impara:** ogni volta che salvi un impegno, se hai cambiato la categoria proposta (correzione) o ne hai confermata una riconosciuta (conferma), il titolo e la categoria finale finiscono in `category_feedback` (con RLS, visibile ai membri dello spazio). Il modello si ricostruisce da lì in pochi millisecondi: esempi di partenza + correzioni (peso 4) + conferme (peso 2). Anche cambiare la categoria di un impegno esistente conta come correzione.
- **Quando interviene:** le parole chiave che hai dato alle tue categorie vincono sempre; se le regole non riconoscono nulla e il modello è abbastanza sicuro, riempie lui; se l'uso ti ha insegnato altro rispetto alle regole (probabilità ≥ 80%, almeno 3 esempi), scavalca le regole. Quando succede l'editor lo dice («Suggerita da ciò che hai scelto in passato · 82%») e la tua scelta manuale prevale sempre.
- **Dove sta il codice:** `packages/shared/src/nb.ts` (modello: parole + n-grammi di caratteri, addestramento incrementale, nessuna dipendenza), `categorize.ts` (esempi di partenza e scelta regole/modello), `apps/web/src/lib/categoryModel.ts` (lettura delle correzioni).
- **Azzerare:** *Impostazioni spazio → Categorie degli impegni → Azzera apprendimento* (owner e admin).
- **Misura:** `pnpm --filter @ohana/shared eval:category` stampa la curva di apprendimento su un dataset **sintetico** (157 esempi di una famiglia immaginaria, scritti da me: dati indicativi, non reali). Risultato: categoria corretta su esempi mai visti, solo regole 44,9% → regole + NB 55,3% con zero correzioni (grazie agli esempi di partenza), 62,2% con 20, 72,3% con 80. I parametri (soglie, pesi) sono stati scelti con una ricerca a griglia su suddivisioni diverse da quelle usate per verificare.
- **Limiti:** serve qualche correzione per vedere un effetto; nomi propri molto ambigui («Giorgio») restano difficili; con poche famiglie o pochi dati le regole restano più affidabili, per questo il modello le affianca e non le sostituisce.

## Come funziona (in breve)

- **Funzioni per spazio**: *Impostazioni spazio → Funzioni* spegne ciò che lì non serve (Spesa, Spese, Manutenzioni, Pratiche, Documenti): sparisce da menu, Altro, «+» e indirizzi; i dati restano. Utile, per esempio, nello spazio dei genitori da assistere, dove la lista della spesa non serve. In «Tutti gli spazi» una funzione si vede se serve ad almeno uno spazio.
- **Categorie**: ogni spazio ha le 6 categorie predefinite più quelle che crei tu (*Impostazioni spazio → Categorie degli impegni*, oppure «＋ Nuova categoria…» nell'editor). Ogni categoria ha delle parole chiave che l'aggiunta rapida usa per riconoscerla («veterinario» → *Animali*). Una categoria creata per errore si elimina dall'editor («Elimina categoria…» sotto il menu) o dalle impostazioni dello spazio; i suoi impegni passano ad *Altro*. Le sei predefinite si possono solo rinominare.
- **Luogo e mappa** (stile sito di mappe): «Scegli luogo sulla mappa» apre una mappa a tutto schermo con il segnaposto al centro. Trascini la mappa e l'indirizzo si aggiorna (geocodifica inversa); oppure cerchi e i suggerimenti sono **vicini al punto che stai guardando** (area attorno al centro mappa, ordinati per distanza, poi i risultati più lontani) o alla tua posizione se consenti la geolocalizzazione. Si salvano testo e coordinate; poi mappa, «Indicazioni» e «Apri in OpenStreetMap». Servizi: [Photon](https://photon.komoot.io) (dati OSM; non accetta `lang=it`) e tile di openstreetmap.org. Per molti utenti serve un servizio proprio o con chiave: vedi le [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/). Offline resta il testo. Il controllo contro il servizio reale è opt-in: `PHOTON_LIVE=1 pnpm test:e2e photon-live`.
- **Soprannome**: in *Impostazioni* puoi impostarlo; gli altri membri, le email e i promemoria mostrano quello invece di «Nome Cognome». Resta comunque salvato nel tuo profilo, visibile via API ai membri dei tuoi spazi.

- **Isolamento**: ogni tabella ha RLS; chi è invitato in uno spazio vede solo quello. Le policy e i test sono in `supabase/`.
- **Aggiunta rapida**: `parseQuick` (in `packages/shared`) riconosce `#spazio`, `@nome`, «domani alle 15», «il 12 novembre», «tra 3 giorni», «ogni mese», «ricordamelo 2 giorni prima».
- **Promemoria**: il Worker espande le ricorrenze (RRULE, ora di Roma) per 60 giorni in `reminder_queue`, invia quelli scaduti con un «claim» atomico (`sent_at`) e quindi senza doppi invii, e ritira dalla coda quelli non più validi.
- **Ricorrenti**: «Fatto» su un impegno ricorrente sposta l'impegno alla prossima occorrenza; «Rimanda» vale solo per gli impegni singoli.
- **Offline**: shell in precache, cache delle query in IndexedDB (ultime 4 settimane di impegni, più 62 giorni avanti), modifiche in coda (`apps/web/src/lib/outbox.ts`) e inviate al ritorno online. Gli upload di allegati richiedono la rete.
- **iOS**: le push funzionano solo con l'app aggiunta alla Home (iOS 16.4+); l'app lo spiega in *Impostazioni*.
- Nel feed ICS (Google/Apple Calendar) gli aggiornamenti arrivano ogni 8-24 ore; la sincronizzazione bidirezionale non è inclusa.
