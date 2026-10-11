/* Dorax Finance — calculations: looking ahead. Days of freedom (how long what is put aside lasts at the pace money goes out) and when a goal is reached. */
// ---------- looking ahead ----------
// 2026-10-07 (owner: "most apps look back; I want Dorax to project forward: runway, when I can buy my car"). Everything here is arithmetic on
// figures the account already holds or the person typed. No investment return is assumed anywhere: a date is "at this pace", never a promise.
// All money is integer cents, like the rest of the engine.

/** Contributions needed to go from `saved` to `target` at `monthly` a month. 0 = already there. null = never, because nothing is set aside. */
function monthsToTarget(target, saved, monthly) {
  if (!(target > saved)) return 0;
  if (!(monthly > 0)) return null;
  return Math.ceil((target - saved) / monthly);
}
/** The month the target is reached when the first contribution is made in `fromYm`: the n-th one lands in fromYm + n - 1. */
function arrivalMonth(target, saved, monthly, fromYm) {
  const n = monthsToTarget(target, saved, monthly);
  return n === null ? null : addMonths(fromYm, Math.max(0, n - 1));
}
/** The smallest step that brings the target at least one month closer, and by how many months: { extra, sooner }. null when no step does. */
const LEVER_STEPS = [5000, 10000, 20000, 50000, 100000];
function lever(target, saved, monthly) {
  const now = monthsToTarget(target, saved, monthly);
  if (!now) return null;                                   // reached already, or nothing is set aside: there is no pace to speed up
  for (const extra of LEVER_STEPS) { const sooner = now - monthsToTarget(target, saved, monthly + extra); if (sooner >= 1) return { extra, sooner }; }
  return null;
}
/** Days that `cushion` lasts when `burn` goes out every month. A month counts as 30 days. null when nothing goes out: there is no pace to measure against. */
function runwayDays(cushion, burn) { return burn > 0 ? Math.max(0, Math.floor(cushion * 30 / burn)) : null; }
/** Days said in months, in halves and rounded down (owner, 2026-10-07: "3, 3 and a half, 4: 3,2 or 3,3 is odd to read"): 100 days is 3, 105 is 3.5.
    Down, never up, so the figure never says more than there is. */
function runwayMonths(days) { return Math.floor(days / 15) / 2; }

/** The first look ahead, from the four figures of the first-time setup (cents): what is left each month, days of freedom, when the goal is reached
    and the step that brings it closer. `to30` is how many months of setting aside what is left it takes to have 30 days put aside. */
function firstLook(income, spend, saved, target, fromYm) {
  const free = income - spend, pace = Math.max(0, free), days = runwayDays(saved, spend);
  const months = target > 0 ? monthsToTarget(target, saved, pace) : null;
  return { free, days, months, far: months !== null && months > 120,
    arrival: target > 0 && months !== null ? arrivalMonth(target, saved, pace, fromYm) : null,
    covered: target > 0 && saved >= target,
    lever: target > 0 ? lever(target, saved, pace) : null,
    in12: target > saved ? Math.ceil((target - saved) / 12) : 0,
    to30: days !== null && days < 30 && pace > 0 ? Math.ceil((spend - saved) / pace) : null };
}

/** What goes out in a month: the highest of the three figures the account can have, so a month that is only half recorded never makes the money
    look like it lasts longer than it does.
      'actual'   the average spending of the last complete months that have any (up to three)
      'plan'     this month's planned fixed costs
      'estimate' what the person said goes out in a month: the household's (user.spend), or the company's in this currency (company.spend)
    basis is null, and amount 0, when there is none of them yet. */
function monthlyBurn(state, today, currency) {
  const nowYm = ymOf(today), months = [];
  for (let k = 1; k <= 3; k++) { const s = monthSummary(state, addMonths(nowYm, -k), currency); if (s.expenses > 0) months.push(s.expenses); }
  const found = [['actual', months.length ? Math.round(sum(months) / months.length) : 0], ['plan', planTotals(state, nowYm).expenses],
    ['estimate', state.scope === 'business' ? (((state.company || {}).spend || {})[currency] || 0) : ((state.user || {}).spend || 0)]].sort((a, b) => b[1] - a[1])[0];
  return found[1] > 0 ? { amount: found[1], basis: found[0], months: months.length } : { amount: 0, basis: null, months: 0 };
}
/** What is put aside: the money in this side's savings accounts in this currency, or what is saved in goals and funds (the company's reserves)
    when that is more. A goal's money sits in an account, so when the accounts say less it is their balances that are behind, not the goals.
    2026-10-09 (owner: "shouldn't the months of runway of the household and the company, the days of freedom, be counted from the savings?"):
    only savings. Before, every account but the cards counted, so the month's money in a checking account (the salary that has just come in, the
    rent about to go out) made the days jump on pay day and fall back as the bills were paid, though nothing had been put aside.
    upTo (a date) gives the figure as it was at the end of that day. Investments are not counted: they are not money at hand. */
function cushion(state, currency, upTo) {
  const accts = state.accounts.filter(a => (a.scope === 'business') === (state.scope === 'business') && a.currency === currency && a.type === 'savings');
  const inAccounts = Math.max(0, sum(accts.map(a => accountBalance(state, a.id, upTo))));
  const inGoals = Math.max(0, sum(state.goals.filter(g => g.status !== 'archived').map(g => goalSaved(state, g.id, upTo ? ymOf(upTo) : null))));
  return inAccounts >= inGoals ? { amount: inAccounts, basis: 'accounts' } : { amount: inGoals, basis: 'goals' };
}
/** Days of freedom today: how long what is put aside lasts at the pace money goes out.
    delta: the change since the last day of the month before, at today's pace, so only what was put aside or taken out moves it (null when nothing was put aside then).
    next: the next mark ahead and what is missing to reach it. The marks are reference points for the picture, not advice. */
const RUNWAY_MARKS = [30, 90, 180, 365];
function runway(state, today, currency) {
  const burn = monthlyBurn(state, today, currency), c = cushion(state, currency), days = runwayDays(c.amount, burn.amount);
  if (days === null) return { days: null, burn, cushion: c, delta: null, next: null };
  const before = cushion(state, currency, addDays(ymOf(today) + '-01', -1)), mark = RUNWAY_MARKS.find(m => m > days);
  return { days, burn, cushion: c, delta: before.amount > 0 ? days - runwayDays(before.amount, burn.amount) : null,
    next: mark ? { days: mark, missing: Math.max(0, Math.ceil(mark * burn.amount / 30) - c.amount) } : null };
}

/** When an active goal with a target is reached.
      by 'plan': the plan itself gets there, in that month.
      by 'pace': the plan ends before the target; the date is the one reached by keeping the amount of the plan's last planned month (pace).
    late: months after the goal's own date (negative = before it; null without a date).
    null when the goal is reached, is a fund, is not active, has nothing planned ahead, or is more than 50 years away. */
function goalArrival(state, goal, today) {
  if (goal.status !== 'active') return null;
  const st = goalStatus(state, goal, today), nowYm = ymOf(today);
  if (st.target === null || st.state === 'reached') return null;
  let ym = st.projected, by = 'plan', pace = null;
  if (!ym) {
    let last = null;
    for (const y of Object.keys(goal.plan).sort()) goal.plan[y].forEach((v, i) => { const m = y + '-' + String(i + 1).padStart(2, '0'); if (m >= nowYm && v > 0) { last = m; pace = v; } });
    if (!last) return null;
    const n = Math.ceil((st.target - st.planTotal) / pace);
    if (n > 600) return null;
    ym = addMonths(last, n); by = 'pace';
  }
  return { ym, by, pace, months: monthDiff(ym, nowYm) + 1, late: goal.deadline ? monthDiff(ym, goal.deadline) : null };
}
