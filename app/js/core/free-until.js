/* Dorax Finance — calculations: what is free to spend until the next pay day.
   Owner, 2026-10-10, the first batch of "what more can help": the question people ask most is "how much can I spend until I get paid?" (53% do not
   reach the end of the month: Serasa Experian, June 2026). The answer is one figure and its daily share, worked out from what the account holds:

     what is in the spending accounts today (checking and cash, this side and currency)
     − the bills still to pay that are due before the next pay day (not those charged to a card: the card's invoice carries them)
     − the cards' invoices still to pay that are due before it
     − what the plan sets aside for goals this month and is not set aside yet
     = free until the next pay day;   ÷ the days until then = per day.

   The next pay day is the nearest day of a pay line of the Plan (core/plan.js: payGroups) after today. With none, the figure runs to the end of the
   month and says so. Nothing is assumed: no income that has not come, no return on anything, and savings and investments are not money to spend.
   All money is integer cents. null when the side has no checking or cash account in this currency. */
function nextPayDay(state, today) {
  const ym = ymOf(today); let best = null;
  for (const m of [ym, addMonths(ym, 1)]) for (const g of payGroups(state, m)) {
    if (!g.day || g.amount <= 0) continue;
    const date = isoDate(m, g.day); if (date > today && (!best || date < best.date)) best = { date, name: g.name, amount: g.amount };
  }
  return best;
}
function freeUntil(state, today, currency) {
  const home = state.scope === 'business', spend = state.accounts.filter(a => (a.scope === 'business') === home && a.currency === currency && (a.type === 'checking' || a.type === 'cash'));
  if (!spend.length) return null;
  const pay = nextPayDay(state, today), ym = ymOf(today), last = addDays(isoDate(addMonths(ym, 1), 1), -1), until = pay ? pay.date : last > today ? last : addDays(today, 1);
  const cash = sum(spend.map(a => accountBalance(state, a.id, today)));
  // bills: those with a due day before the pay day, late ones included; one with no due day is this month's and could fall any day, so it counts
  const bills = upcomingBills(state, today, currency, 62).filter(p => !onCard(state, p) && (!p.dueDate || p.dueDate < until));
  const cards = cardInvoices(state, today, currency).filter(c => !c.paid && c.amount > 0 && c.date < until);
  const goals = state.goals.filter(g => g.status === 'active').map(g => ({ g, left: Math.max(0, goalPlan(g, ym) - goalMonth(state, g.id, ym)) })).filter(x => x.left > 0);
  const owed = { bills: sum(bills.map(p => p.toPay || p.planned)), cards: sum(cards.map(c => c.amount)), goals: sum(goals.map(x => x.left)) };
  const free = cash - owed.bills - owed.cards - owed.goals, days = Math.max(1, dayDiff(until, today));
  // a day's share in whole reais; under R$ 10 a day, with its cents, so a small positive figure never reads as nothing
  const share = free > 0 ? free / days : 0, perDay = share >= 1000 ? Math.floor(share / 100) * 100 : Math.floor(share);
  return { free, perDay, days, until, pay, cash, ...owed, nBills: bills.length, nCards: cards.length, nGoals: goals.length,
    billList: bills.map(p => ({ name: p.name, amount: p.toPay || p.planned, date: p.dueDate })), cardList: cards.map(c => ({ name: c.name, amount: c.amount, date: c.date })) };
}
