// QC (owner, 2026-10-11): "on the phone the middle button is out of control, it has too many buttons; filter them by tab, show the ones relevant to
// the tab the person is looking at, or find a better solution if there is one".
//   1. always the same three, at the foot of the list, right over the +, in the same place on every screen: an expense, an income, a transfer;
//   2. then two or three for the screen in use, named by the screen; a screen with nothing of its own gets the summary's; a screen's own "new" first;
//   3. "All actions" folds the rest: nothing is lost, and nothing is listed twice;
//   4. a side with no account yet: adding one comes first;
//   5. the company's words; Spanish at 320 px with every word whole; no error in the console.
// The list itself and every action's landing: qc-phone.js. Thumbs and type sizes: qc-thumb.js.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; });
  const at = route => page.evaluate(r => { A.close(); navigate(r); A.quick(); const s = document.querySelector('.sheet.quick'), h = s.querySelector('.quick-h');
    return { base: [...s.querySelectorAll('.quick-base button')].map(b => b.dataset.v), h: h ? h.textContent.trim() : '', here: [...s.querySelectorAll('.quick-h + .quick-grid button')].map(b => b.dataset.v), all: !!s.querySelector('.quick-all'), y: s.querySelector('.quick-base').getBoundingClientRect().top }; }, route);
  // ---------- 1. the three, on every screen, in the same place ----------
  const routes = await page.evaluate(() => ROUTES.map(r => r[0]).filter(r => !['settings', 'profile'].includes(r) && typeof routeMain === 'function'));
  const seen = {};
  for (const r of routes) seen[r] = await at(r);
  ok(Object.values(seen).every(x => x.base.join() === 'expense,income,transfer'), 'every screen: an expense, an income, a transfer', Object.entries(seen).filter(([, x]) => x.base.join() !== 'expense,income,transfer').map(([r]) => r));
  ok(new Set(Object.values(seen).map(x => Math.round(x.y))).size === 1, 'in the same place on every screen, so the thumb learns it: + then “Expense” is always the same two taps');
  // ---------- 2. the screen's own ----------
  eq(await at('investments').then(x => [x.h, x.here[0]]), ['In Investments', 'main'], 'Investments: its own “new” first');
  eq(await page.evaluate(() => document.querySelector('.quick-h + .quick-grid [data-v="main"]').innerText.trim() === routeMain('investments')[2]), true, 'said in the screen’s own words');
  eq(await at('settings').then(x => [x.h, x.here]), ['In Settings', ['pay', 'save', 'import']], 'a screen with nothing of its own: the summary’s');
  ok(Object.values(seen).every(x => x.here.length >= 1 && x.here.length <= 4), 'never more than four for a screen (three, and its own “new”)');
  // ---------- 3. nothing lost, nothing twice ----------
  for (const r of ['dashboard', 'plan', 'goals', 'investments']) {
    const all = await page.evaluate(r => { A.close(); navigate(r); A.quick(); A['quick-all'](); return [...document.querySelectorAll('.sheet.quick button[data-v]')].map(b => b.dataset.v); }, r);
    const want = await page.evaluate(() => quickList().map(x => x[0]));
    eq([all.length, new Set(all).size, [...all].sort().join()], [want.length, want.length, [...want].sort().join()], `${r}: unfolded, every action once`);
  }
  eq(await page.evaluate(() => [document.querySelector('#quick-rest').hidden, document.querySelector('.quick-all').getAttribute('aria-controls')]), [false, 'quick-rest'], 'the folded part is named by the button that opens it');
  // ---------- 4. no account yet ----------
  eq(await page.evaluate(() => { const keep = S.accounts; S.accounts = keep.filter(a => a.scope === 'business'); A.close(); navigate('plan'); A.quick(); const v = [...document.querySelectorAll('.quick-h + .quick-grid button')].map(b => b.dataset.v); A.close(); S.accounts = keep; render(); return v; }), ['account', 'pay', 'cost', 'limit'], 'no household account yet: adding one comes first, before the screen’s own');
  // ---------- 5. the company ----------
  await page.evaluate(() => { A.close(); A.space({ v: 'business' }); }); await page.waitForTimeout(300);
  eq(await page.evaluate(() => { navigate('plan'); A.quick(); return [[...document.querySelectorAll('.quick-base button')].map(b => b.innerText.trim()), document.querySelector('.quick-h').textContent.trim()]; }), [['Cost', 'Received', 'Transfer'], 'In Plan'], 'the company: a cost, money received, a transfer');
  await page.evaluate(() => { A.close(); A.space({ v: 'personal' }); });
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- Spanish, 320 px ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); A.quick(); A['quick-all'](); });
  eq(await page.evaluate(() => { const s = document.querySelector('.sheet.quick'), whole = el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
    return [[...s.querySelectorAll('.quick-base button')].map(b => b.innerText.trim()), s.querySelector('.quick-h').textContent.trim(), s.querySelector('.quick-all').innerText.trim(), [...s.querySelectorAll('.quick-base span:last-child, .quick-grid button')].every(whole), document.documentElement.scrollWidth - innerWidth, s.scrollHeight <= s.clientHeight + 1 || getComputedStyle(s).overflowY !== 'visible']; }),
    [['Gasto', 'Ingresos', 'Transferencia'], 'En Plan', 'Menos acciones', true, 0, true], 'es, 320 px: “Gasto”, “Ingresos”, “Transferencia” whole; “En Plan”; unfolded, it scrolls inside itself');
  eq(await page.evaluate(() => { const s = document.querySelector('.sheet.quick'), base = s.querySelector('.quick-base'), y = () => Math.round(base.getBoundingClientRect().bottom); const a = y(); s.scrollTop = 0; const b = y(); s.scrollTop = s.scrollHeight; return [a === b && b === y(), y() <= innerHeight + 1, [...s.querySelectorAll('.quick-grid button')].every(b => b.querySelector('span:last-child').getClientRects().length <= 2 && b.getBoundingClientRect().height <= 70)]; }),
    [true, true, true], 'es, 320 px: the three stay at the foot while the list scrolls; no button of the grid over two lines');
  eq(errors, [], 'es: no error in the console'); await browser.close();
  done('qc-quick-sheet');
})().catch(e => { console.error('qc-quick-sheet: Error', e); process.exit(1); });
