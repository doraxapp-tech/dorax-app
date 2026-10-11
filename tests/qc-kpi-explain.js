// QC: what a figure of the summary is made of (owner, 2026-10-09: "when I click the KPI cards in Resumen, open a card in the middle of the screen that
// expands the information so the person understands the numbers; to see more they can go to Reports").
//   1. each of the household's five tiles opens its card in the middle of the screen; its (i) and its link keep their own press;
//   2. the card shows the tile's figure and the sum that makes it, worked out from the same data (the parts add up to the figure);
//   3. the way further: Reports (in the view that holds the figure), the Plan for the bills, Accounts & savings for the balance; back returns to it;
//   4. the company's four tiles open theirs.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.settings.locale = 'en-US'; navigate('dashboard'); }); await page.waitForSelector('.kpi-open');
  eq(await page.evaluate(() => [...document.querySelectorAll('.kpis .kpi-open')].map(b => b.dataset.k)), ['net', 'income', 'spending', 'left', 'unpaid'], 'the five tiles can be pressed');
  // ---------- 1. the (i) and the link keep their press ----------
  await page.click('.kpi.tap .hint'); await page.waitForTimeout(100);
  eq(await page.evaluate(() => [UI.drawer, !document.getElementById('tip').hidden]), [null, true], 'the (i) of a tile shows its tip, not the card');
  const tile = k => page.evaluate(k => document.querySelector(`.kpi-open[data-k="${k}"]`).parentElement.querySelector('.value').textContent.trim(), k);
  const card = () => page.evaluate(() => { const d = document.querySelector('#overlay .drawer'); return d && { kind: UI.drawer.kind, k: UI.drawer.k, pop: d.classList.contains('pop'), big: d.querySelector('.kx-big').textContent.trim(), rows: [...d.querySelectorAll('.kx-row')].map(r => [r.querySelector('.grow').textContent.trim(), r.querySelector('.num').textContent.trim(), r.classList.contains('total')]), go: [...d.querySelectorAll('[data-a="kpi-go"]')].map(b => b.dataset.v) }; });
  // ---------- 2. each card ----------
  await page.click('.kpi-open[data-k="net"]'); await page.waitForSelector('#overlay .kx');
  let c = await card();
  eq([c.kind, c.k, c.pop, c.big === await tile('net'), c.go], ['kpi', 'net', true, true, ['accounts', 'reports']], 'the balance: its card, in the middle, with its figure; Accounts & savings and Reports further');
  eq(await page.evaluate(() => { const parts = [...document.querySelectorAll('#overlay .kx-row:not(.total) .num')].map(n => n.textContent), total = document.querySelector('#overlay .kx-row.total .num').textContent; const v = s => Math.round(parseFloat(s.replace(/[^\d.-]/g, '').replace(/^-?$/, '0')) * 100) * (/−|-/.test(s) ? -1 : 1);
    return Math.abs(parts.reduce((a, s) => a + Math.abs(v(s)) * (/−|-/.test(s) ? -1 : 1), 0) - Math.abs(v(total))) <= 2; }), true, 'its parts (each account, less what is owed on cards) add up to it');
  await page.waitForTimeout(350); const mid = await page.evaluate(() => { const r = document.querySelector('#overlay .drawer').getBoundingClientRect(); return [Math.round((r.left + r.right) / 2 - document.documentElement.clientWidth / 2), Math.round((r.top + r.bottom) / 2 - innerHeight / 2)]; }); ok(Math.abs(mid[0]) <= 10 && Math.abs(mid[1]) <= 2, 'in the middle of the screen (the room kept for the scroll bar aside)', mid);
  await page.click('#overlay footer [data-a="close"]'); await page.waitForTimeout(200);
  await page.click('.kpi-open[data-k="left"]'); await page.waitForSelector('#overlay .kx');
  c = await card();
  eq(await page.evaluate(() => { const m = monthSummary(B(), S.month, BCUR()); return [fmt.money(m.income, BCUR()), fmt.money(-m.expenses, BCUR()), fmt.money(m.saved, BCUR())]; }), c.rows.map(r => r[1]), 'left over: income, minus spending, equals what is left');
  await page.click('#overlay footer [data-a="close"]'); await page.waitForTimeout(200);
  await page.click('.kpi-open[data-k="unpaid"]'); await page.waitForSelector('#overlay .kx');
  c = await card();
  eq([c.big === await tile('unpaid'), c.rows.filter(r => !r[2]).length, await page.evaluate(() => dashParts().unpaid.length), c.go], [true, c.rows.filter(r => !r[2]).length, c.rows.filter(r => !r[2]).length, ['plan']], 'still to pay: each bill without a payment, by date; the Plan further');
  await page.click('#overlay [data-a="kpi-go"][data-v="plan"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.route, UI.drawer]), ['plan', null], 'its way further opens the Plan');
  await page.click('#back-pc button'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.route, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.k]), ['dashboard', 'kpi', 'unpaid'], 'and back: the summary with that card open again');
  await page.click('#overlay footer [data-a="close"]'); await page.waitForTimeout(200);
  // ---------- 3. spending: by category, each opening its transactions; Reports further ----------
  await page.click('.kpi-open[data-k="spending"]'); await page.waitForSelector('#overlay .kx');
  ok(await page.evaluate(() => { const bars = [...document.querySelectorAll('#overlay button.kx-bar')]; return bars.length > 0 && bars.length <= 6 && bars.every(b => b.dataset.a === 'filter-cat'); }), 'spending: its categories, each in its colour, each opening its transactions');
  await page.click('#overlay [data-a="kpi-go"][data-v="reports"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.route, UI.repView]), ['reports', 'out'], 'Reports, on its spending');
  await page.evaluate(() => navigate('dashboard')); await page.click('.kpi-open[data-k="income"]'); await page.waitForSelector('#overlay .kx');
  eq([(await card()).big === await tile('income')], [true], 'income: its card with its figure');
  await page.click('#overlay [data-a="kpi-go"][data-v="reports"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => UI.repView), 'in', 'Reports, on its income view');
  // ---------- the balance's link ----------
  await page.evaluate(() => navigate('dashboard')); const link = await page.$('.kpi-saved');
  if (link) { await link.click(); await page.waitForTimeout(150); eq(await page.evaluate(() => [UI.route, UI.drawer]), ['accounts', null], 'the link inside the balance’s tile keeps going to Accounts & savings'); }
  // ---------- 4. the company ----------
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); }); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [...document.querySelectorAll('.kpi-open')].map(b => b.dataset.k)), ['income', 'spending', 'left', 'transfers'], 'the company’s four tiles can be pressed');
  await page.click('.kpi-open[data-k="transfers"]'); await page.waitForSelector('#overlay .kx');
  eq(await page.evaluate(() => [UI.drawer.title, document.querySelectorAll('#overlay .kx-row').length]), ['Transfers out', 2], 'transfers out: what went out and what came in by transfer');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-kpi-explain');
})();
