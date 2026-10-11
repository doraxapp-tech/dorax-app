// QC (owner, 2026-10-10): "if something is wrong, or the person went over in the plan, for example 'the plan uses R$ 50 more than the planned
// income', it must be notified in the bell immediately; and a tap must say what is going on, how to solve it, and take the person with one tap to
// where it is solved".
//   1. the moment the plan goes over the income: the bell counts it, says so once with "See", and lists it first, under "To fix";
//   2. a tap: what is going on (the person's own figures), the ways to solve it, each a tap that goes where it is solved; ‹ back to the bell;
//   3. solved: it leaves the bell, and its panel says so;
//   4. the other issues: no income, not enough until pay day, an account below zero, transactions without a category, a limit gone over; each with
//      its ways, each way landing where it should;
//   5. "Not today"; each side its own; thumbs' sizes; Spanish and Portuguese; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); });
  const bell = () => page.evaluate(() => +((document.querySelector('.bell .count') || {}).textContent || 0));
  const ids = () => page.evaluate(() => activeReminders().filter(r => r.kind === 'issue').map(r => r.id.split(':')[1]));
  eq(await ids(), ['uncat'], 'the example: one thing to fix, its transactions without a category; the plan fits');
  const before = await bell();
  // ---------- 1. the plan goes over the income ----------
  await page.evaluate(() => A['limit-open']({ cat: 'salidas' })); await page.fill('#lm-amount', '1500'); await page.click('#overlay [data-a="limit-save"]');
  const over = await page.evaluate(() => { const mp = monthPlan(S, ymOf(S.today)); return -mp.free; });
  ok(over > 0, 'a limit of R$ 1.500 on Going out puts the plan over the income');
  eq([await bell(), await ids()], [before + 1, ['plan-over', 'uncat']], 'at once: the bell counts one more, the plan going over the income');
  eq(await page.evaluate(() => [UI.toast && UI.toast.msg, UI.toast && UI.toast.action && UI.toast.action.a]), [await page.evaluate(v => `October 2026: the plan uses ${fmt.money(v, CUR, { trim: true })} more than the planned income.`, over), 'issue-latest'], 'and says so once, with “See”');
  await page.evaluate(() => A['issue-latest']()); eq(await page.evaluate(() => UI.drawer.kind), 'issue', '“See” opens it');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); A.reminders(); });
  eq(await page.evaluate(() => { const g = document.querySelector('#overlay .rem-group'); return [g.querySelector('h3').textContent.trim(), [...g.querySelectorAll('button.rem.iss')].map(b => b.dataset.id.split(':')[1]), g.querySelector('.rem.iss').classList.contains('crit')]; }), ['To fix', ['plan-over', 'uncat'], true], 'the bell: “To fix” comes first, the plan in red');
  // ---------- 2. a tap: what, how, where ----------
  await page.click('#overlay [data-a="issue-open"][data-id^="issue:plan-over"]');
  eq(await page.evaluate(v => [UI.drawer.kind, document.querySelector('#overlay h2').innerText, document.querySelector('.iss-what p').innerText.includes(fmt.money(v, CUR, { trim: true })), !!document.querySelector('.iss-what .lim-month .stackbar'), [...document.querySelectorAll('.iss-fix')].map(b => b.dataset.v), document.activeElement.dataset.v, !!document.querySelector('#overlay .dr-back')], over),
    ['issue', 'The plan uses more than comes in', true, true, ['limits', 'saving', 'income', 'bills'], 'limits', true], 'what is going on (its figure and the month as planned), four ways to solve it, the first focused; ‹ back to the bell');
  ok(await page.evaluate(() => [...document.querySelectorAll('.iss-fix')].every(b => b.getBoundingClientRect().height >= 44)), 'each way is 44 px or more');
  await page.click('.iss-fix[data-v="limits"]');
  eq(await page.evaluate(() => [!UI.drawer, UI.route, !!document.querySelector('#limits-card')]), [true, 'plan', true], '“Lower a limit”: the Plan’s limits, with one tap');
  await page.evaluate(() => { A.reminders(); A['issue-open']({ id: activeReminders().find(r => r.id.startsWith('issue:plan-over')).id }); A['issue-fix']({ v: 'saving', id: UI.drawer.id }); });
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.step]), ['plan-guide', 1], '“Keep a smaller share”: the guide, on its share');
  // ---------- 3. solved ----------
  const pid = await page.evaluate(() => activeReminders().find(r => r.id.startsWith('issue:plan-over')).id);
  await page.evaluate(() => { UI.drawer = null; A['limit-open']({ cat: 'salidas' }); }); await page.click('[data-a="limit-remove"]');
  eq([await bell(), await ids()], [before, ['uncat']], 'the limit taken off: the plan fits again and leaves the bell');
  await page.evaluate(id => A['issue-open']({ id }), pid); eq(await page.evaluate(() => !UI.drawer || UI.drawer.kind !== 'issue'), true, 'a solved issue cannot be opened');
  await page.evaluate(id => { UI.drawer = { kind: 'issue', id, title: 'x' }; renderOverlay(); }, pid);
  ok(await page.evaluate(() => /All set/.test(document.querySelector('.iss-view').innerText)), 'a panel left open on a solved issue says it is solved');
  // ---------- 4. the other issues ----------
  const open1 = async what => { await page.evaluate(w => { UI.drawer = null; const r = activeReminders().find(x => x.kind === 'issue' && x.what === w); A['issue-open']({ id: r.id }); }, what); return page.evaluate(() => [...document.querySelectorAll('.iss-fix')].map(b => b.dataset.v)); };
  await page.evaluate(() => { window.__pay = JSON.parse(JSON.stringify(S.pay)); S.pay = {}; render(); });
  eq(await ids(), ['no-income', 'uncat'], 'no income in the plan: said');
  eq(await open1('no-income'), ['guide', 'income'], 'its ways: add what comes in (the guide), or the Plan’s income');
  await page.click('.iss-fix[data-v="guide"]'); eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.step]), ['plan-guide', 0], 'the guide, on what comes in');
  await page.evaluate(() => { S.pay = window.__pay; UI.drawer = null; S.transactions.push({ id: 'big-out', accountId: 'nu-conta', date: S.today, type: 'expense', amount: -5000000, currency: 'BRL', categoryId: 'other', status: 'confirmed', merchant: 'Big' }); render(); });
  eq(await ids(), ['short', 'negative', 'uncat'], 'R$ 50.000 out of the checking account: not enough until pay day, and the account below zero');
  eq(await open1('short'), ['free', 'transfer', 'goals'], 'not enough: see what is due, move money from savings, set aside less for a goal');
  ok(await page.evaluate(() => /You have today/.test(document.querySelector('.iss-sum').innerText) && /Missing/.test(document.querySelector('.iss-sum').innerText) && !!document.querySelector('.iss-sum .fu-steps .fu-total.neg')), 'with the sum, in the same steps as “You can spend”: what there is, what is due, what is missing');
  await page.click('.iss-fix[data-v="free"]'); eq(await page.evaluate(() => UI.drawer.kind), 'free-view', '“See what is due”: the free-to-spend details');
  eq(await open1('negative'), ['account', 'account-edit', 'transfer'], 'below zero: its movements, its starting balance, an income or a transfer');
  await page.click('.iss-fix[data-v="account"]'); eq(await page.evaluate(() => [UI.route, UI.tx.account]), ['transactions', 'nu-conta'], '“See its movements”: the account’s transactions');
  await open1('negative'); await page.click('.iss-fix[data-v="transfer"]'); eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.type]), ['tx', 'transfer'], '“Record an income or a transfer”: a transfer, ready');
  await page.evaluate(() => { UI.drawer = null; S.transactions = S.transactions.filter(x => x.id !== 'big-out'); render(); });
  eq(await open1('uncat'), ['classify', 'rules'], 'without a category: file them, or make a rule');
  await page.click('.iss-fix[data-v="classify"]'); eq(await page.evaluate(() => [UI.route, UI.tx.category]), ['transactions', 'none'], '“File them”: the transactions without a category');
  // a limit gone over
  await page.evaluate(() => { S.transactions.push({ id: 'g-over', accountId: 'nu-card', date: S.today, type: 'expense', amount: -150000, currency: 'BRL', categoryId: 'casa', subcategoryId: 'supermercado', status: 'confirmed', merchant: 'Mercado' }); render(); A.reminders(); });
  ok(await page.evaluate(() => !!document.querySelector('#overlay button.rem.iss[data-id^="budget:"]')), 'a limit gone over is a row that opens, under “Spending limits”');
  await page.evaluate(() => A['issue-open']({ id: activeReminders().find(r => r.kind === 'budget').id }));
  eq(await page.evaluate(() => [document.querySelector('#overlay h2').innerText, [...document.querySelectorAll('.iss-fix')].map(b => b.dataset.v)]), ['Groceries: over the limit', ['budget-tx', 'budget-raise', 'limits']], 'its panel: the purchases, the limit, another limit');
  await page.click('.iss-fix[data-v="budget-raise"]'); eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('#lm-for').value]), ['limit', 'supermercado'], '“Change the limit”: the groceries limit');
  // ---------- 5. "Not today"; the sides ----------
  await page.evaluate(() => { UI.drawer = null; A['issue-open']({ id: 'issue:uncat' }); }); await page.click('[data-a="issue-snooze"]');
  eq(await page.evaluate(() => [UI.drawer.kind, activeReminders().some(r => r.id === 'issue:uncat'), UI.toast && UI.toast.msg]), ['reminders', false, 'Put off until tomorrow.'], '“Not today”: out of the bell until tomorrow, back in the bell');
  eq(await page.evaluate(() => bellItems().filter(r => r.kind === 'issue' && !!r.book).every(r => !remindOnSide(r))), true, 'the company’s issues are counted on the company’s side only');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- Spanish and Portuguese ----------
  for (const [lang, word, fix] of [['es', 'Para resolver', 'Cómo resolverlo'], ['pt', 'Para resolver', 'Como resolver']]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
    await page.evaluate(() => { S.user.greeted = true; navigate('plan'); A.reminders(); });
    eq(await page.evaluate(() => document.querySelector('#overlay .rem-group h3').innerText.trim().toLowerCase()), word.toLowerCase(), `${lang}: “${word}”`);
    await page.click('#overlay [data-a="issue-open"]'); eq(await page.evaluate(() => document.querySelector('.iss-h').innerText.trim().toLowerCase()), fix.toLowerCase(), `${lang}: “${fix}”`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-issues');
})().catch(e => { console.error('qc-issues: Error', e); process.exit(1); });
