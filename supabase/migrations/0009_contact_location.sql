-- Ohana — coordinate dell'indirizzo di un contatto (scelto da OpenStreetMap).
alter table public.contacts add column address_lat double precision check (address_lat between -90 and 90);
alter table public.contacts add column address_lng double precision check (address_lng between -180 and 180);
alter table public.contacts add constraint contacts_address_pair check ((address_lat is null) = (address_lng is null));
