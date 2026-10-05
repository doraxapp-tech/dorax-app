/* Dorax Finance — calculations: fixed costs, income rows, planned against paid. */
// ---------- fixed costs ----------
// A line carries a monthly plan per year, like a goal. line.pay says how it is paid:
//   'fixed'    one payment a month, same amount   'variable' one payment a month, amount changes   'budget' several purchases across the month
// What was actually paid always comes from transactions categorised to the line, so a manual "mark as paid" and an imported statement are one source.
function planValue(state, line, ym) { const a = line.plan[ym.slice(0, 4)]; return a ? (a[+ym.slice(5, 7) - 1] || 0) : 0; }
function yearPlanned(state, year) { return sum(state.plan.lines.map(l => sum(l.plan[year] || []))); }
/** Lines that belong in a year's grid: anything with a value that year, or still running when the year starts. */
function linesIn(state, year) { return state.plan.lines.filter(l => sum(l.plan[year] || []) > 0 || !l.end || l.end >= year + '-01'); }
/** Sets the monthly amount from `from` to December of the last year that exists, never past the line's end month. Earlier months are left alone. */
function setLinePlan(state, line, from, amount) {
  const last = Math.max(+from.slice(0, 4), ...goalYears(state)) + '-12', to = line.end && line.end < last ? line.end : last;
  for (let ym = from; ym <= to; ym = addMonths(ym, 1)) { const y = ym.slice(0, 4); line.plan[y] = line.plan[y] || Array(12).fill(0); line.plan[y][+ym.slice(5, 7) - 1] = amount; }
}
/** Ends a line: its last planned month is `ym`; every later month becomes zero. History and payments are kept. */
function endLine(line, ym) {
  line.end = ym || null;
  if (ym) for (const y in line.plan) line.plan[y] = line.plan[y].map((v, i) => y + '-' + String(i + 1).padStart(2, '0') > ym ? 0 : v);
}
/** Starts a year from the previous December: every running line and every income routed to fixed costs keeps its December amount. */
function startPlanYear(state, year) {
  const prev = year - 1; let n = 0;
  for (const l of state.plan.lines) {
    const dec = (l.plan[prev] || [])[11] || 0;
    if (!dec || (l.end && l.end < year + '-01')) continue;
    l.plan[year] = Array.from({ length: 12 }, (_, i) => !l.end || year + '-' + String(i + 1).padStart(2, '0') <= l.end ? dec : 0); n++;
  }
  state.pay[year] = state.pay[year] || [];
  for (const r of (state.pay[prev] || []).filter(r => r.to === 'fixed')) {
    const cur = state.pay[year].find(x => x.id === r.id), dec = r.values[11] || 0;
    if (!cur) state.pay[year].push({ ...r, values: Array(12).fill(dec) }); else if (!sum(cur.values)) cur.values = Array(12).fill(dec);
  }
  return n;
}
// ---------- income: one row per payment (e.g. two salary payments a month), each routed to fixed costs or to savings ----------
function payRows(state, year, to) { return ((state.pay || {})[year] || []).filter(r => !to || r.to === to); }
function payTotal(state, ym, to) { const m = +ym.slice(5) - 1; return sum(payRows(state, +ym.slice(0, 4), to).map(r => r.values[m] || 0)); }
/** Actual income for a payment row: its income category, in the first half (day 1-15) or second half of the month. half 0 = any day.
    Rows that cannot be told apart (same category, same half: one salary split between bills and savings) share what arrived in proportion to their plan. */
function payActual(state, row, ym, currency) {
  let total = 0;
  for (const t of state.transactions) {
    if (t.type !== 'income' || !inScope(state, t, ym, currency) || t.subcategoryId !== row.sub) continue;
    const first = +t.date.slice(8) <= 15;
    if (!row.half || (row.half === 1) === first) total += t.amount;
  }
  const m = +ym.slice(5) - 1, twins = payRows(state, +ym.slice(0, 4)).filter(r => r.sub === row.sub && (r.half || 0) === (row.half || 0)), i = twins.indexOf(row);
  if (twins.length < 2 || i < 0) return total;
  const all = sum(twins.map(r => r.values[m] || 0)); if (!all) return i === 0 ? total : 0;
  const upTo = k => Math.round(total * sum(twins.slice(0, k).map(r => r.values[m] || 0)) / all);   // cumulative rounding: the parts always add up to the total
  return upTo(i + 1) - upTo(i);
}
function planTotals(state, ym) {
  let expenses = 0;
  for (const l of state.plan.lines) expenses += planValue(state, l, ym);
  return { income: payTotal(state, ym, 'fixed'), expenses };
}
/** Household transactions (or the part of a split) that belong to a line, newest first. ym is optional. */
function linePayments(state, line, ym, currency) {
  const out = [];
  for (const t of state.transactions) {
    if (t.type !== 'expense' || !inScope(state, t, ym, currency)) continue;
    let amount = 0;
    for (const a of allocations(t)) if (line.subcategoryId ? a.subcategoryId === line.subcategoryId : (a.categoryId || 'other') === line.categoryId) amount -= a.amount;
    if (amount) out.push({ t, amount });
  }
  return out.sort((a, b) => a.t.date < b.t.date ? 1 : a.t.date > b.t.date ? -1 : 0);
}
function lineActual(line, totals) {
  return line.subcategoryId ? (totals.bySub[line.subcategoryId] || 0) : (totals.byCat[line.categoryId] || 0);
}
/** Planned vs actual for every line in a month.
    status: none | unpaid | late | paid | under | onplan | over. A bill (fixed or variable) is "paid" once it has a payment; a budget fills up.
    late = a bill without a payment whose due day has passed, or whose month has ended. Pass `today` to get it. */
function planProgress(state, ym, currency, today) {
  const totals = categoryTotals(state, ym, currency), nowYm = today ? ymOf(today) : null;
  return state.plan.lines.map(l => {
    const planned = planValue(state, l, ym), spent = lineActual(l, totals), bill = l.pay !== 'budget';
    const pct = planned > 0 ? Math.round(spent * 1000 / planned) / 10 : 0, dueDate = l.due ? isoDate(ym, l.due) : null;
    const late = bill && planned > 0 && spent === 0 && !!today && (ym < nowYm || (ym === nowYm && !!dueDate && dueDate < today));
    const status = spent === 0 ? (planned ? (late ? 'late' : 'unpaid') : 'none') : spent > planned ? 'over' : bill ? 'paid' : spent === planned ? 'onplan' : 'under';
    return { ...l, ym, planned, spent, remaining: planned - spent, pct, status, bill, dueDate, days: dueDate && today ? dayDiff(dueDate, today) : null,
      toPay: bill ? (spent === 0 ? planned : 0) : Math.max(0, planned - spent) };
  });
}
/** Bills still to pay: this month's (late ones included) and next month's that fall within `days`. Bills without a due day are listed for this month only. */
function upcomingBills(state, today, currency, days) {
  const nowYm = ymOf(today), out = [];
  for (const ym of [nowYm, addMonths(nowYm, 1)]) for (const p of planProgress(state, ym, currency, today)) {
    if (!p.bill || !p.planned || p.spent) continue;
    if (p.dueDate ? p.days <= days : ym === nowYm) out.push(p);
  }
  return out.sort((a, b) => (a.dueDate || '9') < (b.dueDate || '9') ? -1 : (a.dueDate || '9') > (b.dueDate || '9') ? 1 : b.planned - a.planned);
}
