/* Dorax Finance — calculations: the insight of the day. One fact a day about the person's own month, worked out from what the account holds. */
// ---------- insight of the day ----------
// 2026-10-07 (owner: "I want the app to keep motivating day to day: tips from real behaviour, an insight of the day"). Eight kinds of rule, each a
// fact with its figures and nothing else: the words are chosen on screen (features/ahead/insights.view.js). Nothing here is advice, nothing is a
// statistic about other people, and no investment return is assumed: every figure is arithmetic on what the person recorded or planned.
// All money is integer cents. A rule that has nothing true to say today says nothing.
//
//   pace    spending so far this month against the same days of the month before
//   mover   the category that moved most against the same days of the month before
//   bills   fixed costs due in the next 7 days
//   goal    the goal reached first at today's pace: what is missing, when, and the step that brings it closer
//   mark    what is missing to pass the next mark of days of freedom
//   day     what one day costs at the pace money goes out
//   streak  months in a row with money put aside in goals and funds
//   rate    of every 100 that came in last month, how much went to goals and funds

const INSIGHT_KINDS = ['pace', 'mover', 'bills', 'goal', 'mark', 'day', 'streak', 'rate'];
const INSIGHT_MIN = 1000;        // a difference under R$ 10 is not worth a sentence
const INSIGHT_MOVE = 3000;       // a category has to move R$ 30 and 10% to be "the one that moved" (the report's rule, core/observations.js)

/** What was put into goals and funds in a month, withdrawals taken off. A starting balance is no contribution. */
function asideIn(state, ym) { return sum(state.goalMoves.filter(m => !isStartMove(m) && ymOf(m.date) === ym).map(m => m.amount)); }

/** Every insight that is true today, in the order of INSIGHT_KINDS: [{ kind, ...figures }]. */
function insights(state, today, currency) {
  const out = [], nowYm = ymOf(today), prevYm = addMonths(nowYm, -1), day = +today.slice(8), sameDay = isoDate(prevYm, day);

  // pace and mover need a few days of this month and the same days of the month before
  const cur = monthSummary(state, nowYm, currency), prev = monthSummary(state, prevYm, currency, sameDay);
  if (day >= 3 && cur.expenses > 0 && prev.expenses > 0 && Math.abs(cur.expenses - prev.expenses) >= INSIGHT_MIN) out.push({ kind: 'pace', spent: cur.expenses, diff: cur.expenses - prev.expenses, month: prevYm });
  if (day >= 3) {
    const a = categoryTotals(state, nowYm, currency).byCat, b = categoryTotals(state, prevYm, currency, sameDay).byCat;
    let best = null;
    for (const id of Object.keys(b)) {
      const was = b[id], now = a[id] || 0; if (was <= 0) continue;
      const diff = now - was, pct = Math.round(diff * 100 / was);
      if (Math.abs(diff) >= INSIGHT_MOVE && Math.abs(pct) >= 10 && (!best || Math.abs(diff) > Math.abs(best.diff))) best = { kind: 'mover', id, diff, pct: Math.abs(pct), month: prevYm };
    }
    if (best) out.push(best);
  }

  // bills of the coming week: the ones with a due day that has not passed (what is late is the To do list's to say)
  const due = upcomingBills(state, today, currency, 7).filter(p => p.dueDate && p.days >= 0);
  if (due.length) out.push({ kind: 'bills', n: due.length, total: sum(due.map(p => p.planned)), first: { id: due[0].id, name: due[0].name, date: due[0].dueDate, days: due[0].days } });

  // the goal reached first
  let near = null;
  for (const g of state.goals) {
    const a = goalArrival(state, g, today); if (!a) continue;
    if (!near || a.ym < near.a.ym) near = { g, a };
  }
  if (near) {
    const st = goalStatus(state, near.g, today), pace = near.a.pace || st.thisMonth || 0;
    out.push({ kind: 'goal', id: near.g.id, name: near.g.name, remaining: st.remaining, ym: near.a.ym, months: near.a.months, lever: pace > 0 ? lever(st.target, st.saved, pace) : null });
  }

  // days of freedom: the next mark, and what one day costs
  const r = runway(state, today, currency);
  if (r.days !== null && r.next && r.next.missing > 0 && r.cushion.amount > 0) out.push({ kind: 'mark', days: r.days, mark: r.next.days, missing: Math.ceil(r.next.missing / 100) * 100 });      // whole reais, rounded up: with that much the mark is passed for certain
  if (r.burn.amount >= 3000) out.push({ kind: 'day', amount: Math.round(r.burn.amount / 3000) * 100, days: r.days });      // whole reais

  // months in a row with money put aside. The month in progress counts once something was put aside in it; until then the run is the one up to last month.
  const open = asideIn(state, nowYm) <= 0;
  let n = 0;
  for (let ym = open ? prevYm : nowYm; n < 120 && asideIn(state, ym) > 0; ym = addMonths(ym, -1)) n++;
  if (n >= 2) out.push({ kind: 'streak', n, open, month: nowYm });

  // of every 100 that came in last month
  const lastIn = monthSummary(state, prevYm, currency).income, lastAside = asideIn(state, prevYm);
  if (lastIn > 0 && lastAside > 0 && Math.round(lastAside * 100 / lastIn) >= 1) out.push({ kind: 'rate', per100: Math.min(100, Math.round(lastAside * 100 / lastIn)), aside: lastAside, income: lastIn, month: prevYm });

  return out;
}

/** The one for today: the day picks its place in the list, so it changes from one day to the next without anything being remembered.
    skip moves on from it ("Another"). { insight, index, count }; insight is null when nothing is true yet (a new account). */
function insightOfDay(state, today, currency, skip) {
  const list = insights(state, today, currency), n = list.length;
  if (!n) return { insight: null, index: 0, count: 0 };
  const index = ((dayDiff(today, '2026-01-01') + (skip || 0)) % n + n) % n;
  return { insight: list[index], index, count: n };
}
