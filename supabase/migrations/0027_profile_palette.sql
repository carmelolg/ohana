-- Ohana — palette di colori scelta da ciascun utente per il proprio profilo (vedi `PALETTES` in shared).
-- Colonna sul profilo, non per spazio: la scelta segue la persona in tutti gli spazi e non è visibile agli altri.
-- La lista dei valori sta nel check, così un identificativo sconosciuto non entra mai nel database.
alter table public.profiles
  add column palette text not null default 'ohana'
  check (palette in ('ohana', 'lavanda', 'notte', 'carta', 'contrasto'));
