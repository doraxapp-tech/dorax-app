/* Dorax Finance — the lock opening.
   2026-10-08 (owner: "create an unlock animation on entering the web app").
   When the PIN is right, or the device says it is the person, the closed screen does not just vanish: its pad and its words fade, a padlock
   comes up in the middle, its shackle springs open and its body turns the brand's green, a ring goes out from it, the app says hello again by
   name, and then the whole layer lifts off the account underneath. A little over a second in all (UNLOCK_MS), because it is seen every time.
   How it is built: the lock itself is already open when this starts (LOCK.on is false and the page underneath is live), so nothing waits on the
   animation. The layer is a copy of the closed screen as it was, plus the padlock, laid over the app; it takes the taps while it is up, and a
   tap on it skips the rest. Decoration only: it is not played for someone who asked their device for less motion, and a screen reader is
   told nothing by it (the account's own page is what it reads next). */
const UNLOCK_MS = 1300;
function unlockFx() {
  if (reducedMotion() || !document.body.animate) return;
  const old = document.getElementById('unlock-fx'); if (old) old.remove();
  const was = document.querySelector('#lock-root .lock'), name = firstName((S.user && S.user.name) || '');
  const box = document.createElement('div'); box.id = 'unlock-fx'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<div class="un-was" inert>${was ? was.outerHTML.replace(/ (id|data-a|aria-labelledby|role|aria-modal)="[^"]*"/g, '') : ''}</div>
    <div class="un-in"><svg class="un-lock" viewBox="0 0 96 112" focusable="false"><circle class="un-ring" cx="48" cy="75" r="42"/><path class="un-shackle" d="M30 54V36a18 18 0 0 1 36 0v18"/><rect class="un-body" x="16" y="50" width="64" height="50" rx="13"/><path class="un-key" d="M48 65a6.5 6.5 0 0 1 3 12.3V85a3 3 0 0 1-6 0v-7.7A6.5 6.5 0 0 1 48 65z"/></svg>
      <b class="un-say">${name ? t('Hello again, {name}.', { name: esc(name) }) : t('Hello again.')}</b></div>`;
  document.body.appendChild(box);
  const T = UNLOCK_MS, at = ms => ms / T, css = getComputedStyle(document.documentElement), ink = css.getPropertyValue('--ink-strong').trim() || '#FFFFFF', green = css.getPropertyValue('--brand').trim() || '#3ECF8E';
  const q = sel => box.querySelector(sel), play = (el, frames, o) => el && el.animate(frames, { duration: T, fill: 'both', easing: 'linear', ...(o || {}) });
  // what was on the closed screen goes, all but the logo
  box.querySelectorAll('.un-was .lock-in > :not(.brand)').forEach(el => play(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)', offset: at(190) }, { opacity: 0, transform: 'scale(.97)' }]));
  // the padlock arrives, opens, turns green
  play(q('.un-lock'), [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 0, transform: 'scale(.82)', offset: at(90) }, { opacity: 1, transform: 'none', offset: at(330), easing: 'cubic-bezier(.16, 1, .3, 1)' }, { opacity: 1, transform: 'none' }]);
  play(q('.un-shackle'), [{ transform: 'none' }, { transform: 'none', offset: at(340), easing: 'cubic-bezier(.34, 1.56, .64, 1)' }, { transform: 'translateY(-9px) rotate(-20deg)', offset: at(660) }, { transform: 'translateY(-9px) rotate(-20deg)' }]);
  play(q('.un-body'), [{ fill: ink }, { fill: ink, offset: at(380) }, { fill: green, offset: at(600) }, { fill: green }]);
  play(q('.un-shackle'), [{ stroke: ink }, { stroke: ink, offset: at(380) }, { stroke: green, offset: at(600) }, { stroke: green }]);
  play(q('.un-ring'), [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 0, transform: 'scale(.7)', offset: at(420) }, { opacity: .55, transform: 'scale(.9)', offset: at(520) }, { opacity: 0, transform: 'scale(1.55)', offset: at(1020) }, { opacity: 0, transform: 'scale(1.55)' }]);
  play(q('.un-say'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 0, transform: 'translateY(6px)', offset: at(400) }, { opacity: 1, transform: 'none', offset: at(640) }, { opacity: 1, transform: 'none' }]);
  // and the layer lifts off the account
  const OUT = 340;
  play(q('.un-in'), [{ transform: 'none' }, { transform: 'none', offset: 1 - at(OUT) }, { transform: 'scale(1.1)' }]);
  play(box, [{ opacity: 1 }, { opacity: 1, offset: 1 - at(OUT) }, { opacity: 0 }]);
  const view = document.getElementById('view'), settle = view && view.animate([{ transform: 'scale(1.03)' }, { transform: 'none' }], { duration: OUT + 260, delay: T - OUT, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
  const end = () => { clearTimeout(unlockFx.t); box.remove(); };
  box.addEventListener('pointerdown', () => { if (settle) settle.cancel(); end(); }, { once: true });      // a tap skips the rest
  clearTimeout(unlockFx.t); unlockFx.t = setTimeout(end, T + 40);
}
