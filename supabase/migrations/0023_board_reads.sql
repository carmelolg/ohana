-- Ohana — «letto fino a» della bacheca: per ogni utente e spazio, l'istante dell'ultima volta che ha aperto la bacheca.
-- Serve al badge «N nuove» sulla card di Famiglia. È privato: ciascuno vede e scrive solo la propria riga.
create table public.board_reads (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

-- chi è già nello spazio non si ritrova tutte le note vecchie come «nuove»
insert into public.board_reads (space_id, user_id)
select m.space_id, m.user_id from public.space_members m where m.role <> 'care_viewer';

alter table public.board_reads enable row level security;

-- legge e scrive solo la propria riga, e solo negli spazi di cui vede la bacheca (is_member esclude care_viewer)
create policy board_reads_select on public.board_reads for select to authenticated
  using (user_id = auth.uid() and is_member(space_id));
create policy board_reads_insert on public.board_reads for insert to authenticated
  with check (user_id = auth.uid() and is_member(space_id));
create policy board_reads_update on public.board_reads for update to authenticated
  using (user_id = auth.uid() and is_member(space_id)) with check (user_id = auth.uid() and is_member(space_id));

revoke all on public.board_reads from anon;
grant select, insert, update on public.board_reads to authenticated;

-- il badge si aggiorna anche sugli altri dispositivi dello stesso utente
alter publication supabase_realtime add table public.board_reads;
