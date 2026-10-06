# Dorax Finance: web app (v41)

Saved 2026-10-04. v41 turns the prototype into an app that runs on a server: logins and data are in **Supabase**, the files are served by **Vercel**. The app starts blank; there is no example account and no prototype box.

**To put it live, follow [`DEPLOY.md`](DEPLOY.md).** What was checked is in [`QC-REPORT.md`](QC-REPORT.md).

## Changed since v41 (2026-10-05)

| You asked | Done |
| --- | --- |
| Login and sign-up with the structure of the reference you sent | A split screen: a brand panel on the left (logo, a heading, and on sign-up the three steps that follow), the form on the right with no box round it. Below 921px the panel is not shown and the form stands alone under the logo. Same layout for "confirm your email", forgotten password and "could not be opened". Styles at the end of `app/css/public/auth.css`, panel in `auSide()` in `features/auth/auth.view.js` |
| "update the landing ONLY using this .md file" (DESIGN 1.md, a dark, almost colourless style reference) | The home page is restyled from that file alone: `#08090a` canvas, five greys for surfaces, 1px hairlines, no shadows or gradients, Inter at weights 400 / 510 / 590, the main action as a white outlined pill, 8px cards, 4px tags, 1080px column, 48px between sections. Then, on request ("bring the green buttons, and update login, signup"): the main button is Dorax green again, and login and sign-up (the split screens) follow the same system. One file, `app/css/public/landing-system.css`, scoped to `.lp` and `.auth.split`; removing its line from `index.html` brings the old look back. The first-time setup, legal, contact and the app are not touched. Inter is now loaded as a variable font (the half-step weights need it) |
| "remove the 2 block design of the sign-up and login, also add the green to the data graph and circle. remove the section 'Your money shouldn’t require a spreadsheet to understand.' condense the section 'Built for people...'" | Login and sign-up are one centred block again (logo, then the form; no side panel). The data in the home page's graphs is Dorax green. The spreadsheet comparison section is gone. "Who it is for" went from eight cards to half and half: two short lists on the left, one diagram on the right (two overlapping rings, home and company, one account) |
| "remove: Built for people who want a clearer view of their own money. section, Add space btw section make the page breath, the divider lines make them full width ... fade out the borders and tune them down" | That section is gone (and its footer link). Sections have 64 to 120px above and below. The rules between them are faint, as wide as the window, and fade at both ends. Two values to tune in `landing-system.css`: `--sec-gap` and `--rule` |
| "I want the same font weight and size for the headings ... make final CTA something like this, remove the boxed style. center the header tab options" (with a screenshot of a reference site) | The big headings are 60px at weight 510, set solid, in Inter's display cut (measured on the screenshot), down to 34px on a phone. The closing call to action is two lines and two buttons with no box. The bar's section links sit in its middle. Inter is loaded with its optical-size axis for this |
| "you see how Linear uses parts of the app and show it in the home page, I want the same in sections like: How Dorax calculates what you see. remove section: Your bank login isn’t required." | "How it calculates" now has the heading on the left, the words on the right, and a piece of the app under them: the Plan screen behind and the dashboard's "Plan vs actual" card in front, built with the app's own components and shown in the app's own look (`lpShotPlan()` in `landing.view.js`, `.shot` in `landing-system.css`). Its six rules are plain text, no cards. The "Your bank login isn't required" section is gone, with its footer link |
| "do the same for section: 'Your company pays you. Your home still needs its own plan.' add parts of the app and show it in that section as you just did. how it works needs an update" | **For entrepreneurs**: heading on the left, words and button on the right, and under them a piece of the app: the Accounts screen behind (household total, company total, the two household accounts and the company account) and the "Monthly statements" card in front (`lpShotPj()`). The four small graphs are gone; their four points stay as plain text. **How it works**: same heading pattern, then four steps two by two, each with a small piece of the app above its number, title and line: accounts, the monthly plan, the to-do list, "Plan vs actual" (`lpShotStep(n)`). The numbered path is gone. All example figures, generic account names, nothing pressable. `steps.css` is no longer used |
| "'Your company pays you. Your home still needs its own plan.' section you copied the same style of the How Dorax calculates what you see, looks repetitive, make it different. condense the final cta is way to long 2 line max." | **For entrepreneurs** has its own layout now: half and half. Left: tag, heading, paragraph, button and the four points (two by two). Right: one picture made of two whole panes, the household's two accounts over the company's "Monthly statements", joined by a dotted line that says "Company and home, never mixed" (`lpShotPj()`, `.lp-duo` / `.shot.duo` in `landing-system.css`). No screen behind a card, no fade, no row of four columns. One column under 1040px: heading, picture, points. **Closing call to action**: one short sentence, "Make sense of the numbers you have." / "Entiende los números que ya tienes." / "Entenda os números que você já tem.", two lines at every width in the three languages (under 430px its size follows the width) |
| "A sua empresa paga você. A sua casa ainda precisa do próprio plano. too long" | The heading of "For entrepreneurs" is two short sentences, one to a line: "A empresa paga. A casa planeja." / "La empresa paga. La casa planifica." / "Company pays you. Home needs a plan." Two lines at most at every width in the three languages. The left half is a little wider than the right (1.1 to 0.9) so the English line has room to spare; the picture drops the "Due" column in that layout to fit |
| "I want the logo to be visible, and a better email structure this looks like an spam email" | The three account emails are now in `supabase/email-templates/` (confirm sign up, reset password, change email address): the Dorax logo on the site's dark band, one heading, one short paragraph, one green button, the address again as text, and what to do if it was not you. Portuguese, Spanish or English by the language the person signed up in. They are generated by `tools/build-emails.js` (`npm run emails`) and pasted into Supabase by hand; steps in that folder's `README.md`. The logo is `app/assets/email/dorax-logo.png`, served by the site |
| (Supabase's list of security emails) "is this usefull?" then "yes" | Two more emails in `supabase/email-templates/`, same design and three languages: `password-changed.html` and `email-changed.html`. They tell the person the change happened and what to do if it was somebody else; no confirmation link, one button that opens the site. To be pasted under **Security** in Supabase's email templates and then switched on. The other five on that list stay off (no phone numbers, no removable login method, no two-step login in the app) |
| "fix the email change to not depend on me and Add my domain to vercel so my app has a valid domain not the vercel one." | **Email change:** the two emails about it no longer send anyone to you. `change-email.html` now says the change only happens after the button is pressed in both emails (Supabase sends it to the current and the new address; "Secure email change", on by default), and that if you did not ask, you do not press it and choose a new password. `email-changed.html` is a receipt: old and new address, "from now on you log in with the new one", and if it was not you, somebody can read your inbox. **Domain:** `dorax.app` is added to the Vercel project and `www.dorax.app` forwards to it. Left for you: two DNS rows at Namecheap, the site address in Supabase, the origin in the Google client (`YOUR-SETUP.md`, 3c) |
| "yes do the follow-ups" | One address: `vercel.json` forwards `dorax-finance.vercel.app` to `dorax.app`, every path, permanently (active from the next deploy). The five emails load the logo from `https://dorax.app/assets/email/dorax-logo.png` (to be pasted into Supabase again) |
| "change var(--surface) on the dashboard color to #070707 borders to #1a1a1a" | In the app's dark theme, `--surface` (the fill of cards and panels) is `#070707` (was `#121212`) and `--line` (their borders and the lines between rows) is `#1A1A1A` (was `#2E2E2E`): `app/css/base/tokens.css`. It applies to every screen of the app, not only the summary, so they stay alike. The pieces of the app shown on the home page follow (`.shot` in `landing-system.css`). Not changed: the stronger line (`--line-strong`), field borders, meter tracks, the light theme |
| "center the content in the tab view" (with a picture of a very wide screen, everything stuck to the left) | On a screen wider than the page, the content now sits in the middle of the space beside the menu instead of at its left edge. The bar above keeps its title over the left edge of the content and its buttons over the right edge; its background and line still run the full width. Nothing changes at 1680px and narrower. `app/css/base/shell.css` |
| "add animation to the sidebar icons on hover (make them move one time) also remove the sidebar section names and add a line to divide them line very subtle." | **Menu icons:** each one moves once when its row is pointed at (or reached with the keyboard) and then rests: the gear and the repeat arrows turn, the list and the swap arrows slide, the flag, tag and wallet tilt, the bars grow, the trend line rises, the grid pops, the calendar and the upload arrow hop. None with "less motion" set in the system. **Groups:** the names "Household" and "Data" are gone; one hairline in the border colour separates the two groups. `app/css/base/shell.css`, `app/js/app/shell.js` |
| "tab view headings: .topbar h1 font-size: 20px" | The page title in the top bar is 20px on a computer (was 28px). Phones keep their large title (32px), which shrinks into the bar when the page is scrolled. `app/css/base/typography.css` |
| "lets work on in app push notifications" (chosen: push when Dorax is closed, for what the bell already shows, together with emails) | **Profile > Reminders** has two new controls: **Notifications on this device** (Turn on, Send a test, Turn off) and **By email** (a switch and a test). A notification arrives with Dorax closed; tapping it opens the reminders. One message per stage of a bill (coming up, due today, late), once a day at 8:00 in Brazil. New on the server: three tables and two functions (`supabase/schema.sql`, section 4), the Edge Function `supabase/functions/reminders/` and its daily schedule (`supabase/reminders-schedule.sql`). The function uses the app's own rules and words (`npm run functions` makes its copy). The privacy draft says what is kept. **Not switched on yet:** see `DEPLOY.md`, "Reminders: notifications and email". New suite `tests/qc-reminders.js` (100 checks) |
| "do your part now" (the contact-form email and GitHub, offered after the reminders) | **Contact form:** a new message is emailed to the owner by the reminders function (action `contact`, called by a trigger on `contact_messages`; `supabase/schema.sql`, section 5). Reply to the email to answer. At most 20 a day; the rest, and any that could not be sent, come as one summary with the morning run. Needs the secret `CONTACT_TO`. **GitHub:** the folder is ready (`.gitignore`, `.gitattributes` for one kind of line ending); the commands are in `DEPLOY.md`, step 4. **Fixed:** "1 atrasados" on the plan page (ES "con atraso", PT "em atraso", right for one and for many). qc-schema 74, qc-reminders 109 |
| "I want the bank accounts have their logos (Nubank, Santander, etc)" (chosen: official files, colour meanwhile) | On the Accounts page each of the 10 banks in the list wears its brand colour and two letters (`app/js/ui/bank-mark.js`), and shows **its own logo as soon as the bank's official file is in `app/assets/banks/`** (file names and what to pick: the README in that folder). No logo is drawn in the code. `tools/build-banks.js` (`npm run banks`; a deploy and `npm start` run it by themselves) lists the files that are there, so the app never asks for a missing one; the one-file preview carries them inside. The badge says the bank's name to screen readers. New suite `tests/qc-banks.js` (26 checks). To check with the lawyer: each bank's terms for showing its logo |
| "I oppened an account in belvo to conect open finance to the app" (decided: an option beside files; a sandbox trial first) | **Imports > Connect a bank**, shown only to the accounts named in the server secret `BANK_TRIAL_USERS`, and only against Belvo's sandbox. CPF and name are asked for the bank's consent and sent to Belvo, not kept. The bank's accounts and transactions come back into the usual review table; nothing is imported unreviewed; the bank's ids catch duplicates. Server: `supabase/functions/bank/`; table `bank_links` (`schema.sql`, section 6). Disconnecting asks first and deletes the connection at Belvo. Never run against Belvo itself yet. New suite `tests/qc-bank.js` (64 checks). What must be decided before real banks: `DEPLOY.md` |
| "why are you hiding this? this tool is for me only so far add an open finance tab and make it visible for all users" | **Open Finance** is its own page in the menu, right after Imports (phone: under More), for every account. The list of named accounts (`BANK_TRIAL_USERS`) is removed from the function and no longer read. The bank card and the review of a bank's transactions moved from Imports to this page; Imports is about files again. Without Belvo's keys on the server the page says "Not available here yet". Still Belvo's sandbox only, and marked so. On a phone each bank account's name has its own line. `tests/qc-bank.js` 81 checks. The function `bank` must be deployed again for the list to be gone on the server |
| "I feel the need to also organize my PJ account like, savings, goals, etc" (decided: fixed costs and goals first; one switch Household / Company; each currency by itself) | **Plan** and **Savings & goals** have two sides. A switch beside the title, shown to every account (he had no company account and did not see it: "make it visible for all users for now"); without a company account the company's side opens in reais with a note and an "Add company account" button; a company with reais and dollars also picks the currency. The company gets its own fixed costs (due days, "Mark as paid", year grid), income rows, goals and funds, counted only on company accounts of that currency. Kept apart under `S.company` (`app/js/core/books.js`); the household's data and screens are unchanged, byte for byte (tested). The bell, the calendar file and the server's reminders include company bills, marked "Company". A company movement can be tied to a company cost. The side in use is green, like the main button ("make the household | company switch active green"). New suite `tests/qc-company.js` (78 checks on the app). The function `reminders` must be deployed again. Not built: company dashboard and reports; see `DEPLOY.md` |
| "remove the pricing section for now, will start free" | The home page has no plans section, no prices and no link to them; the question about cost says it is free for now, and so does the terms draft. Everything is kept behind one switch, `LP_PLANS` in `features/public/public.shared.js` |
| A Google logo on the Google option | Google's own "G", as its button generator gives it, on Google's dark button colours. Shown on the real server only, not in `npm run preview` |
| Tune down the green in the left box | Two values, `--side-glow` and `--side-top`, in `app/css/public/auth.css` |
| Remove the pattern from the hero | Gone. The Weave is left in the home page's closing panel and behind the first-time setup |
| Remove "Page reviewed on ..." from the footer | Gone |
| "That link no longer works" after a failed Google login | A login Google or the server could not complete now says so, instead of blaming a link |

## What changed in v41

| You asked | Done |
| --- | --- |
| The pattern on login, sign-up and other parts is too visible | Drawn at about half its strength, green quarters dimmed, fades out sooner. One place to tune it: `--weave-line` and `--weave-accent` at the top of `app/css/public/weave.css` |
| Remove all the prototype boxes | All gone: login, "confirm your email", forgotten password, the stand-in for Google, contact form, email change, reminders, Settings |
| Get the app ready for Vercel and Supabase | Real sign-up, email confirmation, login, Google, forgotten password, change password and email, delete account. Each person's account is saved on the server. The contact form sends. `vercel.json`, the database script and the guide are included |
| Remove all examples, leave the app blank | The example account is no longer in the app (it lives on as a test fixture). The "try an example" buttons in Imports, Spreadsheet and Converter are gone. A new account holds nothing but its categories |

## How it is organised

```
Dorax-app/
├─ app/                        THE APP. This folder is what Vercel serves.
│  ├─ index.html               The page: markup, and the list of styles and scripts in order
│  ├─ config.js                Which Supabase project it talks to (two public values; Vercel writes it)
│  ├─ manifest.webmanifest     Name, colours and icons for installing it as an app
│  ├─ assets/icons/            Favicon and app icons
│  ├─ css/                     base/ (tokens, frame, motion, phone, light theme) · components/ · screens/ · public/
│  ├─ js/
│  │  ├─ core/                 Calculations and file readers. No screen code. What the tests check 61,897 ways
│  │  │                        books.js: the household's book and the company's (one per currency)
│  │  ├─ data/                 What a new account starts with
│  │  ├─ i18n/                 Spanish and Portuguese, the friendly voice, the (i) hints
│  │  ├─ server/               server.js: the ONLY file that talks to Supabase. sync.js: keeping the open account saved
│  │  ├─ ui/                   Shared pieces: the open account, language, formats, icons, small components
│  │  ├─ features/             ONE FOLDER PER SCREEN (dashboard, transactions, plan, goals, investments, reports,
│  │  │                        accounts, imports, converter, recurring, categories, settings, profile, reminders,
│  │  │                        public, auth, onboarding)
│  │  └─ app/                  The frame: routes, menu, panels, dialogs, session (who is logged in), events, start-up
│  ├─ sw.js                    The script a browser keeps for the site, to show a notification while the app is closed
│  ├─ assets/banks/            The banks' own logo files, added by the owner (see its README); empty until then
│  └─ vendor/                  supabase-js, pdf.js, SheetJS (not ours; see vendor/README.md)
├─ supabase/
│  ├─ schema.sql               The database: the tables, their functions, and the rules that keep each person's data theirs
│  ├─ functions/bank/          (trial) Open Finance: connecting a bank through Belvo's sandbox
│  ├─ functions/reminders/     The job that sends reminders (notifications and email). engine.mjs is made by "npm run functions"
│  ├─ reminders-schedule.sql   Run once to start the daily reminders
│  ├─ config.toml              For the Supabase command line, when it deploys the function
│  └─ email-templates/         The account emails, to paste into Supabase
├─ vercel.json                 How Vercel builds and serves it, and the security headers
├─ tools/
│  ├─ vercel-build.js          What Vercel runs: checks, and writes app/config.js from the environment variables
│  ├─ build.js                 The checks, and a one-file preview of the app (dist/)
│  ├─ build-functions.js       Makes the server's copy of the reminder rules from the app's own files (npm run functions)
│  ├─ build-emails.js          Makes the account emails (npm run emails)
│  ├─ build-banks.js           Lists the bank logos that are in app/assets/banks/ (npm run banks)
│  ├─ serve.js                 A local web server for app/ (npm start, npm run preview)
│  └─ preview-backend.js       A stand-in for Supabase, for the tests and the preview. Not part of the app
├─ tests/                      The QC suites; tests/fixtures/ holds the example account they calculate against
├─ DEPLOY.md                   Step by step: Supabase, Google, GitHub, Vercel, what to test, what is not built yet
├─ QC-REPORT.md                What was checked and what was found
└─ YOUR-SETUP.md               What is already done in your Supabase and Vercel accounts, and what is left
```

Inside a screen's folder: `<screen>.view.js` is what it shows, `<something>-form.view.js` a panel that opens from it, `<screen>.actions.js` what its buttons do. Every file starts with one line saying what it holds.

## How the server part works

- **Who is logged in** is Supabase Auth's to say. `app/session.js` turns that into what the page shows: the pages before login, a short wait, the first-time setup, or the app.
- **A person's account is one document** in the table `user_data`, one row per person. Every action ends in `save()`; shortly after the last change the document is sent, only if it changed.
- **Two devices**: each save carries the number (`rev`) the account had when it was read. If another device saved in between, the server updates nothing and this device takes the newer version instead of writing over it.
- **No connection**: nothing is lost while the page stays open. The top bar says "not saved yet" and the save is tried again by itself.
- **Protection**: the key in the browser is public. Row-level security in the database lets each person reach their own row only. The page is served with a content security policy: scripts only from the site itself, connections only to Supabase.
- **Passwords** never touch this code's storage: they go to Supabase, which keeps a one-way digest.

## Commands (need Node.js)

| Command | Does |
| --- | --- |
| `npm start` | Serves `app/` at http://localhost:5173 with the same headers as Vercel, talking to the project in `app/config.js` |
| `npm run preview` | The same pages on a stand-in server: no Supabase needed, nothing leaves the browser |
| `npm run build` | Checks the file list and rebuilds the one-file preview in `dist/` |
| `npm install` then `npm test` | Every QC suite |

## How this maps to the Next.js build

| Here | In Next.js |
| --- | --- |
| `js/features/<screen>/` | A route: `app/(app)/<screen>/page.tsx`, with its components beside it |
| `js/features/public/`, `auth/` | Public routes rendered on the server, each with its own URL, title and description |
| `*.view.js` (text built as strings) | React components |
| `*.actions.js` | Event handlers and server actions |
| `js/core/` | `lib/` in TypeScript, almost unchanged; its tests move with it |
| `js/server/server.js` | `@supabase/ssr` clients; the session in cookies, checked on the server |
| `js/server/sync.js`, one document per person | Tables per kind of thing (accounts, transactions, ...) with their own row-level security |
| `supabase/schema.sql` | Migrations in `supabase/migrations/` |
| `js/i18n/translations.js` | One message file per language |
| `css/base/tokens.css` | The design tokens |
| `vendor/` | npm packages |
| `index.html` script list, `config.js` | Gone: Next.js bundles the code and reads environment variables |

## Still true

- **No modules.** Plain scripts loaded in order, sharing names. Every file becomes a TypeScript module in the build.
- **Screens are text, not components.** React replaces that.
- **This is the reference for the Next.js conversion, now with a working server behind it.** It is good for testing with real logins. Before real customers: see "What is not built yet" in `DEPLOY.md` (reminder emails, payments, legal texts, the home page's claims).
