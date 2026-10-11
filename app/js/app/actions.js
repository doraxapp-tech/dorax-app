/* Dorax Finance — every click.
   A button says what it does with data-a="name"; the page listens once (events.js) and calls A[name].
   Each screen keeps its own actions beside its view (features/<screen>/<screen>.actions.js); this file only puts them together.
   A later group wins over an earlier one when two share a name (none do; tools/build.js checks). */
const A = {
  ...SHEET_ACTIONS,
  ...REMIND_ACTIONS,
  ...ISSUE_ACTIONS,      // what is wrong, in the bell: what is going on and how to solve it (features/reminders/issues)
  ...ONBOARD_ACTIONS,
  ...AHEAD_ACTIONS, ...COMPANY_ACTIONS,
  ...PHONE_ACTIONS, ...QUICK_SHEET_ACTIONS, ...PHONE_GOAL_ACTIONS, ...PHONE_PLAN_ACTIONS, ...PHONE_ORDER_ACTIONS, ...WALLET_ACTIONS, ...INSTALL_ACTIONS, ...PAYDAY_ACTIONS, ...LOCK_ACTIONS,
  ...SHELL_ACTIONS,
  ...PUBLIC_ACTIONS,
  ...AUTH_ACTIONS,
  ...PROFILE_ACTIONS, ...PHOTO_ACTIONS,
  ...PLAN_ACTIONS,
  ...GOALS_ACTIONS,
  ...JOURNEY_ACTIONS,      // the way out of debt (features/journey)
  ...TOUR_ACTIONS,      // the first visit to each main screen (features/tours)
  ...FREE_ACTIONS,      // what is free to spend until pay day (features/dashboard/free-until.view.js)
  ...HELP_ACTIONS,      // Help: the questions people ask, each leading to its answer (features/help)
  ...LIMIT_ACTIONS,      // spending limits by category (features/limits)
  ...YEARLY_ACTIONS,      // what is paid once a year (features/yearly)
  ...MONTH_CLOSE_ACTIONS,      // the close of the month, guided (features/month-close)
  ...PLAN_DESK_ACTIONS,      // the Plan on a computer: the income and the year one click away (features/plan)
  ...PLAN_GUIDE_ACTIONS,      // "Plan your month": income, what to keep, a limit per category (features/limits/plan-guide)
  ...TRANSACTIONS_ACTIONS,
  ...SETTINGS_ACTIONS,
  ...ACCOUNTS_ACTIONS,
  ...INVESTMENTS_ACTIONS,
  ...RECURRING_ACTIONS,
  ...CATEGORIES_ACTIONS,
  ...CAT_ICON_ACTIONS,      // a category's icon (features/categories/cat-icon)
  ...IMPORTS_ACTIONS,
  ...BANK_ACTIONS,
  ...FIND_ACTIONS,
  ...REPORT_ACTIONS,
  ...KPI_ACTIONS,      // what a figure of the summary is made of (features/dashboard/kpi-explain.js)      // the rings of Reports (features/reports/report-rings.js)
  ...CONVERTER_ACTIONS,
};
// Every click runs in a book: the one the button names (data-book: a company bill in the bell), else the open panel's, else the page's
// (ui/lookups.js). Set once here, so no action has to think about it.
for (const k of Object.keys(A)) { const fn = A[k]; A[k] = (ds, el) => inBook((ds && ds.book) || bookKey(), () => fn(ds, el)); }
