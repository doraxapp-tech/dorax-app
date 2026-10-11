// QC (owner, 2026-10-11): "do something similar to the summary [as the Plan]; feel free to add or remove sections or info; make sure the user gets
// the most out of the summary at a glance".
//   1. a computer: the month's figures, then three to a row: You can spend, To do, Days of freedom; Goals, Spending by category, the insight; about
//      half the old height;
//   2. each card says its one thing: "You can spend" opens how it was worked out (a panel in the middle); To do lists the next four; the categories
//      the five largest, with the way to all of them;
//   3. the month by month chart, the funds and the latest transactions wait one click away: a line names them and opens the list, where each has
//      its eye; shown again, it comes back;
//   4. a narrower window: two to a row; a phone keeps its own summary; Spanish; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.user.closeSeen = { '2026-09': true }; navigate('dashboard'); scrollTo(0, 0); });
  // ---------- 1. the page ----------
  eq(await page.evaluate(() => { const g = [...document.querySelectorAll('#view .dash-grid')]; return [document.querySelectorAll('#view .kpis .kpi').length, g.map(x => [...x.children].map(c => c.id)), getComputedStyle(g[0]).gridTemplateColumns.split(' ').length]; }),
    [5, [['free-card', 'todo', 'runway-card', 'goals-card', 'cat-card', 'insight-card']], 3], 'the five figures; then You can spend, To do, Days of freedom; Goals, the categories, the insight; three to a row');
  eq(await page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return [Math.abs(r('free-card').top - r('todo').top) < 2 && Math.abs(r('todo').top - r('runway-card').top) < 2, r('goals-card').top > r('free-card').bottom - 1, document.documentElement.scrollHeight < 1600]; }),
    [true, true, true], 'two rows of three; about half the old height (it was 2.600 px)');
  // ---------- 2. each card ----------
  eq(await page.evaluate(() => [!document.querySelector('#free-card .fu-steps'), !!document.querySelector('#free-card .fu-bar'), !!document.querySelector('#free-card .fu-how')]), [true, true, true], 'You can spend: the figure, the line and the bar; the steps one click away');
  await page.click('#free-card .fu-how');
  eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('#overlay .drawer').classList.contains('pop'), document.querySelectorAll('#overlay .fu-steps li').length >= 3]), ['free-view', true, true], '“How we worked it out”: the steps, in a panel in the middle');
  await page.evaluate(() => A.close());
  const bills = await page.evaluate(() => upcomingBills(B(), B().today, CUR, 30).filter(p => p.dueDate || !onCard(B(), p)).length + cardInvoices(B(), B().today, CUR).filter(c => !c.paid && c.amount > 0 && c.days <= 30).length);
  eq(await page.evaluate(() => [document.querySelectorAll('#todo .li.todo:not(.nod) .when').length <= 5, document.querySelectorAll('#todo .li.todo').length <= 6, !document.querySelector('#todo [data-a="due-days"]'), /more bills? in the plan/.test(document.querySelector('#todo').innerText)]), [true, true, true, bills > 4], 'To do: the next four (and the savings to hand out), the rest said in one line; the due days left to the Plan');
  eq(await page.evaluate(() => document.querySelectorAll('#cat-card .legend-row').length <= 5), true, 'the categories: five at most');
  // ---------- 3. one click away ----------
  eq(await page.evaluate(() => [!document.querySelector('#trend-card'), !document.querySelector('#fii-card'), !document.querySelector('#recent-card'), document.querySelector('.dash-more').innerText.trim()]),
    [true, true, true, 'Also for the summary: Monthly spending, Investments (FIIs), Recent transactions'], 'the chart, the funds and the latest transactions wait, named in one line');
  await page.click('.dash-more');
  eq(await page.evaluate(() => [UI.drawer.kind, [...document.querySelectorAll('#overlay .ord-list li.off b')].map(b => b.innerText), document.querySelectorAll('#overlay .ord-eye').length === document.querySelectorAll('#overlay .ord-list li').length]), ['dash-order', ['Monthly spending', 'Investments (FIIs)', 'Recent transactions'], true], 'the line opens the list: each part with its eye, the three waiting ones off');
  await page.click('#overlay .ord-eye[data-id="recent"]');
  eq(await page.evaluate(() => [!!document.querySelector('#view #recent-card'), S.user.dashHidden['home-pc'].includes('recent'), document.querySelector('.dash-more').innerText.includes('Recent transactions')]), [true, false, false], 'its eye: the latest transactions back on the summary, across the whole width');
  await page.click('#overlay [data-a="dash-order-reset"]');
  eq(await page.evaluate(() => [!document.querySelector('#view #recent-card'), !(S.user.dashHidden || {})['home-pc']]), [true, true], '“Original order”: as it was');
  await page.evaluate(() => A.close());
  // ---------- 4. widths, a phone, Spanish ----------
  await page.setViewportSize({ width: 1200, height: 900 }); await page.evaluate(() => render());
  eq(await page.evaluate(() => getComputedStyle(document.querySelector('#view .dash-grid')).gridTemplateColumns.split(' ').length), 2, '1200 px: two to a row');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  eq(await page.evaluate(() => [!document.querySelector('#view .dash-grid'), !!document.querySelector('#free-card .rw-tap'), !document.querySelector('.dash-more')]), [true, true, true], 'a phone keeps its own summary');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  eq(await page.evaluate(() => [document.querySelector('.dash-more').innerText.trim(), document.querySelector('#free-card .fu-how').innerText.trim()]), ['También para el resumen: Gasto mensual, Inversiones (FIIs), Transacciones recientes', 'Cómo lo calculamos'], 'es: in plain words');
  eq(errors, [], 'es: no error in the console'); await browser.close();
  done('qc-dash-glance');
})().catch(e => { console.error('qc-dash-glance: Error', e); process.exit(1); });
