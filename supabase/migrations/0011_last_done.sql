-- Ohana v2 — quando un impegno ricorrente (o una faccenda) è stato fatto l'ultima volta.
-- Serve a mostrare le faccende «fatte oggi» in Oggi anche se la scadenza è già passata alla prossima occorrenza.
alter table public.events add column last_done_at timestamptz;
