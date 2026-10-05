# Your setup: where things stand

Written 2026-10-04, after the Supabase and Vercel connectors were linked. `DEPLOY.md` is the full guide; this page is only what is already done in **your** accounts and what is left, in order.

## Already done

**Supabase, project "Dorax"** (`siznmbsrahlyptephbtb`, region us-west-2)

- The two tables (`user_data`, `contact_messages`), their row-level security rules, the grants and the cap on the contact form are in place.
- Checked on the live project: a visitor can read and write nothing in `user_data`; a logged-in person can use their own row and cannot delete it; nobody can read `contact_messages` through the app. Supabase's security advisor reports 0 findings.
- **Not yet in**: the function behind "Delete my account" (step 1 below).

**Vercel, project "dorax-finance"** (team "Albert's projects")

- Build settings match `vercel.json`: no install step, `node tools/vercel-build.js`, serve `app/`.
- The two public values are set for Production and Preview:
  - `SUPABASE_URL` = `https://siznmbsrahlyptephbtb.supabase.co`
  - `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_SBKujcUnrzOxmfdcT-ChKg_F3Sko2tZ` (public by design)
- Protection: the production address is open to everyone; preview deployments ask for a Vercel login (Vercel's standard setting).
- **Nothing is deployed yet** (step 2 below). The files could not be sent from the assistant's side: the connector takes file contents one request at a time, and 3 MB of them is not something to push through a chat.

## Left for you, in order

### 1. One piece of SQL (1 minute)

Supabase > SQL Editor > New query, paste, Run. It is the last part of `supabase/schema.sql`; the connector asks for a confirmation on anything containing `delete`, and that confirmation timed out three times.

```sql
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
```

Until this is run, everything works except Profile > Delete account, which says "The account could not be deleted".

### 2. Deploy (about 3 minutes)

In PowerShell (needs Node.js, which you have):

```
cd "D:\Dorax Finance\Dorax-app"
npx vercel@latest login
npx vercel@latest link --yes --scope alberts-projects-a3ee83a1 --project dorax-finance
npx vercel@latest deploy --prod
```

What each line does: logs this computer in to Vercel (a browser window opens); ties this folder to the project that already exists; uploads the folder and builds it. The last line prints the live address. The build log should say `app/config.js written from SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY`.

Later, for your normal workflow: push the folder to GitHub (DEPLOY.md step 4), then Vercel > dorax-finance > Settings > Git > connect the repository. From then on every push deploys.

### 3. Tell Supabase the site's address (2 minutes)

Supabase > Authentication > URL Configuration. Use the address step 2 printed (probably `https://dorax-finance.vercel.app`):

- Site URL: `https://dorax-finance.vercel.app`
- Redirect URLs: `https://dorax-finance.vercel.app/**` and `http://localhost:5173/**`

Without this, the links in the emails send you to `localhost` instead of the site.

### 4. Test (10 minutes)

The list in `DEPLOY.md`, step 6. Sign up with **the email address of your Supabase account**: until you set up your own mail sender, Supabase only delivers to that address, 2 emails an hour.

### 5. Google login (20 minutes, can wait)

`DEPLOY.md`, step 3. Until then the Google button answers "Logging in with Google is not switched on yet".

## Two things to know

- **Region.** The Supabase project is in us-west-2 (Oregon). For people in Brazil every save and every login travels to the US west coast and back, so the app answers a little slower than it could. Fine for testing. For launch, a project in South America (São Paulo) is the better home; a project's region cannot be changed afterwards, so that means a new project and running `schema.sql` there.
- **The home page still describes the launched product** (reminders by email, plans and prices). See "What is not built yet" in `DEPLOY.md` before showing the site to anyone but yourself.
