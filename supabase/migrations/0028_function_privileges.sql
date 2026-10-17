-- Ohana — privilegi di esecuzione delle funzioni `security definer`.
-- Postgres concede `execute` a PUBLIC (e Supabase anche ad `anon` in modo esplicito): ogni funzione
-- `security definer` era quindi chiamabile da chiunque abbia la chiave anon. Si parte da zero e si
-- riconcede solo ciò che il client usa davvero. `service_role` non si tocca (il Worker).
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;

-- RPC chiamate dall'app
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.update_member_profile(uuid, uuid, text, text, text) to authenticated;
-- l'anteprima dell'invito si vede prima del login; il token è casuale e monouso
grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- helper usati dalle policy RLS e dai vincoli: le valuta il ruolo che fa la query
grant execute on function
  public.is_member(uuid), public.is_admin(uuid), public.is_owner(uuid), public.can_write(uuid),
  public.is_care_member(uuid), public.is_member_of(uuid, uuid),
  public.space_of_event(uuid), public.space_of_expense(uuid), public.space_of_list(uuid),
  public.space_of_procedure(uuid)
  to authenticated;
-- i trigger non servono grant: Postgres non controlla `execute` sulla funzione di un trigger

-- le funzioni `security definer` create in futuro nascono già chiuse
alter default privileges in schema public revoke execute on functions from public, anon;
