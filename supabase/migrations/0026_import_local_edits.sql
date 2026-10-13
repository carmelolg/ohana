-- Ohana — un impegno importato da un calendario esterno si arricchisce in app.
-- Titolo e orario restano del calendario d'origine; luogo e note si possono cambiare in Ohana: `local_overrides` elenca
-- i campi cambiati a mano, così la sincronizzazione non li riscrive. Svuotarlo = «ripristina dal calendario».
alter table public.events add column local_overrides text[] not null default '{}';
alter table public.events add constraint events_local_overrides_known
  check (local_overrides <@ array['location', 'notes']);
