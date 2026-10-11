# Refactor UX/UI «Aree» — mappatura (fase 0)

Fonte: `design_handoff_ohana_ux/` (direzione 1a). Stato: **piano, nessun codice toccato**.

## Differenze di base tra design e repo

| Tema                         | Repo oggi                                                         | Design                                                                 | Azione                                                                 |
| ---------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Font                         | Instrument Sans (`index.html`, `--font`)                          | Figtree 400–800                                                        | cambia font + preload                                                  |
| Accento                      | `--accent-h: 42`, `oklch(.6 .13 h)`; 5 accenti scelti dall'utente | terracotta `oklch(.56 .15 38)`                                         | il token resta parametrico; default → h38 e croma/chiarezza del design |
| Palette                      | `--bg #f6f2eb`, `--surface #fffdf9`, `--text #26211c`             | `#FBF9F6` / `#F6F3EE` sidebar / `#fff` card / inchiostro `#1E1B17`     | allineare, tema scuro mantenuto                                        |
| Navigazione mobile           | Oggi · Calendario · + · scorciatoia (Spesa…) · Altro              | Oggi · Agenda · + · Casa · Famiglia                                    | nuova TabBar                                                           |
| Navigazione desktop          | sidebar piatta con 11 link + persone + spazi; RightColumn         | sidebar con 4 aree e sottovoci, ricerca in testata, colonna «Prossimo» | nuova Sidebar                                                          |
| Hub «Altro» (`More.tsx`)     | griglia di card                                                   | sostituito da **Casa** e **Famiglia**                                  | `/altro` → redirect a `/famiglia`                                      |
| Scadenze                     | **nessuna pagina** (solo scadenze di documenti/manutenzioni/note) | schermata `scadenze` raggruppata per mese + «Segna pagata»             | **da decidere**                                                        |
| Timeline a fasi manutenzione | `MaintenanceTimeline` + `TimelineList` (log)                      | fasi con 3 stati, importo, allegati, preventivi                        | estensione additiva                                                    |

## Route: nessuna si rompe

Restano tutte (`/oggi /calendario /nuovo /evento/:id /evento/:id/prepara /spesa /spese /rubrica /emergenza /manutenzioni /pratiche /pratiche/:id /documenti /scansiona /cura/* /impostazioni /spazio/:id /altro /benvenuto /invito/:token`).
Aggiunte: `/casa`, `/famiglia`, `/agenda` (alias di `/calendario`, che resta). `/altro` → redirect a `/famiglia`.

## Schermata prototipo → file → cosa cambia → rischi

| Prototipo                                                            | File repo                                                                         | Cosa cambia                                                    | Rischio                                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Aree · shell                                                         | `Shell`, `shell/TopBar                                                            | TabBar                                                         | Sidebar`, `RightColumn`, `AvatarMenu`, `styles.css`                       | 4 aree, tab bar, sidebar a sottovoci, testata con ricerca, avatar → impostazioni | selettori e2e su `aria-label`/`.tab`; `isInMore`, `tabShortcut`, `useShortcuts` |
| Aree · Oggi                                                          | `Today`, `BoardBanner`, `ChoresBlock`, `OccurrenceRow`, `CareTodayRows`           | card «Prossimo» scura, righe, blocco Cura, bacheca fissata     | swipe e azioni riga esistenti                                             |
| Aree · Agenda                                                        | `Calendar`, `calendar/*`                                                          | elenco per giorno, righe cliccabili                            | viste mese/settimana esistenti (da mantenere)                             |
| Aree · Casa / Famiglia (nuovi)                                       | nuovi `pages/Casa.tsx`, `pages/Famiglia.tsx` (da `More.tsx`)                      | carta accessi con badge (logica badge già in `More.tsx`)       | `FeatureGate` per funzione                                                |
| Foglio «+» + frase libera                                            | `NewSheet`, `new-sheet/*`                                                         | chip campi riconosciuti, scorciatoie                           | già usa `parseQuick`; non il parser demo                                  |
| Ricerca                                                              | `SearchSheet`                                                                     | overlay in alto su desktop                                     | —                                                                         |
| A-Evento dettaglio/modifica                                          | `EventEditor`, `event-editor/*`                                                   | dettaglio con azioni sempre visibili, chip al posto dei select | 246 righe + 30 file; molte regole (overrides, draft, categoria NB). Alto  |
| A-Evento chiudi/prepara                                              | `care/VisitClosePage`, `VisitPrepPage`, `visit-diary/*`                           | solo aspetto                                                   | basso                                                                     |
| A-Cura (hub, filone, terapie, nuova terapia, parametri, pdf, scheda) | `care/*` (30+ file)                                                               | solo aspetto + registrazione 2 tocchi                          | medio: `careColor`, permessi «Solo Cura»                                  |
| A-Casa spesa/spese/documenti/scansione/pratiche                      | `Shopping`, `Expenses`, `Documents`, `Scan`, `Procedures`, `ProcedureDetail`      | aspetto                                                        | medio                                                                     |
| A-Casa scadenze                                                      | —                                                                                 | **non esiste**                                                 | vedi domande                                                              |
| A-Casa manutenzioni + `manutenzione`                                 | `Maintenances`, `maintenances/*`, `lib/timeline.ts`, `TimelineList`               | card con avanzamento; dettaglio a fasi                         | richiede campi nuovi (importo/allegati per fase, preventivi) → migrazione |
| A-Famiglia rubrica/emergenza/spazi/spazio/impostazioni/bacheca       | `Contacts`, `Emergency`, `SpaceSheet`, `SpaceSettings`, `Settings`, `BoardBanner` | aspetto; emergenza offline invariata                           | e2e `emergency-offline`                                                   |
| A-Accesso                                                            | `Login`, `Onboarding`, `Invite`                                                   | aspetto + passi                                                | basso                                                                     |

## Checklist funzioni (da riempire a ogni fase: «funzione → dove sta ora»)

Impegni · Faccende · Spesa · Spese · Scadenze · Manutenzioni · Pratiche · Documenti · Scansione · Cura (filoni, terapie, parametri, visite, PDF, caregiver) · Rubrica · Emergenza · Spazi/inviti/impostazioni · Bacheca · Ricerca · Login/onboarding/invito · Feed e import calendario ICS · Notifiche push/email · Categorie NB · Luogo/mappa.
Fuori dal prototipo da preservare: **import/feed calendario ICS** (sezioni in `Settings`), selettore spazio «Tutti/singolo», ruolo «Solo Cura», tema/accento utente.

## Stato di avanzamento

| Fase | Esito |
|---|---|
| 1 Token e primitive | font Figtree, palette, raggi, `CheckButton` quadrato verde, `Switch`, `.btn.ok/.lg`, timeline (pallino 14 px, in programma bianco e a 0,7) |
| 2 Shell | `/casa`, `/famiglia`, tab bar a 4 aree, sidebar con sottovoci, ricerca in testata, `/altro` e `/agenda` redirect |
| 3 Foglio «+» | titolo «Aggiungi», barra libera, card «Ho capito» con chip dal vero `parseQuick`, esempi, scorciatoie per tipo |
| 4 Oggi / Agenda | card scura «Prossimo» (Fatto / Dettagli / Prepara visita); Agenda rinominata |
| 5 Impegno | azioni sempre in cima (Segna fatto / Rimanda con opzioni rapide / Prepara la visita), Elimina in fondo |
| 6 Cura | ordine hub come da design (dosi di oggi prima dei filoni); resto invariato |
| 7 Casa | `Scadenze` (vista aggregata, «Segna pagata»), intervento a fasi su pratiche (modello `lavori`), pulsante «Segna fatto: <fase>», preventivi a confronto, importo/ditta/allegati per fase (migrazione 0022) |
| 8 Famiglia | pagina Famiglia (Cura, Rubrica, Emergenza, Spazi, Bacheca, Profilo); ricerca estesa a documenti e funzioni |
| 9 Accesso | copy e pillole del login |
| 10 Rifinitura | variabili del tema scuro per i nuovi token |

## Decisioni e scarti voluti

- «Sostituzione caldaia» è una **pratica** con modello «Intervento a fasi» (non una terza timeline): stesso `TimelineList`, `procedureRows`, `useLinkedEvents('procedure', id)`; Manutenzioni mostra la card evidenziata che apre `/pratiche/:id`.
- I select di Categoria/Contatto/Spazio nell'editor impegno **restano select** (e2e e logica `useEventCategory`): il passaggio a chip è rimandato.
- Breakpoint desktop resta 1024 px (design: 700).
- Il percorso di onboarding resta in un'unica schermata (nome, spazio, colore).

## Checklist funzioni → dove sta ora

| Funzione | Dove |
|---|---|
| Impegni, faccende | Oggi, Agenda, `/evento/:id`, «+» |
| Spesa, Spese | Casa → Spesa / Spese |
| Scadenze | Casa → Scadenze (nuova vista), `Scadenza` come categoria impegno |
| Manutenzioni, interventi a fasi | Casa → Manutenzioni (+ «Intervento a fasi») |
| Pratiche e passaggi | Casa → Pratiche, `/pratiche/:id` |
| Documenti, Scansione | Casa → Documenti, «+» → Scansiona |
| Cura (filoni, terapie, parametri, visite, PDF) | Famiglia → Cura, `/cura/*` |
| Rubrica, Emergenza | Famiglia |
| Spazi, inviti, impostazioni spazio, bacheca | Famiglia → Spazi e inviti / Bacheca (`/spazio/:id`) |
| Profilo, notifiche, feed e import ICS, tema | Famiglia → Profilo e impostazioni |
| Ricerca | testata (`/`), impegni, contatti, documenti, funzioni |
| Login / onboarding / invito | invariati nei flussi |
