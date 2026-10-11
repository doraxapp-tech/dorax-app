// QC of a card's due date (owner, 2026-10-08: "fix the cards' due date, it must let me set the month: I put day 2 and I get late notices because it
// assumes October 2, but it is due now on November 2").
//   1. the rules: the next due date from a day (this month while the day is to come, else the next); a card given a day before the month was kept
//      gets it once, from its next due date;
//   2. the owner's case: on October 8, a card due on day 2 asks for nothing for October 2: its invoice is November 2, with what the card owes today,
//      and no late notice anywhere (the bell, Plan's to do);
//   3. the form: "Next invoice due on" is a date, filled with the next one; another month can be chosen; the day and the month are kept;
//   4. an invoice that really is late (its date given, gone, nothing paid) is still said; Spanish.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, today: '2026-10-08', viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  // ---------- 1. the rules ----------
  eq(await page.evaluate(() => [cardFromYm(2, '2026-10-08'), cardFromYm(8, '2026-10-08'), cardFromYm(31, '2026-10-08'), cardNextDue({ dueDay: 2, dueFrom: '2026-11' }, '2026-10-08'), cardNextDue({ dueDay: 15, dueFrom: '2026-12' }, '2026-10-08'), cardNextDue({ dueDay: 31, dueFrom: '2026-11' }, '2026-11-02')]),
    ['2026-11', '2026-10', '2026-10', '2026-11-02', '2026-12-15', '2026-11-30'], 'the next due date: this month while the day is to come, else the next; never before the first invoice given; day 31 is the month’s last');
  // ---------- 2. the owner's case ----------
  const card = await page.evaluate(() => { const a = S.accounts.find(x => x.type === 'credit' && x.scope === 'personal'); a.dueDay = 2; delete a.dueFrom; return a.id; });
  eq(await page.evaluate(id => { const before = cardInvoices(B(), S.today, CUR).filter(c => c.accountId === id).map(c => [c.date, c.days < 0 && !c.paid]); anchorCards(S, S.today); const a = acct(id); return [before[0], a.dueFrom]; }, card),
    [['2026-10-02', true], '2026-11'], 'before: day 2 read as October 2, late; the card given its month once: November');
  eq(await page.evaluate(id => { const inv = cardInvoices(B(), S.today, CUR).filter(c => c.accountId === id); return [inv.map(c => c.date), inv[0].amount === Math.max(0, -accountBalance(S, id, S.today)), inv[0].estimate, inv[0].days]; }, card),
    [['2026-11-02'], true, false, 25], 'now: nothing for October 2; its invoice is November 2, with what the card owes today, in 25 days');
  eq(await page.evaluate(id => [reminders(B(), S.today, CUR, { bills: true, lead: 3 }).filter(r => r.kind === 'card' && r.accountId === id).length], card), [0], 'no late notice for the card in the reminders (the bell and the push read these)');
  await page.evaluate(() => navigate('plan')); await page.waitForTimeout(300);
  ok(await page.evaluate(id => !document.querySelector(`#view [data-id="${id}"].late, #view .late[data-id="${id}"]`) && !new RegExp(acct(id).name + '[^\\n]{0,60}(atrasad|venció)', 'i').test(document.querySelector('#view').innerText), card), 'nor on Plan');
  // ---------- 3. the form ----------
  await page.evaluate(id => { navigate('accounts'); A['edit-account']({ id }); }, card); await page.waitForSelector('#a-cdue');
  eq(await page.evaluate(() => [document.querySelector('#a-cdue').type, document.querySelector('#a-cdue').value, document.querySelector('label[for="a-cdue"]').innerText.replace('*', '').trim(), !!document.querySelector('label[for="a-cdue"] .req')]), ['date', '2026-11-02', 'Próximo vencimiento de la factura', true], 'the form (the card’s account’s, one card since 2026-10-09): the next invoice’s date, filled with November 2, and required');
  await page.fill('#a-cdue', '2026-12-05'); await page.dispatchEvent('#a-cdue', 'change');
  await page.tap('[data-a="save-account"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(id => { const a = acct(id); return [a.dueDay, a.dueFrom, cardInvoices(B(), S.today, CUR).filter(c => c.accountId === id).map(c => c.date)]; }, card), [5, '2026-12', []], 'another month chosen: day 5 from December; nothing asked before it');
  // ---------- 4. still late when it really is ----------
  await page.evaluate(id => { const a = acct(id); a.dueDay = 3; a.dueFrom = '2026-10'; }, card);
  eq(await page.evaluate(id => cardInvoices(B(), S.today, CUR).filter(c => c.accountId === id).map(c => [c.date, c.days < 0 && !c.paid])[0], card), ['2026-10-03', true], 'an invoice given for October 3, gone and unpaid, is still late');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-card-due');
})();
