/* Dorax Finance — clicks: creating an account and logging in. Joined into A in app/actions.js.
   Every action here asks the server (server/server.js) and waits for its answer; while it waits, the button that started it says so
   and a second press does nothing. What the server refuses comes back as a code, turned into words by serverSays() (app/session.js). */
/** A form before login was refused: each field says what is wrong with it, and the keyboard goes to the first one that needs fixing. */
function authFail(errs, message, order) {
  const p = UI.pub, ids = { name: 'au-name', email: 'au-email', password: 'au-pass', accept: 'au-accept' };
  p.errs = errs; p.error = message || null; p.notice = null; renderNow();
  const first = order.find(k => errs[k]) || order[0], el = $(ids[first]); if (el) el.focus();
}
/** Another screen of the login: drawn, scrolled to the top, and the keyboard put where the next thing happens. */
function authShow(sel) { renderNow(); window.scrollTo(0, 0); enterView(); const el = document.querySelector('#public ' + sel) || $('au-title'); if (el) el.focus({ preventScroll: true }); }
function authClear(el, k) {
  if (!UI.pub.errs || !UI.pub.errs[k]) return; UI.pub.errs[k] = null;
  const f = el.closest('.field'); if (f) { f.classList.remove('bad'); const e = f.querySelector('small.err'); if (e) e.remove(); } el.removeAttribute('aria-invalid');
  if (el.id === 'au-pass' && $('pw-rules')) el.setAttribute('aria-describedby', 'pw-rules'); else el.removeAttribute('aria-describedby');
}
/** One question to the server at a time. Answers what the server said, or null when another question is still on its way. */
async function authAsk(what, request) {
  const p = UI.pub; if (p.busy) return null;
  if (!SERVER.ready) { authFail({}, serverSays('not_connected'), []); return null; }
  p.busy = what; p.error = null; renderNow();
  const r = await request();
  UI.pub.busy = null;
  return r;
}
const AUTH_ACTIONS = {
  'pw-eye'() {       // shows or hides what is typed, in place: nothing is drawn again, so the caret stays where it is
    const p = UI.pub; p.show = !p.show;
    const inp = $('au-pass'), b = document.querySelector('#public .pw-eye'); if (!inp || !b) return;
    inp.type = p.show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(p.show)); b.dataset.tip = p.show ? t('Hide the password') : t('Show the password'); b.innerHTML = icon(p.show ? 'eyeoff' : 'eye');
  },
  async 'auth-signup'() {
    const p = UI.pub, name = (p.name || '').trim(), email = (p.email || '').trim().toLowerCase(), errs = {};
    if (!name) errs.name = t('I need something to call you. A nickname works.');
    if (!EMAIL_RE.test(email)) errs.email = t('That email does not look right. Check it and try again.');
    const bad = pwProblem(p.password, email); if (bad) errs.password = bad;
    if (!p.accept) errs.accept = t('Tick the box to accept the terms and the privacy policy.');
    if (Object.keys(errs).length) return authFail(errs, null, ['name', 'email', 'password', 'accept']);
    const r = await authAsk('auth-signup', () => SERVER.signUp({ name, email, password: p.password, lang: S.settings.lang })); if (!r) return;
    const taken = () => authFail({ email: t('That email already has an account. Log in instead.') }, null, ['email']);
    if (!r.ok) {
      if (r.code === 'user_already_exists' || r.code === 'email_exists') return taken();
      if (r.code === 'weak_password') return authFail({ password: serverSays(r.code) }, null, ['password']);
      if (r.code === 'email_address_invalid') return authFail({ email: serverSays(r.code) }, null, ['email']);
      return authFail({}, serverSays(r.code), ['email']);
    }
    if (r.exists) return taken();
    Object.assign(UI.pub, { name, email, password: '', show: false, accept: false, error: null, errs: {}, notice: null, resent: false });
    if (r.session) return openAccount();       // the project does not ask for the email to be confirmed: the person is in
    Object.assign(UI.pub, { screen: 'sent', sent: 'confirm' }); authShow('[data-a="auth-resend"]');
  },
  async 'auth-login'() {
    const p = UI.pub, email = (p.email || '').trim().toLowerCase(), errs = {};
    if (!EMAIL_RE.test(email)) errs.email = t('That email does not look right. Check it and try again.');
    if (!p.password) errs.password = t('Type your password.');
    if (Object.keys(errs).length) return authFail(errs, null, ['email', 'password']);
    const r = await authAsk('auth-login', () => SERVER.signIn(email, p.password)); if (!r) return;
    if (r.ok) { UI.pub.password = ''; return openAccount(); }
    // signed up but the email was never confirmed: the right password leads back to "confirm your email", not into an account that does not exist yet
    if (r.code === 'email_not_confirmed') { Object.assign(UI.pub, { email, password: '', show: false, screen: 'sent', sent: 'confirm', error: null, errs: {}, notice: t('Confirm your email first. The link is in your inbox.'), resent: false }); return authShow('[data-a="auth-resend"]'); }
    UI.pub.password = '';
    // one answer for a wrong password, an unknown email and an account that only uses Google: the screen never says which emails have an account
    authFail({}, r.code === 'invalid_credentials' ? t('Email or password is not right. If you signed up with Google, use the Google button.') : serverSays(r.code), ['password']);
  },
  async 'auth-forgot-send'() {
    const p = UI.pub, email = (p.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return authFail({ email: t('That email does not look right. Check it and try again.') }, null, ['email']);
    const r = await authAsk('auth-forgot-send', () => SERVER.sendReset(email)); if (!r) return;
    if (!r.ok) return authFail({}, serverSays(r.code), ['email']);
    Object.assign(UI.pub, { email, password: '', screen: 'sent', sent: 'reset', error: null, errs: {}, notice: null, resent: false });
    authShow('[data-a="auth-resend"]');
  },
  /** The link was opened and a new password typed. The person is already known to the server (the link said who), so saving it lets them in. */
  async 'auth-reset-save'() {
    const p = UI.pub, bad = pwProblem(p.password, p.email);
    if (bad) return authFail({ password: bad }, null, ['password']);
    const r = await authAsk('auth-reset-save', () => SERVER.setPassword(p.password)); if (!r) return;
    if (!r.ok) return authFail({ password: serverSays(r.code) }, null, ['password']);
    UI.pub.password = ''; RECOVERING = false; await openAccount(); if (UI.session) toast(t('Password saved. You are in.'));
  },
  'auth-reset-cancel'() { logOut(t('Nothing was changed. Your password is the one you had.')); },
  async 'auth-resend'() {
    const p = UI.pub, r = await authAsk('auth-resend', () => p.sent === 'reset' ? SERVER.sendReset(p.email) : SERVER.resend(p.email)); if (!r) return;
    if (!r.ok) { UI.pub.error = serverSays(r.code); return renderNow(); }
    UI.pub.resent = true; UI.pub.error = null; renderNow();
  },
  /** Leaves for Google's own page. The person comes back logged in; if they cancel there, they come back to the login, which says so (app/boot.js). */
  async 'auth-google'() {
    const r = await authAsk('auth-google', () => SERVER.google()); if (!r) return;
    if (!r.ok) return authFail({}, serverSays(r.code), []);
    if (UI.pub.screen === 'auth') { UI.pub.busy = 'auth-google'; renderNow(); }       // the browser is on its way to Google: the button keeps waiting
  },
  /** The account could not be read when it was opened (no connection, most often): once more. */
  'gate-retry'() { if (UI.pub.reload) { try { location.reload(); } catch (e) { /* a frame that may not reload itself */ } return; } openAccount(); },
};
