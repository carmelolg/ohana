# Stato lavori · sezione Cura (v3)

Fonte: `../ohana-pacchetto-claude-code/` (spec-3-cura.md, FASI.md fase 7, design 4a–4i). Le fasi 0–6, 8 e 9 del pacchetto erano già nel repo (vedi `docs/funzioni.md`); mancava **Cura**, ora completa. Le regole di questa sessione: nessuna azione git, nessun deploy (né Cloudflare né Supabase remoto), solo lavoro locale. Le regole del repo (`CLAUDE.md`) prevalgono su quelle del pacchetto (es. budget del bundle = v1 + 30 KB, niente Resend obbligatorio).

## Fatto

- Migrazioni `0015` (ruolo `care_viewer`), `0016` (tabelle, RLS, trigger, bucket `care`), `0017` (registro dei promemoria delle dosi) · test di isolamento in `supabase/tests/isolation.sql` (sezione 13)
- Logica pura in `packages/shared/src/care/` (scorte, dosi, da-quando-l'ha-visto, «da fare», riga di Oggi, riepilogo PDF, valori dei referti) · `packages/shared/test/care.test.ts`
- Comandi di scrittura in `apps/web/src/lib/api/` (persone, filoni, terapie, dosi, parametri, chiusura visita, preparazione, referti) con test su `fakeMutate`
- Schermate sotto `/cura` (lazy): scheda persona (4a su telefono, 4h su desktop), filone con linea del tempo (4b), chiusura visita (4c), terapie (4d), parametri ed episodi (4e), prepara la visita (4f, `/evento/:id/prepara`), riepilogo PDF (4i), documenti, moduli di persona, filone e farmaco
- Integrazioni: card in Altro, riga in Oggi (4g), «Registra per …» nel «+», sezione nella barra laterale, filone sulle visite, esito della visita al posto del diario 3d, referto scansionato → tassello, ruolo «Solo Cura» in inviti e membri
- Worker: job `care-doses` (push al caregiver di turno) · `care_viewer` escluso da promemoria, brief, faccende, bacheca e feed ICS
- Seed locale `apps/web/scripts/seed-cura.mjs` da `supabase/seed-cura.json` · e2e `apps/web/e2e/cura.spec.ts` (mobile e desktop)
- `ARCHITETTURA.md`, `README.md`, `docs/funzioni.md`, `docs/messa-online.md` aggiornati

## Da fare da parte tua (non l'ho fatto: fuori dal perimetro di questa sessione)

- Applicare le migrazioni `0015`–`0017` al Supabase online: `npx supabase db push`
- Pubblicare Worker e frontend: `pnpm run release`
- Commit e push

## Note

- La funzione «Cura» è accesa di default in ogni spazio (come tutte); si spegne in Spazio › Funzioni.
- Il Docker locale ha un disco virtuale piccolo (15 GB, quasi pieno): se il database locale non parte con «No space left on device», libera spazio con `docker builder prune`.
