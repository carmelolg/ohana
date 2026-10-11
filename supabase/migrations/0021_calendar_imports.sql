-- Ohana — import di un calendario esterno (Google, Apple…) tramite il suo indirizzo ICS segreto.
-- L'indirizzo è una credenziale (chi lo ha legge il calendario): sta in una colonna che il client può scrivere ma non
-- leggere. Lo legge solo il Worker, con la chiave di servizio.
create table public.calendar_imports (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  url text not null check (url ~* '^(https|webcal)://' and length(url) <= 2000),
  last_synced_at timestamptz,
  -- messaggio per l'utente (italiano, senza dettagli tecnici) dell'ultimo tentativo fallito
  last_error text,
  created_at timestamptz not null default now(),
  unique (id, space_id)
);
create index on public.calendar_imports (space_id);

alter table public.calendar_imports enable row level security;
create policy calendar_imports_select on public.calendar_imports for select to authenticated using (is_member(space_id));
create policy calendar_imports_insert on public.calendar_imports for insert to authenticated
  with check (can_write(space_id) and user_id = auth.uid());
create policy calendar_imports_update on public.calendar_imports for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy calendar_imports_delete on public.calendar_imports for delete to authenticated using (can_write(space_id));

-- Privilegi per colonna: `url` si scrive ma non si legge, quindi `select *` dal client fallisce (le letture nominano le colonne).
revoke all on public.calendar_imports from anon, authenticated;
grant select (id, space_id, user_id, name, last_synced_at, last_error, created_at)
  on public.calendar_imports to authenticated;
grant insert (id, space_id, user_id, name, url) on public.calendar_imports to authenticated;
grant update (name) on public.calendar_imports to authenticated;
grant delete on public.calendar_imports to authenticated;

-- Gli impegni importati: `external_id` è l'identificatore nel calendario d'origine (UID, più l'istante per le occorrenze di
-- una ricorrenza), così una nuova sincronizzazione aggiorna invece di duplicare. Scollegare il calendario li rimuove.
alter table public.events add column import_id uuid;
alter table public.events add column external_id text;
alter table public.events add constraint events_import_fk
  foreign key (import_id, space_id) references public.calendar_imports (id, space_id) on delete cascade;
alter table public.events add constraint events_import_pair check ((import_id is null) = (external_id is null));
-- Non parziale: serve a `upsert ... on conflict (import_id, external_id)`; i NULL non confliggono tra loro.
alter table public.events add constraint events_import_unique unique (import_id, external_id);
