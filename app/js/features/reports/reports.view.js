/* Dorax Finance — screen: Reports. */
// ---------- Reports ----------
function recurringTotal(ym, upTo) {
  const keys = new Set(recurringList(S, S.today).map(r => r.accountId + '|' + normalizeText(r.merchant)));
  return -S.transactions.filter(x => x.type === 'expense' && x.status !== 'ignored' && x.currency === CUR && ymOf(x.date) === ym && (!upTo || x.date <= upTo) && keys.has(x.accountId + '|' + normalizeText(x.merchant))).reduce((s, x) => s + x.amount, 0);
}
/** The company's own report (owner, 2026-10-07: "that side has no reports of its own yet"): its year, month by month, in the currency shown.
    What came in, what it cost and what was left, with the year's total: the table a company is asked for, and the one the household's report
    does not have. Months still to come are not listed; a month's name opens it. Figures are whole units, so three of them fit a phone. */
function reportYear(bk, CUR, L, co, least) {
  const year = S.month.slice(0, 4), nowYm = ymOf(S.today), months = Array.from({ length: 12 }, (_, i) => year + '-' + String(i + 1).padStart(2, '0')).filter(m => m <= nowYm);
  const all = months.map(m => [m, monthSummary(bk, m, CUR)]), first = all.findIndex(r => r[1].count), rows = first < 0 ? [] : all.slice(first), any = rows.filter(r => r[1].count);      // from the first month with movements
  if (!any.length || any.length < (least || 1)) return '';
  const unit = v => Math.round(v / 100) * 100, n = (v, signed) => `<span class="${signed && v < 0 ? 'neg' : ''}">${fmt.money(v, null, { bare: true, round: true })}</span>`, tot = k => sum(any.map(r => r[1][k]));
  const left = (inc, exp) => unit(inc) - unit(exp);      // each row adds up as it is shown: the result is the two rounded figures' difference
  return `<section class="card" id="rep-year"><div class="card-h"><h2>${t('The year, month by month')}</h2>${info(co === false ? t('What came into your household accounts, what went out and what was left in each month of the year. Transfers are not counted. Figures are rounded to the unit. A month’s name opens that month.') : t('What the company received, what it cost and what was left in each month of the year, from its movements in this currency. Transfers are not counted. Figures are rounded to the unit. A month’s name opens that month.'))}<span class="sub">${year} · ${CUR}</span></div>
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl" id="rep-year-tbl"><thead><tr><th>${t('Month')}</th><th class="r">${L.inc}</th><th class="r">${L.exp}</th><th class="r">${L.left}</th></tr></thead><tbody>
      ${rows.map(([m, v]) => `<tr${m === S.month ? ' class="now"' : ''}><td><button class="linkbtn" data-a="set-month" data-ym="${m}"${m === S.month ? ' aria-current="true"' : ''} aria-label="${mon(+m.slice(5) - 1, true)}"><span class="m-long">${mon(+m.slice(5) - 1, true)}</span><span class="m-short" aria-hidden="true">${mon(+m.slice(5) - 1)}</span></button></td>${v.count ? `<td class="amt">${n(v.income)}</td><td class="amt">${n(v.expenses)}</td><td class="amt">${n(left(v.income, v.expenses), true)}</td>` : `<td class="amt muted">—</td><td class="amt muted">—</td><td class="amt muted">—</td>`}</tr>`).join('')}
      <tr class="sumrow grand"><th scope="row">${t('Total {year}', { year })}</th><td class="amt">${n(tot('income'))}</td><td class="amt">${n(tot('expenses'))}</td><td class="amt">${n(left(tot('income'), tot('expenses')), true)}</td></tr>
    </tbody></table></div></div></section>`;
}
// ---------- a computer's Reports (owner, 2026-10-09: "the Reports tab on the computer is very basic, it gives me almost no information"):
// besides the month's figures, how the months compare (income and spending over a year, each category over six months), who the money went to,
// and how the balance moved. Each piece answers one question; figures come from the same transactions as everywhere else.
/** Axis marks for amounts from lo to hi (cents): a round step that gives three to five marks, zero always one of them. */
function niceTicks(lo, hi) {
  const span = Math.max(1, hi - lo), step = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000, 2000000, 2500000, 5000000, 10000000, 20000000, 50000000].find(x => span / x <= 4) || 100000000;
  const bottom = Math.min(0, Math.floor(lo / step) * step), top = Math.max(step, Math.ceil(hi / step) * step), ticks = [];
  for (let v = bottom; v <= top; v += step) ticks.push(v);
  return { ticks, bottom, top };
}
const axisMark = v => v < 0 ? '−' + fmt.axis(-v) : fmt.axis(v);
/** The months of a report: up to twelve (or `n`) ending with the one shown, from the first that has any movement. */
function repMonths(bk, CUR, ym, n) {
  const out = []; for (let y = addMonths(ym, -(n || 12) + 1); y <= ym; y = addMonths(y, 1)) out.push([y, monthSummary(bk, y, CUR)]);
  const first = out.findIndex(r => r[1].count); return first < 0 ? [] : out.slice(first);
}
/** Income and spending side by side for each month: one scale, the two colours named in the legend with the month shown's figures, each month's
    three figures on hover, a month opened by pressing it. Under it, the average of the months already closed. */
function repTrend(rows, ym, CUR, L, co) {
  if (rows.length < 2) return '';      // one month is what the tiles above already say
  const nowYm = ymOf(S.today), { ticks, top } = niceTicks(0, Math.max(1, ...rows.flatMap(([, v]) => [v.income, v.expenses]))), h = v => v > 0 ? Math.max(0.8, v * 100 / top) : 0;
  const done = rows.filter(([m, v]) => m !== nowYm && v.count), avg = k => Math.round(sum(done.map(r => r[1][k])) / Math.max(1, done.length));
  const inc = sum(done.map(r => r[1].income)), rate = inc > 0 ? Math.round((inc - sum(done.map(r => r[1].expenses))) * 1000 / inc) / 10 : null, sel = (rows.find(r => r[0] === ym) || [])[1];
  const say = (m, v) => `${fmt.month(m)}${m === nowYm ? ' ' + t('(month in progress)') : ''} · ${L.inc} ${fmt.money(v.income, CUR)} · ${L.exp} ${fmt.money(v.expenses, CUR)} · ${L.left} ${fmt.money(v.saved, CUR)}`;
  return `<section class="card" id="rep-trend"><div class="card-h"><h2>${co ? t('Received and costs, month by month') : t('Income and spending, month by month')}</h2>${info(t('What came in and what went out in each of the last twelve months, from the first with movements. Transfers are not counted. Press a month to open it. The average counts the months already closed.'))}
      <div class="rep-legend right">${[['in', L.inc, sel && sel.income], ['out', L.exp, sel && sel.expenses]].map(([k, l, v]) => `<span><i class="sw ${k}" aria-hidden="true"></i>${esc(l)}${sel ? ` <b class="num">${fmt.money(v, CUR, { round: true })}</b>` : ''}</span>`).join('')}<span class="muted">${fmt.month(ym, 'bare')}</span></div></div>
    <div class="card-b"><div class="cols pair"><div class="yaxis" aria-hidden="true">${ticks.map(v => `<span>${axisMark(v)}</span>`).join('')}</div>
      <div class="plot">${ticks.map((v, i) => `<div class="gl ${i === 0 ? 'base' : ''}" style="bottom:calc(24px + (100% - 24px) * ${v / top})"></div>`).join('')}
      ${rows.map(([m, v], i) => `<button class="colbtn" data-a="set-month" data-ym="${m}" aria-pressed="${m === ym}" data-tip="${esc(say(m, v))}" aria-label="${esc(say(m, v))}"><span class="bars"><i class="in" style="height:${h(v.income)}%;--i:${i}"></i><i class="out" style="height:${h(v.expenses)}%;--i:${i}"></i></span><span class="x">${fmt.month(m, 'bare')}</span></button>`).join('')}</div></div>
      ${done.length ? `<p class="rep-avg"><b>${tn(done.length, 'Average of {n} month', 'Average of {n} months')}</b> <span>${L.inc} <b class="num">${fmt.money(avg('income'), CUR, { round: true })}</b></span> <span>${L.exp} <b class="num">${fmt.money(avg('expenses'), CUR, { round: true })}</b></span> <span>${L.left} <b class="num">${fmt.money(avg('saved'), CUR, { round: true })}</b></span>${rate === null ? '' : ` <span>${co ? t('{pct} of what was received', { pct: fmt.pct(rate) }) : t('{pct} of income', { pct: fmt.pct(rate) })}</span>`}</p>` : ''}</div></section>`;
}
/** Each category over the last six months: what it cost each month, its average over the months already closed, and the month shown against
    that average. A category's name opens its transactions of the month shown. */
function repMatrix(bk, CUR, ym, co) {
  const months = repMonths(bk, CUR, ym, 6).map(r => r[0]); if (months.length < 2) return '';
  const nowYm = ymOf(S.today), tot = months.map(m => categoryTotals(bk, m, CUR).byCat), inProg = ym === nowYm;
  const known = id => bk.categories.some(c => c.id === id), rows = bk.categories.filter(c => !c.income).map(c => [c.id, c.name, c.id]);
  if (co) rows.push(['none', t('Not filed yet'), null]);
  const val = (id, i) => id === 'none' ? sum(Object.keys(tot[i]).filter(k => !known(k)).map(k => tot[i][k])) : tot[i][id] || 0;
  const base = months.map((m, i) => i).filter(i => months[i] !== ym && months[i] !== nowYm), at = months.indexOf(ym);
  const lines = rows.map(([id, name, catId]) => { const vs = months.map((m, i) => val(id, i)), a = base.length ? Math.round(sum(base.map(i => vs[i])) / base.length) : null; return { id, name, catId, vs, a }; })
    .filter(l => l.vs.some(v => v)).sort((x, y) => y.vs[at] - x.vs[at] || (y.a || 0) - (x.a || 0));
  if (!lines.length) return '';
  const n = v => fmt.money(v, null, { bare: true, round: true }), totals = months.map((m, i) => sum(lines.map(l => l.vs[i]))), ta = base.length ? Math.round(sum(base.map(i => totals[i])) / base.length) : null;
  // a closed month against the average: how much more or less; the month in progress: how much of an average month it has used so far
  const vsAvg = (v, a) => { if (a === null || !a) return '<span class="muted">—</span>'; if (inProg) return fmt.pct(Math.round(v * 100 / a)); const pc = Math.round((v - a) * 1000 / a) / 10; return `${pc > 0 ? '▲' : pc < 0 ? '▼' : ''} ${fmt.pct(Math.abs(pc))}`; };
  const head = months.map(m => `<th class="r${m === ym ? ' now' : ''}">${fmt.month(m, 'bare')}${m === nowYm ? '*' : ''}</th>`).join('');
  return `<section class="card" id="rep-matrix"><div class="card-h"><h2>${co ? t('Costs by group, month by month') : t('Categories, month by month')}</h2>${info(t('What each category cost in each of the last six months, its monthly average over the other months already closed, and the month shown against that average (while a month is in progress, how much of the average it has used so far). Press a category to see its transactions of the month shown. A month marked * is still in progress.'))}<span class="sub">${CUR} · ${t('rounded to the unit')}</span></div>
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl" id="rep-matrix-tbl"><thead><tr><th>${co ? t('Group') : t('Category')}</th>${head}<th class="r">${t('Average')}</th><th class="r">${inProg ? t('Share of the average') : t('vs average')}</th></tr></thead><tbody>
      ${lines.map(l => `<tr><td><button class="linkbtn cat" data-a="filter-cat" data-cat="${esc(l.id === 'other' ? 'none' : l.id)}"><span class="dot" style="background:${l.catId ? catColor(l.catId) : 'var(--col-muted)'}" aria-hidden="true"></span>${esc(l.name)}</button></td>${l.vs.map((v, i) => `<td class="amt${months[i] === ym ? ' now' : ''}">${v ? n(v) : '<span class="muted">—</span>'}</td>`).join('')}<td class="amt muted">${l.a === null ? '—' : n(l.a)}</td><td class="amt">${vsAvg(l.vs[at], l.a)}</td></tr>`).join('')}
      <tr class="sumrow grand"><th scope="row">${t('Total')}</th>${totals.map((v, i) => `<td class="amt${months[i] === ym ? ' now' : ''}">${n(v)}</td>`).join('')}<td class="amt">${ta === null ? '—' : n(ta)}</td><td class="amt">${vsAvg(totals[at], ta)}</td></tr>
    </tbody></table></div></div></section>`;
}
/** Who the money went to in the month shown: the merchants with the most spending, how many times, and their share. A name opens its transactions.
    Each bar wears the colour of the category most of that merchant's spending went to (owner, 2026-10-09: "add colour to the bars"). */
function repMerchants(bk, CUR, ym, m, co) {
  const by = {}; bk.transactions.filter(x => x.type === 'expense' && inScope(bk, x, ym, CUR)).forEach(x => { const k = normalizeText(x.merchant) || '—'; const o = by[k] || (by[k] = { name: x.merchant || t('Other'), v: 0, n: 0 }); o.v -= x.amount; o.n++; });
  const rows = Object.values(by).filter(o => o.v > 0).sort((a, b) => b.v - a.v).slice(0, 8), max = Math.max(1, ...rows.map(o => o.v)), mc = merchantCats(bk, ym, CUR);
  const col = o => { const c = mc[normalizeText(o.name) || '—']; return c ? catColor(c) : 'var(--col-muted)'; }, cname = o => { const c = mc[normalizeText(o.name) || '—']; return c ? ' · ' + ((bk.categories.find(k => k.id === c) || {}).name || '') : ''; };
  return `<section class="card" id="rep-merchants"><div class="card-h"><h2>${co ? t('Who was paid the most') : t('Where you spent the most')}</h2>${info(t('The merchants with the most spending in the month shown, how many payments each, and their share of the month’s spending. Press a name to see its transactions.'))}<span class="sub">${fmt.month(ym)}</span></div><div class="card-b">
    ${rows.map(o => `<div class="hbar rep-mer"><button class="linkbtn" data-a="filter-q" data-q="${esc(o.name)}" data-tip="${esc(o.name + cname(o))}">${esc(o.name)}</button><div class="track"><i style="width:${o.v * 100 / max}%;background:${col(o)}"></i></div><span class="num">${fmt.money(o.v, CUR, { round: true })} <span class="muted">· ${tn(o.n, '{n} payment', '{n} payments')}${m.expenses > 0 ? ' · ' + fmt.pct(Math.round(o.v * 100 / m.expenses)) : ''}</span></span></div>`).join('') || `<div class="empty">${t('No spending recorded this month.')}</div>`}</div></section>`;
}
/** The balance at the end of each month (the month in progress, today): what is in the accounts of this side and currency, less what is owed on
    cards. One line, its value on hover, the month shown marked. */
function repBalance(rows, ym, CUR, co) {
  if (rows.length < 2) return '';
  const accts = (co ? bookAccounts() : personal()).filter(a => a.currency === CUR), nowYm = ymOf(S.today);
  const pts = rows.map(([m]) => { const end = m === nowYm ? S.today : isoDate(m, 31); return { m, v: sum(accts.map(a => accountBalance(S, a.id, end))) }; });      // isoDate keeps the day inside the month
  const { ticks, bottom, top } = niceTicks(Math.min(...pts.map(p => p.v)), Math.max(...pts.map(p => p.v))), f = v => (v - bottom) / (top - bottom), N = pts.length;
  const xy = pts.map((p, i) => [i * 100 + 50, 100 - f(p.v) * 100]), line = 'M' + xy.map(q => q.join(' ')).join(' L'), zero = 100 - f(0) * 100;
  const last = pts[pts.length - 1], first = pts[0], ch = last.v - first.v;
  return `<section class="card" id="rep-balance"><div class="card-h"><h2>${co ? t('The company’s balance at each month’s end') : t('Household net balance at each month’s end')}</h2>${info(co ? t('What was in the company’s accounts in this currency at the end of each month, less what was owed on its cards; the month in progress, today.') : t('What was in your household accounts in {cur} at the end of each month, less what was owed on cards; the month in progress, today. Company (PJ) accounts and other currencies are not counted.', { cur: CUR }))}
      <span class="sub">${t('{change} since {month}', { change: fmt.money(ch, CUR, { sign: true, round: true }), month: fmt.month(first.m, 'bare') })}</span></div>
    <div class="card-b"><div class="cols line"><div class="yaxis" aria-hidden="true">${ticks.map(v => `<span>${axisMark(v)}</span>`).join('')}</div>
      <div class="plot">${ticks.map(v => `<div class="gl ${v === 0 ? 'base' : ''}" style="bottom:calc(24px + (100% - 24px) * ${f(v)})"></div>`).join('')}
      <svg class="nw" viewBox="0 0 ${N * 100} 100" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="${line} L${xy[N - 1][0]} ${zero} L${xy[0][0]} ${zero} Z"/><path class="ln" d="${line}" vector-effect="non-scaling-stroke"/></svg>
      ${pts.map(p => { const say = `${fmt.month(p.m)}${p.m === nowYm ? ' ' + t('(today)') : ''}: ${fmt.money(p.v, CUR)}`; return `<button class="colbtn" data-a="set-month" data-ym="${p.m}" aria-pressed="${p.m === ym}" data-tip="${esc(say)}" aria-label="${esc(say)}"><span class="dot" style="bottom:${f(p.v) * 100}%"></span><span class="x">${fmt.month(p.m, 'bare')}</span></button>`; }).join('')}</div></div></div></section>`;
}
// 2026-10-09 (owner: "this is how Reports looks today, it looks like none of the screenshots: no charts, only text to read"). With one month of data
// the charts across months had nothing to compare and stayed away; these three work from the first month: the month day by day, where the
// income went, and the plan against what was spent.
/** Spending added up day by day through the month shown, beside the month before at the same day and the month's plan. One scale; each day's
    figures on hover. */
function repDaily(bk, CUR, ym, co, L) {
  const nowYm = ymOf(S.today), D = daysInMonth(ym), upto = ym === nowYm ? +S.today.slice(8) : D, prev = addMonths(ym, -1), DP = daysInMonth(prev);
  const run = (m, n) => { const a = Array(n + 1).fill(0); bk.transactions.forEach(x => { if (x.type === 'expense' && inScope(bk, x, m, CUR)) a[+x.date.slice(8)] -= x.amount; }); for (let d = 1; d <= n; d++) a[d] += a[d - 1]; return a; };
  const cur = run(ym, D), was = run(prev, DP), hasWas = was[DP] > 0, plan = bk.plan && bk.plan.lines ? planTotals(bk, ym).expenses : 0;
  if (!cur[upto] && !hasWas) return '';
  const { ticks, top } = niceTicks(0, Math.max(cur[upto], hasWas ? was[Math.min(DP, D)] : 0, plan)), x = d => (d - 0.5) * 1000 / D, y = v => 100 - Math.max(0, v) * 100 / top;
  const path = (a, n) => 'M' + Array.from({ length: n }, (_, i) => `${x(i + 1)} ${y(a[i + 1])}`).join(' L');
  const dayName = d => `${d} ${mon(+ym.slice(5) - 1)}`, mm = fmt.month(ym, 'bare'), pm = fmt.month(prev, 'bare');
  const tip = d => [dayName(d), d <= upto ? `${mm} ${fmt.money(cur[d], CUR)}` : '', hasWas && d <= DP ? `${pm} ${fmt.money(was[d], CUR)}` : '', plan ? `${t('The plan’s pace')} ${fmt.money(Math.round(plan * d / D), CUR)}` : ''].filter(Boolean).join(' · ');
  const marks = [1, 8, 15, 22, D];
  return `<section class="card" id="rep-daily"><div class="card-h"><h2>${co ? t('The month’s costs, day by day') : t('The month’s spending, day by day')}</h2>${info(t('Spending added up day by day in the month shown, beside the month before up to the same day, and the pace of the month’s plan (its fixed costs and budgets spread evenly over the days). Transfers are not counted. Point at a day to see its figures.'))}</div>
    <div class="card-b"><div class="rep-legend">
      <span><i class="sw in" aria-hidden="true"></i>${esc(fmt.month(ym))} <b class="num">${fmt.money(cur[upto], CUR, { round: true })}</b>${ym === nowYm ? ` <span class="muted">${t('up to day {d}', { d: upto })}</span>` : ''}</span>
      ${hasWas ? `<span><i class="sw was" aria-hidden="true"></i>${esc(fmt.month(prev))} <b class="num">${fmt.money(was[Math.min(upto, DP)], CUR, { round: true })}</b> <span class="muted">${ym === nowYm ? t('at the same day; {amount} in the whole month', { amount: fmt.money(was[DP], CUR, { round: true }) }) : ''}</span></span>` : ''}
      ${plan ? `<span><i class="sw plan" aria-hidden="true"></i>${t('The plan’s pace')} <b class="num">${fmt.money(Math.round(plan * upto / D), CUR, { round: true })}</b> <span class="muted">${ym === nowYm ? t('by today; {amount} in the month', { amount: fmt.money(plan, CUR, { round: true }) }) : t('in the month')}</span></span>` : ''}</div>
      <div class="cols line daily"><div class="yaxis" aria-hidden="true">${ticks.map(v => `<span>${axisMark(v)}</span>`).join('')}</div>
      <div class="plot">${ticks.map(v => `<div class="gl ${v === 0 ? 'base' : ''}" style="bottom:calc(24px + (100% - 24px) * ${v / top})"></div>`).join('')}
        <svg class="nw" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
          ${plan ? `<path class="plan" d="M0 100 L1000 ${y(plan)}" vector-effect="non-scaling-stroke"/>` : ''}
          ${hasWas ? `<path class="was" d="${path(was, Math.min(DP, D))}" vector-effect="non-scaling-stroke"/>` : ''}
          <path class="area" d="${path(cur, upto)} L${x(upto)} 100 L${x(1)} 100 Z"/><path class="ln" d="${path(cur, upto)}" vector-effect="non-scaling-stroke"/></svg>
        ${Array.from({ length: D }, (_, i) => i + 1).map(d => `<span class="dhit" data-tip="${esc(tip(d))}">${d === upto ? `<span class="dot" style="bottom:${(100 - y(cur[d]))}%"></span>` : ''}${marks.includes(d) ? `<span class="x">${d}</span>` : ''}</span>`).join('')}</div></div>
      <table class="sr"><caption>${t('The month’s spending, day by day')}</caption><tr><th>${t('Day')}</th><th>${esc(mm)}</th>${hasWas ? `<th>${esc(pm)}</th>` : ''}</tr>${Array.from({ length: D }, (_, i) => i + 1).filter(d => d <= upto || hasWas).map(d => `<tr><td>${d}</td><td>${d <= upto ? fmt.money(cur[d], CUR) : ''}</td>${hasWas ? `<td>${d <= DP ? fmt.money(was[d], CUR) : ''}</td>` : ''}</tr>`).join('')}</table></div></section>`;
}
/** Where what came in went: one bar as long as the month's income, cut into what each category took and what was left, with each part named
    below. Without income, the same bar shows the spending by category. */
function repSplit(bk, CUR, ym, m, co, L) {
  const by = categoryTotals(bk, ym, CUR).byCat, known = id => bk.categories.some(c => c.id === id);
  const parts = Object.keys(by).filter(k => by[k] > 0).map(k => ({ id: k, name: known(k) ? (bk.categories.find(c => c.id === k) || {}).name : t('Not filed yet'), v: by[k], col: known(k) ? catColor(k) : 'var(--col-muted)' })).sort((a, b) => b.v - a.v);
  const top = parts.slice(0, 5), rest = parts.slice(5); if (rest.length) top.push({ id: '', name: t('Other categories'), v: sum(rest.map(r => r.v)), col: 'var(--col-muted)' });
  const income = m.income > 0, left = income && m.income > m.expenses ? m.income - m.expenses : 0, base = income ? Math.max(m.income, m.expenses) : m.expenses;
  if (!base) return '';
  const segs = [...top, ...(left ? [{ id: 'left', name: L.left, v: left, col: 'transparent', left: true }] : [])], pct = v => fmt.pct(Math.round(v * 1000 / (income ? m.income : m.expenses)) / 10);
  return `<section class="card" id="rep-split"><div class="card-h"><h2>${income ? (co ? t('Where what was received went') : t('Where your income went')) : (co ? t('Costs by group') : t('Spending by category'))}</h2>${info(income ? t('The month’s income as one bar: what each category took of it, and what was left. A category opens its transactions.') : t('The month’s spending by category. A category opens its transactions.'))}<span class="sub">${income ? t('Of {amount} that came in', { amount: fmt.money(m.income, CUR) }) : fmt.money(m.expenses, CUR)}</span></div>
    <div class="card-b"><div class="stackbar rep-bar" role="group" aria-label="${income ? t('Where your income went') : t('Spending by category')}">${segs.map(x => x.left ? `<span class="left" style="flex:${x.v}" data-tip="${esc(x.name)}: ${esc(fmt.money(x.v, CUR))} (${pct(x.v)})"></span>` : `<button style="flex:${x.v};background:${x.col}" ${x.id ? `data-a="filter-cat" data-cat="${esc(x.id === 'other' ? 'none' : x.id)}"` : 'disabled'} data-tip="${esc(x.name)}: ${esc(fmt.money(x.v, CUR))} (${pct(x.v)})" aria-label="${esc(x.name)} ${esc(fmt.money(x.v, CUR))}"></button>`).join('')}</div>
      ${income && m.expenses > m.income ? `<p class="note rep-over">${t('{amount} more went out than came in.', { amount: fmt.money(m.expenses - m.income, CUR) })}</p>` : ''}
      <div class="legend" style="margin-top:10px">${segs.map(x => `<${x.id && !x.left ? `button class="legend-row" data-a="filter-cat" data-cat="${esc(x.id === 'other' ? 'none' : x.id)}"` : 'div class="legend-row still"'}><span class="dot${x.left ? ' left' : ''}" style="background:${x.col}"></span><span>${esc(x.name)}</span><span class="num">${fmt.money(x.v, CUR)}</span><span class="pct num">${pct(x.v)}</span></${x.id && !x.left ? 'button' : 'div'}>`).join('')}</div></div></section>`;
}
/** The month's plan against what was spent, line by line: a bar for each fixed cost or budget, filled with what was paid, said in words beside it;
    what went over first. */
function repPlan(bk, CUR, ym, co) {
  if (!bk.plan || !bk.plan.lines || !bk.plan.lines.length) return '';
  const rank = p => p.status === 'over' ? 0 : p.status === 'late' ? 1 : 2;
  const ps = planProgress(bk, ym, CUR, S.today).filter(p => p.planned > 0 || p.spent > 0).sort((a, b) => rank(a) - rank(b) || b.planned - a.planned);
  if (!ps.length) return '';
  const shown = ps.slice(0, 7), r = v => fmt.money(v, CUR, { round: true });
  const word = p => p.status === 'over' ? t('{amount} over', { amount: r(p.spent - p.planned) }) : p.status === 'late' ? t('Late') : p.bill ? (p.spent ? t('Paid') : p.dueDate ? t('Due {date}', { date: fmt.date(p.dueDate) }) : t('To pay')) : t('{amount} left', { amount: r(Math.max(0, p.planned - p.spent)) });
  return `<section class="card" id="rep-plan"><div class="card-h"><h2>${t('The plan against what was spent')}</h2>${info(t('Each fixed cost and budget of the month: the bar fills with what was paid for it. What went over the plan comes first.'))}<span class="sub">${t('{a} of {b} planned', { a: r(sum(ps.map(p => p.spent))), b: r(sum(ps.map(p => p.planned))) })}</span></div>
    <div class="card-b"><div class="rp-list">${shown.map(p => `<div class="rp-row"><span class="rp-name" data-tip="${esc(p.name)}">${esc(p.name)}</span>
      <div class="meter ${p.status === 'over' ? 'warn' : p.status === 'late' ? 'crit' : p.bill && p.spent ? 'go' : ''}"><i style="width:${p.planned ? Math.min(100, p.spent * 100 / p.planned) : 100}%"></i></div>
      <span class="num">${r(p.spent)} <span class="muted">/ ${r(p.planned)}</span></span><span class="rp-st ${p.status === 'over' ? 'over' : p.status === 'late' ? 'late' : ''}">${word(p)}</span></div>`).join('')}</div>
      ${ps.length > shown.length ? `<p class="note" style="margin-top:12px">${t('{n} more lines in the plan.', { n: ps.length - shown.length })} <a href="#plan" class="linkbtn">${t('Open the plan')}</a></p>` : ''}</div></section>`;
}
/** Cards of half the width, two by two; one left alone takes the whole width. */
const halves = cards => { const xs = cards.filter(Boolean), out = []; for (let i = 0; i < xs.length; i += 2) out.push(xs[i + 1] ? `<div class="grid g-even">${xs[i]}${xs[i + 1]}</div>` : xs[i]); return out.join(''); };
// ---------- a phone's Reports (owner, 2026-10-08: "in the mobile menu change Accounts for Reports. In Reports should go the monthly spending chart
// and spending by category. Under the date selector put a switch of three views"; later the same day: "remove General and share its information
// between Income and Expenses where it makes sense"). Two views; what each holds is said in viewReports. The computer keeps its one page.
const repViews = L => [['in', L.inc], ['out', L.exp]];
function repSwitch(L) { const v = UI.repView === 'in' ? 'in' : 'out'; return `<div class="seg rep-view" role="group" aria-label="${t('Report view')}">${repViews(L).map(([k, l]) => `<button type="button" data-a="rep-view" data-v="${k}" aria-pressed="${v === k}">${esc(l)}</button>`).join('')}</div>`; }
/** What came in, month by month (the six months up to the one shown), and where it came from this month. */
function repIncome(bk, CUR, L, ym, m, co) {
  const pts = []; for (let y = addMonths(ym, -5); y <= ym; y = addMonths(y, 1)) pts.push({ ym: y, value: monthSummary(bk, y, CUR).income, partial: y === ymOf(S.today) });
  return `<section class="card" id="rep-in-trend"><div class="card-h"><h2>${co ? t('Received by month') : t('Income by month')}</h2></div><div class="card-b">${colChart(pts, ym, CUR)}</div></section>
    ${repRingIncome(bk, CUR, ym, co) || `<section class="card" id="rep-in-from"><div class="card-h"><h2>${co ? t('Where it came from') : t('Where your income came from')}</h2><span class="sub">${fmt.month(ym)}</span></div><div class="card-b"><div class="empty">${t('No income recorded this month.')}</div></div></section>`}`;      // a ring since 2026-10-09 (features/reports/report-rings.js)
}
function viewReports() {
  // a month in progress is compared with the same days of the month before, as on the dashboard; a closed month with the whole month before
  // 2026-10-07: the company's side has its reports too (owner: "do everything that is pending"). Same page, read from the company's book in the
  // currency shown: received, costs and result in place of income, expenses and left over; what has no company category yet is its own line.
  const co = inCompany(), bk = B(), CUR = BCUR();
  const ym = S.month, prevYm = addMonths(ym, -1), open = ym === ymOf(S.today), upTo = open ? isoDate(prevYm, +S.today.slice(8)) : null, m = monthSummary(bk, ym, CUR), p = monthSummary(bk, prevYm, CUR, upTo);
  const prevHead = fmt.month(prevYm, 'bare') + (open ? ' 1' + (+upTo.slice(8) > 1 ? '–' + +upTo.slice(8) : '') : '');
  const L = co ? { inc: t('Received'), exp: t('Costs'), left: t('Result'), rate: t('Result, in %') } : { inc: t('Income'), exp: t('Expenses'), left: t('Left over'), rate: isPhone() ? t('Left over, in %') : t('Left over, share of income') };      // a phone's half-width tile: the short name (usability QC, 2026-10-08)
  if (!m.count && !isPhone()) return `<div class="card"><div class="empty"><b>${t('No data for {month}', { month: fmt.month(ym) })}</b>${t('Reports are calculated from transactions. Import a statement or pick another month.')}</div></div>${co ? reportYear(bk, CUR, { inc: t('Received'), exp: t('Costs'), left: t('Result') }, co) : ''}`;
  const a = categoryTotals(bk, ym, CUR), b = categoryTotals(bk, prevYm, CUR, upTo);
  const cats = bk.categories.filter(c => !c.income && (a.byCat[c.id] || b.byCat[c.id])).sort((x, y) => (a.byCat[y.id] || 0) - (a.byCat[x.id] || 0));
  const loose = by => co ? sum(Object.keys(by).filter(k => !bk.categories.some(c => c.id === k)).map(k => by[k])) : 0, looseNow = loose(a.byCat), looseWas = loose(b.byCat);
  const tip = (k, text) => co ? info(text) : hint(k);
  const lineName = id => co && !bk.categories.some(c => c.id === id || (c.subs || []).some(x => x.id === id)) ? t('Not filed yet') : catName(id);      // a company cost with no company category yet says so, here as in the table below
  const lines = Object.entries(a.byLine).filter(l => l[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 8), max = Math.max(1, ...lines.map(l => l[1]));
  const obs = observations(bk, ym, CUR, S.today, fmt, catName, co);
  const row = (label, cur, prev, strong) => {
    const diff = cur - prev, pc = prev ? Math.round(diff * 1000 / Math.abs(prev)) / 10 : null;
    return `<tr><td>${strong ? `<b style="font-weight:500">${label}</b>` : label}</td><td class="amt">${fmt.money(cur, CUR)}</td><td class="amt hide-sm"><span class="muted">${p.count ? fmt.money(prev, CUR) : '—'}</span></td>
      <td class="amt">${p.count ? fmt.money(diff, CUR, { sign: true }) : '—'}</td><td class="amt">${pc === null || !p.count ? '—' : `${pc > 0 ? '▲' : pc < 0 ? '▼' : ''} ${fmt.pct(Math.abs(pc))}`}</td></tr>`;
  };
  const cmp = paged('report', [row(L.inc, m.income, p.income, true), row(L.exp, m.expenses, p.expenses, true), row(L.left, m.saved, p.saved, true), ...(co ? [] : [row(t('Recurring costs'), recurringTotal(ym), recurringTotal(prevYm, upTo), true)]),
    ...(looseNow || looseWas ? [row(`<span class="cat"><span class="dot" style="background:var(--col-muted)"></span>${t('Not filed yet')}</span>`, looseNow, looseWas)] : []), ...cats.map(c => row(`<span class="cat"><span class="dot" style="background:${catColor(c.id)}"></span>${esc(c.name)}</span>`, a.byCat[c.id] || 0, b.byCat[c.id] || 0))]);
  // the pieces of the page, shared by the computer's one page and a phone's two views
  const tIn = `<div class="card tile"><div class="label"><span>${L.inc}</span>${tip('repIncome', t('Money that came into the company’s accounts in this currency in this month. Transfers are not counted.'))}</div><div class="value num">${fmt.money(m.income, CUR)}</div></div>`, tOut = `<div class="card tile"><div class="label"><span>${L.exp}</span>${tip('repExpenses', t('What the company paid in this month from its accounts in this currency. Transfers are not costs.'))}</div><div class="value num">${fmt.money(m.expenses, CUR)}</div></div>`, tLeft = `<div class="card tile"><div class="label"><span>${L.left}</span>${tip('repSaved', t('Received minus costs of this month.'))}</div><div class="value num">${fmt.money(m.saved, CUR)}</div></div>`, tRate = `<div class="card tile"><div class="label"><span>${L.rate}</span>${tip('repRate', t('The share of what the company received this month that was not spent.'))}</div><div class="value num">${m.rate === null ? '—' : fmt.pct(m.rate)}</div></div></section>`;
  const largestCard = `<section class="card"><div class="card-h"><h2>${co ? t('Largest costs') : t('Largest expense lines')}</h2>${hint('repLargest')}<span class="sub">${t('Share of {amount}', { amount: fmt.money(m.expenses, CUR) })}</span></div><div class="card-b">
      ${lines.map(([id, v]) => { const f = catOf(id), cn = f && f.sub && bk.categories.some(c => c.id === f.cat.id) ? ' · ' + f.cat.name : ''; return `<div class="hbar" data-tip="${esc(lineName(id) + cn)}: ${esc(fmt.money(v, CUR))}"><span>${esc(lineName(id))}</span><div class="track"><i style="width:${v * 100 / max}%;background:${lineColor(bk, id)}"></i></div><span class="num">${fmt.pct(Math.round(v * 100 / m.expenses))} <span class="muted">· ${fmt.money(v, CUR, { round: true })}</span></span></div>`; }).join('')}</div></section>`;      // each bar in its category's colour (features/reports/report-rings.js)
  const obsCard = `<section class="card"><div class="card-h"><h2>${t('Observations')}</h2>${hint('repObs')}<span class="sub">${t('Calculated from your transactions')}</span></div><div class="card-b">
      ${obs.map(o => `<div class="obs">${esc(o)}</div>`).join('') || `<div class="empty">${t('Nothing notable this month.')}</div>`}
      <p class="note" style="margin-top:10px">${t('These are factual statements about your data, not recommendations.')}</p></div></section>`;
  const cmpCard = `<section class="card"><div class="card-h"><h2>${t('Month-over-month comparison')}</h2>${hint('repCompare')}<span class="sub">${fmt.month(ym)} · ${open ? t('vs the same days of {month}', { month: fmt.month(prevYm, 'bare') }) : fmt.month(prevYm)}</span></div>
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl" id="rep-compare"><thead><tr><th></th><th class="r">${fmt.month(ym, 'bare')}</th><th class="r hide-sm">${prevHead}</th><th class="r">${t('Change')}</th><th class="r">%</th></tr></thead><tbody>
      ${cmp.rows.join('')}
    </tbody></table></div>${cmp.html}</div></section>`;
  const noteP = `<p class="note">${co ? t('Reports are generated from the company’s transactions in this currency each time you open them. Transfers are excluded.') : t('Reports are generated from transactions each time you open them. Transfers between your own accounts and all company accounts are excluded.')}</p>`;
  // 2026-10-08 (owner: "in Reports remove the General switch and share that tab's information between Income and Expenses where it makes sense"):
  // Income holds what came in, what was left and its share, month by month, where it came from, and the company's year; Expenses holds what went out,
  // month by month, by category, by line, what stands out (it is about spending) and the comparison with the month before. Expenses opens first.
  if (isPhone()) {
    const v = UI.repView === 'in' ? 'in' : 'out', d = dashParts();
    if (v === 'in') return `${repSwitch(L)}<section class="tiles">${tIn}${tLeft}${tRate}</section>${repIncome(bk, CUR, L, ym, m, co)}${co ? reportYear(bk, CUR, L, co) : ''}${noteP}`;
    // the categories as a ring that opens into subcategories (in place of the dashboard's bar), and what the spending was paid with (2026-10-09)
    return `${repSwitch(L)}<section class="tiles one">${tOut}</section>${d.trendCard}${repRingCats(bk, CUR, ym, co) || d.catCard}${largestCard}${repRingPay(bk, CUR, ym, co)}${obsCard}${cmpCard}${noteP}`;
  }
  const months = repMonths(bk, CUR, ym);
  return `<section class="tiles">${tIn}${tOut}${tLeft}${tRate}</section>
  ${repTrend(months, ym, CUR, L, co)}
  ${halves([repDaily(bk, CUR, ym, co, L), repSplit(bk, CUR, ym, m, co, L)])}
  ${halves([repRingCats(bk, CUR, ym, co), repRingPay(bk, CUR, ym, co)])}
  ${halves([largestCard, obsCard])}
  ${halves([repPlan(bk, CUR, ym, co), repMerchants(bk, CUR, ym, m, co)])}
  ${repMatrix(bk, CUR, ym, co)}
  ${halves([repBalance(months, ym, CUR, co), repRingIncome(bk, CUR, ym, co)])}
  ${p.count ? cmpCard : ''}
  ${reportYear(bk, CUR, L, co, 2)}
  ${noteP}`;      // the month before with nothing in it: nothing to compare; a year of one month is the tiles again
}
