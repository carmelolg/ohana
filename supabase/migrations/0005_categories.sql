-- Ohana — categorie personalizzabili per spazio.
-- Le 6 categorie storiche diventano righe predefinite (slug valorizzato, non eliminabili);
-- ogni spazio può aggiungerne di proprie, con parole chiave usate dall'aggiunta rapida.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  slug text,                                  -- solo categorie predefinite: visita, professionista, burocrazia, commissione, scadenza, altro
  keywords text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, space_id)
);
create unique index categories_name_uq on public.categories (space_id, lower(name));
create unique index categories_slug_uq on public.categories (space_id, slug) where slug is not null;

create function public.insert_default_categories(sid uuid) returns void
language sql security definer set search_path = public as $$
  insert into categories (space_id, name, slug, position) values
    (sid, 'Visita', 'visita', 0),
    (sid, 'Professionista', 'professionista', 1),
    (sid, 'Burocrazia', 'burocrazia', 2),
    (sid, 'Commissione', 'commissione', 3),
    (sid, 'Scadenza', 'scadenza', 4),
    (sid, 'Altro', 'altro', 5)
  on conflict do nothing
$$;
revoke all on function public.insert_default_categories(uuid) from public, anon, authenticated;

create function public.seed_space_categories() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform insert_default_categories(new.id);
  return new;
end $$;
create trigger spaces_seed_categories after insert on public.spaces
  for each row execute function public.seed_space_categories();

-- spazi esistenti
select public.insert_default_categories(id) from public.spaces;

-- ---------------------------------------------------------------- events.category -> category_id
alter table public.events add column category_id uuid;
update public.events e set category_id = c.id
  from public.categories c where c.space_id = e.space_id and c.slug = e.category::text;
alter table public.events alter column category_id set not null;
alter table public.events add constraint events_category_fk
  foreign key (category_id, space_id) references public.categories (id, space_id);
alter table public.events drop column category;
drop type public.event_category;
create index on public.events (category_id);

-- Senza categoria esplicita: «Altro» dello spazio.
create function public.events_default_category() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is null then
    select id into new.category_id from categories where space_id = new.space_id and slug = 'altro';
  end if;
  return new;
end $$;
create trigger events_default_category before insert on public.events
  for each row execute function public.events_default_category();

-- ---------------------------------------------------------------- integrità
create function public.categories_guard_update() returns trigger
language plpgsql as $$
begin
  if new.slug is distinct from old.slug or new.space_id <> old.space_id then
    raise exception 'slug e spazio di una categoria non sono modificabili' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger categories_guard_update before update on public.categories
  for each row execute function public.categories_guard_update();

-- Eliminare una categoria personalizzata sposta i suoi impegni in «Altro».
create function public.categories_before_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from spaces where id = old.space_id) then   -- false durante l'eliminazione a cascata dello spazio
    if old.slug is not null then
      raise exception 'categoria predefinita non eliminabile' using errcode = '23514';
    end if;
    update events set category_id = (select id from categories where space_id = old.space_id and slug = 'altro')
      where category_id = old.id;
  end if;
  return old;
end $$;
create trigger categories_before_delete before delete on public.categories
  for each row execute function public.categories_before_delete();

-- ---------------------------------------------------------------- RLS
alter table public.categories enable row level security;
create policy categories_select on public.categories for select to authenticated using (is_member(space_id));
create policy categories_insert on public.categories for insert to authenticated
  with check (can_write(space_id) and slug is null);
create policy categories_update on public.categories for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy categories_delete on public.categories for delete to authenticated using (can_write(space_id));

revoke all on public.categories from anon;
grant select, insert, update, delete on public.categories to authenticated;

alter publication supabase_realtime add table public.categories;
