# Dorax Finance: QC report

Date: 2026-10-04. Three rounds: v39 (the new login and the QC of the whole app), v40 (the app separated into files) and v41 (the app on a server: Supabase and Vercel, blank, no prototype boxes).

## v41: the app on a server

### What was done

- **Login and data moved to Supabase.** Sign-up, email confirmation, login, Google, forgotten password, change of password and email, deleting the account, the contact form. Each person's account is saved on the server and read back on any device.
- **Every prototype box removed**, and the pretend buttons with them ("Open the link", "Try an expired link", the stand-in for Google's window, "View the onboarding").
- **The app is blank.** The example account moved out of the app into the tests. The sample buttons in Imports, Spreadsheet and Converter are gone. About 60 texts about the prototype and the example were deleted from the three languages.
- **The Weave pattern turned down** on the home page, the closing panel, login, sign-up and first-time setup.
- **Ready to deploy**: `vercel.json`, `tools/vercel-build.js`, `supabase/schema.sql`, `DEPLOY.md`.

### How it was checked without a live project

No Supabase project or Vercel site existed while this was built, so three things stand in for them. Each covers what the others cannot:

| What | Stands in for | What it proves |
| --- | --- | --- |
| `tests/qc-schema.js`: `schema.sql` run on a real PostgreSQL 16, then every rule tried as a logged-in person, another person and a visitor | The Supabase database | The rules really keep each person's data to themselves. Removing one protection from the script makes 6 or 7 checks fail |
| `tests/qc-deploy.js`: the app served with the headers of `vercel.json`, running on the **real Supabase library**, its requests answered locally in Supabase's own formats | Vercel, and the Supabase API | The app calls the library correctly, reads its answers and error codes, handles the links in emails and the way back from Google, sends every data request with the person's own login, and nothing is blocked by the content security policy |
| `tools/preview-backend.js`, a stand-in that answers from the browser's storage | Supabase, for the long flows | Every flow end to end: two tabs, a lost connection, expired links, conflicts |

**What this does not prove**: that your project is set up as `DEPLOY.md` says (redirect addresses, Google client, email sending). That is what the test list in `DEPLOY.md`, step 6, is for. It takes about ten minutes.

### Result

All suites pass. The browser suites run twice: on the app and on the one-file preview. They were also run with animations on.

| Suite | What it checks | Checks | Failed |
| --- | --- | --- | --- |
| `engine-qc.js` | Every calculation, worked out a second time by separately written code | 61,897 | 0 |
| `converter-qc.js` | Statements in 7 layouts to OFX and back; the spreadsheet import | 8,837 | 0 |
| `qc-schema.js` | **New.** The database script on a real PostgreSQL | 41 | 0 |
| `qc-deploy.js` | **New.** The deployed shape: real Supabase library, Vercel's headers | 63 | 0 |
| `flows-auth.js` | **Rewritten.** Login and server account, every state (see below) | 201 | 0 |
| `qc-screens.js` | 2,538 figures on the screens against a second calculation | 2,546 | 0 |
| `qc-sweep.js` | Every screen x 3 languages x 2 themes x 4 widths; every button; a **blank account** on every screen; **typed text never becomes markup** | 2,351 | 0 |
| `qc-flows.js` | First-time setup, bills, deletes, backup and restore, converter and imports with real files | 44 | 0 |
| `qc-files.js` | Opened from disk and served over http; readers loaded only when needed | 31 | 0 |
| `check-i18n.js` | Every text exists in Spanish and Portuguese | 1,760 texts | 0 |

The calculations were not touched in v41, and the two calculation suites confirm it: same checks, same results as v39.

`flows-auth.js` covers: the form and its errors; confirm-your-email, send again, an expired link, a used link; a reload in the middle of the setup; saving and reload; wrong password and unknown email getting the same answer; forgotten password, cancelled reset; email change with a link to each address; Google new, Google again, Google meeting an email that has a password, Google cancelled, a sign-up never confirmed then Google; two tabs (conflict, catching up, log out together, log in together); a lost connection (warning, asked before logging out, sent when back); an account that cannot be read; a slow server (button waits, second press ignored); deleting the account; the contact form; a copy not connected to a server; Spanish and Portuguese; phones.

### An independent review, and what it found

Before finishing, the server code was given to a separate reviewer with instructions to break it. It reproduced its findings against the real library. **12 defects, all fixed, each now covered by a test:**

| # | Was | Now |
| --- | --- | --- |
| 1 | **Serious.** A save that reached the server while its answer was lost (connection dropped at that moment) was later mistaken for a change on another device: everything typed since was thrown away | The app remembers what it sent without an answer. If the "newer version" on the server is one of those, nothing is replaced and the later changes are saved on top |
| 2 | In a gap of about a millisecond (longer in a background tab), after another tab logged in as someone else, one person's account could be sent towards the other's row | Every request names whose row it means, and nothing is sent while the account on screen and the login are different people. The database would refuse it as well |
| 3 | "Choose a new password" was shown whenever the address said `type=recovery`, even a made-up one, and could apply to whoever was logged in | Only when the link carried a login and the person the library then confirms is that same person |
| 4 | A "Delete my account" that failed (no connection) silently stopped all saving afterwards | Fixed |
| 5 | A recovery link opened in one tab pushed every other open tab into "choose a new password", where it stuck | Only the tab the link was opened in asks |
| 6 | A backup file edited by hand could carry markup in the app's own ids; only the security policy stopped it from running | Such a file is refused. A new test puts markup into every typed text of an account and checks that no screen or panel turns it into an element (0 in 13 screens and 30+ panels) |
| 7 | The contact form could be filled by a script without limit | Capped in the database at 30 messages an hour in all |
| 8 | Coming back to a tab could silently drop a change typed in that same second | Checked again before anything is replaced |
| 9 | A change made in the last 700 ms before leaving the page might not be sent | Also sent when the tab is hidden, the only dependable signal on phones |
| 10 | An account deleted on another device left the login in the browser; the first-time setup was offered to a deleted person | Logged out, login forgotten |
| 11 | After the "cannot be read" screen, logging in again left the button waiting forever | Fixed |
| 12 | The deploy script missed a secret key written with double quotes, and let a production deploy through with nothing connected | It reads the file the way a browser does; a production deploy without a project now fails with the reason |

Also from the review: logging out now ends the session in this browser only, not on every device; messages a person sent while logged in are deleted with their account.

### Known limits (not defects; decisions for later)

- **Unsaved changes live in the open page.** While the top bar says "not saved yet", closing the tab loses them. The browser asks before closing on a computer; phones do not.
- **The whole account is one document**, sent again on every save. Right for testing and first users; see `DEPLOY.md`, "What is not built yet", point 6.
- **Offline, opening the account takes about 7 seconds to say so**: the Supabase library tries a few times first.
- **Two tabs in the first-time setup at once**: the second to finish takes the first one's account. Nothing is lost or doubled.

### Not covered, and why

- **Your real project**: see above. `DEPLOY.md`, step 6.
- **Real devices, a real screen reader, 200% zoom, real bank files**: still on your device checklist.
- **Portuguese and Spanish wording** of the 46 new texts needs the native review you planned.
- **Email deliverability and Google's consent screen** cannot be tested from here.

## v40: the app separated into files

The app was split from one page into 93 scripts, 34 stylesheets and 3 library files (see `README.md`). Nothing in its behaviour was meant to change, and that was checked three ways:

| Check | Result |
| --- | --- |
| The stylesheets, joined in order, against the v39 stylesheet | Identical, byte for byte |
| 430 screen states (every screen, both themes, three widths, three languages, public pages, panels, a dialog), structure and computed styles and positions, against v39 | 430 identical, 0 different. Done for the separated app and for the one-file version |
| All 171 button actions and all field handlers, against v39 | Same names, same code |

All suites then pass on both versions, with animations off and on. One suite is new, `qc-files.js` (42 checks):

- The PDF and Excel readers (1.8 MB) are no longer loaded with the page. Each is fetched once, when such a file is chosen. An old Excel file and a PDF were converted this way, opened from disk and through a web server.
- Served by a web server, every file the page asks for is found, sign-up works, data survives a reload, and the app runs inside a sandboxed frame.

Two things were added, both invisible in use: the icons from your logo files (browser tab, phone home screen) and a web app manifest, which lets the hosted app be installed.

Not done on purpose, and why, is in `README.md` under "What was deliberately left for the conversion".

## v39: the new login and the QC of the whole app

Build checked: v39.

### Result

The sign-up and login were rebuilt (name, email, password, Google). The whole app was then checked. **14 defects were found and fixed**, three of them serious. After the fixes, all seven test suites pass, with animations off and on.

| Suite | What it checks | Checks | Failed |
| --- | --- | --- | --- |
| `engine-qc.js` | Every calculation, worked out a second time by separately written code: the example account on five dates, 300 random accounts, hand-made edge cases | 61,897 | 0 |
| `converter-qc.js` | Statements in 7 layouts, both orders, to OFX and back; the spreadsheet import in three languages | 8,837 | 0 |
| `qc-screens.js` | 2,538 figures read from the screens and compared with a second calculation, before and after ten kinds of action | 2,546 | 0 |
| `qc-sweep.js` | 13 screens x 3 languages x 2 themes x 4 widths; every button pressed (70 on desktop, 69 on a phone); 7 public pages | 1,897 | 0 |
| `flows-auth.js` | Sign-up, login, forgotten password, Google, profile password, phones, a sandboxed frame | 125 | 0 |
| `qc-flows.js` | First-time setup, bills, deletes, backup and restore, converter with a real file, imports, spreadsheet | 43 | 0 |
| `check-i18n.js` | Every interface text exists in Spanish and Portuguese with the same placeholders | 1,777 texts | 0 |

### What was fixed

#### Serious (wrong data could be saved)

1. **Ids repeated after a reload.** New things get an id made of a prefix and a counter. The counter restarted with every page load, while the data now survives a reload. The first things created after a reload took ids already in use, so a new fixed cost could take over the name and payments of an existing one. The counter now starts above every id in the open account.
2. **Typed amounts were misread.** Forms used the reader meant for bank files, which guesses. `45,905` (a slip for 45,90) was saved as R$ 45.905,00; a yield of `0,085` as R$ 85,00; `1o0` as 10. Forms now use a strict reader: letters are refused, and a mark followed by three digits is read with the number format chosen in Settings.
3. **Quota counts.** `1.000` quotas was read as 1. It is now one thousand; a decimal part is refused.

#### Wrong or misleading figures

4. **Goals with money already saved.** A goal created with R$ 12.500 already saved read "R$ 12.500 ahead of the plan", and stayed "ahead" however many planned months were missed. Ahead and behind now compare contributions with the plan; the starting balance still counts in what is saved.
5. **Reports compared a month in progress with a whole month.** On 2 October the report read "Expenses down 92,9%" against all of September. It now compares the same days, as the dashboard has since v15, and says so in the column heading ("Sep 1–2").
6. **Reports, largest expense lines.** Spending under a category with no subcategory was missing (in the example, "Going out", 27% of the month). It is listed now.
7. **Category shares.** The largest category absorbed all the rounding: 61,96% showed as 61%. Shares now use the largest-remainder method: they add up to 100 and none is a whole point off.
8. **Percentages rounded twice.** 14,48% became 14,5 and then 15% in "Plan vs actual". Now 14%.
9. **Amounts shown without cents were cut, not rounded.** R$ 214,80 read "R$ 214". Now R$ 215.
10. **Plan, yearly grid.** The year total of "Income minus fixed costs" was empty (the same gap your sheet had in row 24). It is filled in, in all three views.
11. **Converter, statements listed newest first within one day.** Such a file was read upside down: its balances "did not follow" and the closing balance in the OFX came from the oldest line. The balances now decide the order.
12. **Recurring payments, typical amount.** With an even number of payments it took the upper of the two middle values. It is a true median now.

#### Smaller

13. Password fields had no field styling (this also affected the PDF password field in the converter).
14. Reports said "Savings" where the rest of the app says "Left over"; the setup now marks an already-saved amount explicitly as a starting balance.

### Checked and found correct

Monthly income, spending and left over; household and company kept apart; transfers never counted as spending; splits; ignored rows; account balances; planned against paid for every fixed cost and every status (unpaid, late, paid, over, budget used); due days including day 31 in shorter months and leap years; the hand-out of savings and its remainder; one salary shared between two rows without losing a cent; goal projections and the monthly amount needed for a deadline; average price, sale result, income per quota and yield of FIIs; the purchase simulator; card invoices; all reminders; OFX in every version (totals, ids, dates, closing balance, plain ASCII); the spreadsheet import (same totals, and importing twice changes nothing).

### What changed in how the app behaves

- **Login.** Email and password, or Google. This replaces the login by emailed link you chose earlier. Accounts made before today have no password: "Forgot your password?" sets one.
- **Reports** compare the same days while a month is in progress.
- **Forms** refuse amounts they cannot read with certainty, instead of guessing.

### Not covered, and why

- **Real Google and real email.** In v39 the prototype had no server and both were stand-ins. Since v41 they are real: see the top of this report and `DEPLOY.md`.
- **The 27 earlier test suites.** They lived in earlier sessions and were not in this folder, so they were not re-run. The source was recovered from the published page (the rebuilt file was byte-for-byte identical before any change), and the seven suites below were written new. From now on the source and the tests are in this folder.
- **Real devices, a real screen reader, 200% zoom, real bank files.** Still on your device checklist.
- **Portuguese and Spanish wording** of the new texts (about 60) needs the native review you planned.
- **Contrast** of the new elements was calculated (lowest: field border 3,1:1, rule text 5,6:1, error text 8,5:1). The full contrast scan of earlier versions was not re-run; no existing colour was changed.

### Observations, not changed

- On tablets around 820px wide, the tables on Plan, Imports and Recurring are wider than their card and scroll sideways inside it. Nothing is cut off, but the last columns are out of sight until scrolled.
- The example account has goal contributions from January and transactions from April, so January to March show income of 0 in the "Actual" view of the plan.

## How to run the checks again

```
npm install
npx playwright install chromium
npm test
```

Set `MOTION=1` to run the browser suites with animations on. `qc-schema.js` needs PostgreSQL installed on the computer; where it is not, it says "skipped" and the run still passes.
