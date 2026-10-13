/* Dorax Finance — clicks: the computer's own pages in the summary's look (v203; features/desk/desk-kit.js). DESK_ACTIONS joins A in app/actions.js. */
const DESK_ACTIONS = {
  /** Plan: a category charged whole to a card is one row; "See the N" opens it, "Hide" folds it again. The focus stays on the button. */
  'dk-fold'(ds) {
    const f = UI.dkFold || (UI.dkFold = {}); f[ds.cat] = !f[ds.cat]; render();
    const el = document.querySelector(`[data-a="dk-fold"][data-cat="${ds.cat}"]`); if (el) el.focus({ preventScroll: true });
  },
  /** The forest's buttons that lead to the work further down the page ("Hand it out now", "Record those of October"). */
  'dk-go'(ds) { dkGo(ds.to); },
  /** Goals: the monthly plan, month by month, in a wide panel (it was the last part of the page). */
  'goal-year-open'() { UI.drawer = { kind: 'goal-year', title: t('Monthly plan'), pop: true, wide: true }; renderOverlay(); },
  /** Reports: "See as a table": the year, month by month, in a panel. */
  'dk-rep-table'() { UI.drawer = { kind: 'rep-year', title: t('The year, month by month'), pop: true, mid: true }; renderOverlay(); },
  /** Investments: the distributions of one day, opened into their funds or folded again. */
  'dk-day'(ds) {
    const o = UI.dkDay || (UI.dkDay = {}); o[ds.v] = !o[ds.v]; render();
    const el = document.querySelector(`[data-a="dk-day"][data-v="${ds.v}"]`); if (el) el.focus({ preventScroll: true });
  },
};
