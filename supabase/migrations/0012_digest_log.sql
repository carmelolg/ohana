-- Ohana v2 — registro dei riepiloghi inviati dal Worker (faccende alle 8:00): uno per utente, giorno e tipo.
create table public.digest_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);
alter table public.digest_log enable row level security;
revoke all on public.digest_log from authenticated, anon;   -- solo il Worker (service role)
