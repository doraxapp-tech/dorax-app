/* Dorax Finance — shared: the open account (S), what the screen remembers (UI), today. */
/** The day it is on this device. A test can pin it (window.DORAX_TODAY) so that its results do not depend on the day it runs. */
function deviceToday() {
  if (typeof window !== 'undefined' && window.DORAX_TODAY) return window.DORAX_TODAY;
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// The open account. Before anyone is logged in it is an empty one, there only so the pages before login have a language and a date;
// logging in replaces it with the account read from the server (app/session.js).
let S = buildNewState('', defaultLang(), deviceToday());
const UI = {
  session: null,        // { id, email, since } once logged in; null shows the landing page and the login
  pub: null,            // what the pages before login remember: freshPub() in features/public/public.shared.js, set at start-up
  forceTone: null,      // tests pin the wording here
  route: 'dashboard',
  space: 'personal', spaceCur: null,   // Plan and Savings & goals: whose money is shown (household or company) and, for a company with two currencies, which one
  tx: { q: '', month: 'current', scope: 'personal', account: '', category: '', type: '', status: '', sort: 'date', dir: -1, page: 1, size: 10 },
  drawer: null, sheet: false, rulePrompt: null, toast: null,
  conv: null,           // statement -> OFX session
  imp: null,            // CSV / OFX import session (household)
  backupError: null,    // Settings: why a chosen backup file was refused
  sheetImp: null,       // spreadsheet import: { step: 'pick' | 'review' | 'done', file, units, error, result }
  planMode: 'plan', planYear: +S.today.slice(0, 4), goalYear: +S.today.slice(0, 4), goalMode: 'plan', dist: null, showClosed: false,
  fii: { ticker: '', kind: '', month: null, limit: 30 }, sim: null, inc: null, undo: null, modal: null, flash: null,
  catEdit: null, catOpen: {},   // Categories: the one being renamed, and which ones show their subcategories
  pg: {},                       // one pager for every long table: { key: { page, size } }, forgotten when the screen changes
};
/** Names the app itself wrote (a new account's groups, "Salary", "Starting balance") follow the language chosen.
    What the person typed is never changed: relabel() tells the two apart. Called before every render, so no path can miss a language change. */
function syncNames() { if (S.namesLang !== S.settings.lang && relabel(S, S.settings.lang) && UI.session) save(); }
/** A name the app writes now, in the language in use, with the mark that lets it follow the language later: { name, k }. */
const appName = (key, field) => ({ [field || 'name']: nameIn(key, S.settings.lang, S), k: { [field || 'name']: key } });
/** Called when an account is opened: move it to the real day. If the person was looking at the month that was current, follow it. */
function syncToday() {
  const now = deviceToday(), was = S.today; if (now === was) return;
  if (S.month === ymOf(was) || S.month > ymOf(now)) S.month = ymOf(now);
  S.today = now; const y = +now.slice(0, 4); if (!S.pay[y]) S.pay[y] = [];
}
/** The earliest month the arrows go back to: the first month with anything in it (a plan year, the day the account was made, the oldest transaction). */
const minMonth = () => [Math.min(+S.today.slice(0, 4), ...Object.keys(S.pay).map(Number)) + '-01', S.user.since ? ymOf(S.user.since) : '9999-12', ...S.transactions.slice(-1).map(x => ymOf(x.date))].sort()[0];
