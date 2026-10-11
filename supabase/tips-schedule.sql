-- Dorax Finance — the schedule of the tips by notification. Run it ONCE, after deploying the function "reminders" with the action "tips":
--   Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
--
-- What it does: every 15 minutes from 11:00 to 01:45 UTC (8:00 to 22:45 in Brasília) the database calls the function with the same secret as the
-- reminders' schedule (reminders-schedule.sql). Each person has a time of their own each day, between 8:30 and 22:45; once it has come, and if no
-- tip and no reminder reached them today, today's tip goes to their devices, as often as they chose in their profile (owner, 2026-10-10: "any
-- time from 8 in the morning to 11 at night, any day; with the app closed: the idea is to bring the person back to the app").
-- The reminders keep their own schedule, at 8:00.
--
-- To stop the tips:           select cron.unschedule('dorax-tips');
-- To see the last runs:       select status, return_message, start_time from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'dorax-tips') order by start_time desc limit 10;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'dorax-tips',
  '*/15 11-23,0-1 * * *',
  $$
  select net.http_post(
    url     := 'https://uhvfkyblfojcpqupmlbg.supabase.co/functions/v1/reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-reminders-secret', (select value #>> '{}' from public.reminder_secrets where key = 'cron')),
    body    := '{"action":"tips"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
