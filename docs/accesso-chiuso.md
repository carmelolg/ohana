# Accesso chiuso: allowlist email + inviti

## Problema
Ohana è esposta su ohanapp.org ma è privata. Prima della migrazione 0025 chiunque inserisse un'email nella pagina di login creava un account Supabase (`signInWithOtp` e Google creano l'utente se manca). La RLS isolava i dati, ma il servizio restava aperto.

## Scelta
Hook **Before User Created** di Supabase Auth, non `enable_signup = false` e non Cloudflare Access.
- `enable_signup = false` bloccherebbe anche l'invitato nuovo, che crea l'account al primo accesso.
- Cloudflare Access aggiungerebbe un secondo login e non protegge il backend Supabase, raggiungibile con la anon key.

## Regole di ammissione
```mermaid
flowchart TD
  A[Nuovo utente: Auth sta per creare l'account] --> B{Email presente?}
  B -- no --> R[Rifiuto 403]
  B -- sì --> C[Normalizza: minuscolo, senza spazi]
  C --> D{In allowed_emails?}
  D -- sì --> OK[Via libera: l'account viene creato]
  D -- no --> E{Invito con quell'email,<br/>accepted_at nullo e non scaduto?}
  E -- sì --> OK
  E -- no --> R
```

## Login (OTP o Google)
```mermaid
sequenceDiagram
  actor U as Utente
  participant W as Web (Login.tsx)
  participant A as Supabase Auth
  participant H as before_user_created_hook
  participant D as Postgres (invites, allowed_emails)
  U->>W: email (o «Continua con Google»)
  W->>A: signInWithOtp / signInWithOAuth
  alt account già esistente
    A-->>W: link/codice, l'hook non interviene
  else account nuovo
    A->>H: event.user.email
    H->>D: is_email_admitted(email)
    D-->>H: sì / no
    alt autorizzata
      H-->>A: {}
      A-->>W: link/codice, utente creato
    else non autorizzata
      H-->>A: error 403 «Accesso riservato…»
      A-->>W: errore (OTP) oppure redirect con error_description (Google)
      W-->>U: «Questo indirizzo non è autorizzato…»
    end
  end
```

## Invito e ingresso nello spazio
```mermaid
sequenceDiagram
  actor M as Membro (owner/admin)
  actor N as Invitato
  participant W as Web
  participant K as Worker
  participant D as Postgres
  M->>W: crea invito (email, ruolo)
  W->>D: insert invites
  W->>K: POST /invites/send
  K-->>N: email con link /invito/token
  N->>W: apre il link, accede con la stessa email (l'hook la ammette)
  W->>D: accept_invite(token)
  D-->>W: entra in space_members, accepted_at valorizzato
```
Dopo l'accettazione l'invito non ammette più nuove registrazioni con quell'email, ma l'account esiste già.

## Rischi e gestione
- **Google con email diversa dall'invito**: l'hook guarda l'email del provider; se non coincide viene rifiutata. Va invitato l'indirizzo Google effettivo.
- **Invito scaduto o già accettato**: non ammette; serve un nuovo invito o una riga in `allowed_emails`.
- **Maiuscole e spazi**: confronto con `lower(trim(...))` su entrambi i lati.
- **Utenti esistenti**: l'hook scatta solo alla creazione, il loro accesso non cambia.
- **Hook che fallisce**: Auth rifiuta la registrazione (fallisce chiuso). Chi ha già un account non è toccato.
- **Funzioni esposte**: `before_user_created_hook` ha `execute` solo per `supabase_auth_admin`; `is_email_admitted` e `allowed_emails` non sono accessibili ad `anon`/`authenticated` (verificato in `supabase/tests/isolation.sql`).

## Da configurare a mano (progetto online)
1. Applicare la migrazione `0025_closed_signup.sql`.
2. (In `config.toml` l'hook è spento perché gli e2e accedono con email casuali.) Dashboard Supabase → Authentication → Hooks → *Before User Created* → tipo Postgres, funzione `public.before_user_created_hook`, abilita. (`config.toml` vale solo per il Supabase locale.)
3. Inserire gli indirizzi da autorizzare nello SQL editor, **prima** di invitare nessuno e senza metterli nel repo:
   ```sql
   insert into public.allowed_emails (email, note) values ('indirizzo@esempio.it', 'bootstrap');
   ```
   L'email va scritta in minuscolo e senza spazi (c'è un vincolo `check`).
4. Verifica: da una finestra anonima, chiedi il link con un'email non autorizzata e controlla il messaggio «Questo indirizzo non è autorizzato…».
