-- Ohana v2 — faccende, bacheca, diario visite, emergenza, manutenzioni, pratiche, documenti.
-- Tutte le tabelle seguono la regola degli spazi: lettura ai membri, scrittura a owner/admin/member (viewer sola lettura).

-- ---------------------------------------------------------------- 1. faccende
create type public.event_kind as enum ('appuntamento', 'faccenda');
alter table public.events add column kind public.event_kind not null default 'appuntamento';
-- Faccenda = impegno ricorrente a bassa priorità: assegnatario obbligatorio, solo giorno (niente orario), con ricorrenza.
alter table public.events add constraint events_chore_shape
  check (kind <> 'faccenda' or (assignee_id is not null and all_day and rrule is not null));
create index on public.events (space_id, kind);

alter table public.profiles add column notify_chores_push boolean not null default false;   -- riepilogo push delle faccende alle 8:00
alter table public.profiles add column scan_llm_fallback boolean not null default false;    -- OCR: fallback LLM (solo testo), disattivato

-- ---------------------------------------------------------------- 2. allegati legati allo spazio (anche senza impegno)
alter table public.attachments add column space_id uuid references public.spaces (id) on delete cascade;
update public.attachments a set space_id = e.space_id from public.events e where e.id = a.event_id;
alter table public.attachments alter column event_id drop not null;

create function public.attachments_fill_space() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.event_id is not null then
    -- un allegato di impegno appartiene sempre allo spazio dell'impegno
    new.space_id := (select space_id from events where id = new.event_id);
  end if;
  if new.space_id is null then
    raise exception 'allegato senza spazio' using errcode = '23502';
  end if;
  return new;
end $$;
create trigger attachments_fill_space before insert or update on public.attachments
  for each row execute function public.attachments_fill_space();
alter table public.attachments alter column space_id set not null;
create index on public.attachments (space_id);

drop policy attachments_select on public.attachments;
drop policy attachments_write on public.attachments;
create policy attachments_select on public.attachments for select to authenticated using (is_member(space_id));
create policy attachments_insert on public.attachments for insert to authenticated with check (can_write(space_id));
create policy attachments_update on public.attachments for update to authenticated using (can_write(space_id)) with check (can_write(space_id));
create policy attachments_delete on public.attachments for delete to authenticated using (can_write(space_id));

-- ---------------------------------------------------------------- 3. bacheca di spazio
create table public.board_notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  text text not null check (char_length(trim(text)) between 1 and 280),
  pinned boolean not null default true,
  expires_at timestamptz,
  notify_push boolean not null default false,   -- l'autore sceglie se avvisare i membri
  notified_at timestamptz,                       -- impostato dal Worker dopo l'invio
  created_at timestamptz not null default now()
);
create index on public.board_notes (space_id, created_at desc);

-- ---------------------------------------------------------------- 4. diario visite
create table public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);
create index on public.visit_notes (event_id);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  due_hint text,                                  -- «entro 31 dic · da prenotare»
  due_date date,
  created_event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.follow_ups (event_id);

-- ---------------------------------------------------------------- 5. emergenza
create table public.emergency_info (
  space_id uuid primary key references public.spaces (id) on delete cascade,
  contacts jsonb not null default '[]'::jsonb check (jsonb_typeof(contacts) = 'array'),   -- [{name, role, phone}] in ordine; il 112 è sempre mostrato per primo dall'app
  address text,
  intercom text,
  allergies text,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
create function public.touch_emergency() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger emergency_touch before insert or update on public.emergency_info
  for each row execute function public.touch_emergency();

-- ---------------------------------------------------------------- 6. manutenzioni
create table public.maintenances (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  rrule text not null,
  last_done_at date,
  last_cost numeric(10, 2) check (last_cost is null or last_cost >= 0),
  contact_id uuid,
  template_key text,
  created_at timestamptz not null default now(),
  unique (id, space_id),
  foreign key (contact_id, space_id) references public.contacts (id, space_id) on delete set null (contact_id)
);
create index on public.maintenances (space_id);

alter table public.events add column maintenance_id uuid;
alter table public.events add constraint events_maintenance_fk
  foreign key (maintenance_id, space_id) references public.maintenances (id, space_id) on delete cascade;
create index on public.events (maintenance_id) where maintenance_id is not null;

-- ---------------------------------------------------------------- 7. pratiche
create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  owner_id uuid references public.profiles (id) on delete set null,
  due_date date,
  status text not null default 'in_corso' check (status in ('in_corso', 'completata', 'archiviata')),
  template_key text,
  created_at timestamptz not null default now(),
  unique (id, space_id)
);
create index on public.procedures (space_id, status);

create table public.procedure_steps (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references public.procedures (id) on delete cascade,
  position int not null default 0,
  title text not null check (length(trim(title)) > 0),
  note text,
  done_at timestamptz,
  event_id uuid references public.events (id) on delete set null
);
create index on public.procedure_steps (procedure_id, position);

create table public.procedure_docs (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references public.procedures (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  attachment_id uuid references public.attachments (id) on delete set null
);
create index on public.procedure_docs (procedure_id);

-- ---------------------------------------------------------------- 8. documenti (scansioni e archivio)
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null default '',
  folder text not null default 'Altro',
  attachment_id uuid references public.attachments (id) on delete set null,
  doc_type text,
  extracted_json jsonb,
  expires_at date,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.documents (space_id, folder);

-- ---------------------------------------------------------------- helper e integrità
create function public.space_of_procedure(pid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select space_id from procedures where id = pid
$$;

-- il responsabile di una pratica e i passaggi collegati a impegni devono stare nello stesso spazio
create function public.check_procedure_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null and not is_member_of(new.space_id, new.owner_id) then
    raise exception 'responsabile non membro dello spazio' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger procedures_check_refs before insert or update on public.procedures
  for each row execute function public.check_procedure_refs();

create function public.check_step_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.event_id is not null and space_of_event(new.event_id) is distinct from space_of_procedure(new.procedure_id) then
    raise exception 'impegno di un altro spazio' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger procedure_steps_check_refs before insert or update on public.procedure_steps
  for each row execute function public.check_step_refs();

create function public.check_doc_refs() returns trigger
language plpgsql security definer set search_path = public as $$
declare att_space uuid;
begin
  if tg_table_name = 'documents' then
    if new.attachment_id is not null and (select space_id from attachments where id = new.attachment_id) is distinct from new.space_id then
      raise exception 'allegato di un altro spazio' using errcode = '23514';
    end if;
  else
    if new.attachment_id is not null and (select space_id from attachments where id = new.attachment_id) is distinct from space_of_procedure(new.procedure_id) then
      raise exception 'allegato di un altro spazio' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger documents_check_refs before insert or update on public.documents
  for each row execute function public.check_doc_refs();
create trigger procedure_docs_check_refs before insert or update on public.procedure_docs
  for each row execute function public.check_doc_refs();

-- un «prossimo passo» creato deve essere un impegno dello stesso spazio della visita
create function public.check_followup_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_event_id is not null and space_of_event(new.created_event_id) is distinct from space_of_event(new.event_id) then
    raise exception 'impegno di un altro spazio' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger follow_ups_check_refs before insert or update on public.follow_ups
  for each row execute function public.check_followup_refs();

-- ---------------------------------------------------------------- RLS
alter table public.board_notes enable row level security;
alter table public.visit_notes enable row level security;
alter table public.follow_ups enable row level security;
alter table public.emergency_info enable row level security;
alter table public.maintenances enable row level security;
alter table public.procedures enable row level security;
alter table public.procedure_steps enable row level security;
alter table public.procedure_docs enable row level security;
alter table public.documents enable row level security;

-- bacheca: scrive chi può scrivere (autore = io); modifica/elimina l'autore o un admin
create policy board_select on public.board_notes for select to authenticated using (is_member(space_id));
create policy board_insert on public.board_notes for insert to authenticated with check (can_write(space_id) and author_id = auth.uid());
create policy board_update on public.board_notes for update to authenticated
  using (can_write(space_id) and (author_id = auth.uid() or is_admin(space_id))) with check (can_write(space_id));
create policy board_delete on public.board_notes for delete to authenticated
  using (can_write(space_id) and (author_id = auth.uid() or is_admin(space_id)));

-- diario visite
create policy visit_notes_select on public.visit_notes for select to authenticated using (is_member(space_of_event(event_id)));
create policy visit_notes_insert on public.visit_notes for insert to authenticated
  with check (can_write(space_of_event(event_id)) and author_id = auth.uid());
create policy visit_notes_update on public.visit_notes for update to authenticated
  using (can_write(space_of_event(event_id)) and author_id = auth.uid()) with check (can_write(space_of_event(event_id)));
create policy visit_notes_delete on public.visit_notes for delete to authenticated
  using (can_write(space_of_event(event_id)) and (author_id = auth.uid() or is_admin(space_of_event(event_id))));
create policy follow_ups_select on public.follow_ups for select to authenticated using (is_member(space_of_event(event_id)));
create policy follow_ups_write on public.follow_ups for all to authenticated
  using (can_write(space_of_event(event_id))) with check (can_write(space_of_event(event_id)));

-- emergenza, manutenzioni, pratiche, documenti
create policy emergency_select on public.emergency_info for select to authenticated using (is_member(space_id));
create policy emergency_insert on public.emergency_info for insert to authenticated with check (can_write(space_id));
create policy emergency_update on public.emergency_info for update to authenticated using (can_write(space_id)) with check (can_write(space_id));
create policy emergency_delete on public.emergency_info for delete to authenticated using (is_admin(space_id));

create policy maintenances_select on public.maintenances for select to authenticated using (is_member(space_id));
create policy maintenances_insert on public.maintenances for insert to authenticated with check (can_write(space_id));
create policy maintenances_update on public.maintenances for update to authenticated using (can_write(space_id)) with check (can_write(space_id));
create policy maintenances_delete on public.maintenances for delete to authenticated using (can_write(space_id));

create policy procedures_select on public.procedures for select to authenticated using (is_member(space_id));
create policy procedures_insert on public.procedures for insert to authenticated with check (can_write(space_id));
create policy procedures_update on public.procedures for update to authenticated using (can_write(space_id)) with check (can_write(space_id));
create policy procedures_delete on public.procedures for delete to authenticated using (can_write(space_id));
create policy steps_select on public.procedure_steps for select to authenticated using (is_member(space_of_procedure(procedure_id)));
create policy steps_write on public.procedure_steps for all to authenticated
  using (can_write(space_of_procedure(procedure_id))) with check (can_write(space_of_procedure(procedure_id)));
create policy pdocs_select on public.procedure_docs for select to authenticated using (is_member(space_of_procedure(procedure_id)));
create policy pdocs_write on public.procedure_docs for all to authenticated
  using (can_write(space_of_procedure(procedure_id))) with check (can_write(space_of_procedure(procedure_id)));

create policy documents_select on public.documents for select to authenticated using (is_member(space_id));
create policy documents_insert on public.documents for insert to authenticated with check (can_write(space_id) and created_by = auth.uid());
create policy documents_update on public.documents for update to authenticated using (can_write(space_id)) with check (can_write(space_id));
create policy documents_delete on public.documents for delete to authenticated using (can_write(space_id));

-- ---------------------------------------------------------------- privilegi e realtime
revoke all on public.board_notes, public.visit_notes, public.follow_ups, public.emergency_info, public.maintenances,
  public.procedures, public.procedure_steps, public.procedure_docs, public.documents from anon;
grant select, insert, update, delete on public.board_notes, public.visit_notes, public.follow_ups, public.emergency_info,
  public.maintenances, public.procedures, public.procedure_steps, public.procedure_docs, public.documents to authenticated;

alter publication supabase_realtime add table
  public.board_notes, public.visit_notes, public.follow_ups, public.emergency_info, public.maintenances,
  public.procedures, public.procedure_steps, public.procedure_docs, public.documents, public.attachments;
