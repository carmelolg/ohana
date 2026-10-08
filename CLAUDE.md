# Ohana — regole di implementazione

PWA italiana per impegni, spesa, scadenze e spese di famiglia. Monorepo pnpm: `packages/shared` (dominio), `apps/web` (React + Vite), `apps/worker` (Cloudflare Worker), `supabase/` (SQL + RLS).
Per lo stack e il modello dati vedi `ARCHITETTURA.md`. Questo file dice **come scrivere il codice nuovo**: quando una regola qui sotto confligge con la comodità, vince la regola.

## Comandi

| Cosa | Comando |
|---|---|
| Tipi (tutti i pacchetti) | `pnpm typecheck` |
| Test unitari (shared + worker) | `pnpm test` |
| Lint (correttezza, architettura a livelli, graffe obbligatorie, soglie di manutenibilità: tutto è un errore) | `pnpm lint` |
| Formattazione (Prettier) | `pnpm format` per applicarla, `pnpm format:check` per verificarla |
| Isolamento RLS (Docker) | `pnpm test:rls` |
| End-to-end (Supabase locale attivo) | `pnpm test:e2e` |
| Build web (con budget del bundle) | `pnpm build` |

Prima di dire «fatto»: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`, più `pnpm test:e2e` se hai toccato una schermata.
`pnpm test` esegue shared, worker, web (moduli senza interfaccia) e la verifica che ogni tabella ascoltata in realtime sia pubblicata. Le soglie di lint (dimensione, complessità, profondità, parametri) e le regole di architettura sono **errori**, non avvisi: il codice non le supera, quindi si spezza (hook, sottocomponenti, comandi in `lib/api`), non si disattiva la regola. Le graffe sono obbligatorie su ogni `if`/`else`/`for`/`while` (`curly: all`).
Stile base in `.editorconfig` (2 spazi, LF, UTF-8); TypeScript rigoroso in `tsconfig.base.json` (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).

## Architettura a livelli

Le dipendenze vanno **sempre verso il basso**; mai il contrario.

```
apps/web                         apps/worker
  pages/ components/               http/      (router, handler: traducono HTTP ⇄ casi d'uso)
    ↓                                ↓
  hooks di schermata               jobs/      (casi d'uso del cron: enqueue, dispatch, brief…)
  (pages/<schermata>/use*.ts)        ↓
    ↓                              db.ts · notify.ts · email.ts · push.ts · sign.ts   (infrastruttura)
  lib/data/  lib/api/  (accesso a Supabase: letture, scritture, realtime)
    ↓
  lib/supabase · outbox · storage  (infrastruttura)

              packages/shared  ←  dominio puro, usato da entrambi
```

- **`packages/shared` è il dominio**: funzioni pure, nessun I/O, nessun `fetch`, nessun `Date.now()` implicito (passa `now`), nessuna dipendenza da React/Supabase/Cloudflare. Ogni regola di business (parser, ricorrenze, saldi, faccende, categorie) vive qui ed è coperta da test. Se una regola serve sia al web sia al worker, **va qui**, non copiata.
- **Le pagine non conoscono Supabase.** Niente `supabase.from(...)` o `supabase.storage` in `pages/` e `components/`: leggi con gli hook di `lib/data`, scrivi con `useMutate()` (coda offline + cache ottimistica) o con una funzione di `lib/api/`.
- **Il worker non contiene logica di dominio.** I job orchestrano (carica → decidi con una funzione di `shared` o di un modulo puro → invia → registra); le decisioni vivono in funzioni pure testabili (`reminders.ts`, `digest.ts`…).
- **Dipendenze passate come argomenti** (`env`, `db`, `mutate`, `now`), non importate come singleton nascosti. È ciò che rende testabile un caso d'uso senza rete.

## Principi, in pratica

**SRP.** Un file, un motivo per cambiare. Una funzione fa una cosa e il suo nome la dice.
- Obiettivo: funzione ≤ ~30 righe e ≤ 3 livelli di indentazione; il lint fallisce oltre 90 righe, complessità 14 (25 nei componenti), 6 parametri. Un parametro in più del limite = ti serve un oggetto con nome (`Delivery`, `EventToSave`).
- File > ~250 righe (il lint fallisce a 300) → probabilmente mescola responsabilità: separa.
- Un componente React **mostra**; lo stato e le regole di una schermata complessa stanno in un hook (`useEventForm`), la persistenza in una funzione pura-ish (`saveEvent(mutate, dati)`), le sezioni ripetute in componenti piccoli.
- Un hook di query fa **una** lettura. Un modulo `lib/api/<dominio>.ts` raccoglie le scritture di un dominio.

**DRY.** Prima di scrivere un helper, cerca se esiste (`grep`). Esistono già, e non vanno riscritti: `normalizeText`, `capitalize`, `isoDayRome`, `stripRrulePrefix`, `fullName`/`shortName`, `DAY_MS`/`HOUR_MS`/`MINUTE_MS` (`shared`); `useAuthedQuery`, `unwrap`, `readStorage`/`readJson`, `WORKER_URL`, `toDateInput`/`fromDateTimeInput` (`web`); `claimLog`, `deliverPush`, `pushToUser`, `escapeHtml`, `fetchAll` (`worker`). Due copie di una regola sono un bug in attesa: la terza è un errore di revisione. Niente numeri magici come `86400000`: usa le costanti.

**Pattern già in uso — riusali, non inventarne altri senza motivo:**
- *Pipeline di stadi* (`parser/`): ogni stadio legge/oscura una parte del testo; aggiungere un riconoscimento = aggiungere uno stadio, non un `if` in una funzione enorme.
- *Chain of Responsibility* (`DAY_RESOLVERS`, `ROUTES` del worker): lista ordinata di gestori, vince il primo che riconosce.
- *Strategy* (`sendEmail` → Gmail/Resend, `choreRules` per tipo di voce): scelta per configurazione, non per `if` sparsi.
- *Command + coda* (`outbox.ts`): ogni scrittura è un'operazione serializzabile, idempotente (id generato dal client, `upsert`), rieseguibile offline.
- *Idempotent claim* (`claimLog`, `reminder_queue.sent_at`): chi vuole inviare prima prenota la riga con un insert/update condizionale, poi invia; se l'invio fallisce rilascia.
- *Observer* (`useRealtimeSync` + `TABLE_KEYS`): una tabella che cambia invalida le query che la leggono. Una nuova tabella con letture va aggiunta a `TABLE_KEYS` **e** alla pubblicazione `supabase_realtime`.
- *Repository leggero* (`lib/api/*`, `lib/data/*`): nascondono tabelle e query dietro nomi di dominio.

**Clean code.**
- Nomi che dicono l'intento (`inSendWindow`, `removeStale`), non il come (`doStuff`, `handle2`). Booleani come domande (`isChore`, `canWrite`).
- Niente `any`, `as never`, `as unknown as T` per «far tacere» il compilatore: definisci il tipo della riga (`interface DueRow`) o usa un type guard. Un cast ammesso va accompagnato da un commento che spiega perché è sicuro (tipicamente: riga di PostgREST con relazione incorporata).
- Early return invece di `if/else` annidati. Niente flag booleani come parametri (`fn(true, false)`): usa oggetti con nome o due funzioni.
- Commenti in italiano che spiegano il **perché** (vincolo, caso limite, scelta); mai il cosa. Niente codice commentato, niente `TODO` senza motivo e data.
- Errori: mai `catch {}` vuoto senza commento che spiega perché è innocuo. Le funzioni di accesso ai dati **lanciano** (`unwrap`), la schermata decide cosa mostrare (toast, banner). Messaggi per l'utente in italiano, chiari, senza dettagli tecnici.
- Immutabilità: non modificare argomenti; `map/filter/reduce` e spread. Eccezione: stato locale di un algoritmo (parser), dichiarato nello stato dello stadio.

## Regole per area

### `packages/shared`
- Fuso orario: tutto in **Europe/Rome** tramite `romeParts` / `romeToDate` / `addDaysRome`. Mai `getHours()`/`toLocaleString()` del dispositivo, mai `new Date(y, m, d)`.
- Testo libero: confronta sempre con `normalizeText`. Le regole RRULE passano da `stripRrulePrefix` / `expandOccurrences`.
- Aggiungere un riconoscimento al parser: nuovo stadio in `parser/`, registrato in `PIPELINE` (`parser.ts`), con almeno un test in `test/parser.test.ts` o `test/kinds.test.ts`. Se cambi un comportamento esistente, dimostra con un confronto vecchio/nuovo su un corpus che non ci sono regressioni.
- Soldi in **centesimi interi** per ogni calcolo (`toCents`), mai somme di float.
- Esporta da `index.ts` solo ciò che serve fuori dal pacchetto.

### `apps/web`
- **Letture**: `useAuthedQuery(chiave, () => supabase.from(...)...)` dentro `lib/data/<dominio>.ts`. La chiave di query deve comparire in `TABLE_KEYS` per le tabelle che legge.
- **Scritture**: `const mutate = useMutate(); await mutate({ table, action, payload, match }, [aggiornamenti ottimistici])`. Gli insert usano `upsert` con `id = newId()` (idempotenti per la coda offline). Una scrittura che richiede la rete (storage, RPC) va in `lib/api/` o `lib/files.ts` e deve gestire l'offline con un messaggio chiaro.
- **Schermate grandi** (> ~150 righe o più di ~6 `useState`): cartella `pages/<schermata>/` con `use<Schermata>Form.ts` (stato + regole), `save<X>.ts` (caso d'uso di scrittura, testabile con un `mutate` finto), componenti di sezione, e la pagina che li compone. Modello: `EventEditor.tsx` + `event-editor/`.
- **Stato derivato non si duplica**: calcolalo nel render o con `useMemo`. Per «valore del parser oppure scelto a mano» usa lo schema `overrides` di `useEventForm` (valore presente = vince la scelta dell'utente).
- **Effetti**: ogni `useEffect` con sottoscrizioni restituisce la pulizia. Niente `// eslint-disable react-hooks/exhaustive-deps` se si risolve con `useMemo`/`useCallback`/ref; se davvero serve, motivalo nella riga.
- **Stili**: classi in `styles.css`, non `style={{…}}` ripetuti. L'inline resta ammesso solo per valori dinamici (`--space`, larghezze calcolate) o un uso isolato. Se lo stesso blocco di stile compare due volte, diventa una classe (`.inline-select` è l'esempio).
- **Accessibilità**: ogni controllo ha `aria-label` o `<label>`; target tocco ≥ 44 px; i pulsanti-icona hanno `aria-label`; i messaggi d'errore `role="alert"`. I selettori degli e2e si appoggiano a questi attributi: non cambiarli senza aggiornare i test.
- **Storage del browser**: solo via `lib/storage.ts` (può mancare o lanciare). Mai `localStorage` diretto.
- **Date nei campi**: `lib/date-input.ts`. Mai concatenare `padStart` a mano.
- **Bundle**: pagine secondarie e librerie pesanti (Tesseract, pdf.js, Leaflet) restano `lazy`; il budget è controllato da `pnpm build`.
- **Costanti d'ambiente**: `lib/config.ts`, non `import.meta.env` sparso.

### `apps/worker`
- Un job = un file in `jobs/`, con una funzione esportata `(env, now) => Promise<…>` registrata in `scheduled.ts`. Ogni job è indipendente: un fallimento non ferma gli altri.
- Invii **idempotenti e deduplicati**: `claimLog` / claim condizionale prima, invio dopo, rilascio se l'invio non è partito.
- Paginazione: ogni `select` che può superare 1000 righe passa da `fetchAll` (PostgREST tronca in silenzio).
- Tutto ciò che finisce in HTML passa da `escapeHtml` (anche titoli di impegni e nomi: li scrivono altri membri dello spazio). Le pagine di risposta si costruiscono con `messagePage` + `paragraph`.
- Nuove rotte: voce in `ROUTES` (`http/router.ts`) + handler in `http/` che riceve `(req, env, db, …)`; nessuna logica nel router.
- Segreti solo in `Env` (`env.ts`); mai nei log. L'input dell'utente e l'output di un LLM non sono mai fidati: validali (`sanitizeLlm`).
- Un file chiamato `html.ts` rompe `html.d.ts` (le dichiarazioni dei moduli `*.html`): non crearlo.

### `supabase/`
- Ogni tabella con `space_id` ha RLS: lettura ai membri, scrittura a `owner|admin|member`. Nuova tabella ⇒ policy **e** caso in `supabase/tests/isolation.sql`.
- Migrazioni numerate e immutabili: mai modificare una già applicata, ne crei una nuova.
- Nuova tabella che l'app ascolta ⇒ aggiungila alla pubblicazione `supabase_realtime` (vedi `NOT_REALTIME` per le eccezioni).

## Test

- Logica pura ⇒ test unitario in `packages/shared/test` o `apps/worker/test`, **scritto insieme al codice**. Un bug corretto ⇒ prima un test che lo riproduce.
- Un caso d'uso del worker o del web che scrive dati ⇒ testalo con dipendenze finte (un `mutate` che registra le chiamate, un `fetch` stubbato) senza rete.
- Una schermata nuova o un flusso utente ⇒ scenario in `apps/web/e2e`.
- Non indebolire un test per farlo passare; se un test cambia, spiega perché nel messaggio di commit.
- Strumenti già pronti: `fakeMutate()` (`apps/web/src/test-utils`) registra le scritture del web; `FakeDb` (`apps/worker/test/fake-db.ts`) è un Supabase in memoria per provare i job del Worker (`dispatch`, `enqueue`, brief…) senza rete. Gli stessi job hanno anche i test d'integrazione su Supabase locale (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
- Refactor di logica esistente (parser, ricorrenze, code di invio): prima di sostituire una funzione, confronta vecchio e nuovo su un corpus ampio di input e verifica che l'output sia identico; poi elimina il confronto.

## Sicurezza e privacy

- La `service_role` key vive **solo** nel Worker. Il frontend usa la `anon` key e si affida alla RLS.
- I link senza login (`/azione/:token`, `/ics/e/:token`) sono firmati HMAC con scadenza; le azioni distruttive richiedono POST (il GET mostra solo la conferma).
- I dati sensibili (emergenza, documenti) non restano sul dispositivo dopo il logout (`clearSnapshot`).
- La scansione dei documenti avviene sul dispositivo; verso il Worker parte **solo testo**, e solo con il consenso esplicito dell'utente.

## Revisione: checklist rapida

1. Il codice sta nel livello giusto (nessun `supabase` in una pagina, nessun I/O in `shared`)?
2. Esiste già un helper per questo? Ho duplicato una regola?
3. Ogni funzione ha una sola ragione per cambiare e sta in ~30 righe?
4. Niente `any`/cast forzati/`catch` muti; gli errori arrivano all'utente in italiano?
5. Fuso Europe/Rome, soldi in centesimi, testo con `normalizeText`?
6. Ho scritto/aggiornato i test? `typecheck`, `lint`, `test` verdi?
7. Accessibilità: label, target ≥ 44 px, nessun selettore e2e rotto?

## Ricette

**Nuova schermata** — pagina in `pages/<Nome>.tsx` (compone), logica di stato in `pages/<nome>/use<Nome>.ts`, scritture in `pages/<nome>/<nome>Commands.ts` (funzioni `(mutate, …)`), sezioni in componenti piccoli; letture in `lib/data/<dominio>.ts`; route in `App.tsx` (lazy); test del modulo dei comandi; scenario e2e.

**Nuova tabella** — migrazione SQL numerata + RLS + caso in `supabase/tests/isolation.sql` + `supabase_realtime` → tipo in `lib/types.ts` → voce in `TABLE_KEYS` (`lib/data/invalidation.ts`) → hook di lettura in `lib/data/` → scritture via `useMutate`. Aggiorna `ARCHITETTURA.md`.

**Nuovo job del Worker** — `jobs/<nome>.ts` con `(env, now)`, decisioni in una funzione pura con test, registrazione in `scheduled.ts`, test con `FakeDb`.

**Nuovo riconoscimento nell'aggiunta rapida** — stadio in `parser/` (o regola in `KIND_RULES` / risolutore in `DAY_RESOLVERS`), registrato in `PIPELINE`, test + confronto con il vecchio comportamento.

**Nuovo campo nell'editor impegno** — valore e priorità (scelto a mano ▸ capito dal testo ▸ predefinito) in `eventValues.ts`, stato in `useEventForm`, scrittura in `saveEvent.ts`, campo in `EventFields.tsx`; test di `resolveEventValues` e `saveEvent`.
