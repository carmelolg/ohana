-- Ohana — storage (avatar, allegati), realtime e preferenze di notifica.

alter table public.profiles add column notify_email boolean not null default true;
alter table public.profiles add column morning_brief_time time not null default '07:30';

-- Bucket: avatars (pubblico in lettura), attachments (privato).
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Avatar: ognuno scrive solo nella propria cartella `<uid>/…`.
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Allegati: percorso `<space_id>/<event_id>/<file>`; accesso in base all'appartenenza allo spazio.
create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and is_member(((storage.foldername(name))[1])::uuid));
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and can_write(((storage.foldername(name))[1])::uuid));
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and can_write(((storage.foldername(name))[1])::uuid));

-- Realtime: aggiornamenti live (le RLS valgono anche per i messaggi realtime).
alter publication supabase_realtime add table
  public.events, public.event_reminders, public.event_checklist_items, public.shopping_items, public.shopping_lists,
  public.expenses, public.expense_shares, public.settlements,
  public.contacts, public.space_members;
