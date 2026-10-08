-- Ohana — soprannome: se presente, è il nome mostrato agli altri al posto di «Nome Cognome».
alter table public.profiles add column nickname text check (nickname is null or length(trim(nickname)) between 1 and 40);
