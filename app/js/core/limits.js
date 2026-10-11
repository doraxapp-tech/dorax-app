/* Dorax Finance — calculations: spending limits by category, and the month as planned (what comes in and where each part of it goes).
   Owner, 2026-10-10: "how do you put a limit on a category? I can't find that option, and if I can't find it, it is because it is hard to find";
   then, the same day: "check why the category Home cannot take a limit" (every subcategory of his Home was a bill of the Plan, his supermarket
   included, saved as "one payment, amount changes").
   A limit is a line of the Plan spent in several purchases across the month (pay: 'budget', core/plan.js), so the Plan, Reports, the expense form
   and the alerts at 80% (core/budget-alerts.js) all read the same one. It goes on:
     - a whole category: what is spent in it outside the subcategories that have lines of their own (core/plan.js: ownSubs). Home with its rent and
       internet as bills takes a limit on "everything else in Home"; a category with no such lines, on all of it. Nothing is counted twice;
     - a subcategory with no line, or with a limit already;
     - a subcategory whose line is a bill of variable amount (a supermarket saved as a bill): saving a limit there makes that line a limit, from this
       month on. A fixed bill (rent) never takes one.
   Only the lines still running in the month count. All money is integer cents. */
const limitLive = (l, ym) => !(l.end && l.end < ym);
/** Where a category can have a limit in a month: [{ cat, sub (null: the whole category), id, name, line (its limit, or null), bill (a variable bill
    that becomes the limit), rest (the whole category minus subcategories with lines of their own), empty (that rest has no subcategory left) }]. */
function limitTargets(state, cat, ym) {
  const lines = state.plan.lines.filter(l => l.categoryId === cat.id && limitLive(l, ym)), whole = lines.filter(l => !l.subcategoryId), parts = lines.filter(l => l.subcategoryId), out = [];
  if (whole.every(l => l.pay === 'budget')) {
    const own = new Set(parts.map(l => l.subcategoryId)), subs = cat.subs || [], from = addMonths(ym, -3);
    // empty: every subcategory has its own line and nothing was spent in the category without one lately (Other's loose purchases still count)
    const empty = subs.length > 0 && subs.every(s => own.has(s.id)) && !state.transactions.some(k => k.type === 'expense' && ymOf(k.date) >= from && ymOf(k.date) <= ym && allocations(k).some(a => a.categoryId === cat.id && !a.subcategoryId));
    out.push({ cat, sub: null, id: cat.id, name: cat.name, line: whole[0] || null, bill: null, rest: own.size > 0, empty });
  }
  for (const s of cat.subs || []) {
    const l = parts.find(k => k.subcategoryId === s.id);
    if (!l || l.pay === 'budget') out.push({ cat, sub: s, id: s.id, name: s.name, line: l || null, bill: null });
    else if (l.pay === 'variable') out.push({ cat, sub: s, id: s.id, name: s.name, line: null, bill: l });
  }
  return out;
}
/** Words of everyday spending in a subcategory's name (Portuguese, Spanish, English): bought several times a month, so a limit fits it better than a
    bill. Only a starting point for which target a category opens on; the person chooses. */
const LIMIT_EVERYDAY = /mercad|feira|padari|a[çc]oug|hortifr|restaur|lanch|deliver|ifood|comida|aliment|uber|t[aá]xi|transport|combust|gasolin|posto|farm[aá]c|drogar|lazer|salida|ocio|roupa|ropa|compras|shopping|caf[eé]|grocer|food|fuel|pharm/i;
/** Whether a bill of variable amount is really everyday spending: its name says so, or it had four or more purchases in the three months before ym. */
function limitEveryday(state, x, ym) {
  if (!x.bill) return false;
  if (LIMIT_EVERYDAY.test(x.name || '')) return true;
  const from = addMonths(ym, -3), n = state.transactions.filter(k => k.type === 'expense' && ymOf(k.date) >= from && ymOf(k.date) < ym && allocations(k).some(a => a.subcategoryId === x.sub.id)).length;
  return n >= 4;
}
/** The target a category opens on: one with a limit; else, when its whole has nothing left to count, a bill that looks like everyday spending (his
    supermarket); else the whole. */
function limitDefault(targets, state, ym) {
  return targets.find(x => x.line && planValue(state, x.line, ym) > 0) || (targets[0] && targets[0].empty && targets.find(x => limitEveryday(state, x, ym))) || targets[0] || null;
}
/** Every expense category's limits in a month: { [catId]: { cat, targets, set: the targets with a limit that month, each with planned, spent, left,
    pct, planned and spent of them all } }. One planProgress for the whole list. */
function limitsNow(state, ym, currency, today) {
  const prog = planProgress(state, ym, currency, today), by = {};
  for (const cat of state.categories) {
    if (cat.income) continue;
    const targets = limitTargets(state, cat, ym), set = [];
    for (const x of targets) {
      const p = x.line && prog.find(k => k.id === x.line.id); if (!p || !p.planned) continue;
      set.push({ ...x, planned: p.planned, spent: p.spent, left: p.planned - p.spent, pct: Math.round(p.spent * 100 / p.planned) });
    }
    by[cat.id] = { cat, targets, set, planned: sum(set.map(x => x.planned)), spent: sum(set.map(x => x.spent)) };
  }
  return by;
}
/** What a target took in the three months before ym, on average over the months it had spending in: { amount (whole reais), n } or null. */
function limitAverage(state, target, ym, currency) {
  const vals = [1, 2, 3].map(n => { const m = addMonths(ym, -n), tt = categoryTotals(state, m, currency); return target.sub ? tt.bySub[target.sub.id] || 0 : lineActual({ categoryId: target.cat.id }, tt, linesLive(state, m)); }).filter(v => v > 0);
  return vals.length ? { amount: Math.round(sum(vals) / vals.length / 100) * 100, n: vals.length } : null;
}
/** Takes a limit off from ym on. The months before keep theirs (what the Plan and Reports showed then); a line with nothing before ym goes. */
function limitRemove(state, line, ym) {
  const before = Object.keys(line.plan).some(y => (line.plan[y] || []).some((v, i) => v > 0 && y + '-' + String(i + 1).padStart(2, '0') < ym));
  if (before) endLine(line, addMonths(ym, -1)); else state.plan.lines = state.plan.lines.filter(k => k !== line);
  return before;
}
/** How far into the month a day is, in percent: where the "today" mark stands on a bar of the month (Organizze's "Hoje", 2026-10-10). */
const monthPace = today => Math.round(+today.slice(8) * 1000 / daysInMonth(ymOf(today))) / 10;
/** The month as planned (owner, 2026-10-10, on Mobills: "it asks for an income, and what percentage of your salary you want to save each month"):
    what comes in (the Plan's income rows), the bills, what is set aside (the goals' plan for the month, or the share of the income the person chose
    to save, whichever is more), the limits, and what has no job yet. state.plan.savePct: that share, in percent, or nothing. */
function monthPlan(state, ym) {
  const income = payTotal(state, ym), lines = linesLive(state, ym), val = l => planValue(state, l, ym);
  const bills = sum(lines.filter(l => l.pay !== 'budget').map(val)), limits = sum(lines.filter(l => l.pay === 'budget').map(val));
  const goals = sum((state.goals || []).filter(goalLive).map(g => goalPlan(g, ym))), pct = +((state.plan || {}).savePct) || 0, target = pct ? Math.round(income * pct / 100) : 0;
  const saving = Math.max(goals, target);
  return { income, bills, goals, pct: pct || null, target, saving, limits, toSpend: income - bills - saving, free: income - bills - saving - limits };
}
