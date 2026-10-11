// QC: no letters where money or a count is typed (owner, 2026-10-09: "check that no field where money is typed accepts letters").
//   1. every field that takes money, on every screen and main panel of both sides, is marked as an amount (inputmode="decimal") or a count
//      (inputmode="numeric");
//   2. typed for real into the main ones, letters never appear: "1a2b,5c0" is "12,50"; a pasted "R$ 1.234,56" keeps its number; an amount keeps a
//      minus at the start, a count none; the caret stays where the person is typing;
//   3. every marked field of the app does the same.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.user.company = true; });
  // ---------- 1. every money field is marked ----------
  const sweep = () => page.evaluate(() => {
    const money = /amount|price|fee|limit|balance|spend|target|monthly|initial|saved|cost|income|yield|closing|amt|owed|open|cash|qty|less|more|aside|once/i, found = {}, unmarked = [];
    const grab = where => document.querySelectorAll('input[type=text], input:not([type])').forEach(el => {
      const key = [el.id, el.dataset.k, el.dataset.c].filter(Boolean).join('|'); if (found[key]) return; found[key] = el.getAttribute('inputmode') || '-';
      if (money.test(key) && !/^(decimal|numeric)$/.test(el.getAttribute('inputmode') || '')) unmarked.push(key + ' @' + where);
    });
    const panels = [() => A['new-tx'](), () => { A['new-tx'](); UI.drawer.draft.splits = [{ catKey: '|', amountText: '' }, { catKey: '|', amountText: '' }]; renderOverlay(); }, () => { A['new-tx'](); UI.drawer.draft.type = 'transfer'; if (isBiz(UI.drawer.draft.accountId)) UI.drawer.draft.transferAccountId = 'wise-usd' === UI.drawer.draft.accountId ? 'nu-conta' : 'nu-conta'; renderOverlay(); },
      () => A['line-new']({}), () => A['goal-new']({}), () => A['edit-account']({ id: '' }), () => A['edit-account']({ id: 'nu-conta' }), () => A['runway-edit'](), () => A.whatif({}), () => A['fii-move']({ kind: 'buy' }), () => A['card-pay']({ id: 'nu-card' }),
      () => { const l = B().plan.lines.find(x => x.pay !== 'fixed') || B().plan.lines[0]; A['line-pay']({ id: l.id, ym: S.month }); }, () => { const g = B().goals[0]; if (g) A['goal-move']({ id: g.id, dir: 'in' }); }];
    for (const side of ['personal', 'business']) {
      A.space({ v: side });
      for (const r of sideRoutes(ROUTES).map(x => x[0])) { UI.drawer = null; navigate(r); grab(side + ' ' + r); }
      for (const [i, f] of panels.entries()) { try { UI.drawer = null; navigate('dashboard'); f(); grab(side + ' panel ' + i); } catch (e) { } }
    }
    A.close(); A.space({ v: 'personal' });
    return { n: Object.values(found).filter(v => v === 'decimal' || v === 'numeric').length, unmarked };
  });
  const sw = await sweep();
  eq(sw.unmarked, [], 'every field that takes money or a count says so (' + sw.n + ' of them)');
  // ---------- 2. typed for real ----------
  const typeInto = async (sel, text) => { await page.click(sel, { clickCount: 3 }); await page.keyboard.press('Backspace'); await page.keyboard.type(text); return page.inputValue(sel); };
  const paste = (sel, text) => page.evaluate(([sel, text]) => { const el = document.querySelector(sel); el.focus(); el.select(); document.execCommand('insertText', false, text); return el.value; }, [sel, text]);
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-amount');
  eq(await typeInto('#d-amount', '1a2b,5c0'), '12,50', 'a transaction’s amount: letters typed never appear');
  eq(await paste('#d-amount', 'R$ 1.234,56'), '1.234,56', 'pasted with its symbol, the number stays');
  await page.click('#d-amount', { clickCount: 3 }); await page.keyboard.type('100'); await page.keyboard.press('ArrowLeft'); await page.keyboard.type('x');
  eq(await page.evaluate(() => { const el = document.querySelector('#d-amount'); return [el.value, el.selectionStart]; }), ['100', 2], 'the caret stays where the person was typing');
  await page.evaluate(() => A.close());
  await page.evaluate(() => A['edit-account']({ id: 'nu-card' })); await page.waitForSelector('#a-open');
  eq(await typeInto('#a-open', '-1o.250,00'), '-1.250,00', 'a card’s opening balance keeps its minus, not the letter');
  await page.evaluate(() => A.close());
  await page.evaluate(() => A['line-new']({})); await page.waitForSelector('#l-amount');
  eq(await typeInto('#l-amount', 'abc'), '', 'a fixed cost’s amount: nothing but letters, nothing at all');
  await page.evaluate(() => A.close());
  await page.evaluate(() => { navigate('investments'); }); await page.waitForTimeout(100);
  if (await page.locator('#sim-qty').count()) eq(await typeInto('#sim-qty', '-1a0'), '10', 'a count of quotas: digits only, no minus');
  await page.evaluate(() => A['runway-edit']()); await page.waitForSelector('#rw-spend');
  eq(await typeInto('#rw-spend', '4.5x00'), '4.500', 'what goes out in a month');
  await page.evaluate(() => A.close());
  // the import review's amount
  await page.evaluate(() => { navigate('imports'); });
  await page.setInputFiles('#imp-file-csv', { name: 'x.csv', mimeType: 'text/csv', buffer: Buffer.from('Data,Valor,Descrição\n02/10/2026,-15.00,Padaria', 'utf8') });
  await page.waitForFunction(() => UI.imp && UI.imp.step === 'map'); await page.click('[data-a="imp-review"]'); await page.waitForFunction(() => UI.imp.step === 'review');
  const amt = await page.evaluate(() => { UI.imp.only = 'all'; render(); const el = document.querySelector('.review .amt-in'); return el ? '#' + el.id : null; });
  if (amt) eq((await typeInto(amt, '-2z0,00')), '-20,00', 'the import review’s amount');
  await page.evaluate(() => { A['imp-cancel'] && A['imp-cancel'](); });
  // ---------- 3. every marked field ----------
  const all = await page.evaluate(() => {
    const bad = [], seen = new Set();
    // a day or a count in a number field: the browser itself keeps no letter in it (its value is empty), which is a refusal too
    const tryAll = where => document.querySelectorAll('input[inputmode="decimal"], input[inputmode="numeric"]').forEach(el => {
      const key = el.id || el.dataset.k; if (seen.has(key)) return; seen.add(key);
      const was = el.value; el.value = 'x9y,5'; el.dispatchEvent(new Event('input', { bubbles: true })); const now = (document.getElementById(el.id) || el).value; if (now !== '9,5' && !(el.type === 'number' && now === '')) bad.push(key + ' @' + where + ' → ' + now);
    });
    for (const side of ['personal', 'business']) { A.space({ v: side }); for (const r of sideRoutes(ROUTES).map(x => x[0])) { UI.drawer = null; navigate(r); tryAll(side + ' ' + r); } }
    return [seen.size, bad];
  });
  ok(all[0] > 10 && !all[1].length, 'every marked field of every screen refuses letters (' + all[0] + ')', all[1]);
  eq(errors, [], 'no error in the console'); await browser.close();
  // the first-time setup and the company's setup, before an account exists
  ({ browser, page, errors } = await open({ lang: 'en', viewport: { width: 1280, height: 900 } }));
  const sl = await page.evaluate(() => { const els = [...document.querySelectorAll('input[type=text]')].filter(e => /amount|0,00/.test(e.placeholder) || e.closest('.ob-slide')); return els.map(e => [e.id, e.getAttribute('inputmode')]); });
  ok(sl.length >= 3 && sl.every(x => x[1] === 'decimal'), 'the home page’s calculator: its money fields say so too', sl);
  if (sl.length) { const id = '#' + sl[0][0]; await page.click(id, { clickCount: 3 }); await page.keyboard.type('2k0.000'); eq(await page.inputValue(id), '20.000', 'and refuse letters'); }
  eq(errors, [], 'public: no error in the console'); await browser.close();
  done('qc-money-fields');
})();
