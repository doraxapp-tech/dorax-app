# Putting Dorax Finance live: Supabase + Vercel

Written 2026-10-04 for v41. Menu names are the ones in the Supabase, Google and Vercel dashboards on that date; dashboards get rearranged, so if a name is not where this says, search the dashboard for it.

**What goes where**

| Piece | Does | You give it |
| --- | --- | --- |
| **Supabase** | Logins (email + password, Google), and the database that keeps each person's account | One SQL script, a few settings |
| **Vercel** | Serves the files in `app/` to browsers | The repository, and two public values from Supabase |
| **Google Cloud** | Lets people log in with their Google account | An "OAuth client"; its secret goes into Supabase only |

The order matters a little: the Supabase project first (Vercel needs its address), then Vercel (Supabase and Google need the site's address), then back to Supabase and Google to tell them that address.

---

## 1. Supabase: the project and the database

1. Create a project at supabase.com. Region: pick the one nearest your users (for Brazil, **South America (São Paulo)**). Keep the database password somewhere safe; the app never uses it.
2. Open **SQL Editor > New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), press **Run**. It should say "Success. No rows returned".
3. Check it in **Table Editor**: two tables, `user_data` and `contact_messages`, each marked as having row-level security (RLS) enabled.

What the script does, and why: it makes the two tables and one function the app uses, and the rules that let a logged-in person read and write **their own row and nothing else**. The key the browser uses is public, so those rules are the only thing between one person's finances and another's. `tests/qc-schema.js` runs the script on a real PostgreSQL and tries every rule (41 checks).

## 2. Supabase: login settings

**Authentication > URL Configuration** (do this again after step 5, when you know the site's address):

- **Site URL**: `https://YOUR-SITE.vercel.app` (later, your own domain)
- **Redirect URLs**, one per line:
  - `https://YOUR-SITE.vercel.app/**`
  - `http://localhost:5173/**` (for `npm start` on your computer)
  - optional, for Vercel's preview deployments: `https://*-YOUR-VERCEL-TEAM.vercel.app/**`

Why: the links in the emails, and Google, send people back to the site. Supabase only sends them to addresses on this list. An address missing here is the most common reason "the link opens the wrong page".

**Authentication > Sign In / Providers > Email**: leave **Confirm email** on. Minimum password length: leave at 6 or set 8, not more (the app asks for 8, a letter and a number; if Supabase asks for more, the two disagree).

**Emails. Read this before testing with other people.** Without your own mail server set up, Supabase's built-in sender only delivers to the email addresses of the project's own team (yours), and at most 2 messages per hour. So:

- Testing alone, with the address your Supabase account uses: works as it is. If "send again" stops working, you hit the hourly limit; the app says "Too many emails were asked for".
- Testing with any other address, or other people: set up **custom SMTP** first (Authentication > Emails > SMTP Settings). Any provider works; Resend, Postmark and Brevo have free tiers. This is also required before launch.

The emails themselves (confirm your address, choose a new password, confirm a new address) are Supabase's templates, in English. Translate them under **Authentication > Emails**; keep the `{{ .ConfirmationURL }}` link in each.

## 3. Google login

In **Google Cloud Console > Google Auth Platform**:

1. **Branding**: app name (Dorax Finance), support email, and under authorized domains your site's domain and your Supabase project's (`YOUR-PROJECT-REF.supabase.co`).
2. **Data Access**: the scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`. Nothing else; the app only receives the name and the email.
3. **Clients > Create client**, type **Web application**:
   - **Authorized JavaScript origins**: `https://YOUR-SITE.vercel.app` and `http://localhost:5173`
   - **Authorized redirect URIs**: the *Callback URL* shown in Supabase under Authentication > Sign In / Providers > Google. It looks like `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
4. Copy the **Client ID** and **Client secret**.

In **Supabase > Authentication > Sign In / Providers > Google**: switch it on, paste both, save.

- The **client secret goes there and nowhere else**: not in this repository, not in Vercel, not in a chat.
- While the Google app is in **Testing**, only the Google accounts you list as test users can log in. Publish it (Audience > Publish app) when you want anyone to.
- Google's screen will say "continue to YOUR-PROJECT-REF.supabase.co", because that is who asks Google. Showing your own domain there needs a Supabase custom domain (a paid add-on). Worth doing before launch: an unfamiliar address on the login screen costs trust.
- The button in the app is text only. Google's sign-in branding rules ask for their own button artwork if you show their logo; add it then.

## 4. The code on GitHub

In a terminal, inside this folder:

```
git init
git add .
git commit -m "Dorax Finance v41"
```

Create an empty **private** repository on github.com, then run the two lines GitHub shows under "push an existing repository". `dist/` and `node_modules/` are left out by `.gitignore`.

## 5. Vercel

1. vercel.com > **Add New > Project** > import the repository. Framework preset: **Other**. Leave the build settings alone; [`vercel.json`](vercel.json) sets them (no install step, `node tools/vercel-build.js` as the build, `app/` as what gets served).
2. **Environment Variables**, for Production and Preview, from Supabase > Project Settings > API Keys:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
   | `SUPABASE_PUBLISHABLE_KEY` | the **publishable** key, `sb_publishable_...` (older projects: the "anon public" key, under the name `SUPABASE_ANON_KEY`) |

   Or install the **Supabase integration** from Vercel's Marketplace: it adds these variables by itself (and several others the app does not use).
3. **Deploy**. The build log should say `app/config.js written from SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY`.
4. Copy the site's address into Supabase (step 2) and Google (step 3).

What the build does: the app is plain files, so nothing is compiled. The script checks the file list and writes the two public values into `app/config.js`. It **stops the deploy if it is given a secret key** (`sb_secret_...` or `service_role`): that key opens the whole database and must never reach a browser. It also stops a production deploy that has no project to talk to, so add the variables **before** the first deploy. Changing a variable later needs a new deploy to take effect.

Without Vercel variables, you can instead type the two values into [`app/config.js`](app/config.js) and commit it. Both are public by design.

## 6. Test it

On the live address, in this order:

| Try | Expect |
| --- | --- |
| Create account with your email | "Confirm your email"; an email arrives; its link opens the first-time setup with your name |
| Finish the setup | The dashboard, empty. In Supabase > Table Editor > `user_data`: one row |
| Add an account and a transaction, reload the page | Still there. `rev` in the row went up |
| Open the site on your phone, log in | The same data |
| Log out, "Forgot your password?" | An email; its link opens "Choose a new password"; after saving you are in |
| Log in with Google using the **same** email | The same account opens; Profile shows both ways in |
| Log in with Google using another Google account | A new, empty account |
| Settings > Contact form, send a message | A row in `contact_messages` |
| Profile > Delete account | Back on the home page; the row in `user_data` and the user under Authentication > Users are gone |
| Turn Wi-Fi off, change something, turn it on | Top bar says "not saved yet", then "Saved. The connection is back." |

**When something does not work**

| You see | Usually means |
| --- | --- |
| Login says "not connected to its server yet" | `app/config.js` is empty on the site: the two variables are missing in Vercel, or you did not redeploy after adding them |
| The email link opens the site but you are not logged in, or lands on a Supabase error | The site's address is not in Redirect URLs (step 2) |
| No email arrives | Built-in sender: the address is not on the project's team, or the hourly limit (step 2). Check Authentication > Logs |
| Google: "redirect_uri_mismatch" | The callback URL in the Google client is not exactly Supabase's (step 3) |
| Google: "Access blocked" | The Google app is in Testing and that account is not a test user |
| "Your account could not be opened" right after logging in | `schema.sql` was not run, or run in another project |
| Changes are "not saved yet" forever | Same as above, or RLS policies were edited. Check Supabase > Logs > API |

## 7. On your computer

| Command | Does |
| --- | --- |
| `npm start` | Serves `app/` at http://localhost:5173, talking to the Supabase project in `app/config.js` (fill it in; do not commit a filled-in copy unless you mean to) |
| `npm run preview` | The same pages with a stand-in server: no Supabase needed, accounts stay in that browser, no email is sent. For looking at the app |
| `npm install`, then `npm test` | Every QC suite (needs Node.js; the browser suites download Chromium once) |

---

## What is not built yet

Flagged so nothing here is mistaken for done:

1. **Reminder emails are not sent.** The bell in the app and the calendar file work. Emails need a scheduled job on the server (a Supabase Edge Function with a cron trigger); the wording is ready in `reminders.view.js`. The home page currently says reminders come "in the app and by email": change that sentence or build the job before launch.
2. **No payments, no plan limits.** The home page shows three plans and prices; nothing charges or restricts anything. Stripe is not connected.
3. **Contact messages only land in the table.** Nothing notifies you. Look at `contact_messages` in the Table Editor, or add a Database Webhook that emails you on each new row. The form promises an answer by email: that is you, by hand. The form is capped at 30 messages an hour in all, so a script cannot fill the database; a captcha is the proper answer before launch.
4. **Privacy policy and terms are drafts** with PLACEHOLDERs (who is legally responsible, the legal wording). They need the owner's facts and a lawyer before real people sign up. The sign-up checkbox says "(drafts)".
5. **The site asks search engines not to index it** (`noindex` in `index.html` and in `vercel.json`). Right while testing. The public pages get proper addresses, titles and descriptions in the Next.js build; that is the moment to remove it.
6. **How the data is stored is the simple version**: a person's whole account is one document, sent again on every save. Fine for testing and for the first users. With years of transactions it becomes slow, and two devices changing things in the same minute means the second one reloads and loses its last change (the app says so). Changes not saved yet live in the open page: closing the tab while the top bar says "not saved yet" loses them. The Next.js build should split it into tables.
7. **Changing the password checks the current one in the app, not on the server.** To have Supabase insist on a recent login as well, switch on **Secure password change** under Authentication > Sign In / Providers > Email.
8. **Supabase's free plan pauses a project that goes unused for about a week**, as far as I know; check their pricing page. A paused project means nobody can log in until you resume it.

## Keys: which is which

| Key | Where it may be | If it leaks |
| --- | --- | --- |
| Supabase **publishable** / anon key | In `app/config.js`, in the browser, in the repository | Nothing: it is public, RLS is the protection |
| Supabase **secret** / `service_role` key | Nowhere in this project | Whole database readable. Rotate it in Supabase at once |
| Database password | Your password manager | Same |
| Google **client secret** | Supabase dashboard only | Others can pose as your app to Google. Reset it in Google Cloud |
