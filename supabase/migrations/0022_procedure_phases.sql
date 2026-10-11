-- Ohana — fasi di un intervento (preventivi, affidamento, lavori, pagamento): importo, ditta ed esito del preventivo per passaggio.
-- Additiva e retrocompatibile: le pratiche esistenti non toccano le nuove colonne (tutte nullable).
alter table public.procedure_steps
  add column amount numeric(12, 2) check (amount is null or amount >= 0),
  add column contact_id uuid references public.contacts (id) on delete set null,
  add column quote_outcome text check (quote_outcome in ('scelto', 'scartato'));

-- un documento (preventivo, conferma d'ordine, fattura) può appartenere a una fase precisa
alter table public.procedure_docs
  add column step_id uuid references public.procedure_steps (id) on delete set null;
create index on public.procedure_docs (step_id);

-- la ditta di una fase deve stare nello stesso spazio della pratica
create or replace function public.check_step_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.event_id is not null and space_of_event(new.event_id) is distinct from space_of_procedure(new.procedure_id) then
    raise exception 'impegno di un altro spazio' using errcode = '23514';
  end if;
  if new.contact_id is not null
     and (select space_id from contacts where id = new.contact_id) is distinct from space_of_procedure(new.procedure_id) then
    raise exception 'contatto di un altro spazio' using errcode = '23514';
  end if;
  return new;
end $$;
