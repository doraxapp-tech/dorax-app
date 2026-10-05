// Runs inside the page. Works every figure out again from the raw data (S), with code written apart from the app's engine,
// then reads what each screen shows and returns [name, shown, expected] for every figure.
window.QC = function () {
  const out = [], CURR = 'BRL';
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const eq = (name, got, want) => out.push([name, norm(got), norm(want)]);
  const group = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const money = (c, o) => { o = o || {}; const neg = c < 0, a = Math.abs(c), whole = group(Math.floor(a / 100)), cents = String(a % 100).padStart(2, '0'); return (neg ? '−' : o.sign && c > 0 ? '+' : '') + (o.bare ? '' : (o.usd ? 'US$ ' : 'R$ ')) + (o.trim && a % 100 === 0 ? whole : whole + ',' + cents); };
  const pct = n => String(n).replace('.', ',') + '%';
  const r1 = (a, b) => Math.round(a * 1000 / b) / 10;
  const parse = s => { s = norm(s).replace(/[R$US\s+≈]/g, ''); if (!s || s === '—') return null; const neg = /^[−-]/.test(s); s = s.replace(/^[−-]/, '').replace(/\./g, '').replace(',', '.'); return Math.round(parseFloat(s) * 100) * (neg ? -1 : 1); };
  const ymOf = d => d.slice(0, 7), dim = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5), 0)).getUTCDate();
  const prevOf = m => { let y = +m.slice(0, 4), k = +m.slice(5) - 1; if (!k) { k = 12; y--; } return y + '-' + String(k).padStart(2, '0'); };
  const acct = id => S.accounts.find(a => a.id === id);
  const home = t => { const a = acct(t.accountId); return a && a.scope !== 'business' && a.currency === CURR && t.status !== 'ignored'; };
  const month = (m, upTo) => { const tx = S.transactions.filter(t => home(t) && ymOf(t.date) === m && (!upTo || t.date <= upTo)); const inc = tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), exp = tx.filter(t => t.type === 'expense').reduce((s, t) => s - t.amount, 0); return { income: inc, expenses: exp, left: inc - exp, count: tx.length }; };
  const spend = (m, upTo) => { const cat = {}, line = {}; S.transactions.filter(t => home(t) && t.type === 'expense' && ymOf(t.date) === m && (!upTo || t.date <= upTo)).forEach(t => (t.splits && t.splits.length ? t.splits : [t]).forEach(p => { const c = p.categoryId || 'other'; cat[c] = (cat[c] || 0) - p.amount; const k = p.subcategoryId || c; line[k] = (line[k] || 0) - p.amount; })); return { cat, line }; };
  const planOf = (l, m) => ((l.plan[m.slice(0, 4)] || [])[+m.slice(5) - 1]) || 0;
  const spentOf = (l, sp) => l.subcategoryId ? (sp.line[l.subcategoryId] || 0) : (sp.cat[l.categoryId] || 0);
  const payRows = (y, to) => ((S.pay || {})[y] || []).filter(r => !to || r.to === to);
  const payPlan = (m, to) => payRows(+m.slice(0, 4), to).reduce((s, r) => s + (r.values[+m.slice(5) - 1] || 0), 0);
  const isStart = x => !!(x.start || (x.k && x.k.note === 'Starting balance'));
  const goalIn = (g, m) => S.goalMoves.filter(x => x.goalId === g.id && !isStart(x) && ymOf(x.date) === m).reduce((s, x) => s + x.amount, 0);
  const goalSaved = g => S.goalMoves.filter(x => x.goalId === g.id).reduce((s, x) => s + x.amount, 0);
  const balance = id => acct(id).opening + S.transactions.filter(t => t.accountId === id && t.status !== 'ignored').reduce((s, t) => s + t.amount, 0);
  const shares = (vals, total) => { const fl = vals.map(v => Math.floor(v * 100 / total)), order = vals.map((v, i) => [(v * 100) % total, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]); let left = 100 - fl.reduce((a, b) => a + b, 0); for (let k = 0; k < left; k++) fl[order[k][1]]++; return fl; };
  const tiles = () => Object.fromEntries([...document.querySelectorAll('#view .tile')].map(k => [norm(k.querySelector('.label span').innerText), [norm(k.querySelector('.value').innerText), norm((k.querySelector('.note') || {}).innerText)]]));
  const kpis = () => Object.fromEntries([...document.querySelectorAll('#view .kpi')].map(k => [norm(k.querySelector('.label span').innerText), [norm(k.querySelector('.value').innerText), norm(k.querySelector('.delta').innerText)]]));
  const grid = sel => [...document.querySelector(sel).rows].map(r => ({ cls: r.className, cells: [...r.cells].map(c => { const i = c.querySelector('input'); return norm(i ? i.value : c.innerText); }) }));
  const ym = S.month, today = S.today, nowYm = ymOf(today), open = ym === nowYm, prev = prevOf(ym), upTo = open ? prev + '-' + String(Math.min(+today.slice(8), dim(prev))).padStart(2, '0') : null;
  const mon = m => new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'));
  const M = month(ym), P = month(prev, upTo), SP = spend(ym), tag = '[' + ym + '] ';

  // ----- dashboard -----
  navigate('dashboard');
  let k = kpis();
  eq(tag + 'dash income', k['Income'][0], money(M.income)); eq(tag + 'dash income plan', k['Income'][1], 'Plan: ' + money(payPlan(ym), { trim: true }));
  eq(tag + 'dash spending', k['Spending'][0], money(M.expenses));
  { const d = P.expenses ? r1(M.expenses - P.expenses, P.expenses) : null; eq(tag + 'dash spending vs', k['Spending'][1], d === null ? '' : `${d > 0 ? '▲' : d < 0 ? '▼' : '•'} ${pct(Math.abs(d))} ${open ? 'vs the same days of ' + mon(prev) : 'vs ' + mon(prev)}`); }
  eq(tag + 'dash left over', k['Left over'][0], M.income ? money(M.left) : '—');
  if (M.income) eq(tag + 'dash left over share', k['Left over'][1], pct(r1(M.left, M.income)) + ' of income');
  eq(tag + 'dash into goals', k['Put into goals'][0], money(S.goals.reduce((s, g) => s + goalIn(g, ym), 0)));
  { const live = S.goals.filter(g => g.status === 'active'), pl = live.reduce((s, g) => s + ((g.plan[ym.slice(0, 4)] || [])[+ym.slice(5) - 1] || 0), 0); eq(tag + 'dash goals planned', k['Put into goals'][1], pl ? 'of ' + money(pl, { trim: true }) + ' planned' : ''); }
  { const cats = S.categories.filter(c => !c.income && SP.cat[c.id] > 0).sort((a, b) => SP.cat[b.id] - SP.cat[a.id]), sh = cats.length && cats.reduce((s, c) => s + SP.cat[c.id], 0) === M.expenses ? shares(cats.map(c => SP.cat[c.id]), M.expenses) : cats.map(c => Math.round(SP.cat[c.id] * 100 / M.expenses));
    eq(tag + 'dash category legend', [...document.querySelectorAll('#cat-card .legend-row')].map(r => norm(r.innerText)).join(' ; '), cats.map((c, i) => `${c.name} ${money(SP.cat[c.id])} ${sh[i]}%`).join(' ; '));
    if (cats.length && cats.reduce((s, c) => s + SP.cat[c.id], 0) === M.expenses) eq(tag + 'dash shares add up to 100', sh.reduce((a, b) => a + b, 0), 100); }
  if (document.querySelector('#goals-card')) eq(tag + 'dash goals total', norm((document.querySelector('#goals-card .figure b') || {}).innerText), money(S.goals.reduce((s, g) => s + goalSaved(g), 0)));
  if (document.querySelector('#todo')) { const head = norm((document.querySelector('#todo .card-h .sub, #todo .figure b, #todo .todo-total') || {}).innerText), rows = [...document.querySelectorAll('#todo .li.todo')].filter(li => li.querySelector('[data-a="line-pay-now"], [data-a="line-pay"], [data-a="card-pay"]') && li.querySelector('small') && !li.classList.contains('past'));
    const total = rows.reduce((s, li) => s + parse(norm(li.querySelector('small').innerText).split('·')[0]), 0), txt = norm(document.querySelector('#todo').innerText);
    if (rows.length) eq(tag + 'dash to-do total = its rows', /R\$ [\d.,]+ to pay in the next 30 days/.test(txt) ? txt.match(/(R\$ [\d.,]+) to pay in the next 30 days/)[1] : txt.slice(0, 60), money(total)); }

  // ----- plan -----
  navigate('plan');
  { const tl = tiles(), lines = S.plan.lines, fixed = lines.reduce((s, l) => s + planOf(l, ym), 0), paid = lines.reduce((s, l) => s + spentOf(l, SP), 0);
    const toPay = lines.reduce((s, l) => { const p = planOf(l, ym), sp = spentOf(l, SP); return s + (l.pay !== 'budget' ? (sp === 0 ? p : 0) : Math.max(0, p - sp)); }, 0);
    eq(tag + 'plan fixed costs', tl['Fixed costs, ' + mon(ym)][0], money(fixed)); eq(tag + 'plan paid so far', tl['Paid so far'][0], money(paid)); eq(tag + 'plan still to pay', tl['Still to pay'][0], money(toPay));
    eq(tag + 'plan income minus fixed', tl['Income minus fixed costs'][0], money(payPlan(ym, 'fixed') - fixed)); }
  for (const mode of ['plan', 'actual', 'diff']) {
    UI.planMode = mode; renderNow();
    const year = +document.querySelector('#plan-year .stepper').innerText.match(/\d{4}/)[0], g = grid('#plan-year table'), months = Array.from({ length: 12 }, (_, i) => year + '-' + String(i + 1).padStart(2, '0'));
    const sp = months.map(m => m <= nowYm ? spend(m) : null);
    const lineVal = (l, i) => mode === 'plan' ? planOf(l, months[i]) : !sp[i] ? null : mode === 'actual' ? spentOf(l, sp[i]) : spentOf(l, sp[i]) - planOf(l, months[i]);
    const arrived = (r, m) => { const all = S.transactions.filter(t => home(t) && t.type === 'income' && ymOf(t.date) === m && t.subcategoryId === r.sub && (!r.half || (r.half === 1) === (+t.date.slice(8) <= 15))).reduce((s, t) => s + t.amount, 0); const tw = payRows(year).filter(x => x.sub === r.sub && (x.half || 0) === (r.half || 0)); if (tw.length < 2) return all; const i = +m.slice(5) - 1, tot = tw.reduce((s, x) => s + (x.values[i] || 0), 0); if (!tot) return tw[0] === r ? all : 0; const cum = n => Math.round(all * tw.slice(0, n).reduce((s, x) => s + (x.values[i] || 0), 0) / tot), at = tw.indexOf(r); return cum(at + 1) - cum(at); };
    const payVal = (r, i) => mode === 'plan' ? r.values[i] || 0 : !sp[i] ? null : mode === 'actual' ? arrived(r, months[i]) : arrived(r, months[i]) - (r.values[i] || 0);
    const show = v => v === null ? '—' : mode === 'diff' ? (v === 0 ? '0' : money(v, { bare: true, trim: true, sign: true })) : (v === 0 ? '0' : money(v, { bare: true, trim: true }));
    const byName = n => g.find(r => r.cells[0].replace(/ Ends .*$/, '') === n);
    const lines = S.plan.lines.filter(l => (l.plan[year] || []).reduce((a, b) => a + b, 0) > 0 || !l.end || l.end >= year + '-01'), inc = payRows(year, 'fixed');
    const rowWant = vals => [...vals.map(show), show(vals.reduce((a, b) => a + (b || 0), 0))].join(' | ');
    for (const l of lines) { const r = byName(l.name); eq(`${tag}plan grid ${mode}: ${l.name}`, r ? r.cells.slice(1).join(' | ') : 'ROW MISSING', rowWant(months.map((m, i) => lineVal(l, i)))); }
    for (const r0 of inc) { const r = byName(r0.name); eq(`${tag}plan grid ${mode}: ${r0.name}`, r ? r.cells.slice(1).join(' | ') : 'ROW MISSING', rowWant(months.map((m, i) => payVal(r0, i)))); }
    const colSum = (xs, f) => months.map((m, i) => { const v = xs.map(x => f(x, i)); return v.some(x => x === null) ? null : v.reduce((a, b) => a + b, 0); });
    eq(`${tag}plan grid ${mode}: income total`, byName('Income for fixed costs').cells.slice(1).join(' | '), rowWant(colSum(inc, payVal)));
    for (const c of S.categories.filter(c => lines.some(l => l.categoryId === c.id))) eq(`${tag}plan grid ${mode}: Total ${c.name}`, byName('Total ' + c.name).cells.slice(1).join(' | '), rowWant(colSum(lines.filter(l => l.categoryId === c.id), lineVal)));
    eq(`${tag}plan grid ${mode}: total fixed`, byName('Total fixed monthly costs').cells.slice(1).join(' | '), rowWant(colSum(lines, lineVal)));
    { const a = colSum(inc, payVal), b = colSum(lines, lineVal), net = months.map((m, i) => a[i] === null || b[i] === null ? null : a[i] - b[i]), fmtNet = v => v === null ? '—' : mode === 'diff' ? show(v) : money(v, { bare: true, trim: true });
      eq(`${tag}plan grid ${mode}: income minus fixed`, byName('Income minus fixed costs').cells.slice(1).join(' | '), [...net.map(fmtNet), fmtNet(net.reduce((x, y) => x + (y || 0), 0))].join(' | ')); }
  }
  UI.planMode = 'plan';

  // ----- goals -----
  navigate('goals');
  { const tl = tiles(), live = S.goals.filter(g => g.status === 'active'), y = ym.slice(0, 4), i = +ym.slice(5) - 1, pl = live.reduce((s, g) => s + ((g.plan[y] || [])[i] || 0), 0);
    eq(tag + 'goals saved total', tl['Saved in goals and funds'][0], money(S.goals.reduce((s, g) => s + goalSaved(g), 0)));
    eq(tag + 'goals plan', tl['Plan for ' + mon(ym)][0], money(pl)); eq(tag + 'goals recorded', tl['Recorded in ' + mon(ym)][0], money(live.reduce((s, g) => s + goalIn(g, ym), 0)));
    eq(tag + 'goals left over', (tl['Left over'] || tl[S.remainderLabel] || Object.values(tl)[3])[0], money(payPlan(ym, 'savings') - pl));
    for (const mode of ['plan', 'actual', 'diff']) {
      UI.goalMode = mode; renderNow();
      const year = +document.querySelector('table.alloc').closest('section').querySelector('.stepper').innerText.match(/\d{4}/)[0], g = grid('table.alloc'), months = Array.from({ length: 12 }, (_, i) => year + '-' + String(i + 1).padStart(2, '0'));
      if (mode !== 'plan') continue;
      const inc = payRows(year, 'savings'), gs = S.goals.filter(x => g.some(r => r.cells[0].startsWith(x.name)));
      const last = g[g.length - 1], rem = months.map((m, i) => inc.reduce((s, r) => s + (r.values[i] || 0), 0) - S.goals.filter(x => x.status === 'active').reduce((s, x) => s + ((x.plan[year] || [])[i] || 0), 0));
      eq(tag + 'goals grid: remainder row', last.cells.slice(1).map(parse).join(' | '), [...rem, rem.reduce((a, b) => a + b, 0)].join(' | '));
      for (const x of gs) { const r = g.find(r => r.cells[0].startsWith(x.name)), v = months.map((m, i) => (x.plan[year] || [])[i] || 0); eq(tag + 'goals grid: ' + x.name, r.cells.slice(1).map(parse).join(' | '), [...v, v.reduce((a, b) => a + b, 0)].join(' | ')); }
    }
    UI.goalMode = 'plan'; }

  // ----- investments -----
  navigate('investments');
  { const tl = tiles(), tks = [...new Set([...Object.keys(S.fii.assets), ...S.fii.moves.map(m => m.ticker)])].sort();
    const pos = tks.map(tk => { const mv = S.fii.moves.map((m, i) => [m, i]).filter(x => x[0].ticker === tk).sort((a, b) => (a[0].kind === 'open' ? 0 : 1) - (b[0].kind === 'open' ? 0 : 1) || (a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : 0) || a[1] - b[1]).map(x => x[0]); let q = 0, c = 0, inc = 0, last = null;
      for (const m of mv) { if (m.kind === 'open' || m.kind === 'buy') { q += m.qty; c += m.qty * m.price + (m.fees || 0); } else if (m.kind === 'sell') { const o = Math.round(c * m.qty / q); c -= o; q -= m.qty; } else { inc += m.amount; last = { amount: m.amount, qty: q }; } }
      const a = S.fii.assets[tk] || {}, price = a.price || (q ? Math.round(c / q) : 0); return { tk, q, c, inc, value: q * price, monthly: last && last.qty ? Math.round(last.amount * q / last.qty) : q * (a.lastYield || 0) }; }).filter(p => p.q > 0);
    const cost = pos.reduce((s, p) => s + p.c, 0), value = pos.reduce((s, p) => s + p.value, 0), monthly = pos.reduce((s, p) => s + p.monthly, 0), yr = today.slice(0, 4);
    eq(tag + 'fii invested', tl['Invested'][0], money(cost)); eq(tag + 'fii invested note', tl['Invested'][1], `${pos.length} FIIs · ${pos.reduce((s, p) => s + p.q, 0)} quotas`);
    eq(tag + 'fii value', tl['Value at today’s prices'][0], money(value)); eq(tag + 'fii result', tl['Value at today’s prices'][1], cost ? `${money(value - cost, { sign: true })} ${value - cost > 0 ? '▲' : value - cost < 0 ? '▼' : ''} ${pct(Math.abs(r1(value - cost, cost)))}`.replace(/\s+/g, ' ') : '');
    eq(tag + 'fii income year', tl['Income received in ' + yr][0], money(S.fii.moves.filter(m => m.kind === 'income' && m.date.slice(0, 4) === yr).reduce((s, m) => s + m.amount, 0)));
    eq(tag + 'fii monthly', tl['Monthly income, last distribution'][0], money(monthly)); eq(tag + 'fii yield', tl['Monthly income, last distribution'][1], value ? pct(Math.round(monthly * 10000 / value) / 100) + ' of the value a month' : '');
    const g = grid('table.fii');
    for (const p of pos) { const r = g.find(r => r.cells[0] === p.tk); eq(tag + 'fii row ' + p.tk, r ? [r.cells[1], r.cells[2], r.cells[4], r.cells[7]].join(' | ') : 'ROW MISSING', [p.q, money(Math.round(p.c / p.q)), money(p.value), money(p.monthly)].join(' | ')); } }

  // ----- reports -----
  navigate('reports');
  if (M.count) { const tl = tiles(); eq(tag + 'rep income', tl['Income'][0], money(M.income)); eq(tag + 'rep expenses', tl['Expenses'][0], money(M.expenses)); eq(tag + 'rep left over', tl['Left over'][0], money(M.left)); eq(tag + 'rep share', tl['Left over, share of income'][0], M.income > 0 ? pct(r1(M.left, M.income)) : '—');
    const g = grid('#view table.tbl'), PS = spend(prev, upTo), row = (cur, pv) => { const d = cur - pv, pc = pv ? r1(d, Math.abs(pv)) : null; return [money(cur), P.count ? money(pv) : '—', P.count ? money(d, { sign: true }) : '—', pc === null || !P.count ? '—' : `${pc > 0 ? '▲' : pc < 0 ? '▼' : ''} ${pct(Math.abs(pc))}`.trim()].join(' | '); };
    const find = n => g.find(r => r.cells[0] === n);
    eq(tag + 'rep compare income', find('Income').cells.slice(1).join(' | '), row(M.income, P.income)); eq(tag + 'rep compare expenses', find('Expenses').cells.slice(1).join(' | '), row(M.expenses, P.expenses)); eq(tag + 'rep compare left over', find('Left over').cells.slice(1).join(' | '), row(M.left, P.left));
    for (const c of S.categories.filter(c => !c.income && (SP.cat[c.id] || PS.cat[c.id]))) { const r = find(c.name); if (r) eq(tag + 'rep compare ' + c.name, r.cells.slice(1).join(' | '), row(SP.cat[c.id] || 0, PS.cat[c.id] || 0)); }
    const top = Object.entries(SP.line).filter(l => l[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
    eq(tag + 'rep largest lines', [...document.querySelectorAll('#view .hbar')].map(h => norm(h.querySelector('.num').innerText)).join(' ; '), top.map(([id, v]) => `${Math.round(v * 100 / M.expenses)}% · R$ ${group(Math.round(v / 100))}`).join(' ; ')); }

  // ----- accounts -----
  navigate('accounts');
  { const tl = tiles(), hh = S.accounts.filter(a => a.scope !== 'business' && a.currency === CURR);
    eq(tag + 'accounts household net', tl['Household net balance'][0], money(hh.reduce((s, a) => s + balance(a.id), 0)));
    eq(tag + 'accounts company BRL', (tl['Company, BRL'] || ['—'])[0], money(S.accounts.filter(a => a.scope === 'business' && a.currency === 'BRL').reduce((s, a) => s + balance(a.id), 0)));
    const cards = [...document.querySelectorAll('#view .card.acct')];
    S.accounts.forEach((a, i) => { const txt = norm(cards[i].innerText), b = balance(a.id), want = money(a.type === 'credit' ? -b : b, { usd: a.currency === 'USD' }); eq(tag + 'account ' + a.name, txt.includes(want) ? want : txt.slice(0, 120), want);
      if (a.type === 'credit' && a.creditLimit) eq(tag + 'card limit used ' + a.name, (txt.match(/(\d+[,.]?\d*)% of/) || [])[1], String(Math.min(100, Math.max(0, Math.round(-b * 100 / a.creditLimit))))); }); }

  // ----- transactions (the default view: this month, household) -----
  navigate('transactions');
  { const txt = norm((document.querySelector('#tx-card .tx-sum, #tx-card .note, #tx-card .card-h') || document.querySelector('#tx-card')).innerText), list = S.transactions.filter(t => { const a = acct(t.accountId); return a && a.scope !== 'business' && ymOf(t.date) === ym; });
    const sp = list.filter(t => t.type === 'expense' && t.status !== 'ignored' && t.currency === CURR).reduce((s, t) => s - t.amount, 0), inc = list.filter(t => t.type === 'income' && t.status !== 'ignored' && t.currency === CURR).reduce((s, t) => s + t.amount, 0);
    const m = norm(document.querySelector('#view').innerText).match(/(\d+) transactions? · Spending (R\$ [\d.,]+) · Income (R\$ [\d.,]+)/);
    if (list.length) eq(tag + 'transactions summary', m ? m.slice(1).join(' | ') : 'NO SUMMARY', [list.length, money(sp), money(inc)].join(' | ')); }
  navigate('dashboard');
  return out;
};
