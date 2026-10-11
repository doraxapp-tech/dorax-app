// QC of "add an account first" (owner, 2026-10-08: "several functions need the user to add an account first: make sure that when the message
// appears it has a button to add an account. Also add the option to quick access").
//   1. every message that asks for an account carries the button, and the button opens the account form for the side in use;
//   2. the screens that are empty without an account (Accounts, the converter, Imports) show the same button;
//   3. the quick things to do (the phone's round + and the dashboard's row) have "Add an account": first while there is none, last once there is one,
//      and not twice on Accounts; on the company's side it is a company account in the page's currency;
//   4. Spanish and Portuguese on the narrowest phone, a thumb-sized button in the message.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const toast = p => p.evaluate(() => { const el = document.querySelector('#toast'), b = el && el.querySelector('button'); return el ? [el.firstChild.textContent.trim() === t('Add an account first.') ? 'Add an account first.' : el.firstChild.textContent.trim(), b ? b.dataset.a : null, b ? b.innerText.trim() : null] : null; });
  const form = p => p.evaluate(() => UI.drawer && UI.drawer.kind === 'account' ? [UI.drawer.isNew, UI.drawer.draft.scope, UI.drawer.draft.currency, document.activeElement && document.activeElement.id] : null);
  // the household with no account: the example account, its accounts taken away
  const noAccounts = () => { S.accounts = []; S.transactions = []; S.plan.lines.forEach(l => { l.accountId = null; }); UI.toast = null; render(); };

  // ---------- 1. the messages ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  await page.evaluate(noAccounts);
  await page.evaluate(() => A['new-tx']());
  eq(await toast(page), ['Add an account first.', 'account-add', 'Add account'], 'a new transaction with no account: the message says so and carries the button');
  await page.click('#toast button');
  eq([await form(page), await page.locator('#toast').count()], [[true, 'personal', 'BRL', 'a-name'], 0], 'the button opens a new household account, with the cursor in its name, and the message goes');
  await page.evaluate(() => A.close());
  for (const [what, run] of [['paying a fixed cost', () => A['line-pay']({ id: S.plan.lines[0].id })], ['paying it in one tap', () => A['line-pay-now']({ id: S.plan.lines[0].id })], ['connecting a bank', () => A['bank-open']()]]) {
    await page.evaluate(() => { UI.toast = null; renderToast(); }); await page.evaluate(run);
    eq(await toast(page), ['Add an account first.', 'account-add', 'Add account'], `${what} with no account: the same message, the same button`);
  }
  await page.evaluate(() => navigate('recurring')); await page.waitForTimeout(100);
  if (await page.locator('#rc-name').count()) {
    await page.evaluate(() => { $('rc-name').value = 'Gym'; $('rc-amt').value = '99'; UI.toast = null; renderToast(); A['add-recurring'](); });
    eq(await toast(page), ['Add an account first.', 'account-add', 'Add account'], 'a recurring payment with no account: the same');
  }
  // inside a panel: the error carries the button
  await page.evaluate(() => { UI.drawer = { kind: 'line-pay', title: 'Pay', draft: { lineId: S.plan.lines[0].id, ym: S.month, amountText: '10', date: S.today, accountId: 'gone', note: '' } }; renderOverlay(); A['pay-save'](); });
  eq(await page.evaluate(() => { const b = document.querySelector('.drawer .banner.crit'); return b ? [b.innerText.split('\n')[0].trim() === t('Add an account first.'), !!b.querySelector('[data-a="account-add"]')] : null; }), [true, true], 'inside the payment panel the error carries the button too');
  await page.click('.drawer .banner [data-a="account-add"]'); eq((await form(page)).slice(0, 2), [true, 'personal'], 'and it opens the account form');
  await page.evaluate(() => A.close());

  // ---------- 2. the empty screens ----------
  await page.evaluate(() => navigate('accounts'));
  eq(await page.evaluate(() => { const e = document.querySelector('#view .empty'), b = e && e.querySelector('[data-a="account-add"]'); return e ? [e.querySelector('b').innerText.trim(), b ? b.innerText.trim() : null] : null; }), ['No accounts yet', 'Add account'], 'Accounts with none: the empty card has the button');
  await page.click('#view .empty [data-a="account-add"]'); eq((await form(page)).slice(0, 2), [true, 'personal'], 'which opens the form'); await page.evaluate(() => A.close());
  await page.evaluate(() => { S.user.company = true; navigate('converter'); });      // the converter is the company's (owner, 2026-10-09; app/shell.js HOME_HIDDEN)
  eq(await page.evaluate(() => { const e = document.querySelector('#view .empty'), b = e && e.querySelector('[data-a="account-add"]'); return e ? [e.querySelector('b').innerText.trim(), b ? b.innerText.trim() : null, !!e.querySelector('a[href="#accounts"]')] : null; }), ['Add an account first', 'Add account', false], 'the converter with no account: the button, instead of a link to another screen');
  await page.evaluate(() => { A.space({ v: 'personal' }); delete S.user.company; });
  await page.evaluate(() => navigate('imports'));
  eq(await page.evaluate(() => { const b = [...document.querySelectorAll('#view .banner')].find(x => /Add an account first/.test(x.innerText)); return b ? [b.innerText.split('\n')[0].trim() === t('Add an account first.') + ' ' + t('A statement is always imported into one of your accounts.'), !!b.querySelector('[data-a="account-add"]')] : null; }), [true, true], 'Imports with no account says it before a file is chosen, with the button');
  await page.evaluate(() => { takeStatement(new File(['a;b'], 'x.csv')); });
  eq(await page.evaluate(() => [...document.querySelectorAll('#view .banner')].filter(x => /Add an account first/.test(x.innerText)).map(b => [b.classList.contains('crit'), !!b.querySelector('[data-a="account-add"]')])), [[true, true]], 'and a file chosen anyway: one message, the error, still with the button');
  await page.evaluate(() => { UI.impError = null; ACCOUNTS_ACTIONS['account-add'](); UI.drawer.draft.name = 'Nubank'; UI.drawer.draft.openingText = '0'; ACCOUNTS_ACTIONS['save-account'](); navigate('imports'); });
  eq(await page.evaluate(() => [S.accounts.length, [...document.querySelectorAll('#view .banner')].some(x => /Add an account first/.test(x.innerText))]), [1, false], 'once there is an account the message is gone');
  eq(errors, [], 'household: no error in the console'); await browser.close();

  // ---------- 3. the quick things to do, on a phone ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  const row = () => page.evaluate(() => [...document.querySelectorAll('.quick-row button')].map(b => b.dataset.v));
  // v149: the list is this screen's, then "All actions" unfolded (the three always there sit apart, at its foot)
  const sheet = async () => { await page.click('#tabbar .fab'); if (await page.locator('.quick-all').count()) await page.click('.quick-all'); const r = await page.evaluate(() => [...document.querySelectorAll('.quick-grid')].flatMap((g, i, all) => [...g.querySelectorAll('button')].map(b => [b.dataset.v, b.innerText.trim(), b.classList.contains('wide'), i === all.length - 1 ? g.children.length : 0]))); await page.evaluate(() => A.close()); return r; };
  eq((await row()).slice(-1), ['account'], 'with accounts, “Add an account” is the last round button of the dashboard’s row');
  const withAcc = await sheet();
  eq([withAcc[withAcc.length - 1].slice(0, 2), withAcc[withAcc.length - 1][3] % 2 === 0 || withAcc[withAcc.length - 1][2]], [['account', 'Add account'], true], 'and the last of the round +’s list; never alone in half a row');
  await page.evaluate(noAccounts);
  eq((await row())[0], 'account', 'with no account it is the first round button: everything else needs one');
  eq((await sheet())[0].slice(0, 2), ['account', 'Add account'], 'and the first of the round +’s list');
  await page.click('.quick-row [data-v="account"]'); eq((await form(page)).slice(0, 3), [true, 'personal', 'BRL'], 'it opens a new household account'); await page.evaluate(() => A.close());
  await page.click('.quick-row [data-v="expense"]');
  eq([await toast(page), await page.evaluate(() => !!UI.drawer)], [['Add an account first.', 'account-add', 'Add account'], false], '“Record an expense” with no account: the message and its button, no empty panel');
  ok(await page.evaluate(() => { const b = document.querySelector('#toast button').getBoundingClientRect(); return b.height >= 44 && b.right <= innerWidth && b.left >= 0; }), 'on a phone the message’s button is a thumb high');
  await page.evaluate(() => navigate('accounts'));
  const onAccounts = await sheet();
  eq([onAccounts.filter(x => /account/i.test(x[1])).length, onAccounts[0].slice(0, 2), onAccounts[0][2]], [1, ['main', 'Add account'], true], 'on Accounts the screen’s own “Add account” is the one: not offered twice');
  eq(errors, [], 'phone, household: no error in the console'); await browser.close();
  // the company's side: a company account, in the page's currency
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { navigate('dashboard'); A.space({ v: 'business' }); }); await page.waitForTimeout(150);
  eq((await row()).slice(-1), ['account'], 'company side with its accounts: “Add company account” at the end');
  await page.evaluate(() => { S.accounts = S.accounts.filter(a => a.scope !== 'business'); render(); });
  eq(await page.evaluate(() => { const b = document.querySelector('.quick-row button'); return [b.dataset.v, b.innerText.trim()]; }), ['account', 'Add company account'], 'and first when it has none');
  await page.click('.quick-row [data-v="expense"]');
  eq([await toast(page), await page.evaluate(() => !!UI.drawer)], [['Add an account first.', 'account-add', 'Add company account'], false], '“Record a cost” with no company account asks for one, instead of using a household account');
  await page.click('#toast button'); eq((await form(page)).slice(0, 3), [true, 'business', await page.evaluate(() => BCUR())], 'its button opens a company account in the page’s currency');
  eq(errors, [], 'phone, company: no error in the console'); await browser.close();

  // ---------- 4. Spanish and Portuguese, 320 px ----------
  for (const [lang, want] of [['es', [null, 'Agregar cuenta']], ['pt', [null, 'Adicionar conta']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true }));
    await page.evaluate(noAccounts); await page.click('.quick-row [data-v="expense"]');
    const t = await toast(page);
    eq([t && t[0], t && t[2], await page.evaluate(() => document.querySelector('#toast').firstChild.textContent.trim())], ['Add an account first.', want[1], await page.evaluate(() => t('Add an account first.'))], `${lang}: the message and its button in the language`);
    ok(await page.evaluate(() => { const el = document.querySelector('#toast'), r = el.getBoundingClientRect(), b = el.querySelector('button').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && b.height >= 44 && b.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }), `${lang}, 320 px: the message fits the screen and its button is a thumb high`);
    eq(await page.evaluate(() => document.querySelector('.quick-row button').innerText.trim()), want[1], `${lang}: “${want[1]}” leads the row`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-need-account');
})();
