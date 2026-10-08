-- Ohana — funzionalità opzionali per spazio: la spesa non serve nello spazio dei genitori da assistere,
-- le spese condivise non servono in uno spazio personale. Elenco delle funzioni SPENTE (vuoto = tutte attive),
-- così gli spazi esistenti restano invariati. Gli stessi nomi sono in packages/shared/src/features.ts.
alter table public.spaces
  add column disabled_features text[] not null default '{}'
  check (disabled_features <@ array['spesa', 'spese', 'manutenzioni', 'pratiche', 'documenti']::text[]);
