/* Dorax Finance — the Plan on a computer (owner, 2026-10-11: "on the computer the Plan tab is too long; the information is so vertical that if I
   want to compare something I have to scroll and I lose sight of the rest; everything shows from the first moment. Show the most important things
   to avoid cognitive load; what is not important day to day, put it one click away: the salary is not touched much, it can be a pop-up").
   What is used day to day, side by side in one screen:
     - the figures of the month (the tiles, plan.view.js);
     - left, the payments of the month, to mark as paid (payList);
     - right, the month as planned (what comes in and where it goes, one bar) and the spending limits (features/limits).
   One click away: the income ("Change income", a panel) and the year month by month ("The year, month by month", a wide panel, plan.view.js:
   planYearSection). A phone keeps its own page. Clicks: plan-desk.actions.js. Styles: css/screens/plan-desk.css. */
/** The month as planned: what comes in, and how it is shared out (bills, what is kept, limits, what has no job yet); the way to change the income. */
function planMonthCard(ym) {
  const mp = monthPlan(B(), ym);
  return `<section class="card" id="plan-month"><div class="card-h"><h2>${t('{month}, as planned', { month: fmt.month(ym, 'bare') })}</h2>
      <span class="right">${mp.income ? `<button class="btn sm pm-income" data-a="plan-income">${t('Change income')}</button>` : `<button class="btn sm" data-a="plan-income">${icon('plus')}${t('Add income')}</button>`}</span></div>
    <div class="card-b">${limMonth(mp)}</div></section>`;      // a real button, dark with a fine edge (owner, 2026-10-11: "the 'change' button to see the salary is very hidden, I didn't see it")
}
/** The page under the tiles. */
function planDesk(ym) {
  return `<div class="plan-tools"><button class="btn sm" data-a="plan-year-open">${icon('grid')}${t('The year, month by month')}</button></div>
    <div class="plan-desk"><div class="pd-main">${payList(ym)}</div><div class="pd-side">${planMonthCard(ym)}${planLimitsCard(true)}</div></div>`;
}
/** "Change income": the payments of the month, in a panel. */
function planIncomeDrawer() {
  return `<div class="body">${incomeBody(B().month)}</div><footer><button class="btn primary" data-a="close">${t('Done')}</button></footer>`;
}
/** "The year, month by month": the whole grid, in a wide panel. */
function planYearDrawer() { return `<div class="body pyr">${planYearSection(true)}</div>`; }
