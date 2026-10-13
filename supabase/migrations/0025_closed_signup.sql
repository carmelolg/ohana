-- Ohana — registrazione chiusa: un account nasce solo da un invito valido o da un'email in allowlist.
-- Il controllo gira in un hook «Before User Created» di Supabase Auth, quindi vale per OTP e per Google.
-- Chiudere `enable_signup` in blocco romperebbe l'invito di un nuovo membro, che crea l'account al primo accesso.

-- Eccezioni e bootstrap, gestite da chi amministra il progetto (SQL editor / service_role): mai dall'app.
create table public.allowed_emails (
  email text primary key check (email = lower(trim(email))),
  note text,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
-- Su Supabase i privilegi di default arrivano ad anon/authenticated: li togliamo, e senza policy la RLS fa il resto.
revoke all on public.allowed_emails from public, anon, authenticated;

-- L'email può creare un account? (allowlist, oppure invito non accettato e non scaduto)
create function public.is_email_admitted(addr text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from allowed_emails where email = lower(trim(addr)))
      or exists (select 1 from invites
                  where lower(trim(email)) = lower(trim(addr))
                    and accepted_at is null and expires_at > now())
$$;
revoke all on function public.is_email_admitted(text) from public, anon, authenticated;

-- Hook chiamato da Supabase Auth prima di creare l'utente. `{}` = via libera; `error` = rifiuto.
-- Se l'hook va in errore Auth rifiuta comunque la registrazione: si fallisce chiusi, mai aperti.
create function public.before_user_created_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if is_email_admitted(event -> 'user' ->> 'email') then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'message', 'Accesso riservato: serve un invito. Chiedi a chi gestisce Ohana di invitarti con questo indirizzo.',
    'http_code', 403
  ));
end $$;

revoke all on function public.before_user_created_hook(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin;
