/* Dorax Finance — calculations: the Journey out of debt.
   Owner, 2026-10-10: "add a Journey button to the summary, with something like the picture (a streak, the days of the week, a progress bar) and
   other relevant information. The main goal is to run sprints to get out of debt, with reminders, to answer the question 'How do I get out of
   debt?'". He chose: the person marks each day themselves; the debts are the ones the person writes plus the credit cards already in the app; a
   sprint lasts 7, 14 or 30 days, as the person chooses, with an amount to pay.

   A book keeps its own journey (the household's, and each company book's: core/books.js, BOOK_PARTS):
     debts:   [{ id, name, owed, rate, min, due, since }]  what the person owes, as they wrote it: owed in cents when written, rate in % a month
              (optional), min the monthly payment in cents (optional), due the day of the month it is due (optional), in the order they chose
     pays:    [{ id, debtId, date, amount }]                 payments recorded against a written debt
     checks:  { 'YYYY-MM-DD': true }                         the days the person marked as "no new debt"
     sprint:  { id, start, days, target } | null             the sprint running: from its first day, for 7, 14 or 30 days, to pay target cents
     sprints: [{ id, start, days, target, paid }]            the sprints that ended, newest last
   Nothing is estimated as if it were known: no interest is added to what the person wrote, and a card counts what it owes today. The date out of
   debt is arithmetic on the person's own figures, said as such. */
const journeyEmpty = () => ({ debts: [], pays: [], checks: {}, sprint: null, sprints: [] });
/** The book's journey as it is, without creating one (a view reads; only an action writes). */
const journeyOf = book => book.journey || journeyEmpty();

/** What a written debt still owes: what was owed when written, minus the payments recorded against it. */
const debtPaid = (j, d, from, to) => sum(j.pays.filter(p => p.debtId === d.id && (!from || p.date >= from) && (!to || p.date <= to)).map(p => p.amount));
const debtLeft = (j, d) => Math.max(0, d.owed - debtPaid(j, d));

/** The credit cards of this book that owe money today, read from the app (never written in the journey): what each owes, its next due date. */
function journeyCards(book, today, cur) {
  const inv = cardInvoices(book, today, cur).filter(x => x.ym === ymOf(today) || !x.paid);
  return book.accounts.filter(a => a.type === 'credit' && (a.scope === 'business') === (book.scope === 'business') && a.currency === cur)
    .map(a => { const owed = Math.max(0, -accountBalance(book, a.id, today)), next = inv.find(x => x.accountId === a.id && !x.paid); return { id: a.id, name: a.name, institution: a.institution, owed, date: next ? next.date : null, days: next ? next.days : null }; })
    .filter(c => c.owed > 0);
}
/** A card's payments between two days: the money that came into the card (the card's side of a payment). */
const cardPaid = (book, id, from, to) => sum(book.transactions.filter(x => x.accountId === id && x.type === 'transfer' && x.amount > 0 && counts(x) && x.date >= from && x.date <= to).map(x => x.amount));

/** Everything owed, in one list: the written debts in the person's order, then the cards. */
function journeyDebts(book, today, cur) {
  const j = journeyOf(book);
  return [...j.debts.map(d => ({ kind: 'debt', id: d.id, name: d.name, left: debtLeft(j, d), owed: d.owed, rate: d.rate, min: d.min, due: d.due })),
    ...journeyCards(book, today, cur).map(c => ({ kind: 'card', id: c.id, name: c.name, institution: c.institution, left: c.owed, owed: c.owed, rate: null, min: null, date: c.date, days: c.days }))];
}

// ---------- the streak: the days marked in a row ----------
/** The days marked in a row up to today; a today not marked yet does not break it (the day is not over), so it counts up to yesterday. */
function journeyStreak(j, today) {
  let d = j.checks[today] ? today : addDays(today, -1), n = 0;
  while (j.checks[d]) { n++; d = addDays(d, -1); }
  return n;
}
/** The longest run of marked days ever. */
function journeyBest(j) {
  const days = Object.keys(j.checks).filter(d => j.checks[d]).sort(); let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev && dayDiff(d, prev) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
/** The week of a day, Monday first, as seven dates. */
function journeyWeek(today) {
  const dow = (new Date(Date.parse(today + 'T00:00:00Z')).getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - dow));
}

// ---------- the sprint ----------
/** What was paid between two days: the payments against written debts and the money that went into the cards. */
const journeyPaid = (book, today, cur, from, to) => { const j = journeyOf(book); return sum(j.debts.map(d => debtPaid(j, d, from, to))) + sum(book.accounts.filter(a => a.type === 'credit' && a.currency === cur && (a.scope === 'business') === (book.scope === 'business')).map(a => cardPaid(book, a.id, from, to))); };
/** The running sprint, as it stands today: its last day, which day it is on, what was paid, how much is left of the amount and of the days.
    done: its last day has passed (the person is asked to close it and start the next). */
function sprintNow(book, today, cur) {
  const s = journeyOf(book).sprint; if (!s) return null;
  const end = addDays(s.start, s.days - 1), to = today < end ? today : end, paid = journeyPaid(book, today, cur, s.start, to);
  return { ...s, end, day: Math.min(s.days, dayDiff(today, s.start) + 1), daysLeft: Math.max(0, dayDiff(end, today)), paid, missing: Math.max(0, s.target - paid), pct: s.target ? Math.min(100, Math.round(paid * 100 / s.target)) : 0, done: today > end };
}
/** The pace a month: the running sprint's amount spread over 30 days, or, with no sprint, the monthly payments the person wrote. */
function journeyPace(book, today, cur) {
  const s = journeyOf(book).sprint;
  if (s && s.target > 0) return { amount: Math.round(s.target * 30 / s.days), from: 'sprint' };
  const mins = sum(journeyOf(book).debts.map(d => d.min || 0));
  return mins > 0 ? { amount: mins, from: 'min' } : null;
}

// ---------- out of debt: when, at a pace ----------
/** Months until everything is paid at `monthly` a month, from this month on. Each month each debt grows by its own interest (when the person gave
    one), gets its monthly payment, and what is left of the month's money goes to the debts in the order of the list. Returns { months, interest }
    (interest in cents along the way), or { stuck: true, interest } when the money does not cover the interest (nothing ever goes down), or null
    with nothing owed. Arithmetic on the person's figures: no rate is assumed for a debt that has none, and the cards count none. */
function payoffPlan(list, monthly) {
  const ds = list.filter(d => d.left > 0).map(d => ({ b: d.left, r: (d.rate || 0) / 100, m: d.min || 0 }));
  if (!ds.length) return null;
  let months = 0, interest = 0;
  while (ds.some(d => d.b > 0)) {
    const before = sum(ds.map(d => d.b)); let cash = monthly, grew = 0;
    for (const d of ds) if (d.b > 0) { const i = Math.round(d.b * d.r); d.b += i; grew += i; }
    for (const d of ds) if (d.b > 0 && cash > 0) { const p = Math.min(d.b, d.m, cash); d.b -= p; cash -= p; }
    for (const d of ds) if (d.b > 0 && cash > 0) { const p = Math.min(d.b, cash); d.b -= p; cash -= p; }
    interest += grew; months++;
    if (sum(ds.map(d => d.b)) >= before || months > 600) return { stuck: true, interest: grew };
  }
  return { months, interest };
}
/** The month the last debt is paid: this month counts as the first. */
const payoffMonth = (today, months) => addMonths(ymOf(today), months - 1);

// ---------- reminders (core/reminders.js) ----------
/** A written debt's next due date: this month's, unless a payment was recorded this month; then next month's. */
function debtNextDue(j, d, today) {
  if (!d.due) return null;
  const ym = ymOf(today), paidNow = j.pays.some(p => p.debtId === d.id && ymOf(p.date) === ym), m = paidNow ? addMonths(ym, 1) : ym, date = isoDate(m, d.due);
  return { ym: m, date, days: dayDiff(date, today) };
}
/** What the journey has to remind: yesterday to mark (while a sprint runs), a written debt's payment coming due, and a sprint ending or ended. */
function journeyReminders(book, today, cur, lead) {
  const j = book.journey, out = []; if (!j) return out;
  const s = sprintNow(book, today, cur), y = addDays(today, -1);
  if (s && y >= s.start && y <= s.end && !j.checks[y] && !j.checks[today]) out.push({ id: 'jmark:' + y, kind: 'jmark', when: 'today', level: 'info', date: y, streak: journeyStreak(j, addDays(y, -1)) });
  for (const d of j.debts) {
    const left = debtLeft(j, d), n = d.min && left > 0 ? debtNextDue(j, d, today) : null;
    if (!n || n.days > lead) continue;
    out.push({ id: 'debt:' + d.id + ':' + n.ym, kind: 'debt', when: n.days < 0 ? 'late' : n.days === 0 ? 'today' : 'soon', level: n.days < 0 ? 'crit' : n.days === 0 ? 'warn' : 'info', debtId: d.id, name: d.name, ym: n.ym, date: n.date, days: n.days, amount: Math.min(d.min, left) });
  }
  if (s && s.done) out.push({ id: 'sprint:' + s.id + ':end', kind: 'sprint', when: 'today', level: 'info', done: true, date: s.end, days: dayDiff(s.end, today), paid: s.paid, target: s.target });
  else if (s && s.daysLeft <= 1 && s.missing > 0) out.push({ id: 'sprint:' + s.id + ':' + s.daysLeft, kind: 'sprint', when: 'soon', level: 'info', done: false, date: s.end, days: s.daysLeft, amount: s.missing, target: s.target });
  return out;
}
