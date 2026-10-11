/* Dorax Finance — a minute's notice before the lock closes a page left alone.
   2026-10-08 (owner: "on the computer, before locking the screen, show a message with a one-minute countdown, so the person knows it is going to lock
   because nobody is using it, to protect their privacy"). With the lock on and Dorax open, a page nobody touches closes after its time (lock.js,
   guardWatch). For the last minute a notice says so at the foot of the screen, counting down, with "I'm still here": any key, click, tap or scroll
   keeps Dorax open and the notice goes. Coming back to a tab left for longer than "When it locks" still locks at once: nobody was there to read it.
   The notice is the same on a phone, above the tab bar, for the rare page left lit on a table. */
const IDLE_WARN = 60;      // seconds of notice
const IDLE = { at: 0, t: null, tick: null };      // at: when the lock is due while the notice is up
const idleClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** From guardWatch: the page has been left alone and the lock is due in `left` ms. Shows the notice in the last minute; before that, looks again then. */
function idleWarn(left) {
  clearTimeout(IDLE.t);
  if (!UI.session || LOCK.on || document.visibilityState === 'hidden') return idleWarnHide();
  if (left > IDLE_WARN * 1000) { idleWarnHide(); IDLE.t = setTimeout(guardWatch, left - IDLE_WARN * 1000 + 50); return; }
  IDLE.at = Date.now() + left; idleWarnShow();
}
function idleWarnShow() {
  let el = $('idle-warn');
  if (!el) {
    el = document.createElement('div'); el.id = 'idle-warn'; el.className = 'idle-warn';
    el.innerHTML = `<p class="sr" role="alert">${t('Dorax will lock in one minute to protect your privacy, since nobody is using it. Press any key to keep it open.')}</p>
      <span class="iw-ico" aria-hidden="true">${icon('lock')}</span><span class="iw-t" aria-hidden="true"><b>${t('Dorax locks in {time}', { time: '<span class="iw-time num"></span>' })}</b><small>${t('To protect your privacy, since nobody is using it.')}</small></span>
      <button type="button" class="btn primary sm" id="idle-stay">${t('I’m still here')}</button>`;
    document.body.appendChild(el);
  }
  const left = IDLE.at - Date.now();
  el.querySelector('.iw-time').textContent = idleClock(left);
  clearTimeout(IDLE.tick);
  // the next second, or the lock: guardWatch decides, so a touch in between is never overruled
  IDLE.tick = setTimeout(() => { if (Date.now() >= IDLE.at) guardWatch(); else if ($('idle-warn')) idleWarnShow(); }, Math.max(50, left - Math.floor((left - 1) / 1000) * 1000));
}
function idleWarnHide() { clearTimeout(IDLE.tick); IDLE.at = 0; const el = $('idle-warn'); if (el) el.remove(); }
/** Someone is there: the notice goes, and the lock is planned again from now. */
function idleStay() { if (!$('idle-warn')) return; idleWarnHide(); guardWatch(); }
