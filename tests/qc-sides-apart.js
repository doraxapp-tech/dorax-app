// QC: the household's and the company's money never mix (owner, 2026-10-09: "I went into the PJ side, added an income and it was recorded in the
// household account"; "why do I see my household's information in the Company view (transactions, import history...)? I told you to make a
// dashboard totally apart from the household's. We cannot fail at that: the claim is that the accounts do not mix").
//   1. a new transaction on the company's side starts in a company account and offers only the company's accounts; its sentence never takes it to
//      the household's; saved, the income is the company's and the household's month does not move. The same from the phone's quick list;
//   2. Transactions lists the side on screen whatever the filter does: cleared, "file them", a category, an account of the other side (which
//      takes the app to that side); its filters offer only the side's accounts and categories, and there is no "Household and company";
//   3. Imports: each side imports into its own accounts and lists its own imports;
//   4. search, the bell and the next reminders are the side's; the statements for the accountant are never on the household's side;
//   5. a transfer links accounts of the same side, and from the company the household's apart, for paying yourself (tests/qc-pay-yourself.js);
//   6. every screen and the main panels of each side, on a computer and on a phone, show nothing of the other side.
const { open, ok, eq, done } = require('./pw.js');
const PHONE = { viewport: { width: 390, height: 844 }, touch: true, mobile: true };
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.user.company = true; A.space({ v: 'business' }); }); await page.waitForTimeout(300);
  // ---------- 1. a new transaction on the company's side ----------
  await page.click('.topbar .btn.primary[data-a="new-tx"]'); await page.waitForSelector('#d-account');
  eq(await page.evaluate(() => { const x = UI.drawer.draft, opts = [...document.querySelectorAll('#d-account option')].map(o => o.value).filter(Boolean); return [acct(x.accountId).scope, opts.length > 0 && opts.every(id => isBiz(id))]; }), ['business', true],
    'company: “Add transaction” starts in a company account and offers only the company’s accounts');
  await page.evaluate(() => { A['tx-type']({ v: 'income' }); }); await page.fill('#d-merchant', 'Client payment'); await page.fill('#d-amount', '4.000,00');
  const before = await page.evaluate(() => ({ home: monthSummary(S, ymOf(S.today), 'BRL').income, co: monthSummary(bookOf(S, 'business:' + acct(UI.drawer.draft.accountId).currency), ymOf(S.today), acct(UI.drawer.draft.accountId).currency).income, cur: acct(UI.drawer.draft.accountId).currency }));
  await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(b => { const x = S.transactions.find(k => k.merchant === 'Client payment'); return [!!x && isBiz(x.accountId), monthSummary(S, ymOf(S.today), 'BRL').income - b.home, monthSummary(bookOf(S, 'business:' + b.cur), ymOf(S.today), b.cur).income - b.co]; }, before),
    [true, 0, 400000], 'saved: the income is the company’s; the household’s month does not move, the company’s grows by R$ 4.000');
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-say');
  await page.fill('#d-say', 'salario 4000 nubank'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => acct(UI.drawer.draft.accountId).scope), 'business', 'company: a sentence naming a bank never takes it to a household account');
  await page.evaluate(() => { UI.drawer.draft.type = 'transfer'; renderOverlay(); }); await page.waitForTimeout(80);
  ok(await page.evaluate(() => { const g = [...document.querySelectorAll('#d-xfer optgroup')]; return g.length === 2 && [...g[0].querySelectorAll('option')].every(o => isBiz(o.value)) && [...g[1].querySelectorAll('option')].every(o => !isBiz(o.value)); }),
    'company: a transfer links company accounts, and the household’s apart, for paying yourself (owner, 2026-10-09; tests/qc-pay-yourself.js)');
  await page.evaluate(() => A.close());
  // ---------- 2. Transactions ----------
  await page.evaluate(() => navigate('transactions'));
  const allCo = () => page.evaluate(() => filteredTx().every(x => isBiz(x.accountId)) && filteredTx().length >= 0);
  const homeCat = await page.evaluate(() => S.categories[0].id), homeAcct = await page.evaluate(() => personal()[0].id);
  for (const [what, run] of [['the opening view', () => {}], ['filters cleared', () => A['clear-filters']()], ['“file them”', () => A['tx-inbox']()], ['a household category', c => A['filter-cat']({ cat: c, all: '1' })]]) {
    await page.evaluate(run, homeCat); await page.waitForTimeout(60);
    eq(await page.evaluate(() => [UI.space, filteredTx().filter(x => !isBiz(x.accountId)).length]), ['business', 0], `company Transactions, ${what}: nothing of the household`);
  }
  await page.evaluate(() => { A['clear-filters'](); A['tx-filters'](); }); await page.waitForSelector('#tx-account');
  eq(await page.evaluate(() => [!!document.querySelector('#tx-scope'), [...document.querySelectorAll('#tx-account option')].map(o => o.value).filter(Boolean).every(id => isBiz(id)), [...document.querySelectorAll('#tx-cat option')].map(o => o.value).filter(v => v && v !== 'none').every(v => companyCats().some(c => c.id === v || c.subs.some(s => s.id === v)))]),
    [false, true, true], 'company filters: no “Household and company”, the company’s accounts and categories only');
  await page.evaluate(() => A.close());
  await page.evaluate(id => A['view-account']({ id }), homeAcct); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.space, filteredTx().every(x => !isBiz(x.accountId))]), ['personal', true], 'a household account’s transactions open on the household’s side');
  await page.evaluate(() => { A['clear-filters'](); A['tx-filters'](); }); await page.waitForSelector('#tx-account');
  ok(await page.evaluate(() => [...document.querySelectorAll('#tx-account option')].map(o => o.value).filter(Boolean).every(id => !isBiz(id)) && filteredTx().every(x => !isBiz(x.accountId))), 'household Transactions and filters: nothing of the company');
  await page.evaluate(() => A.close());
  // ---------- 3. Imports ----------
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('imports'); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [document.querySelectorAll('.imp-hist tbody tr').length === 1 && !!document.querySelector('.imp-hist .empty'), !document.querySelector('#sheet-card, [data-a="sheet-pick"]')]), [true, true], 'company Imports: none of the household’s imports, no household spreadsheet');
  await page.setInputFiles('#imp-file-csv', { name: 'PJ_2026-10.csv', mimeType: 'text/csv', buffer: Buffer.from('Data,Valor,Descrição\n02/10/2026,1500.00,Pix recebido cliente\n03/10/2026,-80.00,Tarifa', 'utf8') });
  await page.waitForFunction(() => UI.imp && UI.imp.step === 'map');
  eq(await page.evaluate(() => [isBiz(UI.imp.accountId), [...document.querySelectorAll('#imp-acct option')].map(o => o.value).every(id => isBiz(id))]), [true, true], 'company: a statement goes into a company account, and only the company’s are offered');
  await page.click('[data-a="imp-review"]'); await page.waitForFunction(() => UI.imp.step === 'review');
  await page.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; r.seen = true; }); A['imp-commit'](); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [...document.querySelectorAll('.imp-hist tbody td.first b')].map(b => b.innerText.trim())), ['PJ_2026-10.csv'], 'its history lists it');
  await page.evaluate(() => A.space({ v: 'personal' })); await page.evaluate(() => navigate('imports')); await page.waitForTimeout(150);
  ok(await page.evaluate(() => { const fs = [...document.querySelectorAll('.imp-hist tbody td.first b')].map(b => b.innerText.trim()); return fs.length > 0 && !fs.includes('PJ_2026-10.csv') && [...document.querySelectorAll('#imp-acct option')].every(o => !isBiz(o.value)); }), 'household Imports: its own history, without the company’s');
  // ---------- 4. search, reminders, statements ----------
  const findOn = (side, words) => page.evaluate(([side, words]) => { A.space({ v: side }); return words.filter(w => findResults(w).some(x => x.kind >= 2 && (x.title === w))); }, [side, words]);
  const homeWords = await page.evaluate(() => [...personal().map(a => a.name), ...S.transactions.filter(x => !isBiz(x.accountId)).map(x => x.merchant).filter(m => m && !S.transactions.some(y => isBiz(y.accountId) && y.merchant === m)).slice(0, 12)]);
  const coWords = await page.evaluate(() => [...business().map(a => a.name), ...S.transactions.filter(x => isBiz(x.accountId)).map(x => x.merchant).filter(m => m && !S.transactions.some(y => !isBiz(y.accountId) && y.merchant === m)).slice(0, 12)]);
  eq(await findOn('business', homeWords), [], 'company search: none of the household’s accounts or transactions');
  eq(await findOn('personal', coWords), [], 'household search: none of the company’s');
  await page.evaluate(() => A.space({ v: 'personal' })); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [activeReminders().every(r => !remindBiz(r)), !!document.querySelector('#view .banner') && /statements are due/.test(document.querySelector('#view').innerText)]), [true, false], 'household: its own reminders; no statements for the accountant');
  await page.evaluate(() => A.space({ v: 'business' })); await page.waitForTimeout(200);
  ok(await page.evaluate(() => activeReminders().every(r => remindBiz(r))), 'company: its own reminders');
  eq(await page.evaluate(() => { const n = side => { A.space({ v: side }); const b = document.querySelector('#nav a[href="#transactions"] .count'); return b ? +b.innerText : 0; }, want = biz => S.transactions.filter(x => x.status === 'pending' && isBiz(x.accountId) === biz).length; return [n('business') === want(true), n('personal') === want(false), want(false) > 0]; }),
    [true, true, true], 'the menu counts the pending transactions of the side on screen only');
  // ---------- 6. every screen, both sides ----------
  const sweep = async (pg, tag) => pg.evaluate(() => {
    const words = biz => { const accs = S.accounts.filter(a => (a.scope === 'business') === biz), other = S.accounts.filter(a => (a.scope === 'business') !== biz), ids = new Set(accs.map(a => a.id)), oids = new Set(other.map(a => a.id));
      const theirs = new Set(S.transactions.filter(x => oids.has(x.accountId)).flatMap(x => [x.merchant, x.description]));
      const w = new Set(accs.map(a => a.name)); S.transactions.filter(x => ids.has(x.accountId)).forEach(x => [x.merchant, x.description].forEach(v => { if (v && v.length >= 6 && !theirs.has(v)) w.add(v); }));
      (S.imports || []).filter(i => ids.has(i.accountId)).forEach(i => w.add(i.file));
      const names = [...companyCats(), ...S.categories].flatMap(c => [c.name, ...c.subs.map(s => s.name)]);
      return [...w].filter(v => !other.some(a => a.name.includes(v) || v.includes(a.name)) && !names.some(n => n.includes(v)));
    };
    const out = {};
    for (const side of ['business', 'personal']) {
      A.space({ v: side }); const theirs = words(side !== 'business');
      for (const r of sideRoutes(ROUTES).map(r => r[0])) {
        UI.drawer = null; UI.sheet = false; navigate(r);
        const txt = ['#view', '#topbar', '#rail'].map(q => (document.querySelector(q) || {}).innerText || '').join('\n') + [...document.querySelectorAll('#view option, #topbar option')].map(o => o.text).join('\n');
        const hit = theirs.filter(v => txt.includes(v)); if (hit.length) out[side + ' ' + r] = hit.slice(0, 4);
      }
    }
    return out;
  });
  eq(await sweep(page), {}, 'computer: no screen of either side shows the other side’s accounts, transactions or imports');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- the phone ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, ...PHONE }));
  await page.evaluate(() => { S.user.greeted = true; S.user.company = true; A.space({ v: 'business' }); }); await page.waitForTimeout(300);
  await page.evaluate(() => A['quick-go']({ v: 'income' })); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.drawer.draft.type, acct(UI.drawer.draft.accountId).scope, [...document.querySelectorAll('#d-account option')].map(o => o.value).filter(Boolean).every(id => isBiz(id))]), ['income', 'business', true], 'phone, company: “Record money received” in a company account, offering only the company’s');
  await page.evaluate(() => A.close());
  eq(await sweep(page), {}, 'phone: no screen of either side shows the other side’s');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  done('qc-sides-apart');
})();
