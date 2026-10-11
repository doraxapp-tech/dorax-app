/* Dorax Finance — calculations: which reminders are due. */
// ---------- reminders ----------
// A reminder is never typed: it is read from the plan (a bill, its due day, whether it has a payment), from the company statements still to send,
// and from the month that just closed. opt: { bills, close, summary (what the person wants to hear about), lead (days before the due day), closeDay, askDue }.
// when: 'late' | 'today' | 'soon'. Bills without a due day cannot be timed, so they come as one item asking for the day.
function reminders(state, today, currency, opt) {
  const out = [], nowYm = ymOf(today), prevYm = addMonths(nowYm, -1), lead = opt.lead == null ? 3 : opt.lead;
  if (opt.bills) {
    const noDay = [];
    for (const ym of [nowYm, addMonths(nowYm, 1)]) for (const p of planProgress(state, ym, currency, today)) {
      if (!p.bill || !p.planned || p.spent) continue;
      if (!p.dueDate) { if (ym === nowYm && !onCard(state, p)) noDay.push(p); continue; }
      if (p.days > lead) continue;
      out.push({ id: 'bill:' + p.id + ':' + ym, kind: 'bill', when: p.days < 0 ? 'late' : p.days === 0 ? 'today' : 'soon', level: p.days < 0 ? 'crit' : p.days === 0 ? 'warn' : 'info',
        lineId: p.id, name: p.name, pay: p.pay, ym, date: p.dueDate, days: p.days, amount: p.planned });
    }
    for (const c of cardInvoices(state, today, currency)) if (!c.paid && c.amount > 0 && c.days <= lead)
      out.push({ id: 'card:' + c.accountId + ':' + c.ym, kind: 'card', when: c.days < 0 ? 'late' : c.days === 0 ? 'today' : 'soon', level: c.days < 0 ? 'crit' : c.days === 0 ? 'warn' : 'info', accountId: c.accountId, name: c.name, ym: c.ym, date: c.date, days: c.days, amount: c.amount, estimate: c.estimate });
    out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : b.amount - a.amount);
    // Last month: only when it was being followed (at least one bill has a payment), so a month nobody recorded does not turn into a pile.
    const prev = planProgress(state, prevYm, currency, today).filter(p => p.bill && p.planned && !onCard(state, p)), left = prev.filter(p => !p.spent);
    if (left.length && left.length < prev.length) out.push({ id: 'past:' + prevYm, kind: 'past', when: 'late', level: 'warn', ym: prevYm, lines: left.map(p => ({ id: p.id, name: p.name, amount: p.planned })), amount: sum(left.map(p => p.planned)) });
    if (noDay.length && opt.askDue !== false) out.push({ id: 'nodue:' + nowYm, kind: 'nodue', when: 'setup', level: 'info', ym: nowYm, lines: noDay.map(p => ({ id: p.id, name: p.name, amount: p.planned })), amount: sum(noDay.map(p => p.planned)) });
  }
  if (opt.pay) {      // pay day (core/payday.js): a payment whose day has come, with nothing recorded under it, unless the person said "I'll do it" this month.
    // It is one stage ("today"), so it is announced once: on its day, or on the first day the job sees it. Nothing is ever recorded by itself.
    const said = (state.user || {}).payAsk || {};
    for (const g of payDue(state, today, currency)) if (said[g.key] !== nowYm) out.push({ id: 'pay:' + g.key + ':' + nowYm, kind: 'pay', when: 'today', level: 'info', key: g.key, name: g.name, ym: nowYm, date: g.date, days: dayDiff(g.date, today), amount: g.amount });
  }
  if (opt.close) {
    const biz = state.accounts.filter(a => owesStatement(a, prevYm)), st = (state.closes || {})[prevYm] || {}, sent = biz.filter(a => st[a.id] === 'sent').length;
    if (biz.length && sent < biz.length) { const date = closeDue(prevYm, opt.closeDay), days = dayDiff(date, today); out.push({ id: 'close:' + prevYm, kind: 'close', when: days < 0 ? 'late' : days === 0 ? 'today' : 'soon', level: days < 0 ? 'crit' : days <= 3 ? 'warn' : 'info', ym: prevYm, date, days, sent, total: biz.length }); }
  }
  if (opt.goals) {      // savings: once the money for savings has arrived, or when the month is about to end, and the month's contributions are not all recorded
    const d = distribution(state, nowYm), year = +nowYm.slice(0, 4), arrived = sum(payRows(state, year, 'savings').map(r => payActual(state, r, nowYm, currency))), daysLeft = daysInMonth(nowYm) - +today.slice(8);
    if (d.pending > 0 && (arrived > 0 || daysLeft <= 7)) out.push({ id: 'handout:' + nowYm, kind: 'handout', when: arrived > 0 ? 'today' : 'soon', level: 'info', ym: nowYm, amount: d.pending, goals: d.rows.filter(r => r.pending > 0).length, arrived: arrived > 0, daysLeft });
  }
  if (opt.summary && +today.slice(8) <= 7) {
    const m = monthSummary(state, prevYm, currency);
    if (m.count) out.push({ id: 'summary:' + prevYm, kind: 'summary', when: 'soon', level: 'info', ym: prevYm, saved: m.saved, income: m.income, expenses: m.expenses });
  }
  // the journey out of debt (core/journey.js, owner 2026-10-10): yesterday to mark while a sprint runs, a debt's payment coming due, a sprint ending
  if (opt.journey) out.push(...journeyReminders(state, today, currency, lead));
  // spending limits at 80% and past them (core/budget-alerts.js, owner 2026-10-10)
  if (opt.budgets) out.push(...budgetReminders(state, today, currency));
  return out;
}
/** The household's reminders and, after them, the company's: its bills, card invoices and reserves, in each currency it keeps a plan in.
    A company reminder says which book it comes from (book, cur) and its id starts with that, so it never collides with a household one.
    The statements for the accountant and the month's summary are said once, by the household's side; pay day is the household's alone. */
function remindersAll(state, today, opt) {
  const gone = (state.user || {}).company === false;      // a company put away: neither its bills nor the statements its accounts owe are chased
  const out = reminders(state, today, BASE_CURRENCY, gone ? { ...opt, close: false } : opt);
  for (const b of companyBooks(state)) for (const r of reminders(b.book, today, b.cur, { ...opt, close: false, summary: false, pay: false })) out.push({ ...r, id: b.key + ':' + r.id, book: b.key, cur: b.cur });
  return out;
}
/** Bills whose reminder has not gone out yet: the due day is further away than the lead time. sendDate is the day the reminder is due. */
function reminderSchedule(state, today, currency, lead, days) {
  return upcomingBills(state, today, currency, days || 45).filter(p => p.dueDate && p.days > lead).map(p => ({ lineId: p.id, name: p.name, pay: p.pay, ym: p.ym, date: p.dueDate, days: p.days, amount: p.planned, sendDate: addDays(p.dueDate, -lead) }));
}
/** The same for both sides: the household's bills, then the company's, in the order their reminders go out. */
function reminderScheduleAll(state, today, lead, days) {
  const out = reminderSchedule(state, today, BASE_CURRENCY, lead, days);
  for (const b of companyBooks(state)) for (const x of reminderSchedule(b.book, today, b.cur, lead, days)) out.push({ ...x, book: b.key, cur: b.cur });
  return out.sort((a, b) => a.sendDate < b.sendDate ? -1 : a.sendDate > b.sendDate ? 1 : 0);
}
