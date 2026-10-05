-- Dorax Finance — the daily schedule of the reminders function. Run it ONCE, and only when you want reminders to start going out:
--   Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- Before that: supabase/schema.sql has been run (section 4), the function "reminders" is deployed, and a test from your profile arrived.
--
-- What it does: every day at 11:00 UTC (8 in the morning in Brazil) the database calls the function with the secret that only the two
-- of them know. The function then looks at every account and sends each person what is new for them.
--
-- To stop the reminders:      select cron.unschedule('dorax-reminders');
-- To see the last runs:       select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- To change the hour: run this file again with another hour in '0 11 * * *' (minute, hour in UTC, then three stars).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'dorax-reminders',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := 'https://uhvfkyblfojcpqupmlbg.supabase.co/functions/v1/reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-reminders-secret', (select value #>> '{}' from public.reminder_secrets where key = 'cron')),
    body    := '{"action":"run"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
