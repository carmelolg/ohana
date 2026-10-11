# Ohana — Architettura e stack

## Obiettivo
PWA familiare per impegni, visite mediche, appuntamenti con professionisti, scadenze ricorrenti, lista spesa condivisa, rubrica e spese tra familiari. Organizzata in **spazi** personalizzabili (Casa mia, Mamma e papà, Lavoro, …); ogni persona vede solo gli spazi di cui è membro.

## Stack (costo: 0 €/mese)

| Livello | Scelta | Piano gratuito | Perché |
|---|---|---|---|
| Frontend | React + Vite + TypeScript, `vite-plugin-pwa` | — | PWA installabile, offline, veloce |
| Hosting FE | **Cloudflare Pages** | banda illimitata | nessun cold start, deploy da GitHub |
| DB + Auth + Storage + Realtime | **Supabase** | 500 MB DB, 1 GB storage, 50k utenti attivi | Postgres con Row Level Security: l'isolamento tra spazi è nel database |
| Job notifiche + feed calendario | **Cloudflare Workers** (Cron Trigger ogni 5 min) | 100k richieste/giorno | sempre attivo, nessuna sospensione |
| Email | **Resend** | 3.000/mese, 100/giorno | API semplice; alternativa Brevo (300/giorno) |
| Push | Web Push (VAPID) inviato dal Worker | gratis | funziona su Android, desktop, iOS 16.4+ (app installata) |
| Dominio (opzionale) | qualsiasi registrar | ~10 €/anno | serve a Resend per inviare da un tuo indirizzo |

**Sospensione Supabase:** i progetti gratuiti vengono messi in pausa dopo 7 giorni senza attività. Il Worker che ogni 5 minuti interroga il DB per i promemoria lo tiene attivo. Nessuna VPS necessaria.

**Backup:** GitHub Action settimanale con `pg_dump` verso un repository privato o Cloudflare R2 (10 GB gratis).

## Diagramma
```
[PWA su Cloudflare Pages] ──supabase-js──▶ [Supabase: Auth · Postgres+RLS · Realtime · Storage]
                                                     ▲
[Cloudflare Worker] ── cron 5' ──────────────────────┘
   ├─ calcola promemoria in scadenza → Resend (email) + Web Push
   ├─ GET /ics/:token.ics  → feed calendario per Google/Apple
   └─ GET /azione/:token   → "segna fatto" / "rimanda" dai link email
```

## Struttura del codice

Tre pacchetti, dipendenze sempre verso il basso (regole di dettaglio in [`CLAUDE.md`](CLAUDE.md)):

| Pacchetto | Responsabilità | Organizzazione |
|---|---|---|
| `packages/shared` | **Dominio puro**, senza I/O: parser dell'aggiunta rapida, ricorrenze, date Europe/Rome, saldi, faccende, categorie (Naive Bayes), lettura documenti | `parser.ts` (pipeline) + `parser/` (uno stadio per file), `recurrence.ts`, `balances.ts`, `dates.ts`, `text.ts`, `people.ts`… |
| `apps/worker` | Cron ogni 5' e HTTP pubblico (feed ICS, link «Segna fatto/Rimanda», fallback AI della scansione) | `index.ts` (entrata) → `scheduled.ts` → `jobs/*` (casi d'uso) · `http/*` (router + handler) · `db.ts`, `notify.ts`, `email.ts`, `push.ts`, `sign.ts` (infrastruttura) · `reminders.ts`, `digest.ts` (decisioni pure) |
| `apps/web` | PWA React: mostra, raccoglie input, scrive tramite la coda offline | `pages/` e `components/` (UI) → `pages/<schermata>/` (hook di schermata, comandi di scrittura, sezioni) → `lib/data/` (letture, scritture, realtime) e `lib/api/` (operazioni su Supabase) → `lib/supabase`, `lib/outbox`, `lib/storage` |

Flussi chiave:
- **Scrittura**: schermata → `useMutate` → aggiornamento ottimistico della cache + `outbox` (IndexedDB, idempotente, riprovata al ritorno della rete) → Supabase → evento realtime → invalidazione delle query (`TABLE_KEYS`).
- **Promemoria**: `enqueue` espande eventi × promemoria × destinatari in `reminder_queue` → `dispatch` prenota ogni riga con un update condizionale, invia email/push, ritenta fino a 5 volte.
- **Qualità**: `pnpm typecheck` (TypeScript rigoroso condiviso), `pnpm lint` (anche i confini tra livelli e le soglie di dimensione/complessità), `pnpm format:check` (Prettier), `pnpm test` (shared, worker con Supabase finto, web), `pnpm test:rls`, `pnpm test:e2e`; CI in `.github/workflows/ci.yml`.

## Modello dati (Postgres)
- `profiles` (id = auth.users.id, first_name, last_name, email, avatar_url, theme: light|dark|auto, accent, default_reminder_minutes = 1440, timezone = 'Europe/Rome')
- `spaces` (id, name, color, disabled_features, icon, created_by)
- `space_members` (space_id, user_id, role: owner|admin|member|viewer)
- `invites` (id, space_id, email, role, token, expires_at, accepted_at)
- `events` (id, space_id, title, `category_id` → `categories`, starts_at, ends_at, all_day, location, notes, assignee_id, contact_id, rrule, amount, status: open|done, created_by)
- `event_reminders` (event_id, offset_minutes, channels: email|push)
- `reminder_queue` (id, event_id, occurrence_at, send_at, user_id, channel, sent_at) — generata dal Worker per i prossimi 60 giorni, include le ricorrenze espanse
- `events.kind`: `appuntamento` | `faccenda`. Le faccende hanno `assignee_id` obbligatorio, nessun orario, promemoria predefinito solo push alle 8:00 (niente email), e se non completate passano al giorno dopo con l'etichetta "rinviata"
- `visit_notes` (event_id, author_id, text, created_at) + `follow_ups` (event_id, title, due_hint, created_event_id) — diario visite e prossimi passi
- `emergency_info` (space_id, contacts ordinati, address, intercom, allergies, notes) — cache offline sempre aggiornata
- `maintenances` (id, space_id, title, rrule, last_done_at, last_cost, contact_id, template_key) — genera eventi `scadenza`
- `events.linked_procedure_id` / `events.linked_maintenance_id` (0020) — impegno legato dall'utente a una pratica o a una manutenzione (al massimo uno; `on delete set null`, chiavi composte con lo spazio). Non sono `maintenance_id`, che resta la scadenza generata dalla manutenzione
- `calendar_imports` (id, space_id, user_id, name, `url`, last_synced_at, last_error) (0021) — calendario esterno collegato a uno spazio. L'indirizzo ICS è una credenziale: privilegi per colonna lo rendono scrivibile ma non leggibile dal client (le letture nominano le colonne, mai `select *`); lo legge solo il Worker. Non è nella pubblicazione realtime (`NOT_REALTIME`)
- `events.import_id` / `events.external_id` (0021) — impegno importato: `external_id` è l'UID del calendario d'origine (più l'istante, per le occorrenze di una ricorrenza), unico per calendario; scollegare il calendario li rimuove (`on delete cascade`)
- `maintenance_log` (id, space_id, maintenance_id, done_on, cost, contact_id, note, created_by) — ogni intervento eseguito di una manutenzione; alimenta la linea del tempo
- `board_notes` (id, space_id, author_id, text, pinned, expires_at)
- `procedures` (id, space_id, title, owner_id, due_date, status) · `procedure_steps` (procedure_id, position, title, done_at, event_id) · `procedure_docs` (procedure_id, name, attachment_id)
- `documents` (id, space_id, folder, attachment_id, doc_type, extracted_json, expires_at)
- `attachments` (event_id, path su Storage, name) — referti, ricevute
- `shopping_lists` (id, space_id, name) · `shopping_items` (list_id, text, qty, category, checked, checked_by, checked_at, added_by)
- `contacts` (id, space_id, name, role, phone, email, address, notes)
- `expenses` (id, space_id, payer_id, amount, description, date, event_id) · `expense_shares` (expense_id, user_id, amount) · `settlements` (space_id, from_id, to_id, amount, date)
- `push_subscriptions` (user_id, endpoint, keys, user_agent)
- `calendar_feeds` (user_id, space_id nullable, token)

**RLS:** ogni tabella con `space_id` è leggibile/scrivibile solo se `exists (select 1 from space_members where space_id = … and user_id = auth.uid())`; `viewer` solo lettura. Così un fratello invitato in «Mamma e papà» non vede mai «Casa mia».

## Funzioni chiave
- **Aggiunta rapida in italiano**: parser locale (oggi, domani, dopodomani, lunedì…, "il 12 novembre", "alle 15", "tra 3 giorni", "ogni mese", "ricordamelo 2 giorni prima", `@nome` per assegnare, `#spazio`). Mostra subito i campi riconosciuti, modificabili.
- **Voce**: Web Speech API (`it-IT`) con fallback alla dettatura della tastiera.
- **Ricorrenze**: RRULE (`rrule` npm) — bollette, bollo, revisione, terapie.
- **Calendario**: feed ICS in sola lettura per utente/spazio (Google aggiorna ogni 8-24 h, Apple configurabile). Sync bidirezionale fuori dallo scope v1.
- **Realtime**: lista spesa e Oggi si aggiornano live via Supabase Realtime; presenza ("Giulia è al supermercato").
- **Offline**: cache della shell + ultime 4 settimane di dati in IndexedDB; modifiche in coda e sincronizzate al ritorno online.

## Nuove funzioni (schermate 3a–3h)
- **Regola di leggerezza**: in Oggi compaiono solo la bacheca (1 nota visibile, le altre comprimibili), gli impegni e le faccende dell'utente. Pratiche, Manutenzioni, Documenti, Rubrica, Spese ed Emergenza vivono in **Altro**, ciascuna con lo stato riassunto sulla sua card. Tutto si crea dal "+" centrale.
- **Faccende**: impegni ricorrenti a bassa priorità, assegnati a una persona; in Oggi sono una lista compatta con casella, separata dagli appuntamenti; filtro "solo le mie / tutte".
- **Diario visite**: alla chiusura di una visita, nota libera, allegato referto, ticket → Spese, e "prossimi passi" trasformabili in impegni con un tap. Storico per medico.
- **Emergenza**: numeri e info chiave per spazio, precaricati nel service worker, raggiungibili da shortcut dell'icona app.
- **Manutenzioni**: modelli pronti (caldaia, gomme, filtri, revisione auto…), ultima esecuzione e prossima scadenza.
- **Pratiche**: passaggi ordinati, documenti richiesti, responsabile, barra avanzamento; un passaggio può essere un impegno in calendario.
- **Scansione**: foto → OCR con **Tesseract.js** nel browser (0 €) + parser di regole per importo, date, fornitore; opzionale fallback a un LLM con piano gratuito (es. Gemini Flash) tramite il Worker. L'utente conferma sempre i campi prima di salvare.

## Feature aggiuntive proposte
1. **Brief del mattino**: una sola email/push alle 7:30 con gli impegni del giorno, al posto di tante notifiche separate (opzionale).
2. **Checklist per impegno**: "portare tessera sanitaria, ECG precedente, a digiuno".
3. **Turni di accompagnamento**: per le visite dei genitori, chi è disponibile risponde "ci vado io" dalla notifica.
4. **Scheda salute genitori** (nello spazio): medici, farmaci, allergie, esenzioni, codice fiscale. Si consulta al volo in ospedale.
5. **Archivio documenti** con scadenza: carta d'identità, patente, tessera sanitaria, garanzie elettrodomestici; promemoria 60 giorni prima.
6. **Collegare spese a impegni**: il ticket della visita diventa una spesa da dividere con un tap.
7. **Storico interventi** per professionista: quando è venuto l'idraulico l'ultima volta e quanto è costato.
8. **Condivisione verso Ohana**: dal menu Condividi del telefono (SMS di conferma dell'ASL, email) si crea un impegno precompilato.


## Note di implementazione (v2)

Scelte e differenze rispetto al modello descritto sopra, emerse costruendo le nuove funzioni:

- **Categorie** — `events.category` (enum) è diventato `events.category_id` → `categories` (per spazio). Le 6 predefinite (`slug`: visita, professionista, burocrazia, commissione, scadenza, altro) sono create dal database con lo spazio e non si eliminano; ogni spazio può aggiungerne di sue, con parole chiave per l'aggiunta rapida. Le manutenzioni generano eventi della categoria con slug `scadenza`.
- **Faccende** — `events.kind` + vincolo `events_chore_shape` (assegnatario obbligatorio, `all_day`, `rrule`). Una faccenda tiene in `starts_at` l'occorrenza ancora da fare; «fatto» la sposta alla successiva e valorizza `events.last_done_at`. «Rinviata» e il conteggio «X di Y» si calcolano a video (`choresForToday` in `packages/shared`): nessun job notturno e nessun avviso in più. Il Worker non crea promemoria né email per le faccende; invia un solo push alle 8:00 a chi ha `profiles.notify_chores_push` (deduplicato in `digest_log`).
- **Allegati** — `attachments.event_id` è ora facoltativo e c'è `attachments.space_id` (riempito dal database con lo spazio dell'impegno): servono a Documenti e a Pratiche, che non hanno un impegno. Il percorso nello storage resta `<space_id>/…`.
- **Manutenzioni** — `events.maintenance_id` collega la scadenza alla manutenzione; «Segna fatta» chiude l'evento, aggiorna `last_done_at`/`last_cost` e crea la successiva con `nextMaintenanceDate` (regole come «ogni anno a novembre» valgono dal 1° del mese).
- **Linea del tempo condivisa** — la timeline dei filoni di Cura vale anche per Manutenzioni (caldaia, auto…) e Pratiche. `lib/timeline.ts` (funzioni pure, testate) trasforma i dati di ogni dominio in `TimelineRow` (`careRows`, `maintenanceRows`, `procedureRows`); `components/timeline/TimelineList.tsx` le mostra, in cima il programma e poi i fatti dal più recente. Le manutenzioni tengono solo l'ultima volta (`last_done_at`/`last_cost`), quindi «Segna fatta» scrive anche una riga in `maintenance_log` (migrazione 0019, con le esecuzioni già note copiate dalle manutenzioni esistenti); le pratiche non hanno bisogno di un registro, bastano `procedure_steps.done_at` e gli impegni collegati. Un passaggio aperto senza impegno in calendario non ha data e segue la posizione nell'iter. Lo storico si legge nel dettaglio della manutenzione e nella pratica; le funzioni `manutenzioni` e `pratiche` spente nascondono già le schermate.
- **Collegare un impegno** — nell'editor, una visita mostra la sezione Cura (filone), ogni altro impegno «Collega a» una pratica in corso o una manutenzione dello spazio (`eventSections`, `LinkSelect`). L'impegno collegato compare nella cronologia dell'oggetto: in programma se aperto, «Impegno svolto» quando è chiuso; il passaggio di una pratica con impegno in calendario non si ripete. «+ Impegno» dalla cronologia apre l'editor già collegato (`/nuovo?pratica=` o `?manutenzione=`). Le manutenzioni incorporano i loro eventi con `events!events_maintenance_fk`, perché con due chiavi verso `maintenances` l'incorporamento semplice è ambiguo.
- **Navigazione desktop** — la barra laterale elenca tutte le sezioni di Altro (Pratiche, Manutenzioni, Documenti, Rubrica, Spese, Emergenza, Impostazioni) perché la tab bar è nascosta da 1024 px; «Gestisci spazi» porta a Spazi e inviti.
- **Calendari: export** — il feed ICS (`/ics/:token.ics`) porta le ricorrenze con `DTSTART;TZID=Europe/Rome` e il blocco `VTIMEZONE` (con l'orario in UTC fisso «ogni lunedì alle 10» slitterebbe di un'ora a ogni cambio ora legale/solare); i giorni interi usano la data di Roma; gli impegni di Cura escono solo come «Impegno di cura», senza titolo, luogo, note né nome dello spazio; gli impegni importati non vengono riesportati (tornerebbero duplicati nel calendario d'origine). Google lo aggiorna ogni 8-24 ore; Apple si iscrive con la versione `webcal://` dello stesso link.
- **Calendari: import** — si incolla l'indirizzo ICS segreto del calendario (Google: «Integra calendario» › «Indirizzo segreto in formato iCal»; Apple: calendario pubblico), niente OAuth e quindi nessuna verifica dell'app presso Google. `normalizeIcsUrl` (`packages/shared`) accetta solo `https://`/`webcal://` di siti pubblici (niente IP, nomi interni, credenziali: a scaricare è un server). Il job `calendari` (a ogni giro di cron, cioè ogni 5 minuti per calendario) e `POST /calendar/sync` («Sincronizza ora», con l'accesso dell'utente) eseguono `syncImport`: `parseIcs` → `importedEvents` → `planSync` (tutte funzioni pure). Le ricorrenze sono **espanse in occorrenze** nella finestra da 30 giorni fa a 365 avanti, valutate sull'ora di Roma come gli impegni dell'app: così EXDATE, occorrenze spostate o annullate e cambio ora legale sono corretti senza cambiare il modello di `events`. L'occorrenza spostata riusa l'identificatore di quella che sostituisce. Fuori dalla finestra non si cancella nulla. Gli impegni importati sono in sola lettura nell'editor e non hanno promemoria. Il `last_error` è già un messaggio per l'utente; né l'indirizzo né i contenuti finiscono nei log.
- **Calendari: fuori scope** — sync bidirezionale (le modifiche fatte in Ohana non tornano su Google e viceversa), invio di impegni di Ohana verso Google tramite API, promemoria (VALARM) degli impegni importati, eventi su più giorni oltre il primo, calendari che richiedono un login (Google con OAuth) o CalDAV.
- **Bacheca** — `board_notes.notify_push` (scelta dell'autore) e `notified_at` (il Worker invia una sola volta, con un «claim» atomico).
- **Emergenza** — `emergency_info.contacts` è un array JSON ordinato; il 112 è sempre mostrato per primo dall'app. La pagina funziona offline con tre livelli: copia nel service worker (messaggio `emergency-cache` + NetworkFirst sulle richieste REST), istantanea in IndexedDB, cache delle query. Tutto viene cancellato all'uscita.
- **Scansione** — OCR con Tesseract.js, worker e lingua italiana serviti da `public/ocr` (copiati da `scripts/copy-ocr-assets.mjs`): nessuna CDN esterna e nessun documento lascia il dispositivo. I PDF vengono resi in immagine (prima pagina) con pdf.js caricato solo se serve. Il fallback AI (`POST /scan/parse` sul Worker, Gemini) è disattivato per default, richiede il consenso dell'utente in Impostazioni, riceve **solo il testo** letto dall'OCR e il suo output viene sanificato.
- **Leggerezza** — il bundle iniziale ha un budget (v1 + 30 KB gzip, `bundle-budget.json`, controllato da `pnpm build`); Tesseract, pdf.js, Leaflet e tutte le pagine secondarie sono lazy.
- **Apprendimento delle categorie** — `category_feedback (space_id, user_id, text, label, corrected)` raccoglie le correzioni/conferme; `label` è lo slug per le categorie predefinite e `id:<uuid>` per quelle personalizzate. Il modello (Naive Bayes multinomiale su parole e n-grammi di caratteri, `packages/shared/src/nb.ts`) si costruisce nel client dalle ultime 1000 righe dello spazio; le regole del parser restano la prima linea (`chooseCategory`).

## Funzioni opzionali per spazio
`spaces.disabled_features` elenca le funzioni spente (`spesa`, `spese`, `manutenzioni`, `pratiche`, `documenti`, `cura`; vuoto = tutte attive, quindi gli spazi esistenti non cambiano). Le chiavi sono in `packages/shared/src/features.ts` (`SPACE_FEATURES`, `featureOn`). Nella vista di un solo spazio contano le sue impostazioni; in «Tutti gli spazi» una funzione resta visibile se serve ad almeno uno. Il web la applica a barra laterale, tab bar, card di Altro, colonna destra, voci del «+» e rotte (`FeatureGate` riporta a Oggi). Si cambia in Spazio › Funzioni (proprietari e amministratori). I dati non si cancellano: riaccesa la funzione tornano.

## Cura (v3, schermate 4a–4i)

Per chi segue un familiare: persone assistite, filoni di cura, terapie con scorte, parametri, preparazione delle visite e riepilogo per il medico. Le specifiche sono in `ohana-pacchetto-claude-code/docs/spec-3-cura.md`; qui le scelte fatte costruendola.

### Modello dati (migrazioni 0015–0018)
- `care_recipients` (space_id, nome, `label` «Papà», nascita, codice fiscale, allergie `text[]`, esenzioni JSON, `caregiver_ids uuid[]`, `duty_user_id` = caregiver di turno; vuoto = il primo) — i caregiver sono membri dello spazio che possono scrivere (trigger di integrità); chi esce dallo spazio esce anche da qui. `user_id` (0018, facoltativo) lega la scheda a un membro di Ohana: uno per spazio, deve far parte dello spazio, e se esce la scheda resta ma si scollega.
- `care_threads` (filone: titolo, specialità, medico, `contact_id` in Rubrica, `color_hue`, stato attivo/chiuso, `tracked_params`).
- `care_entries` (tassello: `visita|esame|terapia|episodio|nota`, data, titolo, testo, `readings` JSON, `follow_ups` JSON, `event_id`, `medication_id`) e `care_files` (allegati sanitari).
- `medications` (posologia: `dose_units` × `schedule` di orari `HH:MM`; scorta `stock_units` valida da `stock_as_of`; confezione; prescrittore; chi fa la ricetta; piano terapeutico con scadenza) e `medication_doses` (una riga per dose segnata, unica per terapia/giorno/orario).
- `measurements` (parametri: frequenza, pressione `value`/`value2`, peso, scariche), `visit_prep` (id = id dell'impegno) con `visit_questions`, `care_audit` (chi ha visto o esportato un filone; lo legge solo chi amministra), `care_dose_log` (idempotenza dei promemoria, solo Worker).
- `events.care_thread_id` e `events.medication_id` collegano un impegno a un filone o a una terapia; ricette da chiedere, piani in scadenza e prossimi controlli sono **impegni normali** (compaiono in Oggi e nel calendario).
- Tutte le chiavi sono composte `(id, space_id)` / `(id, recipient_id)`: il database impedisce di mescolare spazi o persone.

### Ruolo `care_viewer`
`space_role` ha un quinto valore, `care_viewer`, per chi deve solo consultare la Cura (es. una badante). `is_member()` **non** lo include più: non vede impegni, spese, rubrica, spesa né bacheca. `is_care_member()` lo include ed è usata per lo spazio, i suoi membri e tutte le tabelle di Cura (sola lettura: scrive solo `can_write`). Il Worker lo esclude da promemoria, brief, riepilogo faccende, bacheca e feed ICS. In app, `featureOnForRoles` spegne per lui tutto tranne Cura.

### Regole e automatismi
- **Scorte**: il database scala `stock_units` a ogni dose segnata (trigger; risale se la dose si toglie). Le dosi non segnate si stimano dalla posologia a partire da `stock_as_of` (`estimateStock`, `packages/shared/src/care/stock.ts`); correggere la scorta o cambiare orari la «congela» a quell'istante. Sotto 7 giorni compare l'avviso con «Chiedi ricetta» (crea una commissione assegnata) e «Assegna a…».
- **Piano terapeutico**: salvando la scadenza si crea (o si sposta) un impegno nel giorno di scadenza con avviso 30 giorni prima (`syncPlanReminder`).
- **Chiusura visita (4c)**: sostituisce il diario 3d negli spazi con persone assistite. Crea il tassello, l'eventuale cambio di terapia (aggiorna la scheda del farmaco e aggiunge un tassello `terapia`), i prossimi passi come impegni e collega l'impegno al filone; il referto si può leggere con l'OCR sul dispositivo per precompilare i valori (`extractReadings`).
- **Prepara la visita (4f)**: «da quando l'ha visto» = tasselli del filone dall'ultima visita **più** quelli degli altri filoni nello stesso periodo (`sinceLastVisit`); il riepilogo 4i (`buildVisitSummary`) include le terapie di tutti i filoni. Il PDF è la pagina `/cura/:id/riepilogo`, stampata dal browser.
- **Promemoria delle dosi**: job `care-doses` (ogni 5 minuti), push al solo caregiver di turno, mai email; una notifica per persona e orario; prenotazione in `care_dose_log` rilasciata se nessun dispositivo l'ha ricevuta.
- **Leggerezza**: nessuna voce nuova nella tab bar. Cura è una card in Altro, una sezione nella barra laterale desktop, una riga in Oggi (solo per i caregiver e solo se resta qualcosa da fare) e «Registra per …» nel «+». Tutte le schermate sono lazy sotto `/cura`.
- **Privacy**: bucket privato `care` con URL firmati da 60 secondi, registro degli accessi, testo fisso «Ohana non dà indicazioni mediche», nessun controllo automatico delle interazioni tra farmaci (la domanda va posta al medico, vedi «Prepara la visita»).

