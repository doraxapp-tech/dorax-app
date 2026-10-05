/* Dorax Finance — calculations: the month (income, spending, left over), totals by category, balances, shares. */
// ---------- reporting ----------
// Household figures only ever include personal accounts. Company (PJ) accounts are kept for statement export and never mixed in.
function counts(t) { return t.status !== 'ignored'; }
function allocations(t) {
  if (t.splits && t.splits.length) return t.splits.map(s => ({ categoryId: s.categoryId, subcategoryId: s.subcategoryId || null, amount: s.amount }));
  return [{ categoryId: t.categoryId, subcategoryId: t.subcategoryId || null, amount: t.amount }];
}
function inScope(state, t, ym, currency) {
  const acct = state.accounts.find(a => a.id === t.accountId);
  return acct && acct.scope !== 'business' && acct.currency === currency && counts(t) && (!ym || ymOf(t.date) === ym);
}
/** Income, expenses, what is left over (income minus spending) and its share of income, for a month. Transfers and adjustments never count as spending.
    `saved` is NOT money put into goals: that is the sum of goal movements. upTo (a date) limits the month to its first days. */
function monthSummary(state, ym, currency, upTo) {
  let income = 0, expenses = 0, transfers = 0, n = 0;
  for (const t of state.transactions) {
    if (!inScope(state, t, ym, currency) || (upTo && t.date > upTo)) continue;
    n++;
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expenses += -t.amount;
    else if (t.type === 'transfer' && t.amount < 0) transfers += -t.amount;
  }
  const saved = income - expenses;
  // Zero-income months have no meaningful rate: return null rather than dividing by zero.
  const rate = income > 0 ? Math.round(saved * 1000 / income) / 10 : null;
  return { income, expenses, saved, rate, transfers, count: n };
}
/** Spending of a month by category, by subcategory, and by "line": the subcategory when there is one, the category when there is none, so
    money spent under a category without a subcategory is still listed (before v39 it was missing from the largest lines of the report).
    upTo (a date) limits the month to its first days. */
function categoryTotals(state, ym, currency, upTo) {
  const byCat = {}, bySub = {}, incomeBySub = {}, byLine = {};
  for (const t of state.transactions) {
    if (!inScope(state, t, ym, currency) || (upTo && t.date > upTo)) continue;
    if (t.type === 'income') { if (t.subcategoryId) incomeBySub[t.subcategoryId] = (incomeBySub[t.subcategoryId] || 0) + t.amount; continue; }
    if (t.type !== 'expense') continue;
    for (const a of allocations(t)) {
      const c = a.categoryId || 'other';
      byCat[c] = (byCat[c] || 0) - a.amount;
      if (a.subcategoryId) bySub[a.subcategoryId] = (bySub[a.subcategoryId] || 0) - a.amount;
      const k = a.subcategoryId || c; byLine[k] = (byLine[k] || 0) - a.amount;
    }
  }
  return { byCat, bySub, incomeBySub, byLine };
}
function accountBalance(state, accountId, upTo) {
  const acct = state.accounts.find(a => a.id === accountId);
  let bal = acct.opening;
  for (const t of state.transactions) if (t.accountId === accountId && counts(t) && (!upTo || t.date <= upTo)) bal += t.amount;
  return bal;
}

const sum = xs => xs.reduce((a, b) => a + (b || 0), 0);
/** Whole-number percentages of `total`, one per value. When the values add up to the total the shares add up to exactly 100 (largest-remainder
    method): each share is its exact figure rounded down or up, so none is ever off by a whole point. Integer arithmetic only.
    Before v39 the largest part took whatever the rounding of the others left, which could show 61% for a part that was 61,96%. */
function wholeShares(values, total) {
  if (!(total > 0)) return values.map(() => 0);
  if (sum(values) !== total || values.some(v => v < 0)) return values.map(v => Math.round(v * 100 / total));
  const out = values.map(v => Math.floor(v * 100 / total)), rest = values.map((v, i) => [(v * 100) % total, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0, left = 100 - sum(out); k < left; k++) out[rest[k][1]]++;
  return out;
}
