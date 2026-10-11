// QC of every calculation in the engine: each figure is worked out a second time here, by a separately written reference, and compared.
// The example account (with a full plan) is checked month by month, then 300 random accounts, then hand-made edge cases.
const { load } = require('./load.js');
const E = load();
let pass = 0, fail = 0;
const ok = (c, name, d) => { if (c) pass++; else { fail++; if (fail < 60) console.log('  FAIL', name, d === undefined ? '' : JSON.stringify(d)); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, { got: a, want: b });
const CUR = 'BRL';

// ---------- reference implementations (written apart from the engine; BigInt where rounding matters) ----------
const ym = d => d.substring(0, 7);
const months = (from, n) => { const out = []; let [y, m] = from.split('-').map(Number); for (let i = 0; i < n; i++) { out.push(y + '-' + String(m).padStart(2, '0')); m++; if (m > 12) { m = 1; y++; } } return out; };
const dim = s => { const [y, m] = s.split('-').map(Number); return [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; };
const dayNo = iso => { const [y, m, d] = iso.split('-').map(Number); let n = d; for (let yy = 1970; yy < y; yy++) n += (yy % 4 === 0 && (yy % 100 !== 0 || yy % 400 === 0)) ? 366 : 365; for (let mm = 1; mm < m; mm++) n += dim(y + '-' + String(mm).padStart(2, '0')); return n; };
const household = (S, t, cur) => { const a = S.accounts.find(x => x.id === t.accountId); return !!a && a.scope !== 'business' && a.currency === cur && t.status !== 'ignored'; };
// half-up rounding of a/b for b > 0 (what Math.round does), in exact integers
const divRound = (a, b) => { a = BigInt(a); b = BigInt(b); const q = (2n * a + b) / (2n * b), r = (2n * a + b) % (2n * b); return Number(r < 0n ? q - 1n : q); };
const pct1 = (a, b) => divRound(a * 1000, b) / 10;        // one decimal
function refMonth(S, m, cur, upTo) {
  const tx = S.transactions.filter(t => household(S, t, cur) && ym(t.date) === m && (!upTo || t.date <= upTo));
  const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), expenses = tx.filter(t => t.type === 'expense').reduce((s, t) => s - t.amount, 0);
  return { income, expenses, saved: income - expenses, rate: income > 0 ? pct1(income - expenses, income) : null, transfers: tx.filter(t => t.type === 'transfer' && t.amount < 0).reduce((s, t) => s - t.amount, 0), count: tx.length };
}
function refCats(S, m, cur) {
  const byCat = {}, bySub = {};
  S.transactions.filter(t => household(S, t, cur) && ym(t.date) === m && t.type === 'expense').forEach(t => {
    const parts = t.splits && t.splits.length ? t.splits : [t];
    parts.forEach(p => { const c = p.categoryId || 'other'; byCat[c] = (byCat[c] || 0) - p.amount; if (p.subcategoryId) bySub[p.subcategoryId] = (bySub[p.subcategoryId] || 0) - p.amount; });
  });
  return { byCat, bySub };
}
const refBalance = (S, id, upTo) => S.accounts.find(a => a.id === id).opening + S.transactions.filter(t => t.accountId === id && t.status !== 'ignored' && (!upTo || t.date <= upTo)).reduce((s, t) => s + t.amount, 0);
const refPlanned = (l, m) => ((l.plan[m.slice(0, 4)] || [])[+m.slice(5) - 1]) || 0;
function refProgress(S, m, cur, today) {
  const c = refCats(S, m, cur);
  return S.plan.lines.map(l => {
    // a whole category's line takes what its subcategories with running lines of their own did not (2026-10-10: a limit on "everything else in Home")
    const own = l.subcategoryId ? 0 : [...new Set(S.plan.lines.filter(k => k !== l && !(k.end && k.end < m) && k.categoryId === l.categoryId && k.subcategoryId).map(k => k.subcategoryId))].reduce((s, id) => s + (c.bySub[id] || 0), 0);
    const planned = refPlanned(l, m), spent = l.subcategoryId ? (c.bySub[l.subcategoryId] || 0) : (c.byCat[l.categoryId] || 0) - own, bill = l.pay !== 'budget';
    const due = l.due ? m + '-' + String(Math.min(l.due, dim(m))).padStart(2, '0') : null;
    let status;
    if (spent === 0) { if (!planned) status = 'none'; else { const late = bill && today && (m < ym(today) || (m === ym(today) && due && due < today)); status = late ? 'late' : 'unpaid'; } }
    else if (spent > planned) status = 'over'; else if (bill) status = 'paid'; else status = spent === planned ? 'onplan' : 'under';
    return { id: l.id, planned, spent, remaining: planned - spent, pct: planned > 0 ? pct1(spent, planned) : 0, status, dueDate: due, days: due && today ? dayNo(due) - dayNo(today) : null, toPay: bill ? (spent === 0 ? planned : 0) : Math.max(0, planned - spent) };
  });
}
function refGoal(S, g, today) {
  const now = ym(today), mv = S.goalMoves.filter(x => x.goalId === g.id), isStart = x => !!(x.start || (x.k && x.k.note === 'Starting balance'));
  const saved = mv.reduce((s, x) => s + x.amount, 0), started = mv.filter(isStart).reduce((s, x) => s + x.amount, 0);
  const planAt = m => ((g.plan[m.slice(0, 4)] || [])[+m.slice(5) - 1]) || 0;
  const all = Object.keys(g.plan).flatMap(y => g.plan[y].map((v, i) => [y + '-' + String(i + 1).padStart(2, '0'), v || 0])).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const doneNow = mv.filter(x => !isStart(x) && ym(x.date) === now).reduce((s, x) => s + x.amount, 0);
  const plannedToDate = all.filter(([m]) => m < now).reduce((s, [, v]) => s + v, 0) + Math.max(0, Math.min(planAt(now), doneNow));
  const target = g.kind === 'goal' && g.target > 0 ? g.target : null;
  let run = saved, projected = null;
  for (const [m, v] of all) { if (m < now || !v) continue; run += m === now ? Math.max(0, v - doneNow) : v; if (target !== null && projected === null && run >= target) projected = m; }
  const monthsLeft = g.deadline ? (+g.deadline.slice(0, 4) - +now.slice(0, 4)) * 12 + (+g.deadline.slice(5, 7) - +now.slice(5, 7)) + 1 : null;
  const remaining = target === null ? null : Math.max(0, target - saved);
  const diff = saved - started - plannedToDate;        // contributions against the plan: money saved before the goal existed is not "ahead of plan"
  return { saved, plannedToDate, diff, target, remaining, pct: target ? Math.min(100, pct1(saved, target)) : null, projected, planTotal: run, unplanned: target !== null ? Math.max(0, target - run) : 0, monthsLeft,
    required: target !== null && remaining > 0 && monthsLeft !== null && monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null,
    overdue: monthsLeft !== null && monthsLeft <= 0 && target !== null && saved < target, state: target !== null && saved >= target ? 'reached' : !mv.length ? 'nomoves' : diff < 0 ? 'behind' : diff > 0 ? 'ahead' : 'ontrack', thisMonth: planAt(now) };
}
/** Weighted average cost in exact fractions (cost kept as a rational number), to see what integer rounding does to the engine's figures. */
function refFii(moves, ticker) {
  const list = moves.map((m, i) => [m, i]).filter(([m]) => m.ticker === ticker).sort((a, b) => (a[0].kind === 'open' ? 0 : 1) - (b[0].kind === 'open' ? 0 : 1) || (a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : 0) || a[1] - b[1]).map(x => x[0]);
  let qty = 0, cost = 0, realized = 0, income = 0, bought = 0, last = null;
  for (const m of list) {
    if (m.kind === 'open' || m.kind === 'buy') { qty += m.qty; cost += m.qty * m.price + (m.fees || 0); bought += m.qty * m.price + (m.fees || 0); }
    else if (m.kind === 'sell') { if (m.qty > qty) return null; const out = divRound(cost * m.qty, qty); cost -= out; qty -= m.qty; realized += m.qty * m.price - (m.fees || 0) - out; }
    else { income += m.amount; last = { date: m.date, amount: m.amount, qty }; }
  }
  return { qty, cost, realized, income, bought, last, avg: qty ? divRound(cost, qty) : 0 };
}

function checkState(S, label, today) {
  const first = S.transactions.length ? ym(S.transactions.map(t => t.date).sort()[0]) : ym(today);
  const ms = months(first, 14);
  for (const m of ms) {
    for (const upTo of [undefined, m + '-10']) eq(E.monthSummary(S, m, CUR, upTo), refMonth(S, m, CUR, upTo), `${label} monthSummary ${m} ${upTo || ''}`);
    const c = E.categoryTotals(S, m, CUR), r = refCats(S, m, CUR);
    eq([c.byCat, c.bySub], [r.byCat, r.bySub], `${label} categoryTotals ${m}`);
    eq(Object.values(c.byCat).reduce((a, b) => a + b, 0), refMonth(S, m, CUR).expenses, `${label} categories add up to expenses ${m}`);
    const got = E.planProgress(S, m, CUR, today).map(p => ({ id: p.id, planned: p.planned, spent: p.spent, remaining: p.remaining, pct: p.pct, status: p.status, dueDate: p.dueDate, days: p.days, toPay: p.toPay }));
    eq(got, refProgress(S, m, CUR, today), `${label} planProgress ${m}`);
    eq(E.planTotals(S, m).expenses, S.plan.lines.reduce((s, l) => s + refPlanned(l, m), 0), `${label} planTotals ${m}`);
    // income rows: what arrived is shared between rows without losing a cent
    const y = +m.slice(0, 4), rows = (S.pay[y] || []);
    const arrived = S.transactions.filter(t => household(S, t, CUR) && ym(t.date) === m && t.type === 'income');
    const groups = {}; rows.forEach(r => { const k = r.sub + '|' + (r.half || 0); (groups[k] = groups[k] || []).push(r); });
    for (const k in groups) {
      const [sub, half] = k.split('|'), want = arrived.filter(t => t.subcategoryId === sub && (half === '0' || (half === '1') === (+t.date.slice(8) <= 15))).reduce((s, t) => s + t.amount, 0);
      const parts = groups[k].map(r => E.payActual(S, r, m, CUR));
      eq(parts.reduce((a, b) => a + b, 0), want, `${label} payActual parts add up ${m} ${k}`);
      ok(parts.every(p => p >= 0 || want < 0), `${label} payActual no negative share ${m}`, parts);
    }
    // savings hand-out
    const live = S.goals.filter(g => g.status === 'active'), d = E.distribution(S, m), mi = +m.slice(5) - 1;
    const inc = rows.filter(r => r.to === 'savings').reduce((s, r) => s + (r.values[mi] || 0), 0), pl = live.reduce((s, g) => s + ((g.plan[y] || [])[mi] || 0), 0);
    const doneOf = g => S.goalMoves.filter(x => x.goalId === g.id && ym(x.date) === m && !(x.start || (x.k && x.k.note === 'Starting balance'))).reduce((s, x) => s + x.amount, 0);
    eq([d.income, d.planned, d.remainder, d.done, d.pending], [inc, pl, inc - pl, live.reduce((s, g) => s + doneOf(g), 0), live.reduce((s, g) => s + Math.max(0, ((g.plan[y] || [])[mi] || 0) - doneOf(g)), 0)], `${label} distribution ${m}`);
    eq(E.allocRemainder(S, y)[mi], inc - pl, `${label} allocRemainder ${m}`);
  }
  for (const a of S.accounts) for (const upTo of [undefined, today, ms[3] + '-15']) eq(E.accountBalance(S, a.id, upTo), refBalance(S, a.id, upTo), `${label} balance ${a.id} ${upTo || ''}`);
  for (const g of S.goals) eq(E.goalStatus(S, g, today), refGoal(S, g, today), `${label} goalStatus ${g.id}`);
  for (const tk of E.fiiTickers(S)) {
    const p = E.fiiReplay(S.fii.moves, tk), r = refFii(S.fii.moves, tk);
    if (!r) { eq(p, null, `${label} fii ${tk} invalid`); continue; }
    eq([p.qty, p.cost, p.realized, p.income, p.bought, p.avg, p.last], [r.qty, r.cost, r.realized, r.income, r.bought, r.avg, r.last], `${label} fiiReplay ${tk}`);
  }
  const f = E.fiiSummary(S, today), held = f.rows.filter(r => r.qty > 0);
  eq([f.cost, f.value, f.gain, f.monthly], [held.reduce((s, r) => s + r.cost, 0), held.reduce((s, r) => s + r.qty * r.price, 0), held.reduce((s, r) => s + r.qty * r.price - r.cost, 0), held.reduce((s, r) => s + r.monthly, 0)], `${label} fiiSummary totals`);
  eq(f.gainPct, f.cost ? pct1(f.value - f.cost, f.cost) : null, `${label} fii gain %`);
  eq(f.yieldPct, f.value ? divRound(f.monthly * 10000, f.value) / 100 : null, `${label} fii yield %`);
  eq(f.received, S.fii.moves.filter(m => m.kind === 'income' && refFii(S.fii.moves, m.ticker)).reduce((s, m) => s + m.amount, 0), `${label} fii income received`);      // a ticker whose movements make no sense (the app refuses to save them) is not counted
  for (const r of f.rows) {
    const a = S.fii.assets[r.ticker] || {};
    eq(r.monthly, r.last && r.last.qty ? divRound(r.last.amount * r.qty, r.last.qty) : r.qty * (a.lastYield || 0), `${label} fii monthly ${r.ticker}`);
    eq(r.value, r.qty * (a.price || r.avg), `${label} fii value ${r.ticker}`);
  }
}

// ---------- 1. the example account, with a full plan, on several "todays" ----------
const demo = E.buildDemoState('en', { plan: true });
for (const today of ['2026-10-02', '2026-10-05', '2026-10-31', '2026-11-01', '2027-01-15']) checkState(demo, 'example@' + today, today);
// money moved between own accounts nets to zero
{
  const tr = demo.transactions.filter(t => t.type === 'transfer' && household(demo, t, CUR) && t.transferAccountId && demo.accounts.find(a => a.id === t.transferAccountId).scope !== 'business');
  eq(tr.reduce((s, t) => s + t.amount, 0), 0, 'example: household transfers net to zero');
  ok(demo.accounts.filter(a => a.type !== 'credit').every(a => E.accountBalance(demo, a.id) >= 0), 'example: no account overdrawn');
  for (const t of demo.transactions.filter(t => t.splits)) eq(t.splits.reduce((s, x) => s + x.amount, 0), t.amount, 'example: split parts add up to the transaction');
}

// ---------- 2. random accounts ----------
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randomState(seed) {
  const r = rng(seed), int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick = a => a[int(0, a.length - 1)];
  const S = E.buildNewState('q@example.org', 'en', '2026-10-02');
  S.accounts = [{ id: 'a1', name: 'A1', type: 'checking', scope: 'personal', currency: 'BRL', opening: int(0, 500000) }, { id: 'a2', name: 'A2', type: 'credit', scope: 'personal', currency: 'BRL', opening: -int(0, 90000), dueDay: int(1, 31) },
    { id: 'a3', name: 'A3', type: 'savings', scope: 'personal', currency: 'BRL', opening: int(0, 900000) }, { id: 'b1', name: 'B1', type: 'checking', scope: 'business', currency: 'BRL', opening: 0 }, { id: 'u1', name: 'U1', type: 'checking', scope: 'personal', currency: 'USD', opening: 1000 }];
  const subs = ['s1', 's2', 's3', 's4', 's5'], cats = { s1: 'c1', s2: 'c1', s3: 'c2', s4: 'c2', s5: 'c3' };
  S.plan.lines = subs.slice(0, int(1, 5)).map((s, i) => ({ id: 'l' + i, name: 'L' + i, categoryId: cats[s], subcategoryId: r() < .85 ? s : null, pay: pick(['fixed', 'variable', 'budget']), accountId: pick(['a1', 'a2']), due: r() < .7 ? int(1, 31) : null, end: null, note: '',
    plan: { 2026: Array.from({ length: 12 }, () => r() < .15 ? 0 : int(1, 300000)), 2027: Array.from({ length: 12 }, () => int(0, 300000)) } }));
  S.pay = { 2026: [{ id: 'p1', name: 'P1', sub: 'inc', half: pick([0, 1, 2]), to: 'savings', values: Array.from({ length: 12 }, () => int(0, 500000)) }, { id: 'p2', name: 'P2', sub: 'inc', half: pick([0, 1, 2]), to: 'fixed', values: Array.from({ length: 12 }, () => int(0, 500000)) },
    { id: 'p3', name: 'P3', sub: r() < .5 ? 'inc' : 'inc2', half: pick([0, 1, 2]), to: pick(['fixed', 'savings']), values: Array.from({ length: 12 }, () => int(0, 500000)) }], 2027: [] };
  S.transactions = [];
  const n = int(0, 160);
  for (let i = 0; i < n; i++) {
    const acct = pick(['a1', 'a1', 'a2', 'a3', 'b1', 'u1']), date = `2026-${String(int(6, 11)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, type = pick(['expense', 'expense', 'expense', 'income', 'transfer', 'adjustment']);
    const amount = type === 'income' ? int(1, 900000) : type === 'expense' ? (r() < .06 ? int(1, 5000) : -int(1, 200000)) : (r() < .5 ? 1 : -1) * int(1, 300000), sub = pick(subs);
    const t = { id: 'x' + i, accountId: acct, date, description: 'D' + i, merchant: 'M' + int(0, 8), amount, currency: acct === 'u1' ? 'USD' : 'BRL', type, categoryId: type === 'expense' ? (r() < .1 ? null : cats[sub]) : type === 'income' ? 'income' : null,
      subcategoryId: type === 'expense' ? (r() < .15 ? null : sub) : type === 'income' ? pick(['inc', 'inc', 'inc2']) : null, status: r() < .08 ? 'ignored' : pick(['confirmed', 'pending']), transferAccountId: null, splits: null };
    if (type === 'expense' && amount < -100 && r() < .15) { const a = -int(1, -amount - 1); t.splits = [{ categoryId: 'c1', subcategoryId: 's1', amount: a }, { categoryId: r() < .5 ? null : 'c3', subcategoryId: r() < .5 ? null : 's5', amount: amount - a }]; }
    S.transactions.push(t);
  }
  S.goals = Array.from({ length: int(0, 4) }, (_, i) => ({ id: 'g' + i, name: 'G' + i, kind: pick(['goal', 'fund']), target: int(0, 3000000), deadline: r() < .6 ? `${pick([2026, 2027])}-${String(int(1, 12)).padStart(2, '0')}` : null, status: pick(['active', 'active', 'active', 'paused', 'completed']), accountId: null, note: '',
    plan: { 2026: Array.from({ length: 12 }, () => r() < .2 ? 0 : int(0, 200000)), 2027: Array.from({ length: 12 }, () => int(0, 200000)) } }));
  S.goalMoves = [];
  S.goals.forEach(g => { let bal = 0; if (r() < .4) { const a = int(1, 2000000); S.goalMoves.push({ id: 'm' + S.goalMoves.length, goalId: g.id, date: '2026-10-02', amount: a, start: true }); bal += a; }
    for (let i = 0, k = int(0, 12); i < k; i++) { let a = r() < .2 ? -int(1, Math.max(1, bal)) : int(1, 250000); if (bal + a < 0) a = int(1, 1000); bal += a; S.goalMoves.push({ id: 'm' + S.goalMoves.length, goalId: g.id, date: `2026-${String(int(1, 11)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, amount: a }); } });
  S.fii = { assets: {}, moves: [] };
  ['AAAA11', 'BBBB11', 'CCCC11'].slice(0, int(0, 3)).forEach(tk => {
    if (r() < .8) S.fii.assets[tk] = { price: r() < .8 ? int(100, 20000) : 0, lastYield: int(0, 150) };
    let q = 0; if (r() < .5) { const n = int(1, 300); S.fii.moves.push({ id: 'f' + S.fii.moves.length, ticker: tk, kind: 'open', date: '', qty: n, price: int(100, 20000), fees: 0 }); q += n; }
    for (let i = 0, k = int(0, 14); i < k; i++) {
      const date = `2026-${String(int(1, 10)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, kind = pick(['buy', 'buy', 'sell', 'income', 'income']);
      if (kind === 'buy') { const n = int(1, 200); S.fii.moves.push({ id: 'f' + S.fii.moves.length, ticker: tk, kind, date, qty: n, price: int(100, 20000), fees: int(0, 900) }); }
      else if (kind === 'sell') S.fii.moves.push({ id: 'f' + S.fii.moves.length, ticker: tk, kind, date, qty: int(1, 120), price: int(100, 20000), fees: int(0, 900) });
      else S.fii.moves.push({ id: 'f' + S.fii.moves.length, ticker: tk, kind, date, amount: int(1, 90000) });
    }
  });
  return S;
}
for (let seed = 1; seed <= 300; seed++) { const S = randomState(seed); checkState(S, 'random' + seed, ['2026-10-02', '2026-09-30', '2026-12-31'][seed % 3]); }

// ---------- 3. dates ----------
eq([E.addMonths('2026-01', -1), E.addMonths('2026-12', 1), E.addMonths('2026-10', 15), E.addMonths('2026-03', -27)], ['2025-12', '2027-01', '2028-01', '2023-12'], 'addMonths across years');
eq([E.daysInMonth('2024-02'), E.daysInMonth('2026-02'), E.daysInMonth('2100-02'), E.daysInMonth('2000-02'), E.daysInMonth('2026-04')], [29, 28, 28, 29, 30], 'daysInMonth with leap years');
eq([E.isoDate('2026-02', 31), E.isoDate('2024-02', 30), E.isoDate('2026-04', 31), E.isoDate('2026-10', 5)], ['2026-02-28', '2024-02-29', '2026-04-30', '2026-10-05'], 'day 31 becomes the last day of a shorter month');
eq([E.dayDiff('2026-03-01', '2026-02-28'), E.dayDiff('2024-03-01', '2024-02-28'), E.dayDiff('2026-10-02', '2026-10-02'), E.dayDiff('2027-01-01', '2026-12-31'), E.addDays('2026-12-31', 1), E.addDays('2026-03-01', -1)], [1, 2, 0, 1, '2027-01-01', '2026-02-28'], 'day arithmetic');
for (let i = 0; i < 400; i++) { const a = E.addDays('2025-01-01', i * 3), b = E.addDays('2025-01-01', i * 7 % 900); eq(E.dayDiff(a, b), dayNo(a) - dayNo(b), 'dayDiff ' + a + ' ' + b); }

// ---------- 4. edge cases by hand ----------
{
  const S = E.buildNewState('e@example.org', 'en', '2026-10-02');
  S.accounts = [{ id: 'a', name: 'A', type: 'checking', scope: 'personal', currency: 'BRL', opening: 0 }];
  eq(E.monthSummary(S, '2026-10', CUR), { income: 0, expenses: 0, saved: 0, rate: null, transfers: 0, count: 0 }, 'empty month: no rate, no division by zero');
  S.transactions = [{ id: '1', accountId: 'a', date: '2026-10-01', amount: 100000, type: 'income', status: 'confirmed' }, { id: '2', accountId: 'a', date: '2026-10-01', amount: -33333, type: 'expense', status: 'confirmed', categoryId: 'c' }];
  eq(E.monthSummary(S, '2026-10', CUR).rate, 66.7, 'left-over share rounds to one decimal');
  S.transactions[1].amount = -150000;
  eq([E.monthSummary(S, '2026-10', CUR).saved, E.monthSummary(S, '2026-10', CUR).rate], [-50000, -50], 'spending above income: negative left over');
  // a goal with money saved before it existed is not "ahead of plan"; missing a planned month then reads as behind
  const g = { id: 'g', name: 'G', kind: 'goal', target: 1500000, deadline: '2027-03', status: 'active', plan: { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 50000, 50000, 50000, 50000], 2027: [50000, 50000, 50000, 0, 0, 0, 0, 0, 0, 0, 0, 0] } };
  S.goals = [g]; S.goalMoves = [{ id: 'm1', goalId: 'g', date: '2026-09-01', amount: 1250000, start: true }];
  let st = E.goalStatus(S, g, '2026-09-10');
  eq([st.saved, st.plannedToDate, st.diff, st.state], [1250000, 0, 0, 'ontrack'], 'starting balance: on track, not ahead');
  st = E.goalStatus(S, g, '2026-10-10');
  eq([st.diff, st.state], [-50000, 'behind'], 'starting balance + a missed month: behind by that month');
  S.goalMoves.push({ id: 'm2', goalId: 'g', date: '2026-09-20', amount: 50000 }, { id: 'm3', goalId: 'g', date: '2026-10-05', amount: 80000 });
  st = E.goalStatus(S, g, '2026-10-10');
  eq([st.saved, st.plannedToDate, st.diff, st.state, st.remaining, st.required, st.projected, st.pct], [1380000, 100000, 30000, 'ahead', 120000, 20000, '2027-01', 92], 'goal facts by hand');
  // weighted average cost by hand: 10 @ 100,00 + 10 @ 120,00 (+ 2,00 fees) = 2.202,00 / 20 = 110,10; sell 5 @ 130,00 (1,00 fee): cost out 550,50, result 98,50
  S.fii = { assets: {}, moves: [{ id: 'a', ticker: 'T', kind: 'buy', date: '2026-01-05', qty: 10, price: 10000, fees: 0 }, { id: 'b', ticker: 'T', kind: 'buy', date: '2026-02-05', qty: 10, price: 12000, fees: 200 }] };
  let p = E.fiiReplay(S.fii.moves, 'T'); eq([p.qty, p.cost, p.avg], [20, 220200, 11010], 'average price after two purchases');
  S.fii.moves.push({ id: 'c', ticker: 'T', kind: 'sell', date: '2026-03-05', qty: 5, price: 13000, fees: 100 });
  p = E.fiiReplay(S.fii.moves, 'T'); eq([p.qty, p.cost, p.avg, p.realized], [15, 165150, 11010, 9850], 'a sale keeps the average price and records its result');
  S.fii.moves.push({ id: 'd', ticker: 'T', kind: 'income', date: '2026-03-15', amount: 1234 });
  const f = E.fiiSummary(S, '2026-10-02').rows[0];
  eq([f.unit, f.monthly, f.value, f.gain, f.yieldPct], [8227, 1234, 165150, 0, 0.75], 'income per quota (4 decimals), monthly income, yield');
  ok(E.fiiReplay(S.fii.moves.concat([{ id: 'e', ticker: 'T', kind: 'sell', date: '2026-04-01', qty: 16, price: 1, fees: 0 }]), 'T') === null, 'selling more than held is refused');
  eq(E.fiiSimulate(S, 'T', 5, 9000, 80), { cost: 45000, income: 400, yieldPct: 0.89, newQty: 20, newAvg: 10508, had: 15 }, 'simulator by hand');
  // one salary split between bills and savings: 7.000,01 shared 3:4 never loses the cent
  S.pay = { 2026: [{ id: 'p1', sub: 'sal', half: 0, to: 'savings', values: Array(12).fill(300000) }, { id: 'p2', sub: 'sal', half: 0, to: 'fixed', values: Array(12).fill(400000) }] };
  S.transactions = [{ id: '1', accountId: 'a', date: '2026-10-05', amount: 700001, type: 'income', subcategoryId: 'sal', status: 'confirmed' }];
  const parts = S.pay[2026].map(r => E.payActual(S, r, '2026-10', CUR)); eq([parts, parts[0] + parts[1]], [[300000, 400001], 700001], 'one salary shared between two rows');
  // amounts: no floating point anywhere near the cents
  eq([E.centsToDecimal(-18542), E.centsToDecimal(5), E.centsToDecimal(0), E.centsToDecimal(-7), E.centsToDecimal(123456789012)], ['-185.42', '0.05', '0.00', '-0.07', '1234567890.12'], 'cents to text');
  eq(['1.234,56', '-1,234.56', 'R$ 45,90', '0,1', '1234', '(1.234,56)', '1.234,56-', '45,90 D', '45,90 C', '−12,00', '1.000', '12.345.678,90'].map(E.readAmount), [123456, -123456, 4590, 10, 123400, -123456, -123456, -4590, 4590, -1200, 100000, 1234567890], 'amounts as statements write them');
  for (let c = -30000; c <= 30000; c += 7) eq(E.decimalToCents(E.centsToDecimal(c)), c, 'cents round trip ' + c);
}
// ---------- 5. reminders, bills to come and the card invoice, by hand ----------
{
  const S = E.buildNewState('r@example.org', 'en', '2026-10-10');
  S.accounts = [{ id: 'a', name: 'A', type: 'checking', scope: 'personal', currency: 'BRL', opening: 500000 }, { id: 'card', name: 'Card', type: 'credit', scope: 'personal', currency: 'BRL', opening: 0, dueDay: 31 }, { id: 'pj', name: 'PJ', type: 'checking', scope: 'business', currency: 'BRL', opening: 0, monthly: true, monthlySince: '2026-09' }];
  const line = (id, pay, due, v, acct) => ({ id, name: id, categoryId: 'c', subcategoryId: id, pay, accountId: acct || 'a', due, end: null, note: '', plan: { 2026: Array(12).fill(v) } });
  S.plan.lines = [line('rent', 'fixed', 5, 180000), line('net', 'fixed', 12, 11000), line('power', 'variable', 13, 20000), line('far', 'fixed', 25, 5000), line('noday', 'fixed', null, 6000), line('food', 'budget', null, 120000), line('gym', 'fixed', null, 9990, 'card')];
  const opt = { bills: true, close: true, summary: true, goals: true, lead: 3, closeDay: 15 };
  let r = E.reminders(S, '2026-10-10', CUR, opt), by = k => r.filter(x => x.kind === k);
  eq(by('bill').map(x => [x.lineId, x.when, x.days]), [['rent', 'late', -5], ['net', 'soon', 2], ['power', 'soon', 3]], 'reminders: late, 2 days and 3 days ahead; the one 15 days away is not yet due');
  eq(by('nodue').map(x => [x.lines.map(l => l.id), x.amount]), [[['noday'], 6000]], 'reminders: one item asks for the missing due day (a cost on the card needs none; a budget is not a bill)');
  eq(by('past').length, 0, 'reminders: last month is not chased when nobody was following it');
  S.transactions = [{ id: 't1', accountId: 'a', date: '2026-10-09', amount: -180000, type: 'expense', categoryId: 'c', subcategoryId: 'rent', status: 'confirmed' }, { id: 't2', accountId: 'a', date: '2026-09-12', amount: -11000, type: 'expense', categoryId: 'c', subcategoryId: 'net', status: 'confirmed' }];
  r = E.reminders(S, '2026-10-12', CUR, opt); by = k => r.filter(x => x.kind === k);
  eq(by('bill').map(x => [x.lineId, x.when]), [['net', 'today'], ['power', 'soon']], 'reminders: a paid bill is gone; one due today says today');
  eq(by('past').map(x => [x.ym, x.lines.map(l => l.id).sort(), x.amount]), [['2026-09', ['far', 'noday', 'power', 'rent'], 211000]], 'reminders: last month, once it was followed, lists what was left without a payment');
  eq(by('close').map(x => [x.ym, x.date, x.days, x.sent, x.total]), [['2026-09', '2026-10-15', 3, 0, 1]], 'reminders: the statement of last month is due on day 15');
  S.closes = { '2026-09': { pj: 'sent' } }; eq(E.reminders(S, '2026-10-12', CUR, opt).filter(x => x.kind === 'close').length, 0, 'reminders: a statement marked as sent is no longer reminded');
  eq(E.reminders(S, '2026-10-05', CUR, opt).filter(x => x.kind === 'summary').map(x => [x.ym, x.expenses]), [['2026-09', 11000]], 'reminders: the summary of last month comes in the first week');
  eq(E.reminders(S, '2026-10-12', CUR, opt).filter(x => x.kind === 'summary').length, 0, 'reminders: and not after it');
  // the card: day 31 becomes the last day of a shorter month; what it owes today; paid by a transfer
  S.transactions.push({ id: 't3', accountId: 'card', date: '2026-10-03', amount: -9990, type: 'expense', categoryId: 'c', subcategoryId: 'gym', status: 'confirmed' });
  let c = E.cardInvoices(S, '2026-10-12', CUR);
  eq(c.map(x => [x.ym, x.date, x.days, x.amount, x.paid, x.estimate]), [['2026-10', '2026-10-31', 19, 9990, false, false], ['2026-11', '2026-11-30', 49, 9990, false, true]], 'card: this month it owes what was charged; next month is an estimate from the plan; day 31 of November is the 30th');
  S.transactions.push({ id: 't4', accountId: 'a', date: '2026-10-11', amount: -9990, type: 'transfer', transferAccountId: 'card', status: 'confirmed' }, { id: 't5', accountId: 'card', date: '2026-10-11', amount: 9990, type: 'transfer', transferAccountId: 'a', status: 'confirmed' });
  c = E.cardInvoices(S, '2026-10-12', CUR); eq([c[0].paid, c[0].amount, E.monthSummary(S, '2026-10', CUR).expenses], [true, 0, 189990], 'card: paying the invoice is a transfer; spending counts the purchase once');
  eq(E.upcomingBills(S, '2026-10-12', CUR, 30).map(x => [x.id, x.ym]), [['net', '2026-10'], ['power', '2026-10'], ['far', '2026-10'], ['rent', '2026-11'], ['noday', '2026-10']], 'bills to come: this month’s unpaid, next month’s within 30 days, the ones without a day last');
  // the hand-out of savings: reminded once the money has arrived, or in the last week
  S.pay = { 2026: [{ id: 'p', sub: 'sal', half: 1, to: 'savings', values: Array(12).fill(300000) }] };
  S.goals = [{ id: 'g', name: 'G', kind: 'fund', status: 'active', plan: { 2026: Array(12).fill(100000) } }]; S.goalMoves = [];
  eq(E.reminders(S, '2026-10-12', CUR, opt).filter(x => x.kind === 'handout').length, 0, 'savings: not reminded before the money arrives');
  S.transactions.push({ id: 't6', accountId: 'a', date: '2026-10-11', amount: 300000, type: 'income', subcategoryId: 'sal', status: 'confirmed' });
  eq(E.reminders(S, '2026-10-12', CUR, opt).filter(x => x.kind === 'handout').map(x => [x.amount, x.arrived]), [[100000, true]], 'savings: reminded once the money for savings has arrived');
  S.goalMoves.push({ id: 'm', goalId: 'g', date: '2026-10-12', amount: 100000 });
  eq(E.reminders(S, '2026-10-12', CUR, opt).filter(x => x.kind === 'handout').length, 0, 'savings: no reminder once the month’s contributions are recorded');
  // recurring: a typical amount is the true middle value
  eq([E.median([100, 100, 110, 110]), E.median([5, 1, 9]), E.median([7]), E.median([1, 2])], [105, 5, 7, 2], 'median: the middle value; with an even count, the mean of the two in the middle');
  eq([E.wholeShares([21480, 9200, 3990], 34670), E.wholeShares([1, 1, 1], 3), E.wholeShares([5, 5], 10), E.wholeShares([0, 7], 7), E.wholeShares([3, 3], 0)], [[62, 27, 11], [34, 33, 33], [50, 50], [0, 100], [0, 0]], 'shares: whole numbers that add up to 100, each its exact share rounded down or up');
  for (let seed = 1; seed <= 500; seed++) { const r2 = rng(seed), vals = Array.from({ length: 1 + Math.floor(r2() * 9) }, () => Math.floor(r2() * 500000)), tot = vals.reduce((a, b) => a + b, 0); if (!tot) continue; const sh = E.wholeShares(vals, tot);
    ok(sh.reduce((a, b) => a + b, 0) === 100 && sh.every((p, i) => Math.abs(p - vals[i] * 100 / tot) < 1), 'shares: random parts add up to 100 and none is a whole point off', { vals, sh }); }
}
console.log(`engine-qc: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
