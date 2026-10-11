/* Dorax Finance — calculations: spending limits close to their end, or past it (owner, 2026-10-10, the first batch of "what more can help": "notify
   when a category gets near its limit"). A limit is a line of the Plan spent in several purchases across the month (pay: 'budget'). Until now the
   limit showed only while writing an expense (the expense form); now, as a reminder, it is in the bell and goes out the next morning by notification
   and email like the others (core/reminders.js), once at 80% of the limit and once when it is passed, each once a month (reminderKey: id | when).
   Nothing is advice: what was spent, the limit the person set, what is left, and the days left in the month. All money is integer cents. */
const BUDGET_NEAR = 80;      // percent of the limit
function budgetReminders(state, today, currency) {
  const ym = ymOf(today), left = daysInMonth(ym) - +today.slice(8), out = [];
  for (const p of planProgress(state, ym, currency, today)) {
    if (p.pay !== 'budget' || !p.planned || p.spent <= 0) continue;
    const pct = Math.round(p.spent * 100 / p.planned); if (pct < BUDGET_NEAR) continue;
    const over = p.spent > p.planned;
    out.push({ id: 'budget:' + p.id + ':' + ym, kind: 'budget', when: over ? 'over' : 'near', level: over ? 'warn' : 'info', lineId: p.id, categoryId: p.subcategoryId || p.categoryId, name: p.name, ym,
      pct, spent: p.spent, planned: p.planned, amount: over ? p.spent - p.planned : p.planned - p.spent, daysLeft: left });
  }
  return out.sort((a, b) => b.pct - a.pct);
}
