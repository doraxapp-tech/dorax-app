# Your setup: where things stand

Updated 2026-10-05. `DEPLOY.md` is the full guide; this page is only what is already done in **your** accounts and what is left, in order.

## Already done

**Supabase, project "Dorax Finance"** (`uhvfkyblfojcpqupmlbg`, region South America, São Paulo). The first project, "Dorax" in us-west-2, no longer exists.

- Everything in `supabase/schema.sql` is in: the two tables (`user_data`, `contact_messages`), their row-level security rules, the grants, the cap on the contact form, and the function behind "Delete my account".
- Checked on the live project: a visitor can read and write nothing in `user_data`; a logged-in person can use their own row and cannot delete it; nobody can read `contact_messages` through the app; only a logged-in person can call the delete function.
- Supabase's security advisor shows one warning: "`delete_my_account` can be executed by signed-in users as a SECURITY DEFINER function". **That is intended.** It is how a person deletes their own account; the function takes no argument and can only delete whoever calls it.

**Vercel, project "dorax-finance"** (team "Albert's projects")

- Live at **https://dorax.app** since 2026-10-05. The old https://dorax-finance.vercel.app forwards to it from the first deploy after that date, deployed on 2026-10-05 and connected to the São Paulo project. The build log says `app/config.js written from SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (uhvfkyblfojcpqupmlbg)`.
- The two public values, set for Production and Preview:
  - `SUPABASE_URL` = `https://uhvfkyblfojcpqupmlbg.supabase.co`
  - `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_b8NL9xrCVTxn6qG6ueql8w_6iubl51u` (public by design)
- Protection: the production address is open to everyone; preview deployments ask for a Vercel login.

## Left for you, in order

### 1. Tell Supabase the site's address (2 minutes)

Supabase > Authentication > URL Configuration:

- Site URL: `https://dorax.app`
- Redirect URLs: `https://dorax.app/**`, `https://dorax-finance.vercel.app/**` and `http://localhost:5173/**`

(You said on 2026-10-05 that this and the email templates of 3b-2 are done.)

Without this, the links in the emails send you to `localhost` instead of the site. This is per project, so it has to be done on the new one even if you did it on the old one.

### 2. Test (10 minutes)

The list in `DEPLOY.md`, step 6. Sign up with **the email address of your Supabase account**: until you set up your own mail sender, Supabase only delivers to that address, 2 emails an hour.

### 3. Google login (20 minutes, can wait)

`DEPLOY.md`, step 3. Until then the Google button answers "Logging in with Google is not switched on yet". If you had started this on the old project: the callback URL in the Google client has to be the new project's, `https://uhvfkyblfojcpqupmlbg.supabase.co/auth/v1/callback`.

### 3b. Emails through Resend: done on 2026-10-05

`dorax.app` is registered at Namecheap. The sending domain `mail.dorax.app` is verified in Resend (São Paulo region, tracking off) and Supabase sends the account emails through it, from `no-reply@mail.dorax.app`. Details and the DNS records: `DEPLOY.md`, "Account emails through Resend". The test sign-up worked (2026-10-05).

### 3b-2. Make the emails look like Dorax (15 minutes)

1. Deploy the site once (`npx vercel@latest deploy --prod` in the folder), so it serves the logo the emails use.
2. Supabase > Authentication > Emails > SMTP Settings: **Sender name** = `Dorax Finance`.
3. Supabase > Authentication > Emails > Templates: paste the five files of `supabase/email-templates/` and their subjects. The steps are in the `README.md` of that folder.
3b. Same page, **Security** list: switch on **Password changed** and **Email address changed**, then **Save changes**. Leave the other five off.
4. Sign up again with a new address and look at the email.

### 3c. The site on dorax.app: three things left for you

Done on 2026-10-05: `dorax.app` is added to the Vercel project `dorax-finance`, and `www.dorax.app` forwards to it. **Checked the same day: https://dorax.app answers with the site, with its security certificate, and serves the email logo.** Step 1 below is therefore done; steps 2 and 3 could not be checked from outside, so confirm them with one sign-up on dorax.app (the link in the email must bring you back to dorax.app).

1. **Namecheap > Domain List > dorax.app > Manage > Advanced DNS > Host Records.** Delete the two parking rows (the **CNAME** for `www` that points to `parkingpage.namecheap.com` and the **URL Redirect** for `@`). Add:

   | Type | Host | Value |
   | --- | --- | --- |
   | A Record | `@` | `76.76.21.21` |
   | CNAME Record | `www` | `cname.vercel-dns.com` |

   Leave the four `mail` records and the Mail Settings alone: they are the email. If Vercel > dorax-finance > Settings > Domains shows other values next to the domain, use Vercel's.
2. **Supabase > Authentication > URL Configuration.** Site URL: `https://dorax.app`. Redirect URLs: add `https://dorax.app/**` and keep `https://dorax-finance.vercel.app/**` and `http://localhost:5173/**`.
3. **Only if Google login is set up:** in the Google client, add `https://dorax.app` to the authorized JavaScript origins, and `dorax.app` to the authorized domains under Branding.

Then open https://dorax.app. It can take from minutes to an hour to answer; Vercel adds the security certificate by itself.

**One address.** `vercel.json` now sends `dorax-finance.vercel.app` on to `dorax.app` (every page, for good). It starts with the next deploy: `npx vercel@latest deploy --prod`. After it, you log in again on dorax.app (a browser keeps logins per address). The emails load their logo from `https://dorax.app/assets/email/dorax-logo.png`: paste the five files of `supabase/email-templates/` into Supabase again (the ones pasted before keep working, through the forward).

### 3d. Reminders on the phone and by email (built 2026-10-05, not switched on)

The app side is in the folder. On the server, checked on the live project on 2026-10-05:

- **Database: done** (you ran `schema.sql`). The three tables exist with row-level security on; visitors and logged-in people have no access to `reminder_log` and `reminder_secrets`; a logged-in person can read only the list of their own devices, not the keys; the two device functions run with a fixed search path and are closed to visitors; the schedule's secret was made by the database.
- **Function: deployed** by you with the Supabase command line (version 1, active, checks its callers itself as `supabase/config.toml` says). To deploy it again after a change: `npm run functions`, then `npx supabase@latest functions deploy reminders --project-ref uhvfkyblfojcpqupmlbg`. "Docker is not running" is only a notice: the files are uploaded and bundled by Supabase.
- Supabase's security advisor now also lists `save_push_subscription` and `remove_push_subscription` as "can be executed by signed-in users as SECURITY DEFINER", and the two closed tables as "RLS enabled, no policy". **Both are intended**: the functions act only on the caller's own devices, and a table with no policy is closed to the app, which is the point.

- **Tests: both arrived on 2026-10-05**, the email (through Resend) and the notification on Chrome, Windows. If a notification is "sent" and not shown, look at Windows first: the notification centre, Do not disturb, and Google Chrome in Settings > System > Notifications.

**The mornings are on since 2026-10-05.** You ran `supabase/reminders-schedule.sql`; checked on the project: the job `dorax-reminders` is active, every day at 11:00 UTC (8:00 in Brazil). To see the last runs: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;`. To stop: `select cron.unschedule('dorax-reminders');`.

### 3e. The contact form emails you (built 2026-10-05, three steps to switch on)

1. Supabase > SQL Editor: run `supabase/schema.sql` again (adds one column and one trigger to `contact_messages`).
2. Terminal, in the folder: `npx supabase@latest functions deploy reminders --project-ref uhvfkyblfojcpqupmlbg`.
3. Supabase > Edge Functions > Secrets: `CONTACT_TO` = the address that should get the messages.

Then send the form once on dorax.app. You answer by replying to the email. Details: `DEPLOY.md`, "The contact form tells you".

### 3g. The company's side of Plan and Savings & goals (built 2026-10-06)

Nothing to set up in the app: Plan and Savings & goals show **Household | Company** beside the title, for every account. To mark company bills as paid, add the company's account (the note on the company's side has the button, or Accounts > Add account > Belongs to: Company). One step on the server, so that reminder emails and notifications also cover the company's bills:

1. Deploy the site (`git push`).
2. Terminal, in the folder: `npx supabase@latest functions deploy reminders --project-ref uhvfkyblfojcpqupmlbg`.

Details and what is not built yet: `DEPLOY.md`, "The company's side of Plan and Savings & goals".

### 3f. Open Finance: connecting a bank, a trial with Belvo's test banks (built 2026-10-06)

1. Supabase > SQL Editor: run `supabase/schema.sql` again (adds the table `bank_links`).
2. Supabase > Edge Functions > Secrets: `BELVO_SECRET_ID`, `BELVO_SECRET_PASSWORD` (the **sandbox** keys from Belvo's dashboard). `BANK_TRIAL_USERS` is no longer used and can be deleted.
3. Terminal, in the folder: `npx supabase@latest functions deploy bank --project-ref uhvfkyblfojcpqupmlbg`.
4. Deploy the site, then on dorax.app: **Open Finance** (in the menu, after Imports) > **Connect a bank**.

Every account sees the page. It has never been run against Belvo itself, so tell Claude what the first try does. What must be settled before real banks: `DEPLOY.md`, "Connecting a bank through Open Finance".

### 4. GitHub: done on 2026-10-05, one click left

The code is at `https://github.com/doraxapp-tech/dorax-app`, branch `main`. Two things to remember about this computer:

- It has a saved GitHub login for another account (dev-based). This repository's address carries the name `doraxapp-tech@` so git uses the right one.
- From now on the folder has a history. After a set of changes (yours or the ones Claude saves into the folder): `git add .`, `git commit -m "what changed"`, `git push`.

**Left:** Vercel > dorax-finance > Settings > Git > **Connect Git Repository** > `doraxapp-tech/dorax-app` (Vercel will ask to be allowed to see that GitHub account). After that a push to `main` deploys the site, and `npx vercel@latest deploy --prod` is no longer needed. If a deployment ever shows as "Blocked", it is usually because the commit was made under a GitHub account Vercel does not know: tell Claude what the message says.

## To know

- **Running `schema.sql` again is safe.** It creates only what is missing.
- **The home page still promises reminders by email**, which are not sent yet. Plans and prices are off the page since 2026-10-05 (free for now). See "What is not built yet" in `DEPLOY.md` before showing the site to anyone but yourself.
