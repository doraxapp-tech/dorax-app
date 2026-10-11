/* Dorax Finance — clicks: the Plan on a computer (plan-desk.view.js). PLAN_DESK_ACTIONS joins A in app/actions.js. */
const PLAN_DESK_ACTIONS = {
  /** "Change income": the payments of the month, one click away. */
  'plan-income'() { UI.drawer = { kind: 'plan-income', title: t('Income, {month}', { month: fmt.month(B().month) }), pop: true, mid: true }; renderOverlay(); const el = document.querySelector('#overlay .payrow input'); if (el) el.focus({ preventScroll: true }); },
  /** "The year, month by month": the grid, wide. */
  'plan-year-open'() { UI.drawer = { kind: 'plan-year', title: t('The year, month by month'), pop: true, wide: true }; renderOverlay(); },
};
