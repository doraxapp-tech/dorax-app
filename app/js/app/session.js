/* Dorax Finance — the frame: who is logged in, opening their account, leaving it.
   The server (Supabase, through server/server.js) says who the person is; this file decides what the page shows for it:
   the pages before login, a short wait, the first-time setup of a new account, or the app with the account read from the server. */
let WHO = null;            // the id of the person whose account is open, or on its way; null while nobody is logged in
let RECOVERING = false;    // a "forgot my password" link was opened: the person chooses a new password before anything else
let STARTED = false;       // start-up is over: from here on, news from the server (logged in, logged out) is acted on

function resetUi() {
  UI.jstart = null; if (typeof renderJstart === 'function') renderJstart();
  UI.tour = null; if (typeof renderTour === 'function') renderTour();      // a screen's first visit goes with the session (features/tours)      // the Journey's first page goes with the session (features/journey)
  UI.conv = UI.imp = UI.sheetImp = UI.rulePrompt = UI.dist = UI.sim = UI.undo = UI.inc = UI.drawer = UI.modal = UI.flash = UI.ob = UI.impError = UI.backupError = UI.contact = UI.pw = UI.coSetup = UI.stepsDone = UI.paySkip = UI.guard = null; UI.insightOpen = false; UI.curio = null; UI.space = 'personal'; UI.sheet = false; UI.planYear = UI.goalYear = +S.today.slice(0, 4);
  Object.assign(UI.tx, TX_RESET, { month: 'current', sort: 'date', dir: -1 }); Object.assign(UI.fii, { ticker: '', kind: '', month: null, limit: 30 }); renderModal();
}
/** A screen that stands between the pages before login and the app: 'loading', 'offline' (the account could not be read), 'reset' (new password). */
function showGate(screen, more) {
  UI.session = null; UI.drawer = UI.modal = null; UI.sheet = false; renderModal();       // a dialog of the screen before must not stay on top of this one
  UI.pub = { ...freshPub(), screen, ...(more || {}) }; renderNow(); toTop();
}
/** The person has proved who they are (password, Google, or a link from an email): their account is read from the server and opened.
    Someone whose account has nothing saved yet goes through the first-time setup, with the name given at sign-up (or by Google) filled in.
    Safe to call twice for the same person: the second call does nothing. */
async function openAccount() {
  const u = SERVER.user; if (!u) return leaveSession();
  if (WHO === u.id) return;
  if (UI.session) { UI.session = null; forgetSync(); }      // another person logged in from another tab: their account takes the place of this one
  WHO = u.id; showGate('loading');
  const r = await SERVER.loadAccount(u.id);
  if (WHO !== u.id) return;                                  // logged out, or someone else logged in, while it was on its way
  // WHO is given up with every screen that is not the account: "try again", or logging in again, starts from the beginning
  if (!r.ok) { WHO = null; return showGate('offline', { error: serverSays(r.code) }); }
  if (!r.row) {
    const lang = S.settings.lang; forgetSync(); S = buildNewState(u.email, lang, deviceToday()); UI.ob = null;
    UI.pub = { ...freshPub(), screen: 'onboard', name: SERVER.name() }; renderNow(); toTop(); enterView();
    const el = $('ob-name'); if (el) { el.focus(); if (el.select) el.select(); }
    return;
  }
  if (!accountShape(r.row.data)) { WHO = null; return showGate('offline', { error: t('This account could not be opened: what the server keeps for it cannot be read by this version of the app. Nothing was changed. Write to us through the contact form.'), fixed: true }); }
  adoptState(r.row.data, r.row.rev); rememberLang(S.settings.lang);
  startSession(S.user.name ? t('Good to see you again, {name}.', { name: firstName(S.user.name) }) : t('Good to see you again.'));
}
/** What an account has to have for the screens to draw it. The same check a backup file goes through before it is restored. */
const accountShape = st => !!(st && Array.isArray(st.accounts) && Array.isArray(st.transactions) && st.plan && Array.isArray(st.plan.lines) && st.pay && Array.isArray(st.goals) && Array.isArray(st.goalMoves) && st.settings && st.user && st.fii && Array.isArray(st.categories));
/** The account in S goes on screen. A new account (the first-time setup just ended) is written to the server here for the first time. */
function startSession(message) {
  const u = SERVER.user; if (!u) return leaveSession();
  WHO = u.id; S.user.email = u.email;
  UI.session = { id: u.id, email: u.email, since: localDay(u.last_sign_in_at) || S.today };
  S.month = ymOf(S.today); resetUi(); UI.pub = freshPub();      // an account opens on the current month: that is where what needs doing is
  let h = ''; try { h = location.hash.slice(1); } catch (e) { /* a sandboxed frame has no address to read */ }
  navigate(h); toast(message); cheerBaseline(); saveNow();
  LOCK.touch = Date.now(); guardSeen(true); if (LOCK.on) renderLock();      // this device was used just now (features/lock); a closed screen now knows the name
}
/** The day of a moment the server gives (in universal time), as it was on this device. */
function localDay(iso) { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''; }
/** Nobody is logged in any more: the account leaves the page (it stays on the server) and the home page is shown. */
function leaveSession(message) {
  const lang = S.settings.lang;
  WHO = null; RECOVERING = false; UI.session = null; UI.bye = null; forgetSync();
  if (LOCK.on) { LOCK.on = LOCK.leaving = false; renderLock(); }      // nobody's account is behind the lock any more
  S = buildNewState('', lang, deviceToday()); resetUi(); UI.pub = freshPub();
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* a sandboxed frame keeps its address */ }
  renderNow(); toTop(); enterView(); if (message) toast(message); curioMaybe();
}
/** Logging out, asked for here. What is not saved yet is sent first; if it cannot be, the person decides. */
async function logOut(message) {
  if (UI.session) {
    let saved = await saveNow(); if (!saved && !SYNC.failed) saved = await saveNow();
    if (!saved && SYNC.failed) return confirmBox({ tone: 'neutral', title: t('Log out without saving?'), text: t('Your last changes have not reached the server yet. If you log out now, they are lost.'), label: t('Log out anyway'), run() { reallyLogOut(message); } });
  }
  return reallyLogOut(message);
}
async function reallyLogOut(message) {
  UI.bye = message || t('Logged out. See you soon.'); UI.session = null;       // from here on nothing more is saved for the account that is leaving
  await PUSH.off();                          // this browser stops getting this person's reminders: the next one to use it must not see them
  await SERVER.signOut();                    // also when the server cannot be reached: this device forgets the login either way
  if (WHO || UI.session || UI.pub.screen !== 'landing') leaveSession(UI.bye);
}
/** A "forgot my password" link was opened in this tab, and the library confirmed whose it is: that person chooses a new password before
    their account opens. */
function startRecovery() { RECOVERING = true; WHO = null; forgetSync(); showGate('reset', { email: (SERVER.user && SERVER.user.email) || '' }); enterView(); const el = $('au-pass'); if (el) el.focus(); }

/** News from the server, for as long as the page is open: this tab or another one logged in or out, a link from an email was opened. */
function onServerNews(event, session) {
  if (!STARTED) return;                       // start-up reads the first answer itself (app/boot.js)
  if (event === 'SIGNED_OUT') { if (WHO || UI.session || RECOVERING || UI.pub.screen === 'onboard') leaveSession(UI.bye || t('You were logged out.')); return; }
  // A "forgot my password" link asks for a new password in the tab it was opened in (start-up sees to that, app/boot.js). Every other tab
  // of this browser hears of it too: to them it is a login like any other.
  if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') { if (!RECOVERING) openAccount(); return; }
  if (event === 'USER_UPDATED' && UI.session && session && session.user.email && session.user.email !== S.user.email) {
    S.user.email = UI.session.email = session.user.email; S.user.pendingEmail = null; save(); render();
    toast(t('Email changed. Next time, log in with {email}.', { email: S.user.email }));
  }
}
/** What the server answered, in words. Anything it says that has no sentence of its own gets the last one. */
function serverSays(code) {
  return ({
    network: t('The server could not be reached. Check your connection and try again.'),
    not_connected: t('This copy of Dorax is not connected to its server yet, so nobody can log in. The steps are in DEPLOY.md.'),
    over_request_rate_limit: t('Too many tries. Wait a minute and try again.'),
    over_email_send_rate_limit: t('Too many emails were asked for. Wait a few minutes and try again.'),
    email_address_invalid: t('That email does not look right. Check it and try again.'),
    email_address_not_authorized: t('The server is not allowed to send email to that address yet.'),
    user_already_exists: t('That email already has an account.'), email_exists: t('That email already has an account.'),
    weak_password: t('The server found that password too easy to guess. Choose a longer or less common one.'),
    same_password: t('The new password is the same as the current one.'),
    signup_disabled: t('New accounts are closed for now.'),
    provider_disabled: t('Logging in with Google is not switched on yet.'), validation_failed_provider: t('Logging in with Google is not switched on yet.'),
    email_provider_disabled: t('Logging in with a password is not switched on yet.'),
    reauthentication_needed: t('For safety, log out, log in again, and then change it.'),
    session_not_found: t('Your session ended. Log in again.'), session_expired: t('Your session ended. Log in again.'), refresh_token_not_found: t('Your session ended. Log in again.'),
    user_banned: t('This account is blocked. Write to us through the contact form.'),
    otp_expired: t('That link no longer works. Ask for a new one.'),
    access_denied: t('Google was cancelled. Nothing was created or changed.'),
    login_failed: t('The login could not be completed. Nothing was created or changed. Try again, or log in another way.'),
  })[code] || t('Something went wrong on the server. Try again in a moment.');
}
