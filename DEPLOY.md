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
- Testing with any other address, or other people: set up **custom SMTP** first. The provider chosen is **Resend** (owner, 2026-10-05): see "Account emails through Resend" just below. This is also required before launch.

The emails themselves (confirm your address, choose a new password, confirm a new address, and the two security notices "your password was changed" and "your email was changed", which are switched on under **Security** on the same page once pasted) are in `supabase/email-templates/`: the Dorax logo, one button, and the text in Portuguese, Spanish or English according to the language the person signed up in. Supabase starts with its own plain English ones; to replace them, follow `supabase/email-templates/README.md` (paste each file and its subject under **Authentication > Emails > Templates**). The logo in them is a picture the site serves, so the site has to be deployed with `app/assets/email/dorax-logo.png` for it to show. Also set **Sender name** to `Dorax Finance` in the SMTP settings, or the inbox shows the address instead of a name.

### Account emails through Resend

Decided 2026-10-05: the account emails (confirm your address, choose a new password, confirm a new address) go out through Resend. Nothing in the code changes: Supabase sends them, and you tell Supabase to hand them to Resend. Reminder emails and contact-form notices are not part of this (see "What is not built yet").

**The catch: a domain.** Resend only sends to other people from a domain you own and have verified with it. A `vercel.app` address cannot be verified. Until then Resend offers a test sender, `onboarding@resend.dev`, that delivers **only to the email address of your own Resend account**.

So there are two stages.

**Stage A, now, without a domain (testing alone).** What you gain: 30 emails an hour instead of 2. What does not change: only you receive them.

1. In Resend: **API Keys > Create API key**. Name: `Supabase Dorax`. Permission: **Sending access**. Copy the key; Resend shows it once.
2. In Supabase, project `dorax`: **Authentication > Emails > SMTP Settings**, switch on **Enable custom SMTP** and fill in:

   | Field | Value |
   | --- | --- |
   | Sender email | `onboarding@resend.dev` |
   | Sender name | `Dorax Finance` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the API key from step 1 |

3. Save. Sign up on the site with **the address of your Resend account** and check that the email arrives. In Resend, **Emails** lists every message and why one failed.

- The **API key goes into that Supabase field and nowhere else**: not in this repository, not in `app/config.js`, not in Vercel, not in a chat. If it leaks, delete it in Resend and make a new one.
- Once custom SMTP is on, Supabase stops using its own sender. If your Supabase account and your Resend account use different addresses, only the Resend one receives from then on.
- An address that is not yours gets no email in this stage, and the app shows a general error for it.

**Stage B, with a domain (before anyone else signs up with email).** State on 2026-10-05: `dorax.app` is registered (owner). The sending domain **`mail.dorax.app`** is created in Resend, region São Paulo (`sa-east-1`, the same as the Supabase project), click and open tracking off. It was **verified on 2026-10-05**: the four DNS records below are in place at Namecheap (the registrar), and the SMTP settings in Supabase use the sender `no-reply@mail.dorax.app`. The steps are kept for reference.

1. Add these four records where the domain's DNS is managed (the registrar's DNS page). The "Name" is what goes in the host field; if the registrar wants the full name, add `.dorax.app` to it.

   | Type | Name (host) | Value | Priority |
   | --- | --- | --- | --- |
   | TXT | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUtFoME/XEJOWQY6r11pg1i8/y3vC/Uu++JljcPmRaAYrtZLnV6ItYE0rPnzPiETDvbcWebMpcnssDCkLQX1vFhg3A1vrZeZLVfWEMuv94/I8SK/Gl+/Pg+o/4P72eTyrvypHYSyQKJDpqTXIlxOcZ9e0hJcvWyvt9Rz/2LYAQiQIDAQAB` | |
   | MX | `send.mail` | `feedback-smtp.sa-east-1.amazonses.com` | 10 |
   | TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | |
   | CNAME | `rsend.mail` | `send.forge.rmta.net` | |

   These are the records Resend gave when the domain was created. The long value is a public key, not a secret. If Resend's Domains page ever shows different values, its page wins.
2. In Resend: **Domains > mail.dorax.app > Verify DNS records**. It can take from a few minutes to some hours. Wait for **Verified**.
3. Keep **click tracking and open tracking off** for this domain (they are). Tracking rewrites links, and Supabase warns that this can break the confirmation link.
4. In Resend: **API Keys > Create API key**, name `Supabase Dorax`, permission **Sending access**, domain `mail.dorax.app`. If you made a key in stage A you can keep using it, or replace it with this narrower one and delete the old one.
5. In Supabase's SMTP settings (the table above): **Sender email** `no-reply@mail.dorax.app`, password the API key. The other fields stay.
6. Test: sign up on the site with an address that is **not** yours on Resend. The email must arrive and its link must open the site logged in.
7. **Authentication > Rate Limits**: emails per hour starts at 30 with custom SMTP. Raise it before a launch.

**The site on the domain.** On 2026-10-05 `dorax.app` was added to the Vercel project (`www.dorax.app` forwards to it). What makes it answer is on the owner's side: at the registrar, an **A** record for `@` to `76.76.21.21` and a **CNAME** for `www` to `cname.vercel-dns.com` in place of the registrar's parking rows (use the values on Vercel's Domains page if they differ); in Supabase, Site URL `https://dorax.app` and `https://dorax.app/**` among the redirect URLs; in the Google client, `https://dorax.app` among the authorized JavaScript origins. The list is in `YOUR-SETUP.md`, 3c. The `vercel.app` address forwards to `dorax.app` (`redirects` in `vercel.json`, from the first deploy after 2026-10-05); the logo in the emails is fetched from `dorax.app`.

### Reminders: notifications and email

Built on 2026-10-05. What a person gets is what the bell in the app already shows, sent to them where they are:

- **A notification on the phone or computer**, even with Dorax closed. Per device: the person switches it on in **Profile > Reminders > Notifications on this device**, and the browser asks their permission.
- **An email**, from `no-reply@mail.dorax.app` through Resend. One switch in the same place. It is **on unless the person switches it off** (assumption, yours to reverse: the home page has always said reminders come by email).
- **One message per stage, not one per day.** A bill is announced when it comes into view (the "how early" the person chose), on its day, and when it turns late. Several things on the same morning go in one message.
- **Once a day, at 11:00 UTC: 8 in the morning in Brazil.** "Today" is the day in Brazil for everybody. (Assumption: the people you are building for are in Brazil. A person in Portugal gets it at noon.)

**How it works, in four pieces.**

| Piece | Where | What it does |
| --- | --- | --- |
| The app | `app/js/features/reminders/push.js`, `app/sw.js` | Asks permission, gets this device's address from the browser, hands it to the server. `sw.js` is the small script the browser keeps for the site so a notification can be shown while the app is closed. It stores nothing. |
| The database | `supabase/schema.sql`, section 4 | `push_subscriptions` (the devices), `reminder_log` (what was already said to whom), `reminder_secrets` (two values that never leave the server). |
| The function | `supabase/functions/reminders/` | A Supabase Edge Function. Works out what is new for each person, encrypts and signs the notification, sends the email through Resend. |
| The schedule | `supabase/reminders-schedule.sql` | Makes the database call the function every morning. |

**The rules are not written twice.** The function must decide "what is due" exactly as the app does, and say it in the app's words. So `npm run functions` copies the app's own calculation and wording files into `supabase/functions/reminders/engine.mjs`. **Whenever a reminder rule, a text of a reminder, or anything in `app/js/core/` changes: run `npm run functions` and deploy the function again.** `npm test` fails if the copy is older than the app.

**To switch it on, in this order.**

1. **Database.** Run `supabase/schema.sql` again in Supabase > SQL Editor (it is written to be run more than once; it only adds section 4).
2. **Function.** With the Supabase command line, in the project folder:
   ```
   npx supabase@latest login
   npx supabase@latest functions deploy reminders --project-ref uhvfkyblfojcpqupmlbg
   ```
   (As far as I know, recent versions need nothing else installed; if it asks for Docker, add `--use-api`.) `supabase/config.toml` tells it that this function checks its callers itself.
3. **Email key.** Supabase > Edge Functions > Secrets: add `RESEND_API_KEY` with a Resend key that has **Sending access** (a second key, named for this, is cleaner than reusing the SMTP one). Without it notifications work and emails are skipped.
4. **Check the deploy.** `node tools/build-functions.js --version` prints 16 letters. The deployed function answers the same letters when it runs these very files:
   ```
   curl -s -X POST https://uhvfkyblfojcpqupmlbg.supabase.co/functions/v1/reminders -H "Content-Type: application/json" -d "{\"action\":\"version\"}"
   ```
5. **Deploy the site** (`npx vercel@latest deploy --prod`), open **Profile > Reminders**, turn notifications on, press **Send a test** for the device and for email.
6. **Start the mornings.** Only when the tests arrived: run `supabase/reminders-schedule.sql` once in the SQL Editor. To stop: `select cron.unschedule('dorax-reminders');`.

**What to know before promising it to people.**

- **iPhone and iPad**: Apple gives a website notifications only after it is added to the Home Screen (Share > Add to Home Screen), on iOS 16.4 or newer. The profile explains this when it sees an iPhone in a browser tab. Android and computers need nothing.
- **A device belongs to whoever switched it on last**, and logging out removes it, so a shared computer never shows one person's bills to the next.
- **Nobody can read a notification on the way**: it is encrypted for the one device (the standard is RFC 8291) and travels through the browser maker's service (Google, Apple, Mozilla, Microsoft). The function refuses to send to any other address.
- **If nothing could be delivered, it is not marked as said** and goes out the next morning. If the notification arrived and the email did not, the email is not repeated.
- **Resend's allowance.** As far as I know the free plan is 100 emails a day and 3,000 a month: check their pricing page. A person with a handful of bills gets roughly 10 to 15 reminder emails a month, so the free plan covers about 200 people, account emails included. "Send a test" is limited to one email an hour per person for that reason.
- **Many accounts.** The function takes ten accounts at a time and hands the rest to itself, so its size does not grow with the number of people. It has been tried with stand-ins, not with thousands of real accounts.
- **To see what happened**: Supabase > Edge Functions > reminders > Logs shows one line per page with counts only (people, told, notifications, emails, problems). No address, no bill and no device is ever written there.

### The contact form tells you

Built on 2026-10-05. When somebody sends the contact form, the database asks the reminders function to email the message to you, from `no-reply@mail.dorax.app`. **The green button, "Reply to ...", starts an email to the person who wrote**, with a subject in their language and their message quoted; replying to the email in your mail program does the same. A small link at the bottom opens the table in Supabase, where you tick "handled". If what the person typed is not a plain email address, there is no button and the email says so.

To switch it on:

1. Run `supabase/schema.sql` again in the SQL Editor (it adds section 5: one column, one trigger).
2. Deploy the function again: `npx supabase@latest functions deploy reminders --project-ref uhvfkyblfojcpqupmlbg`.
3. Supabase > Edge Functions > Secrets: add `CONTACT_TO` with the address that should get the messages.
4. Send yourself a message through the form on dorax.app.

What it does when things go wrong: the message is always saved first, and nothing about the email can make the form fail. If the email could not be sent, or 20 contact emails already went out that day (the form is open to anyone, and the email allowance is shared with the sign-up emails), the message waits and the morning run sends one summary. Without `CONTACT_TO` nothing is sent.

### The company's side of Plan and Savings & goals (built 2026-10-06)

Asked by the owner while using the app: "I feel the need to also organize my PJ account like, savings, goals, etc". Decided with him: **fixed costs and goals first**; **one switch, Household / Company**, on the same pages; **each currency by itself** (nothing is converted).

**What the person sees.** On Plan and on Savings & goals, beside the title: Household | Company. **It is there for every account**, with or without a company (PJ) account (owner, same day: "I never created one, make it visible for all users for now"). Without a company account the company's side opens in reais, can be planned, and a note at the top offers "Add company account"; paying a bill waits for that account. A company with accounts in two currencies also chooses BRL or USD. On the company's side the pages are the same ones (fixed costs with due days and "Mark as paid", income rows, the year grid, goals and funds, the monthly hand-out), counting only company accounts in that currency. The bell, the calendar file, the reminder emails and the notifications include the company's bills, marked "Company" and in their own currency. A movement in a company account can be tied to a company cost (Transactions > the movement > "Company cost or income"), which counts as that cost's payment.

**What is kept, and where.** `S.company = { categories, books: { BRL: { goals, goalMoves, plan: { lines }, pay }, USD: {...} } }`, inside the same account document. The household's own plan, goals, income and categories are not touched or moved: an account that never opens the company's side has no `company` at all. The company has its own groups (Taxes, Accounting and services, Tools and software, Pay and people, Other) and its own income group; they follow the language like the household's.

| Piece | Where |
| --- | --- |
| The books: what a company book is, which currencies exist | `app/js/core/books.js` |
| Whose accounts count in a calculation (`state.scope`) | `inScope` in `app/js/core/reporting.js`, `cardInvoices` in `core/cards.js` |
| Which book a screen, a panel or a click uses (`B()`, `inBook`, `data-book`) | `app/js/ui/lookups.js`; set around every click in `app/js/app/actions.js`, every field in `changes.js`, every page in `shell.js`, every panel in `overlay.js` |
| The switch | `spaceSwitch()` in `app/js/app/shell.js` |
| Reminders of both sides | `remindersAll`, `reminderScheduleAll` in `app/js/core/reminders.js` |

**After deploying the site, deploy the reminders function again** (step 2 of "The contact form tells you" has the command). The server's copy of the rules (`engine.mjs`) was regenerated: until the function is deployed again the app shows the company's bills in the bell, but the emails and notifications are still the household's only. `node tools/build-functions.js --version` prints the new letters to compare.

**Not built yet (the owner chose to start with costs and goals):** a company dashboard and company reports; the Dashboard's "To do" list is the household's (company bills are in the bell); the company's groups cannot be renamed on the Categories page; a statement imported into a company account does not tick a company bill by itself (tie the movement to the cost, or use "Mark as paid" and skip the duplicate the import flags); money the company pays the owner is not linked to the household's income.

### Connecting a bank through Open Finance (a TRIAL, built 2026-10-06)

Decided by the owner on 2026-10-06: connecting a bank is **an option beside importing files**, not a replacement. What exists is a trial against **Belvo's sandbox** (test banks, invented data). Since the same day it has **its own page in the menu, Open Finance, for every account** (owner: "add an open finance tab and make it visible for all users"); the list of named accounts it started with is gone. The page is marked "Trial: test banks only", and the public pages still say Dorax does not connect to a bank, which stays true while only test banks can be reached.

**What happens.** On the Open Finance page (in the menu right after Imports; on a phone, under More), "Connect a bank" asks for the CPF and full name the bank's consent needs. The person is sent to Belvo's page and from there to the bank, where they agree to share accounts and transactions. Back in Dorax, on the same page, "Bring transactions" lists the bank's accounts; each one opens, under the bank, in the same review table a statement file goes through. Nothing enters the ledger without that review, and the bank's own transaction ids catch what was already imported.

| Piece | Where |
| --- | --- |
| The page (`viewOpenFinance`), the panel, the way back | `app/js/features/imports/bank.view.js`, `bank.actions.js`; the menu entry is in `app/js/app/shell.js` |
| The server | `supabase/functions/bank/` (`index.ts`, `rules.mjs`) |
| Which connections a person made | table `bank_links` (`supabase/schema.sql`, section 6) |

**What is kept, and what is not.** Kept: Belvo's id of the connection, the bank's name, whose it is. **Not kept anywhere by Dorax: the CPF and the name** (they go to Belvo for the consent and are forgotten), account numbers, and the transactions themselves until the person accepts them in the review. Belvo's keys never reach the browser.

**To switch the trial on.**

1. Run `supabase/schema.sql` again in the SQL Editor (adds the table `bank_links`).
2. Supabase > Edge Functions > Secrets, two values. Not in a file, not in a chat:
   - `BELVO_SECRET_ID` and `BELVO_SECRET_PASSWORD`: the **sandbox** keys from Belvo's dashboard.
   - `BANK_TRIAL_USERS` is no longer read. If it is there, it can be deleted.
3. `npx supabase@latest functions deploy bank --project-ref uhvfkyblfojcpqupmlbg`
4. Deploy the site (`git push`, or `npx vercel@latest deploy --prod`).
5. On dorax.app: Open Finance > Connect a bank. In Belvo's page choose the test bank; its test users are in Belvo's documentation for the sandbox.

**What has NOT been tried.** The function was built from Belvo's documentation and tested against a stand-in, never against Belvo itself. The first real try may show a difference (a field Belvo wants, an address it must be told about beforehand, the exact way it sends the person back). The function's log in Supabase says which request Belvo refused and with which code; it never holds a CPF, a name or a transaction.

Without the two keys the page is still in the menu and says "Not available here yet".

**Before other people use Dorax.** The page is open to everybody because the owner is the only user so far. A stranger who opens it would be asked for a real CPF to reach banks that are only pretend ones: before inviting people, either real banks are settled (the list below) or the page is taken out of the menu again (one line, `ROUTES` in `app/js/app/shell.js`).

**Before real banks and real people.** This is a list of decisions, not a switch:

- Belvo's price per connected account, and what their production approval asks for.
- The privacy policy and terms: the CPF, Belvo as a processor, the consent and how to withdraw it (Belvo's "My Belvo Portal"), reviewed by the lawyer.
- The home page: "Does Dorax connect to my bank? No." becomes "only if you choose to".
- Deleting an account must also delete the person's connections at Belvo (today it removes only Dorax's own rows).
- The function refuses every address but the sandbox on purpose. Real banks mean changing that line, with the points above settled.
- Not built: keeping connections fresh by themselves (Belvo's notifications), consent renewal, investments and loans.

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
- The button carries Google's "G", taken from Google's own button generator, on Google's dark button colours (`#131314` fill, `#8E918F` line, `#E3E3E3` text). Do not redraw, recolour or resize the G, and do not restyle that button with the app's colours: Google's sign-in branding rules allow the G only on their light, dark or neutral button. Two things differ from their spec: the font is the app's (they name Google Sans) and the button is 44px tall and as wide as the form (theirs is 40px). `npm run preview` shows the button without the G, because Google is only simulated there.

## 4. The code on GitHub

**Why.** Today the code is one folder on one computer. Git keeps every version of every file, so any change can be looked at and undone; GitHub keeps a copy of that history away from the computer; and once Vercel is connected to the repository, a push deploys the site by itself.

**Once.** Install Git for Windows if `git --version` prints nothing (https://git-scm.com/download/win, default answers). On github.com: **New repository**, name `dorax-app`, **Private**, and leave "Add a README", ".gitignore" and "license" unticked (the folder already has its own). Then, in a terminal:

```
cd "D:\Dorax Finance\Dorax-app"
git init -b main
git add .
git commit -m "Dorax Finance: the app, its tests and the Supabase side"
git remote add origin https://github.com/YOUR-USER/dorax-app.git
git push -u origin main
```

The first push opens a browser window to log in to GitHub. If `git commit` asks who you are, it prints the two `git config` lines to run first.

What is left out, by `.gitignore`: `node_modules/`, `dist/`, `.vercel/`, the Supabase command line's temporary folder, and any `.env` file. **No key or secret is in the folder**: `app/config.js` is empty there (Vercel writes it during a deploy), and the tests check for secret keys on every run. Keep it that way.

**Then, to deploy by pushing:** Vercel > dorax-finance > Settings > Git > **Connect Git Repository** > choose `dorax-app`. From then on a push to `main` goes live. The function on Supabase is not part of that: after changing anything under `supabase/functions/` (or a reminder rule), deploy it with the Supabase command line as before.

**Every day after that**, when a set of changes works:

```
git add .
git commit -m "what changed, in a few words"
git push
```

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

1. **Reminders outside the app are on since 2026-10-05** (notifications on a device and reminder emails; see "Reminders: notifications and email" above). What they do not do: no SMS or WhatsApp; one fixed hour for everybody (8:00 in Brazil), whatever the person's own time zone; a reminder is said once per stage (coming up, due today, late), not every day. After any change to a reminder rule or text: `npm run functions`, then deploy the function again.
2. **No payments, no plan limits: the app is free for now** (owner, 2026-10-05). The home page shows no plans and no prices and says "free for now"; the terms draft says the same. The plans section is kept in the code, switched off by `LP_PLANS` in `app/js/features/public/public.shared.js`. Before switching it back on: Stripe, plan limits in the app, and the terms about charging, cancelling and refunds reviewed by a lawyer.
3. **Contact messages are emailed to you once `CONTACT_TO` is set** (built 2026-10-05; see "The contact form tells you" above). Until then they only land in the table `contact_messages`, as before. The form is capped at 30 messages an hour in all, and at most 20 emails a day reach you; the rest come in one summary with the morning run.
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
| Resend **API key** | Supabase only: the SMTP password field, and Edge Functions > Secrets as `RESEND_API_KEY` | Others can send email as `mail.dorax.app`. Delete the key in Resend and make a new one |
| Push signing key, schedule secret | Made by the server, kept in the table `reminder_secrets`. Never copy them anywhere | Others could send notifications in the app's name, or start a run. Delete the two rows; the function makes a new signing key (people switch notifications on again) and `schema.sql` a new secret |
| Belvo **Secret ID and password** | Supabase only: Edge Functions > Secrets (`BELVO_SECRET_ID`, `BELVO_SECRET_PASSWORD`) | Others can read what connected people shared. Revoke the keys in Belvo's dashboard and make new ones |
