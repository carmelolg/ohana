-- Ohana — supporto al Worker: tentativi di invio e registro dei brief del mattino.

alter table public.reminder_queue add column attempts int not null default 0;
alter table public.reminder_queue add column event_title text;

create table public.brief_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.brief_log enable row level security;
-- nessuna policy: solo il Worker (service role)
revoke all on public.brief_log from authenticated, anon;

-- Il Worker legge tutto con la service role (bypass RLS); i client non vedono questi dati.
