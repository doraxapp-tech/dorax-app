/* Dorax Finance — the frame: entrances and value changes. */
// ---------- motion ----------
// Entrance: once per navigation. The class is taken off before any later re-render, so typing in a field never replays it.
function enterView() {
  if (reducedMotion()) return;
  // every screen plays its whole entrance: the rise, the stagger, the bars growing and the count (owner, 2026-10-08: the 150 ms fade tried the same
  // day was taken back, "bring them back, I liked them")
  $('view').classList.remove('from-next', 'from-prev');
  for (const id of ['view', 'topbar', 'public']) { const el = $(id); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
  clearTimeout(enterView.t); enterView.t = setTimeout(() => { for (const id of ['view', 'topbar']) $(id).classList.remove('enter'); }, 1200);
  clearTimeout(enterView.p); enterView.p = setTimeout(() => $('public').classList.remove('enter'), 2600);   // the home page artwork takes longer to arrive
  document.querySelectorAll('#view [data-count]').forEach(countUp);
}
/** A headline figure counts up to its value once, when its screen arrives (the days of freedom). The value is already in the page: this only plays it in,
    so a screen reader, a test or someone who asked for less motion gets the number at once. data-count is the value, data-dec="1" keeps one decimal. */
function countUp(el) {
  const to = +el.dataset.count, dec = +el.dataset.dec || 0; if (!(to > 0) || reducedMotion()) return;
  const t0 = performance.now(), show = v => { el.textContent = fmt.num(dec ? Math.round(v * 10) / 10 : Math.round(v)); };
  const step = now => { const k = Math.min(1, (now - t0) / 900); if (!el.isConnected) return; if (k < 1) { show(to * (1 - Math.pow(1 - k, 3))); requestAnimationFrame(step); } else show(to); };
  show(0); requestAnimationFrame(step);
}
// Change: the page is redrawn from state, so what was on screen is measured first and the new bars, columns and figures start from there.
const MORPH = [['.meter > i, .hbar .track i, .rw-seg .bar > i', 'width'], ['.colbtn i', 'height']];
// the figures that tick when they change; since 2026-10-08 the phone's too: what is still to pay, what is in each account, and (outside the page)
// the balance in the bar on top
const TICKS = '.kpi .value, .tile .value, .rw-n, .g-total .value, .ac-row > .num';
function snapshot() {
  const v = $('view');
  return { route: UI.route, sizes: MORPH.map(([sel, prop]) => [...v.querySelectorAll(sel)].map(e => e.style[prop])), values: [...v.querySelectorAll(TICKS)].map(e => e.textContent), bar: (document.querySelector('.bar-bal b') || {}).textContent };
}
function morph(before) {
  if (before.route !== UI.route) return;
  const v = $('view');
  MORPH.forEach(([sel, prop], k) => {
    const els = v.querySelectorAll(sel), was = before.sizes[k]; if (els.length !== was.length) return;
    els.forEach((e, i) => { const to = e.style[prop]; if (!was[i] || was[i] === to) return; e.style.transition = 'none'; e.style[prop] = was[i]; void e.offsetWidth; e.style.transition = prop + ' 460ms var(--ease)'; e.style[prop] = to; });
  });
  const vals = v.querySelectorAll(TICKS);
  if (vals.length === before.values.length) vals.forEach((e, i) => { if (e.textContent !== before.values[i]) e.classList.add('v-tick'); });
  const bar = document.querySelector('.bar-bal b'); if (bar && before.bar != null && bar.textContent !== before.bar) bar.classList.add('v-tick');
}
/** FLIP: what was moved slides from where it was to its new place instead of jumping (2026-10-08: reordering the dashboard and the wallet's cards).
    The elements are matched by id, or data-id; only transform moves, 220 ms on the app's curve. fn draws the change. */
function flip(sel, fn) {
  if (reducedMotion() || !document.body.animate) return fn();
  const key = e => e.id || e.dataset.id, before = new Map([...document.querySelectorAll(sel)].map(e => [key(e), e.getBoundingClientRect()]));
  fn();
  document.querySelectorAll(sel).forEach(e => {
    const b = before.get(key(e)); if (!b) return;
    const a = e.getBoundingClientRect(), dx = b.left - a.left, dy = b.top - a.top; if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16, 1, .3, 1)' });
  });
}
/** The month arrows (and any other way to another month): the new month comes in from the side it is on, later from the right, earlier from the left. */
function monthGo(ym) {
  const d = ym > S.month ? 1 : ym < S.month ? -1 : 0; S.month = ym; renderNow();
  if (!d || reducedMotion()) return;
  monthLabelIn(d);      // a phone: the month's name comes in from the same side (features/phone/phone.month.js)
  const v = $('view'); v.classList.remove('from-next', 'from-prev', 'fade'); void v.offsetWidth; v.classList.add(d > 0 ? 'from-next' : 'from-prev');
  clearTimeout(monthGo.t); monthGo.t = setTimeout(() => v.classList.remove('from-next', 'from-prev'), 400);
}
/** A panel that turns into the next step (details → Contribute) moves its content forward, 16 px from the right; back to the details, from the left.
    The panel itself stays where it is. From overlay.js, after the new content is in. */
function panelStep(dir) {
  if (!dir || reducedMotion() || !document.body.animate) return;
  document.querySelectorAll('#overlay .drawer > .body, #overlay .drawer > footer').forEach(e => e.animate([{ opacity: 0, transform: `translateX(${16 * dir}px)` }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.32, .72, 0, 1)' }));
}
/** A question on the home page opens and closes with a short slide (owner: "faq accordion has no animation"; a <details> on its own snaps).
    It stays a real <details>: the keyboard, screen readers and "find in page" work as the browser does them, and only the height and the answer's
    opacity are animated. Pressing again while it moves turns it round from where it is. With reduced motion asked for, events.js leaves it to the browser. */
function faqToggle(d) {
  const sum = d.querySelector('summary'), ans = sum.nextElementSibling, opening = !d.open || d.classList.contains('closing');
  const from = d.getBoundingClientRect().height;
  if (d._anim) d._anim.cancel();
  d.classList.toggle('closing', !opening); if (opening) d.open = true;
  const to = opening ? d.offsetHeight : sum.offsetHeight + (d.offsetHeight - d.clientHeight);      // closed: the question and the rules above and below it
  // an even ease in and out, a little longer for a longer answer: the app's usual entrance curve does most of its travel in the first frames, which reads as a snap here
  const time = { duration: Math.round(Math.min(420, 240 + Math.abs(to - from) * .5)), easing: 'cubic-bezier(.4, 0, .2, 1)' };
  d.style.overflow = 'hidden';
  if (ans) ans.animate({ opacity: opening ? [0, 1] : [1, 0] }, { ...time, fill: 'forwards' });
  const anim = d._anim = d.animate({ height: [from + 'px', to + 'px'] }, time);
  anim.onfinish = () => { if (!opening) d.open = false; d.classList.remove('closing'); d.style.overflow = ''; if (ans) ans.getAnimations().forEach(a => a.cancel()); d._anim = null; };
}
/** The address changed (back, forward, a typed #route). Only the app has routes: before login the address is left alone. */
function onHash() { if (!UI.session) return; let h = ''; try { h = location.hash.slice(1); } catch (e) { } if (h !== UI.route || !$('view').innerHTML) navigate(h); }
/** Confetti in the air, once: small pieces in the brand's colours fall from above the page and are gone in a few seconds (owner, 2026-10-07, for the
    moment the first-time setup shows what the person's money can do). Decoration only: nothing can be pressed or read in it, and it is not played
    for someone who asked their device for less motion. */
function confetti() {
  if (reducedMotion() || !document.body.animate) return;
  const old = document.getElementById('confetti'); if (old) old.remove();
  const box = document.createElement('div'), w = window.innerWidth, h = window.innerHeight, n = w < 600 ? 70 : 120, rnd = (a, b) => a + Math.random() * (b - a);
  box.id = 'confetti'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), x = rnd(0, w), drift = rnd(-140, 140), size = rnd(6, 11);
    p.className = 'c' + (i % 5) + (i % 4 === 0 ? ' dot' : ''); p.style.left = x + 'px'; p.style.width = size + 'px'; p.style.height = (i % 4 === 0 ? size : size * rnd(1.3, 1.9)) + 'px';
    p.animate([{ transform: `translate3d(0, -40px, 0) rotate(0deg)`, opacity: 1 }, { opacity: 1, offset: .8 }, { transform: `translate3d(${drift}px, ${h + 60}px, 0) rotate(${rnd(-720, 720)}deg)`, opacity: 0 }],
      { duration: rnd(1900, 3400), delay: rnd(0, 700), easing: 'cubic-bezier(.2, .6, .4, 1)', fill: 'both' });
    box.appendChild(p);
  }
  document.body.appendChild(box); clearTimeout(confetti.t); confetti.t = setTimeout(() => box.remove(), 4400);
}

/** Going from Household to Company (or back) is not a switch being flipped: it is another account being opened (owner, 2026-10-07: "back to
    basics: a black screen with background blur, the Dorax logo and a loader under it, 'loading company account, one moment', and the other way
    round; let it load about two seconds more, create drama; the loader is an animation of the logo itself").
    After a tap the layer comes up over the side in use and the other side is drawn behind it once it covers the page (2026-10-08); a switch made
    in code draws first. The layer covers the page, blurred and dark, for a little over three seconds: the logo's ring with its quarter in the new
    side's colour going round it as the loader, and what is being loaded in words (the wordmark above them is gone since 2026-10-09, owner: "remove
    the logo from the loading screen when I switch from household to company"; it went both ways, the screen being one). It
    takes the taps while it is up, so nothing behind it can be pressed by mistake. Not played for someone who asked for less motion: there the
    side just changes. SIDE_SHIFT_MS is the whole of it. */
const SIDE_SHIFT_MS = 3400, SIDE_SHIFT_IN = 300;      // IN: the layer is up and covers the page; a tap's switch is drawn behind it then
function sideShift(from, side) {
  if (reducedMotion() || !document.body.animate) return;
  const old = document.getElementById('side-shift'); if (old) old.remove();
  const co = side === 'business';
  const box = document.createElement('div'); box.id = 'side-shift'; box.className = co ? 'co' : 'home'; box.setAttribute('role', 'status');
  box.innerHTML = `<div class="shift-in">
    <svg class="shift-loader" viewBox="0 0 60 60" aria-hidden="true" focusable="false"><circle cx="30" cy="30" r="22.5"/><path d="M7.5 30a22.5 22.5 0 0 1 22.5-22.5"/></svg>
    <span class="shift-say"><b>${esc(co ? t('Loading your company account…') : t('Loading your household account…'))}</b><small>${esc(t('One moment…'))}</small></span></div>`;
  document.body.appendChild(box);
  const T = SIDE_SHIFT_MS, IN = SIDE_SHIFT_IN - 20, OUT = 460;
  box.animate([{ opacity: 0 }, { opacity: 1, offset: IN / T }, { opacity: 1, offset: 1 - OUT / T }, { opacity: 0 }], { duration: T, easing: 'linear', fill: 'both' });
  box.querySelector('.shift-in').animate([{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none', offset: 520 / T }, { opacity: 1, transform: 'none', offset: 1 - OUT / T }, { opacity: 0, transform: 'scale(1.04)' }], { duration: T, easing: 'ease-out', fill: 'both' });
  const view = document.getElementById('view'); if (view) view.animate([{ transform: 'scale(1.03)' }, { transform: 'none' }], { duration: OUT + 260, delay: T - OUT, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
  clearTimeout(sideShift.t); sideShift.t = setTimeout(() => box.remove(), T + 40);
}

