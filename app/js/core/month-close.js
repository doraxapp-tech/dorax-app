/* Dorax Finance — calculations: how a month closed (Sprint 3, owner, 2026-10-10: "do the sprints"; claude/open-gaps-funcionalidades-2026-10-10.md,
   item 5: "a guided close of the month, 3 minutes, on the 1st: how the month closed, how far each goal moved, the figure for the month that
   starts, a celebration when it was met. It makes a monthly ritual, which is what fails when only 4 in 10 keep to their plan (Serasa, Jun 2025)").
   Read from the account as it is, nothing stored: what came in and went out, against the month before; the spending limits kept and gone over;
   each goal's contributions against its plan. "Met" is a fact, not a judgement: more came in than went out, no limit was gone over, and the goals
   got what was planned for them. The words and the screens: features/month-close. All money in integer cents. */
function monthClose(state, ym, currency) {
  const m = monthSummary(state, ym, currency), before = monthSummary(state, addMonths(ym, -1), currency), nowYm = addMonths(ym, 1);
  const lims = planProgress(state, ym, currency, isoDate(nowYm, 1)).filter(p => p.pay === 'budget' && p.planned > 0);
  const over = lims.filter(p => p.spent > p.planned).map(p => ({ name: p.name, amount: p.spent - p.planned }));
  const goals = state.goals.filter(g => g.status !== 'archived').map(g => ({ id: g.id, name: g.name, yearly: !!g.yearly, planned: goalPlan(g, ym), done: goalMonth(state, g.id, ym),
    saved: goalSaved(state, g.id, ym), target: g.kind === 'goal' && g.target > 0 ? g.target : null })).filter(x => x.planned > 0 || x.done !== 0);
  const planned = sum(goals.map(x => x.planned)), done = sum(goals.map(x => Math.max(0, x.done)));
  return { ym, income: m.income, expenses: m.expenses, saved: m.saved, count: m.count, before: before.count ? before.saved : null,
    limits: lims.length, over, goals, planned, done, met: m.count > 0 && m.saved >= 0 && !over.length && done >= planned };
}
