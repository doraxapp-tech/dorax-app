/* Dorax Finance — clicks: the Plan on a computer (plan-desk.view.js). PLAN_DESK_ACTIONS joins A in app/actions.js. */
const PLAN_DESK_ACTIONS = {
  /** "Change income": the payments of the month, one click away. */
  // Every button that changes the salary opens this panel, wherever it is (owner, 2026-10-11: "make sure ALL the buttons to change the salary open the
  // salary's pop-up instead of making the person look for a hidden button"): "Set your pay day" (the focus on the first pay day), "Add income" of
  // the first steps (a new payment, its name ready to type), the guide's "Change income" (Done goes back to the guide).
  'plan-income'(ds) {
    ds = ds || {};
    UI.menu = false; UI.sheet = false; UI.drawer = { kind: 'plan-income', title: t('Income, {month}', { month: fmt.month(B().month) }), pop: true, mid: true, ret: ds.ret || null }; renderOverlay();
    if (ds.add) return A['add-pay']({ y: ds.add, ym: B().month });      // a computer: the new payment in this panel, its name selected; a phone: its own panel
    const el = document.querySelector(ds.focus === 'day' ? '#overlay .pay-day select' : '#overlay .payrow input') || document.querySelector('#overlay [data-a="add-pay"]'); if (el) el.focus({ preventScroll: true });
  },
  /** Done: back to the guide when it opened the panel, else closed. */
  'plan-income-done'() { if (UI.drawer && UI.drawer.ret === 'guide') return A['plan-guide']({}); A.close(); },
  /** "The year, month by month": the grid, wide. */
  'plan-year-open'() { UI.drawer = { kind: 'plan-year', title: t('The year, month by month'), pop: true, wide: true }; renderOverlay(); },
};
