/* Dorax Finance — clicks: the lock (the closed screen and its settings in the profile). Joined into A in app/actions.js. */
const LOCK_ACTIONS = {
  // ---- the closed screen ----
  'lock-key'(ds) { const g = GUARD.of(guardUser()); if (!LOCK.on || LOCK.busy || LOCK.forgot || LOCK.leaving || (g.until && g.until > Date.now()) || LOCK.entry.length >= GUARD.PIN_LEN) return; LOCK.entry += String(ds.v); LOCK.error = ''; haptic.tap(); lockDraw(ds.v); if (LOCK.entry.length === GUARD.PIN_LEN) lockTry(); },
  'lock-del'() { if (!LOCK.on || LOCK.busy) return; if (LOCK.entry) haptic.erase(); LOCK.entry = LOCK.entry.slice(0, -1); lockDraw(); },      // a small tap under the finger (ui/haptic.js, owner 2026-10-10)
  /** The device checks the person itself. A "no", a cancel or a device that cannot: the PIN is still there. */
  async 'lock-bio'() {
    const g = GUARD.of(guardUser()); if (!LOCK.on || !g.bio || LOCK.busy) return;
    LOCK.busy = true; let ok = false; try { ok = await GUARD.bio().check(g.bio); } catch (e) { ok = false; } LOCK.busy = false;
    if (ok) return unlock();
    LOCK.error = t('That did not work. Enter your PIN.'); renderLock(); const el = document.querySelector('#lock-root .lock-pad button'); if (el) el.focus({ preventScroll: true });
  },
  'lock-forgot'() { LOCK.forgot = true; renderLock(); const el = document.querySelector('#lock-root [data-a="lock-back"]'); if (el) el.focus({ preventScroll: true }); },
  'lock-back'() { LOCK.forgot = false; renderLock(); const el = document.querySelector('#lock-root [data-a="lock-forgot"]'); if (el) el.focus({ preventScroll: true }); },
  /** The way out for a forgotten PIN: the PIN leaves this device and the person logs in again, which proves who they are. */
  'lock-out'() { GUARD.clearPin(guardUser()); lockLeave(t('Logged out. The PIN was removed from this device.')); },
  // ---- the profile ----
  'guard-pin-open'(ds) { UI.guard = { mode: ds.v, error: null }; render(); const el = $(ds.v === 'new' ? 'gp-new' : 'gp-old'); if (el) el.focus(); },
  'guard-pin-cancel'() { UI.guard = null; render(); },
  async 'guard-pin-save'() {
    const f = UI.guard, id = guardUser(); if (!f || !id) return;
    const val = k => ($(k) || {}).value || '', old = val('gp-old'), pin = val('gp-new'), again = val('gp-again'), bad = m => { f.error = m; render(); const el = $(f.mode === 'new' ? 'gp-new' : 'gp-old'); if (el) el.focus(); };
    if (f.mode !== 'new' && !(await GUARD.checkPin(id, old))) return bad(t('That is not the current PIN.'));
    if (f.mode === 'off') { GUARD.clearPin(id); UI.guard = null; toast(t('App lock turned off on this device.')); return render(); }
    if (!new RegExp('^\\d{' + GUARD.PIN_LEN + '}$').test(pin)) return bad(t('The PIN is 4 digits.'));
    if (pin !== again) return bad(t('The two PINs are not the same.'));
    if (/^(\d)\1+$/.test(pin) || '0123456789 9876543210'.includes(pin)) return bad(t('Choose a PIN that is harder to guess than a repeated digit or a run like 1234.'));
    if (!(await GUARD.setPin(id, pin))) return bad(t('This browser could not keep the PIN.'));
    UI.guard = null; LOCK.touch = Date.now(); toast(f.mode === 'change' ? t('PIN changed.') : t('App lock is on for this device.')); render();
    if (f.mode === 'new') lockAskAfterPin();      // a PIN now exists: would the person like the device's own check too? (lock-ask.js)
  },
  'guard-lock-now'() { lockNow(); },
  async 'guard-bio-on'() {
    const id = guardUser(); let cred = null; try { cred = await GUARD.bio().make(t('Dorax app lock')); } catch (e) { cred = null; }
    if (!cred) return toast(t('The device did not confirm it. Nothing changed.'));
    GUARD.set(id, { bio: cred }); toast(t('Face ID or fingerprint is on for this device.')); render();
  },
  'guard-bio-off'() { GUARD.set(guardUser(), { bio: null }); toast(t('Turned off. The PIN opens Dorax.')); render(); },
  // ---- the two notices that invite it (lock-ask.js) ----
  /** "Set a PIN": the profile, on the form that makes one. "Turn on": the device is asked right here, because it only asks in answer to a tap. */
  'lock-ask-yes'() {
    const bio = !!UI.curio && UI.curio.what === 'bio'; UI.curio = null; renderCurio();
    if (bio) return LOCK_ACTIONS['guard-bio-on']();
    UI.guard = { mode: 'new', error: null }; navigate('profile');
    const card = $('guard-card'), el = $('gp-new'); if (card) card.scrollIntoView({ block: 'center' }); if (el) el.focus({ preventScroll: true });
  },
  'lock-ask-no'() { UI.curio = null; renderCurio(); toast(t('Fine. If you change your mind, it is in your profile, under Protection on this device.')); },
};
/** One digit more or less: only the dots and the erase key change, so the pad keeps its focus under the thumb. */
function lockDraw(v) {
  const dots = document.querySelectorAll('#lock-root .lock-dots i'); if (!dots.length) return renderLock();
  dots.forEach((d, i) => d.classList.toggle('on', i < LOCK.entry.length)); document.querySelector('#lock-root .lock-dots').classList.remove('no');
  const del = document.querySelector('#lock-root [data-a="lock-del"]'); if (del) del.disabled = !LOCK.entry.length;
  const say = document.querySelector('#lock-root .lock-say'); if (say && !say.classList.contains('wait')) say.textContent = '';
  const sr = document.querySelector('#lock-root .sr'); if (sr) sr.textContent = t('{a} of {b} digits', { a: LOCK.entry.length, b: GUARD.PIN_LEN });
}
const LOCK_CHANGES = {
  'guard-after'(el) { GUARD.set(guardUser(), { after: Math.max(0, +el.value || 0) }); LOCK.touch = Date.now(); },
  'guard-idle'(el) { GUARD.set(guardUser(), { idle: +el.value || null, seen: Date.now() }); toast(+el.value ? t('Saved for this device.') : t('The session stays open on this device until you log out.')); },
};
