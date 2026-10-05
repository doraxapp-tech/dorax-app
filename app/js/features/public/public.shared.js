/* Dorax Finance — what people see before they are in: the landing page, the login, and the first-time setup of a new account.
   Home page content standard (E-E-A-T; money is a "your money or your life" subject, so the bar is high):
   - The page is about the product and the person using it. It never talks about whoever makes it: no founder story, no first person,
     no personal details (the owner's decision). Experience is shown by the product itself: what it does on screen, and how.
   - Expertise: the page says HOW each number is worked out, not only that it is. Each rule there is what the code does.
   - Authority: outside facts carry their source and the date it was read. No awards, rankings or user counts.
   - Trust: what happens to files, what the app does not do, who it is for, how to get in touch, when the page was last reviewed.
     Where a fact is missing (who is legally responsible, how payment and refunds work, the legal wording) the page says PLACEHOLDER
     instead of guessing. Contact: the owner's decision is a contact form; no address is shown.
   - The page describes Dorax AS IT WILL LAUNCH (owner's launch decisions, 2026-10-02): data on the server for everyone, reminders by email,
     a contact form, Stripe, monthly and yearly prices. Of those, the data on the server, the login and the contact form are built (v41);
     reminders by email and paying for a plan are not yet. By the owner's decision (2026-10-03) the page
     carries no prototype notice, no "draft" marks and no PLACEHOLDER; the legal pages themselves still say they are drafts.
   - Brand facts (v13): three plans built only from what the app does; where data is kept (in the account, on the server); privacy policy and terms as
     drafts, written from what the code does and marked as waiting for a lawyer.
   No language selector here: a public page has one language per address (see the notes for the real site). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// What the pages before login remember. password is cleared as soon as it has been sent; sent says which email the "check your email" screen is
// about ('confirm' or 'reset'); busy names the button whose question to the server is still on its way.
const freshPub = () => ({ screen: 'landing', mode: 'signup', email: '', name: '', password: '', accept: false, show: false, error: null, errs: {}, notice: null, resent: false, sent: null, busy: null, back: null });
const placeholder = text => `<span class="chip warn ph"><i></i>PLACEHOLDER</span> <span class="muted">${text}</span>`;
const LP_REVIEWED = '2026-10-02';       // the day the claims on the home page were last checked against the app and the sources
// The logo: the word "dorax" drawn from rings and bars. The top-left quarter of the d is the accent (the goal ring with its last quarter lit).
// tag = true adds the "FINANCE" descriptor, for the screens where the name stands alone (login, onboarding, legal pages, footer).
const LOGO = '<svg class="logo" viewBox="0 10 306 90" role="img" aria-label="Dorax Finance"><g fill="none" stroke="currentColor" stroke-width="15"><circle cx="30" cy="70" r="22.5"/><circle cx="97" cy="70" r="22.5"/><circle cx="214" cy="70" r="22.5"/><path d="M141.5 70a22.5 22.5 0 0 1 33.75-19.49"/><path class="ac" d="M7.5 70a22.5 22.5 0 0 1 22.5-22.5"/></g><g fill="currentColor"><rect x="45" y="10" width="15" height="90"/><rect x="134" y="40" width="15" height="60"/><rect x="229" y="40" width="15" height="60"/><polygon points="288,40 306,40 268,100 250,100"/><polygon points="250,40 268,40 306,100 288,100"/></g></svg>';
const brandMark = tag => `<div class="brand${tag ? ' tag' : ''}">${LOGO}${tag ? '<small aria-hidden="true">FINANCE</small>' : ''}</div>`;
const langSelect = (id, long) => `<label class="sr" for="${id}">${t('Language')}</label><select id="${id}" class="lang" data-c="setting" data-k="lang">${options(long ? LANGS : LANGS.map(([v]) => [v, v.toUpperCase()]), S.settings.lang)}</select>`;
/** The language menu in the bar, drawn as a small pill the size of the buttons beside it. The real menu lies over it, invisible, at 16px:
    a menu drawn smaller than that makes an iPhone zoom the page when it opens. */
const langPill = id => `<label class="sr" for="${id}">${t('Language')}</label><span class="lang-pill"><span aria-hidden="true">${S.settings.lang.toUpperCase()}</span>${icon('right')}<select id="${id}" class="lang" data-c="setting" data-k="lang">${options(LANGS.map(([v]) => [v, v.toUpperCase()]), S.settings.lang)}</select></span>`;
