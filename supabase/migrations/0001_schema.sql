-- Ohana — schema base
-- Eseguito su Supabase (Postgres 15). Tutte le tabelle con dati di spazio hanno space_id.

-- Nessuna estensione: i token usano gen_random_uuid() (built-in da Postgres 13).
-- pgcrypto su Supabase vive nello schema «extensions», fuori dal search_path di db push.

-- ---------------------------------------------------------------- enum
create type space_role as enum ('owner', 'admin', 'member', 'viewer');
create type theme_pref as enum ('light', 'dark', 'auto');
create type event_category as enum ('visita', 'professionista', 'burocrazia', 'commissione', 'scadenza', 'altro');
create type event_status as enum ('open', 'done');
create type reminder_channel as enum ('email', 'push');

-- ---------------------------------------------------------------- profili
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  avatar_url text,
  theme theme_pref not null default 'auto',
  accent text not null default 'terracotta',
  default_reminder_minutes int not null default 1440 check (default_reminder_minutes >= 0),
  morning_brief boolean not null default false,
  timezone text not null default 'Europe/Rome',
  created_at timestamptz not null default now()
);

-- Crea il profilo alla registrazione.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'given_name', split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)),
    coalesce(new.raw_user_meta_data ->> 'family_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- spazi
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  color_hue int not null default 42 check (color_hue between 0 and 360),
  icon text not null default 'home',
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role space_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index on public.space_members (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  email text not null,
  role space_role not null default 'member' check (role <> 'owner'),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid not null default auth.uid() references public.profiles (id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.invites (space_id);

-- ---------------------------------------------------------------- rubrica
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, space_id)
);
create index on public.contacts (space_id);

-- ---------------------------------------------------------------- impegni
create table public.events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  category event_category not null default 'altro',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  notes text,
  assignee_id uuid references public.profiles (id) on delete set null,
  contact_id uuid,
  rrule text,
  amount numeric(10, 2),
  status event_status not null default 'open',
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (id, space_id),
  foreign key (contact_id, space_id) references public.contacts (id, space_id) on delete set null (contact_id),
  check (ends_at is null or ends_at >= starts_at)
);
create index on public.events (space_id, starts_at);
create index on public.events (assignee_id);

create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  offset_minutes int not null default 1440 check (offset_minutes >= 0),
  channels reminder_channel[] not null default '{email,push}'
);
create index on public.event_reminders (event_id);

create table public.event_checklist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  text text not null,
  checked boolean not null default false,
  position int not null default 0
);
create index on public.event_checklist_items (event_id);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  path text not null,
  name text not null,
  created_at timestamptz not null default now()
);
create index on public.attachments (event_id);

-- Coda promemoria: scritta solo dal Worker (service role).
create table public.reminder_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  occurrence_at timestamptz not null,
  send_at timestamptz not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel reminder_channel not null,
  sent_at timestamptz,
  unique (event_id, occurrence_at, user_id, channel)
);
create index on public.reminder_queue (send_at) where sent_at is null;

-- ---------------------------------------------------------------- spesa
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index on public.shopping_lists (space_id);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  text text not null,
  qty text,
  category text,
  checked boolean not null default false,
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz,
  added_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.shopping_items (list_id);

-- ---------------------------------------------------------------- spese
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  payer_id uuid not null references public.profiles (id),
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  event_id uuid,
  created_at timestamptz not null default now(),
  unique (id, space_id),
  foreign key (event_id, space_id) references public.events (id, space_id) on delete set null (event_id)
);
create index on public.expenses (space_id, date);

create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount numeric(10, 2) not null check (amount >= 0),
  primary key (expense_id, user_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  from_id uuid not null references public.profiles (id),
  to_id uuid not null references public.profiles (id),
  amount numeric(10, 2) not null check (amount > 0),
  date date not null default current_date,
  check (from_id <> to_id)
);
create index on public.settlements (space_id);

-- ---------------------------------------------------------------- dispositivi e feed
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

create table public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  space_id uuid references public.spaces (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
create index on public.calendar_feeds (user_id);
