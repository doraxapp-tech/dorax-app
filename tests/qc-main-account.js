// QC of the main account (owner, 2026-10-09: "add a switch in each account's menu to make an account the main one; only one can be main, no more;
// the household's or the business's expenses are charged to the main account"):
//   1. with none marked, the first account that pays by debit is the main one; its card says so, its panel's switch is on and can't be turned off;
//   2. turning it on in another account moves it there (one per side); a credit card or a savings account without debit has no switch;
//   3. what is charged by default goes to it: a new expense, a new fixed cost, a bill with no account, a goal's contribution, paying a card;
//   4. the form: the switch, its note, on for the main one and fixed; saving another as main moves it; the company has its own.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true });
  await p.evaluate(() => navigate('accounts')); await p.waitForTimeout(300);
  // ---------- 1. the default ----------
  eq(await p.evaluate(() => [mainOf('personal').id, mainOf('business').id, S.accounts.filter(a => a.main).length]), ['nu-conta', 'nu-pj', 0], 'with none marked, the first account that pays by debit is each side’s main one');
  eq(await p.evaluate(() => [...document.querySelectorAll('.cc-mainchip')].map(c => c.closest('.cc-item, li, .cc-card, [data-id]') ? 1 : 1).length), 1, 'one card in Accounts says it is the main account');
  await p.evaluate(() => A['card-view']({ id: 'nu-conta' })); await p.waitForSelector('#cv-main-nu-conta');
  eq(await p.evaluate(() => { const s = document.querySelector('#cv-main-nu-conta'); return [s.checked, s.disabled, s.closest('.cv-main').innerText.includes('The household’s expenses are charged here')]; }), [true, true, true], 'its panel: the switch is on, and fixed: another account is made the main one instead');
  // ---------- 2. moving it ----------
  await p.evaluate(() => { A.close(); A['card-view']({ id: 'bb' }); }); await p.waitForSelector('#cv-main-bb');
  eq(await p.evaluate(() => [document.querySelector('#cv-main-bb').checked, document.querySelector('#cv-main-bb').disabled]), [false, false], 'another account’s switch is off and can be turned on');
  await p.click('label:has(#cv-main-bb)'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [mainOf('personal').id, S.accounts.filter(a => a.main).map(a => a.id), document.querySelector('#cv-main-bb').checked, document.querySelector('#cv-main-bb').disabled, document.querySelector('#toast-root').innerText.includes('Banco do Brasil is now the main account.')]), ['bb', ['bb'], true, true, true], 'turning it on makes it the only main account of the household');
  eq(await p.evaluate(() => mainOf('business').id), 'nu-pj', 'the company keeps its own');
  for (const id of ['mp']) {      // (the Nubank card's credit opens the Nubank account's panel: one card with two functions)
    await p.evaluate(i => { A.close(); A['card-view']({ id: i }); }, id); await p.waitForTimeout(150);
    eq(await p.evaluate(() => !!document.querySelector('.cv-main')), false, id + ': a savings account whose card has no debit has no switch');
  }
  await p.evaluate(() => A.close());
  // ---------- 3. what goes to it ----------
  eq(await p.evaluate(() => { A['new-tx'](); const v = UI.drawer.draft.accountId; A.close(); return v; }), 'bb', 'a new expense starts on the main account');
  eq(await p.evaluate(() => { A['new-tx'](); const o = [...document.querySelectorAll('#d-account option')].map(x => x.textContent).filter(x => /\(main\)/.test(x)); A.close(); return o; }), ['Banco do Brasil (main)'], 'the account dropdowns say which is the main one; a household transaction lists the household’s accounts only (owner, 2026-10-09)');
  eq(await p.evaluate(() => { navigate('plan'); A['line-new']({ cat: S.categories.find(c => !c.income).id }); const v = UI.drawer && UI.drawer.draft.accountId; A.close(); return v; }), 'bb', 'a new fixed cost is paid from the main account');
  eq(await p.evaluate(() => { const l = B().plan.lines.find(x => !x.accountId) || B().plan.lines[0], was = l.accountId; l.accountId = null; const v = lineAcct(l).id; l.accountId = was; return v; }), 'bb', 'a bill with no account is charged to the main account');
  eq(await p.evaluate(() => { A['goal-move']({ id: 'viaje', dir: 'in' }); const v = document.querySelector('#m-from').value; A.close(); return v; }), 'bb', 'a goal’s contribution comes out of the main account');
  eq(await p.evaluate(() => { A['card-pay']({ id: 'nu-card' }); const v = UI.drawer && UI.drawer.draft.fromId; A.close(); return v; }), 'bb', 'a card’s invoice is paid from the main account');
  // ---------- 4. the form ----------
  await p.evaluate(() => A['edit-account']({ id: 'bb' })); await p.waitForSelector('#a-main');
  eq(await p.evaluate(() => [document.querySelector('#a-main').checked, document.querySelector('#a-main').disabled, document.querySelector('.a-main .note').innerText.includes('Only one account is the main one.')]), [true, true, true], 'the form of the main account: on, fixed, and it says there is only one');
  await p.evaluate(() => { A.close(); A['edit-account']({ id: 'nu-conta' }); }); await p.waitForSelector('#a-main');
  await p.click('label:has(#a-main)'); await p.click('[data-a="save-account"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [mainOf('personal').id, S.accounts.filter(a => a.main).map(a => a.id)]), ['nu-conta', ['nu-conta']], 'saving another as main moves it there, still one');
  await p.evaluate(() => { A.close(); S.accounts.push({ id: 'qa-xp', name: 'Cartão XP', institution: 'XP', type: 'credit', currency: 'BRL', scope: 'personal', purpose: '', opening: 0, creditLimit: 100000 }); A['edit-account']({ id: 'qa-xp' }); }); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [UI.drawer.draft.id, !!document.querySelector('#a-main')]), ['qa-xp', false], 'a credit card with no account at its bank: its form has no main switch');
  await p.evaluate(() => { A.close(); A['account-add'](); }); await p.waitForSelector('#a-main');
  eq(await p.evaluate(() => [document.querySelector('#a-main').checked, document.querySelector('#a-main').disabled]), [false, false], 'a new account can be made the main one');
  await p.evaluate(() => A.close());
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-main-account');
})();
