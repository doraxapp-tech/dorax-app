/* Dorax Finance — calculations: credit card invoices. */
// ---------- credit cards ----------
// A card is one bill: its invoice. What is charged to the card is not a bill of its own, so it needs no due day.
const onCard = (state, line) => { const a = state.accounts.find(x => x.id === line.accountId); return !!a && a.type === 'credit'; };
// 2026-10-08 (owner: "fix the cards' due date, it must let me set the month: I put day 2 and I get late notices because it assumes October 2, but it is
// due now on November 2"). A card keeps, with its day, the month of the first invoice the person gave (dueFrom): a card set up on the 8th with day 2
// is next due on the 2nd of the following month, and the invoice of the 2nd already gone is not asked for. From then on it is one invoice a month.
/** The month of a card's next invoice from its day: this month while the day is still to come, else the next one. */
const cardFromYm = (day, today) => isoDate(ymOf(today), day) >= today ? ymOf(today) : addMonths(ymOf(today), 1);
/** The date a card's next invoice is due, on or after today and never before the first invoice the person gave. '' with no day. */
function cardNextDue(a, today) {
  if (!a || !a.dueDay) return '';
  const ym = a.dueFrom && a.dueFrom > ymOf(today) ? a.dueFrom : ymOf(today), d = isoDate(ym, a.dueDay);
  return d >= today ? d : isoDate(addMonths(ym, 1), a.dueDay);
}
/** Cards given a day before the month was kept get it once, from their next due date (app/session.js, when an account is opened). */
function anchorCards(state, today) { let n = 0; for (const a of state.accounts) if (a.type === 'credit' && a.dueDay && !a.dueFrom) { a.dueFrom = cardFromYm(a.dueDay, today); n++; } return n; }
/** The invoice of every card that has a due day, for this month and the next, from the first invoice the person gave. The first of them carries
    what the card owes today when the card has transactions; otherwise, and for the one after it, it is an estimate: what the plan charged to the card
    the month before. Paid = a transfer into the card that month. */
function cardInvoices(state, today, currency) {
  const nowYm = ymOf(today), out = [];
  for (const a of state.accounts) {
    if (a.type !== 'credit' || (a.scope === 'business') !== (state.scope === 'business') || a.currency !== currency || !a.dueDay) continue;
    const hasTx = state.transactions.some(t => t.accountId === a.id); let first = true;
    for (const ym of [nowYm, addMonths(nowYm, 1)]) {
      if (a.dueFrom && ym < a.dueFrom) continue;      // before the first invoice the person gave: nothing is asked for
      const date = isoDate(ym, a.dueDay), prevYm = addMonths(ym, -1);
      const paid = state.transactions.some(t => t.type === 'transfer' && counts(t) && ymOf(t.date) === ym && ((t.accountId === a.id && t.amount > 0) || (t.transferAccountId === a.id && t.accountId !== a.id && t.amount < 0)));
      const planned = sum(state.plan.lines.filter(l => l.accountId === a.id).map(l => planValue(state, l, prevYm)));
      // the installments still to come that fall before this invoice (core/installments.js): the first invoice already carries those charged until today
      const ahead = first && hasTx ? 0 : sum(state.transactions.filter(t => t.inst && t.accountId === a.id && counts(t) && t.date > today && t.date < date).map(t => -t.amount));
      const amount = (hasTx ? (first ? Math.max(0, -accountBalance(state, a.id, today)) : planned) : planned) + ahead;
      out.push({ accountId: a.id, name: a.name, ym, date, days: dayDiff(date, today), paid, amount, estimate: !hasTx || !first }); first = false;
    }
  }
  return out;
}
