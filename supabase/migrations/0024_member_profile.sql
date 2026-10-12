-- Ohana — il proprietario di uno spazio può correggere i dati anagrafici (nome, cognome, soprannome) dei suoi membri.
-- Una funzione dedicata, non una policy su `profiles`: così si possono toccare solo questi tre campi e solo
-- per chi è davvero membro dello spazio (email, tema e avatar restano di chi li possiede).
create function public.update_member_profile(
  sid uuid, uid uuid, first text, last text, nick text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner(sid) or not is_member_of(sid, uid) then
    raise exception 'solo il proprietario può modificare i dati dei membri' using errcode = '42501';
  end if;
  if length(trim(coalesce(first, ''))) = 0 then
    raise exception 'il nome è obbligatorio' using errcode = '23514';
  end if;
  update profiles
     set first_name = trim(first),
         last_name = trim(coalesce(last, '')),
         nickname = nullif(trim(coalesce(nick, '')), '')
   where id = uid;
end $$;

revoke all on function public.update_member_profile(uuid, uuid, text, text, text) from public;
grant execute on function public.update_member_profile(uuid, uuid, text, text, text) to authenticated;
