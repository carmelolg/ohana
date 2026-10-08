-- Ohana — coordinate del luogo di un impegno (scelto da OpenStreetMap).
alter table public.events add column location_lat double precision check (location_lat between -90 and 90);
alter table public.events add column location_lng double precision check (location_lng between -180 and 180);
alter table public.events add constraint events_location_pair check ((location_lat is null) = (location_lng is null));
