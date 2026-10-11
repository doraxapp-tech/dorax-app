/* Dorax Finance — the way back (owner, 2026-10-09: "on every tab and sub-menu of the web app add a button to go back, to the previous action:
   sometimes I open something and cannot go back, and have to look for it again").

   The app remembers where the person was each time a press takes them somewhere else: another screen (from the menu, the bar at the foot, a link
   in a card, the search) or another panel opened from a panel. A place is the screen with what it was
   showing (the month, the side, the transactions' filters, the report's view and the category opened in it, how far down it was read) and the
   panel open on it, so going back lands exactly there: a category pressed in Reports opens Transactions; back is Reports, on the same month,
   with the same category open in its ring.
     - On a computer, "‹ Reports" (the name of where it goes) sits before the screen's title.
     - On a phone, no button on top (owner, 2026-10-10: "remove the back button on the phone that shows beside the profile photo"): the phone's own
       back is the way back there.
     - A panel opened from another panel has ‹ at the left of its title: back is the panel it came from.
     - The phone's own back (Android's button or gesture, the browser's Back) does the same, one step at a time: it closes a menu or a panel first,
       then goes back. To have it, the app keeps one step of its own in the browser's history while there is somewhere to go back to.
   Opening a panel over a screen is not a step: its X (or Escape) is the way back from it; a panel that closes takes the panels behind it along.
   Thirty steps are kept, the oldest forgotten first. */
const BACK = { stack: [], max: 30, guard: false, skip: false, pre: null, busy: false };
const backKey = d => d ? [d.kind, d.id || (d.draft && d.draft.id) || '', d.isNew ? 'new' : ''].join(':') : '';
const backY = () => { const w = scroller(); return (w && w.scrollTop) || window.scrollY || 0; };
/** Where the person is now. */
function backPlace() {
  return { route: UI.route, drawer: UI.drawer || null, key: backKey(UI.drawer), month: S.month, space: UI.space, spaceCur: UI.spaceCur, tx: { ...UI.tx }, repView: UI.repView, repDrill: UI.repDrill, y: backY() };
}
const backSame = (a, b) => a.route === b.route && a.space === b.space && a.key === b.key;
/** Somewhere else: another screen, or another panel in place of the one open. Changing side is not a step: its own switch, two arrows beside the
    bell, is the way back to the other side, and the top bar must not move when it is pressed (owner, 2026-10-07). A step back still lands on the
    side its place was on. */
const backMoved = (b, a) => b.route !== a.route || (!!b.key && !!a.key && b.key !== a.key);
function backPush(p) {
  const top = BACK.stack[BACK.stack.length - 1]; if (top && backSame(top, p)) return;
  BACK.stack.push(p); if (BACK.stack.length > BACK.max) BACK.stack.shift();
}
/** After every press: a step to remember, or panels to forget. */
function backAfter(b) {
  if (!b || !UI.session || LOCK.on) return;
  if (BACK.busy) { BACK.busy = false; backPaint(); backGuard(); return; }      // the press was the way back itself: nothing to remember
  const a = backPlace();
  if (backMoved(b, a)) backPush(b);
  else if (b.drawer && !a.drawer) while (BACK.stack.length && BACK.stack[BACK.stack.length - 1].route === a.route && BACK.stack[BACK.stack.length - 1].drawer) BACK.stack.pop();      // a panel closed: the panels behind it go too
  backPaint(); backGuard();
}
const backTop = () => BACK.stack[BACK.stack.length - 1] || null;
/** What the way back is called: the panel it reopens, or the screen. The side it returns to, when it is the other one, is said to a screen reader
    and in the tip, not on the button: changing side must not move the title beside it (owner, 2026-10-07). */
const backName = p => p.drawer && p.drawer.title && p.route !== UI.route ? p.drawer.title : routeLabel(p.route);
const backSay = p => t('Back to {name}', { name: backName(p) + (p.space !== UI.space ? ` · ${p.space === 'business' ? t('Company') : t('Household')}` : '') });
/** The way back of a screen: only toward another screen or side (a panel behind the open one is the panel's own way back). */
const backForPage = () => { const p = backTop(); return !p || (UI.drawer && p.drawer && p.route === UI.route && p.space === UI.space) ? null : p; };
function backButton() {
  const p = backForPage(); if (!p) return '';
  const say = backSay(p);
  return `<button class="btn sm ghost back-btn" data-a="back" aria-label="${esc(say)}" data-tip="${esc(say)}">${icon('left')}<span>${esc(backName(p))}</span></button>`;
}
/** The way back of a panel opened from another panel. */
function backPanelButton() {
  const p = backTop(); if (!p || !UI.drawer || !p.drawer || p.route !== UI.route || p.space !== UI.space) return '';
  const say = t('Back to {name}', { name: p.drawer.title || t('Back') });
  return `<button class="btn ghost sm dr-back" data-a="back" aria-label="${esc(say)}" data-tip="${esc(say)}">${icon('left')}</button>`;
}
/** The two places a way back is shown, drawn again without drawing the screen. */
function backPaint() {
  const put = (el, html) => { if (el && el.innerHTML !== html) el.innerHTML = html; };      // only what changed: a key typed in a field draws nothing
  put($('back-pc'), backButton()); put(document.querySelector('#overlay .dr-back-slot'), backPanelButton());
}
/** One step back: a menu or the search open closes; a panel opened over the screen closes; otherwise the last place comes back as it was. */
function backStep() {
  if (UI.modal) return false;
  if (UI.tour) { A['tour-close'](); return true; }      // a screen's first visit (features/tours): its page closes
  if (UI.jstart && !UI.drawer) { if (UI.jstart.step > 0 && !UI.jstart.done) A['jstart-step']({ v: UI.jstart.step - 1 }); else A['jstart-close'](); return true; }      // the Journey's first page: a step back, then out
  if (UI.sheet) { UI.sheet = false; renderOverlay(); return true; }
  if (UI.find) { A['find-close'](); return true; }
  const p = backTop();
  if (UI.drawer && !(p && p.drawer && p.route === UI.route && p.space === UI.space)) { A.close(); return true; }
  if (!p) return false;
  BACK.stack.pop();
  Object.assign(UI, { space: p.space, spaceCur: p.spaceCur, repView: p.repView, repDrill: p.repDrill, tx: { ...p.tx }, sheet: false, drawer: null });
  S.month = p.month;
  if (p.route !== UI.route) navigate(p.route); else renderNow();
  if (p.drawer) { UI.drawer = p.drawer; try { renderOverlay(); } catch (e) { UI.drawer = null; renderOverlay(); } }      // a panel whose thing was deleted since: the screen alone
  else if (UI.overlayOpen) renderOverlay();
  const w = scroller(); window.scrollTo(0, p.y); if (w) w.scrollTop = p.y;
  return true;
}
// ---------- the browser's own Back (a phone's back button or gesture) ----------
const backCan = () => !!(UI.session && !LOCK.on && (UI.sheet || UI.drawer || UI.find || UI.jstart || UI.tour || BACK.stack.length));
/** One step of the app's own in the browser's history while there is somewhere to go back to; given back when there is none. */
function backGuard() {
  try {
    if (backCan() && !BACK.guard) { history.pushState({ doraxBack: 1 }, '', location.href); BACK.guard = true; }
    else if (!backCan() && BACK.guard && UI.session) { BACK.guard = false; BACK.skip = true; history.back(); }
  } catch (e) { /* a frame that may not change its history: the buttons still work */ }
}
const backHash = () => { try { if (UI.session) history.replaceState(history.state, '', '#' + UI.route); } catch (e) { /* the address stays as it was */ } };
window.addEventListener('popstate', () => {
  if (!UI.session) { BACK.guard = false; return; }      // the pages before login have their own (ui/pages.js)
  if (BACK.skip) { BACK.skip = false; backHash(); return; }
  BACK.guard = false;
  if (!LOCK.on) { BACK.busy = false; backStep(); }
  backHash(); backPaint(); backGuard();
});
// what a press or a key changed: noted before every handler (capture), compared after them (this file loads after app/events.js)
['click', 'keydown'].forEach(type => {
  document.addEventListener(type, () => { if (!UI.session) BACK.stack.length = 0; BACK.pre = UI.session ? backPlace() : null; }, true);      // logged out: the steps of that session are forgotten
  document.addEventListener(type, () => { const b = BACK.pre; BACK.pre = null; backAfter(b); });
});
const BACK_ACTIONS = {
  /** The way back pressed in the app. */
  back() { BACK.busy = true; backStep(); },
};
Object.assign(A, BACK_ACTIONS);      // A is joined before this file loads (app/actions.js)
