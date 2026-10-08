-- Ohana — funzioni di appartenenza, trigger di integrità e policy RLS.
-- Principio: un utente vede e modifica solo ciò che appartiene a spazi di cui è membro.

-- ---------------------------------------------------------------- helper (security definer: evitano ricorsione RLS)
create function public.is_member(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members where space_id = sid and user_id = auth.uid())
$$;

create function public.can_write(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members
                 where space_id = sid and user_id = auth.uid() and role in ('owner', 'admin', 'member'))
$$;

create function public.is_admin(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members
                 where space_id = sid and user_id = auth.uid() and role in ('owner', 'admin'))
$$;

create function public.is_owner(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members
                 where space_id = sid and user_id = auth.uid() and role = 'owner')
$$;

create function public.is_member_of(sid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from space_members where space_id = sid and user_id = uid)
$$;

-- Spazio di una lista / evento / spesa (per le tabelle figlie).
create function public.space_of_event(eid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select space_id from events where id = eid
$$;

create function public.space_of_list(lid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select space_id from shopping_lists where id = lid
$$;

create function public.space_of_expense(xid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select space_id from expenses where id = xid
$$;

-- ---------------------------------------------------------------- trigger
-- Chi crea uno spazio ne diventa owner.
create function public.add_space_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into space_members (space_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end $$;

create trigger spaces_add_owner after insert on public.spaces
  for each row execute function public.add_space_owner();

-- Non si può lasciare uno spazio senza owner (cancellazione dello spazio esclusa).
create function public.keep_one_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from spaces where id = old.space_id)
     and not exists (select 1 from space_members
                     where space_id = old.space_id and role = 'owner' and user_id <> old.user_id) then
    raise exception 'ultimo owner dello spazio' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;

create trigger space_members_keep_owner before update or delete on public.space_members
  for each row execute function public.keep_one_owner();

-- Assegnatario, pagante e quote devono appartenere allo spazio.
create function public.check_event_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null and not is_member_of(new.space_id, new.assignee_id) then
    raise exception 'assegnatario non membro dello spazio' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger events_check_refs before insert or update on public.events
  for each row execute function public.check_event_refs();

create function public.check_expense_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_member_of(new.space_id, new.payer_id) then
    raise exception 'pagante non membro dello spazio' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger expenses_check_refs before insert or update on public.expenses
  for each row execute function public.check_expense_refs();

create function public.check_share_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_member_of(space_of_expense(new.expense_id), new.user_id) then
    raise exception 'quota assegnata a non membro' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger expense_shares_check_refs before insert or update on public.expense_shares
  for each row execute function public.check_share_refs();

create function public.check_settlement_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (is_member_of(new.space_id, new.from_id) and is_member_of(new.space_id, new.to_id)) then
    raise exception 'saldo tra non membri' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger settlements_check_refs before insert or update on public.settlements
  for each row execute function public.check_settlement_refs();

-- ---------------------------------------------------------------- inviti (funzioni RPC)
-- Anteprima dell'invito per la schermata di accesso (chiamabile anche da anon).
create function public.get_invite_preview(invite_token text)
returns table (space_name text, space_color_hue int, invited_by_name text, email text, role space_role, expired boolean)
language sql stable security definer set search_path = public as $$
  select s.name, s.color_hue,
         trim(p.first_name || ' ' || p.last_name),
         i.email, i.role,
         (i.expires_at < now() or i.accepted_at is not null)
  from invites i
  join spaces s on s.id = i.space_id
  join profiles p on p.id = i.invited_by
  where i.token = invite_token
$$;

-- Accetta l'invito: l'email dell'utente autenticato deve coincidere con quella invitata.
create function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'autenticazione richiesta' using errcode = '28000';
  end if;
  select email into user_email from profiles where id = auth.uid();
  select * into inv from invites where token = invite_token for update;
  if not found or inv.accepted_at is not null or inv.expires_at < now()
     or lower(inv.email) <> lower(user_email) then
    raise exception 'invito non valido' using errcode = '42501';
  end if;
  insert into space_members (space_id, user_id, role)
  values (inv.space_id, auth.uid(), inv.role)
  on conflict (space_id, user_id) do nothing;
  update invites set accepted_at = now() where id = inv.id;
  return inv.space_id;
end $$;

revoke all on function public.get_invite_preview(text) from public;
revoke all on function public.accept_invite(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- ---------------------------------------------------------------- abilita RLS
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.invites enable row level security;
alter table public.contacts enable row level security;
alter table public.events enable row level security;
alter table public.event_reminders enable row level security;
alter table public.event_checklist_items enable row level security;
alter table public.attachments enable row level security;
alter table public.reminder_queue enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.calendar_feeds enable row level security;

-- ---------------------------------------------------------------- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from space_members a join space_members b on a.space_id = b.space_id
               where a.user_id = auth.uid() and b.user_id = profiles.id)
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- spaces
create policy spaces_select on public.spaces for select to authenticated
  using (is_member(id) or created_by = auth.uid());
create policy spaces_insert on public.spaces for insert to authenticated
  with check (created_by = auth.uid());
create policy spaces_update on public.spaces for update to authenticated
  using (is_admin(id)) with check (is_admin(id));
create policy spaces_delete on public.spaces for delete to authenticated
  using (is_owner(id));

-- ---------------------------------------------------------------- space_members
-- Nessun insert diretto: si entra con create space (trigger) o accept_invite().
create policy members_select on public.space_members for select to authenticated
  using (is_member(space_id));
create policy members_update on public.space_members for update to authenticated
  using (
    is_owner(space_id)
    or (is_admin(space_id) and role in ('member', 'viewer'))
  )
  with check (
    is_owner(space_id)
    or (is_admin(space_id) and role in ('member', 'viewer'))
  );
create policy members_delete on public.space_members for delete to authenticated
  using (
    user_id = auth.uid()
    or is_owner(space_id)
    or (is_admin(space_id) and role in ('member', 'viewer'))
  );

-- ---------------------------------------------------------------- invites
create policy invites_select on public.invites for select to authenticated
  using (is_admin(space_id));
create policy invites_insert on public.invites for insert to authenticated
  with check (is_admin(space_id) and invited_by = auth.uid() and role <> 'owner');
create policy invites_delete on public.invites for delete to authenticated
  using (is_admin(space_id));

-- ---------------------------------------------------------------- tabelle con space_id
create policy contacts_select on public.contacts for select to authenticated using (is_member(space_id));
create policy contacts_insert on public.contacts for insert to authenticated with check (can_write(space_id));
create policy contacts_update on public.contacts for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy contacts_delete on public.contacts for delete to authenticated using (can_write(space_id));

create policy events_select on public.events for select to authenticated using (is_member(space_id));
create policy events_insert on public.events for insert to authenticated
  with check (can_write(space_id) and created_by = auth.uid());
create policy events_update on public.events for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy events_delete on public.events for delete to authenticated using (can_write(space_id));

create policy lists_select on public.shopping_lists for select to authenticated using (is_member(space_id));
create policy lists_insert on public.shopping_lists for insert to authenticated with check (can_write(space_id));
create policy lists_update on public.shopping_lists for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy lists_delete on public.shopping_lists for delete to authenticated using (can_write(space_id));

create policy expenses_select on public.expenses for select to authenticated using (is_member(space_id));
create policy expenses_insert on public.expenses for insert to authenticated with check (can_write(space_id));
create policy expenses_update on public.expenses for update to authenticated
  using (can_write(space_id)) with check (can_write(space_id));
create policy expenses_delete on public.expenses for delete to authenticated using (can_write(space_id));

create policy settlements_select on public.settlements for select to authenticated using (is_member(space_id));
create policy settlements_insert on public.settlements for insert to authenticated with check (can_write(space_id));
create policy settlements_delete on public.settlements for delete to authenticated using (can_write(space_id));

-- ---------------------------------------------------------------- tabelle figlie
create policy reminders_select on public.event_reminders for select to authenticated
  using (is_member(space_of_event(event_id)));
create policy reminders_write on public.event_reminders for all to authenticated
  using (can_write(space_of_event(event_id))) with check (can_write(space_of_event(event_id)));

create policy checklist_select on public.event_checklist_items for select to authenticated
  using (is_member(space_of_event(event_id)));
create policy checklist_write on public.event_checklist_items for all to authenticated
  using (can_write(space_of_event(event_id))) with check (can_write(space_of_event(event_id)));

create policy attachments_select on public.attachments for select to authenticated
  using (is_member(space_of_event(event_id)));
create policy attachments_write on public.attachments for all to authenticated
  using (can_write(space_of_event(event_id))) with check (can_write(space_of_event(event_id)));

create policy items_select on public.shopping_items for select to authenticated
  using (is_member(space_of_list(list_id)));
create policy items_write on public.shopping_items for all to authenticated
  using (can_write(space_of_list(list_id))) with check (can_write(space_of_list(list_id)));

create policy shares_select on public.expense_shares for select to authenticated
  using (is_member(space_of_expense(expense_id)));
create policy shares_write on public.expense_shares for all to authenticated
  using (can_write(space_of_expense(expense_id))) with check (can_write(space_of_expense(expense_id)));

-- ---------------------------------------------------------------- dati personali
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy feeds_own_select on public.calendar_feeds for select to authenticated
  using (user_id = auth.uid());
create policy feeds_own_insert on public.calendar_feeds for insert to authenticated
  with check (user_id = auth.uid() and (space_id is null or is_member(space_id)));
create policy feeds_own_delete on public.calendar_feeds for delete to authenticated
  using (user_id = auth.uid());

-- reminder_queue: nessuna policy per i client. Solo il Worker (service role, bypass RLS).
create policy queue_own_select on public.reminder_queue for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------- privilegi
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.reminder_queue from authenticated;
-- space_members: gli inserimenti passano solo da trigger e accept_invite()
revoke insert on public.space_members from authenticated;
