/* Dorax Finance — calculations: what is paid once a year (Sprint 2, owner, 2026-10-10: "do the sprints"; claude/open-gaps-funcionalidades-2026-10-10.md,
   item 3: "IPVA, IPTU, school fees and supplies, insurance, Christmas: 'IPVA of R$ 1.800 in January: set aside R$ 150 a month from today'. It uses
   the goals' engine: a goal with a fixed date that repeats every year. It avoids January's blow, which usually ends on the card or the overdraft").
   A yearly expense is a goal (core/goals.js) with `yearly: { month, cat }`: its target is what it costs, its deadline the month it is due next, its money
   kept in a savings account like any goal's, its monthly plan the share to set aside in each month before it is due. Being a goal, it counts in the
   savings plan, in the month's plan (core/limits.js: monthPlan) and in what is free to spend (core/free-until.js) with no code of its own there.
   When it is paid, the goal gives back what was set aside, the expense is recorded, and next year's starts, at the price paid.
   The words and the screens: features/yearly. All money in integer cents. */
/** Ideas for the first ones: [key, the name in the person's language, the usual month (0: always asked)]. The month is only a starting point:
    the form always asks it. */
const YEARLY_IDEAS = [['ipva', 'IPVA (car tax)', 1], ['iptu', 'IPTU (property tax)', 2], ['school', 'School enrolment', 1], ['supplies', 'School supplies', 1], ['insurance', 'Car insurance', 0], ['christmas', 'Christmas', 12]];
const isYearly = g => !!(g && g.yearly);
/** The month it is due next, YYYY-MM: this year's while that month has not passed, else next year's. */
function yearlyDueFrom(month, today) { const y = +today.slice(0, 4); return `${month >= +today.slice(5, 7) ? y : y + 1}-${String(month).padStart(2, '0')}`; }
/** The months to set money aside in, from `from`: the months before the one it is due; at least one (due this month: all of it now). */
const yearlyMonths = (due, from) => Math.max(1, monthDiff(due, from));
/** A month's share of what is left, rounded up to whole reais so the last month never falls short. */
const yearlyShare = (left, months) => left > 0 ? Math.ceil(left / months / 100) * 100 : 0;
/** Plans its months: the share in every month from `from` to the month before it is due (the due month itself when it is due now), and nothing
    after; the months before `from` keep what they had. `left` is what is still to set aside from `from` on. Returns the share. */
function yearlyPlan(g, from, left) {
  const ahead = monthDiff(g.deadline, from), share = yearlyShare(left, yearlyMonths(g.deadline, from)), to = ahead > 0 ? addMonths(g.deadline, -1) : g.deadline;
  for (const y in g.plan) g.plan[y] = g.plan[y].map((v, i) => y + '-' + String(i + 1).padStart(2, '0') >= from ? 0 : v);
  if (ahead >= 0) setGoalPlan(g, from, to, share);
  return share;
}
/** Where one stands today: what it costs, what is set aside, the share of this month and of the months to come, and when it is due. */
function yearlyState(state, g, today) {
  const nowYm = ymOf(today), due = g.deadline, saved = goalSaved(state, g.id), target = g.target || 0, left = Math.max(0, target - saved);
  const done = goalMonth(state, g.id, nowYm), plan = goalPlan(g, nowYm), months = yearlyMonths(due, nowYm);
  return { due, saved, target, left, months, plan, done, toDo: Math.max(0, plan - done), share: due > nowYm ? yearlyShare(Math.max(0, target - saved + done), months) : left,
    ready: target > 0 && saved >= target, now: due === nowYm, late: due < nowYm, last: monthDiff(due, nowYm) > 0 ? addMonths(due, -1) : due, pct: target ? Math.min(100, Math.round(saved * 1000 / target) / 10) : 0 };
}
/** When the next one is due once this one is paid: a year on, and after this month. */
function yearlyNextDue(g, today) { const nowYm = ymOf(today); let due = g.deadline; do due = addMonths(due, 12); while (due <= nowYm); return due; }
/** Next year's share a month, at a given price, planned from next month on. */
const yearlyNextShare = (g, paid, today) => yearlyShare(paid, yearlyMonths(yearlyNextDue(g, today), addMonths(ymOf(today), 1)));
/** After it is paid: next year's, at the price paid, planned from next month on. */
function yearlyRoll(g, paid, today) {
  g.deadline = yearlyNextDue(g, today); g.target = paid;
  yearlyPlan(g, addMonths(ymOf(today), 1), paid);
  return g.deadline;
}
