-- Ohana v3 — Cura: persone assistite, filoni di cura, tasselli, terapie, parametri, preparazione della visita.
-- Regola degli spazi: lettura a chi è nello spazio (anche `care_viewer`), scrittura a owner/admin/member.
-- `care_viewer` legge SOLO queste tabelle: da qui in poi `is_member` non lo include più.

-- ---------------------------------------------------------------- 1. chi è «membro»
create or replace function public.is_member(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members
                 where space_id = sid and user_id = auth.uid() and role <> 'care_viewer')
$$;

-- Include anche `care_viewer`: serve per lo spazio stesso, i suoi membri e la sezione Cura.
create function public.is_care_member(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members where space_id = sid and user_id = auth.uid())
$$;

drop policy spaces_select on public.spaces;
create policy spaces_select on public.spaces for select to authenticated
  using (is_care_member(id) or created_by = auth.uid());

drop policy members_select on public.space_members;
create policy members_select on public.space_members for select to authenticated
  using (is_care_member(space_id));

drop policy members_update on public.space_members;
create policy members_update on public.space_members for update to authenticated
  using (is_owner(space_id) or (is_admin(space_id) and role in ('member', 'viewer', 'care_viewer')))
  with check (is_owner(space_id) or (is_admin(space_id) and role in ('member', 'viewer', 'care_viewer')));

drop policy members_delete on public.space_members;
create policy members_delete on public.space_members for delete to authenticated
  using (
    user_id = auth.uid()
    or is_owner(space_id)
    or (is_admin(space_id) and role in ('member', 'viewer', 'care_viewer'))
  );

-- Cura è una funzione che ogni spazio può spegnere, come la spesa.
alter table public.spaces drop constraint spaces_disabled_features_check;
alter table public.spaces add constraint spaces_disabled_features_check
  check (disabled_features <@ array['spesa', 'spese', 'manutenzioni', 'pratiche', 'documenti', 'cura']::text[]);

-- ---------------------------------------------------------------- 2. persona assistita
create table public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null default '',
  label text,                                          -- come la chiama la famiglia: «Papà»
  birth_date date,
  tax_code text,                                       -- codice fiscale: serve in ospedale
  photo_path text,                                     -- nel bucket privato `care`
  allergies text[] not null default '{}',
  exemptions jsonb not null default '[]'::jsonb check (jsonb_typeof(exemptions) = 'array'),   -- [{code, label, expires_at}]
  caregiver_ids uuid[] not null default '{}',          -- membri dello spazio, in ordine
  duty_user_id uuid references public.profiles (id) on delete set null,   -- caregiver di turno (vuoto = il primo)
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (id, space_id)
);
create index on public.care_recipients (space_id);

-- ---------------------------------------------------------------- 3. filone di cura
create table public.care_threads (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  recipient_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  specialty text,
  doctor text,
  contact_id uuid,                                     -- il medico in Rubrica
  color_hue int not null default 20 check (color_hue between 0 and 360),
  started_at date,
  status text not null default 'attivo' check (status in ('attivo', 'chiuso')),
  tracked_params text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (id, space_id),
  unique (id, recipient_id),
  foreign key (recipient_id, space_id) references public.care_recipients (id, space_id) on delete cascade,
  foreign key (contact_id, space_id) references public.contacts (id, space_id) on delete set null (contact_id)
);
create index on public.care_threads (recipient_id);

-- ---------------------------------------------------------------- 4. terapie (farmaci)
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  recipient_id uuid not null,
  thread_id uuid,                                      -- vuoto = terapia generale (medico di base)
  name text not null check (length(trim(name)) > 0),
  strength text,                                       -- «2,5 mg»
  dose_units numeric(6, 2) not null default 1 check (dose_units > 0),   -- unità per assunzione
  unit text not null default 'cpr',
  schedule text[] not null default '{}' check (array_to_string(schedule, ',') ~ '^(([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*)?$'),
  notes text,                                          -- «a digiuno»
  stock_units numeric(8, 2) not null default 0 check (stock_units >= 0),
  stock_as_of timestamptz not null default now(),      -- istante a cui vale `stock_units` (le dosi non segnate si stimano da qui)
  package_units int check (package_units > 0),
  prescriber text,
  refill_by text,                                      -- chi fa la ricetta, se diverso dal prescrittore
  plan_expires_at date,                                -- scadenza del piano terapeutico
  plan_issuer text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, space_id),
  unique (id, recipient_id),
  foreign key (recipient_id, space_id) references public.care_recipients (id, space_id) on delete cascade,
  foreign key (thread_id, recipient_id) references public.care_threads (id, recipient_id) on delete set null (thread_id)
);
create index on public.medications (recipient_id, active);

-- una riga per dose segnata come presa
create table public.medication_doses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  medication_id uuid not null,
  day date not null,
  slot text not null check (slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  taken_by uuid not null default auth.uid() references public.profiles (id),
  taken_at timestamptz not null default now(),
  unique (medication_id, day, slot),
  foreign key (medication_id, space_id) references public.medications (id, space_id) on delete cascade
);
create index on public.medication_doses (space_id, day);

-- ---------------------------------------------------------------- 5. tasselli del filone
create table public.care_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  recipient_id uuid not null,
  thread_id uuid not null,
  type text not null check (type in ('visita', 'esame', 'terapia', 'episodio', 'nota')),
  entry_date date not null,
  title text not null check (length(trim(title)) > 0),
  text text,
  readings jsonb not null default '{}'::jsonb check (jsonb_typeof(readings) = 'object'),    -- valori misurati: {heart_rate: 112, blood_pressure: "132/80"}
  follow_ups jsonb not null default '[]'::jsonb check (jsonb_typeof(follow_ups) = 'array'), -- prossimi passi: [{title, due_date, due_hint}]
  author_id uuid not null default auth.uid() references public.profiles (id),
  event_id uuid,
  medication_id uuid,
  created_at timestamptz not null default now(),
  unique (id, space_id),
  foreign key (thread_id, recipient_id) references public.care_threads (id, recipient_id) on delete cascade,
  foreign key (recipient_id, space_id) references public.care_recipients (id, space_id) on delete cascade,
  foreign key (event_id, space_id) references public.events (id, space_id) on delete set null (event_id),
  foreign key (medication_id, recipient_id) references public.medications (id, recipient_id) on delete set null (medication_id)
);
create index on public.care_entries (thread_id, entry_date desc);
create index on public.care_entries (recipient_id, entry_date desc);

-- allegati sanitari (referti, esami): file nel bucket privato `care`
create table public.care_files (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  recipient_id uuid not null,
  entry_id uuid,
  name text not null,
  path text not null,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  foreign key (recipient_id, space_id) references public.care_recipients (id, space_id) on delete cascade,
  foreign key (entry_id, space_id) references public.care_entries (id, space_id) on delete cascade
);
create index on public.care_files (recipient_id);
create index on public.care_files (entry_id);

-- ---------------------------------------------------------------- 6. parametri
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  recipient_id uuid not null,
  thread_id uuid,
  type text not null check (length(trim(type)) > 0),   -- heart_rate · blood_pressure · weight · stools_per_day
  value numeric not null,                              -- per la pressione: la massima
  value2 numeric,                                      -- per la pressione: la minima
  measured_at timestamptz not null default now(),
  author_id uuid not null default auth.uid() references public.profiles (id),
  note text,
  created_at timestamptz not null default now(),
  foreign key (recipient_id, space_id) references public.care_recipients (id, space_id) on delete cascade,
  foreign key (thread_id, recipient_id) references public.care_threads (id, recipient_id) on delete set null (thread_id)
);
create index on public.measurements (recipient_id, type, measured_at desc);

-- ---------------------------------------------------------------- 7. preparazione della visita
alter table public.events add column care_thread_id uuid;
alter table public.events add column medication_id uuid;
alter table public.events add constraint events_care_thread_fk
  foreign key (care_thread_id, space_id) references public.care_threads (id, space_id) on delete set null (care_thread_id);
alter table public.events add constraint events_medication_fk
  foreign key (medication_id, space_id) references public.medications (id, space_id) on delete set null (medication_id);
create index on public.events (care_thread_id) where care_thread_id is not null;
create index on public.events (medication_id) where medication_id is not null;

create table public.visit_prep (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  event_id uuid not null,
  thread_id uuid,
  bring jsonb not null default '[]'::jsonb check (jsonb_typeof(bring) = 'array'),   -- cose da portare: [{text, done}]
  created_at timestamptz not null default now(),
  unique (id, space_id),
  unique (event_id),
  foreign key (event_id, space_id) references public.events (id, space_id) on delete cascade,
  foreign key (thread_id, space_id) references public.care_threads (id, space_id) on delete set null (thread_id)
);

create table public.visit_questions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  prep_id uuid not null,
  text text not null check (length(trim(text)) > 0),
  author_id uuid not null default auth.uid() references public.profiles (id),
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (prep_id, space_id) references public.visit_prep (id, space_id) on delete cascade
);
create index on public.visit_questions (prep_id, position);

-- ---------------------------------------------------------------- 8. registro degli accessi
create table public.care_audit (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  recipient_id uuid not null,
  thread_id uuid,
  user_id uuid not null default auth.uid() references public.profiles (id),
  action text not null check (action in ('view', 'export')),
  created_at timestamptz not null default now(),
  foreign key (recipient_id, space_id) references public.care_recipients (id, space_id) on delete cascade
);
create index on public.care_audit (recipient_id, created_at desc);

-- ---------------------------------------------------------------- integrità
-- I caregiver sono membri dello spazio che possono scrivere; quello di turno è uno di loro.
create function public.check_care_recipient_refs() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  foreach uid in array new.caregiver_ids loop
    if not exists (select 1 from space_members
                   where space_id = new.space_id and user_id = uid and role <> 'care_viewer') then
      raise exception 'caregiver non membro dello spazio' using errcode = '23514';
    end if;
  end loop;
  if new.duty_user_id is not null and not (new.duty_user_id = any (new.caregiver_ids)) then
    raise exception 'il caregiver di turno non è tra i caregiver' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger care_recipients_check_refs before insert or update on public.care_recipients
  for each row execute function public.check_care_recipient_refs();

-- Chi esce dallo spazio non è più caregiver di nessuno.
create function public.drop_caregiver() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update care_recipients
     set caregiver_ids = array_remove(caregiver_ids, old.user_id),
         duty_user_id = case when duty_user_id = old.user_id then null else duty_user_id end
   where space_id = old.space_id and old.user_id = any (caregiver_ids);
  return old;
end $$;
create trigger space_members_drop_caregiver after delete on public.space_members
  for each row execute function public.drop_caregiver();

-- La scorta scende a ogni dose segnata e risale se la dose viene tolta.
create function public.apply_dose_to_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update medications set stock_units = greatest(stock_units - dose_units, 0) where id = new.medication_id;
    return new;
  end if;
  update medications set stock_units = stock_units + dose_units where id = old.medication_id;
  return old;
end $$;
create trigger medication_doses_stock after insert or delete on public.medication_doses
  for each row execute function public.apply_dose_to_stock();

-- ---------------------------------------------------------------- RLS
alter table public.care_recipients enable row level security;
alter table public.care_threads enable row level security;
alter table public.medications enable row level security;
alter table public.medication_doses enable row level security;
alter table public.care_entries enable row level security;
alter table public.care_files enable row level security;
alter table public.measurements enable row level security;
alter table public.visit_prep enable row level security;
alter table public.visit_questions enable row level security;
alter table public.care_audit enable row level security;

-- persone, filoni, terapie, dosi, allegati: leggono tutti i membri di cura, scrive chi può scrivere
create policy care_recipients_select on public.care_recipients for select to authenticated using (is_care_member(space_id));
create policy care_recipients_insert on public.care_recipients for insert to authenticated
  with check (can_write(space_id) and created_by = auth.uid());
create policy care_recipients_update on public.care_recipients for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy care_recipients_delete on public.care_recipients for delete to authenticated using (is_admin(space_id));

create policy care_threads_select on public.care_threads for select to authenticated using (is_care_member(space_id));
create policy care_threads_write on public.care_threads for all to authenticated
  using (can_write(space_id)) with check (can_write(space_id));

create policy medications_select on public.medications for select to authenticated using (is_care_member(space_id));
create policy medications_write on public.medications for all to authenticated
  using (can_write(space_id)) with check (can_write(space_id));

create policy doses_select on public.medication_doses for select to authenticated using (is_care_member(space_id));
create policy doses_insert on public.medication_doses for insert to authenticated
  with check (can_write(space_id) and taken_by = auth.uid());
create policy doses_delete on public.medication_doses for delete to authenticated using (can_write(space_id));

create policy care_files_select on public.care_files for select to authenticated using (is_care_member(space_id));
create policy care_files_insert on public.care_files for insert to authenticated
  with check (can_write(space_id) and created_by = auth.uid());
create policy care_files_delete on public.care_files for delete to authenticated using (can_write(space_id));

-- tasselli e parametri: l'autore è chi scrive; modifica/elimina l'autore o un admin
create policy care_entries_select on public.care_entries for select to authenticated using (is_care_member(space_id));
create policy care_entries_insert on public.care_entries for insert to authenticated
  with check (can_write(space_id) and author_id = auth.uid());
create policy care_entries_update on public.care_entries for update to authenticated
  using (can_write(space_id) and (author_id = auth.uid() or is_admin(space_id))) with check (can_write(space_id));
create policy care_entries_delete on public.care_entries for delete to authenticated
  using (can_write(space_id) and (author_id = auth.uid() or is_admin(space_id)));

create policy measurements_select on public.measurements for select to authenticated using (is_care_member(space_id));
create policy measurements_insert on public.measurements for insert to authenticated
  with check (can_write(space_id) and author_id = auth.uid());
create policy measurements_update on public.measurements for update to authenticated
  using (can_write(space_id) and (author_id = auth.uid() or is_admin(space_id))) with check (can_write(space_id));
create policy measurements_delete on public.measurements for delete to authenticated
  using (can_write(space_id) and (author_id = auth.uid() or is_admin(space_id)));

-- preparazione visita: le domande le aggiunge chiunque possa scrivere (anche chi non è caregiver)
create policy visit_prep_select on public.visit_prep for select to authenticated using (is_care_member(space_id));
create policy visit_prep_write on public.visit_prep for all to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy visit_questions_select on public.visit_questions for select to authenticated using (is_care_member(space_id));
create policy visit_questions_insert on public.visit_questions for insert to authenticated
  with check (can_write(space_id) and author_id = auth.uid());
create policy visit_questions_update on public.visit_questions for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy visit_questions_delete on public.visit_questions for delete to authenticated
  using (can_write(space_id) and (author_id = auth.uid() or is_admin(space_id)));

-- registro: ognuno scrive il proprio accesso; lo legge solo chi amministra lo spazio
create policy care_audit_insert on public.care_audit for insert to authenticated
  with check (is_care_member(space_id) and user_id = auth.uid());
create policy care_audit_select on public.care_audit for select to authenticated using (is_admin(space_id));

-- ---------------------------------------------------------------- privilegi e realtime
revoke all on public.care_recipients, public.care_threads, public.medications, public.medication_doses,
  public.care_entries, public.care_files, public.measurements, public.visit_prep, public.visit_questions,
  public.care_audit from anon;
grant select, insert, update, delete on public.care_recipients, public.care_threads, public.medications,
  public.medication_doses, public.care_entries, public.care_files, public.measurements, public.visit_prep,
  public.visit_questions to authenticated;
grant select, insert on public.care_audit to authenticated;

alter publication supabase_realtime add table
  public.care_recipients, public.care_threads, public.medications, public.medication_doses,
  public.care_entries, public.care_files, public.measurements, public.visit_prep, public.visit_questions;

-- ---------------------------------------------------------------- allegati sanitari: bucket privato `care`
-- Percorso `<space_id>/<recipient_id>/<file>`; si leggono solo con URL firmati a breve scadenza.
insert into storage.buckets (id, name, public) values ('care', 'care', false) on conflict (id) do nothing;

create policy care_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'care' and is_care_member(((storage.foldername(name))[1])::uuid));
create policy care_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'care' and can_write(((storage.foldername(name))[1])::uuid));
create policy care_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'care' and can_write(((storage.foldername(name))[1])::uuid));
