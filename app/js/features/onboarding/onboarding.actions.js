/* Dorax Finance — clicks and field changes: the first-time setup. Joined into A in app/actions.js and into C in app/changes.js. */
function obShow(focusId) { renderNow(); window.scrollTo(0, 0); const el = $(focusId) || document.querySelector('.onb h1'); if (el) { if (el.tagName === 'H1') el.tabIndex = -1; el.focus({ preventScroll: true }); } }
const OB_FOCUS = ['ob-name', 'ob-acct', 'ob-pay0', 'ob-bn0', 'ob-gname'];
const ONBOARD_ACTIONS = {
  'onboard-save'() {
    const name = (UI.pub.name || '').trim();
    if (!name) { UI.pub.error = t('I need something to call you. A nickname works.'); renderNow(); const el = $('ob-name'); if (el) el.focus(); return; }
    UI.pub.error = null; const o = ob(); if (!o.bills) o.bills = obBills(); o.step = 1; obShow(OB_FOCUS[1]);
  },
  'ob-next'() {
    const o = ob(); o.done[o.step] = true; const e = obRead().errors[o.step];
    if (e) { o.done[o.step] = false; o.error = e; renderNow(); const b = document.querySelector('.onb .banner'); if (b) b.scrollIntoView({ block: 'nearest' }); return; }
    o.error = null; o.step++; obShow(OB_FOCUS[o.step]);
  },
  'ob-skip'() { const o = ob(); o.done[o.step] = false; o.error = null; o.step++; obShow(OB_FOCUS[o.step]); },
  'ob-back'() { const o = ob(); o.error = null; o.step = Math.max(0, o.step - 1); obShow(OB_FOCUS[o.step]); },
  'ob-pays'(ds) { const o = ob(); o.pays = +ds.v === 1 ? 1 : 2; o.error = null; renderNow(); },
  'ob-add-bill'() { const o = ob(); o.bills.push({ name: '', amount: '', due: '' }); renderNow(); const el = $('ob-bn' + (o.bills.length - 1)); if (el) el.focus(); },
  /** Finishes with what was confirmed so far. A step left with something unreadable is shown again instead of being dropped silently. */
  'ob-finish'() {
    const name = (UI.pub.name || '').trim(), o = ob();
    if (!name) { o.step = 0; return ONBOARD_ACTIONS['onboard-save'](); }
    const d = obRead(), bad = Object.keys(d.errors)[0];
    if (bad) { o.step = +bad; o.error = d.errors[bad]; o.done[bad] = false; return obShow(OB_FOCUS[bad]); }
    S.user.name = name; const any = applyOnboarding(d), toSheet = o.sheet;
    if (S.accounts.length && payRows(S, +S.today.slice(0, 4)).length && S.plan.lines.length && S.goals.length) S.isNew = false;   // nothing left for the first-steps list to offer
    UI.ob = null;
    startSession(any ? t('Welcome, {name}. Your month is set up.', { name }) : t('Welcome, {name}. Let’s set up your month.', { name }));
    if (toSheet) A['sheet-go']();
  },
};
const ONBOARD_CHANGES = {
  ob(el) { obSet(el.dataset.k, el.value); },
  'ob-sheet'(el) { ob().sheet = el.checked; },
};
