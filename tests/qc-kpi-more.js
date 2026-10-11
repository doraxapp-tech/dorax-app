// QC (owner, 2026-10-11): "in Plan, the KPI cards should open the pop-up in the middle of the screen and explain the breakdown, like the ones in
// Resumen; do this with all the KPIs: it is easier for the user and for me to just click and understand everything without looking for anything".
//   1. a computer: every figure tile of the Plan, Goals, Investments, Recurring and Reports is pressable and opens a card in the middle of the
//      screen; the card shows the tile's figure again, says what it is, and its sum's total is that figure; Close closes it;
//   2. its (i) keeps its own press; Reports' tiles open the summary's cards without the way to Reports;
//   3. a phone: the large total and the small figures of the Plan and Goals open the same cards;
//   4. Spanish; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.user.closeSeen = { '2026-09': true }; });
  const want = { plan: 4, goals: 4, investments: 4, recurring: 4, reports: 4 };
  for (const [route, n] of Object.entries(want)) {
    await page.evaluate(r => navigate(r), route);
    const tiles = await page.evaluate(() => [...document.querySelectorAll('#view .card.tile')].map(t => [t.classList.contains('tap'), !!t.querySelector('.kpi-open')]));
    eq([tiles.length, tiles.every(x => x[0] && x[1])], [n, true], `${route}: its ${n} figure tiles are pressable`);
    for (let i = 0; i < n; i++) {
      const fig = await page.evaluate(i => document.querySelectorAll('#view .card.tile .value')[i].innerText.trim(), i);
      await page.locator('#view .card.tile .kpi-open').nth(i).click();
      const c = await page.evaluate(() => { const d = document.querySelector('#overlay .drawer'), tot = d.querySelector('.kx-row.total b'); return [UI.drawer && UI.drawer.kind, d.classList.contains('pop'), d.querySelector('.kx-big').innerText.trim(), d.querySelector('.kx-say').innerText.trim().length > 20, tot ? tot.innerText.trim() : null, !!d.querySelector('[data-a="kpi-go"][data-v="reports"]')]; });
      const label = await page.evaluate(() => UI.drawer.title);
      ok(c[0] === 'kpi' && c[1] && (c[2] === fig || (route === 'reports' && i === 3)) && c[3] && (c[4] === null || c[4] === c[2] || route === 'reports' || /−|-/.test(c[4])) && (route !== 'reports' || !c[5]), `${route}: “${label}” opens its card in the middle: the figure again (${fig}), what it is, its sum`, c);
      await page.click('#overlay footer [data-a="close"]'); ok(await page.evaluate(() => !UI.drawer), `${route}: “${label}”: Close closes it`);
    }
  }
  // the (i) keeps its own press
  await page.evaluate(() => navigate('plan'));
  await page.locator('#view .card.tile .hint').first().click();
  ok(await page.evaluate(() => !UI.drawer), 'a tile’s (i) keeps its own press: no card');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- a phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; });
  for (const route of ['plan', 'goals']) {
    await page.evaluate(r => navigate(r), route);
    const keys = await page.evaluate(() => [...document.querySelectorAll('#view .g-total .kpi-open, #view .g-mini .kpi-open')].map(b => b.dataset.k));
    eq(keys.length, 4, `phone, ${route}: the large total and the three small figures are pressable`);
    for (const k of keys) {
      await page.tap(`#view [data-a="kpi-open"][data-k="${k}"]`);
      ok(await page.evaluate(() => UI.drawer && UI.drawer.kind === 'kpi' && !!document.querySelector('#overlay .kx-big')), `phone, ${route}: ${k} opens its card`);
      await page.evaluate(() => A.close());
    }
  }
  await page.evaluate(() => navigate('plan')); await page.tap('#view [data-a="kpi-open"][data-k="plan-left"]');
  eq(await page.evaluate(() => [UI.drawer.title, /^Los gastos fijos de /.test(document.querySelector('.kx-say').innerText)]), ['Falta pagar', true], 'es: in plain words');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  done('qc-kpi-more');
})().catch(e => { console.error('qc-kpi-more: Error', e); process.exit(1); });
