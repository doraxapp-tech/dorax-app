/* Dorax Finance — Reports on a computer, in the summary's look (v203; what the computer's pages are: features/desk/desk-kit.js). Twelve blocks became
   six (owner, on the proposal: "todo se ve bien me gusta"): on the forest, what went out this month against the same days of the month before and
   the plan's pace, what is left each month on average (and its share of what comes in), and what came in and went out month by month, what was
   left under each month; on the sheet, the month day by day, where it went (by category, and where most), the net balance at each month's end, how
   it was paid, and the categories month by month against their average. The year as a table is one click away ("See as a table"); the plan against
   what was spent lives on the Plan; the comparison with the month before is the forest's chip. The phone and the company keep reports.view.js.
   From the first month (owner, 2026-10-12, his account starting in October: "informes solo tiene esto?", "no se parece al artefacto"): the parts that
   compare months showed only from the second one, and the page was three cards. Each part now shows what there is: what is left this month (the
   average once a month has closed), the months to come as outlines in the band, the balance day by day, the categories against the plan. */

/** The month's spending added up day by day, the month before beside it, and the plan's pace: one scale, an SVG drawn to the card's width. */
function dkRepDaily(bk, CUR, ym) {
  const nowYm = ymOf(S.today), D = daysInMonth(ym), upto = ym === nowYm ? +S.today.slice(8) : D, prev = addMonths(ym, -1), DP = daysInMonth(prev);
  const run = (m, n) => { const a = Array(n + 1).fill(0); bk.transactions.forEach(x => { if (x.type === 'expense' && inScope(bk, x, m, CUR)) a[+x.date.slice(8)] -= x.amount; }); for (let d = 1; d <= n; d++) a[d] += a[d - 1]; return a; };
  const cur = run(ym, D), was = run(prev, DP), hasWas = was[DP] > 0, plan = bk.plan && bk.plan.lines ? planTotals(bk, ym).expenses : 0;
  if (!cur[upto] && !hasWas) return '';
  const { ticks, top } = niceTicks(0, Math.max(cur[upto], hasWas ? was[Math.min(DP, D)] : 0, plan)), W = 520, H = 230, L = 52, R = 12, T = 14, B = 30;
  const x = d => L + (d - 1) * (W - L - R) / Math.max(1, D - 1), y = v => T + (H - T - B) * (1 - Math.max(0, v) / top), pts = (a, n) => Array.from({ length: n }, (_, i) => `${x(i + 1).toFixed(1)},${y(a[i + 1]).toFixed(1)}`).join(' ');
  const mm = fmt.month(ym), pm = fmt.month(prev);
  const legend = `<ul class="dk-lines"><li class="num"><i class="dk-ln now" aria-hidden="true"></i>${esc(mm)} <b>${fmt.money(cur[upto], CUR)}</b>${ym === nowYm ? ` <span>${esc(t('up to day {d}', { d: upto }))}</span>` : ''}</li>
      ${hasWas ? `<li class="num"><i class="dk-ln was" aria-hidden="true"></i>${esc(pm)} <b>${fmt.money(was[Math.min(upto, DP)], CUR)}</b>${ym === nowYm ? ` <span>${esc(t('at the same day'))}</span>` : ''}</li>` : ''}
      ${plan ? `<li class="num"><i class="dk-ln plan" aria-hidden="true"></i>${t('Plan')} <b>${fmt.money(plan, CUR, { round: true })}</b> <span>${esc(t('in the month'))}</span></li>` : ''}</ul>`;
  const say = `${mm}: ${fmt.money(cur[upto], CUR)}${ym === nowYm ? ' ' + t('up to day {d}', { d: upto }) : ''}${hasWas ? `; ${pm}: ${fmt.money(was[Math.min(upto, DP)], CUR)} ${t('at the same day')}, ${fmt.money(was[DP], CUR)} ${t('in the whole month')}` : ''}${plan ? `; ${t('Plan')}: ${fmt.money(plan, CUR)}` : ''}`;
  const svg = dkPlot(W, H, say, `<g class="dk-gl">${ticks.map(v => `<path d="M${L} ${y(v).toFixed(1)}H${W - R}"/>`).join('')}</g>
      ${plan ? `<path class="dk-lplan" d="M${x(1).toFixed(1)} ${y(plan / D).toFixed(1)} L${x(D).toFixed(1)} ${y(plan).toFixed(1)}"/>` : ''}
      ${hasWas ? `<polyline class="dk-lwas" points="${pts(was, Math.min(DP, D))}"/>` : ''}
      <polyline class="dk-lnow" points="${pts(cur, upto)}"/><circle class="dk-pt" cx="${x(upto).toFixed(1)}" cy="${y(cur[upto]).toFixed(1)}" r="5"/>`,
    [...ticks.map(v => [L, y(v), axisMark(v), 'y']), ...[1, 8, 15, 22, D].map(d => [x(d), H - B, String(d), 'x'])]);
  const sub = hasWas && plan ? t('What went out, added up day by day, against the month before and the plan') : plan ? t('What went out, added up day by day, against the plan') : hasWas ? t('What went out, added up day by day, against the month before') : t('What went out, added up day by day');
  return `<section class="dk-tile dk-box" id="rep-daily" aria-labelledby="rep-daily-h"><div class="dk-box-h"><div class="dk-sec-t"><div class="dk-h2"><h2 id="rep-daily-h">${esc(t('{month}, day by day', { month: mm }))}</h2>${info(t('Spending added up day by day in the month shown, beside the month before up to the same day, and the pace of the month’s plan (its fixed costs and budgets spread evenly over the days). Transfers are not counted. Point at a day to see its figures.'))}</div><span class="dk-sub">${sub}</span></div></div>${legend}${svg}</section>`;
}
/** Where the month's money went: each category with its bar, and the places where most of it went. */
function dkRepWhere(bk, CUR, ym, m) {
  const by = categoryTotals(bk, ym, CUR).byCat, known = id => bk.categories.find(c => c.id === id), total = m.expenses || sum(Object.values(by).filter(v => v > 0));
  const parts = Object.keys(by).filter(k => by[k] > 0).map(k => ({ id: k, c: known(k), v: by[k] })).sort((a, b) => b.v - a.v);
  if (!parts.length) return '';
  const shown = parts.slice(0, 5), rest = parts.slice(5), pct = v => fmt.pct(Math.round(v * 1000 / Math.max(1, total)) / 10);
  const row = p => `<button class="dk-cat" data-a="filter-cat" data-cat="${esc(p.id === 'other' ? 'none' : p.id)}"><span class="dk-cat-h">${p.c ? catGlyph(p.c) : `<span class="dk-ico" aria-hidden="true">${icon('tag')}</span>`}<b>${esc(p.c ? p.c.name : t('Not filed yet'))}</b><b class="num">${fmt.money(p.v, CUR)}</b><span class="num">${pct(p.v)}</span></span>
      <span class="dk-bar"><i style="width:${Math.round(p.v * 1000 / Math.max(1, total)) / 10}%;background:${p.c ? catColor(p.id) : 'var(--col-muted)'}"></i></span></button>`;
  const mer = {}; bk.transactions.filter(x => x.type === 'expense' && inScope(bk, x, ym, CUR)).forEach(x => { const k = normalizeText(x.merchant) || '—'; const o = mer[k] || (mer[k] = { name: x.merchant || t('Other'), v: 0 }); o.v -= x.amount; });
  const top = Object.values(mer).filter(o => o.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
  return `<section class="dk-tile dk-box" id="rep-cats" aria-labelledby="rep-cats-h"><div class="dk-box-h"><div class="dk-sec-t"><div class="dk-h2"><h2 id="rep-cats-h">${t('Where it went')}</h2>${hint('repExpenses')}</div><span class="dk-sub num">${esc(t('{amount} in {month}, by category', { amount: fmt.money(total, CUR), month: yrMonth(ym) }))}</span></div></div>
    <div class="dk-cats">${shown.map(row).join('')}${rest.length ? `<p class="dk-note num">${esc(t('And {n} more categories: {amount}', { n: rest.length, amount: fmt.money(sum(rest.map(p => p.v)), CUR) }))}</p>` : ''}</div>
    ${top.length ? `<div class="dk-most"><h3>${t('Where most')}</h3>${top.map(o => `<button class="dk-most-r" data-a="filter-q" data-q="${esc(o.name)}"><span>${esc(o.name)}</span><b class="num">${fmt.money(o.v, CUR)}</b></button>`).join('')}</div>` : ''}</section>`;
}
/** The accounts whose net balance the page follows: the side's on screen, in this currency (v214: the company's side has this page too). */
const repSideAccts = CUR => S.accounts.filter(a => (a.scope === 'business') === inCompany() && a.currency === CUR);
/** The side's net balance at the end of each month (today for this one): a line rising or falling, and how far it moved. */
function dkRepBalance(rows, ym, CUR) {
  if (rows.length < 2) return dkRepBalanceDays(ym, CUR);
  const accts = repSideAccts(CUR), nowYm = ymOf(S.today);
  const pts = rows.map(([m]) => ({ m, v: sum(accts.map(a => accountBalance(S, a.id, m === nowYm ? S.today : isoDate(m, 31)))) }));
  const { ticks, bottom, top } = niceTicks(Math.min(0, ...pts.map(p => p.v)), Math.max(...pts.map(p => p.v))), W = 520, H = 230, L = 52, R = 14, T = 14, B = 30, N = pts.length;
  const x = i => L + i * (W - L - R) / Math.max(1, N - 1), y = v => T + (H - T - B) * (1 - (v - bottom) / (top - bottom)), line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const first = pts[0], last = pts[N - 1], ch = last.v - first.v;
  const say = pts.map(p => `${fmt.month(p.m)}${p.m === nowYm ? ' (' + t('today') + ')' : ''}: ${fmt.money(p.v, CUR)}`).join(', ');
  const svg = dkPlot(W, H, say, `<g class="dk-gl">${ticks.map(v => `<path d="M${L} ${y(v).toFixed(1)}H${W - R}"/>`).join('')}</g>
      <polygon class="dk-area" points="${x(0).toFixed(1)},${y(Math.max(0, bottom)).toFixed(1)} ${line} ${x(N - 1).toFixed(1)},${y(Math.max(0, bottom)).toFixed(1)}"/><polyline class="dk-lnow" points="${line}"/>
      <g class="dk-pts">${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === N - 1 ? 5.5 : 4.5}"/>`).join('')}</g>`,
    [...ticks.map(v => [L, y(v), axisMark(v), 'y']), ...pts.map((p, i) => [x(i), H - B, p.m === nowYm ? t('Today') : fmt.month(p.m, 'bare'), 'x']), [x(N - 1) - 8, y(last.v) + (y(last.v) < 40 ? 22 : -18), fmt.money(last.v, CUR, { round: true }), 'tag']]);
  return `<section class="dk-tile dk-box" id="rep-balance" aria-labelledby="rep-balance-h"><div class="dk-box-h"><div class="dk-sec-t"><h2 id="rep-balance-h">${t('Your net balance, month by month')}</h2><span class="dk-sub">${t('What you have less what you owe, at the end of each month')}</span></div>${dkPill(esc(t('{change} since {month}', { change: fmt.money(ch, CUR, { sign: true, round: true }), month: yrMonth(first.m) })), ch >= 0 ? 'mint' : 'crit')}</div>
    ${svg}<div>${dkLink('href="#accounts"', t('See Accounts & savings'), true)}</div></section>`;
}
/** The first month: the side's net balance at the end of each day of the month (to today), from where it stood when the month began. */
function dkRepBalanceDays(ym, CUR) {
  const accts = repSideAccts(CUR), ids = new Set(accts.map(a => a.id)), nowYm = ymOf(S.today), D = daysInMonth(ym), upto = ym === nowYm ? +S.today.slice(8) : D;
  if (!accts.length) return '';
  const start = sum(accts.map(a => accountBalance(S, a.id, isoDate(addMonths(ym, -1), 31)))), v = Array(upto + 1).fill(0);
  S.transactions.forEach(x => { if (ids.has(x.accountId) && counts(x) && ymOf(x.date) === ym && +x.date.slice(8) <= upto) v[+x.date.slice(8)] += x.amount; });
  v[0] = start; for (let d = 1; d <= upto; d++) v[d] += v[d - 1];
  const vals = v.slice(1), last = vals[upto - 1], ch = last - start;
  const { ticks, bottom, top } = niceTicks(Math.min(0, start, ...vals), Math.max(start, ...vals)), W = 520, H = 230, L = 52, R = 14, T = 14, B = 30;
  const x = d => L + (d - 1) * (W - L - R) / Math.max(1, D - 1), y = val => T + (H - T - B) * (1 - (val - bottom) / (top - bottom)), line = vals.map((val, i) => `${x(i + 1).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
  const near = Math.min(...vals.slice(-7).map(y)), tagY = near < 40 ? Math.max(...vals.slice(-7).map(y)) + 22 : near - 18;      // the value's tag clear of the last week's line
  const base = y(Math.max(0, bottom)).toFixed(1), say = `${t('Your net balance, day by day')}: ${fmt.month(ym)} 1, ${fmt.money(vals[0], CUR)}; ${ym === nowYm ? t('today') : fmt.date(isoDate(ym, D))}, ${fmt.money(last, CUR)}`;
  const svg = dkPlot(W, H, say, `<g class="dk-gl">${ticks.map(tk => `<path d="M${L} ${y(tk).toFixed(1)}H${W - R}"/>`).join('')}</g>
      <polygon class="dk-area" points="${x(1).toFixed(1)},${base} ${line} ${x(upto).toFixed(1)},${base}"/><polyline class="dk-lnow" points="${line}"/>
      <circle class="dk-pt" cx="${x(upto).toFixed(1)}" cy="${y(last).toFixed(1)}" r="5.5"/>`,
    [...ticks.map(tk => [L, y(tk), axisMark(tk), 'y']), ...[1, 8, 15, 22, D].map(d => [x(d), H - B, String(d), 'x']), [x(upto) - 8, tagY, fmt.money(last, CUR, { round: true }), 'tag']]);
  return `<section class="dk-tile dk-box" id="rep-balance" aria-labelledby="rep-balance-h"><div class="dk-box-h"><div class="dk-sec-t"><h2 id="rep-balance-h">${t('Your net balance, day by day')}</h2><span class="dk-sub">${esc(t('What you have less what you owe, each day of {month}', { month: yrMonth(ym) }))}</span></div>${dkPill(esc(t('{change} in {month}', { change: fmt.money(ch, CUR, { sign: true, round: true }), month: yrMonth(ym) })), ch >= 0 ? 'mint' : 'crit')}</div>
    ${svg}<div>${dkLink('href="#accounts"', t('See Accounts & savings'), true)}</div></section>`;
}
/** How the month was paid: debit, the card's credit, savings, cash; each with its accounts' marks. */
function dkRepPay(bk, CUR, ym) {
  const by = {};
  for (const x of repExpenses(bk, ym, CUR)) { const a = acct(x.accountId), k = payKind(a), o = by[k] || (by[k] = { v: 0, n: 0, accts: {} }), mk = a ? cardMain(a) : null; o.v -= x.amount; o.n++; const r = o.accts[x.accountId || ''] || (o.accts[x.accountId || ''] = { a, m: mk, v: 0 }); r.v -= x.amount; }
  const kinds = PAY_KINDS().filter(([k]) => by[k] && by[k].v > 0); if (!kinds.length) return '';
  const total = sum(kinds.map(([k]) => by[k].v)), g = ['var(--dk-g1)', 'var(--dk-g3)', 'var(--dk-g2)', 'var(--dk-g4)'];
  const row = ([k, name], i) => { const o = by[k], top = Object.values(o.accts).sort((a, b) => b.v - a.v)[0], names = [...new Set(Object.values(o.accts).map(r => r.a ? r.a.name : t('Other')))];
    return `<div class="dk-pay-r">${top && top.a ? dkMark(top.a) : `<span class="dk-ico" aria-hidden="true">${icon('wallet')}</span>`}<div class="dk-pay-t"><b><i class="dk-dot" style="background:${g[i % 4]}"></i>${esc(k === 'credit' ? t('Credit') : name)}</b><small>${esc(names.join(', '))} · ${esc(tn(o.n, '{n} payment', '{n} payments'))}</small></div>
      <div class="dk-pay-v"><b class="num">${fmt.money(o.v, CUR)}</b><small class="num">${fmt.pct(Math.round(o.v * 1000 / total) / 10)}</small></div></div>`; };
  return `<section class="dk-tile dk-box" id="rep-pay" aria-labelledby="rep-pay-h"><div class="dk-box-h"><div class="dk-sec-t"><h2 id="rep-pay-h">${t('How you paid')}</h2><span class="dk-sub">${esc(ym === ymOf(S.today) ? t('{month}, so far', { month: fmt.month(ym) }) : fmt.month(ym))}</span></div></div>
    <div class="dk-split dk-onsheet" role="img" aria-label="${esc(kinds.map(([k, name]) => `${k === 'credit' ? t('Credit') : name} ${fmt.pct(Math.round(by[k].v * 1000 / total) / 10)}`).join(', '))}">${kinds.map(([k], i) => `<span class="${i === 0 ? 'first' : ''}${i === kinds.length - 1 ? ' last' : ''}" style="flex:${by[k].v} 1 0;background:${g[i % 4]}"></span>`).join('')}</div>
    <div class="dk-pays">${kinds.map(row).join('')}</div></section>`;
}
/** Each category over the last six months: what it cost, its average over the months already closed, and the month shown against that average (a
    month in progress, how much of an average month it has used, with the mark of how far the month has gone). */
function dkRepMatrix(bk, CUR, ym) {
  const months = repMonths(bk, CUR, ym, 6).map(r => r[0]); if (months.length < 2) return dkRepVsPlan(bk, CUR, ym);
  const nowYm = ymOf(S.today), tot = months.map(m => categoryTotals(bk, m, CUR).byCat), inProg = ym === nowYm, at = months.indexOf(ym), pace = inProg ? monthPace(S.today) : null;
  const base = months.map((m, i) => i).filter(i => months[i] !== ym && months[i] !== nowYm);
  const lines = bk.categories.filter(c => !c.income).map(c => { const vs = months.map((m, i) => tot[i][c.id] || 0), a = base.length ? Math.round(sum(base.map(i => vs[i])) / base.length) : null; return { c, vs, a }; }).filter(l => l.vs.some(v => v)).sort((x, y) => (y.a || 0) - (x.a || 0));
  if (!lines.length) return '';
  const n = v => fmt.money(v, null, { bare: true, round: true }), totals = months.map((m, i) => sum(lines.map(l => l.vs[i]))), ta = base.length ? Math.round(sum(base.map(i => totals[i])) / base.length) : null;
  const vs = (v, a, col) => { if (!a) return '<span class="dk-mute">—</span>'; const p = Math.round(v * 100 / a); if (!inProg) { const d = Math.round((v - a) * 1000 / a) / 10; return `<span class="num">${d > 0 ? '▲' : d < 0 ? '▼' : ''} ${fmt.pct(Math.abs(d))}</span>`; }
    return `<span class="dk-share"><span class="dk-share-bar" aria-hidden="true"><i style="width:${Math.min(100, p)}%;background:${col}"></i>${pace !== null ? `<b style="left:${pace}%"></b>` : ''}</span><span class="num">${fmt.pct(p)}</span></span>`; };
  const head = months.map(m => `<th scope="col" class="r${m === ym ? ' dk-now' : ''}">${esc(m === nowYm ? t('{month}, so far', { month: fmt.month(m, 'bare') }) : fmt.month(m, 'bare'))}</th>`).join('');
  const body = lines.map(l => `<tr><td><button class="linkbtn dk-catn" data-a="filter-cat" data-cat="${esc(l.c.id === 'other' ? 'none' : l.c.id)}"><i class="dk-dot" style="background:${catColor(l.c.id)}"></i>${esc(l.c.name)}</button></td>${l.vs.map((v, i) => `<td class="r num${months[i] === ym ? ' dk-now' : ''}">${v ? (months[i] === ym ? `<b>${n(v)}</b>` : n(v)) : '<span class="dk-mute">—</span>'}</td>`).join('')}<td class="r num">${l.a === null ? '—' : n(l.a)}</td><td>${vs(l.vs[at], l.a, catColor(l.c.id))}</td></tr>`).join('');
  return dkSec('rep-matrix', t('Categories, month by month'), esc(inProg ? t('In {currency}, rounded · the dark line is how much of the month has gone ({pct})', { pct: fmt.pct(Math.round(pace)), currency: curName(CUR) }) : t('In {currency}, rounded', { currency: curName(CUR) })), '',
    dkCard(`<div class="dk-tbl-wrap"><table class="dk-tbl" id="rep-matrix-tbl"><thead><tr><th scope="col">${t('Category')}</th>${head}<th scope="col" class="r">${t('Average')}</th><th scope="col" class="dk-wrap">${inProg ? esc(t('{month} against the average', { month: fmt.month(ym, 'bare') })) : t('vs average')}</th></tr></thead><tbody>${body}
      <tr class="tot"><td><b>${t('Total')}</b></td>${totals.map((v, i) => `<td class="r num${months[i] === ym ? ' dk-now' : ''}"><b>${n(v)}</b></td>`).join('')}<td class="r num"><b>${ta === null ? '—' : n(ta)}</b></td><td>${ta ? `<span class="num dk-mute">${inProg ? fmt.pct(Math.round(totals[at] * 100 / ta)) : ''}</span>` : ''}</td></tr></tbody></table></div>`), info(t('What each category cost in each of the last six months, its monthly average over the other months already closed, and the month shown against that average (while a month is in progress, how much of the average it has used so far). Press a category to see its transactions of the month shown. A month marked * is still in progress.')));
}
/** The first month (nothing to compare it with yet): each category against the plan of the month: what it cost, what the plan gives it, what is
    left of it, and how much of it is used (while the month is in progress, with the mark of how far the month has gone). */
function dkRepVsPlan(bk, CUR, ym) {
  if (!bk.plan || !bk.plan.lines || !bk.plan.lines.length) return '';
  const nowYm = ymOf(S.today), inProg = ym === nowYm, pace = inProg ? monthPace(S.today) : null, spent = categoryTotals(bk, ym, CUR).byCat, plan = {};
  for (const l of linesLive(bk, ym)) { const v = planValue(bk, l, ym); if (v > 0) plan[l.categoryId || 'other'] = (plan[l.categoryId || 'other'] || 0) + v; }
  const known = id => bk.categories.find(c => c.id === id), ids = [...new Set([...Object.keys(plan), ...Object.keys(spent).filter(k => spent[k] > 0)])].filter(id => !(known(id) || {}).income);
  const lines = ids.map(id => ({ id, c: known(id), v: Math.max(0, spent[id] || 0), p: plan[id] || 0 })).sort((a, b) => b.p - a.p || b.v - a.v);
  if (!lines.length || !sum(lines.map(l => l.p))) return '';
  const n = v => fmt.money(v, null, { bare: true, round: true }), col = l => l.c ? catColor(l.id) : 'var(--col-muted)';
  const use = (v, a, c) => { if (!a) return '<span class="dk-mute">—</span>'; const pc = Math.round(v * 100 / a); if (!inProg) { const d = Math.round((v - a) * 1000 / a) / 10; return `<span class="num">${d > 0 ? '▲' : d < 0 ? '▼' : ''} ${fmt.pct(Math.abs(d))}</span>`; }
    return `<span class="dk-share"><span class="dk-share-bar" aria-hidden="true"><i style="width:${Math.min(100, pc)}%;background:${c}"></i><b style="left:${pace}%"></b></span><span class="num${pc > 100 ? ' neg' : ''}">${fmt.pct(pc)}</span></span>`; };
  const left = (v, a) => a ? `<span class="num${a - v < 0 ? ' neg' : ''}">${n(a - v)}</span>` : '<span class="dk-mute">—</span>';
  const body = lines.map(l => `<tr><td><button class="linkbtn dk-catn" data-a="filter-cat" data-cat="${esc(l.id === 'other' ? 'none' : l.id)}"><i class="dk-dot" style="background:${col(l)}"></i>${esc(l.c ? l.c.name : t('Not filed yet'))}</button></td><td class="r num dk-now">${l.v ? `<b>${n(l.v)}</b>` : '<span class="dk-mute">—</span>'}</td><td class="r num">${l.p ? n(l.p) : '<span class="dk-mute">—</span>'}</td><td class="r">${left(l.v, l.p)}</td><td>${use(l.v, l.p, col(l))}</td></tr>`).join('');
  const tv = sum(lines.map(l => l.v)), tp = sum(lines.map(l => l.p));
  return dkSec('rep-vsplan', t('Categories against the plan'), esc(inProg ? t('In {currency}, rounded · the dark line is how much of the month has gone ({pct})', { pct: fmt.pct(Math.round(pace)), currency: curName(CUR) }) : t('In {currency}, rounded', { currency: curName(CUR) })), `<a class="btn" href="#plan">${icon('calendar')}${t('Open the plan')}</a>`,
    dkCard(`<div class="dk-tbl-wrap"><table class="dk-tbl" id="rep-vsplan-tbl"><thead><tr><th scope="col">${t('Category')}</th><th scope="col" class="r dk-now">${esc(inProg ? t('{month}, so far', { month: fmt.month(ym, 'bare') }) : fmt.month(ym, 'bare'))}</th><th scope="col" class="r">${t('Plan')}</th><th scope="col" class="r">${t('Left in the plan')}</th><th scope="col" class="dk-wrap">${inProg ? esc(t('{month} against the plan', { month: fmt.month(ym, 'bare') })) : t('vs plan')}</th></tr></thead><tbody>${body}
      <tr class="tot"><td><b>${t('Total')}</b></td><td class="r num dk-now"><b>${n(tv)}</b></td><td class="r num"><b>${n(tp)}</b></td><td class="r"><b>${left(tv, tp)}</b></td><td>${use(tv, tp, 'var(--bq-accent)')}</td></tr></tbody></table></div>`),
    info(t('What each category has cost in the month, what the plan gives it (its fixed costs and spending limits), what is left of it, and how much of it has been used; while the month is in progress, the dark line is how much of the month has gone. A category without a line in the plan shows “—”. Press a category to see its transactions. Once a second month has transactions, this part compares the months.')));
}
/** The band: what came in and went out each month, what was left under it; a month opens it. While the months to show are fewer than seven, the
    ones to come stand as outlines after the current one, so the band keeps its shape from the first month. */
function dkRepTrend(rows, ym, CUR) {
  const nowYm = ymOf(S.today), pad = ym === nowYm ? Math.max(0, 7 - rows.length) : 0;
  if (rows.length < 2 && !pad) return '';
  const { top } = niceTicks(0, Math.max(1, ...rows.flatMap(([, v]) => [v.income, v.expenses]))), h = v => v > 0 ? Math.max(1, v * 100 / top) : 0;
  const done = rows.map(([m, v]) => m !== nowYm && v.count).lastIndexOf(true), lastDone = done >= 0 ? done : rows.length - 1, r0 = v => fmt.money(v, null, { bare: true, round: true });
  const grp = ([m, v], i) => {
    const say = `${fmt.month(m)}${m === nowYm ? ' ' + t('(month in progress)') : ''} · ${t('Income')} ${fmt.money(v.income, CUR)} · ${t('Expenses')} ${fmt.money(v.expenses, CUR)} · ${t('Left over')} ${fmt.money(v.saved, CUR)}`;
    return `<button class="dk-grp${m === ym ? ' on' : ''}${m === nowYm ? ' now' : ''}" data-a="set-month" data-ym="${m}" aria-pressed="${m === ym}" aria-label="${esc(say)}"><span class="dk-grp-b">
        ${i === lastDone ? `<b class="num in" style="bottom:calc(${h(v.income)}% + 6px)">${r0(v.income)}</b><b class="num out" style="bottom:calc(${h(v.expenses)}% + 6px)">${r0(v.expenses)}</b>` : ''}
        <i class="in${v.income ? '' : ' zero'}" style="height:${v.income ? h(v.income) + '%' : '2px'}"></i><i class="out${v.expenses ? '' : ' zero'}" style="height:${v.expenses ? h(v.expenses) + '%' : '2px'}"></i></span>
      <span class="dk-grp-m">${esc(fmt.month(m, 'bare'))}</span><small class="num">${m === nowYm ? t('in progress') : esc(t('keeps {amount}', { amount: r0(v.saved) }))}</small></button>`;
  };
  const right = `<span class="dk-keys2"><span><i class="dk-dot" style="background:var(--lk-lime)"></i>${t('In')}</span><span><i class="dk-dot" style="background:var(--lk-soft-2)"></i>${t('Out')}</span>${dkLink('data-a="dk-rep-table"', t('See as a table'))}</span>`;
  const ghost = i => `<div class="dk-gx" aria-hidden="true"><span class="dk-grp-b"></span><span class="dk-grp-m">${esc(fmt.month(addMonths(ym, i + 1), 'bare'))}</span><small>${t('to come')}</small></div>`;
  return dkBand('dk-trend-h', t('In and out, month by month'), right, `<div class="dk-grps">${rows.map(grp).join('')}${Array.from({ length: pad }, (_, i) => ghost(i)).join('')}</div>${pad ? `<p class="sr">${t('The months to come are added here as they go by.')}</p>` : ''}`);
}
function dkReports() {
  const bk = B(), CUR = BCUR(), ym = S.month, nowYm = ymOf(S.today), open = ym === nowYm, prevYm = addMonths(ym, -1), upTo = open ? isoDate(prevYm, +S.today.slice(8)) : null;
  const m = monthSummary(bk, ym, CUR), p = monthSummary(bk, prevYm, CUR, upTo);
  if (!m.count) return `<div class="card"><div class="empty"><b>${t('No data for {month}', { month: fmt.month(ym) })}</b>${t('Reports are calculated from transactions. Import a statement or pick another month.')}</div></div>`;
  const rows = repMonths(bk, CUR, ym, 7), done = repMonths(bk, CUR, ym, 12).filter(([mm, v]) => mm !== nowYm && mm !== ym && v.count).slice(-6);
  const plan = bk.plan && bk.plan.lines ? planTotals(bk, ym).expenses : 0, D = daysInMonth(ym), day = open ? +S.today.slice(8) : D;
  const diff = m.expenses - p.expenses;
  const chips = `${p.count ? dkChip(esc(open ? t('{amount} against the same days of {month}', { amount: fmt.money(diff, CUR, { sign: true }), month: yrMonth(prevYm) }) : t('{amount} against {month}', { amount: fmt.money(diff, CUR, { sign: true }), month: yrMonth(prevYm) })), diff > 0 ? 'warn' : diff < 0 ? 'go' : '') : ''}${open && plan ? dkChip(esc(t('The plan was at {amount}', { amount: fmt.money(Math.round(plan * day / D), CUR, { round: true }) }))) : ''}`;
  let side = '';
  if (done.length) {
    const inc = Math.round(sum(done.map(r => r[1].income)) / done.length), exp = Math.round(sum(done.map(r => r[1].expenses)) / done.length), left = inc - exp, rate = inc > 0 ? Math.round(left * 1000 / inc) / 10 : null;
    side = `${dkSideHead('dk-keep-h', t('What you keep each month, on average'))}<b class="dk-mid num${left < 0 ? ' neg' : ''}">${fmt.money(left, CUR, { round: true })}${rate === null ? '' : ` <small>${esc(t('{pct} of what comes in', { pct: fmt.pct(rate) }))}</small>`}</b>
      ${inc > 0 ? `<div class="dk-split" role="img" aria-label="${esc(t('Of {inc} that comes in a month, {exp} goes out and {left} is left', { inc: fmt.money(inc, CUR, { round: true }), exp: fmt.money(exp, CUR, { round: true }), left: fmt.money(Math.max(0, left), CUR, { round: true }) }))}"><span class="first${left > 0 ? '' : ' last'}" style="flex:${Math.min(exp, inc)} 1 0;background:var(--lk-soft-2)"></span>${left > 0 ? `<span class="last" style="flex:${left} 1 0;background:var(--lk-lime)"></span>` : ''}</div>` : ''}
      <p class="dk-say num">${esc(tn(done.length, 'Last {n} month: {inc} comes in, {exp} goes out', 'Last {n} months: {inc} comes in, {exp} goes out', { inc: fmt.money(inc, CUR, { round: true }), exp: fmt.money(exp, CUR, { round: true }) }))}</p>`;
  } else {      // no month closed yet: what is left of this one, and when the average takes its place
    const head = dkSideHead('dk-keep-h', open ? t('What you keep in {month}, so far', { month: yrMonth(ym) }) : t('What you kept in {month}', { month: yrMonth(ym) }));
    const then = open ? `<p class="dk-say">${esc(t('From {month} on, this is the average of your closed months.', { month: yrMonth(addMonths(ym, 1)) }))}</p>` : '';
    if (m.income > 0) {
      const left = m.income - m.expenses, rate = Math.round(left * 1000 / m.income) / 10;
      side = `${head}<b class="dk-mid num${left < 0 ? ' neg' : ''}">${fmt.money(left, CUR, { round: true })} <small>${esc(t('{pct} of what came in', { pct: fmt.pct(rate) }))}</small></b>
        <div class="dk-split" role="img" aria-label="${esc(t('{inc} came in, {exp} went out', { inc: fmt.money(m.income, CUR, { round: true }), exp: fmt.money(m.expenses, CUR, { round: true }) }))}"><span class="first${left > 0 ? '' : ' last'}" style="flex:${Math.min(m.expenses, m.income)} 1 0;background:var(--lk-soft-2)"></span>${left > 0 ? `<span class="last" style="flex:${left} 1 0;background:var(--lk-lime)"></span>` : ''}</div>
        <p class="dk-say num">${esc(t('{inc} came in, {exp} went out', { inc: fmt.money(m.income, CUR, { round: true }), exp: fmt.money(m.expenses, CUR, { round: true }) }))}</p>${then}`;
    } else side = `${head}<p class="dk-say">${esc(t('No income in {month} yet: with it, here you see what you keep.', { month: yrMonth(ym) }))}</p>${open ? `<div class="dk-acts"><button class="btn primary" data-a="quick-go" data-v="income">${icon('plus')}${t('Add income')}</button></div>` : ''}`;
  }
  const hero = dkHero({ label: open ? t('Spent in {month}, so far', { month: yrMonth(ym) }) : t('Spent in {month}', { month: yrMonth(ym) }), big: fmt.money(m.expenses, CUR), k: 'spending', from: 'reports', chips, side, sideId: side ? 'dk-keep-h' : '', band: dkRepTrend(rows, ym, CUR) });
  const noteP = dkFoot(t('Reports are generated from transactions each time you open them. Transfers between your own accounts and all company accounts are excluded.'));
  return `${hero}${dkSheet(`${dkGrid(`${dkRepDaily(bk, CUR, ym)}${dkRepWhere(bk, CUR, ym, m)}${dkRepBalance(rows, ym, CUR)}${dkRepPay(bk, CUR, ym)}`, 420)}${dkRepMatrix(bk, CUR, ym)}${noteP}`)}`;
}
/** "See as a table": the year, month by month. */
function repYearDrawer() {
  const L = { inc: t('Income'), exp: t('Expenses'), left: t('Left over'), rate: t('Left over, share of income') };
  return `<div class="body">${reportYear(B(), BCUR(), L, false, 1) || `<div class="empty">${t('No data for {month}', { month: fmt.month(S.month) })}</div>`}</div>`;
}
