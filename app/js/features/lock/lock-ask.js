/* Dorax Finance — two notices that invite the person to protect Dorax on this device.
   2026-10-08 (owner: "add notifications so users turn on the PIN or Face ID").
   1. "Lock Dorax on this device?": shown once per device, a moment after a screen opens, while no PIN is set here. "Set a PIN" opens the
      profile on the form that makes one.
   2. "Open Dorax with Face ID or fingerprint?": shown once per device where a PIN exists, the device's own check is not on yet and the device
      offers one. It comes right after a PIN is made (the moment it makes most sense) or, failing that, a moment after a screen opens.
      "Turn on" does what the profile's button does: the tap itself is what lets the device ask for the face or the finger.
   "Not now" puts either away for good on this device; the profile keeps both switches (Profile > Protection on this device).
   Rules they share with the other notices (features/ahead/curios.view.js): one at a time, never over a panel or a closed screen, and never
   in the same visit as the question about notifications: one question per visit is enough.
   What was asked is kept on the device (localStorage "dorax-lock-asked": { pin: 1, bio: 1 }), like the lock itself.
   A test that is not about them switches both off before the app starts (window.DORAX_LOCK_ASK = false), the way DORAX_QUIET does for curiosities. */
const LOCK_ASK_KEY = 'dorax-lock-asked';
const lockAskedNow = {};
const lockAskRead = () => { try { return JSON.parse(localStorage.getItem(LOCK_ASK_KEY) || '{}') || {}; } catch (e) { return {}; } };
function lockAsked(what) { return !!lockAskedNow[what] || !!lockAskRead()[what]; }
function lockAskDone(what) { lockAskedNow[what] = true; try { localStorage.setItem(LOCK_ASK_KEY, JSON.stringify({ ...lockAskRead(), [what]: 1 })); } catch (e) { /* asked again next visit, where the device keeps nothing */ } }
/** 'pin' (no lock on this device yet), 'bio' (a lock, and the device could open it by itself) or null (nothing to ask). */
async function lockAskDue() {
  const id = guardUser(); if (!id || !GUARD.usable() || window.DORAX_LOCK_ASK === false) return null;
  const g = GUARD.of(id);
  if (!g.pin) return lockAsked('pin') ? null : 'pin';
  if (g.bio || lockAsked('bio')) return null;
  let can = false; try { can = !!(await GUARD.bio().available()); } catch (e) { can = false; }
  return can ? 'bio' : null;
}
/** Shows one of the two. Returns whether it did. */
function lockAskShow(what) { if (!what || UI.curio || !UI.session) return false; lockAskDone(what); UI.curio = { ask: 'lock', what }; renderCurio(); return true; }
/** A PIN was just made: the natural next question is the device's own check. */
async function lockAskAfterPin() {
  lockAskDone('pin'); if (window.DORAX_QUIET === true) return;
  const what = await lockAskDue(); if (what === 'bio' && !LOCK.on && !UI.drawer && !UI.modal) lockAskShow('bio');
}
/** The notice (drawn by curioCard, features/ahead/curios.view.js, in the corner the other notices use). */
function lockAskCard(c) {
  const bio = c.what === 'bio';
  return `<aside class="curio nudge" id="curio" role="status" aria-label="${t('Protection on this device')}"><span class="fl-ico">${bio ? LOCK_ICON : icon('lock')}</span><div class="grow"><b>${bio ? t('Open Dorax with Face ID or fingerprint?') : t('Lock Dorax on this device?')}</b>
      <p>${bio ? t('No PIN to type: this device checks that it is you. The PIN stays as the other way in.') : t('A 4-digit PIN closes Dorax when you leave it, so your numbers stay yours if someone else picks up this device. It takes a few seconds.')}</p>
      <div class="row"><button class="btn sm primary" data-a="lock-ask-yes">${bio ? t('Turn on') : t('Set a PIN')}</button><button class="btn sm ghost" data-a="lock-ask-no">${t('Not now')}</button></div></div>
    <button class="btn ghost sm x" data-a="lock-ask-no" aria-label="${t('Close')}">${icon('x')}</button></aside>`;
}
