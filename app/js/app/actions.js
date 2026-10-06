/* Dorax Finance — every click.
   A button says what it does with data-a="name"; the page listens once (events.js) and calls A[name].
   Each screen keeps its own actions beside its view (features/<screen>/<screen>.actions.js); this file only puts them together.
   A later group wins over an earlier one when two share a name (none do; tools/build.js checks). */
const A = {
  ...SHEET_ACTIONS,
  ...REMIND_ACTIONS,
  ...ONBOARD_ACTIONS,
  ...SHELL_ACTIONS,
  ...PUBLIC_ACTIONS,
  ...AUTH_ACTIONS,
  ...PROFILE_ACTIONS,
  ...PLAN_ACTIONS,
  ...GOALS_ACTIONS,
  ...TRANSACTIONS_ACTIONS,
  ...SETTINGS_ACTIONS,
  ...ACCOUNTS_ACTIONS,
  ...INVESTMENTS_ACTIONS,
  ...RECURRING_ACTIONS,
  ...CATEGORIES_ACTIONS,
  ...IMPORTS_ACTIONS,
  ...BANK_ACTIONS,
  ...CONVERTER_ACTIONS,
};
