/* Dorax Finance — keeping the open account saved on the server.
   The whole account is one document. Every action ends in save(): shortly after the last change the document is sent, and only if it
   really changed. Each save carries the number the account had when it was read; if another device saved in between, the server refuses
   (a conflict), and this device takes the newer version instead of writing over it.
   When a save cannot reach the server it is tried again by itself, and the top bar says so until it has gone through. */
// last: what the server is known to have. unsure: what was sent since without an answer coming back (it may have arrived, or not).
const SYNC = { rev: null, last: null, unsure: [], timer: null, retry: null, dirty: false, busy: null, failed: false, tries: 0, savedAt: null };
const SAVE_DELAY = 700, RETRY_AFTER = [3000, 10000, 30000, 60000];
const BACKUP_VERSION = 1;       // the shape of an account, as written into a backup file: a file from another shape is refused, never guessed at
/** The account as it is sent: everything except what belongs to this visit (the day it is, the month being looked at). Leaving those out
    means that looking at another month, or opening the app on a new day, is not a change to the account. */
const accountJson = () => JSON.stringify({ ...S, today: undefined, month: undefined });
/** Every action ends here. Nothing is sent while nobody is logged in (the pages before login, the first-time setup). */
function save() { if (!UI.session) return; SYNC.dirty = true; if (!SYNC.timer && !SYNC.busy) SYNC.timer = setTimeout(saveNow, SAVE_DELAY); }
/** Sends the account now if it changed. Answers true when the server has the current version. */
function saveNow() {
  clearTimeout(SYNC.timer); SYNC.timer = null; clearTimeout(SYNC.retry); SYNC.retry = null;
  if (!UI.session) return Promise.resolve(true);
  if (SYNC.busy) return SYNC.busy.then(saveNow);
  const json = accountJson();
  if (json === SYNC.last) { const was = SYNC.failed; SYNC.dirty = SYNC.failed = false; SYNC.tries = 0; if (was) showSaved(); return Promise.resolve(true); }
  const who = UI.session.id;
  // The login is changing under the page (another tab logged in as somebody else; this page hears of it a moment later and switches):
  // nothing is sent until the account on screen and the login are the same person again.
  if (!SERVER.user || SERVER.user.id !== who) return Promise.resolve(false);
  SYNC.busy = SERVER.saveAccount(who, JSON.parse(json), SYNC.rev).then(r => {
    SYNC.busy = null;
    if (!UI.session || UI.session.id !== who) return true;       // logged out, or someone else logged in, while it was on its way
    if (r.ok) return savedAs(r.rev, json);
    if (r.code === 'gone') { reallyLogOut(t('This account no longer exists.')); return false; }
    if (r.code === 'conflict') return takeServerVersion(true, json).then(kept => kept === 'mine' ? saveNow() : false);
    // the server could not be reached, or refused for now: the account is safe in this page, and the save is tried again.
    // Whether this one arrived is not known (the request may have gone through and only the answer been lost): it is remembered.
    if (SYNC.unsure[SYNC.unsure.length - 1] !== json) { SYNC.unsure.push(json); if (SYNC.unsure.length > 4) SYNC.unsure.shift(); }
    const first = !SYNC.failed; SYNC.failed = true; SYNC.dirty = true; SYNC.retry = setTimeout(saveNow, RETRY_AFTER[Math.min(SYNC.tries++, RETRY_AFTER.length - 1)]);
    if (first) showSaved();
    return false;
  });
  return SYNC.busy;
}
/** The server has `json` as revision `rev`. If the account changed again meanwhile, the next save is on its way. */
function savedAs(rev, json) {
  const was = SYNC.failed; Object.assign(SYNC, { rev, last: json, unsure: [], failed: false, tries: 0, savedAt: Date.now(), dirty: accountJson() !== json });
  if (SYNC.dirty && !SYNC.timer) SYNC.timer = setTimeout(saveNow, SAVE_DELAY);
  if (was) { showSaved(); toast(t('Saved. The connection is back.')); }
  return !SYNC.dirty;
}
/** The same document, whatever order its parts are written in (the database keeps a document's parts in its own order). */
function sameDoc(a, b) {
  const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { if (v[k] !== undefined) o[k] = canon(v[k]); return o; }, {}) : v;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}
/** The account as the server has it replaces the one on screen: after a conflict, or when this device comes back to a tab that another one changed.
    One case is not a conflict at all: a save of this device DID arrive and only its answer was lost (the connection dropped at that moment),
    so the "newer version" on the server is one this device sent itself. Then nothing is replaced: what was typed since is kept and saved on top.
    Answers 'mine' in that case. */
async function takeServerVersion(lost, json) {
  const who = UI.session && UI.session.id; if (!who) return;
  const r = await SERVER.loadAccount(who);
  if (!UI.session || UI.session.id !== who || !SERVER.user || SERVER.user.id !== who) return;       // logged out, or the login changed, while it was on its way
  if (!r.ok) { if (!lost) return; SYNC.failed = true; SYNC.dirty = true; clearTimeout(SYNC.retry); SYNC.retry = setTimeout(saveNow, RETRY_AFTER[Math.min(SYNC.tries++, RETRY_AFTER.length - 1)]); return showSaved(); }       // a look that failed changes nothing; a save that failed is tried again
  if (!r.row) return reallyLogOut(t('This account no longer exists.'));       // deleted from another device: this one forgets the login too
  const mine = lost ? [...SYNC.unsure, json].find(j => sameDoc(r.row.data, JSON.parse(j))) : null;
  if (mine) { savedAs(r.row.rev, mine); return 'mine'; }
  const month = S.month; adoptState(r.row.data, r.row.rev); if (month <= ymOf(S.today)) S.month = month;
  UI.drawer = UI.modal = null; UI.sheet = false; renderModal(); render();
  if (lost) toast(t('This account was changed on another device. You are now seeing the latest version; your last change here was not saved.'));
}
/** A backup file is somebody's whole account, and it is drawn on every screen once restored. What a person types (names, descriptions,
    notes) is always written into the page as text. The parts the app itself writes (ids, dates, kinds, colours) are trusted to be what the
    app writes, so a file is restored only if they are: letters, digits and plain punctuation, nothing that could be read as markup.
    The same goes for the names of the parts themselves. Answers false for a file that was edited into something else. */
function backupClean(st) {
  const PLAIN = /^[\p{L}\p{N}_ .,:;+\-\/()#%@|=*!?]{0,200}$/u, MARKUP = /[<>"'`&]/;
  const OWN = /^(id|color|type|kind|scope|status|source|pay|to|tone|lang|locale|theme|namesLang|currency|date|today|since|deadline|month|ticker|sub|version|transferMapping|accountType|language|defaultProfile|forAccount|fingerprint|priceDate|ym|half)$|Id$/;
  const TYPED = /^(bankId|branchId|accountId|institutionId)$/;       // in an OFX profile these are what the person typed (their bank's numbers), written as text like any name
  let ok = true, seen = 0;
  (function walk(v, key, inProfile) {
    if (!ok || ++seen > 2000000) { ok = false; return; }
    if (typeof v === 'string') { if (OWN.test(key) && key !== 'sourceTxnId' && !(inProfile && TYPED.test(key)) && !PLAIN.test(v)) ok = false; return; }       // sourceTxnId is the bank's own text
    if (Array.isArray(v)) return v.forEach(x => walk(x, key, inProfile));
    if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (MARKUP.test(k)) { ok = false; return; } walk(v[k], /^\d+$/.test(k) ? key : k, inProfile || k === 'ofxProfiles'); }
  })(st, '', false);
  return ok;
}
/** Nobody's account is open any more (logged out), or a new one is about to be made: nothing is waiting to be sent, nothing was read. */
function forgetSync() { clearTimeout(SYNC.timer); clearTimeout(SYNC.retry); Object.assign(SYNC, { rev: null, last: null, unsure: [], timer: null, retry: null, dirty: false, failed: false, tries: 0, savedAt: null }); }
/** Puts an account read from the server on screen: its data, and the number that goes back with the next save. */
function adoptState(data, rev) {
  S = data; Object.assign(SYNC, { rev, last: accountJson(), unsure: [], dirty: false, failed: false, tries: 0, savedAt: Date.now() });
  // what belongs to this visit: today is this device's day, and the month shown is the current one
  const now = deviceToday(), y = +now.slice(0, 4); S.today = now; S.month = ymOf(now); if (!S.pay[y]) S.pay[y] = [];
  anchorCards(S, now);      // a card's day given before its month was kept: from its next due date, whichever way the account arrives (core/cards.js)
  dropLeftLedgers(S);      // what deleting an account left behind before deleting took its whole card (features/accounts/wallet.js)
  if (SERVER.user && SERVER.user.email) { if (S.user.pendingEmail === SERVER.user.email) S.user.pendingEmail = null; S.user.email = SERVER.user.email; }       // the login's address is the server's to say
}
/** Whether the account is saved changed: the top bar says so, and so does Settings if it is the screen in view. Nothing else is drawn
    again, so a form being filled in is left alone. */
function showSaved() { if (!UI.session) return; if (UI.route === 'settings' && !UI.drawer && !UI.modal) render(); else renderShell(); }
/** 'saved', 'saving' or 'failed' (the last save could not reach the server and is being tried again). */
const savedState = () => SYNC.failed ? 'failed' : SYNC.busy ? 'saving' : 'saved';
// Coming back to the tab: if another device saved meanwhile, show its version. Only when nothing here is waiting to be saved, checked
// again when the answer is in: something typed in between is saved the normal way, and never dropped without a word.
// Leaving the tab (the only dependable sign on a phone that the page may be closed): what is not saved yet is sent.
document.addEventListener('visibilitychange', () => {
  if (!UI.session) return;
  if (document.visibilityState === 'hidden') { saveNow(); return; }
  const quiet = () => !!UI.session && !SYNC.busy && !SYNC.timer && !SYNC.retry && !UI.drawer && !UI.modal && accountJson() === SYNC.last;
  if (accountJson() !== SYNC.last) return save();
  if (!quiet()) return;
  const who = UI.session.id;
  SERVER.revision(who).then(r => { if (r.ok && quiet() && UI.session.id === who && r.rev !== SYNC.rev) takeServerVersion(false); });
});
window.addEventListener('online', () => { if (UI.session && SYNC.failed) saveNow(); });
// Leaving the page: what is not saved yet is sent, and the browser asks before closing while a save is still on its way.
window.addEventListener('pagehide', () => { if (UI.session) saveNow(); });
window.addEventListener('beforeunload', e => { if (!UI.session || (accountJson() === SYNC.last && !SYNC.busy)) return; saveNow(); e.preventDefault(); e.returnValue = ''; });
