// QC of changing the account after the review has started (owner, 2026-10-09: "sometimes I pick the wrong account, continue to the review and want
// to go back to change the bank, and I can't; move the bank to the next step or add a back button, without losing the import or the changes made"):
//   1. the review has the account too: choosing another reads the file again for it (a card's file the right way round) and keeps what was changed;
//   2. "Back to the columns" keeps the review; coming back to it keeps the changes; 3. the columns are remembered only for the account the file went into.
const { open, ok, eq, done } = require('./pw.js');
const CARD = ['date,title,amount', '2026-10-02,Padaria Sol,15.00', '2026-10-03,Mercado Bom,82.40', '2026-10-04,Posto Ipiranga,150.00', '2026-10-05,Loja Azul,40.00', '2026-10-07,Pagamento recebido,-77.79'].join('\n');
(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  await p.evaluate(() => { setMain(acct('nu-conta'), true); S.transactions = S.transactions.filter(x => x.date < '2026-10-01'); delete acct('nu-conta').csvMap; delete acct('nu-card').csvMap; UI.tx.account = ''; navigate('imports'); });
  await p.setInputFiles('#imp-file-csv', { name: 'Nubank_2026-10.csv', mimeType: 'text/csv', buffer: Buffer.from(CARD, 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map');
  eq(await p.evaluate(() => UI.imp.accountId), 'nu-conta', 'the card’s file starts on the main account (the mistake)');
  await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  eq(await p.evaluate(() => UI.imp.rows.map(r => [r.type, r.amount])), [['income', 1500], ['income', 8240], ['income', 15000], ['income', 4000], ['expense', -7779]], 'read for the account, the card’s purchases come in as income: the mistake shows');
  ok(await p.evaluate(() => !acct('nu-conta').csvMap), 'continuing does not yet remember the columns for that account');
  // changes made before seeing the mistake
  await p.evaluate(() => { const s = UI.imp, cat = S.categories.find(c => !c.income).id; rvApply(s, s.rows[0], 'merchant', 'Padaria do Bairro'); rvApply(s, s.rows[1], 'category', cat + '|'); s.rows[3].decision = 'ignore'; render(); });
  const cat = await p.evaluate(() => S.categories.find(c => !c.income).id);
  ok(await p.evaluate(() => { const b = document.querySelector('#imp-panel [data-a="imp-to-card"]'); return !!b && b.dataset.id === 'nu-card' && document.querySelector('#imp-panel').innerText.includes('This looks like the statement of a card.'); }), 'the review says the file looks like a card’s and offers the card');
  // 1. the account, in the review
  ok(await p.evaluate(() => !!document.querySelector('#imp-panel select#imp-acct')), 'the review has the account to import into');
  await p.click('#imp-panel [data-a="imp-to-card"]'); await p.waitForTimeout(150);      // as choosing the card in the list does
  eq(await p.evaluate(() => [UI.imp.step, UI.imp.accountId, UI.imp.invert, UI.imp.rows.map(r => [r.type, r.amount])]), ['review', 'nu-card', true, [['expense', -1500], ['expense', -8240], ['expense', -15000], ['expense', -4000], ['transfer', 7779]]], 'the card chosen: the file is read again for it, purchases as spending and the payment as a transfer');
  eq(await p.evaluate(() => [UI.imp.rows[0].merchant, UI.imp.rows[1].categoryId, UI.imp.rows[3].decision]), ['Padaria do Bairro', cat, 'ignore'], 'what was changed is kept: the name typed, the category chosen, the row ignored');
  ok(await p.evaluate(() => !document.querySelector('#imp-panel [data-a="imp-to-card"]')), 'on the card, the warning is gone');
  // 2. back to the columns, and again to the review
  await p.click('#imp-back'); await p.waitForFunction(() => UI.imp.step === 'map');
  eq(await p.evaluate(() => [document.querySelector('[data-a="imp-review"]').innerText.trim(), document.querySelector('#imp-acct').value, !!UI.imp.rows]), ['Back to the review', 'nu-card', true], 'back to the columns: the account is there, the review is kept, and the button says so');
  await p.selectOption('#imp-acct', 'nu-conta'); await p.selectOption('#imp-acct', 'nu-card'); await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  eq(await p.evaluate(() => [UI.imp.rows[0].merchant, UI.imp.rows[1].categoryId, UI.imp.rows[3].decision, UI.imp.rows[4].type]), ['Padaria do Bairro', cat, 'ignore', 'transfer'], 'back in the review: the changes are still there');
  // 3. the columns remembered for the account the file went into
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.seen = true; }); A['imp-commit'](); }); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [!!acct('nu-card').csvMap, !!acct('nu-conta').csvMap, acct('nu-card').csvMap && acct('nu-card').csvMap.invert]), [true, false, true], 'imported: the card remembers the columns and the way round; the account picked by mistake does not');
  eq(await p.evaluate(() => S.transactions.filter(x => x.importId === S.imports[0].id).map(x => [x.accountId, x.type, x.amount, x.merchant]).sort()), [['nu-card', 'expense', -1500, 'Padaria do Bairro'], ['nu-card', 'expense', -15000, 'Ipiranga'], ['nu-card', 'expense', -8240, 'Mercado Bom'], ['nu-card', 'transfer', 7779, 'Pagamento Recebido']].sort(), 'what entered: the card’s purchases and its payment, the ignored row left out');
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-import-back');
})();
