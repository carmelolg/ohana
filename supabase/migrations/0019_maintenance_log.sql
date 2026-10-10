-- Ohana — registro delle esecuzioni di una manutenzione (linea del tempo di caldaia, auto…).
-- `maintenances.last_done_at/last_cost` tengono solo l'ultima volta: qui resta ogni intervento, con costo e professionista.
create table public.maintenance_log (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  maintenance_id uuid not null,
  done_on date not null,
  cost numeric(10, 2) check (cost is null or cost >= 0),
  contact_id uuid,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, space_id),
  foreign key (maintenance_id, space_id) references public.maintenances (id, space_id) on delete cascade,
  foreign key (contact_id, space_id) references public.contacts (id, space_id) on delete set null (contact_id)
);
create index on public.maintenance_log (maintenance_id, done_on desc);
create index on public.maintenance_log (space_id);

alter table public.maintenance_log enable row level security;
create policy maintenance_log_select on public.maintenance_log for select to authenticated using (is_member(space_id));
create policy maintenance_log_insert on public.maintenance_log for insert to authenticated with check (can_write(space_id));
create policy maintenance_log_update on public.maintenance_log for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy maintenance_log_delete on public.maintenance_log for delete to authenticated using (can_write(space_id));

revoke all on public.maintenance_log from anon;
grant select, insert, update, delete on public.maintenance_log to authenticated;
alter publication supabase_realtime add table public.maintenance_log;

-- Le manutenzioni già segnate «fatte» hanno almeno l'ultima esecuzione: la linea del tempo non parte vuota.
insert into public.maintenance_log (space_id, maintenance_id, done_on, cost, contact_id)
select space_id, id, last_done_at, last_cost, contact_id
from public.maintenances
where last_done_at is not null;
