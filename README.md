# Dorax Finance: web app (v41)

Saved 2026-10-04. v41 turns the prototype into an app that runs on a server: logins and data are in **Supabase**, the files are served by **Vercel**. The app starts blank; there is no example account and no prototype box.

**To put it live, follow [`DEPLOY.md`](DEPLOY.md).** What was checked is in [`QC-REPORT.md`](QC-REPORT.md).

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
│  │  ├─ data/                 What a new account starts with
│  │  ├─ i18n/                 Spanish and Portuguese, the friendly voice, the (i) hints
│  │  ├─ server/               server.js: the ONLY file that talks to Supabase. sync.js: keeping the open account saved
│  │  ├─ ui/                   Shared pieces: the open account, language, formats, icons, small components
│  │  ├─ features/             ONE FOLDER PER SCREEN (dashboard, transactions, plan, goals, investments, reports,
│  │  │                        accounts, imports, converter, recurring, categories, settings, profile, reminders,
│  │  │                        public, auth, onboarding)
│  │  └─ app/                  The frame: routes, menu, panels, dialogs, session (who is logged in), events, start-up
│  └─ vendor/                  supabase-js, pdf.js, SheetJS (not ours; see vendor/README.md)
├─ supabase/schema.sql         The database: two tables, one function, and the rules that keep each person's data theirs
├─ vercel.json                 How Vercel builds and serves it, and the security headers
├─ tools/
│  ├─ vercel-build.js          What Vercel runs: checks, and writes app/config.js from the environment variables
│  ├─ build.js                 The checks, and a one-file preview of the app (dist/)
│  ├─ serve.js                 A local web server for app/ (npm start, npm run preview)
│  └─ preview-backend.js       A stand-in for Supabase, for the tests and the preview. Not part of the app
├─ tests/                      The QC suites; tests/fixtures/ holds the example account they calculate against
├─ DEPLOY.md                   Step by step: Supabase, Google, GitHub, Vercel, what to test, what is not built yet
└─ QC-REPORT.md                What was checked and what was found
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
