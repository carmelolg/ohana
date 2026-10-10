-- Ohana — un impegno può essere collegato a una pratica o a una manutenzione: entra nella loro linea del tempo.
-- `events.maintenance_id` resta la «scadenza» generata dalla manutenzione (decide la prossima data e si chiude con
-- «Segna fatta»); questi due sono un collegamento scelto dall'utente e non toccano né l'una né l'altra.
alter table public.events add column linked_procedure_id uuid;
alter table public.events add column linked_maintenance_id uuid;

-- Chiavi composte con lo spazio: il database impedisce di collegare un impegno a una pratica di un altro spazio.
-- Se la pratica o la manutenzione sparisce, l'impegno resta (a differenza della scadenza generata, che segue la manutenzione).
alter table public.events add constraint events_linked_procedure_fk
  foreign key (linked_procedure_id, space_id) references public.procedures (id, space_id)
  on delete set null (linked_procedure_id);
alter table public.events add constraint events_linked_maintenance_fk
  foreign key (linked_maintenance_id, space_id) references public.maintenances (id, space_id)
  on delete set null (linked_maintenance_id);

-- Un solo collegamento per impegno: la schermata offre una scelta sola.
alter table public.events add constraint events_one_link
  check (num_nonnulls(linked_procedure_id, linked_maintenance_id) <= 1);

create index on public.events (linked_procedure_id) where linked_procedure_id is not null;
create index on public.events (linked_maintenance_id) where linked_maintenance_id is not null;
