// QC of a card's debit (owner, 2026-10-08: "credit cards all have the debit function by default; now any expense on a credit card is taken as credit,
// but sometimes it is debit").
//   1. an expense on a card: "Paid with …: Credit | Debit", Credit first, saying it goes on the card's invoice;
//   2. Debit: the expense is recorded in the account behind the card (by default a checking account at the same bank), and says so; Credit turns it back;
//      choosing another account by hand lets the card go;
//   3. "débito" in the sentence chooses it, and the word is not left in the name;
//   4. (owner, 2026-10-09: "it should be one card with two functions, as in the real world") an account and its credit are one card in Accounts; the
//      account's form has "Its card has credit" (limit, due date, invoice) and never asks where the debit comes from; saving it makes the credit's
//      ledger behind the account, one card on screen; an income has no choice;
//   5. a credit card with no account at its bank is saved alone, credit only; the first debit on it makes its debit at its bank (at zero, linked), and
//      it stays one card, with both functions;
//   6. "Record payment" in the plan, for a cost paid from a card, offers the same choice, and the payment lands where it was chosen.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  const [card, deb] = await page.evaluate(() => { const c = S.accounts.find(a => a.type === 'credit' && a.scope === 'personal'); return [c.id, cardDebitAcct(c).id]; });
  eq(await page.evaluate(([c, d]) => [acct(d).type, acct(d).institution === acct(c).institution], [card, deb]), ['checking', true], 'the account behind a card: by default a checking account at the same bank');
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-account');
  // the list offers the card once, by its account (owner, 2026-10-09: no card's credit apart in the lists); its credit is chosen under it
  await page.selectOption('#d-account', deb); await page.waitForTimeout(150); await page.tap('.tx-paywith [data-v="credit"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => { const p = document.querySelector('.tx-pay'); return [[...p.querySelectorAll('button')].map(b => b.innerText.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), /Va a la factura de/.test(p.innerText), [...p.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44)]; }),
    [['Crédito*', 'Débito'], true, true], 'an expense on a card: Credit | Debit, Credit first, on the card’s invoice; a thumb high');
  await page.tap('.tx-paywith [data-v="debit"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(d => [UI.drawer.draft.accountId === d, document.querySelector('#d-account').value === d, document.querySelector('.tx-paywith [aria-pressed="true"]').dataset.v, new RegExp('Sale de ' + acct(d).name).test(document.querySelector('.tx-pay').innerText)], deb), [true, true, 'debit', true], 'Debit: in the account behind the card, and it says so');
  await page.fill('#d-amount', '20'); await page.fill('#d-merchant', 'Padaria'); await page.tap('[data-a="save-tx"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(d => { const x = S.transactions.find(k => k.merchant === 'Padaria'); return [!!x && x.accountId === d, x && x.amount, !UI.drawer]; }, deb), [true, -2000, true], 'saved in the account behind the card, not on the card');
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-account');
  await page.selectOption('#d-account', deb); await page.tap('.tx-paywith [data-v="debit"]'); await page.tap('.tx-paywith [data-v="credit"]'); await page.waitForTimeout(100);
  eq(await page.evaluate(c => [UI.drawer.draft.accountId === c, !UI.drawer.draft.viaCard], card), [true, true], 'Credit turns it back to the card');
  await page.tap('.tx-paywith [data-v="debit"]'); const other = await page.evaluate(() => S.accounts.find(a => a.type !== 'credit' && a.id !== UI.drawer.draft.accountId && a.scope === 'personal').id);
  await page.selectOption('#d-account', other); await page.waitForTimeout(100);
  eq(await page.evaluate(() => [!UI.drawer.draft.viaCard, !document.querySelector('.tx-pay')]), [true, true], 'another account chosen by hand: the card lets go');
  // ---------- 3. the sentence ----------
  await page.evaluate(() => A.close()); await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-say');
  await page.fill('#d-say', 'mercado 45 tarjeta nubank débito'); await page.waitForTimeout(200);
  eq(await page.evaluate(([c, d]) => [UI.drawer.draft.accountId === d, UI.drawer.draft.viaCard === c, /d[ée]bito/i.test(UI.drawer.draft.merchant)], [card, deb]), [true, true, false], '“débito” in the sentence chooses it, and is not left in the name');
  await page.fill('#d-say', 'mercado 45 tarjeta nubank'); await page.waitForTimeout(200);
  eq(await page.evaluate(c => [UI.drawer.draft.accountId === c, !UI.drawer.draft.viaCard], card), [true, true], 'without it, the card');
  await page.evaluate(() => A.close());
  // ---------- 4. one card, two functions (owner, 2026-10-09: "why do two cards come out when I register a credit card? … it should be one card with
  // two functions, as in the real world") ----------
  await page.evaluate(() => { S.user.acctStack = false; navigate('accounts'); }); await page.waitForTimeout(300);
  eq(await page.evaluate(([c, d]) => { const items = [...document.querySelectorAll('#view .cc-item')], mine = items.filter(i => i.dataset.id === c || i.dataset.id === d);
      return [mine.length, mine[0] && mine[0].dataset.id === d, mine[0] && mine[0].querySelector('.cc-kind').textContent.trim(), mine[0] && /Factura R\$/.test(mine[0].querySelector('.cc-amt').innerText), items.length === personal().length - 1]; }, [card, deb]),
    [1, true, 'Débito · Crédito', true, true], 'Accounts: the account and its credit are one card, shown as the account, its balance large and the invoice under it, both functions on it');
  await page.evaluate(d => A['edit-account']({ id: d }), deb); await page.waitForSelector('#a-hascredit');
  eq(await page.evaluate(() => [!document.querySelector('#a-scope'), document.querySelector('#a-open').closest('.field').nextElementSibling === document.querySelector('#a-cur').closest('.field')]), [true, true], 'editing an account: no “Belongs to” either, the currency beside the balance');
  eq(await page.evaluate(c => [!document.querySelector('#a-debit'), document.querySelector('#a-hascredit').checked, !!document.querySelector('#a-climit') && document.querySelector('#a-climit').value === plain(acct(c).creditLimit), !!document.querySelector('#a-cdue'), !!document.querySelector('#a-cowed')], card),
    [true, true, true, true, true], 'the account’s form: no “where does the debit come from”; “Its card has credit” is on, with the limit, the next due date and the invoice');
  await page.evaluate(() => A.close());
  await page.evaluate(c => A['edit-account']({ id: c }), card); await page.waitForSelector('#a-hascredit');
  ok(await page.evaluate(d => UI.drawer.draft.id === d && !document.querySelector('#a-debit'), deb), 'the card’s credit opens its account’s form, one card (owner, 2026-10-09), which does not ask either');
  await page.evaluate(() => A.close());
  await page.evaluate(c => { acct(c).debitAccountId = 'none'; A['new-tx'](); }, card); await page.waitForSelector('#d-account'); await page.selectOption('#d-account', card); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !document.querySelector('.tx-pay')), 'a card set to “no debit” before (saved data) still offers no choice');
  await page.evaluate(c => { acct(c).debitAccountId = undefined; renderOverlay(); }, card); await page.tap('.tx-kind [data-v="income"]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !document.querySelector('.tx-pay')), 'an income has none');
  await page.evaluate(() => A.close());
  // a new account whose card has credit: one card, its credit kept behind it
  const n0 = await page.evaluate(() => S.accounts.length);
  await page.evaluate(() => { A['account-add'](); Object.assign(UI.drawer.draft, { name: 'Conta Inter', institution: 'Inter', type: 'checking', openingText: '300' }); renderOverlay(); }); await page.waitForSelector('#a-hascredit');
  // (owner, 2026-10-09: "when adding a new account remove 'Belongs to'; put the currency beside what it is for")
  eq(await page.evaluate(() => { const o = document.querySelector('#a-open').closest('.field'), c = document.querySelector('#a-cur').closest('.field'); return [!document.querySelector('#a-scope'), o.nextElementSibling === c, !o.classList.contains('full') && !c.classList.contains('full'), !/Hogar|BRL/.test(document.querySelector('.drawer .form-more .note').innerText)]; }),
    [true, true, true, true], 'a new account: no “Belongs to” (it is the side in use), the currency beside the balance (owner, 2026-10-09)');
  await page.click('label:has(#a-hascredit)'); await page.waitForSelector('#a-climit');      // the switch's label, as a finger taps it
  await page.fill('#a-climit', '2.000'); await page.fill('#a-cowed', '150'); await page.fill('#a-cdue', await page.evaluate(() => addDays(S.today, 10))); await page.tap('[data-a="save-account"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(n0 => { const m = S.accounts.find(a => a.name === 'Conta Inter'), c = m && cardCredit(m); return [S.accounts.length - n0, !!c && c.type, c && c.debitAccountId === m.id, c && c.creditLimit, c && c.opening, c && c.name, document.querySelectorAll(`#view .cc-item[data-id="${m.id}"]`).length, !document.querySelector(`#view .cc-item[data-id="${c && c.id}"]`)]; }, n0),
    [2, 'credit', true, 200000, -15000, 'Conta Inter (crédito)', 1, true], 'saved: the account and its credit (linked, its limit and invoice), and one card on screen');
  // ---------- 5. a credit card with no account at its bank: one card too ----------
  await page.evaluate(() => { A['account-add'](); Object.assign(UI.drawer.draft, { name: 'Cartão C6', institution: 'C6 Bank', type: 'credit', openingText: '0', dueDate: addDays(S.today, 10) }); renderOverlay(); }); await page.waitForSelector('#a-limit');
  ok(await page.evaluate(() => !document.querySelector('#a-debit, #a-hascredit')), 'a credit card: its limit and due date, nothing about debit');
  const n1 = await page.evaluate(() => S.accounts.length);
  await page.tap('[data-a="save-account"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(n1 => { const c = S.accounts.find(a => a.name === 'Cartão C6'); return [S.accounts.length - n1, document.querySelectorAll(`#view .cc-item[data-id="${c.id}"]`).length, document.querySelector(`#view .cc-item[data-id="${c.id}"] .cc-kind`).textContent.trim()]; }, n1),
    [1, 1, 'Crédito'], 'saved alone: no second account made, one card, credit only');
  const c6 = await page.evaluate(() => S.accounts.find(a => a.name === 'Cartão C6').id);
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-account'); await page.selectOption('#d-account', c6); await page.waitForTimeout(100);
  await page.tap('.tx-paywith [data-v="debit"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(c => { const d = S.accounts.find(a => a.name === 'C6 Bank (débito)'); return [!!d && d.type, acct(c).debitAccountId === (d && d.id), UI.drawer.draft.accountId === (d && d.id), /Pon su saldo en Cuentas/.test(document.querySelector('.tx-pay').innerText)]; }, c6),
    ['checking', true, true, true], 'a debit on it the first time: its debit is made at its bank, at zero, linked to the card, and asks for its balance');
  await page.evaluate(() => { A.close(); render(); }); await page.waitForTimeout(200);
  eq(await page.evaluate(c => { const d = cardDebitAcct(acct(c)), it = [...document.querySelectorAll('#view .cc-item')].filter(i => i.dataset.id === c || i.dataset.id === d.id); return [it.length, it[0].dataset.id === d.id, it[0].querySelector('.cc-kind').textContent.trim()]; }, c6),
    [1, true, 'Débito · Crédito'], 'and it stays one card, now with both functions');
  // ---------- 5b. (owner, 2026-10-09: "if the user picks savings, add 'its card has debit' beside 'its card has credit'… if I have a savings account
  // and record an expense the system takes the money out of my savings: how does it know it was not debit or credit?") ----------
  await page.evaluate(() => { A.close(); A['account-add'](); Object.assign(UI.drawer.draft, { name: 'Poupança BB', institution: 'Banco do Brasil', type: 'savings', openingText: '1000' }); renderOverlay(); }); await page.waitForSelector('#a-hasdebit');
  eq(await page.evaluate(() => { const d = document.querySelector('#a-hasdebit').closest('.field'), c = document.querySelector('#a-hascredit').closest('.field'); return [document.querySelector('#a-hasdebit').checked, d.nextElementSibling === c, !d.classList.contains('full') && !c.classList.contains('full'), d.innerText.trim(), c.innerText.trim()]; }),
    [false, true, true, 'Su tarjeta tiene débito', 'Su tarjeta tiene crédito'], 'a savings account: “Its card has debit” beside “Its card has credit”, debit off to start with');
  eq(await page.evaluate(() => document.querySelector('label[for="a-open"]').innerText.replace('*', '').trim()), '¿Cuánto tienes ahorrado?', 'a savings account asks how much is saved (owner, 2026-10-09)');
  // (owner, same day: "one thing has nothing to do with the other … an input below for the opening balance"; asked, "two separate balances")
  await page.click('label:has(#a-hasdebit)'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [document.querySelector('label[for="a-open"]').innerText.replace('*', '').trim(), document.querySelector('label[for="a-sopen"]') && document.querySelector('label[for="a-sopen"]').innerText.replace('*', '').trim()]), ['¿Cuánto tienes ahorrado?', 'Saldo inicial'], 'its card paying by debit: what is saved stays asked, and the opening balance it spends from comes under it');
  await page.click('label:has(#a-hasdebit)'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.querySelector('#a-sopen')), 'debit off: no opening balance to spend from');
  await page.click('label:has(#a-hascredit)'); await page.waitForSelector('#a-climit');
  ok(await page.evaluate(() => /solo tiene crédito/.test(document.querySelector('.drawer .body').innerText)), 'credit only: it says an expense in this account goes on the invoice');
  await page.fill('#a-cdue', await page.evaluate(() => addDays(S.today, 10))); await page.fill('#a-cowed', '0'); await page.tap('[data-a="save-account"]'); await page.waitForTimeout(250);
  const sav = await page.evaluate(() => S.accounts.find(a => a.name === 'Poupança BB').id);
  eq(await page.evaluate(id => [acct(id).debitCard, !!cardCredit(acct(id)), document.querySelector(`#view .cc-item[data-id="${id}"] .cc-kind`).textContent.trim()], sav), [false, true, 'Ahorro · Crédito'], 'saved: its card has credit and no debit, and says so');
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-account'); await page.selectOption('#d-account', sav); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!document.querySelector('.tx-paywith'), /Va a la factura de .*Su tarjeta no tiene débito/.test(document.querySelector('.tx-pay').innerText)]), [true, true], 'an expense in it: no choice, it says it goes on the invoice');
  await page.fill('#d-amount', '30'); await page.fill('#d-merchant', 'Livraria'); await page.tap('[data-a="save-tx"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(id => { const x = S.transactions.find(k => k.merchant === 'Livraria'); return [!!x && x.accountId === cardCredit(acct(id)).id, accountBalance(S, id, S.today)]; }, sav), [true, 100000], 'saved on the card’s credit: the savings are untouched');
  await page.evaluate(id => A['edit-account']({ id }), sav); await page.waitForSelector('#a-hasdebit'); await page.click('label:has(#a-hasdebit)'); await page.waitForSelector('#a-sopen');
  await page.fill('#a-sopen', '200'); await page.tap('[data-a="save-account"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(id => { const sp = cardSpend(acct(id)), it = document.querySelector(`#view .cc-item[data-id="${id}"]`); return [!!sp && sp.type, sp && sp.opening, accountBalance(S, id, S.today), !document.querySelector(`#view .cc-item[data-id="${sp && sp.id}"]`), /SALDO|Saldo/i.test(it.querySelector('.cc-amt small').textContent), it.querySelector('.cc-amt b').textContent.trim(), /Ahorrado R\$ 1\.000,00/.test(it.querySelector('.cc-amt').textContent)]; }, sav),
    ['checking', 20000, 100000, true, true, 'R$ 200,00', true], 'debit switched on with its balance: kept apart, one card, that balance large and what is saved under it');
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-account'); await page.selectOption('#d-account', sav); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [...document.querySelectorAll('.tx-paywith button')].map(b => b.innerText.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : ''))), ['Crédito', 'Débito*'], 'debit and credit: an expense in the account asks, Débito pressed since the account itself was chosen');
  await page.tap('.tx-paywith [data-v="credit"]'); await page.waitForTimeout(100);
  eq(await page.evaluate(id => UI.drawer.draft.accountId === cardCredit(acct(id)).id, sav), true, 'Crédito puts it on the card’s credit');
  await page.tap('.tx-paywith [data-v="debit"]'); await page.waitForTimeout(100);
  eq(await page.evaluate(id => [UI.drawer.draft.accountId === cardSpend(acct(id)).id, /Sale de Poupança BB \(débito\)/.test(document.querySelector('.tx-pay').innerText)], sav), [true, true], 'Débito takes it out of the balance to spend, and says so');
  await page.fill('#d-amount', '25'); await page.fill('#d-merchant', 'Farmácia'); await page.tap('[data-a="save-tx"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(id => [accountBalance(S, cardSpend(acct(id)).id, S.today), accountBalance(S, id, S.today)], sav), [17500, 100000], 'saved: the balance to spend goes down, what is saved does not');
  await page.evaluate(() => A.close());
  const chk = await page.evaluate(() => { A['account-add'](); Object.assign(UI.drawer.draft, { type: 'checking' }); renderOverlay(); return [!document.querySelector('#a-hasdebit'), !!document.querySelector('#a-hascredit')]; });
  eq(chk, [true, true], 'a checking account: its card always has debit, so only “Its card has credit” is asked');
  await page.evaluate(() => A.close());
  // ---------- 6. a payment of the plan ----------
  const line = await page.evaluate(c => { const l = B().plan.lines.find(k => k.pay !== 'budget'); l.accountId = c; return l.id; }, card);
  await page.evaluate(id => { navigate('plan'); A['line-pay']({ id, ym: B().month }); }, line); await page.waitForSelector('#py-amount');
  eq(await page.evaluate(() => [...document.querySelectorAll('.tx-paywith button')].map(b => b.innerText.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : ''))), ['Crédito*', 'Débito'], '“Registrar pago” for a cost paid from the card: Crédito | Débito');
  await page.tap('.tx-paywith [data-v="debit"]'); await page.fill('#py-amount', '50'); await page.tap('[data-a="pay-save"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(([id, c]) => { const x = B().transactions.find(k => k.planLineId === id && k.amount === -5000); return [!!x, x && x.accountId === cardDebitAcct(acct(c)).id]; }, [line, card]), [true, true], 'with Débito, the payment lands in the card’s debit account');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-card-debit');
})();
