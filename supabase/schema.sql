-- Dorax Finance — what the Supabase project needs besides its login. Run it ONCE:
--   Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- It is safe to run again (after an update of this file, for instance): nothing is dropped, no data is touched.
--
-- What it makes:
--   1. user_data            one row per person: their whole account (accounts, transactions, plan, goals, ...) as one document.
--   2. contact_messages     what people send through the contact form. Anyone can write one (up to 30 an hour in all); nobody can read
--                           them through the app.
--   3. delete_my_account()  lets a logged-in person delete themselves, and with them everything kept for them.
--
-- What protects the data: ROW-LEVEL SECURITY. The app's public key lets a browser talk to the database, and these rules decide what
-- it may do: a logged-in person reads and writes their own row of user_data and nothing else. Without the rules below, the tables
-- would be open to anyone who has the public key (which is everyone). Do not switch them off "to test".
--
-- The app's side of this is one file, app/js/server/server.js: every table, column and function it uses is named here.

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 1. user_data: the account
-- ---------------------------------------------------------------------------------------------------------------------------------
create table if not exists public.user_data (
  user_id    uuid        primary key references auth.users (id) on delete cascade,   -- deleting the person deletes the row
  data       jsonb       not null,                                                   -- the account, as the app writes it
  rev        integer     not null default 1,                                         -- goes up by one on every save (see below)
  updated_at timestamptz not null default now(),
  constraint user_data_is_a_document check (jsonb_typeof(data) = 'object'),
  constraint user_data_not_huge      check (octet_length(data::text) <= 8000000),    -- 8 MB: years of use stay far below it
  constraint user_data_rev_positive  check (rev >= 1)
);
comment on table public.user_data is 'Dorax Finance: one row per person, the whole account in "data". Row-level security: each person sees only their own row.';

-- How two devices do not overwrite each other: the app reads the row with its rev, and saves with
--   update ... set data = ..., rev = rev_read + 1 where user_id = me and rev = rev_read
-- If another device saved in between, rev no longer matches, no row is updated, and the app takes the newer version instead.

alter table public.user_data enable row level security;

drop policy if exists "user_data: read own row"   on public.user_data;
drop policy if exists "user_data: create own row" on public.user_data;
drop policy if exists "user_data: change own row" on public.user_data;

create policy "user_data: read own row"   on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data: create own row" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data: change own row" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No policy for delete: a row goes only when its person goes (delete_my_account, below).

-- Who may touch the table at all. Visitors who are not logged in ("anon") get nothing.
revoke all on public.user_data from anon, authenticated;
grant select, insert, update on public.user_data to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 2. contact_messages: the contact form
-- ---------------------------------------------------------------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid        default auth.uid() references auth.users (id) on delete cascade,    -- who wrote it, when they were logged in; goes when they delete their account
  email      text        not null check (char_length(email) between 3 and 254),              -- where the answer goes
  topic      text        not null default 'question' check (topic in ('question', 'problem', 'data', 'billing', 'other')),
  message    text        not null check (char_length(message) between 10 and 5000),
  lang       text        check (lang in ('en', 'es', 'pt')),
  handled    boolean     not null default false                                              -- for you: tick it in the Table Editor when answered
);
comment on table public.contact_messages is 'Dorax Finance: messages from the contact form. Read them in the Table Editor; the app can only add to it.';

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages: anyone may write" on public.contact_messages;
create policy "contact_messages: anyone may write" on public.contact_messages for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
-- No policy for select, update or delete: through the app, nobody reads or changes a message. You read them in the dashboard.

-- The app may fill in these four columns and nothing else (not the date, not "handled", not somebody else's user_id).
revoke all on public.contact_messages from anon, authenticated;
grant insert (email, topic, message, lang) on public.contact_messages to anon, authenticated;

-- The form is open to anyone, so it is capped: at most 30 messages an hour, from everybody together. Past that, a message is refused
-- (the form says it could not be sent) until the hour has moved on. It keeps a script from filling the database. If real people ever
-- hit it, raise the number here and run this file again; a proper answer to abuse is a captcha in front of the form.
create or replace function public.contact_messages_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many messages in the last hour' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.contact_messages_limit() from public, anon, authenticated;

drop trigger if exists contact_messages_limit on public.contact_messages;
create trigger contact_messages_limit before insert on public.contact_messages
  for each row execute function public.contact_messages_limit();

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 3. delete_my_account(): Profile > Delete account
-- ---------------------------------------------------------------------------------------------------------------------------------
-- A person cannot delete rows of auth.users themselves, so this function does it for them, for their own id only: it takes no
-- argument, and the id is the one in the login it is called with. Their row of user_data and the messages they sent while logged in
-- go with them (on delete cascade above).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not logged in' using errcode = '28000';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;
comment on function public.delete_my_account() is 'Dorax Finance: deletes the person who calls it, and their data with them.';

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
