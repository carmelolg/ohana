-- Ohana v3 — registro dei promemoria delle dosi già inviati (solo il Worker lo usa).
-- La chiave primaria è l'idempotenza: una dose avvisata una volta sola, anche se il cron gira due volte.
create table public.care_dose_log (
  medication_id uuid not null references public.medications (id) on delete cascade,
  day date not null,
  slot text not null,
  sent_at timestamptz not null default now(),
  primary key (medication_id, day, slot)
);

-- RLS attiva e nessuna policy: nessun utente la legge o la scrive, il Worker usa la chiave di servizio.
alter table public.care_dose_log enable row level security;
revoke all on public.care_dose_log from anon, authenticated;
