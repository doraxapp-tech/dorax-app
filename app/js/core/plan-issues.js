/* Dorax Finance — calculations: what is wrong with the plan right now (owner, 2026-10-10: "if something is wrong, or the person went over in the
   plan, for example 'the plan uses R$ 50 more than the planned income', it must be notified in the bell immediately; and a tap must say what is going
   on, how to solve it, and take the person with one tap to where it is solved").
   Each issue is read from the account as it is now, so it appears the moment it happens and goes the moment it is solved; nothing is stored:
     plan-over   the month's plan (fixed bills, what is kept, limits: core/limits.js, monthPlan) adds up to more than the planned income
     no-income   the month has bills or limits and no income planned at all
     short       what the spending accounts hold today does not cover what is due before pay day (core/free-until.js); the household's only
     negative    a checking or cash account shows less than zero
   The person's own figures only, and facts: nothing here is advice. The words and the ways to fix them: features/reminders/issues.view.js.
   Shaped like the reminders (core/reminders.js) so the bell lists them with the rest: { id, kind: 'issue', what, level, ym, … }. All money in cents. */
function planIssues(state, today, currency) {
  const ym = ymOf(today), mp = monthPlan(state, ym), out = [], biz = state.scope === 'business';
  const planned = mp.bills + mp.limits;
  if (!mp.income && planned > 0) out.push({ id: 'issue:no-income:' + ym, kind: 'issue', what: 'no-income', level: 'warn', ym, amount: planned });
  else if (mp.income > 0 && mp.free < 0) out.push({ id: 'issue:plan-over:' + ym, kind: 'issue', what: 'plan-over', level: 'crit', ym, amount: -mp.free, mp });
  if (!biz) { const f = freeUntil(state, today, currency); if (f && f.free < 0) out.push({ id: 'issue:short:' + ym, kind: 'issue', what: 'short', level: 'crit', ym, amount: -f.free, free: f }); }
  for (const a of state.accounts) {
    if ((a.scope === 'business') !== biz || (a.type !== 'checking' && a.type !== 'cash') || (biz && a.currency !== currency)) continue;
    const bal = accountBalance(state, a.id, today);
    if (bal < 0) out.push({ id: 'issue:negative:' + a.id, kind: 'issue', what: 'negative', level: 'warn', ym, accountId: a.id, name: a.name, amount: bal, currency: a.currency });
  }
  return out;
}
