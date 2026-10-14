/* Dorax Finance — putting money into a goal as something done with the money, not a form sent (v198, owner, 2026-10-12: "quiero agregar pantallas
   interactivas de éxito… si el usuario va a guardar dinero en una meta no quiero que solo le dé guardar y ya, quiero que exista una interacción", and
   "microinteracciones, gamificación sutil, interfaces táctiles y feedback de éxito. La idea es que el usuario sienta que está haciendo algo con su
   dinero, no simplemente introduciendo datos en una aplicación").
   1. The slide, at the foot of "Contribute to …" on the summary's look (it takes the place of "Record contribution"): a lime coin on a deep green
      track, the goal's flag at its far end. The coin is dragged into the goal; let go before the end, it slides back. A tap on it, Enter or a screen
      reader sends it across by itself, so the gesture is never in the way. Nothing moves until the amount and the date are right: the reason shows at
      the field, as it did with the button.
   2. The success screen, on the forest, opening out of the flag where the coin landed: what was put in, the goal's ring filling from where it was to
      where it is now with its percentage counting with it, one sentence on what that means (what is left, when it is reached at the planned pace),
      and as chips the months in a row with money put in and the month's plan completed. Passing a quarter, half, three quarters or the whole goal
      says so, with confetti (Dorax's own drawing beside the words, v214: no emoji); the goal reached shows the person who made it with its flag. "Done" goes back to where the panel was opened from; "See goal" opens the goal.
   Progress is celebrated, spending never is: a withdrawal and a starting balance keep their plain note. With less motion asked for, the same screen
   stands still. Styles: css/look/look-land-win.css; the record itself: features/goals/goals.actions.js (move-save). */

/** A contribution on the summary's look: slid into its goal, and answered by the success screen. */
const gwOn = d => typeof landOn === 'function' && landOn() && !!d && d.kind === 'goal-move' && !!d.draft && d.draft.dir !== 'out' && !d.draft.start;
const GW_EASE = 'cubic-bezier(.16, 1, .3, 1)';      // the app's --ease (css/base/tokens.css)
const GW = { drag: null, busy: false, ptrAt: 0, from: null };
const gwBuzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } };      // a phone that can (Android): a short tick
const gwPct = p => p > 0 && p < 1 ? '<1%' : fmt.pct(Math.round(p));

// ---------- 1. the slide ----------
const gwSay = amt => amt > 0 ? t('Slide to save {amount}', { amount: fmt.money(amt, BCUR()) }) : t('Slide to save');
const gwLabel = (name, amt) => amt > 0 ? t('Save {amount} in {name}', { amount: fmt.money(amt, BCUR()), name }) : t('Save in {name}', { name });
function gwSlide(d) {
  const g = goalById(d.draft.goalId), amt = typedAmount(d.draft.amountText || '') || 0;
  return `<div class="gw-slide" id="gw-slide"><span class="gw-fill" id="gw-fill" aria-hidden="true"></span><span class="gw-say" id="gw-say" aria-hidden="true">${esc(gwSay(amt))}</span>
    <span class="gw-goal" id="gw-goal" aria-hidden="true">${icon('flag')}</span>
    <button type="button" class="gw-knob" id="gw-knob" data-a="gw-go" aria-label="${esc(gwLabel(g.name, amt))}">${icon('coins')}</button></div>`;
}
// the amount as it is typed: in the track's words and in the coin's name
document.addEventListener('input', e => {
  if (e.target.id !== 'm-amount' || !gwOn(UI.drawer)) return;
  const amt = typedAmount(e.target.value || '') || 0, s = $('gw-say'), k = $('gw-knob'), g = goalById(UI.drawer.draft.goalId);
  if (s) s.textContent = gwSay(amt); if (k && g) k.setAttribute('aria-label', gwLabel(g.name, amt));
});
/** The track's parts and how far the coin can go (its rest position and the end are the same distance from the track's edges). */
function gwParts() { const s = $('gw-slide'), k = $('gw-knob'); if (!s || !k) return null; const pad = k.offsetLeft; return { s, k, f: $('gw-fill'), say: $('gw-say'), w: s.clientWidth, kw: k.offsetWidth, pad, max: s.clientWidth - k.offsetWidth - 2 * pad }; }
/** The coin at x (0 to max), the lime trail behind it, the words fading as it goes; ms: how long it takes to get there (0 under the finger). */
function gwMove(P, x, ms) {
  const tr = ms ? `transform ${ms}ms ${GW_EASE}` : 'none';
  P.k.style.transition = tr; P.k.style.transform = `translateX(${x}px)`;
  if (P.f) { P.f.style.transition = tr; P.f.style.transform = `translateX(${Math.min(0, x + P.kw + 2 * P.pad - P.w)}px)`; }
  if (P.say) { P.say.style.transition = ms ? `opacity ${ms}ms ${GW_EASE}` : 'none'; P.say.style.opacity = String(Math.max(0, 1 - x / (P.max * .55))); }
}
/** Before the coin moves: the fields as they are on screen (a field still being typed in has not been read yet), the phone's keyboard put away,
    and the same checks as the button had. True when something is missing: its reason is shown at its field. */
function gwCheck() {
  const d = UI.drawer; if (!gwOn(d)) return true;
  for (const [id, k] of [['m-amount', 'amountText'], ['m-note', 'note']]) { const el = $(id); if (el) d.draft[k] = el.value; }
  const a = document.activeElement; if (a && a.matches && a.matches('#overlay input, #overlay textarea')) a.blur();
  const bad = moveCheck(d); if (bad) { fail(...bad); return true; }
  return false;
}
/** The coin goes the rest of the way into the goal (glide: by itself, after a tap), drops into it, and the contribution is recorded. */
function gwSend(P, glide) {
  if (GW.busy) return; GW.busy = true;
  const still = reducedMotion(), ms = still ? 0 : glide ? 560 : 200;
  P.s.classList.add('ready'); gwMove(P, P.max, ms);
  setTimeout(() => { P.s.classList.add('in'); gwBuzz(12); setTimeout(gwCommit, still ? 0 : 170); }, ms);
}
function gwCommit() {
  const g = $('gw-goal'), r = g && g.getBoundingClientRect();
  GW.from = r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; GW.busy = false;
  if (!gwOn(UI.drawer)) return;      // the panel was closed in the meantime
  A['move-save'](); stepsMaybe(); cheerMaybe(); save();      // what a tap on a button ends with (app/events.js)
}
// the finger on the coin: it follows along the track; near the end it is ready (a tick), let go there it goes in; a tap sends it by itself
document.addEventListener('pointerdown', e => {
  const k = e.target.closest && e.target.closest('#gw-knob'); if (!k || GW.busy || GW.drag || e.button > 0) return;
  GW.ptrAt = performance.now(); e.preventDefault();
  if (gwCheck()) return;
  const P = gwParts(); if (!P) return;
  try { k.setPointerCapture(e.pointerId); } catch (err) { }
  GW.drag = { id: e.pointerId, x0: e.clientX, t0: performance.now(), x: 0, moved: 0, ready: false, P };
  P.s.classList.add('held'); gwMove(P, 0, 0);
});
document.addEventListener('pointermove', e => {
  const D = GW.drag; if (!D || e.pointerId !== D.id) return;
  const dx = e.clientX - D.x0; D.moved = Math.max(D.moved, Math.abs(dx));
  D.x = Math.max(0, Math.min(D.P.max, dx)); gwMove(D.P, D.x, 0);
  const ready = D.x >= D.P.max * .86; if (ready !== D.ready) { D.ready = ready; D.P.s.classList.toggle('ready', ready); if (ready) gwBuzz(8); }
});
const gwUp = e => {
  const D = GW.drag; if (!D || e.pointerId !== D.id) return; GW.drag = null; GW.ptrAt = performance.now(); D.P.s.classList.remove('held');
  if (e.type === 'pointerup' && (D.ready || (D.moved < 6 && performance.now() - D.t0 < 450))) return gwSend(D.P, !D.ready);
  D.P.s.classList.remove('ready'); gwMove(D.P, 0, 260);      // let go before the end: the coin slides back
};
document.addEventListener('pointerup', gwUp); document.addEventListener('pointercancel', gwUp);
// the click a finger's touch ends with is not a second order: the touch has already done its part (Enter and a screen reader still click)
document.addEventListener('click', e => { if (e.detail > 0 && e.target.closest && e.target.closest('#gw-knob') && performance.now() - GW.ptrAt < 900) { e.stopPropagation(); e.preventDefault(); } }, true);

// ---------- 2. the success screen ----------
/** After the contribution is recorded (goals.actions.js: move-save): what changed, kept for the screen. before: the goal's facts before it. */
function gwWin(g, amt, before, next, date) {
  const bk = B(), after = goalStatus(bk, g, bk.today), ym = ymOf(bk.today), target = after.target;
  const crossed = target ? [100, 75, 50, 25].find(p => before.pct < p && after.pct >= p) || 0 : 0;
  let streak = 0; for (let k = ym; goalMonth(bk, g.id, k) > 0 && streak < 120; k = addMonths(k, -1)) streak++;      // months in a row with money put in, to this one
  const plan = goalPlan(g, ym), done = goalMonth(bk, g.id, ym), planDone = plan > 0 && ymOf(date || bk.today) === ym && done >= plan && done - amt < plan;      // completed by this contribution
  const yearly = typeof isYearly === 'function' && isYearly(g);      // a yearly expense's share (features/yearly): its own details are where Done goes back to
  if (crossed === 100 && !yearly) {      // the goal reached here: said here, so the note that would say it again later is not shown (features/ahead/curios.view.js)
    const c = S.user.cheer; if (c) { c.goals = c.goals || []; if (!c.goals.includes(g.id)) c.goals.push(g.id); }
    inboxAdd({ kind: 'cheer', cheer: 'goal', name: g.name });
  }
  UI.win = { id: g.id, name: g.name, amt, fund: !target, yearly, crossed, streak, planDone, plan, done, deadline: g.deadline || null, next, from: GW.from,
    before: { saved: before.saved, pct: before.pct || 0 }, after: { saved: after.saved, pct: after.pct || 0, target, remaining: after.remaining, projected: after.projected, required: after.required } };
  GW.from = null; UI.drawer = null; UI.sheet = 'goal-win';
  render(); gwPlay();
}
/** What it means, in one sentence. */
function gwSentence(w) {
  const m = v => fmt.money(v, BCUR(), { trim: true });
  if (w.fund) return w.plan > 0 ? t('This month: {done} of the {plan} planned.', { done: m(w.done), plan: m(w.plan) }) : '';
  if (w.after.remaining <= 0) return t('All {target} are saved. Time to enjoy it.', { target: m(w.after.target) });
  if (w.after.projected) return t('{left} to go · at the planned pace you get there in {month}.', { left: m(w.after.remaining), month: fmt.month(w.after.projected, true) });
  if (w.deadline && w.after.required) return t('{left} to go · {each} a month gets you there by {month}.', { left: m(w.after.remaining), each: m(w.after.required), month: fmt.month(w.deadline, true) });
  return t('{left} to go.', { left: m(w.after.remaining) });
}
function gwWinSheet() {
  const w = UI.win; if (!w) return '';
  const head = w.crossed === 100 || (!w.fund && w.after.remaining <= 0) ? t('Goal reached!') : w.crossed === 75 ? t('Three quarters of the way') : w.crossed === 50 ? t('Past halfway') : w.crossed === 25 ? t('A quarter of the way') : w.fund ? t('Money set aside') : t('One step closer');
  const chips = (w.streak >= 2 ? `<span class="gw-chip">${icon('flame')}${t('{n} months in a row', { n: w.streak })}</span>` : '') + (w.planDone ? `<span class="gw-chip">${icon('check')}${t('This month’s plan: done')}</span>` : '');
  const R = 76, C = +(2 * Math.PI * R).toFixed(2), say = gwSentence(w);
  const reached = !w.fund && (w.crossed === 100 || w.after.remaining <= 0);      // v214: the goal reached, the person who made it with the goal's flag
  const fig = reached ? `<div class="gw-fig gw-reached" role="img" aria-label="${esc(t('{pct} of {amount}', { pct: gwPct(100), amount: fmt.money(w.after.target, BCUR(), { trim: true }) }))}">${artFig('win', 'flag-banner', 'shadow')}</div>`
    : w.fund ? `<div class="gw-fig gw-total"><b class="num" id="gw-num">${fmt.money(w.after.saved, BCUR())}</b><small>${t('set aside in total')}</small></div>`
    : `<div class="gw-fig gw-ring" role="img" aria-label="${esc(t('{pct} of {amount}', { pct: gwPct(w.after.pct), amount: fmt.money(w.after.target, BCUR(), { trim: true }) }))}"><svg viewBox="0 0 180 180" aria-hidden="true"><circle class="gw-track" cx="90" cy="90" r="${R}"/>`
      + `<circle class="gw-arc" id="gw-arc" cx="90" cy="90" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - Math.min(100, w.after.pct) / 100)).toFixed(2)}"/></svg>`
      + `<span class="gw-pct" aria-hidden="true"><b class="num" id="gw-num">${gwPct(w.after.pct)}</b><small>${t('of {amount}', { amount: fmt.money(w.after.target, BCUR(), { trim: true }) })}</small></span></div>`;
  return `<div class="scrim"></div><div class="gw-win" role="dialog" aria-modal="true" aria-labelledby="gw-h" aria-describedby="gw-say2">
    <div class="gw-in"><p class="gw-kick">${esc(t('Saved in {name}', { name: w.name }))}</p><p class="gw-amt num">+${fmt.money(w.amt, BCUR())}</p>${fig}
      <h2 class="gw-h" id="gw-h">${head}${w.crossed && !reached ? `<span class="gw-conf" aria-hidden="true">${artObj('confetti', 'on-dark')}</span>` : ''}</h2>${say ? `<p class="gw-say2" id="gw-say2">${say}</p>` : ''}${chips ? `<div class="gw-chips">${chips}</div>` : ''}</div>
    <div class="gw-acts"><button class="btn primary" data-a="gw-done">${t('Done')}</button>${w.yearly ? '' : `<button class="btn" data-a="gw-see">${t('See goal')}</button>`}</div></div>`;
}
/** Its entrance: it opens out of the goal's flag, where the coin went in; then what was put in, the ring filling with its percentage counting with
    it, and the words. A milestone passed: the ring gives a small beat, confetti and a tick. */
function gwPlay() {
  const w = UI.win, el = document.querySelector('#overlay .gw-win'); if (!w || !el) return;
  const done = el.querySelector('[data-a="gw-done"]'); if (done) done.focus({ preventScroll: true });
  if (reducedMotion() || !el.animate) return;      // the same screen, standing still
  const o = w.from || { x: innerWidth / 2, y: innerHeight - 90 }, far = Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
  el.animate([{ clipPath: `circle(26px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(${Math.ceil(far)}px at ${o.x}px ${o.y}px)` }], { duration: 560, easing: GW_EASE, fill: 'backwards' });
  const rise = (sel, at) => el.querySelectorAll(sel).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: at + i * 60, easing: GW_EASE, fill: 'backwards' }));
  rise('.gw-kick, .gw-amt', 160);
  const fig = el.querySelector('.gw-fig'); if (fig) fig.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 240, easing: GW_EASE, fill: 'backwards' });
  rise('.gw-h, .gw-say2, .gw-chips, .gw-acts', 980);
  // the ring fills from where it was to where it is now, and its figure counts with it (one animation drives both)
  const arc = $('gw-arc'), num = $('gw-num'), from = w.fund ? w.before.saved : w.before.pct, to = w.fund ? w.after.saved : Math.min(100, w.after.pct), show = v => w.fund ? fmt.money(Math.round(v), BCUR()) : gwPct(v);
  const C = arc ? +arc.getAttribute('stroke-dasharray') : 0, timing = { duration: 1000, delay: 380, easing: GW_EASE, fill: 'backwards' };
  const drive = arc ? arc.animate([{ strokeDashoffset: C * (1 - Math.min(100, w.before.pct) / 100) }, { strokeDashoffset: C * (1 - to / 100) }], timing) : num ? num.animate([{ opacity: 1 }, { opacity: 1 }], timing) : null;
  const cheer = () => { if (fig) fig.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.77, 0, .175, 1)' });
    confetti(); const cf = $('confetti'); if (cf) cf.classList.add('gw'); gwBuzz([10, 40, 14]); };      // in the summary's colours
  if (!drive || !num) { if (w.crossed && !arc && !num) setTimeout(() => { if (el.isConnected) cheer(); }, 900); return; }      // the goal reached: its person, then the confetti (v214)
  num.textContent = show(from);
  const step = () => { if (!num.isConnected || drive.playState === 'finished') return; const p = drive.effect.getComputedTiming().progress; num.textContent = show(from + (to - from) * (p || 0)); requestAnimationFrame(step); };
  requestAnimationFrame(step);
  drive.finished.then(() => { if (!num.isConnected) return; num.textContent = show(to); if (w.crossed) cheer(); }).catch(() => { });
}
/** Out of the screen: back where the panel was opened from, or to the goal; with nothing to go to, the page shows where the money went (its row
    washes). A panel to go to comes in as a panel does. */
function gwLeave(next) {
  const w = UI.win, el = document.querySelector('#overlay .gw-win');
  const go = () => {
    UI.win = null; UI.sheet = false; UI.drawer = next;
    if (next) { UI.overlayOpen = false; renderOverlay(); return; }
    if (w) flash(w.id); render();
  };
  if (!next || !el || reducedMotion() || !el.animate) return go();
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: GW_EASE, fill: 'forwards' }).finished.then(go, go);
}
const GOAL_WIN_ACTIONS = {
  /** The coin sent by a tap, Enter or a screen reader (a finger's drag is handled above). */
  'gw-go'() { if (GW.busy || gwCheck()) return; const P = gwParts(); if (P) gwSend(P, true); },
  'gw-done'() { gwLeave(UI.win ? UI.win.next : null); },
  'gw-see'() { const g = UI.win && goalById(UI.win.id); gwLeave(g ? { kind: 'goal-view', title: g.name, id: g.id } : null); },
};
