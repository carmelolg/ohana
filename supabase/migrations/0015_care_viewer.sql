-- Ohana v3 (Cura) — ruolo per chi deve solo consultare la sezione Cura (es. una badante).
-- Un nuovo valore di enum non si può usare nella stessa transazione in cui nasce: le policy che lo usano sono in 0016.
alter type public.space_role add value if not exists 'care_viewer';
