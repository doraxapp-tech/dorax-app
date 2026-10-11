/* Dorax Finance — the month on a phone (owner, 2026-10-08: "on the phone make the date selector use 100% of the space, background #000000 and
   border #1A1A1A, put the date in green, and let it be swiped to move between months. If the user goes far back, make the button 'back to present'
   appear with a push animation: it comes in from right to left and pushes the date, which shrinks. Remove the divider under the date too.").

   The month takes the whole row. Between its arrows is a strip of months that the finger scrolls the browser's own way (scroll-snap): the next
   month slides in under the finger, a fling can pass several months, and the strip comes to rest on one. When it rests on another month, that month
   opens (monthGo, app/motion.js), exactly as the arrows do. The arrows stay, for a tap and for anyone who does not swipe.

   Three months or more before the present one, "Back to present" comes in from the edge of the screen and pushes the month aside: the button's
   own width is what grows, so the month really gives way to it rather than being covered. Back within reach (or after the button), it leaves the
   way it came. Someone who asked for less motion gets the button in place, without the push.
   A computer keeps its compact month in the top bar (app/shell.js), and from the same three months back offers "Back to present" beside it, on
   its left, so the arrows under the pointer do not move when it comes (owner, 2026-10-09: "add a button to go back to the present month in case
   the user goes far back in time"). It is a plain button, not the green one: the screen's main action stays "Add transaction". */
const MONTH_FAR = 3;
/** Far enough back for the way home to be offered. */
const monthFar = ym => ym <= addMonths(ymOf(S.today), -MONTH_FAR);
// what the last drawing showed (far: the button was there), whether the month now on screen came from the strip, and the finger on the strip
// and whether a finger (or a trackpad) moved the strip since it was last placed: only a person's scroll opens another month, never the app's own
const MS = { far: false, pcFar: false, swipe: false, touch: false, user: false, t: 0, ro: null };

/** Every month the person can open: from the first with anything in it to the present (the month on screen is always in it). */
function monthRange(ym) {
  const lo = [minMonth(), ym].sort()[0], hi = [ymOf(S.today), ym].sort()[1], out = [];
  for (let m = lo; m <= hi; m = addMonths(m, 1)) out.push(m);
  return out;
}
/** The phone's month row. The strip is only for the eye and the finger: a screen reader hears the month once, and the arrows. */
function monthPhone(ym) {
  const far = monthFar(ym), leaving = !far && MS.far;
  return `<div class="m-row${far ? ' far' : ''}"><div class="month m-ph" role="group" aria-label="${t('Month')}">
      <button data-a="month" data-d="-1" aria-label="${t('Previous month')}" ${ym <= minMonth() ? 'disabled' : ''}>${icon('left')}</button>
      <span class="sr">${fmt.month(ym, true)}</span>
      <div class="m-strip" aria-hidden="true" tabindex="-1">${monthRange(ym).map(m => `<span class="m-slide${m === ym ? ' on mid' : ''}" data-ym="${m}">${fmt.month(m, true)}</span>`).join('')}</div>
      <button data-a="month" data-d="1" aria-label="${t('Next month')}" ${ym >= ymOf(S.today) ? 'disabled' : ''}>${icon('right')}</button></div>
    ${far || leaving ? `<div class="m-back${leaving ? ' leaving' : ''}"${leaving ? ' inert aria-hidden="true"' : ''}><button class="btn primary" data-a="month-now">${t('Back to present')}</button></div>` : ''}</div>`;
}

const M_PUSH = { duration: 300, easing: 'cubic-bezier(.32, .72, 0, 1)' }, M_PULL = { duration: 200, easing: 'cubic-bezier(.16, 1, .3, 1)' };
/** After the top bar is drawn: the strip shows the month on screen, and the button comes in or goes, if it just changed. */
function monthPlace() {
  // a computer: the button comes in once, when the month first goes far back, not again at every drawing while it stays there
  const now = document.querySelector('.topbar .m-now'), pcWas = MS.pcFar; MS.pcFar = !!now;
  if (now && !pcWas && now.animate && !reducedMotion()) now.animate([{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], M_PULL);
  const s = document.querySelector('.pagehead .m-strip');
  if (MS.ro) { MS.ro.disconnect(); MS.ro = null; }
  if (!s) return;
  if (!MS.touch) MS.user = false;
  const at = () => { const on = s.querySelector('.m-slide.on'); if (on && !MS.touch) s.scrollLeft = on.offsetLeft - (s.clientWidth - on.offsetWidth) / 2; };
  at();
  // the strip changes width while the button pushes in, and when the phone turns: it stays on its month, in the same frame
  if (window.ResizeObserver) { MS.ro = new ResizeObserver(at); MS.ro.observe(s); }
  const back = document.querySelector('.pagehead .m-back'), far = monthFar(S.month), was = MS.far; MS.far = far;
  if (!back) return;
  const btn = back.firstElementChild, gone = () => { if (back.isConnected) back.remove(); };
  if (reducedMotion() || !back.animate) { if (!far) gone(); return; }
  const w = btn.offsetWidth + parseFloat(getComputedStyle(btn).marginLeft || 0);
  if (far && !was) back.animate([{ width: '0px' }, { width: w + 'px' }], M_PUSH);
  else if (!far && was) back.animate([{ width: w + 'px' }, { width: '0px' }], M_PULL).onfinish = gone;
  else if (!far) gone();
}
/** The arrows and the button: the new month's name comes in from the side it is on (the strip already moved under a finger). */
function monthLabelIn(d) {
  if (MS.swipe) return;
  const on = document.querySelector('.pagehead .m-slide.on');
  if (on && on.animate) on.animate([{ opacity: 0, transform: `translateX(${24 * d}px)` }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16, 1, .3, 1)' });
}
/** The month in the middle of the strip. */
const monthMid = s => { const mid = s.scrollLeft + s.clientWidth / 2; return [...s.children].sort((a, b) => Math.abs(a.offsetLeft + a.offsetWidth / 2 - mid) - Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid))[0]; };
/** Only the month in the middle is green, the others white, as the finger moves them (owner, 2026-10-08). */
function monthTint(s) { const m = monthMid(s); if (!m || m.classList.contains('mid')) return; s.querySelectorAll('.m-slide.mid').forEach(e => e.classList.remove('mid')); m.classList.add('mid'); }
/** The strip has come to rest: on another month, that month opens. Not while the finger is still on it. */
function monthSettle(s) {
  if (MS.touch || !MS.user || !s.isConnected) return;
  const sl = monthMid(s);
  if (!sl || sl.dataset.ym === S.month) return;
  MS.swipe = true;
  try { monthGo(sl.dataset.ym); } finally { MS.swipe = false; }
}
const isStrip = el => !!(el && el.classList && el.classList.contains('m-strip'));
const settleSoon = s => { clearTimeout(MS.t); MS.t = setTimeout(() => monthSettle(s), 160); };
document.addEventListener('scroll', e => { if (isStrip(e.target)) { if (MS.user) monthTint(e.target); settleSoon(e.target); } }, { capture: true, passive: true });
if ('onscrollend' in window) document.addEventListener('scrollend', e => { if (isStrip(e.target)) { clearTimeout(MS.t); monthSettle(e.target); } }, true);
document.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('.m-strip')) MS.touch = MS.user = true; }, { capture: true, passive: true });
document.addEventListener('wheel', e => { if (e.target.closest && e.target.closest('.m-strip')) MS.user = true; }, { capture: true, passive: true });
const lift = () => { if (!MS.touch) return; MS.touch = false; const s = document.querySelector('.pagehead .m-strip'); if (s) settleSoon(s); };
document.addEventListener('touchend', lift, { capture: true, passive: true });
document.addEventListener('touchcancel', lift, { capture: true, passive: true });
