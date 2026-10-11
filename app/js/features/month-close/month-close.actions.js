/* Dorax Finance — clicks: the close of the month, guided (month-close.view.js). MONTH_CLOSE_ACTIONS joins A in app/actions.js. A close seen (gone
   through, or put aside with "Not now") is kept in S.user.closeSeen[ym], so it is offered once a month, on every device. */
const mcSeen = ym => { S.user.closeSeen = S.user.closeSeen || {}; S.user.closeSeen[ym] = true; };
const mcFocus = () => { const h = $('mc-h'); if (h) h.focus({ preventScroll: true }); };
const MONTH_CLOSE_ACTIONS = {
  /** Its first step; from the summary's note or the bell's "October is closed". */
  'month-close'(ds) {
    const ym = ds.ym || addMonths(ymOf(S.today), -1);
    UI.sheet = false; UI.drawer = { kind: 'month-close', title: t('The close of {month}', { month: S.settings.lang === 'en' ? mcMonthCap(ym) : mcMonth(ym) }), ym, step: 0, pop: true, full: true, book: 'personal' };
    renderOverlay(); mcFocus();
  },
  'month-close-step'(ds) {
    const d = UI.drawer; if (!d || d.kind !== 'month-close') return;
    d.step = Math.max(0, Math.min(3, +ds.v)); renderOverlay(); mcFocus();
    if (d.step === 3) { mcSeen(d.ym); const c = inBook('personal', () => monthClose(B(), d.ym, BASE_CURRENCY)); if (c.met) confetti(); }
  },
  'month-close-done'() { const d = UI.drawer; if (d && d.ym) mcSeen(d.ym); UI.drawer = null; render(); },
  /** "Not now" on the summary's note: not offered again for that month (the bell's "October is closed" still opens it in the first week). */
  'month-close-later'(ds) { mcSeen(ds.ym); toast(t('Hidden until next month.')); render(); },
  /** From inside it: the Goals or the Plan, closing it. */
  'month-close-go'(ds) { const d = UI.drawer; if (d && d.ym) mcSeen(d.ym); UI.drawer = null; navigate(ds.v === 'plan' ? 'plan' : 'goals'); if (ds.v === 'goals') A['goal-new'](); },
};
