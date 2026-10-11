// QC of deleting an account whose card has two functions (owner, 2026-10-09: "accounts with debit and credit have a bug when deleting: when I create
// it, it sits in one list, and when I delete it, it moves to the other list and is not deleted"). The account and its card are one: deleting the account
// deletes its credit ledger and its debit balance with it, from the edit form and from the phone's "Delete account"; nothing is left behind in another list.
const { open, ok, eq, done } = require('./pw.js');
let x;

(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  await p.evaluate(() => navigate('accounts')); await p.waitForTimeout(300);
  const groups = () => p.evaluate(() => [...document.querySelectorAll('.cc-grid')].map(g => [g.dataset.kind, [...g.querySelectorAll('.cc-item')].map(i => acct(i.dataset.id).name)]));
  const left = re => p.evaluate(src => S.accounts.filter(a => new RegExp(src).test(a.name)).map(a => a.name), re);
  const before = await groups();
  // 1. a checking account whose card has credit, deleted from its edit form
  await p.evaluate(() => { A['account-add'](); Object.assign(UI.drawer.draft, { name: 'Itaú', institution: 'Itaú', type: 'checking', openingText: '100', hasCredit: true, creditLimitText: '1000', creditOwedText: '0', creditDue: addDays(S.today, 10) }); A['save-account'](); }); await p.waitForTimeout(200);
  eq(await groups(), before.map(([k, xs]) => [k, k === 'checking' ? [...xs, 'Itaú'] : xs]), 'created: one card, with the checking accounts');
  await p.evaluate(() => A['card-view']({ id: S.accounts.find(a => a.name === 'Itaú').id })); await p.waitForTimeout(200);
  await p.evaluate(() => A['card-do']({ v: 'edit', id: S.accounts.find(a => a.name === 'Itaú').id })); await p.waitForSelector('[data-a="delete-account"]');
  await p.click('[data-a="delete-account"]'); await p.waitForSelector('#modal-ok');
  ok((await p.evaluate(() => document.querySelector('#modal-root').innerText)).includes('with its credit and its debit'), 'the confirmation says the card goes with it');
  await p.click('#modal-ok'); await p.waitForTimeout(300);
  eq([await left('Itaú'), await groups()], [[], before], 'deleted: the account and its credit are gone; no card is left in another list');
  // 2. a savings account whose card has debit and credit, deleted from the phone's "Delete account"
  await p.evaluate(() => { A['account-add'](); Object.assign(UI.drawer.draft, { name: 'Inter', institution: 'Inter', type: 'savings', openingText: '500', debitCard: true, spendOpeningText: '50', hasCredit: true, creditLimitText: '800', creditOwedText: '0', creditDue: addDays(S.today, 10) }); A['save-account'](); }); await p.waitForTimeout(200);
  eq((await left('Inter')).sort(), ['Inter', 'Inter (credit)', 'Inter (debit)'], 'a savings account with debit and credit is three ledgers behind one card');
  await browser.close();
  ({ browser, page: p } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await p.evaluate(() => { navigate('accounts'); A['account-add'](); Object.assign(UI.drawer.draft, { name: 'Inter', institution: 'Inter', type: 'savings', openingText: '500', debitCard: true, spendOpeningText: '50', hasCredit: true, creditLimitText: '800', creditOwedText: '0', creditDue: addDays(S.today, 10) }); A['save-account'](); }); await p.waitForTimeout(200);
  await p.evaluate(() => A['acct-del-pick']()); await p.waitForSelector('.acc-del');
  eq(await p.evaluate(() => [...document.querySelectorAll('.acc-del button b')].map(b => b.innerText.trim()).filter(n => /Inter/.test(n))), ['Inter'], 'the phone’s list of accounts to delete has the card once, not its credit and debit apart');
  await p.evaluate(() => document.querySelector('.acc-del button[data-id="' + S.accounts.find(a => a.name === 'Inter').id + '"]').click()); await p.waitForSelector('#modal-ok'); await p.click('#modal-ok'); await p.waitForTimeout(300);
  eq(await p.evaluate(() => S.accounts.filter(a => /Inter/.test(a.name)).map(a => a.name)), [], 'deleting it takes all three');
  // 3. a card with transactions on its credit is not deleted
  await p.evaluate(() => { A['account-add'](); Object.assign(UI.drawer.draft, { name: 'C6', institution: 'C6 Bank', type: 'checking', openingText: '0', hasCredit: true, creditLimitText: '500', creditOwedText: '0', creditDue: addDays(S.today, 10) }); A['save-account'](); const cr = S.accounts.find(a => a.name === 'C6 (credit)'); S.transactions.push({ id: 'qa-c6', accountId: cr.id, date: S.today, description: 'X', merchant: 'X', amount: -1000, currency: 'BRL', type: 'expense', categoryId: 'other', subcategoryId: null, status: 'confirmed' }); A['edit-account']({ id: S.accounts.find(a => a.name === 'C6').id }); }); await p.waitForSelector('[data-a="delete-account"]');
  eq(await p.evaluate(() => [document.querySelector('[data-a="delete-account"]').disabled, document.querySelector('[data-a="delete-account"]').dataset.tip]), [true, 'Delete or move its 1 transactions first'], 'a card with a transaction on its credit can’t be deleted yet, and says why');
  await p.evaluate(() => { A.close(); A['edit-account']({ id: S.accounts.find(a => a.name === 'C6 (credit)').id }); }); await p.waitForTimeout(150);
  eq(await p.evaluate(() => UI.drawer.draft.name), 'C6', 'opening the card’s credit to edit opens the card’s own account');
  // ---------- 4. the lists of accounts (owner, 2026-10-09: "in transactions, choosing the account, I get PJ accounts and accounts I already deleted; make
  // sure no dropdown where an account is chosen keeps deleted accounts") ----------
  await browser.close();
  ({ browser, page: p } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } }));
  const opts = sel => p.evaluate(s => [...document.querySelectorAll(s + ' option')].map(o => o.textContent), sel);
  await p.evaluate(() => { A['new-tx'](); }); await p.waitForSelector('#d-account');
  eq(await opts('#d-account'), ['Nubank account (main)', 'Banco do Brasil', 'Mercado Pago', 'Santander'], 'a household transaction offers the household’s cards, once each: no company account, no card’s credit apart');
  await p.evaluate(() => { A.close(); A.space({ v: 'business' }); A['new-tx'](); x = UI.drawer.draft; x.accountId = mainOf('business').id; renderOverlay(); }); await p.waitForSelector('#d-account');
  eq(await opts('#d-account'), ['Nubank PJ (main)', 'Wise BRL', 'Wise USD'], 'a company transaction offers the company’s accounts only');
  await p.evaluate(() => { A.close(); A.space({ v: 'personal' }); const x = S.transactions.find(k => k.accountId === 'nu-card'); A['open-tx']({ id: x.id }); }); await p.waitForSelector('#d-account');
  eq(await p.evaluate(() => [document.querySelector('#d-account').value, UI.drawer.draft.accountId]), ['nu-conta', 'nu-card'], 'a purchase on the card’s credit shows its card; the credit stays chosen under it');
  await p.evaluate(() => { UI.drawer.draft.type = 'transfer'; renderOverlay(); }); await p.waitForSelector('#d-xfer');
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll('#d-xfer option')].map(x => x.textContent); return !o.some(x => /\(debit\)|\(credit\)|Nubank card$/.test(x)) && !o.some(x => /^Nubank account/.test(x)); }), 'a transfer’s other account: no ledger by its own name, and not its own card');
  await p.evaluate(() => { A.close(); navigate('plan'); A['line-new'](); }); await p.waitForSelector('#l-acct');
  eq(await opts('#l-acct'), ['Nubank account (main)', 'Nubank account · Credit', 'Banco do Brasil', 'Mercado Pago', 'Santander'], 'a fixed cost is paid from a card or its credit, named after the card');
  await p.evaluate(() => { A.close(); A['card-pay']({ id: 'nu-card' }); }); await p.waitForSelector('#cp-from');
  eq(await opts('#cp-from'), ['Nubank account (main)', 'Banco do Brasil', 'Mercado Pago', 'Santander'], 'a card’s invoice is paid from a card that pays, once each');
  await p.evaluate(() => { A.close(); navigate('transactions'); A['tx-filters'](); }); await p.waitForSelector('#tx-account');
  eq(await p.evaluate(() => [...document.querySelectorAll('#tx-account option')].length - 1 === cardsOf(personal()).length), true, 'the filter by account lists the side’s cards, once each');
  await p.evaluate(() => { A.close(); Object.assign(UI.tx, { account: 'nu-conta', month: '' }); render(); }); await p.waitForTimeout(200);
  eq(await p.evaluate(() => { const n = Number((document.querySelector('#tx-list').innerText.match(/(\d+) transactions?/) || [])[1]); return [n === S.transactions.filter(x => ['nu-conta', 'nu-card'].includes(x.accountId)).length, S.transactions.some(x => x.accountId === 'nu-card')]; }), [true, true], 'filtered by a card, its transactions include those on its credit');
  // the table on a computer (owner, 2026-10-09: "put the account's name beside the logo; readjust the columns so it fits without breaking"; "shorten
  // the description under the merchant")
  await p.evaluate(() => { Object.assign(UI.tx, { account: '', month: '' }); render(); }); await p.waitForTimeout(200);
  eq(await p.evaluate(() => { const r = [...document.querySelectorAll('.tx-tbl tbody tr')].find(tr => S.transactions.find(x => x.id === tr.dataset.id).accountId === 'nu-card'), cell = r.querySelector('.t-acct .acct-pc'), sm = r.querySelector('.tx-main small'), tbl = document.querySelector('.tx-tbl'), cs = getComputedStyle(sm);
    return [cell.innerText.trim(), !!cell.querySelector('.inst, img'), getComputedStyle(r.querySelector('.t-acct .acct-ph')).display, cs.whiteSpace, cs.textOverflow, tbl.scrollWidth <= tbl.parentElement.clientWidth + 1]; }),
    ['Nubank account · Credit', true, 'none', 'nowrap', 'ellipsis', true], 'the account column: the mark and the whole name; the description on one line, cut short; the table fits its card');
  // what deleting left behind before the fix goes when the account is opened; a credit card the person named and kept stays
  eq(await p.evaluate(() => { const st = { accounts: [{ id: 'k1', name: 'Caixa (crédito)', type: 'credit', debitAccountId: 'gone', scope: 'personal', currency: 'BRL', opening: -12000 }, { id: 'k2', name: 'Cartão XP', type: 'credit', debitAccountId: 'gone', scope: 'personal', currency: 'BRL', opening: 0 }, { id: 'k3', name: 'Inter (débito)', type: 'checking', savingsOf: 'gone2', scope: 'personal', currency: 'BRL', opening: 0 }, { id: 'k4', name: 'Itaú (credit)', type: 'credit', debitAccountId: 'gone', scope: 'personal', currency: 'BRL', opening: 0 }], transactions: [{ id: 't', accountId: 'k4', amount: -100 }] }; const n = dropLeftLedgers(st); return [n, st.accounts.map(a => a.id)]; }), [2, ['k2', 'k4']], 'left behind: an app-named credit and a debit balance whose account is gone go; a named card, and one with transactions, stay');
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-card-delete');
})();
