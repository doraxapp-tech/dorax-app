// QC of paying yourself (owner, 2026-10-09: "what I do want is to be able to transfer from my PJ account to my household account"): the one way
// money crosses from one side to the other, each side keeping its own row.
//   1. on the company's side a transfer offers the company's accounts and, apart, the household's (no cards); on the household's side only its own;
//   2. to the household: no direction to choose, the household's income group to count it in (its first income row's by default), and a line
//      saying what happens;
//   3. saved: the company's row is a transfer out (not a cost), the household's an income in the chosen group, linked; the household's month and
//      its plan's income see it, the company's costs do not;
//   4. edited, the household's row follows; no longer to the household, it goes; deleted or ignored from either side, both go;
//   5. from a dollar account: what arrived in reais is asked for, and is what the household receives.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.user.company = true; A.space({ v: 'business' }); }); await page.waitForTimeout(250);
  const ym = await page.evaluate(() => ymOf(S.today));
  // ---------- 1. what a transfer can link ----------
  await page.evaluate(() => { A['new-tx'](); A['tx-type']({ v: 'transfer' }); }); await page.waitForSelector('#d-xfer');
  eq(await page.evaluate(() => { const g = [...document.querySelectorAll('#d-xfer optgroup')]; return [g.map(x => x.label), g[0] && [...g[0].querySelectorAll('option')].every(o => isBiz(o.value)), g[1] && [...g[1].querySelectorAll('option')].map(o => o.value).every(id => !isBiz(id) && acct(id).type !== 'credit')]; }),
    [['Company', 'Your household (paying yourself)'], true, true], 'company: a transfer offers its own accounts and, apart, the household’s (no cards)');
  // ---------- 2. to the household ----------
  await page.selectOption('#d-xfer', 'nu-conta'); await page.waitForSelector('#d-home-cat');
  const want = await page.evaluate(() => { const c = S.categories.find(k => k.income), r = payRows(S, +S.today.slice(0, 4))[0]; return catKey(c.id, r.sub); });
  eq(await page.evaluate(() => [document.querySelector('#d-home-cat').value, !!document.querySelector('#d-dir'), /Paying yourself: it leaves the company as a transfer, not a cost, and comes into Nubank account as household income/.test(document.querySelector('.drawer').innerText), document.querySelector('label[for="d-xfer"]').innerText.trim()]),
    [want, false, true, 'Goes into'], 'to the household: its first income row’s group by default, no direction to choose, and it says what happens');
  // ---------- 3. saved ----------
  const before = await page.evaluate(ym => { const co = bookOf(S, 'business:BRL'), r = payRows(S, +ym.slice(0, 4))[0]; return { home: monthSummary(S, ym, 'BRL').income, co: monthSummary(co, ym, 'BRL'), pay: payActual(S, r, ym, 'BRL'), bal: [accountBalance(S, 'nu-pj'), accountBalance(S, 'nu-conta')] }; }, ym);
  await page.fill('#d-merchant', 'Pro-labore'); await page.fill('#d-amount', '3.000,00'); await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(200);
  const rows = () => page.evaluate(() => { const c = S.transactions.find(k => k.merchant === 'Pro-labore' && isBiz(k.accountId)), h = c && S.transactions.find(k => k.linkId === c.linkId && k !== c); return c ? { c: [c.accountId, c.type, c.amount, c.transferAccountId, c.status], h: h ? [h.accountId, h.type, h.amount, catKey(h.categoryId, h.subcategoryId), h.transferAccountId, h.status, h.date === c.date] : null, link: !!c.linkId } : null; });
  eq(await rows(), { c: ['nu-pj', 'transfer', -300000, 'nu-conta', 'confirmed'], h: ['nu-conta', 'income', 300000, want, 'nu-pj', 'confirmed', true], link: true }, 'saved: a transfer out of the company and an income at home, in the chosen group, linked');
  eq(await page.evaluate(([ym, b]) => { const co = bookOf(S, 'business:BRL'), r = payRows(S, +ym.slice(0, 4))[0], m = monthSummary(co, ym, 'BRL'); return [monthSummary(S, ym, 'BRL').income - b.home, m.expenses - b.co.expenses, m.income - b.co.income, payActual(S, r, ym, 'BRL') - b.pay, accountBalance(S, 'nu-pj') - b.bal[0], accountBalance(S, 'nu-conta') - b.bal[1]]; }, [ym, before]),
    [300000, 0, 0, 300000, -300000, 300000], 'the household’s month and its plan’s income see the 3.000; the company’s costs and income do not; each balance moves');
  // ---------- 4. edited, deleted, ignored ----------
  const cid = await page.evaluate(() => S.transactions.find(k => k.merchant === 'Pro-labore' && isBiz(k.accountId)).id);
  await page.evaluate(id => A['open-tx']({ id }), cid); await page.waitForSelector('#d-home-cat');
  eq(await page.evaluate(() => [document.querySelector('#d-home-cat').value, document.querySelector('#d-xfer').value]), [want, 'nu-conta'], 'opened again: where it went and how it counts at home');
  await page.fill('#d-amount', '3.500,00'); await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(150);
  eq((await rows()).h.slice(0, 3), ['nu-conta', 'income', 350000], 'edited: the household’s row follows the amount');
  await page.evaluate(id => A['open-tx']({ id }), cid); await page.waitForSelector('#d-xfer');
  await page.selectOption('#d-xfer', 'wise-brl'); await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(150);
  eq(await rows(), { c: ['nu-pj', 'transfer', -350000, 'wise-brl', 'confirmed'], h: null, link: false }, 'sent to another company account instead: the household’s row goes');
  await page.evaluate(id => A['open-tx']({ id }), cid); await page.waitForSelector('#d-xfer'); await page.selectOption('#d-xfer', 'nu-conta'); await page.waitForSelector('#d-home-cat'); await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(150);
  ok(!!(await rows()).h, 'to the household again: its row is back');
  await page.evaluate(id => { A['open-tx']({ id }); A['ignore-tx'](); }, cid); await page.waitForTimeout(100);
  eq([(await rows()).c[4], (await rows()).h[5]], ['ignored', 'ignored'], 'ignored on one side: both are');
  await page.evaluate(id => { A['open-tx']({ id }); A['ignore-tx'](); }, cid); await page.waitForTimeout(100);
  const hid = await page.evaluate(() => { const c = S.transactions.find(k => k.merchant === 'Pro-labore' && isBiz(k.accountId)); return S.transactions.find(k => k.linkId === c.linkId && k !== c).id; });
  await page.evaluate(() => A.space({ v: 'personal' })); await page.waitForTimeout(200);
  await page.evaluate(id => A['open-tx']({ id }), hid); await page.waitForSelector('.drawer');
  ok(await page.evaluate(() => /Paid by the company from Nubank PJ\. Deleting it deletes the company’s transfer too\./.test(document.querySelector('.drawer').innerText)), 'the household’s row says where it came from');
  await page.evaluate(() => { const x = UI.drawer.draft; x.amountText = '3.400,00'; A['save-tx'](); }); await page.waitForTimeout(100);
  ok(await page.evaluate(id => { const h = S.transactions.find(k => k.id === id); return !!h.linkId && h.transferAccountId === 'nu-pj' && h.amount === 340000; }, hid), 'edited on its own (what arrived), it stays linked');
  await page.evaluate(id => { A['open-tx']({ id }); A['ask-delete'](); }, hid); await page.waitForSelector('#modal-ok'); await page.click('#modal-ok'); await page.waitForTimeout(150);
  eq([await rows(), await page.evaluate(() => S.transactions.some(k => k.merchant === 'Pro-labore'))], [null, false], 'deleted from the household: both rows go');
  // ---------- 5. from dollars ----------
  await page.evaluate(() => { A.space({ v: 'business' }); A['new-tx'](); UI.drawer.draft.accountId = 'wise-usd'; A['tx-type']({ v: 'transfer' }); }); await page.waitForSelector('#d-xfer');
  await page.selectOption('#d-xfer', 'nu-conta'); await page.waitForSelector('#d-home-amt');
  ok(await page.evaluate(() => document.querySelector('label[for="d-home-amt"]').innerText.replace('*', '').trim() === 'Arrived in BRL' && !!document.querySelector('label[for="d-home-amt"] .req')), 'from a dollar account: what arrived in reais is asked for, and required');
  await page.fill('#d-merchant', 'Profit share'); await page.fill('#d-amount', '1.000,00'); await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => /Enter what arrived at home, in BRL/.test(document.querySelector('.drawer').innerText)), 'without it, it is asked for');
  await page.fill('#d-home-amt', '5.400,00'); await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => { const c = S.transactions.find(k => k.merchant === 'Profit share' && isBiz(k.accountId)), h = S.transactions.find(k => k.linkId === c.linkId && k !== c); return [c.amount, c.currency, h.amount, h.currency]; }), [-100000, 'USD', 540000, 'BRL'], 'US$ 1.000 out of the company, R$ 5.400 into the household');
  // ---------- the household's side ----------
  await page.evaluate(() => { A.space({ v: 'personal' }); A['new-tx'](); A['tx-type']({ v: 'transfer' }); }); await page.waitForSelector('#d-xfer');
  ok(await page.evaluate(() => !document.querySelector('#d-xfer optgroup') && [...document.querySelectorAll('#d-xfer option')].map(o => o.value).filter(Boolean).every(id => !isBiz(id))), 'household: a transfer links its own accounts only');
  // where it leaves from and where it goes, side by side, the date under them (owner, 2026-10-09: "it is confusing which account the money leaves")
  eq(await page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return [document.querySelector('label[for="d-account"]').innerText.trim(), document.querySelector('label[for="d-xfer"]').innerText.trim(), Math.abs(r('#d-account').top - r('#d-xfer').top) < 2 && r('#d-account').right < r('#d-xfer').left, r('#d-date').top > r('#d-account').bottom, !!document.querySelector('.tx-route .tx-arrow')]; }),
    ['Leaves from', 'Goes into', true, true, true], 'a transfer: “Leaves from” and “Goes into” side by side with an arrow, the date under them');
  await page.evaluate(() => { A.close(); const x = S.transactions.find(k => k.type === 'transfer' && k.amount > 0 && !isBiz(k.accountId)) || (() => { const t = { id: 'tin', accountId: 'nu-conta', date: S.today, description: 'From BB', merchant: 'From BB', amount: 20000, currency: 'BRL', type: 'transfer', categoryId: null, subcategoryId: null, status: 'confirmed', transferAccountId: 'bb', notes: '', source: 'manual', splits: null }; S.transactions.unshift(t); return t; })(); window.__tin = x.id; A['open-tx']({ id: x.id }); }); await page.waitForSelector('#d-xfer');
  eq(await page.evaluate(() => [document.querySelector('label[for="d-xfer"]').innerText.trim(), document.querySelector('label[for="d-account"]').innerText.trim(), document.querySelector('#d-xfer').getBoundingClientRect().left < document.querySelector('#d-account').getBoundingClientRect().left]), ['Leaves from', 'Goes into', true], 'money that came in: the other account is where it left from, this one where it went');
  await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => S.transactions.find(k => k.id === window.__tin).amount > 0), 'saved again, it is still money that came in');
  // which of a card's money (owner, 2026-10-09: "the system assumes I am transferring with the credit and not the debit, and does not let me choose")
  await page.evaluate(() => { A.close(); A['new-tx'](); A['tx-pay']({ v: 'credit' }); }); await page.waitForTimeout(80);
  const was = await page.evaluate(() => acct(UI.drawer.draft.accountId).type);
  await page.evaluate(() => A['tx-type']({ v: 'transfer' })); await page.waitForSelector('.tx-pocket');
  eq([was, ...(await page.evaluate(() => [acct(UI.drawer.draft.accountId).type, [...document.querySelectorAll('.tx-pocket button')].map(b => b.innerText.trim() + ':' + b.getAttribute('aria-pressed'))]))], ['credit', 'checking', ['Debit:true', 'Credit:false']],
    'an expense on the card’s credit turned into a transfer leaves from the debit, and says so; the credit is one touch away');
  await page.click('.tx-pocket [data-v="credit"]'); await page.selectOption('#d-xfer', 'bb'); await page.fill('#d-merchant', 'Cash advance'); await page.fill('#d-amount', '100,00'); await page.click('.drawer footer [data-a="save-tx"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'Cash advance'); return [acct(x.accountId).type, x.amount, x.transferAccountId]; }), ['credit', -10000, 'bb'], 'chosen, the credit is where it leaves from');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-pay-yourself');
})();
