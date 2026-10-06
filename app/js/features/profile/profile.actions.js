/* Dorax Finance — clicks: the profile: password, email, tone, first steps, deleting the account. Joined into A in app/actions.js. */
const PROFILE_ACTIONS = {
  // profile: the password of the account that is open
  'pw-open'() { UI.pw = { open: true, cur: '', next: '', error: null }; render(); const el = $('pf-pw-cur') || $('pf-pw-new'); if (el) el.focus(); },
  'pw-cancel'() { UI.pw = null; render(); const el = document.querySelector('[data-a="pw-open"]'); if (el) el.focus(); },
  /** A new password for the open account. Someone who has one proves it first (the server checks it); someone who only uses Google is adding one. */
  async 'pw-save'() {
    const f = pwForm(), email = S.user.email, has = SERVER.ways().includes('password'), again = (m, id) => { f.busy = false; f.error = m; render(); const el = $(id); if (el) el.focus(); };
    if (f.busy) return;
    if (has && !f.cur) return again(t('Type your current password.'), 'pf-pw-cur');
    const bad = pwProblem(f.next, email); if (bad) return again(bad, 'pf-pw-new');
    if (has && f.next === f.cur) return again(t('The new password is the same as the current one.'), 'pf-pw-new');
    f.busy = true; f.error = null; render();
    if (has) { const ok = await SERVER.signIn(email, f.cur); if (!ok.ok) return again(ok.code === 'invalid_credentials' ? t('The current password is not right.') : serverSays(ok.code), 'pf-pw-cur'); }
    const r = await SERVER.setPassword(f.next);
    if (!r.ok) return again(serverSays(r.code), 'pf-pw-new');
    UI.pw = null; render();
    toast(has ? t('Password changed.') : t('Password saved. You can now log in with your email and this password.'));
    const el = document.querySelector('[data-a="pw-open"]'); if (el) el.focus();
  },
  logout() { UI.menu = false; logOut(); },      // what is not saved yet is sent while the account is still the open one (app/session.js)
  // profile
  'user-tone'(ds) { S.user.tone = ds.v === 'plain' ? 'plain' : 'friend'; render(); },
  /** The login's address. The server sends a link to the new address (and, as it is set up by default, one to the current address too):
      the login changes when the links are opened. Until then nothing changes. */
  async 'email-change'() {
    const v = ($('pf-email').value || '').trim().toLowerCase();
    if (!EMAIL_RE.test(v)) return toast(t('That email does not look right. Check it and try again.'));
    if (v === S.user.email) return toast(t('That is already your email.'));
    if (UI.emailBusy) return; UI.emailBusy = true;
    const r = await SERVER.changeEmail(v); UI.emailBusy = false;
    if (!r.ok) return toast(serverSays(r.code));
    S.user.pendingEmail = v; render(); save();
  },
  'email-cancel'() { S.user.pendingEmail = null; render(); },
  'user-delete'() {
    confirmBox({ critical: true, title: t('Delete your account?'), text: t('Your profile, accounts, transactions, plan, goals and investments are deleted. This can’t be undone.'), label: t('Delete my account'),
      async run() {
        const r = await SERVER.deleteAccount();
        if (!r.ok) return toast(r.code === 'network' ? serverSays(r.code) : t('The account could not be deleted. Nothing was removed. Try again, or write to us through the contact form.'));
        UI.session = null; forgetSync(); reallyLogOut(t('Account deleted. Everything is gone, as you asked.'));
      } });
  },
  'step-income'() { const y = +S.today.slice(0, 4); navigate('plan'); A['add-pay']({ y }); },
  'steps-hide'() { S.isNew = false; render(); },
};
