/* Dorax Finance — the lock's two faces: the closed screen, and its settings in the profile. */
const LOCK_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 10v1M15 10v1M12 10v3h-1M9 15.5c1.8 1.3 4.2 1.3 6 0"/></svg>';
const ERASE_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/></svg>';
/** The closed screen: nothing of the account shows. Four dots, a pad a thumb can hit, the device's own check when it was switched on, and a way out. */
function lockScreen() {
  const g = GUARD.of(guardUser()), name = firstName((S.user && S.user.name) || ''), left = g.until ? Math.ceil((g.until - Date.now()) / 1000) : 0, wait = left > 0;
  if (LOCK.leaving) return `<div class="lock" role="dialog" aria-modal="true" aria-label="${t('Log out')}"><div class="lock-in">${brandMark(true)}<span class="spinner" aria-hidden="true"></span><p class="sr" role="status">${t('One moment…')}</p></div></div>`;
  if (LOCK.forgot) return `<div class="lock" role="dialog" aria-modal="true" aria-labelledby="lock-h"><div class="lock-in">${brandMark(true)}
      <h1 id="lock-h">${t('Forgot the PIN?')}</h1><p class="lock-note">${t('Log out and log in again with your password or with Google. The PIN is removed from this device. Nothing in your account changes.')}</p>
      <div class="lock-row"><button type="button" class="btn primary" data-a="lock-out">${t('Log out')}</button><button type="button" class="btn" data-a="lock-back">${t('Back')}</button></div></div></div>`;
  const say = wait ? tn(left, 'Too many wrong tries. Try again in {n} second.', 'Too many wrong tries. Try again in {n} seconds.') : LOCK.error;
  const key = v => `<button type="button" data-a="lock-key" data-v="${v}"${wait ? ' disabled' : ''}>${v}</button>`, shake = LOCK.shake && Date.now() - LOCK.shake < 500;
  return `<div class="lock" role="dialog" aria-modal="true" aria-labelledby="lock-h"><div class="lock-in">${brandMark(true)}
    <h1 id="lock-h">${name ? t('Hi, {name}. Enter your PIN.', { name: esc(name) }) : t('Enter your PIN.')}</h1>
    <div class="lock-dots${shake ? ' no' : ''}" aria-hidden="true">${Array.from({ length: GUARD.PIN_LEN }, (_, i) => `<i class="${i < LOCK.entry.length ? 'on' : ''}"></i>`).join('')}</div>
    <p class="sr" aria-live="polite">${t('{a} of {b} digits', { a: LOCK.entry.length, b: GUARD.PIN_LEN })}</p>
    <p class="lock-say${wait ? ' wait' : ''}" role="status">${say || ''}</p>
    <div class="lock-pad" role="group" aria-label="${t('PIN')}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(key).join('')}
      ${g.bio ? `<button type="button" class="aux" data-a="lock-bio" aria-label="${t('Use Face ID or fingerprint')}">${LOCK_ICON}</button>` : '<span></span>'}${key(0)}
      <button type="button" class="aux" data-a="lock-del" aria-label="${t('Erase')}"${LOCK.entry.length ? '' : ' disabled'}>${ERASE_ICON}</button></div>
    <button type="button" class="linkbtn" data-a="lock-forgot">${t('Forgot the PIN?')}</button></div></div>`;
}
/** Profile > Protection on this device. The device's check is asked about once, then the card is drawn again with the answer. */
function guardCard() {
  const id = guardUser(), g = GUARD.of(id), f = UI.guard, on = !!g.pin;
  if (!GUARD.usable()) return setGroup('guard', t('Protection on this device'), hint('proGuard'), `<p class="note">${t('Not available here: this browser is not keeping anything for the site (a private window, or a preview).')}</p>`, '', ' id="guard-card"');      // a group of the profile (features/settings/settings.view.js)
  // the answer only changes what is drawn once a PIN exists (the row about Face ID or fingerprint): without one the card is not drawn again, so a field the
  // person has just started typing in (their name, a new PIN) is never redrawn under their fingers
  if (UI.guardBio === undefined) { UI.guardBio = null; GUARD.bio().available().then(v => { UI.guardBio = !!v; if (UI.route === 'profile' && UI.session && lockSet()) render(); }, () => { UI.guardBio = false; }); }
  const pin = (pid, label) => `<div class="field"><label for="${pid}">${label}</label><input type="password" id="${pid}" class="pin" inputmode="numeric" pattern="[0-9]*" maxlength="${GUARD.PIN_LEN}" autocomplete="off"></div>`;
  const form = f ? `<div class="guard-form" id="guard-form">${f.error ? banner('crit', esc(f.error)) : ''}<div class="row guard-pins">${f.mode !== 'new' ? pin('gp-old', t('Current PIN')) : ''}${f.mode !== 'off' ? pin('gp-new', f.mode === 'change' ? t('New PIN') : t('PIN, 4 digits')) + pin('gp-again', t('Once more')) : ''}</div>
      <div class="row"><button class="btn primary sm" data-a="guard-pin-save">${f.mode === 'off' ? t('Turn off the lock') : t('Save PIN')}</button><button class="btn ghost sm" data-a="guard-pin-cancel">${t('Cancel')}</button></div></div>` : '';
  return `${groupOpen('guard', t('Protection on this device'), hint('proGuard'), '', ' id="guard-card"', 'stack', ' style="gap:0"')}
    <div class="setting"><div><b style="font-weight:500">${t('App lock')}</b>${on ? ` <span class="chip good"><i></i>${t('On')}</span>` : ''}<p>${t('A 4-digit PIN closes Dorax on this device when you leave it, and is asked for when you come back.')}</p></div>
      ${f ? '' : on ? `<div class="row"><button class="btn sm" data-a="guard-lock-now">${t('Lock now')}</button><button class="btn sm" data-a="guard-pin-open" data-v="change">${t('Change PIN')}</button><button class="btn sm ghost" data-a="guard-pin-open" data-v="off">${t('Turn off')}</button></div>` : `<button class="btn sm primary" data-a="guard-pin-open" data-v="new">${t('Set a PIN')}</button>`}
      ${form}</div>
    ${on ? `<div class="setting"><div><label for="guard-after"><b style="font-weight:500">${t('When it locks')}</b></label><p>${t('With Dorax open and nobody touching it, it locks after 5 minutes at the latest.')}</p></div><select id="guard-after" data-c="guard-after" style="width:auto">${options(LOCK_AFTER(), g.after == null ? 60 : g.after)}</select></div>
    <div class="setting" id="guard-bio"><div><b style="font-weight:500">${t('Face ID or fingerprint')}</b>${g.bio ? ` <span class="chip good"><i></i>${t('On')}</span>` : ''}<p>${UI.guardBio === false && !g.bio ? t('This device or browser does not offer it. The PIN works everywhere.') : t('Open Dorax with this device’s own check instead of typing the PIN. The PIN stays as the other way in.')}</p></div>
      ${g.bio ? `<button class="btn sm ghost" data-a="guard-bio-off">${t('Turn off')}</button>` : UI.guardBio ? `<button class="btn sm" data-a="guard-bio-on">${t('Turn on')}</button>` : ''}</div>` : ''}
    <div class="setting"><div><label for="guard-idle"><b style="font-weight:500">${t('Close the session')}</b></label><p>${t('After that long without opening Dorax on this device, you log in again. Notifications on this device stop until you do.')}</p></div><select id="guard-idle" data-c="guard-idle" style="width:auto">${options(IDLE_DAYS(), g.idle || 0)}</select></div>
    <p class="note" style="padding-top:14px">${t('The lock keeps the screen closed to whoever picks up this device. It is set device by device, and it is not encryption: logging out is what takes your account off a device.')}</p>${groupEnd}`;
}
