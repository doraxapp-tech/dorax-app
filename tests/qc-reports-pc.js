// QC of Reports on a computer (owner, 2026-10-09: "the Reports tab on the computer is very basic, it gives me almost no information"). Every figure is
// worked out again here from the raw data and compared with what the page shows:
//   1. income and spending, month by month: one column pair a month from the first with movements, each month's figures on hover, the average of
//      the closed months; pressing a month opens it;
//   2. categories over six months: each cell, the total, the average of the other closed months and the month against it; while a month is in
//      progress, the share of the average used so far; a category opens its transactions;
//   3. where the money went: each merchant's total and number of payments; a name opens its transactions;
//   4. the balance at each month's end; 5. the year table on the household side too; 6. the company's side; a phone keeps its own two views.
const { open, ok, eq, done } = require('./pw.js');
const money = c => { const neg = c < 0, a = Math.abs(c), w = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (neg ? '−' : '') + 'R$ ' + w + ',' + String(a % 100).padStart(2, '0'); };
const unit = c => { const neg = c < 0, w = String(Math.round(Math.abs(c) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (neg ? '−' : '') + w; };
(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  await p.evaluate(() => { S.month = '2026-09'; navigate('reports'); }); await p.waitForTimeout(300);
  eq(await p.evaluate(() => ['rep-trend', 'rep-matrix', 'rep-merchants', 'rep-balance', 'rep-compare', 'rep-year'].map(id => !!document.getElementById(id))), [true, true, true, true, true, true], 'the computer’s page has its new parts, and keeps the comparison; the year table is on the household side too');
  // 1. month by month
  const raw = await p.evaluate(() => { const out = []; for (let y = '2025-10'; y <= '2026-09'; y = addMonths(y, 1)) { let inc = 0, exp = 0, n = 0; S.transactions.forEach(x => { if (ymOf(x.date) !== y || isBiz(x.accountId) || x.currency !== 'BRL' || x.status === 'ignored') return; n++; if (x.type === 'income') inc += x.amount; if (x.type === 'expense') exp -= x.amount; }); out.push([y, inc, exp, n]); } return out; });
  const shown = raw.slice(raw.findIndex(r => r[3]));
  eq(await p.evaluate(() => [...document.querySelectorAll('#rep-trend .colbtn')].map(b => [b.dataset.ym, b.getAttribute('aria-pressed')])), shown.map(r => [r[0], String(r[0] === '2026-09')]), 'one pair of columns a month, from the first month with movements, the month shown pressed');
  const tips = await p.evaluate(() => [...document.querySelectorAll('#rep-trend .colbtn')].map(b => b.dataset.tip));
  ok(tips.every((tp, i) => tp.includes('Income ' + money(shown[i][1])) && tp.includes('Expenses ' + money(shown[i][2])) && tp.includes('Left over ' + money(shown[i][1] - shown[i][2]))), 'each month says its income, spending and what was left');
  const closed = shown.filter(r => r[0] !== '2026-10'), avg = k => Math.round(closed.reduce((s, r) => s + r[k], 0) / closed.length);
  const avgText = await p.evaluate(() => document.querySelector('#rep-trend .rep-avg').innerText.replace(/\s+/g, ' '));
  ok(avgText.includes(`Average of ${closed.length} months`) && avgText.includes('Income R$ ' + unit(avg(1))) && avgText.includes('Expenses R$ ' + unit(avg(2))), 'the average of the closed months: ' + avgText);
  eq(await p.evaluate(() => { const h = [...document.querySelectorAll('#rep-trend .colbtn')].map(b => [parseFloat(b.querySelector('i.in').style.height), parseFloat(b.querySelector('i.out').style.height)]); return h.every(([a, b]) => a >= 0 && a <= 100 && b >= 0 && b <= 100); }), true, 'the columns stay inside the chart');
  eq(await p.evaluate(() => [getComputedStyle(document.querySelector('#rep-trend i.in')).backgroundColor, getComputedStyle(document.querySelector('#rep-trend i.out')).backgroundColor, document.querySelector('#rep-trend .rep-legend').innerText.includes('Income')]), ['rgb(31, 163, 144)', 'rgb(144, 133, 233)', true], 'the two series: the checked teal and violet, named in the legend');
  // 2. categories over six months
  const mx = await p.evaluate(() => {
    const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'], cats = {};
    S.transactions.forEach(x => { if (x.type !== 'expense' || isBiz(x.accountId) || x.currency !== 'BRL' || x.status === 'ignored' || !months.includes(ymOf(x.date))) return; (x.splits || [{ categoryId: x.categoryId, amount: x.amount }]).forEach(s => { const c = s.categoryId || 'other', k = cats[c] || (cats[c] = months.map(() => 0)); k[months.indexOf(ymOf(x.date))] -= s.amount; }); });
    const rows = [...document.querySelectorAll('#rep-matrix-tbl tbody tr:not(.grand)')].map(r => [r.querySelector('button').dataset.cat, [...r.querySelectorAll('td.amt')].map(td => td.innerText.trim())]);
    return { cats, rows, total: [...document.querySelectorAll('#rep-matrix-tbl tr.grand td.amt')].map(td => td.innerText.trim()), head: [...document.querySelectorAll('#rep-matrix-tbl thead th')].map(th => th.textContent.trim()) };
  });
  const id = c => c === 'none' ? 'other' : c;
  ok(mx.rows.length > 0 && mx.rows.every(([c, cells]) => mx.cats[id(c)].every((v, i) => cells[i] === (v ? unit(v) : '—'))), 'each category’s cell is what it cost that month');
  ok(mx.rows.every(([c, cells]) => { const v = mx.cats[id(c)], a = Math.round(v.slice(0, 5).reduce((s, x) => s + x, 0) / 5), pc = Math.round((v[5] - a) * 1000 / a) / 10; return cells[6] === unit(a) && cells[7] === (a ? `${pc > 0 ? '▲' : pc < 0 ? '▼' : ''} ${String(Math.abs(pc)).replace('.', ',')}%`.trim() : '—'); }), 'its average over the other closed months, and September against it');
  eq(mx.total.slice(0, 6), shown.slice(-6).map(r => unit(r[2])), 'the total row is each month’s spending');
  eq(mx.head.slice(-2), ['Average', 'vs average'], 'a closed month is compared with the average');
  // 3. where the money went
  const mer = await p.evaluate(() => { const by = {}; S.transactions.filter(x => x.type === 'expense' && !isBiz(x.accountId) && x.currency === 'BRL' && x.status !== 'ignored' && ymOf(x.date) === '2026-09').forEach(x => { const k = normalizeText(x.merchant); by[k] = by[k] || [0, 0]; by[k][0] -= x.amount; by[k][1]++; });
    return [...document.querySelectorAll('#rep-merchants .hbar')].map(h => { const name = h.querySelector('button').innerText.trim(), b = by[normalizeText(name)] || [0, 0]; return [h.querySelector('.num').innerText.includes(fmt.money(b[0], 'BRL', { round: true })), h.querySelector('.num').innerText.includes(b[1] === 1 ? '1 payment' : b[1] + ' payments')]; }); });
  ok(mer.length > 0 && mer.every(([a, b]) => a && b), 'each merchant: its total and its number of payments');
  // 4. the balance at each month's end
  const bal = await p.evaluate(() => { const end = m => isoDate(m, 31); return [...document.querySelectorAll('#rep-balance .colbtn')].map(b => [b.dataset.tip, fmt.month(b.dataset.ym) + ': ' + fmt.money(personal().filter(a => a.currency === 'BRL').reduce((s, a) => { let v = a.opening; S.transactions.forEach(x => { if (x.accountId === a.id && x.status !== 'ignored' && x.date <= end(b.dataset.ym)) v += x.amount; }); return s + v; }, 0), 'BRL')]); });
  ok(bal.length === shown.length && bal.every(([a, b]) => a === b), 'each month-end balance is the household accounts’ balance that day');
  // pressing things
  await p.click('#rep-matrix-tbl tbody tr:first-child button'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [UI.route, UI.tx.category, UI.tx.month]), ['transactions', mx.rows[0][0], 'current'], 'a category opens its transactions of the month shown');
  await p.evaluate(() => navigate('reports')); await p.click('#rep-merchants .hbar button'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [UI.route, !!UI.tx.q, UI.tx.month, filteredTx().length > 0]), ['transactions', true, 'current', true], 'a merchant opens its transactions of the month');
  await p.evaluate(() => navigate('reports')); await p.click('#rep-trend .colbtn[data-ym="2026-07"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => S.month), '2026-07', 'a month’s columns open that month');
  // the month in progress
  await p.evaluate(() => { S.month = '2026-10'; navigate('reports'); }); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [[...document.querySelectorAll('#rep-matrix-tbl thead th')].pop().innerText.trim().toLowerCase(), document.querySelector('#rep-matrix-tbl thead th.now').innerText.includes('*'), document.querySelector('#rep-trend .colbtn[data-ym="2026-10"]').dataset.tip.includes('(month in progress)')]), ['share of the average', true, true], 'a month in progress: its share of an average month, marked *, said on hover');
  // 6. the company's side, and a phone
  await p.evaluate(() => { S.month = '2026-09'; UI.space = 'business'; navigate('reports'); }); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [document.querySelector('#rep-trend h2').innerText, document.querySelector('#rep-matrix h2').innerText, document.querySelector('#rep-merchants h2').innerText, document.querySelector('#rep-balance h2').innerText, !!document.getElementById('rep-year')]),
    ['Received and costs, month by month', 'Costs by group, month by month', 'Who was paid the most', 'The company’s balance at each month’s end', true], 'the company’s side has the same parts, in its words');
  // 7. an account with one month (owner, 2026-10-09: "it looks like none of the screenshots: no charts, only text to read")
  await p.evaluate(() => { UI.space = 'personal'; S.today = '2026-10-09'; S.month = '2026-10'; S.transactions = S.transactions.filter(x => x.date >= '2026-10-01');
    const add = (id, date, accountId, type, amount, merchant, categoryId) => S.transactions.push({ id, date, accountId, type, amount, currency: 'BRL', merchant, description: merchant, categoryId, subcategoryId: null, status: 'confirmed', notes: '' });
    add('m1', '2026-10-05', 'nu-conta', 'income', 400000, 'Sueldo', 'income'); add('m2', '2026-10-03', 'nu-card', 'expense', -11485, 'Claude', 'suscripciones'); add('m3', '2026-10-07', 'nu-card', 'expense', -5797, 'Name Cheap', 'suscripciones'); add('m4', '2026-10-08', 'nu-card', 'expense', -1063, 'IOF', 'other'); navigate('reports'); });
  await p.waitForTimeout(250);
  const one = await p.evaluate(() => { const m = monthSummary(S, '2026-10', 'BRL'); return { m, ids: ['rep-trend', 'rep-daily', 'rep-split', 'rep-plan', 'rep-merchants', 'rep-matrix', 'rep-balance', 'rep-compare', 'rep-year'].map(id => !!document.getElementById(id)),
    legend: document.querySelector('#rep-daily .rep-legend').innerText.replace(/\s+/g, ' '), tips: [...document.querySelectorAll('#rep-daily .dhit')].map(d => d.dataset.tip), split: [...document.querySelectorAll('#rep-split .legend-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim()),
    flex: [...document.querySelectorAll('#rep-split .stackbar > *')].reduce((s, x) => s + parseFloat(x.style.flex), 0), plan: document.querySelectorAll('#rep-plan .rp-row').length }; });
  eq(one.ids, [false, true, true, true, true, false, false, one.m.count && false, false], 'one month: the month day by day, where the income went, the plan and the merchants are there; what compares months, and an empty comparison, are not');
  ok(one.legend.includes('R$ ' + unit(one.m.expenses)) && one.tips[8].includes('R$ ' + money(one.m.expenses).slice(3)) && one.tips.length === 31, 'day by day: on day 9 the month has spent all of its spending so far, one place to point at for each of the 31 days');
  eq([one.flex, one.split.slice(-1)[0].startsWith('Left over')], [400000, true], 'where the income went: the bar is as long as the income, and what is left is its last part');
  ok(one.plan > 0 && one.plan <= 7, 'the plan against what was spent: one line for each, at most seven');
  await p.evaluate(() => { UI.space = 'personal'; }); await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => navigate('reports')); await p.waitForTimeout(300);
  eq(await p.evaluate(() => [!!document.getElementById('rep-trend'), !!document.getElementById('rep-matrix'), !!document.querySelector('.rep-view')]), [false, false, true], 'a phone keeps its two views');
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-reports-pc');
})();
