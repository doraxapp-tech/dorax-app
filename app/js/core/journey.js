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
const journeyEmpty = () => ({ debts: [], pays: [], checks: {}, sprint: null, sprints: [], save52: null, nospend: null, ended: [] });      // the last three: the saving challenges (v227, below)
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

// ---------- saving challenges (v227, owner, 2026-10-14: "sigue con el 8": claude/open-gaps-funcionalidades-2026-10-10.md, item 8, "Desafíos de
// ahorro: '52 semanas' y 'días sin gastar', con la racha de la Jornada. Juego para quien no tiene deudas". He chose: they live in the Journey; the 52
// weeks in the classic way with a multiplier and the reverse order; the days without spending are marked by the person) ----------
// The household's journey only (a company's has none). Kept in the journey:
//   save52:  { id, goalId, start, step, reverse } | null   the 52 weeks running: week k (from start, 7 days each) puts aside step × k cents (reversed:
//            step × (53 − k)); its money is a goal (goalId, kept in a savings account like any goal's, planned week by week in the months they fall in),
//            so contributions, the success screen, the plan and what is free to spend need nothing of their own
//   nospend: { id, start, length } | null                  the days without spending running: 7, 14 or 30 days; a day counts when it is marked, and the
//            mark is the streak's own (checks): a day without spending adds no debt either, so the flame keeps one count
//   ended:   [{ kind: 's52', ...save52, saved, total, end } | { kind: 'ns', ...nospend, marked, end }]   the challenges that ended, newest last
const S52_STEPS = [100, 200, 500, 1000];      // R$ 1, 2, 5 or 10 a step: R$ 1.378, 2.756, 6.890 or 13.780 at the end
const s52Amount = (c, k) => c.step * (c.reverse ? 53 - k : k);
/** What weeks 1 to k add up to. */
const s52Upto = (c, k) => { k = Math.max(0, Math.min(52, k)); return c.step * (c.reverse ? 53 * k - k * (k + 1) / 2 : k * (k + 1) / 2); };
const s52Total = c => c.step * 1378;
/** Its last day: the seventh of week 52. */
const s52End = c => addDays(c.start, 52 * 7 - 1);
/** The months of the 52 weeks, each with what its weeks put aside (a week counts in the month it starts): its goal's plan. */
function s52Plan(c) {
  const plan = {};
  for (let k = 1; k <= 52; k++) { const ym = ymOf(addDays(c.start, (k - 1) * 7)), y = ym.slice(0, 4); plan[y] = plan[y] || Array(12).fill(0); plan[y][+ym.slice(5, 7) - 1] += s52Amount(c, k); }
  return plan;
}
/** The 52 weeks as they stand today, or null (none running, or its goal is gone): the week it is on (by the date), what is saved in its goal, the
    weeks it covers, what is still to put aside to be up to date (toGo), the week after, and whether it is done (all saved) or over (its days passed). */
function s52Now(book, today) {
  const c = journeyOf(book).save52; if (!c) return null;
  const g = (book.goals || []).find(x => x.id === c.goalId); if (!g) return null;
  const total = s52Total(c), saved = Math.max(0, goalSaved(book, g.id)), week = Math.floor(dayDiff(today, c.start) / 7) + 1, now = Math.min(52, Math.max(1, week));
  let covered = 0; while (covered < 52 && s52Upto(c, covered + 1) <= saved) covered++;
  return { ...c, goal: g, cur: goalCur(book, g), total, saved, week: now, covered, toGo: Math.max(0, s52Upto(c, now) - saved), thisWeek: s52Amount(c, now),
    next: now < 52 ? { amount: s52Amount(c, now + 1), date: addDays(c.start, now * 7) } : null, end: s52End(c), pct: Math.min(100, Math.round(saved * 100 / total)),
    done: saved >= total, over: today > s52End(c) };
}
/** The days without spending as they stand today, or null: its last day, which day it is on, the days marked so far (the streak's marks in its days). */
function nsNow(j, today) {
  const c = j.nospend; if (!c) return null;
  const end = addDays(c.start, c.length - 1), to = today < end ? today : end;
  let marked = 0; for (let d = c.start; d <= to; d = addDays(d, 1)) if (j.checks[d]) marked++;
  return { ...c, end, day: Math.min(c.length, dayDiff(today, c.start) + 1), daysLeft: Math.max(0, dayDiff(end, today)), marked, pct: Math.round(marked * 100 / c.length), done: today > end };
}
/** Whether a day falls in the running days without spending. */
const nsHas = (j, d) => !!(j.nospend && d >= j.nospend.start && d <= addDays(j.nospend.start, j.nospend.length - 1));
/** What was spent on a day outside the fixed costs (the plan's bills): the person decides whether the day counts, Dorax only says what it sees.
    [{ name, amount }], the largest first. */
function nsSpent(book, day, cur) {
  const bills = (book.plan.lines || []).filter(l => l.pay !== 'budget'), subs = new Set(bills.filter(l => l.subcategoryId).map(l => l.subcategoryId)), cats = new Set(bills.filter(l => !l.subcategoryId).map(l => l.categoryId));
  const out = [];
  for (const x of book.transactions) {
    if (x.type !== 'expense' || x.date !== day || !inScope(book, x, null, cur)) continue;
    const v = -sum(allocations(x).filter(a => !(a.subcategoryId && subs.has(a.subcategoryId)) && !cats.has(a.categoryId || 'other')).map(a => a.amount));
    if (v > 0) out.push({ name: x.merchant || x.description || '', amount: v });
  }
  return out.sort((a, b) => b.amount - a.amount);
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
/** What the journey has to remind: yesterday to mark (while a sprint or the days without spending run), a written debt's payment coming due, a
    sprint ending or ended; and the challenges (v227): each week of the 52 weeks what to put aside, while it is not put aside; the days without spending
    when they end. */
function journeyReminders(book, today, cur, lead) {
  const j = book.journey, out = []; if (!j) return out;
  const s = sprintNow(book, today, cur), y = addDays(today, -1), home = book.scope !== 'business', ns = home ? nsNow(j, today) : null, inNs = home && nsHas(j, y);
  if (((s && y >= s.start && y <= s.end) || inNs) && !j.checks[y] && !j.checks[today]) out.push({ id: 'jmark:' + y, kind: 'jmark', when: 'today', level: 'info', date: y, streak: journeyStreak(j, addDays(y, -1)), ...(inNs ? { ns: true } : {}) });
  const c = home ? s52Now(book, today) : null;
  if (c && !c.done && !c.over && c.toGo > 0) out.push({ id: 's52:' + c.id + ':' + c.week, kind: 's52', when: 'today', level: 'info', week: c.week, amount: c.toGo, cur: c.cur, behind: c.toGo > c.thisWeek });
  if (ns && ns.done) out.push({ id: 'ns:' + ns.id + ':end', kind: 'ns', when: 'today', level: 'info', date: ns.end, marked: ns.marked, length: ns.length });
  for (const d of j.debts) {
    const left = debtLeft(j, d), n = d.min && left > 0 ? debtNextDue(j, d, today) : null;
    if (!n || n.days > lead) continue;
    out.push({ id: 'debt:' + d.id + ':' + n.ym, kind: 'debt', when: n.days < 0 ? 'late' : n.days === 0 ? 'today' : 'soon', level: n.days < 0 ? 'crit' : n.days === 0 ? 'warn' : 'info', debtId: d.id, name: d.name, ym: n.ym, date: n.date, days: n.days, amount: Math.min(d.min, left) });
  }
  if (s && s.done) out.push({ id: 'sprint:' + s.id + ':end', kind: 'sprint', when: 'today', level: 'info', done: true, date: s.end, days: dayDiff(s.end, today), paid: s.paid, target: s.target });
  else if (s && s.daysLeft <= 1 && s.missing > 0) out.push({ id: 'sprint:' + s.id + ':' + s.daysLeft, kind: 'sprint', when: 'soon', level: 'info', done: false, date: s.end, days: s.daysLeft, amount: s.missing, target: s.target });
  return out;
}
