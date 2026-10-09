# Messa online

Tutto gira su piani gratuiti: Supabase (database, login), Cloudflare Pages (sito), Cloudflare Worker (promemoria). Ordine consigliato: 1 → 2 → 3 → 4 → 5 → 1.3 (il dominio serve ai passi 5 e 6).

## 1. Supabase

1. Crea un progetto su supabase.com (piano Free).
2. Collega la CLI e applica lo schema:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   Ogni migrazione nuova (`supabase/migrations/`) va applicata con lo stesso `db push`. La sezione Cura aggiunge `0015`–`0017`: vanno applicate **prima** di pubblicare l'app, altrimenti le schermate di Cura danno errori di colonna o tabella mancante.
3. **Authentication → URL Configuration**: *Site URL* = dominio dell'app (`https://ohanapp.org`); in *Redirect URLs* aggiungi `https://ohanapp.org/**` (e, finché serve, `https://ohana-1ia.pages.dev/**`).
4. **Email SMTP** (passo 3a).
5. Copia da **Project Settings → API**: *Project URL*, chiave `anon` (frontend) e `service_role` (solo Worker, mai nel frontend).

Il piano Free va in pausa dopo 7 giorni senza attività: il cron del Worker ogni 5 minuti lo tiene sveglio.

## 2. Chiavi VAPID (notifiche push)

```bash
npx web-push generate-vapid-keys
```

- Chiave **pubblica** → `VITE_VAPID_PUBLIC_KEY` (frontend) e `VAPID_PUBLIC_KEY` (Worker).
- Chiave **privata** → `VAPID_PRIVATE_KEY` (solo Worker).

## 3. Email

Le email partono da due punti: i **link di accesso** (Supabase Auth) e i **promemoria** (Worker). Configura entrambi.

### 3a. Link di accesso via Gmail SMTP (nessun codice)

1. Attiva la verifica in due passaggi sull'account Google.
2. Crea una «password per le app» su myaccount.google.com/apppasswords.
3. Supabase → *Authentication → SMTP Settings*: host `smtp.gmail.com`, porta `465`, utente e mittente = il tuo Gmail, password = password per le app.

### 3b. Promemoria via Gmail API (`MAIL_PROVIDER = "gmail"`)

1. [Google Cloud Console](https://console.cloud.google.com) → nuovo progetto → abilita **Gmail API**.
2. *Schermata consenso OAuth*: tipo *Esterno*, aggiungi il tuo Gmail come **utente di test**, scope `https://www.googleapis.com/auth/gmail.send`. Poi **pubblica l'app** («In produzione»): in modalità *Test* il refresh token scade dopo 7 giorni. Al consenso comparirà «app non verificata» → *Avanzate → Vai a…*.
3. *Credenziali → Crea credenziali → ID client OAuth* → tipo **App desktop**. Copia client id e secret.
4. Ottieni il refresh token:
   ```bash
   cd apps/worker
   GMAIL_CLIENT_ID=… GMAIL_CLIENT_SECRET=… node scripts/gmail-token.mjs
   ```
   Si apre il browser, accetti, il token compare nel terminale. Non incollarlo in chat né committarlo.
5. Salvalo nel Worker come segreto (passo 4).

Limiti: circa 500 email al giorno con un account personale. Se il token viene revocato, nei log del Worker compare `Gmail OAuth: invalid_grant`: ripeti il passo 4.

**Alternativa: Resend** (`MAIL_PROVIDER = "resend"`). Serve un dominio tuo con i record DNS SPF e DKIM. Free: 100 email/giorno, 3.000 al mese. Imposta `RESEND_API_KEY` come segreto e un `MAIL_FROM` di quel dominio.

## 4. Worker

```bash
cd apps/worker
npx wrangler login
# valori in wrangler.toml [vars]: APP_URL, WORKER_URL, MAIL_PROVIDER, MAIL_FROM, VAPID_SUBJECT, VAPID_PUBLIC_KEY
# segreti, uno alla volta (il prompt non lascia il valore nella history):
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put ACTION_SECRET          # openssl rand -hex 32
npx wrangler secret put GMAIL_CLIENT_ID        # oppure RESEND_API_KEY
npx wrangler secret put GMAIL_CLIENT_SECRET
npx wrangler secret put GMAIL_REFRESH_TOKEN
npx wrangler deploy                            # non `pnpm deploy`: è un comando interno di pnpm
```

Verifica: `curl https://<worker>/health` deve rispondere `ok`.

Il cron `*/5 * * * *` è in `wrangler.toml` e gestisce promemoria, brief del mattino, riepilogo faccende alle 8:00 e avvisi push della bacheca.

Controlla che nel repo non finisca nulla di sensibile: `npx wrangler secret list` mostra solo i nomi.

## 5. Frontend (Cloudflare Pages)

Si pubblica da terminale con lo script del passo 7; il collegamento Git del monorepo richiede più impostazioni in dashboard.

1. Crea `apps/web/.env.production` (ignorato da git) con valori **pubblici**, letti in fase di build:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<chiave anon>
   VITE_VAPID_PUBLIC_KEY=<chiave pubblica VAPID>
   VITE_WORKER_URL=https://<worker>.workers.dev
   ```
2. Crea il progetto una volta sola:
   ```bash
   npx wrangler pages project create ohana --production-branch main
   ```
3. Pubblica con lo script (passo 7).

Il routing della SPA è gestito da `apps/web/public/_redirects`.

Se preferisci il collegamento Git: *Workers & Pages → Create → Pages → Connect to Git*, build `pnpm install && pnpm --filter @ohana/web build`, output `apps/web/dist`, le stesse variabili `VITE_*` e `NODE_VERSION=20`.

Il progetto Pages è quello di nome `ohana` (sottodominio `ohana-1ia.pages.dev`, se `ohana.pages.dev` era già preso).

### Dominio personalizzato (`ohanapp.org`)
1. **Cloudflare → Workers & Pages → `ohana` → Custom domains → Set up a custom domain** → `ohanapp.org`. Se il dominio è registrato altrove, prima *Add a site* in Cloudflare e sposta i nameserver da quelli che indica. Certificato HTTPS e record DNS li crea Cloudflare.
2. Facoltativo, `www`: aggiungi anche `www.ohanapp.org` come dominio personalizzato e, sulla zona, una *Redirect Rule* da `www.ohanapp.org/*` a `https://ohanapp.org/${1}` (301).
3. Quando il dominio risulta *Active*: Supabase (passo 1.3: *Site URL* e *Redirect URLs*) e `APP_URL` in `apps/worker/wrangler.toml`, poi `pnpm run release:worker`. `APP_URL` costruisce i link nelle email e nelle notifiche, ed è l'unica origine ammessa dal Worker per le richieste dal browser (CORS).
4. Incolla di nuovo `supabase/templates/accesso.html` nei template Supabase (Magic Link e Confirm signup): il logo punta al nuovo dominio.
5. Le app già installate da `ohana-1ia.pages.dev` non si spostano: un dominio diverso è un'origine diversa. Vanno reinstallate dal nuovo indirizzo, con nuovo login e nuovo consenso alle notifiche.

Se il progetto Pages è collegato a GitHub, ogni `git push` crea una build automatica che non trova le variabili `VITE_*` e pubblica una pagina vuota, che copre il rilascio fatto con lo script. Disattivala: *Settings → Builds & deployments → Automatic deployments → Disabled*.

## 6. Backup settimanale (facoltativo)

La GitHub Action `.github/workflows/backup.yml` esegue `pg_dump` ogni domenica e conserva il dump 30 giorni come artifact. Secrets del repository:
- `SUPABASE_DB_URL`: stringa «Session pooler» da *Project Settings → Database*
- per Cloudflare R2: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`

Senza R2, rimuovi lo step «Carica su Cloudflare R2».

## 7. Rilasci successivi

`scripts/deploy.sh` pubblica Worker e frontend con un comando.

```bash
pnpm run release           # Worker + frontend
pnpm run release:web       # solo frontend
pnpm run release:worker    # solo Worker
bash scripts/deploy.sh all --skip-checks   # salta le verifiche
```

Usa `pnpm run release`: `pnpm deploy` è un comando interno di pnpm.

In ordine lo script:
1. esegue `typecheck`, `lint`, `format:check`, `test`; se una fallisce non pubblica nulla;
2. (Worker) `wrangler deploy` e controllo di `WORKER_URL/health`;
3. (Frontend) controlla che `apps/web/.env.production` abbia le quattro variabili `VITE_*` valorizzate, poi `pnpm build` e `wrangler pages deploy` sul progetto `ohana`, ramo `main`.

Requisiti: `npx wrangler login` fatto e segreti del Worker già salvati. Se la PWA mostra ancora la versione vecchia, chiudila e riaprila: il service worker si aggiorna al riavvio.

## 8. Accesso: link e codice via email

Il login invia un link e un **codice numerico** (6–10 cifre, a seconda di `otp_length`). Il codice serve nella PWA installata, dove il link si aprirebbe nel browser.

Perché il codice compaia nell'email, il template in *Authentication → Email Templates* deve contenere `{{ .Token }}`, sia in **Magic Link** sia in **Confirm signup**. Un template pronto, con logo, è in `supabase/templates/accesso.html`: copialo in entrambi.
