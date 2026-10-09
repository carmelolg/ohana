-- Ohana v3 (Cura) — la persona assistita può essere un membro di Ohana già presente nello spazio.
-- Il legame è facoltativo: la scheda resta autonoma (nascita, allergie, esenzioni) e ricorda solo chi è.
alter table public.care_recipients
  add column user_id uuid references public.profiles (id) on delete set null;

-- Un membro è una sola persona assistita per spazio: evita i doppioni.
create unique index care_recipients_space_user on public.care_recipients (space_id, user_id) where user_id is not null;

-- Il membro collegato deve far parte dello spazio (a differenza dei caregiver, può anche essere `care_viewer`).
create or replace function public.check_care_recipient_refs() returns trigger
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
  if new.user_id is not null
     and not exists (select 1 from space_members where space_id = new.space_id and user_id = new.user_id) then
    raise exception 'la persona assistita non è un membro dello spazio' using errcode = '23514';
  end if;
  return new;
end $$;

-- Chi esce dallo spazio resta una scheda, ma non più collegata a un account.
create function public.unlink_recipient_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update care_recipients set user_id = null where space_id = old.space_id and user_id = old.user_id;
  return old;
end $$;
create trigger space_members_unlink_recipient after delete on public.space_members
  for each row execute function public.unlink_recipient_user();
