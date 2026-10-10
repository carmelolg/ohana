-- Test di isolamento RLS. Ogni check fallito lancia un'eccezione; a fine file stampa OK.
\set ON_ERROR_STOP on

-- Utenti: ana (owner Casa), bruno (owner Genitori), carla (viewer in Genitori), dario (estraneo), elena (invitata)
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'ana@test.it',   '{"given_name":"Ana"}'),
 ('00000000-0000-0000-0000-00000000000b', 'bruno@test.it', '{"given_name":"Bruno"}'),
 ('00000000-0000-0000-0000-00000000000c', 'carla@test.it', '{"given_name":"Carla"}'),
 ('00000000-0000-0000-0000-00000000000d', 'dario@test.it', '{"given_name":"Dario"}'),
 ('00000000-0000-0000-0000-00000000000e', 'elena@test.it', '{"given_name":"Elena"}');

create schema t;
create function t.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u, false);
  execute 'set role authenticated';
end $$;

create function t.as_su() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

create function t.expect_error(q text, label text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    return;
  end;
  raise exception 'FAIL (doveva fallire): %', label;
end $$;

create function t.expect_count(q text, n int, label text) returns void language plpgsql as $$
declare got int;
begin
  execute 'select count(*) from (' || q || ') t' into got;
  if got <> n then raise exception 'FAIL %: atteso %, trovato %', label, n, got; end if;
end $$;

grant usage on schema t to public;

-- ---------------------------------------------------------------- setup dati
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into spaces (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Casa mia');
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into spaces (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Mamma e papà');

-- Bruno invita carla come viewer
insert into invites (space_id, email, role, token)
 values ('bbbbbbbb-0000-0000-0000-000000000001', 'carla@test.it', 'viewer', 'tok-carla');
select t.as_su();
insert into space_members values ('bbbbbbbb-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'viewer');

select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into events (space_id, title, starts_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Idraulico', now());
insert into contacts (space_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Mario idraulico');
insert into shopping_lists (id, space_id, name) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Spesa');
insert into shopping_items (list_id, text) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'latte');

select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into events (id, space_id, title, starts_at) values ('bbbbbbbb-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-000000000001', 'Cardiologo', now());
insert into event_reminders (event_id) values ('bbbbbbbb-0000-0000-0000-0000000000e1');

-- ---------------------------------------------------------------- 1. lettura isolata
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_count('select 1 from spaces', 1, 'ana vede solo il suo spazio');
select t.expect_count('select 1 from events', 1, 'ana vede solo i suoi eventi');
select t.expect_count($$select 1 from events where title='Cardiologo'$$, 0, 'ana non vede Cardiologo');
select t.expect_count('select 1 from event_reminders', 0, 'ana non vede promemoria altrui');
select t.expect_count('select 1 from profiles', 1, 'ana vede solo se stessa (nessuno spazio condiviso)');

select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from spaces', 0, 'dario (estraneo) non vede spazi');
select t.expect_count('select 1 from events', 0, 'dario non vede eventi');
select t.expect_count('select 1 from contacts', 0, 'dario non vede contatti');
select t.expect_count('select 1 from shopping_items', 0, 'dario non vede la spesa');
select t.expect_count('select 1 from space_members', 0, 'dario non vede membri');
select t.expect_count('select 1 from invites', 0, 'dario non vede inviti');

-- ---------------------------------------------------------------- 2. scritture cross-spazio bloccate
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_error($$insert into events (space_id, title, starts_at) values ('aaaaaaaa-0000-0000-0000-000000000001','x',now())$$, 'dario scrive in spazio altrui');
select t.expect_error($$insert into shopping_items (list_id, text) values ('aaaaaaaa-0000-0000-0000-0000000000f1','x')$$, 'dario aggiunge item a lista altrui');
select t.expect_error($$insert into space_members values ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000d','owner')$$, 'auto-aggiunta come owner');
select t.expect_error($$insert into invites (space_id,email) values ('aaaaaaaa-0000-0000-0000-000000000001','dario@test.it')$$, 'auto-invito');
update events set title = 'hack';  -- 0 righe, nessun errore
select t.as_su();
select t.expect_count($$select 1 from events where title='hack'$$, 0, 'update cross-spazio non applicato');
select t.as_user('00000000-0000-0000-0000-00000000000d');
delete from spaces;
delete from events;
select t.as_su();
select t.expect_count('select 1 from spaces', 2, 'delete cross-spazio non applicato');
select t.expect_count('select 1 from events', 2, 'delete eventi cross-spazio non applicato');

-- Sposta evento in spazio altrui (WITH CHECK)
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_error($$update events set space_id='bbbbbbbb-0000-0000-0000-000000000001'$$, 'sposta evento in spazio altrui');

-- ---------------------------------------------------------------- 3. viewer solo lettura
select t.as_user('00000000-0000-0000-0000-00000000000c');
select t.expect_count('select 1 from events', 1, 'viewer legge eventi del suo spazio');
select t.expect_count('select 1 from events where title=''Idraulico''', 0, 'viewer non vede altri spazi');
select t.expect_error($$insert into events (space_id, title, starts_at) values ('bbbbbbbb-0000-0000-0000-000000000001','x',now())$$, 'viewer non scrive eventi');
select t.expect_error($$insert into event_reminders (event_id) values ('bbbbbbbb-0000-0000-0000-0000000000e1')$$, 'viewer non scrive promemoria');
select t.expect_error($$insert into contacts (space_id,name) values ('bbbbbbbb-0000-0000-0000-000000000001','x')$$, 'viewer non scrive contatti');
update events set title='hack';
delete from events;
select t.as_su();
select t.expect_count($$select 1 from events where title='Cardiologo'$$, 1, 'viewer non modifica/cancella');

-- ---------------------------------------------------------------- 4. ruoli e membri
select t.as_user('00000000-0000-0000-0000-00000000000b');
select t.expect_count('select 1 from space_members', 2, 'owner vede i membri');
select t.expect_count('select 1 from profiles', 2, 'owner vede profili dei co-membri');
select t.expect_error($$update space_members set role='member' where user_id='00000000-0000-0000-0000-00000000000b'$$, 'ultimo owner non declassabile');
select t.expect_error($$delete from space_members where user_id='00000000-0000-0000-0000-00000000000b'$$, 'ultimo owner non può uscire');

-- carla (viewer) non può auto-promuoversi
select t.as_user('00000000-0000-0000-0000-00000000000c');
update space_members set role='owner' where user_id='00000000-0000-0000-0000-00000000000c';
select t.as_su();
select t.expect_count($$select 1 from space_members where role='viewer'$$, 1, 'viewer non si promuove');

-- admin non può creare owner né toccare owner
select t.as_user('00000000-0000-0000-0000-00000000000b');
update space_members set role='admin' where user_id='00000000-0000-0000-0000-00000000000c';
select t.as_user('00000000-0000-0000-0000-00000000000c');
select t.expect_error($$insert into invites (space_id,email,role) values ('bbbbbbbb-0000-0000-0000-000000000001','x@test.it','owner')$$, 'invito owner vietato');
update space_members set role='owner' where user_id='00000000-0000-0000-0000-00000000000c';
delete from space_members where user_id='00000000-0000-0000-0000-00000000000b';
select t.as_su();
select t.expect_count($$select 1 from space_members where role='owner'$$, 2, 'admin non crea/rimuove owner (2 owner totali = ana + bruno)');
select t.expect_count($$select 1 from space_members where user_id='00000000-0000-0000-0000-00000000000c' and role='admin'$$, 1, 'carla è admin, non owner');

-- admin può invitare e rimuovere member
select t.as_user('00000000-0000-0000-0000-00000000000c');
insert into invites (space_id, email, role, token) values ('bbbbbbbb-0000-0000-0000-000000000001','elena@test.it','member','tok-elena');

-- ---------------------------------------------------------------- 5. inviti
-- anon: nessun accesso diretto alle tabelle, solo anteprima via RPC
select t.as_su();
set role anon;
select t.expect_error('select * from invites', 'anon non legge inviti');
select t.expect_error('select * from spaces', 'anon non legge spazi');
select t.expect_count($$select * from get_invite_preview('tok-elena')$$, 1, 'anon vede anteprima invito');
select t.expect_count($$select * from get_invite_preview('inesistente')$$, 0, 'token inesistente');
select t.expect_error($$select accept_invite('tok-elena')$$, 'anon non accetta inviti');
reset role;

-- dario non può usare l'invito di elena (email diversa)
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_error($$select accept_invite('tok-elena')$$, 'invito con email diversa rifiutato');
select t.expect_count('select 1 from spaces', 0, 'dario ancora senza spazi');

-- elena accetta: entra solo in Genitori
select t.as_user('00000000-0000-0000-0000-00000000000e');
select accept_invite('tok-elena');
select t.expect_count('select 1 from spaces', 1, 'elena vede solo lo spazio invitato');
select t.expect_count($$select 1 from spaces where name='Casa mia'$$, 0, 'elena non vede Casa mia');
select t.expect_count('select 1 from events', 1, 'elena vede eventi di Genitori');
select t.expect_error($$select accept_invite('tok-elena')$$, 'invito monouso');

-- invito scaduto
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into invites (space_id, email, token, expires_at) values ('bbbbbbbb-0000-0000-0000-000000000001','dario@test.it','tok-old', now() - interval '1 day');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_error($$select accept_invite('tok-old')$$, 'invito scaduto rifiutato');

-- ---------------------------------------------------------------- 6. integrità tra spazi
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_error($$insert into events (space_id, title, starts_at, assignee_id) values ('aaaaaaaa-0000-0000-0000-000000000001','x',now(),'00000000-0000-0000-0000-00000000000b')$$, 'assegnatario non membro');
-- contatto di un altro spazio
select t.as_su();
insert into contacts (id, space_id, name) values ('bbbbbbbb-0000-0000-0000-0000000000c1','bbbbbbbb-0000-0000-0000-000000000001','Dott. Rossi');
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_error($$insert into events (space_id, title, starts_at, contact_id) values ('aaaaaaaa-0000-0000-0000-000000000001','x',now(),'bbbbbbbb-0000-0000-0000-0000000000c1')$$, 'contatto di altro spazio');

-- spese: pagante e quote devono essere membri
select t.as_user('00000000-0000-0000-0000-00000000000b');
select t.expect_error($$insert into expenses (space_id, payer_id, amount, description) values ('bbbbbbbb-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000d',10,'x')$$, 'pagante non membro');
insert into expenses (id, space_id, payer_id, amount, description) values ('bbbbbbbb-0000-0000-0000-0000000000d1','bbbbbbbb-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b',30,'ticket');
select t.expect_error($$insert into expense_shares values ('bbbbbbbb-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000000d',10)$$, 'quota a non membro');
insert into expense_shares values ('bbbbbbbb-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000000b',15),('bbbbbbbb-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000000e',15);
select t.expect_error($$insert into settlements (space_id, from_id, to_id, amount) values ('bbbbbbbb-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000b',5)$$, 'saldo con non membro');

select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from expenses', 0, 'dario non vede spese');
select t.expect_count('select 1 from expense_shares', 0, 'dario non vede quote');
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_count('select 1 from expenses', 0, 'ana non vede spese altrui');

-- ---------------------------------------------------------------- 7. dati personali e coda
select t.as_su();
insert into push_subscriptions (user_id, endpoint, keys) values ('00000000-0000-0000-0000-00000000000a','https://push/a','{}');
insert into calendar_feeds (user_id, token) values ('00000000-0000-0000-0000-00000000000a','feed-a');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from push_subscriptions', 0, 'push altrui invisibili');
select t.expect_count('select 1 from calendar_feeds', 0, 'feed altrui invisibili');
select t.expect_error($$insert into calendar_feeds (user_id, space_id) values ('00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000001')$$, 'feed su spazio altrui');
select t.expect_error($$insert into reminder_queue (event_id, occurrence_at, send_at, user_id, channel) values ('bbbbbbbb-0000-0000-0000-0000000000e1', now(), now(), '00000000-0000-0000-0000-00000000000d', 'email')$$, 'client non scrive reminder_queue');
update profiles set first_name = 'X' where id <> '00000000-0000-0000-0000-00000000000d';
select t.as_su();
select t.expect_count($$select 1 from profiles where first_name='X'$$, 0, 'profili altrui non modificabili');

-- ---------------------------------------------------------------- 8. uscita e cancellazione spazio
select t.as_user('00000000-0000-0000-0000-00000000000e');
delete from space_members where user_id = '00000000-0000-0000-0000-00000000000e';
select t.expect_count('select 1 from events', 0, 'elena uscita: non vede più nulla');
select t.as_user('00000000-0000-0000-0000-00000000000c');
delete from spaces;
select t.as_su();
select t.expect_count('select 1 from spaces', 2, 'admin non cancella lo spazio');
select t.as_user('00000000-0000-0000-0000-00000000000b');
delete from spaces;
select t.as_su();
select t.expect_count('select 1 from spaces', 1, 'owner cancella lo spazio');
select t.expect_count('select 1 from events', 1, 'cascade eventi');
select t.expect_count('select 1 from expenses', 0, 'cascade spese');

-- ---------------------------------------------------------------- 9. storage
select t.as_su();
insert into spaces (id, name, created_by) values ('cccccccc-0000-0000-0000-000000000001','Storage','00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values ('attachments','cccccccc-0000-0000-0000-000000000001/e/referto.pdf');
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_count($$select 1 from storage.objects where bucket_id='attachments'$$, 1, 'membro legge allegati');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count($$select 1 from storage.objects where bucket_id='attachments'$$, 0, 'estraneo non legge allegati');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('attachments','cccccccc-0000-0000-0000-000000000001/e/x.pdf')$$, 'estraneo non carica allegati');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('avatars','00000000-0000-0000-0000-00000000000a/me.png')$$, 'avatar in cartella altrui');
insert into storage.objects (bucket_id, name) values ('avatars','00000000-0000-0000-0000-00000000000d/me.png');

-- ---------------------------------------------------------------- 10. categorie
select t.as_su();
select t.expect_count($$select 1 from categories where space_id='aaaaaaaa-0000-0000-0000-000000000001' and slug is not null$$, 6, 'spazio nuovo: 6 categorie predefinite');
select t.expect_count($$select 1 from events where category_id is null$$, 0, 'ogni evento ha una categoria');
select t.expect_count($$select 1 from events e join categories c on c.id = e.category_id where e.space_id <> c.space_id$$, 0, 'categoria sempre dello stesso spazio');

select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into spaces (id, name) values ('dddddddd-0000-0000-0000-000000000001', 'Altro spazio');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from categories', 0, 'estraneo non vede categorie');
select t.expect_error($$insert into categories (space_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001','Hack')$$, 'estraneo non crea categorie');

select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into categories (id, space_id, name, keywords) values ('aaaaaaaa-0000-0000-0000-0000000000ca','aaaaaaaa-0000-0000-0000-000000000001','Animali','{veterinario,cane}');
select t.expect_error($$insert into categories (space_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001','animali')$$, 'nome duplicato (case-insensitive)');
select t.expect_error($$insert into categories (space_id, name, slug) values ('aaaaaaaa-0000-0000-0000-000000000001','Finta','scadenza')$$, 'slug riservato agli predefiniti');
select t.expect_error($$update categories set slug = 'x' where name = 'Visita' and space_id='aaaaaaaa-0000-0000-0000-000000000001'$$, 'slug immutabile');
select t.expect_error($$delete from categories where slug = 'altro' and space_id='aaaaaaaa-0000-0000-0000-000000000001'$$, 'predefinita non eliminabile');
select t.expect_error($$update events set category_id = (select id from categories where space_id='dddddddd-0000-0000-0000-000000000001' and slug='altro') where space_id='aaaaaaaa-0000-0000-0000-000000000001'$$, 'categoria di un altro spazio');
update events set category_id = 'aaaaaaaa-0000-0000-0000-0000000000ca' where space_id='aaaaaaaa-0000-0000-0000-000000000001';
select t.expect_count($$select 1 from events where category_id='aaaaaaaa-0000-0000-0000-0000000000ca'$$, 1, 'evento in categoria personalizzata');
delete from categories where id = 'aaaaaaaa-0000-0000-0000-0000000000ca';
select t.expect_count($$select 1 from events e join categories c on c.id=e.category_id where c.slug='altro' and e.space_id='aaaaaaaa-0000-0000-0000-000000000001'$$, 1, 'eliminata: gli impegni passano ad Altro');

-- chi non è membro non scrive e non legge
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_error($$insert into categories (space_id, name) values ('dddddddd-0000-0000-0000-000000000001','Mia')$$, 'non membro non scrive');
select t.expect_count($$select 1 from categories where space_id='dddddddd-0000-0000-0000-000000000001'$$, 0, 'non membro non legge');

-- ================================================================ 11. v2: faccende, bacheca, diario, emergenza, manutenzioni, pratiche, documenti
select t.as_su();
insert into space_members values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'viewer');   -- elena: sola lettura in «Casa mia»
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into events (id, space_id, title, starts_at) values ('aaaaaaaa-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-000000000001', 'Visita cardiologica', now());
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into events (id, space_id, title, starts_at) values ('dddddddd-0000-0000-0000-0000000000e1', 'dddddddd-0000-0000-0000-000000000001', 'Evento altrui', now());

-- ---- faccende: assegnatario, solo giorno, ricorrenza obbligatori
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_error($$insert into events (space_id, title, starts_at, kind, all_day, rrule) values ('aaaaaaaa-0000-0000-0000-000000000001','Plastica',now(),'faccenda',true,'FREQ=WEEKLY;BYDAY=TH')$$, 'faccenda senza assegnatario');
select t.expect_error($$insert into events (space_id, title, starts_at, kind, assignee_id, rrule) values ('aaaaaaaa-0000-0000-0000-000000000001','Plastica',now(),'faccenda','00000000-0000-0000-0000-00000000000a','FREQ=WEEKLY;BYDAY=TH')$$, 'faccenda con orario');
select t.expect_error($$insert into events (space_id, title, starts_at, kind, assignee_id, all_day) values ('aaaaaaaa-0000-0000-0000-000000000001','Plastica',now(),'faccenda','00000000-0000-0000-0000-00000000000a',true)$$, 'faccenda senza ricorrenza');
insert into events (id, space_id, title, starts_at, kind, assignee_id, all_day, rrule) values ('aaaaaaaa-0000-0000-0000-0000000000e3', 'aaaaaaaa-0000-0000-0000-000000000001', 'Plastica', now(), 'faccenda', '00000000-0000-0000-0000-00000000000a', true, 'FREQ=WEEKLY;BYDAY=TH');
select t.expect_count($$select 1 from events where kind = 'faccenda'$$, 1, 'faccenda valida salvata');
select t.expect_count($$select 1 from events where kind = 'appuntamento' and id = 'aaaaaaaa-0000-0000-0000-0000000000e2'$$, 1, 'default appuntamento');

-- ---- bacheca
insert into board_notes (id, space_id, text) values ('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Le chiavi le ho io fino a domenica');
select t.expect_error($$insert into board_notes (space_id, text) values ('aaaaaaaa-0000-0000-0000-000000000001', repeat('x', 281))$$, 'nota oltre 280 caratteri');
select t.expect_error($$insert into board_notes (space_id, text) values ('aaaaaaaa-0000-0000-0000-000000000001', '   ')$$, 'nota vuota');
select t.expect_error($$insert into board_notes (space_id, text, author_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'finta', '00000000-0000-0000-0000-00000000000b')$$, 'autore falsificato');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count('select 1 from board_notes', 1, 'viewer legge la bacheca');
select t.expect_error($$insert into board_notes (space_id, text) values ('aaaaaaaa-0000-0000-0000-000000000001', 'io no')$$, 'viewer non scrive in bacheca');
update board_notes set text = 'hack';
delete from board_notes;
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from board_notes', 0, 'estraneo non vede la bacheca');
select t.expect_error($$insert into board_notes (space_id, text) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x')$$, 'estraneo non scrive in bacheca');
select t.as_su();
select t.expect_count($$select 1 from board_notes where text = 'Le chiavi le ho io fino a domenica'$$, 1, 'viewer non modifica/cancella la bacheca');

-- ---- diario visite
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into visit_notes (id, event_id, text) values ('aaaaaaaa-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-0000000000e2', 'Pressione nella norma');
insert into follow_ups (id, event_id, title, due_hint) values ('aaaaaaaa-0000-0000-0000-0000000000f3', 'aaaaaaaa-0000-0000-0000-0000000000e2', 'Holter 24 h', 'entro 31 dic');
select t.expect_error($$insert into follow_ups (event_id, title, created_event_id) values ('aaaaaaaa-0000-0000-0000-0000000000e2', 'x', 'dddddddd-0000-0000-0000-0000000000e1')$$, 'prossimo passo con impegno di un altro spazio');
select t.expect_error($$insert into visit_notes (event_id, text, author_id) values ('aaaaaaaa-0000-0000-0000-0000000000e2', 'x', '00000000-0000-0000-0000-00000000000b')$$, 'autore nota falsificato');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from visit_notes', 0, 'estraneo non legge il diario');
select t.expect_count('select 1 from follow_ups', 0, 'estraneo non legge i prossimi passi');
select t.expect_error($$insert into visit_notes (event_id, text) values ('aaaaaaaa-0000-0000-0000-0000000000e2', 'x')$$, 'estraneo non scrive nel diario');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count('select 1 from visit_notes', 1, 'viewer legge il diario');
select t.expect_error($$insert into follow_ups (event_id, title) values ('aaaaaaaa-0000-0000-0000-0000000000e2', 'x')$$, 'viewer non scrive prossimi passi');

-- ---- emergenza
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into emergency_info (space_id, contacts, address, allergies) values ('aaaaaaaa-0000-0000-0000-000000000001', '[{"name":"Dott.ssa Neri","role":"Medico","phone":"0811234567"}]', 'Via Garibaldi 14', 'Penicillina');
select t.expect_error($$insert into emergency_info (space_id, contacts) values ('dddddddd-0000-0000-0000-000000000001', '[]')$$, 'emergenza su spazio altrui');
select t.expect_error($$update emergency_info set contacts = '{"a":1}' where space_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'contatti non-array');
select t.as_su();
select t.expect_count($$select 1 from emergency_info where updated_by = '00000000-0000-0000-0000-00000000000a'$$, 1, 'updated_by valorizzato dal trigger');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from emergency_info', 0, 'estraneo non vede l''emergenza');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count('select 1 from emergency_info', 1, 'viewer legge l''emergenza');
update emergency_info set address = 'hack';
select t.as_su();
select t.expect_count($$select 1 from emergency_info where address = 'Via Garibaldi 14'$$, 1, 'viewer non modifica l''emergenza');

-- ---- manutenzioni
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into contacts (id, space_id, name) values ('dddddddd-0000-0000-0000-0000000000c1', 'dddddddd-0000-0000-0000-000000000001', 'Idraulico di Bruno');
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into maintenances (id, space_id, title, rrule, template_key) values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Revisione caldaia', 'FREQ=YEARLY;BYMONTH=11', 'caldaia');
select t.expect_error($$insert into maintenances (space_id, title, rrule, contact_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'FREQ=YEARLY', 'dddddddd-0000-0000-0000-0000000000c1')$$, 'manutenzione con contatto di un altro spazio');
insert into events (id, space_id, title, starts_at, maintenance_id) values ('aaaaaaaa-0000-0000-0000-0000000000e4', 'aaaaaaaa-0000-0000-0000-000000000001', 'Revisione caldaia', now() + interval '30 days', 'aaaaaaaa-0000-0000-0000-0000000000a1');
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into maintenances (id, space_id, title, rrule) values ('dddddddd-0000-0000-0000-0000000000a1', 'dddddddd-0000-0000-0000-000000000001', 'Altrui', 'FREQ=YEARLY');
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_error($$insert into events (space_id, title, starts_at, maintenance_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', now(), 'dddddddd-0000-0000-0000-0000000000a1')$$, 'evento collegato a manutenzione di un altro spazio');
select t.expect_count('select 1 from maintenances', 1, 'ana vede solo le sue manutenzioni');
insert into maintenance_log (id, space_id, maintenance_id, done_on, cost) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', '2026-11-05', 120);
select t.expect_error($$insert into maintenance_log (space_id, maintenance_id, done_on) values ('aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-0000000000a1', '2026-11-05')$$, 'registro con manutenzione di un altro spazio');
select t.expect_error($$insert into maintenance_log (space_id, maintenance_id, done_on, contact_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', '2026-11-05', 'dddddddd-0000-0000-0000-0000000000c1')$$, 'registro con contatto di un altro spazio');
select t.expect_count('select 1 from maintenance_log', 1, 'ana vede il registro delle sue manutenzioni');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from maintenances', 0, 'estraneo non vede le manutenzioni');
select t.expect_count('select 1 from maintenance_log', 0, 'estraneo non vede il registro');
select t.expect_error($$insert into maintenance_log (space_id, maintenance_id, done_on) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', '2026-11-06')$$, 'estraneo non scrive nel registro');
select t.expect_error($$insert into maintenances (space_id, title, rrule) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'FREQ=YEARLY')$$, 'estraneo non crea manutenzioni');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_error($$insert into maintenances (space_id, title, rrule) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'FREQ=YEARLY')$$, 'viewer non crea manutenzioni');
select t.expect_error($$insert into maintenance_log (space_id, maintenance_id, done_on) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', '2026-11-06')$$, 'viewer non scrive nel registro');
delete from maintenances;
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_count('select 1 from maintenances', 1, 'viewer non elimina manutenzioni');

-- ---- pratiche
insert into procedures (id, space_id, title, owner_id, due_date) values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-000000000001', 'ISEE 2027', '00000000-0000-0000-0000-00000000000a', current_date + 90);
select t.expect_error($$insert into procedures (space_id, title, owner_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', '00000000-0000-0000-0000-00000000000d')$$, 'responsabile non membro');
select t.expect_error($$insert into procedures (space_id, title, status) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'boh')$$, 'stato non valido');
insert into procedure_steps (id, procedure_id, position, title) values ('aaaaaaaa-0000-0000-0000-0000000000d2', 'aaaaaaaa-0000-0000-0000-0000000000d1', 0, 'Raccogliere documenti');
select t.expect_error($$insert into procedure_steps (procedure_id, position, title, event_id) values ('aaaaaaaa-0000-0000-0000-0000000000d1', 1, 'x', 'dddddddd-0000-0000-0000-0000000000e1')$$, 'passaggio con impegno di un altro spazio');
update procedure_steps set event_id = 'aaaaaaaa-0000-0000-0000-0000000000e2' where id = 'aaaaaaaa-0000-0000-0000-0000000000d2';
-- ---- impegni collegati a pratiche e manutenzioni
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into procedures (id, space_id, title) values ('dddddddd-0000-0000-0000-0000000000d1', 'dddddddd-0000-0000-0000-000000000001', 'Pratica altrui');
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_error($$update events set linked_procedure_id = 'dddddddd-0000-0000-0000-0000000000d1' where id = 'aaaaaaaa-0000-0000-0000-0000000000e2'$$, 'collegare a una pratica di un altro spazio');
update events set linked_procedure_id = 'aaaaaaaa-0000-0000-0000-0000000000d1' where id = 'aaaaaaaa-0000-0000-0000-0000000000e2';
select t.expect_count($$select 1 from events where linked_procedure_id = 'aaaaaaaa-0000-0000-0000-0000000000d1'$$, 1, 'impegno collegato alla pratica');
select t.expect_error($$update events set linked_maintenance_id = 'aaaaaaaa-0000-0000-0000-0000000000a1' where id = 'aaaaaaaa-0000-0000-0000-0000000000e2'$$, 'un solo collegamento per impegno');
update events set linked_procedure_id = null, linked_maintenance_id = 'aaaaaaaa-0000-0000-0000-0000000000a1' where id = 'aaaaaaaa-0000-0000-0000-0000000000e2';
select t.expect_count($$select 1 from events where linked_maintenance_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'$$, 1, 'impegno collegato alla manutenzione');
select t.expect_error($$update events set linked_maintenance_id = 'dddddddd-0000-0000-0000-0000000000a1' where id = 'aaaaaaaa-0000-0000-0000-0000000000e2'$$, 'collegare a una manutenzione di un altro spazio');
update events set linked_maintenance_id = null where id = 'aaaaaaaa-0000-0000-0000-0000000000e2';
insert into procedure_docs (procedure_id, name) values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'Carta identità');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from procedures', 0, 'estraneo non vede le pratiche');
select t.expect_count('select 1 from procedure_steps', 0, 'estraneo non vede i passaggi');
select t.expect_count('select 1 from procedure_docs', 0, 'estraneo non vede i documenti richiesti');
select t.expect_error($$insert into procedure_steps (procedure_id, position, title) values ('aaaaaaaa-0000-0000-0000-0000000000d1', 9, 'x')$$, 'estraneo non aggiunge passaggi');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count('select 1 from procedure_steps', 1, 'viewer legge i passaggi');
select t.expect_error($$insert into procedure_docs (procedure_id, name) values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'x')$$, 'viewer non aggiunge documenti');
update procedure_steps set done_at = now();
select t.as_su();
select t.expect_count($$select 1 from procedure_steps where done_at is not null$$, 0, 'viewer non completa passaggi');

-- ---- allegati e documenti (anche senza impegno)
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into attachments (id, space_id, path, name) values ('aaaaaaaa-0000-0000-0000-0000000000f4', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/doc/bolletta.pdf', 'Bolletta.pdf');
select t.expect_error($$insert into attachments (space_id, path, name) values ('dddddddd-0000-0000-0000-000000000001', 'x', 'x')$$, 'allegato in spazio altrui');
select t.expect_error($$insert into attachments (path, name) values ('x', 'x')$$, 'allegato senza spazio');
insert into attachments (id, event_id, space_id, path, name) values ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-0000000000e2', 'dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/e/referto.pdf', 'Referto.pdf');
select t.as_su();
select t.expect_count($$select 1 from attachments where id = 'aaaaaaaa-0000-0000-0000-0000000000f5' and space_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 1, 'allegato di impegno: lo spazio è sempre quello dell''impegno');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from attachments', 0, 'estraneo non vede gli allegati');
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into attachments (id, space_id, path, name) values ('dddddddd-0000-0000-0000-0000000000f4', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001/x.pdf', 'Altrui.pdf');
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into documents (id, space_id, title, folder, attachment_id, doc_type, extracted_json, expires_at) values ('aaaaaaaa-0000-0000-0000-0000000000dc', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bolletta luce', 'Bollette', 'aaaaaaaa-0000-0000-0000-0000000000f4', 'bolletta', '{"amount":84.2}', current_date + 10);
select t.expect_error($$insert into documents (space_id, title, attachment_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'dddddddd-0000-0000-0000-0000000000f4')$$, 'documento con allegato di un altro spazio');
insert into procedure_docs (procedure_id, name, attachment_id) values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'Bolletta', 'aaaaaaaa-0000-0000-0000-0000000000f4');
select t.expect_error($$insert into procedure_docs (procedure_id, name, attachment_id) values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'x', 'dddddddd-0000-0000-0000-0000000000f4')$$, 'documento pratica con allegato di un altro spazio');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from documents', 0, 'estraneo non vede i documenti');
select t.expect_error($$insert into documents (space_id, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x')$$, 'estraneo non crea documenti');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count('select 1 from documents', 1, 'viewer legge i documenti');
select t.expect_error($$insert into documents (space_id, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x')$$, 'viewer non crea documenti');
delete from documents;
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_count('select 1 from documents', 1, 'viewer non elimina documenti');

-- ---- cascate: eliminare lo spazio elimina tutto
delete from spaces where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.as_su();
select t.expect_count($$select 1 from board_notes where space_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0, 'cascade bacheca');
select t.expect_count($$select 1 from maintenances where space_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0, 'cascade manutenzioni');
select t.expect_count($$select 1 from maintenance_log where space_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0, 'cascade registro manutenzioni');
select t.expect_count($$select 1 from procedure_steps$$, 0, 'cascade passaggi');
select t.expect_count($$select 1 from documents where space_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0, 'cascade documenti');
select t.expect_count($$select 1 from emergency_info where space_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 0, 'cascade emergenza');

-- ---- 12. apprendimento categorie (category_feedback)
select t.as_su();
insert into spaces (id, name, created_by) values ('eeeeeeee-0000-0000-0000-000000000001', 'Apprendimento', '00000000-0000-0000-0000-00000000000a');
insert into space_members values ('eeeeeeee-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'viewer');
select t.as_user('00000000-0000-0000-0000-00000000000a');
insert into category_feedback (id, space_id, text, label, corrected) values ('eeeeeeee-0000-0000-0000-0000000000f1', 'eeeeeeee-0000-0000-0000-000000000001', 'allenamento Sofia', 'id:sport', true);
select t.expect_error($$insert into category_feedback (space_id, text, label) values ('eeeeeeee-0000-0000-0000-000000000001', 'x', 'altro')$$, 'testo troppo corto');
select t.expect_error($$insert into category_feedback (space_id, text, label, user_id) values ('eeeeeeee-0000-0000-0000-000000000001', 'finto autore', 'altro', '00000000-0000-0000-0000-00000000000b')$$, 'autore falsificato');
select t.expect_error($$update category_feedback set label = 'visita'$$, 'le righe non si modificano');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from category_feedback', 0, 'estraneo non legge le correzioni');
select t.expect_error($$insert into category_feedback (space_id, text, label) values ('eeeeeeee-0000-0000-0000-000000000001', 'intruso qui', 'altro')$$, 'estraneo non scrive correzioni');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count('select 1 from category_feedback', 1, 'viewer legge le correzioni');
select t.expect_error($$insert into category_feedback (space_id, text, label) values ('eeeeeeee-0000-0000-0000-000000000001', 'viewer no', 'altro')$$, 'viewer non scrive correzioni');
delete from category_feedback;
select t.as_su();
select t.expect_count($$select 1 from category_feedback$$, 1, 'viewer non cancella le correzioni');
select t.as_user('00000000-0000-0000-0000-00000000000a');
delete from category_feedback;
select t.as_su();
select t.expect_count($$select 1 from category_feedback$$, 0, 'owner azzera l''apprendimento');

-- ---------------------------------------------------------------- 13. Cura
-- Spazio «Mamma e papà»: bruno owner, carla membro (caregiver), elena care_viewer (sola consultazione), dario estraneo, ana di un altro spazio.
select t.as_su();
insert into spaces (id, name, created_by) values ('ffffffff-0000-0000-0000-000000000001', 'Mamma e papà cura', '00000000-0000-0000-0000-00000000000b');
insert into space_members values
 ('ffffffff-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'member'),
 ('ffffffff-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'care_viewer');
insert into events (id, space_id, title, starts_at, created_by) values ('ffffffff-0000-0000-0000-0000000000e1', 'ffffffff-0000-0000-0000-000000000001', 'Gastroenterologa', now() + interval '3 days', '00000000-0000-0000-0000-00000000000b');
insert into expenses (space_id, payer_id, amount, description) values ('ffffffff-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 10, 'Ticket');

-- ---- persone assistite e caregiver
select t.as_user('00000000-0000-0000-0000-00000000000b');
insert into care_recipients (id, space_id, first_name, last_name, label, caregiver_ids, duty_user_id)
 values ('ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-000000000001', 'Giorgio', 'Moretti', 'Papà',
         array['00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c']::uuid[], '00000000-0000-0000-0000-00000000000c');
select t.expect_error($$insert into care_recipients (space_id, first_name, caregiver_ids) values ('ffffffff-0000-0000-0000-000000000001', 'X', array['00000000-0000-0000-0000-00000000000d']::uuid[])$$, 'caregiver estraneo allo spazio');
select t.expect_error($$insert into care_recipients (space_id, first_name, caregiver_ids) values ('ffffffff-0000-0000-0000-000000000001', 'X', array['00000000-0000-0000-0000-00000000000e']::uuid[])$$, 'care_viewer non può essere caregiver');
select t.expect_error($$insert into care_recipients (space_id, first_name, caregiver_ids, duty_user_id) values ('ffffffff-0000-0000-0000-000000000001', 'X', array['00000000-0000-0000-0000-00000000000b']::uuid[], '00000000-0000-0000-0000-00000000000c')$$, 'caregiver di turno fuori dall''elenco');
select t.expect_error($$insert into care_recipients (space_id, first_name, created_by) values ('ffffffff-0000-0000-0000-000000000001', 'X', '00000000-0000-0000-0000-00000000000c')$$, 'autore falsificato');
select t.expect_error($$insert into care_recipients (space_id, first_name, user_id) values ('ffffffff-0000-0000-0000-000000000001', 'X', '00000000-0000-0000-0000-00000000000d')$$, 'persona collegata estranea allo spazio');
insert into care_recipients (id, space_id, first_name, user_id) values ('ffffffff-0000-0000-0000-0000000000a3', 'ffffffff-0000-0000-0000-000000000001', 'Elena', '00000000-0000-0000-0000-00000000000c');
select t.expect_error($$insert into care_recipients (space_id, first_name, user_id) values ('ffffffff-0000-0000-0000-000000000001', 'Elena bis', '00000000-0000-0000-0000-00000000000c')$$, 'stesso membro due volte nello spazio');
delete from care_recipients where id = 'ffffffff-0000-0000-0000-0000000000a3';

-- ---- filoni, tasselli, terapie, parametri, preparazione visita
insert into care_threads (id, space_id, recipient_id, title, specialty, color_hue) values
 ('ffffffff-0000-0000-0000-0000000000b1', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'Tachicardia', 'Cardiologia', 20),
 ('ffffffff-0000-0000-0000-0000000000b2', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'Morbo di Crohn', 'Gastroenterologia', 195);
insert into care_entries (id, space_id, recipient_id, thread_id, type, entry_date, title, readings)
 values ('ffffffff-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'visita', current_date, 'Controllo', '{"blood_pressure":"132/80"}');
insert into medications (id, space_id, recipient_id, thread_id, name, dose_units, schedule, stock_units)
 values ('ffffffff-0000-0000-0000-0000000000d1', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'Bisoprololo', 2, array['08:00'], 10);
insert into measurements (space_id, recipient_id, thread_id, type, value, value2) values
 ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'blood_pressure', 132, 80);
insert into visit_prep (id, space_id, event_id, thread_id, bring) values
 ('ffffffff-0000-0000-0000-0000000000f1', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000e1', 'ffffffff-0000-0000-0000-0000000000b2', '[{"text":"Tessera sanitaria","done":false}]');
insert into care_files (space_id, recipient_id, entry_id, name, path) values
 ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000c1', 'Referto.pdf', 'ffffffff-0000-0000-0000-000000000001/ffffffff-0000-0000-0000-0000000000a1/referto.pdf');
insert into care_audit (space_id, recipient_id, thread_id, action) values
 ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'view');

-- integrità: tutto resta dentro lo stesso spazio e la stessa persona
select t.as_su();
insert into care_recipients (id, space_id, first_name, created_by) values ('ffffffff-0000-0000-0000-0000000000a2', 'ffffffff-0000-0000-0000-000000000001', 'Anna', '00000000-0000-0000-0000-00000000000b');
select t.as_user('00000000-0000-0000-0000-00000000000b');
select t.expect_error($$insert into care_entries (space_id, recipient_id, thread_id, type, entry_date, title) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a2', 'ffffffff-0000-0000-0000-0000000000b1', 'nota', current_date, 'filone di un''altra persona')$$, 'tassello su un filone di un''altra persona');
select t.expect_error($$insert into medications (space_id, recipient_id, thread_id, name) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a2', 'ffffffff-0000-0000-0000-0000000000b1', 'Farmaco')$$, 'farmaco su un filone di un''altra persona');
select t.expect_error($$insert into care_threads (space_id, recipient_id, title) values ('bbbbbbbb-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'altro spazio')$$, 'filone in uno spazio diverso dalla persona');
select t.expect_error($$insert into care_entries (space_id, recipient_id, thread_id, type, entry_date, title, event_id) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'visita', current_date, 'x', 'bbbbbbbb-0000-0000-0000-0000000000e1')$$, 'tassello collegato a un impegno di un altro spazio');
select t.expect_error($$insert into care_entries (space_id, recipient_id, thread_id, type, entry_date, title) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'diagnosi', current_date, 'tipo non valido')$$, 'tipo di tassello non valido');
select t.expect_error($$insert into medications (space_id, recipient_id, name, schedule) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'Orario', array['25:99'])$$, 'orario non valido');
select t.as_su();
insert into events (id, space_id, title, starts_at, created_by) values ('eeeeeeee-0000-0000-0000-0000000000e1', 'eeeeeeee-0000-0000-0000-000000000001', 'Altro spazio', now(), '00000000-0000-0000-0000-00000000000a');
select t.expect_error($$update events set care_thread_id = 'ffffffff-0000-0000-0000-0000000000b1' where id = 'eeeeeeee-0000-0000-0000-0000000000e1'$$, 'impegno collegato a un filone di un altro spazio');
select t.as_user('00000000-0000-0000-0000-00000000000b');
update events set care_thread_id = 'ffffffff-0000-0000-0000-0000000000b2' where id = 'ffffffff-0000-0000-0000-0000000000e1';

-- scorta: scende a ogni dose segnata e risale se la dose viene tolta
insert into medication_doses (id, space_id, medication_id, day, slot) values ('ffffffff-0000-0000-0000-0000000000e9', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000d1', current_date, '08:00');
select t.expect_count($$select 1 from medications where id = 'ffffffff-0000-0000-0000-0000000000d1' and stock_units = 8$$, 1, 'la dose segnata scala la scorta');
select t.expect_error($$insert into medication_doses (space_id, medication_id, day, slot) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000d1', current_date, '08:00')$$, 'stessa dose segnata due volte');
delete from medication_doses where id = 'ffffffff-0000-0000-0000-0000000000e9';
select t.expect_count($$select 1 from medications where id = 'ffffffff-0000-0000-0000-0000000000d1' and stock_units = 10$$, 1, 'togliendo la dose la scorta risale');

-- ---- caregiver (membro): scrive come se stesso
select t.as_user('00000000-0000-0000-0000-00000000000c');
select t.expect_count('select 1 from care_recipients', 2, 'il membro vede le persone assistite');
insert into care_entries (id, space_id, recipient_id, thread_id, type, entry_date, title)
 values ('ffffffff-0000-0000-0000-0000000000c2', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'episodio', current_date, 'Palpitazioni');
select t.expect_error($$insert into care_entries (space_id, recipient_id, thread_id, type, entry_date, title, author_id) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'nota', current_date, 'x', '00000000-0000-0000-0000-00000000000b')$$, 'tassello firmato da un altro');
insert into visit_questions (space_id, prep_id, text) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000f1', 'Serve ripetere la colonscopia?');
insert into medication_doses (space_id, medication_id, day, slot) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000d1', current_date, '08:00');
select t.expect_count('select 1 from care_audit', 0, 'il membro non legge il registro degli accessi');
insert into care_audit (space_id, recipient_id, action) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'export');
select t.expect_error($$insert into care_audit (space_id, recipient_id, action, user_id) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'view', '00000000-0000-0000-0000-00000000000b')$$, 'accesso registrato a nome di un altro');
delete from care_recipients where id = 'ffffffff-0000-0000-0000-0000000000a2';
delete from care_entries where id = 'ffffffff-0000-0000-0000-0000000000c1';
select t.as_su();
select t.expect_count($$select 1 from care_recipients where id = 'ffffffff-0000-0000-0000-0000000000a2'$$, 1, 'il membro non elimina una persona');
select t.expect_count($$select 1 from care_entries where id = 'ffffffff-0000-0000-0000-0000000000c1'$$, 1, 'il membro non elimina il tassello di un altro');

-- ---- care_viewer: legge la Cura e nient'altro
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count('select 1 from spaces where id = ''ffffffff-0000-0000-0000-000000000001''', 1, 'care_viewer vede lo spazio');
select t.expect_count('select 1 from space_members where space_id = ''ffffffff-0000-0000-0000-000000000001''', 3, 'care_viewer vede i membri');
select t.expect_count('select 1 from care_recipients', 2, 'care_viewer legge le persone');
select t.expect_count('select 1 from care_threads', 2, 'care_viewer legge i filoni');
select t.expect_count('select 1 from care_entries', 2, 'care_viewer legge i tasselli');
select t.expect_count('select 1 from medications', 1, 'care_viewer legge le terapie');
select t.expect_count('select 1 from measurements', 1, 'care_viewer legge i parametri');
select t.expect_count('select 1 from visit_prep', 1, 'care_viewer legge la preparazione visita');
select t.expect_count('select 1 from visit_questions', 1, 'care_viewer legge le domande');
select t.expect_count('select 1 from care_files', 1, 'care_viewer legge gli allegati');
select t.expect_count('select 1 from events where space_id = ''ffffffff-0000-0000-0000-000000000001''', 0, 'care_viewer non vede gli impegni');
select t.expect_count('select 1 from expenses where space_id = ''ffffffff-0000-0000-0000-000000000001''', 0, 'care_viewer non vede le spese');
select t.expect_count('select 1 from contacts where space_id = ''ffffffff-0000-0000-0000-000000000001''', 0, 'care_viewer non vede la rubrica');
select t.expect_count('select 1 from shopping_lists where space_id = ''ffffffff-0000-0000-0000-000000000001''', 0, 'care_viewer non vede la spesa');
select t.expect_count('select 1 from board_notes where space_id = ''ffffffff-0000-0000-0000-000000000001''', 0, 'care_viewer non vede la bacheca');
select t.expect_count('select 1 from categories where space_id = ''ffffffff-0000-0000-0000-000000000001''', 0, 'care_viewer non vede le categorie');
select t.expect_error($$insert into care_entries (space_id, recipient_id, thread_id, type, entry_date, title) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'nota', current_date, 'x')$$, 'care_viewer non scrive tasselli');
select t.expect_error($$insert into medication_doses (space_id, medication_id, day, slot) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000d1', current_date, '20:00')$$, 'care_viewer non segna dosi');
select t.expect_error($$insert into measurements (space_id, recipient_id, type, value) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'weight', 70)$$, 'care_viewer non registra parametri');
select t.expect_error($$insert into visit_questions (space_id, prep_id, text) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000f1', 'x')$$, 'care_viewer non aggiunge domande');
select t.expect_error($$insert into events (space_id, title, starts_at) values ('ffffffff-0000-0000-0000-000000000001', 'x', now())$$, 'care_viewer non crea impegni');
select t.expect_error($$insert into expenses (space_id, payer_id, amount, description) values ('ffffffff-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 5, 'x')$$, 'care_viewer non crea spese');
insert into care_audit (space_id, recipient_id, thread_id, action) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0000-0000000000b1', 'view');
select t.expect_count('select 1 from care_audit', 0, 'care_viewer non legge il registro');
update space_members set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000e' and space_id = 'ffffffff-0000-0000-0000-000000000001';
update care_recipients set first_name = 'Hack';
select t.as_su();
select t.expect_count($$select 1 from space_members where user_id = '00000000-0000-0000-0000-00000000000e' and space_id = 'ffffffff-0000-0000-0000-000000000001' and role = 'care_viewer'$$, 1, 'care_viewer non si promuove');
select t.expect_count($$select 1 from care_recipients where first_name = 'Hack'$$, 0, 'care_viewer non modifica le persone');

-- ---- estranei e altri spazi: nessuna visibilità
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count('select 1 from care_recipients', 0, 'estraneo non vede le persone assistite');
select t.expect_count('select 1 from care_entries', 0, 'estraneo non vede i tasselli');
select t.expect_count('select 1 from medications', 0, 'estraneo non vede le terapie');
select t.expect_count('select 1 from visit_questions', 0, 'estraneo non vede le domande');
select t.expect_count('select 1 from care_files', 0, 'estraneo non vede gli allegati sanitari');
select t.expect_error($$insert into care_recipients (space_id, first_name) values ('ffffffff-0000-0000-0000-000000000001', 'Intruso')$$, 'estraneo non crea persone assistite');
select t.expect_error($$insert into care_audit (space_id, recipient_id, action) values ('ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'view')$$, 'estraneo non scrive nel registro');
select t.as_user('00000000-0000-0000-0000-00000000000a');
select t.expect_count('select 1 from care_recipients', 0, 'altro spazio non vede le persone assistite');
select t.expect_count('select 1 from medication_doses', 0, 'altro spazio non vede le dosi');
select t.expect_error($$insert into care_threads (space_id, recipient_id, title) values ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'x')$$, 'filone su persona di un altro spazio');

-- ---- registro degli accessi: lo legge solo chi amministra
select t.as_user('00000000-0000-0000-0000-00000000000b');
select t.expect_count('select 1 from care_audit', 3, 'owner legge il registro degli accessi');
select t.expect_error($$update care_audit set action = 'view'$$, 'il registro non si modifica');
select t.expect_error($$delete from care_audit$$, 'il registro non si cancella');
delete from care_entries where id = 'ffffffff-0000-0000-0000-0000000000c2';
select t.as_su();
select t.expect_count($$select 1 from care_entries where id = 'ffffffff-0000-0000-0000-0000000000c2'$$, 0, 'owner elimina un tassello altrui');

-- ---- registro dei promemoria delle dosi: lo usa solo il Worker
select t.as_user('00000000-0000-0000-0000-00000000000b');
select t.expect_error($$select 1 from care_dose_log$$, 'nessun utente legge il registro dei promemoria');
select t.expect_error($$insert into care_dose_log (medication_id, day, slot) values ('ffffffff-0000-0000-0000-0000000000d1', current_date, '08:00')$$, 'nessun utente scrive nel registro dei promemoria');
select t.as_su();
insert into care_dose_log (medication_id, day, slot) values ('ffffffff-0000-0000-0000-0000000000d1', current_date, '08:00');
select t.expect_error($$insert into care_dose_log (medication_id, day, slot) values ('ffffffff-0000-0000-0000-0000000000d1', current_date, '08:00')$$, 'una dose si avvisa una volta sola');

-- ---- storage: bucket privato `care`
insert into storage.objects (bucket_id, name) values ('care', 'ffffffff-0000-0000-0000-000000000001/ffffffff-0000-0000-0000-0000000000a1/referto.pdf');
select t.as_user('00000000-0000-0000-0000-00000000000e');
select t.expect_count($$select 1 from storage.objects where bucket_id = 'care'$$, 1, 'care_viewer legge gli allegati sanitari');
select t.expect_count($$select 1 from storage.objects where bucket_id = 'attachments'$$, 0, 'care_viewer non legge gli allegati degli impegni');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('care', 'ffffffff-0000-0000-0000-000000000001/ffffffff-0000-0000-0000-0000000000a1/x.pdf')$$, 'care_viewer non carica allegati sanitari');
select t.as_user('00000000-0000-0000-0000-00000000000d');
select t.expect_count($$select 1 from storage.objects where bucket_id = 'care'$$, 0, 'estraneo non legge gli allegati sanitari');
select t.as_user('00000000-0000-0000-0000-00000000000c');
insert into storage.objects (bucket_id, name) values ('care', 'ffffffff-0000-0000-0000-000000000001/ffffffff-0000-0000-0000-0000000000a1/esame.pdf');

-- ---- uscire dallo spazio toglie il caregiver
select t.as_su();
delete from space_members where space_id = 'ffffffff-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000c';
select t.expect_count($$select 1 from care_recipients where id = 'ffffffff-0000-0000-0000-0000000000a1' and caregiver_ids = array['00000000-0000-0000-0000-00000000000b']::uuid[] and duty_user_id is null$$, 1, 'chi esce non è più caregiver né di turno');

-- ---- Cura come funzione di spazio
select t.as_user('00000000-0000-0000-0000-00000000000b');
update spaces set disabled_features = array['cura'] where id = 'ffffffff-0000-0000-0000-000000000001';
select t.expect_error($$update spaces set disabled_features = array['inesistente'] where id = 'ffffffff-0000-0000-0000-000000000001'$$, 'funzione di spazio non valida');

-- ---- cascata: eliminare lo spazio elimina la Cura
delete from spaces where id = 'ffffffff-0000-0000-0000-000000000001';
select t.as_su();
select t.expect_count($$select 1 from care_recipients where space_id = 'ffffffff-0000-0000-0000-000000000001'$$, 0, 'cascade persone assistite');
select t.expect_count($$select 1 from care_entries where space_id = 'ffffffff-0000-0000-0000-000000000001'$$, 0, 'cascade tasselli');
select t.expect_count($$select 1 from medication_doses where space_id = 'ffffffff-0000-0000-0000-000000000001'$$, 0, 'cascade dosi');
select t.expect_count($$select 1 from visit_questions where space_id = 'ffffffff-0000-0000-0000-000000000001'$$, 0, 'cascade domande');

select 'OK: tutti i test di isolamento RLS superati' as risultato;
