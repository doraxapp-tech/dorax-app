/* Dorax Finance — calculations: "what if…?". The sums of looking ahead (core/runway.js) with three changes tried on. Nothing is saved here. */
// ---------- what if…? ----------
// 2026-10-07 (owner: "a projection module: what happens if…, with the goal's date moving"). Three changes, all in cents:
//   less   spent less each month: it stops going out, and is put aside instead
//   more   earned more each month: put aside, with what goes out left as it is
//   once   put aside once, today (a bonus, the 13th salary)
// What they change: the month a goal is reached, and the days of freedom a year from now. The year from now assumes every month goes like this
// one: what the plan puts into goals and funds this month is put aside twelve times, and what goes out stays what it is today.
// No investment return is assumed anywhere.

/** Adds `extra` to every planned month of a goal from `nowYm` to its last planned month (this month alone when nothing is planned ahead), so the
    pace its date is carried by rises by `extra`. Changes the goal it is given. Returns the last month that was planned before, or null. */
function raiseGoalPlan(goal, nowYm, extra) {
  let last = null;
  for (const y of Object.keys(goal.plan).sort()) goal.plan[y].forEach((v, i) => { const m = y + '-' + String(i + 1).padStart(2, '0'); if (m >= nowYm && v > 0) last = m; });
  for (let ym = nowYm; ym <= (last || nowYm); ym = addMonths(ym, 1)) { const y = ym.slice(0, 4), i = +ym.slice(5, 7) - 1; goal.plan[y] = goal.plan[y] || Array(12).fill(0); goal.plan[y][i] = (goal.plan[y][i] || 0) + extra; }
  return last;
}
/** The goals a change can move the date of: active, with a target that is not reached yet. */
function whatIfGoals(state, today) { return state.goals.filter(g => g.status === 'active' && g.kind === 'goal' && g.target > 0 && goalSaved(state, g.id) < g.target); }

/** { extra, aside, burn, burnTo, year: { from, to } | null, goal: { id, name, from, to, reached, sooner } | null }
    year: days of freedom twelve months from now, as things are and with the change; null while nothing says what goes out in a month.
    goal: the month it is reached as things are (null = no date yet) and with the change; sooner = months gained (null when either has no date). */
function whatIf(state, today, currency, goalId, change) {
  const pos = v => { const n = Math.round(+v); return n > 0 ? n : 0; },      // a negative or unreadable change counts as nothing
     less = pos(change.less), more = pos(change.more), once = pos(change.once), extra = less + more;
  const nowYm = ymOf(today), r = runway(state, today, currency), burn = r.burn.amount, burnTo = Math.max(0, burn - less);
  const aside = sum(state.goals.filter(g => g.status === 'active').map(g => goalPlan(g, nowYm)));
  const out = { extra, once, aside, burn, burnTo, goal: null,
    year: burn > 0 ? { from: runwayDays(r.cushion.amount + 12 * aside, burn), to: burnTo > 0 ? runwayDays(r.cushion.amount + once + 12 * (aside + extra), burnTo) : null } : null };
  const g = whatIfGoals(state, today).find(x => x.id === goalId);
  if (g) {
    const st = goalStatus(state, g, today), a0 = goalArrival(state, g, today), reached = st.saved + once >= st.target;
    const g2 = { ...g, plan: Object.fromEntries(Object.entries(g.plan).map(([y, a]) => [y, a.slice()])) };
    if (extra) raiseGoalPlan(g2, nowYm, extra);
    // the amount put aside once is money already in the goal, like a starting balance: it is not this month's planned contribution
    const s2 = { ...state, goals: state.goals.map(x => x === g ? g2 : x), goalMoves: once ? state.goalMoves.concat({ id: 'whatif', goalId: g.id, date: today, amount: once, start: true }) : state.goalMoves };
    const a1 = reached ? null : goalArrival(s2, g2, today), to = reached ? nowYm : a1 ? a1.ym : null;
    out.goal = { id: g.id, name: g.name, target: st.target, remaining: st.remaining, from: a0 ? a0.ym : null, to, reached, sooner: a0 && to ? monthDiff(a0.ym, to) : null };
  }
  return out;
}
