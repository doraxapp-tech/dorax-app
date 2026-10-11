// QC of Sprint 2, part 2 (owner, 2026-10-10: "do the sprints"; claude/open-gaps-funcionalidades-2026-10-10.md, item 4): a purchase on the card in
// installments.
//   1. the arithmetic: equal parts with the odd cents on the first; the purchase's day each month, the month's last day when it is shorter;
//   2. the form: "Installments" only for a new expense on a card's credit; said as it is chosen and as the amount is typed;
//   3. saved: one row on each coming invoice, each "i/n"; only the first counts in today's balance and this month's spending; the next invoice
//      estimate carries the next one; the card's limit used counts them all;
//   4. the card's details: "Installments to come", month by month; its list shows nothing still to come;
//   5. an installment opened says which one it is; deleted, it takes the ones after it; a bank line of it is flagged as a possible duplicate;
//   6. Spanish; 320 px; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  // ---------- 1. the arithmetic ----------
  eq(await page.evaluate(() => [instSplit(100001, 3), instDates('2026-01-31', 3), instDates('2026-11-15', 3)]), [[33335, 33333, 33333], ['2026-01-31', '2026-02-28', '2026-03-31'], ['2026-11-15', '2026-12-15', '2027-01-15']], 'equal parts, the odd cents on the first; the 31st becomes the 28th in February');
  // ---------- 2. the form ----------
  const card = await page.evaluate(() => S.accounts.find(a => a.type === 'credit').id);
  await page.evaluate(() => A['new-tx']());
  eq(await page.evaluate(() => !!document.querySelector('#d-inst')), false, 'an expense paid by debit: no installments');
  await page.click('[data-a="tx-pay"][data-v="credit"]');
  eq(await page.evaluate(() => [!!document.querySelector('#d-inst'), $('d-inst').value, document.querySelector('#tx-inst-say').innerText]), [true, '1', ''], 'on the card’s credit: “Installments”, at once to start, nothing said yet');
  await page.selectOption('#d-inst', '10'); await page.fill('#d-merchant', 'Phone'); await page.fill('#d-amount', '1000');
  eq(await page.evaluate(() => document.querySelector('#tx-inst-say').innerText), '10x of R$ 100,00 · the last one in July 2027', 'as the amount is typed: how much each, and when the last one is');
  await page.click('[data-a="tx-type"][data-v="income"]');
  eq(await page.evaluate(() => !!document.querySelector('#d-inst')), false, 'an income: no installments');
  await page.click('[data-a="tx-type"][data-v="expense"]');
  // ---------- 3. saved ----------
  const before = await page.evaluate(id => [accountBalance(S, id, S.today), cardInvoices(S, S.today, CUR).find(c => c.accountId === id && c.ym === '2026-11').amount], card);
  await page.evaluate(() => { if (!document.querySelector('#d-inst')) document.querySelector('[data-a="tx-pay"][data-v="credit"]').click(); });
  await page.evaluate(() => { UI.drawer.draft.inst = '10'; renderOverlay(); });
  await page.click('[data-a="save-tx"]');
  const rows = await page.evaluate(() => S.transactions.filter(x => x.inst).sort((a, b) => a.inst.i - b.inst.i).map(x => [x.date, x.amount, x.inst.i, x.inst.n, x.inst.total, x.merchant, x.accountId]));
  eq([rows.length, rows[0], rows[1][0], rows[9][0], new Set(rows.map(r => r[6])).size], [10, ['2026-10-02', -10000, 1, 10, 100000, 'Phone', card], '2026-11-02', '2027-07-02', 1], 'ten rows on the card, one a month on the 2nd, R$ 100 each, each knowing which one it is');
  eq(await page.evaluate(() => UI.toast.msg), '10 installments of R$ 100,00 added, one on each invoice.', 'and it says so');
  eq(await page.evaluate(([id, b]) => [accountBalance(S, id, S.today) - b[0], cardInvoices(S, S.today, CUR).find(c => c.accountId === id && c.ym === '2026-11').amount - b[1], categoryTotals(S, '2026-10', CUR).byCat.other], [card, before]),
    [-10000, 10000, await page.evaluate(() => categoryTotals(S, '2026-10', CUR).byCat.other)], 'only the first counts today (R$ 100 off the balance); November’s invoice carries the next one');
  ok(await page.evaluate(() => { const x = S.transactions.find(k => k.inst && k.inst.i === 2); return (categoryTotals(S, '2026-11', CUR).byCat[x.categoryId] || 0) >= 10000; }), 'November’s spending has its installment');
  // ---------- 4. the card's details ----------
  await page.evaluate(id => A['card-view']({ id }), card);
  eq(await page.evaluate(() => { const s = document.querySelector('.inst-ahead'); return [s.querySelector('h3').innerText, s.querySelector('.inst-ahead-h b').innerText, s.querySelectorAll('.inst-months li').length, s.querySelector('.inst-months li').innerText.replace(/\s+/g, ' ')]; }),
    ['Installments to come', 'R$ 900', 7, 'NOV R$ 100'], 'the card’s details: R$ 900 still to come, month by month (six, then “+3 more”)');
  eq(await page.evaluate(() => { document.querySelector('.op-fn [data-v="credit"]') && document.querySelector('.op-fn [data-v="credit"]').click(); return [[...document.querySelectorAll('.cv-ops .op-row')].every(b => !/2026-1[12]|2027/.test(b.dataset.id) ), [...document.querySelectorAll('.cv-ops .op-row .inst-tag')].map(x => x.innerText)]; }),
    [true, ['1/10']], 'its list shows what has happened only, the first installment wearing “1/10”');
  ok(await page.evaluate(id => { const lim = acct(id); return !lim.creditLimit || cardMeta(lim, true).includes(fmt.pct(Math.round((-accountBalance(S, id, S.today) + 90000) * 100 / lim.creditLimit))); }, card), 'the limit used counts the installments to come, as at the bank');
  // ---------- 5. one installment ----------
  await page.evaluate(() => { A.close(); navigate('transactions'); });
  eq(await page.evaluate(() => [...document.querySelectorAll('#tx-list .inst-tag')].map(x => x.innerText)), ['1/10'], 'Transactions, this month: the first, “1/10”');
  const third = await page.evaluate(() => S.transactions.find(x => x.inst && x.inst.i === 3).id);
  await page.evaluate(id => A['open-tx']({ id }), third);
  eq(await page.evaluate(() => [(document.querySelector('.tx-note') || { innerText: JSON.stringify([UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft && UI.drawer.draft.inst]) }).innerText.trim(), !document.querySelector('#d-inst')]), ['Installment 3 of 10 of a purchase of R$ 1.000,00. The last one is in July 2027.', true], 'opened: which one it is, of what purchase, when the last one is');
  await page.click('[data-a="ask-delete"]');
  ok(await page.evaluate(() => /installment 3 of 10: the 7 after it go too \(R\$ 700,00\)\. The ones before stay\./.test(document.querySelector('#modal-text').innerText)), 'deleting it says it takes the 7 after it, and keeps the ones before');
  await page.click('#modal-ok');
  eq(await page.evaluate(() => S.transactions.filter(x => x.inst).map(x => x.inst.i).sort((a, b) => a - b)), [1, 2], 'deleted: 1 and 2 stay');
  eq(await page.evaluate(id => { const d = findDuplicate({ amount: -10000, date: '2026-11-07', description: 'PHONE STORE PARC 02/10', merchant: 'Phone store' }, id, S.transactions); return d && [d.certainty, d.txn.inst.i]; }, card), ['possible', 2], 'the bank’s line of the second one (“02/10”, another day) is flagged as a possible duplicate, never merged by itself');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- Spanish, 320 px ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; A['new-tx'](); });
  await page.click('[data-a="tx-pay"][data-v="credit"]'); await page.selectOption('#d-inst', '3'); await page.fill('#d-amount', '300');
  eq(await page.evaluate(() => [document.querySelector('label[for="d-inst"]').innerText, document.querySelector('#d-inst option').innerText, document.querySelector('#tx-inst-say').innerText]), ['Cuotas', 'Al contado', '3 cuotas de R$ 100,00 · la última en diciembre de 2026'], 'es: “Cuotas”, “Al contado”, in plain words');
  eq(await page.evaluate(() => [document.querySelector('.drawer .body').scrollWidth <= document.querySelector('.drawer .body').clientWidth, $('d-inst').getBoundingClientRect().height >= 44]), [true, true], 'es, 320 px: nothing to drag sideways; the field a thumb high');
  eq(errors, [], 'es: no error in the console'); await browser.close();
  done('qc-installments');
})().catch(e => { console.error('qc-installments: Error', e); process.exit(1); });
