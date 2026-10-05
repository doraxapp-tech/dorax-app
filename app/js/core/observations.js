/* Dorax Finance — calculations: the factual sentences of the report and the plan alerts. */
// ---------- factual observations & alerts (data-driven statements, never advice) ----------
function observations(state, ym, currency, today, fmt, catName) {
  // A month in progress is compared with the same days of the month before, never with the whole month (the dashboard's rule since v15;
  // before v39 the report compared, say, two days of October with all of September and read "92,9% less").
  const t = fmt.t, out = [], cur = monthSummary(state, ym, currency), prevYm = addMonths(ym, -1), open = !!today && ym === ymOf(today), upTo = open ? isoDate(prevYm, +today.slice(8)) : null, prev = monthSummary(state, prevYm, currency, upTo);
  const a = categoryTotals(state, ym, currency), b = categoryTotals(state, prevYm, currency, upTo);
  const top = Object.entries(a.byLine).sort((x, y) => y[1] - x[1]).slice(0, 3).map(e => catName(e[0]));
  if (top.length === 3) out.push(t('Your largest expense lines this month were {a}, {b} and {c}.', { a: top[0], b: top[1], c: top[2] }));
  let biggest = null;
  for (const [id, v] of Object.entries(a.byLine)) {
    const p = b.byLine[id] || 0; if (p <= 0) continue;
    const diff = v - p, pct = Math.round(diff * 100 / p);
    if (Math.abs(diff) >= 3000 && Math.abs(pct) >= 10 && (!biggest || Math.abs(diff) > Math.abs(biggest.diff))) biggest = { id, diff, pct };
  }
  if (biggest) out.push(t(open ? (biggest.diff > 0 ? '{name} spending increased {pct}% compared with the same days of {month}.' : '{name} spending decreased {pct}% compared with the same days of {month}.')
    : (biggest.diff > 0 ? '{name} spending increased {pct}% compared with {month}.' : '{name} spending decreased {pct}% compared with {month}.'), { name: catName(biggest.id), pct: Math.abs(biggest.pct), month: fmt.month(prevYm) }));
  if (prev.count && cur.rate !== null && prev.rate !== null) out.push(t(open ? '{a}% of the income was left over (same days of {month}: {b}%).' : '{a}% of the income was left over ({month}: {b}%).', { a: fmt.num(cur.rate), b: fmt.num(prev.rate), month: fmt.month(prevYm) }));
  for (const p of planProgress(state, ym, currency)) if (p.status === 'over') out.push(t('{name} was {amount} above plan.', { name: p.name, amount: fmt.money(-p.remaining, currency) }));
  const pt = planTotals(state, ym);
  if (pt.expenses) out.push(t('Planned fixed costs were {a}; actual spending on those lines was {b}.', { a: fmt.money(pt.expenses, currency), b: fmt.money(sum(planProgress(state, ym, currency).map(p => p.spent)), currency) }));
  if (cur.transfers) out.push(t('{amount} moved between your own accounts and is not counted as spending.', { amount: fmt.money(cur.transfers, currency) }));
  if (cur.income === 0 && cur.count) out.push(t('No income has been recorded for this month yet, so no savings rate is shown.'));
  return out;
}
function planAlerts(state, ym, currency, today, fmt) {
  const t = fmt.t, out = [], prog = planProgress(state, ym, currency, today), current = ym === ymOf(today);
  for (const p of prog) {
    if (p.status === 'over') out.push({ level: 'crit', text: t('{name} is {amount} above plan.', { name: p.name, amount: fmt.money(-p.remaining, currency) }) });
    else if ((p.status === 'late' || p.status === 'unpaid') && !current && ym < ymOf(today)) out.push({ level: 'warn', text: t('No payment recorded for {name} (planned {amount}).', { name: p.name, amount: fmt.money(p.planned, currency) }) });
  }
  if (current) {
    const left = sum(prog.map(p => p.toPay));
    if (left) out.push({ level: 'info', text: t('{amount} of planned fixed costs is still to be paid this month.', { amount: fmt.money(left, currency) }) });
  }
  return out;
}
