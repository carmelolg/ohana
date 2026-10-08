-- Ohana — apprendimento leggero delle categorie: ogni volta che si salva un nuovo impegno si registra
-- il testo e la categoria finale (con un flag se l'utente ha corretto il suggerimento).
-- Con queste righe l'app addestra in locale un Naive Bayes per spazio (nessun dato lascia lo spazio).
create table public.category_feedback (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(trim(text)) between 2 and 200),
  -- etichetta stabile: lo slug per le categorie predefinite, «id:<uuid>» per quelle personalizzate
  label text not null check (char_length(label) between 2 and 80),
  corrected boolean not null default false,       -- l'utente ha cambiato il suggerimento
  created_at timestamptz not null default now()
);
create index on public.category_feedback (space_id, created_at desc);

alter table public.category_feedback enable row level security;
create policy feedback_select on public.category_feedback for select to authenticated using (is_member(space_id));
create policy feedback_insert on public.category_feedback for insert to authenticated
  with check (can_write(space_id) and user_id = auth.uid());
-- ognuno cancella le proprie righe; owner e admin possono azzerare l'apprendimento dello spazio
create policy feedback_delete on public.category_feedback for delete to authenticated
  using (is_admin(space_id) or (user_id = auth.uid() and can_write(space_id)));

revoke all on public.category_feedback from anon;
grant select, insert, delete on public.category_feedback to authenticated;
