/* Dorax Finance — calculations: a purchase on the card in installments (Sprint 2, owner, 2026-10-10: "do the sprints"; claude/open-gaps-funcionalidades-
   2026-10-10.md, item 4: "'I bought it in 10x' spreads the amount over the coming invoices and shows 'committed in the coming months'. 52% do not keep
   track of their installments (CNDL/SPC, Jan 2025) and the rivals already have it").
   A purchase in n installments is n expense rows on the card, one a month on the purchase's day (the last day of a shorter month), each carrying
   `inst: { g, i, n, total }` (the purchase it belongs to, which one it is, how many, and the whole amount). Being rows of their months, each one counts
   in its month's spending, limits and reports, and in the card's balance only once its day has come (core/reporting.js: accountBalance up to today);
   the card's next invoice adds the one that falls before it (core/cards.js). The cents that do not divide go on the first installment.
   All money in integer cents. The screens: features/installments. */
const INST_MAX = 24;
/** n amounts that add up to the total: equal, the remainder on the first. */
function instSplit(total, n) { const each = Math.floor(total / n), out = Array(n).fill(each); out[0] += total - each * n; return out; }
/** The day of each installment: the purchase's day, month after month; the month's last day when it is shorter. */
function instDates(date, n) {
  const [y, m, d] = date.split('-').map(Number), out = [];
  for (let i = 0; i < n; i++) { const ym = addMonths(`${y}-${String(m).padStart(2, '0')}`, i), last = +addDays(isoDate(addMonths(ym, 1), 1), -1).slice(8); out.push(isoDate(ym, Math.min(d, last))); }
  return out;
}
/** The rows of a purchase: the row as it was filled in, made n times. */
function instRows(base, n, newIdFn) {
  if (!(n > 1)) return [base];
  const g = newIdFn('ip'), amounts = instSplit(Math.abs(base.amount), n), dates = instDates(base.date, n), sign = base.amount < 0 ? -1 : 1;
  return amounts.map((a, i) => { const x = { ...base, id: i === 0 ? base.id : newIdFn('t'), date: dates[i], amount: sign * a, inst: { g, i: i + 1, n, total: Math.abs(base.amount) } };
    x.fingerprint = fingerprint(x.accountId, x.date, x.merchant, x.amount); return x; });
}
/** A purchase's rows, in order. */
const instGroup = (state, g) => state.transactions.filter(x => x.inst && x.inst.g === g).sort((a, b) => a.inst.i - b.inst.i);
/** What a card still has to come from installments, after today: month by month, each month with its rows. */
function instAhead(state, accountId, today) {
  const rows = state.transactions.filter(x => x.inst && x.accountId === accountId && counts(x) && x.date > today).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0), by = {};
  for (const x of rows) (by[ymOf(x.date)] = by[ymOf(x.date)] || []).push(x);
  const months = Object.keys(by).sort().map(ym => ({ ym, amount: sum(by[ym].map(x => -x.amount)), rows: by[ym] }));
  return { total: sum(months.map(m => m.amount)), months, purchases: new Set(rows.map(x => x.inst.g)).size };
}
