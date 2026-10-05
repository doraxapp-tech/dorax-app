/* Dorax Finance — calculations: savings goals and funds. */
// ---------- savings goals ----------
// A goal has a target (and optionally a deadline); a fund is an open-ended envelope. Both carry a monthly plan per year and are filled by
// recorded movements (contributions > 0, withdrawals < 0). "Saved" is always the sum of movements, never a typed-in number.
const monthDiff = (a, b) => (+a.slice(0, 4) - +b.slice(0, 4)) * 12 + (+a.slice(5, 7) - +b.slice(5, 7));
const goalLive = g => g.status === 'active';          // paused, completed and archived goals take no money from the plan
/** Every year the plan covers: income, goals and fixed costs share one list. */
function goalYears(state) { return [...new Set([...Object.keys(state.pay || {}), ...state.goals.flatMap(g => Object.keys(g.plan)), ...state.plan.lines.flatMap(l => Object.keys(l.plan))])].map(Number).sort((a, b) => a - b); }
/** A year nobody has planned yet: no goal plan and no fixed costs. */
function yearEmpty(state, year) { return state.goals.every(g => !sum(g.plan[year] || [])) && !yearPlanned(state, year); }
function goalPlan(goal, ym) { const a = goal.plan[ym.slice(0, 4)]; return a ? (a[+ym.slice(5, 7) - 1] || 0) : 0; }
function goalPlannedTo(goal, ym) { let total = 0; for (const y in goal.plan) goal.plan[y].forEach((v, i) => { if (y + '-' + String(i + 1).padStart(2, '0') <= ym) total += v || 0; }); return total; }
function goalSaved(state, goalId, upToYm) { let total = 0; for (const m of state.goalMoves) if (m.goalId === goalId && (!upToYm || ymOf(m.date) <= upToYm)) total += m.amount; return total; }
/** A starting balance is money that was already saved before the goal was added. It counts in what is saved, never as a contribution of the month it was typed in:
    it did not come out of that month's income. Marked with start: true; older data carries the app's own note instead. */
const isStartMove = m => !!(m.start || (m.k && m.k.note === 'Starting balance'));
function goalMonth(state, goalId, ym) { let total = 0; for (const m of state.goalMoves) if (m.goalId === goalId && !isStartMove(m) && ymOf(m.date) === ym) total += m.amount; return total; }
/** What is left of the income routed to savings after every live goal's plan (the "queda" row of the sheet). */
function allocRemainder(state, year) {
  return Array.from({ length: 12 }, (_, m) => sum(payRows(state, year, 'savings').map(r => r.values[m] || 0)) - sum(state.goals.filter(goalLive).map(g => (g.plan[year] || [])[m] || 0)));
}
/** One month's hand-out of the savings payment: plan and what has already been recorded, per goal. */
function distribution(state, ym) {
  const rows = state.goals.filter(goalLive).map(g => { const planned = goalPlan(g, ym), done = goalMonth(state, g.id, ym); return { goal: g, planned, done, pending: Math.max(0, planned - done) }; });
  const income = payTotal(state, ym, 'savings'), planned = sum(rows.map(r => r.planned)), done = sum(rows.map(r => r.done));
  return { income, rows, planned, done, pending: sum(rows.map(r => r.pending)), remainder: income - planned };
}
/** Facts about one goal. state: reached | nomoves | behind | ahead | ontrack. Projection walks the remaining plan month by month. */
function goalStatus(state, goal, today) {
  const nowYm = ymOf(today), saved = goalSaved(state, goal.id), planNow = goalPlan(goal, nowYm), doneNow = goalMonth(state, goal.id, nowYm);
  // The current month is still open: what is not yet set aside this month does not count as "behind" until the month ends.
  // Ahead or behind compares what was put in against the plan. Money that was already saved before the goal was added (a starting balance) is in
  // `saved` but is no contribution, so it is left out here: before v39 a goal with R$ 12.500 already saved read "R$ 12.500 ahead of the plan", and
  // stayed "ahead" however many planned months were then missed.
  const started = sum(state.goalMoves.filter(m => m.goalId === goal.id && isStartMove(m)).map(m => m.amount));
  const plannedToDate = goalPlannedTo(goal, addMonths(nowYm, -1)) + Math.max(0, Math.min(planNow, doneNow)), diff = saved - started - plannedToDate;
  const target = goal.kind === 'goal' && goal.target > 0 ? goal.target : null, remaining = target === null ? null : Math.max(0, target - saved);
  const hasMoves = state.goalMoves.some(m => m.goalId === goal.id);
  let projected = null, planTotal = saved;
  const future = [];
  for (const y of Object.keys(goal.plan).sort()) goal.plan[y].forEach((v, i) => { const ym = y + '-' + String(i + 1).padStart(2, '0'); if (ym >= nowYm && v) future.push([ym, ym === nowYm ? Math.max(0, v - goalMonth(state, goal.id, ym)) : v]); });
  for (const [ym, v] of future) { planTotal += v; if (target !== null && projected === null && planTotal >= target) projected = ym; }
  const monthsLeft = goal.deadline ? monthDiff(goal.deadline, nowYm) + 1 : null;
  const required = target !== null && remaining > 0 && monthsLeft !== null && monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null;
  const st = target !== null && saved >= target ? 'reached' : !hasMoves ? 'nomoves' : diff < 0 ? 'behind' : diff > 0 ? 'ahead' : 'ontrack';
  return { saved, plannedToDate, diff, target, remaining, pct: target ? Math.min(100, Math.round(saved * 1000 / target) / 10) : null, projected, planTotal,
    unplanned: target !== null ? Math.max(0, target - planTotal) : 0, monthsLeft, required, overdue: monthsLeft !== null && monthsLeft <= 0 && target !== null && saved < target, state: st, thisMonth: goalPlan(goal, nowYm) };
}
/** Spreads a monthly amount over the plan from `from` to `to` (inclusive), creating years as needed. Months outside the range are left as they are. */
function setGoalPlan(goal, from, to, monthly) {
  for (let ym = from; ym <= to; ym = addMonths(ym, 1)) { const y = ym.slice(0, 4); goal.plan[y] = goal.plan[y] || Array(12).fill(0); goal.plan[y][+ym.slice(5, 7) - 1] = monthly; }
}
