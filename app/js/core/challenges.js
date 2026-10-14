/* Dorax Finance — calculations: the saving challenges (v227; owner, 2026-10-14: "sigue con el 8": claude/open-gaps-funcionalidades-2026-10-10.md,
   item 8, "Desafíos de ahorro: '52 semanas' y 'días sin gastar'"). He chose the classic 52 weeks with a multiplier and the reverse order, and days
   without spending that the person marks. First built inside the Journey; the same day he moved them out ("la Jornada es muy larga y tiene varias
   cosas que no tienen que ver una con otra") and chose to keep them apart: the 52 weeks in Goals (it is saving), the days without spending on the
   summary, beside "You can spend" (it is day-to-day spending). The Journey is the way out of debt alone again.

   The household's only, kept in state.challenges:
     save52:  { id, goalId, start, step, reverse } | null   week k (from start, 7 days each) puts aside step × k cents (reversed: step × (53 − k)). Its
              money is a goal (goalId, kept in a savings account like any goal's, planned week by week in the months they start in), so contributions,
              the success screen, the plan and what is free to spend need nothing of their own
     nospend: { id, start, length, marks } | null         7, 14 or 30 days; marks: { 'YYYY-MM-DD': true }, the days the person marked as spent nothing
     ended:   [{ kind: 's52', ...save52, saved, total, end } | { kind: 'ns', id, start, length, marked, end }]   the ones that ended or were left
   Nothing here is advice: the amounts are the person's choice and arithmetic on them. All money in integer cents.
   The server's reminders use this file too (tools/build-functions.js). */
const challengesEmpty = () => ({ save52: null, nospend: null, ended: [] });
/** The household's challenges as they are, without creating them (a view reads; only an action writes). */
const challengesOf = state => state.challenges || challengesEmpty();

// ---------- the 52 weeks ----------
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
function s52Now(state, today) {
  const c = challengesOf(state).save52; if (!c) return null;
  const g = (state.goals || []).find(x => x.id === c.goalId); if (!g) return null;
  const total = s52Total(c), saved = Math.max(0, goalSaved(state, g.id)), week = Math.floor(dayDiff(today, c.start) / 7) + 1, now = Math.min(52, Math.max(1, week));
  let covered = 0; while (covered < 52 && s52Upto(c, covered + 1) <= saved) covered++;
  return { ...c, goal: g, cur: goalCur(state, g), total, saved, week: now, covered, toGo: Math.max(0, s52Upto(c, now) - saved), thisWeek: s52Amount(c, now),
    next: now < 52 ? { amount: s52Amount(c, now + 1), date: addDays(c.start, now * 7) } : null, end: s52End(c), pct: Math.min(100, Math.round(saved * 100 / total)),
    done: saved >= total, over: today > s52End(c) };
}
/** The goal of the 52 weeks running, which Goals shows as the challenge rather than among the other goals. */
const s52GoalId = state => { const c = challengesOf(state).save52; return c ? c.goalId : null; };

// ---------- the days without spending ----------
/** Whether a day falls in the running days without spending. */
const nsHas = (c, d) => !!(c && d >= c.start && d <= addDays(c.start, c.length - 1));
/** The days without spending as they stand today, or null: its last day, which day it is on, the days marked so far; done once its last day passed. */
function nsNow(state, today) {
  const c = challengesOf(state).nospend; if (!c) return null;
  const end = addDays(c.start, c.length - 1), to = today < end ? today : end, marks = c.marks || {};
  let marked = 0; for (let d = c.start; d <= to; d = addDays(d, 1)) if (marks[d]) marked++;
  return { ...c, marks, end, day: Math.min(c.length, dayDiff(today, c.start) + 1), daysLeft: Math.max(0, dayDiff(end, today)), marked, pct: Math.round(marked * 100 / c.length), done: today > end };
}
/** What was spent on a day outside the fixed costs (the plan's bills): the person decides whether the day counts, Dorax only says what it sees.
    [{ name, amount }], the largest first. */
function nsSpent(state, day, cur) {
  const bills = (state.plan.lines || []).filter(l => l.pay !== 'budget'), subs = new Set(bills.filter(l => l.subcategoryId).map(l => l.subcategoryId)), cats = new Set(bills.filter(l => !l.subcategoryId).map(l => l.categoryId));
  const out = [];
  for (const x of state.transactions) {
    if (x.type !== 'expense' || x.date !== day || !inScope(state, x, null, cur)) continue;
    const v = -sum(allocations(x).filter(a => !(a.subcategoryId && subs.has(a.subcategoryId)) && !cats.has(a.categoryId || 'other')).map(a => a.amount));
    if (v > 0) out.push({ name: x.merchant || x.description || '', amount: v });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

// ---------- reminders (core/reminders.js, the switch "Challenges") ----------
/** Each week of the 52 weeks, what to put aside, while it is not put aside; while the days without spending run, the day before to mark; and their end. */
function challengeReminders(state, today) {
  if (state.scope === 'business') return [];
  const out = [], c = s52Now(state, today), ns = nsNow(state, today), y = addDays(today, -1);
  if (c && !c.done && !c.over && c.toGo > 0) out.push({ id: 's52:' + c.id + ':' + c.week, kind: 's52', when: 'today', level: 'info', week: c.week, amount: c.toGo, cur: c.cur, behind: c.toGo > c.thisWeek });
  if (ns && !ns.done && nsHas(ns, y) && !ns.marks[y] && !ns.marks[today]) out.push({ id: 'nsmark:' + y, kind: 'nsmark', when: 'today', level: 'info', date: y, marked: ns.marked, length: ns.length });
  if (ns && ns.done) out.push({ id: 'ns:' + ns.id + ':end', kind: 'ns', when: 'today', level: 'info', date: ns.end, marked: ns.marked, length: ns.length });
  return out;
}

// ---------- from the first days of v227 ----------
/** The challenges of an account opened with v227's first build, when they lived in the Journey: moved to their own place, the days without spending
    with the Journey's marks in their days. Says whether anything moved. */
function challengesAdopt(state) {
  const j = state.journey; if (!j || !(j.save52 || j.nospend || (j.ended && j.ended.length))) return false;
  const ch = state.challenges = state.challenges || challengesEmpty();
  if (j.save52 && !ch.save52) ch.save52 = j.save52;
  if (j.nospend && !ch.nospend) { const n = j.nospend, marks = {}; for (let d = n.start; d <= addDays(n.start, n.length - 1); d = addDays(d, 1)) if ((j.checks || {})[d]) marks[d] = true; ch.nospend = { ...n, marks }; }
  if (j.ended && j.ended.length) ch.ended.push(...j.ended);
  delete j.save52; delete j.nospend; delete j.ended;
  return true;
}
