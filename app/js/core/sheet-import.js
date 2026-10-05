/* Dorax Finance — spreadsheet import: writing what was reviewed into the account. */
// ---------- writing what was reviewed ----------
const sameName = (a, b) => sheetNorm(a) === sheetNorm(b);
/** What an import would do, row by row, without changing anything: 'new' or 'update'. Used by the review screen. */
function sheetRowMatch(state, unit, row) {
  if (unit.table === 'fii') return state.fii.moves.some(m => m.ticker === row.ticker) ? 'exists' : 'new';
  if (row.as === 'line') return state.plan.lines.some(l => sameName(l.name, row.label)) ? 'update' : 'new';
  if (row.as === 'fund' || row.as === 'goal') return state.goals.some(g => sameName(g.name, row.label)) ? 'update' : 'new';
  if (row.as === 'income') return matchPay(state, unit, row) ? 'update' : 'new';
  return '';
}
/** Income rows match by name within the same destination: "Sueldo" finds "Sueldo · 1.er pago". */
function matchPay(state, unit, row) {
  const to = unit.kind === 'goals' ? 'savings' : 'fixed', n = sheetNorm(row.label.replace(/\([^)]*\)/g, ' ')) || sheetNorm(row.label);
  const all = Object.values(state.pay || {}).flat().filter(r => r.to === to);
  return all.find(r => sheetNorm(r.name) === n) || all.find(r => sheetNorm(r.name).startsWith(n + ' ') || n.startsWith(sheetNorm(r.name) + ' ')) || null;
}
/** What the app already knows wins over a guess: a cost that exists keeps how it is paid and its due day, and a group that exists is the default target. */
function sheetPrefill(state, units) {
  for (const u of units) {
    if (u.table !== 'months') continue;
    for (const x of u.rows) { const l = state.plan.lines.find(k => sameName(k.name, x.label)); if (l) { x.pay = l.pay; x.due = x.due || l.due || null; } }
    for (const g of u.groups) { const c = state.categories.find(k => !k.income && sameName(k.name, g.name)); g.target = c ? c.id : 'new'; }
  }
  return units;
}
/** Problems that must be fixed before importing. */
function sheetProblems(units) {
  const out = [], seen = {};
  for (const u of units) {
    if (u.kind === 'skip' || u.table !== 'months') continue;
    if (!(u.year >= 2000 && u.year <= 2099)) out.push({ unit: u.id, code: 'year' });
    const k = u.kind + '|' + u.year; if (seen[k]) out.push({ unit: u.id, code: 'same-year', other: seen[k] }); else seen[k] = u.id;
  }
  return out;
}
/** Applies the reviewed units. Lines, goals and income are matched by name: a match gets that year's amounts replaced, anything else is created.
    opt: { newId, colors: unused category colours }. Returns counts for the summary. */
function applySheetImport(state, units, opt) {
  const newId = opt.newId, rep = { due: 0, groups: 0, fii: 0, fiiKept: 0, years: new Set() }, made = { lines: new Set(), income: new Set(), goals: new Set() }, changed = { lines: new Set(), income: new Set(), goals: new Set() };
  const incomeCat = state.categories.find(c => c.income), touchedGoals = new Set();
  const catFor = name => {
    const label = name || opt.otherName || 'Other';
    let c = state.categories.find(x => !x.income && sameName(x.name, label));
    if (!c) { const used = new Set(state.categories.map(x => x.color)), color = ['s3', 's2', 's1', 's4', 's7', 's6', 's5'].find(x => !used.has(x)) || 's4'; c = { id: newId('c'), name: label, color, subs: [] }; state.categories.splice(Math.max(0, state.categories.findIndex(x => x.income)), 0, c); rep.groups++; }
    return c;
  };
  const incomeSub = name => {
    let s = incomeCat.subs.find(x => sameName(x.name, name)) || incomeCat.subs.find(x => sheetNorm(name).startsWith(sheetNorm(x.name)) || sheetNorm(x.name).startsWith(sheetNorm(name)));
    if (!s) { s = { id: newId('s'), name }; incomeCat.subs.push(s); }
    return s;
  };
  for (const u of units) {
    if (u.kind === 'skip') continue;
    if (u.table === 'fii') {
      for (const x of u.rows) {
        if (x.skip || !x.qty || !x.price) continue;
        if (state.fii.moves.some(m => m.ticker === x.ticker)) { rep.fiiKept++; continue; }
        state.fii.moves.push({ id: newId('fm'), ticker: x.ticker, kind: 'open', date: '', qty: x.qty, price: x.price, fees: 0, note: '' });
        state.fii.assets[x.ticker] = { ...(state.fii.assets[x.ticker] || {}), price: x.price, ...(x.lastYield ? { lastYield: x.lastYield } : {}) }; rep.fii++;
      }
      continue;
    }
    const year = u.year; rep.years.add(year);
    state.pay[year] = state.pay[year] || [];
    for (const x of u.rows) {
      if (x.as === 'skip') continue;
      const name = x.label.trim(), values = x.values.slice();
      if (x.as === 'income') {
        const to = u.kind === 'goals' ? 'savings' : 'fixed', known = matchPay(state, u, x);
        let row = state.pay[year].find(r => known ? r.id === known.id : false);
        if (row) { row.values = values; changed.income.add(row.id); }
        else if (known) { state.pay[year].push({ ...known, values }); changed.income.add(known.id); }
        else { const id = newId('pay'); state.pay[year].push({ id, name, sub: incomeSub(name).id, half: 0, to, values }); made.income.add(id); }
      } else if (x.as === 'line') {
        let l = state.plan.lines.find(k => sameName(k.name, name));
        if (l) changed.lines.add(l.id);
        else {
          const g = (u.groups.find(k => k.key === x.group) || {}).name, cat = catFor(g), sub = { id: newId('s'), name };
          cat.subs.push(sub); l = { id: newId('pl'), categoryId: cat.id, subcategoryId: sub.id, name, pay: x.pay || 'fixed', accountId: null, end: null, note: '', plan: {} };
          state.plan.lines.push(l); made.lines.add(l.id);
        }
        l.plan[year] = values; if (x.pay) l.pay = x.pay;
        if (x.due && l.pay !== 'budget' && l.due !== x.due) { l.due = x.due; rep.due++; }
      } else {
        let g = state.goals.find(k => sameName(k.name, name));
        if (g) changed.goals.add(g.id);
        else { g = { id: newId('g'), name, kind: x.as === 'goal' ? 'goal' : 'fund', target: null, deadline: null, accountId: null, status: 'active', note: '', plan: {}, fromSheet: x.as === 'goal' }; state.goals.push(g); made.goals.add(g.id); }
        g.plan[year] = values; touchedGoals.add(g);
      }
    }
  }
  // a goal brought in "with a target" aims at everything the sheet plans for it, and its date is the last planned month
  for (const g of touchedGoals) {
    if (!g.fromSheet) continue;
    let total = 0, last = null;
    for (const y of Object.keys(g.plan).sort()) g.plan[y].forEach((v, i) => { total += v || 0; if (v) last = y + '-' + String(i + 1).padStart(2, '0'); });
    if (total > 0) { g.target = total; g.deadline = last; } else { g.kind = 'fund'; g.target = null; g.deadline = null; }
  }
  for (const g of state.goals) for (const y of rep.years) g.plan[y] = g.plan[y] || Array(12).fill(0);
  for (const k of ['lines', 'income', 'goals']) { rep[k] = made[k].size; rep[k + 'Updated'] = [...changed[k]].filter(id => !made[k].has(id)).length; }
  rep.years = [...rep.years].sort();
  return rep;
}
