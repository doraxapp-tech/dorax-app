/* Dorax Finance — calculations: credit card invoices. */
// ---------- credit cards ----------
// A card is one bill: its invoice. What is charged to the card is not a bill of its own, so it needs no due day.
const onCard = (state, line) => { const a = state.accounts.find(x => x.id === line.accountId); return !!a && a.type === 'credit'; };
/** The invoice of every card that has a due day, for this month and the next. The amount is what the card owes today when the card has
    transactions; otherwise it is an estimate: what the plan charged to the card the month before. Paid = a transfer into the card that month. */
function cardInvoices(state, today, currency) {
  const nowYm = ymOf(today), out = [];
  for (const a of state.accounts) {
    if (a.type !== 'credit' || a.scope === 'business' || a.currency !== currency || !a.dueDay) continue;
    const hasTx = state.transactions.some(t => t.accountId === a.id);
    for (const ym of [nowYm, addMonths(nowYm, 1)]) {
      const date = isoDate(ym, a.dueDay), prevYm = addMonths(ym, -1);
      const paid = state.transactions.some(t => t.type === 'transfer' && counts(t) && ymOf(t.date) === ym && ((t.accountId === a.id && t.amount > 0) || (t.transferAccountId === a.id && t.accountId !== a.id && t.amount < 0)));
      const planned = sum(state.plan.lines.filter(l => l.accountId === a.id).map(l => planValue(state, l, prevYm)));
      const amount = hasTx ? (ym === nowYm ? Math.max(0, -accountBalance(state, a.id, today)) : planned) : planned;
      out.push({ accountId: a.id, name: a.name, ym, date, days: dayDiff(date, today), paid, amount, estimate: !hasTx || ym !== nowYm });
    }
  }
  return out;
}
