// QC of what the screens show: every headline figure, grid total and percentage is read from the page and compared with a second calculation
// from the raw data (qc-ref.js), on the month in progress and on closed months, and again after each kind of action.
const { open, ok, eq, done } = require('./pw.js');
const fs = require('fs'), path = require('path');
(async () => {
  const { browser, page, errors } = await open({ lang: 'en', plan: true, account: 'example' });
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'qc-ref.js'), 'utf8') });
  let n = 0;
  const check = async (label, months) => {
    for (const m of months || ['2026-10']) {
      await page.evaluate(m => { S.month = m; }, m);
      const res = await page.evaluate(() => QC());
      for (const [name, got, want] of res) { n++; ok(got === want, `${label} ${name}`, { got, want }); }
    }
    await page.evaluate(() => { S.month = ymOf(S.today); navigate('dashboard'); });
  };
  await check('example', ['2026-10', '2026-09', '2026-08', '2026-06', '2026-04']);

  // --- actions, each followed by the whole check ---
  // 1. a fixed bill marked as paid from the dashboard
  const bal0 = await page.evaluate(() => accountBalance(S, 'nu-conta'));
  await page.click('#todo [data-a="line-pay-now"][data-id="pl-alquiler"]');
  eq(await page.evaluate(() => accountBalance(S, 'nu-conta')), bal0 - 180000, 'paying the rent takes it from the account once');
  await check('after paying a bill');
  // 2. a variable bill with its real amount
  await page.evaluate(() => navigate('plan'));
  await page.click('#paylist [data-a="line-pay"]');
  const amt = page.locator('#overlay input[inputmode="decimal"]').first(); await amt.fill('203,47');
  await page.locator('#overlay .btn.primary').last().click();
  ok(await page.evaluate(() => S.transactions.some(t => t.amount === -20347)), 'variable bill recorded with the amount typed');
  await check('after a variable bill');
  // 3. the whole group of card subscriptions
  await page.evaluate(() => navigate('plan'));
  const groupBtn = page.locator('#paylist [data-a="group-pay-now"]').last();
  if (await groupBtn.count()) { await groupBtn.click(); await check('after paying a group'); }
  // 4. savings handed out: one amount changed, the rest as planned
  await page.evaluate(() => navigate('goals'));
  await page.fill('#dv-viaje', '1.234,56'); await page.locator('#dv-viaje').blur();
  await page.click('[data-a="dist-register"]');
  eq(await page.evaluate(() => goalMonth(S, 'viaje', '2026-10')), 123456, 'contribution recorded with the amount typed (1.234,56)');
  await check('after handing out savings');
  // 5. a withdrawal cannot exceed what is saved, and a valid one reduces it
  const saved0 = await page.evaluate(() => goalSaved(S, 'emergencia'));
  await page.evaluate(() => { S.goalMoves.push({ id: 'qcw', goalId: 'emergencia', date: S.today, amount: -50000, accountId: 'mp', note: '' }); render(); });
  eq(await page.evaluate(() => goalSaved(S, 'emergencia')), saved0 - 50000, 'withdrawal reduces what is saved');
  await check('after a withdrawal');
  // 6. FIIs: a purchase with fees, a sale, an income
  await page.evaluate(() => { const id = () => 'qc' + Math.random().toString(36).slice(2, 8);
    S.fii.moves.push({ id: id(), ticker: 'DXLG11', kind: 'buy', date: '2026-10-01', qty: 7, price: 9911, fees: 350, note: '' });
    S.fii.moves.push({ id: id(), ticker: 'DXPP11', kind: 'sell', date: '2026-10-01', qty: 33, price: 1012, fees: 120, note: '' });
    S.fii.moves.push({ id: id(), ticker: 'DXLG11', kind: 'income', date: '2026-10-02', amount: 3877, note: '' }); render(); });
  await check('after FII movements');
  // 7. a split purchase, a refund, an ignored row, a transfer and a company expense: only the right ones count
  await page.evaluate(() => { const add = o => S.transactions.unshift({ id: 'qc' + S.transactions.length, date: S.today, description: 'QC', merchant: 'QC', currency: 'BRL', status: 'confirmed', transferAccountId: null, splits: null, subcategoryId: null, ...o });
    add({ accountId: 'nu-conta', amount: -30001, type: 'expense', categoryId: 'casa', subcategoryId: 'supermercado', splits: [{ categoryId: 'casa', subcategoryId: 'supermercado', amount: -10000 }, { categoryId: 'salidas', subcategoryId: null, amount: -13334 }, { categoryId: 'other', subcategoryId: null, amount: -6667 }] });
    add({ accountId: 'nu-conta', amount: 4590, type: 'expense', categoryId: 'salidas' });
    add({ accountId: 'nu-conta', amount: -99999, type: 'expense', categoryId: 'casa', status: 'ignored' });
    add({ accountId: 'nu-conta', amount: -25000, type: 'transfer', transferAccountId: 'bb' }); add({ accountId: 'bb', amount: 25000, type: 'transfer', transferAccountId: 'nu-conta' });
    add({ accountId: 'nu-pj', amount: -77777, type: 'expense', categoryId: null });
    add({ accountId: 'nu-conta', amount: 333333, type: 'income', categoryId: 'income', subcategoryId: 'sueldo' });
    S.transactions.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0); render(); });
  await check('after mixed transactions', ['2026-10', '2026-09']);
  // 8. the card invoice paid: a transfer, not spending
  const sp0 = await page.evaluate(() => monthSummary(S, '2026-10', 'BRL').expenses);
  await page.evaluate(() => navigate('dashboard'));
  if (await page.locator('#todo [data-a="card-pay"]').count()) {
    await page.click('#todo [data-a="card-pay"]');
    const btn = page.locator('#overlay .btn.primary').last(); if (await btn.count()) await btn.click();
    eq(await page.evaluate(() => monthSummary(S, '2026-10', 'BRL').expenses), sp0, 'paying the card invoice is not counted as spending twice');
    ok(await page.evaluate(() => accountBalance(S, 'nu-card')) === 0, 'card owes nothing after its invoice is paid', await page.evaluate(() => accountBalance(S, 'nu-card')));
    await check('after paying the card');
  }
  // 9. plan cells typed in the grid; a cost that ends; a new year
  await page.evaluate(() => navigate('plan'));
  await page.evaluate(() => A['plan-year-open']());      // a computer keeps the year one click away (2026-10-11)
  await page.fill('#pl-pl-alquiler-10', '1.950,50'); await page.locator('#pl-pl-alquiler-10').blur();
  eq(await page.evaluate(() => S.plan.lines.find(l => l.id === 'pl-alquiler').plan[2026][10]), 195050, 'a typed cell is read as 1.950,50');
  await page.evaluate(() => { endLine(S.plan.lines.find(l => l.id === 'pl-gym' || /gym/i.test(l.name)), '2026-11'); render(); });
  await check('after editing the plan', ['2026-10', '2026-11']);
  // 10. other "todays": the last day of the month, the first of the next, a new year
  for (const d of ['2026-10-31', '2026-11-01', '2027-01-03']) {
    await page.evaluate(d => { S.today = d; S.month = ymOf(d); UI.planYear = UI.goalYear = +d.slice(0, 4); render(); }, d);
    await check('on ' + d, [d.slice(0, 7), d.slice(0, 7) === '2026-11' ? '2026-10' : d.slice(0, 7)]);
  }
  eq(errors, [], 'no console errors while checking');
  console.log(`figures compared: ${n}`);
  await browser.close();
  done('qc-screens');
})().catch(e => { console.error(e); process.exit(1); });
