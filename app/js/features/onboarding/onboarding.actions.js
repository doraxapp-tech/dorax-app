/* Dorax Finance — clicks and field changes: the first-time setup. Joined into A in app/actions.js and into C in app/changes.js. */
function obShow(focusId) {
  renderNow(); toTop();
  const el = (focusId && $(focusId)) || document.querySelector('.onb h1'); if (el) { if (el.tagName === 'H1') el.tabIndex = -1; el.focus({ preventScroll: true }); }
  document.querySelectorAll('.onb [data-count]').forEach(countUp);      // the days of freedom count up once when their screen arrives (app/motion.js)
}
const OB_FOCUS = ['ob-name', '', '', ''];      // only the name is a field to type in at once: the numbers have sliders, and a phone's keyboard should not cover them
const ONBOARD_ACTIONS = {
  /** The first screen's button: a name is needed; a dream, when one is chosen, needs its cost. */
  'onboard-save'() {
    const name = (UI.pub.name || '').trim(), o = ob();
    if (!name) { UI.pub.error = t('I need something to call you. A nickname works.'); renderNow(); const el = $('ob-name'); if (el) el.focus(); return; }
    UI.pub.error = null; const e = obRead().errors[0];
    if (e) { o.error = e; renderNow(); const el = $(o.dream === 'other' && !(o.dreamName || '').trim() ? 'ob-dream-name' : 'ob-cost'); if (el) el.focus(); return; }
    o.error = null; o.step = 1; obShow(OB_FOCUS[1]);
  },
  'ob-next'() {
    const o = ob();
    if (o.step === 0) return ONBOARD_ACTIONS['onboard-save']();
    if (o.step >= OB_STEPS - 1) return ONBOARD_ACTIONS['ob-finish']({});
    let cheer = false;
    if (o.step === 1) {
      const d = obRead(true), e = d.errors[1]; if (e) { o.error = e; renderNow(); const b = document.querySelector('.onb .banner'); if (b) b.scrollIntoView({ block: 'nearest' }); return; }
      o.seen = true; cheer = d.look.days > 0 || d.look.free > 0 || d.look.covered;      // these are the person's own numbers now; confetti when they hold good news (never over "more goes out than comes in")
    }
    o.error = null; o.step++; obShow(OB_FOCUS[o.step]); if (cheer) confetti();
  },
  'ob-back'() { const o = ob(); o.error = null; UI.pub.error = null; o.step = Math.max(0, o.step - 1); obShow(OB_FOCUS[o.step]); },
  'ob-dream'(ds) {
    const o = ob(), was = o.dream, row = obDreams().find(x => x[0] === ds.v); if (!row) return;
    o.dream = ds.v; o.error = null; if (!o.costTouched) o.cost = plain(row[4] * 100);      // each dream's slider starts at its own round figure, until the person has moved or typed one
    renderNow(); const el = was !== o.dream && o.dream === 'other' ? $('ob-dream-name') : document.querySelector('.ob-dream[aria-pressed="true"]'); if (el) el.focus();      // only the name needs typing: the cost has its slider, and a phone's keyboard should not jump up for it
  },
  /** Finishes with what was answered so far. Something typed that cannot be read is shown again on its screen instead of being dropped silently.
      ds.go: where the last screen sends the person next: 'plan' (a first fixed cost) or 'sheet' (the spreadsheet import). Whether there is a company too
      is asked on the dashboard (features/ahead), not here. */
  'ob-finish'(ds) {
    const name = (UI.pub.name || '').trim(), o = ob();
    if (!name) { o.step = 0; return ONBOARD_ACTIONS['onboard-save'](); }
    const d = obRead(), bad = Object.keys(d.errors)[0];
    if (bad) { o.step = +bad; o.error = d.errors[bad]; return obShow(OB_FOCUS[bad]); }
    S.user.name = firstName(name); if (name !== S.user.name) S.user.fullName = name;      // the app calls the person by their first name; the name as typed is kept beside it
    const any = applyOnboarding(d), go = ds && ds.go;
    if (S.accounts.length && payRows(S, +S.today.slice(0, 4)).length && S.plan.lines.length && S.goals.length) S.isNew = false;   // nothing left for the first-steps list to offer
    UI.ob = null;
    startSession(any ? t('Welcome, {name}. Your month is set up.', { name: S.user.name }) : t('Welcome, {name}. Let’s set up your month.', { name: S.user.name }));
    if (go === 'sheet') A['sheet-go']();
    else if (go === 'plan') { navigate('plan'); A['line-new']({ skipGuide: '1' }); }
    else if (go === 'limits') { navigate('plan'); A['plan-guide']({}); }
  },
};
/** A slider and its field show the same amount. n is in reais. */
function obRangeShow(r, n) { r.value = n; r.style.setProperty('--p', obPct(n, +r.max) + '%'); r.setAttribute('aria-valuetext', fmt.money(n * 100, r.dataset.cur || CUR, { trim: true })); }
const ONBOARD_CHANGES = {
  /** A field of the setup. One that has a slider moves it along, as far as the slider goes (a larger amount stays in the field). */
  ob(el) {
    obSet(el.dataset.k, el.value); if (el.dataset.k === 'cost') ob().costTouched = true;
    const r = el.dataset.range && $(el.dataset.range), c = r ? typedAmount(el.value) : null;
    if (r && c !== null && c >= 0) obRangeShow(r, Math.min(+r.max, Math.round(c / 100)));
  },
  /** A slider of the setup: its field takes the amount, written the way amounts are typed here. */
  'ob-range'(el) {
    const n = +el.value, text = plain(n * 100); obSet(el.dataset.k, text); if (el.dataset.k === 'cost') ob().costTouched = true;
    const field = $(el.dataset.text); if (field) field.value = text; obRangeShow(el, n);
  },
};
