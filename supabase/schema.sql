-- Dorax Finance — what the Supabase project needs besides its login. Run it ONCE:
--   Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- It is safe to run again (after an update of this file, for instance): nothing is dropped, no data is touched.
--
-- What it makes:
--   1. user_data            one row per person: their whole account (accounts, transactions, plan, goals, ...) as one document.
--   2. contact_messages     what people send through the contact form. Anyone can write one (up to 30 an hour in all); nobody can read
--                           them through the app.
--   3. delete_my_account()  lets a logged-in person delete themselves, and with them everything kept for them.
--   4. reminders             what the reminder job needs: the devices that asked for notifications (push_subscriptions), what was
--                           already sent to whom (reminder_log), and the server's own secrets (reminder_secrets). The job itself is
--                           the Edge Function in supabase/functions/reminders; its daily schedule is in supabase/reminders-schedule.sql.
--   5. the contact notice   when a contact message is written, the database asks that same function to email it to the owner.
--   6. bank_links            (a trial) which bank connections a person made through Open Finance. Only the function "bank" reads and
--                           writes it; the connection itself, and the consent, live at Belvo.
--   7. ai_calls              when each person asked for category suggestions with AI (supabase/functions/suggest), for its daily limit.
--                           Only that function reads and writes it. What the rows said is not kept.
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

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 4. reminders: notifications on a device, and reminder emails
-- ---------------------------------------------------------------------------------------------------------------------------------
-- push_subscriptions: one row per device on which a person switched notifications on. A browser hands the app three values (an address at
-- its push service and two keys); the server needs them to send that device a message. They are of no use to anyone who does not also
-- hold the server's signing key, but they are kept private all the same: a person sees their own devices only.
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,     -- deleting the person forgets their devices
  endpoint   text        not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 2000),
  p256dh     text        not null check (char_length(p256dh) between 80 and 100),
  auth       text        not null check (char_length(auth) between 16 and 60),
  agent      text        check (agent is null or char_length(agent) <= 300),         -- which browser it was, to tell devices apart
  created_at timestamptz not null default now()
);
comment on table public.push_subscriptions is 'Dorax Finance: devices that asked for notifications. Written through save_push_subscription(); read by the reminders function.';
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions: read own devices" on public.push_subscriptions;
create policy "push_subscriptions: read own devices" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
-- No policy for insert, update or delete: a device is added and removed only through the two functions below.
revoke all on public.push_subscriptions from anon, authenticated;
grant select (id, endpoint, agent, created_at) on public.push_subscriptions to authenticated;

-- Adds this device for the person calling. A device belongs to whoever switched it on last: if somebody else was using this browser before
-- (a shared computer), their row for it goes, so nobody receives another person's bills. At most 10 devices per person.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not logged in' using errcode = '28000'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  if (select count(*) from public.push_subscriptions where user_id = me) >= 10 then
    delete from public.push_subscriptions where id = (select id from public.push_subscriptions where user_id = me order by created_at limit 1);
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, agent) values (me, p_endpoint, p_p256dh, p_auth, left(p_agent, 300));
end;
$$;
comment on function public.save_push_subscription(text, text, text, text) is 'Dorax Finance: switches notifications on for the caller on one device.';
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- Removes this device for the person calling (notifications switched off, or logging out of this browser).
create or replace function public.remove_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not logged in' using errcode = '28000'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = (select auth.uid());
end;
$$;
comment on function public.remove_push_subscription(text) is 'Dorax Finance: switches notifications off for the caller on one device.';
revoke all on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.remove_push_subscription(text) to authenticated;

-- reminder_log: what the job already told each person, so a bill is announced once when it comes into view, once on its day and once when
-- it is late, and not every morning. A key reads like "bill:<line>:2026-10|today". Nobody reaches this table through the app.
create table if not exists public.reminder_log (
  user_id uuid        not null references auth.users (id) on delete cascade,
  key     text        not null check (char_length(key) <= 200),
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
comment on table public.reminder_log is 'Dorax Finance: reminders already sent. Only the reminders function reads and writes it.';
alter table public.reminder_log enable row level security;      -- and no policy: closed to the app
revoke all on public.reminder_log from anon, authenticated;

-- reminder_secrets: two values that never leave the server. "vapid" is the key pair that signs notifications (the function makes it the
-- first time it is needed). "cron" is what the daily schedule presents to the function so that nobody else can start a run; it is made
-- here, by the database, and is not shown anywhere.
create table if not exists public.reminder_secrets (
  key   text  primary key,
  value jsonb not null
);
comment on table public.reminder_secrets is 'Dorax Finance: secrets of the reminders function. Closed to the app; do not copy the values anywhere.';
alter table public.reminder_secrets enable row level security;  -- and no policy: closed to the app
revoke all on public.reminder_secrets from anon, authenticated;
insert into public.reminder_secrets (key, value)
  values ('cron', to_jsonb(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')))
  on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 5. the contact form tells the owner
-- ---------------------------------------------------------------------------------------------------------------------------------
-- A message used to wait in the table until somebody looked. Now, when one is written, the database asks the reminders function to
-- email it to the owner (the address in the function's secret CONTACT_TO), who answers by replying to that email.
-- notified_at: when that email went out. Empty means nobody was emailed yet; the morning run sends one summary of those.
-- The app cannot set it: it may still fill in only the four columns granted in section 2.
alter table public.contact_messages add column if not exists notified_at timestamptz;

-- Where the function lives. Not a secret, kept with the server's own values so the trigger below reads both from one place.
-- Another project: change the address here before running the file, or update the row afterwards.
insert into public.reminder_secrets (key, value)
  values ('url', to_jsonb('https://uhvfkyblfojcpqupmlbg.supabase.co/functions/v1/reminders'::text))
  on conflict (key) do nothing;

-- The request is made by the extension pg_net (the same one the daily schedule uses; supabase/reminders-schedule.sql switches it on).
-- It leaves after the message is saved and does not hold the form up. Whatever goes wrong here (the extension is not on, the function
-- is not deployed, the address is missing) is swallowed: a message is never refused because the notice about it could not be sent.
create or replace function public.contact_messages_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target text; secret text;
begin
  select value #>> '{}' into target from public.reminder_secrets where key = 'url';
  select value #>> '{}' into secret from public.reminder_secrets where key = 'cron';
  if target is not null and secret is not null then
    perform net.http_post(
      url     := target,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-reminders-secret', secret),
      body    := jsonb_build_object('action', 'contact', 'id', new.id),
      timeout_milliseconds := 20000);
  end if;
  return null;
exception when others then
  return null;
end;
$$;
revoke all on function public.contact_messages_notify() from public, anon, authenticated;

drop trigger if exists contact_messages_notify on public.contact_messages;
create trigger contact_messages_notify after insert on public.contact_messages
  for each row execute function public.contact_messages_notify();

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 6. bank connections (Open Finance through Belvo): a trial
-- ---------------------------------------------------------------------------------------------------------------------------------
-- One row per bank a person connected. What is kept is only which connection it is (Belvo's id for it) and the bank's name, so the app
-- can list it and ask for its data again. NOT kept: the CPF, the name given for the consent, any account number, any transaction.
-- The app never touches this table: everything goes through the Edge Function in supabase/functions/bank, which checks with Belvo that
-- a connection is the caller's own before writing it here. Deleting a person deletes their rows; the connection at Belvo is deleted by
-- the function when the person disconnects a bank (delete_my_account does not do it yet: see DEPLOY.md before real people use this).
create table if not exists public.bank_links (
  link_id     uuid        primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  institution text        not null default '' check (char_length(institution) <= 80),
  created_at  timestamptz not null default now()
);
comment on table public.bank_links is 'Dorax Finance (trial): bank connections made through Belvo. Only the function "bank" reads and writes it.';
create index if not exists bank_links_user on public.bank_links (user_id);
alter table public.bank_links enable row level security;        -- and no policy: closed to the app
revoke all on public.bank_links from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- One row per call to the function "suggest" (category suggestions with AI, off until a person turns it on): who asked, when, and how many
-- rows. It is there for the daily limit only, so that one account cannot run up the owner's bill with the AI. What the rows said is NOT kept.
-- The app never touches this table; deleting a person deletes their rows.
create table if not exists public.ai_calls (
  id       bigserial   primary key,
  user_id  uuid        not null references auth.users (id) on delete cascade,
  at       timestamptz not null default now(),
  rows     integer     not null default 0 check (rows >= 0 and rows <= 1000)
);
comment on table public.ai_calls is 'Dorax Finance: calls to the AI suggestions, for the daily limit. Only the function "suggest" reads and writes it.';
create index if not exists ai_calls_user_at on public.ai_calls (user_id, at desc);
alter table public.ai_calls enable row level security;          -- and no policy: closed to the app
revoke all on public.ai_calls from anon, authenticated;

