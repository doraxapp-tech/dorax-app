/* Dorax Finance — protection on this device.
   Two things, both kept on the device and never in the account (a phone and a shared computer want different answers):
   1. The app lock: a 4-digit PIN that closes the screen when the person leaves, with the device's own Face ID, fingerprint or screen lock as a
      quicker way in. It keeps the screen closed to whoever picks the device up. It is not encryption: the session stays on the device, and
      logging out is what removes an account from it. Forgetting the PIN is solved by logging out and in again.
   2. The limit without use: after so many days without opening Dorax here, the session is closed and the person logs in again. Supabase can do
      this on the server (Auth > Sessions > Inactivity timeout), but only on its paid plans; this one works on any plan, device by device.
   Nothing of this is asked of the server, so it also works with no connection. */
const GUARD = (() => {
  const KEY = 'dorax-guard', PIN_LEN = 4;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const write = all => { try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; } };
  /** Whether this browser keeps anything for the site (a private window or an embedded preview may not). */
  const usable = () => { try { localStorage.setItem(KEY + '-try', '1'); localStorage.removeItem(KEY + '-try'); return true; } catch (e) { return false; } };
  const of = id => (id && read()[id]) || {};
  function set(id, patch) { if (!id) return false; const all = read(), next = { ...(all[id] || {}), ...patch }; for (const k of Object.keys(next)) if (next[k] == null) delete next[k]; all[id] = next; return write(all); }
  function forget(id) { const all = read(); delete all[id]; write(all); }
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const random = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
  /** The PIN is never kept: only this. Slow on purpose where the browser offers it (PBKDF2); a plain fingerprint where it does not. */
  async function digest(pin, salt, algo) {
    if (algo === 'pbkdf2') { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
      return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000 }, key, 256)); }
    let h = salt + ':' + pin; for (let i = 0; i < 4000; i++) h = hashHex(h + salt); return h;
  }
  const algoHere = () => (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.deriveBits === 'function' ? 'pbkdf2' : 'plain');
  async function setPin(id, pin) { const algo = algoHere(), salt = hex(random(16)); return set(id, { pin: { algo, salt, hash: await digest(pin, salt, algo) }, after: of(id).after == null ? 60 : of(id).after, fails: null, until: null }); }
  async function checkPin(id, pin) { const p = of(id).pin; return !!p && (await digest(pin, p.salt, p.algo)) === p.hash; }
  const clearPin = id => set(id, { pin: null, bio: null, fails: null, until: null });

  // The device's own check (WebAuthn, the platform authenticator). A stand-in can be handed over before the app starts (window.DORAX_BIO): the tests do.
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const bytes = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const real = {
    async available() { try { return !!(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } },
    /** Makes the device's key for this lock. Nothing identifies the person in it: a random id and the label the device shows. */
    async make(label) {
      const cred = await navigator.credentials.create({ publicKey: { challenge: random(32), rp: { name: 'Dorax Finance', id: location.hostname }, user: { id: random(16), name: label, displayName: label },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } });
      return cred ? b64(cred.rawId) : null;
    },
    /** Asks the device to check the person (face, finger or its own code). True only when the device says it did check. */
    async check(id) {
      const got = await navigator.credentials.get({ publicKey: { challenge: random(32), rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: bytes(id) }], userVerification: 'required', timeout: 60000 } });
      const data = got && got.response && new Uint8Array(got.response.authenticatorData); return !!data && !!(data[32] & 0x04);
    },
  };
  const bio = () => (typeof window !== 'undefined' && window.DORAX_BIO) || real;
  return { PIN_LEN, usable, of, set, forget, setPin, checkPin, clearPin, bio };
})();

// ---------- the lock, while the page is open ----------
const LOCK = { on: false, entry: '', error: '', busy: false, forgot: false, leaving: false, away: 0, touch: Date.now(), seenAt: 0, tick: null };
const LOCK_AFTER = () => [[0, t('As soon as I leave Dorax')], [60, t('After 1 minute away')], [300, t('After 5 minutes away')], [900, t('After 15 minutes away')]];
const IDLE_DAYS = () => [[0, t('Never')], [1, t('After 1 day without use')], [7, t('After 7 days without use')], [30, t('After 30 days without use')]];
const LOCK_STILL = 300;      // with Dorax open and nobody touching it, the lock comes after this many seconds at least
const guardUser = () => WHO || (UI.session && UI.session.id) || (typeof SERVER !== 'undefined' && SERVER.user && SERVER.user.id) || null;
const lockSet = id => !!GUARD.of(id || guardUser()).pin;
/** This device was used just now. Written at most once a minute. */
function guardSeen(force) { const id = guardUser(), now = Date.now(); if (!id || !UI.session || (!force && now - LOCK.seenAt < 60000)) return; LOCK.seenAt = now; GUARD.set(id, { seen: now }); }
/** Whether the limit without use has passed for this person on this device. */
function guardIdleOver(id) { const g = GUARD.of(id); return !!g.idle && !!g.seen && Date.now() - g.seen > g.idle * 86400000; }
const guardIdleSays = id => { const n = GUARD.of(id).idle || 0; return n === 1 ? t('This session was closed after a day without use. Log in again.') : t('This session was closed after {n} days without use. Log in again.', { n }); };

function renderLock() {
  const root = $('lock-root'); if (!root) return;
  document.documentElement.classList.toggle('locked', LOCK.on);
  for (const el of document.body.children) if (el !== root) { if (LOCK.on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); }
  root.innerHTML = LOCK.on ? lockScreen() : '';
  clearTimeout(LOCK.tick); const g = GUARD.of(guardUser());
  if (LOCK.on && g.until && g.until > Date.now()) LOCK.tick = setTimeout(renderLock, 1000);      // the wait counts down by itself
}
/** Closes the screen. Whatever was open stays as it was underneath, out of sight and out of reach. */
function lockNow() {
  idleWarnHide();
  if (LOCK.on || !lockSet()) return;
  Object.assign(LOCK, { on: true, entry: '', error: '', busy: false, forgot: false, leaving: false });
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  renderLock(); const el = document.querySelector('#lock-root [data-a="lock-bio"]') || document.querySelector('#lock-root .lock-pad button'); if (el) el.focus({ preventScroll: true });
}
/** Opens the screen. The opening is played over the app (lock.motion.js) from a copy of the closed screen, so it is taken before that screen is
    cleared; and a notice that was held back while the screen was closed gets its turn (features/ahead/curios.view.js). */
function unlock() {
  const was = LOCK.on; Object.assign(LOCK, { on: false, entry: '', error: '', busy: false, forgot: false, leaving: false, away: 0, touch: Date.now() }); GUARD.set(guardUser(), { fails: null, until: null });
  if (was) unlockFx();
  renderLock(); guardSeen(true); if (was && UI.session) curioMaybe();
}
/** Four digits are in: right opens; wrong counts. From the fifth wrong try there is a wait that doubles; the tenth logs out and removes the PIN. */
async function lockTry() {
  const id = guardUser(), g = GUARD.of(id); if (LOCK.busy || !id) return;
  LOCK.busy = true; const ok = await GUARD.checkPin(id, LOCK.entry); LOCK.busy = false;
  if (ok) return unlock();
  const fails = (g.fails || 0) + 1; LOCK.entry = '';
  if (fails >= 10) { GUARD.clearPin(id); return lockLeave(t('Too many wrong PINs. The PIN was removed from this device: log in with your password.')); }
  const wait = fails >= 5 ? Math.min(300, 30 * Math.pow(2, fails - 5)) : 0; GUARD.set(id, { fails, until: wait ? Date.now() + wait * 1000 : null });
  LOCK.error = wait ? '' : tn(5 - fails, 'Wrong PIN. {n} more try before a wait.', 'Wrong PIN. {n} more tries before a wait.'); LOCK.shake = Date.now(); haptic.wrong(); renderLock();      // the dots shake, and the hand feels two taps
}
/** Logging out from the closed screen. The screen stays closed until the account has left the page (leaveSession opens it): the moment
    between asking the server and its answer must not show the account to whoever is holding the device. */
function lockLeave(message) { Object.assign(LOCK, { leaving: true, forgot: false, entry: '', error: '' }); renderLock(); return reallyLogOut(message); }
/** Leaving the page and coming back; and the page left open with nobody at it. */
function guardWatch() {
  const id = guardUser(); if (!id || !UI.session) return;
  if (guardIdleOver(id)) { const say = guardIdleSays(id); if (LOCK.on) return LOCK.leaving ? null : lockLeave(say); return logOut(say); }
  if (LOCK.on || !lockSet(id)) return idleWarnHide();
  const after = GUARD.of(id).after == null ? 60 : GUARD.of(id).after, now = Date.now(), left = Math.max(after, LOCK_STILL) * 1000 - (now - LOCK.touch);
  if (LOCK.away && document.visibilityState === 'visible' && now - LOCK.away >= after * 1000) return lockNow();
  if (left <= 0) return lockNow();
  idleWarn(left);      // the last minute is announced, counting down (lock-warn.js)
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { LOCK.away = Date.now(); guardSeen(true); } else { guardWatch(); LOCK.away = 0; } });
  window.addEventListener('pageshow', e => { if (e.persisted) guardWatch(); });
  // a scroll counts too: someone reading a long page is using it (2026-10-08); and a notice of the coming lock goes (lock-warn.js)
  ['pointerdown', 'keydown', 'wheel'].forEach(type => document.addEventListener(type, () => { LOCK.touch = Date.now(); guardSeen(); idleStay(); }, { capture: true, passive: true }));
  setInterval(guardWatch, 20000);
  // While the screen is closed the keys are the lock's own: digits and the erase key. Nothing reaches the app underneath.
  document.addEventListener('keydown', e => {
    if (!LOCK.on) return;
    e.stopImmediatePropagation();
    if (LOCK.forgot || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); LOCK_ACTIONS['lock-key']({ v: e.key }); }
    else if (e.key === 'Backspace') { e.preventDefault(); LOCK_ACTIONS['lock-del'](); }
    else if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== ' ') e.preventDefault();
  }, true);
}
