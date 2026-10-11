// QC: Goals and Accounts & savings apart (owner, 2026-10-09: "goals and savings should be separate tabs: the savings are real, the goals are not, a
// goal's numbers are fictitious. Group accounts and savings; it makes more sense to see the savings in Accounts. So Goals stays as what the person
// wants to achieve, and Accounts & savings as what they really have").
//   1. the menu says "Goals" and "Accounts & savings"; the phone's bar says "Goals";
//   2. Accounts & savings has the savings under their own heading; the cards say only what each account holds (owner, 2026-10-10: the split "in goals /
//      free" confused, "remove it");
//   3. a computer: two columns, about 70/30 (owner, 2026-10-10: "make two columns 70/30: the cards on the left, and in the small one each account's
//      logo, its name and how much it has saved; add the savings' totals"): the savings one by one and their total, how long they last, what the side
//      has and owes adding up to its net balance, and each card's invoice; under 1180px the column goes below the cards;
//   4. a side with no savings account says so and offers to add one, set to savings;
//   5. a phone: the accounts, then the savings; every card or stacked (the stack with the savings as rows under it);
//   6. Goals no longer shows where the money is: it says the money is in the savings accounts and leads there; its figures are "set aside", and the
//      dashboard's card is "Goals".
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.settings.locale = 'en-US'; render(); });
  // ---------- 1. the names ----------
  eq(await page.evaluate(() => [routeLabel('goals'), routeLabel('accounts'), [...document.querySelectorAll('#nav a')].map(a => a.textContent.trim()).filter(x => /Goals|Accounts/.test(x))]), ['Goals', 'Accounts & savings', ['Goals', 'Accounts & savings']], 'the menu: Goals, and Accounts & savings');
  // ---------- 2. the savings, in Accounts & savings ----------
  await page.evaluate(() => navigate('accounts')); await page.waitForSelector('.sv-group');
  eq(await page.evaluate(() => [document.querySelector('#topbar h1, .topbar h1').innerText.trim(), document.querySelector('#cc-h-savings').textContent.trim(), [...document.querySelectorAll('.sv-group .cc-item')].map(i => acct(i.dataset.id).name), !document.querySelector('#cc-h-checking ~ .cc-grid [data-id="mp"]')]),
    ['Accounts & savings', 'Your savings', ['Mercado Pago', 'Santander'], true], 'the savings under their own heading');
  eq(await page.evaluate(() => [document.querySelectorAll('.sv-split, .sv-loose').length, /In goals|Free R\$/.test(document.querySelector('#view').innerText)]), [0, false], 'no “in goals / free” on the cards');
  await page.click('.sv-group .cc-item[data-id="mp"] .cc-tap'); await page.waitForSelector('.drawer');
  ok(await page.evaluate(() => !document.querySelector('.drawer .sv-split') && !/In goals/.test(document.querySelector('.drawer').innerText)), 'nor in a savings card’s panel');
  await page.evaluate(() => A.close());
  // ---------- 3. a computer: two columns ----------
  const box = id => page.evaluate(id => { const b = document.getElementById(id); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; }, id);
  eq(await page.evaluate(() => { const m = document.querySelector('.acc-cols > .acc-main'), a = document.querySelector('.acc-cols > aside.acc-side'), r = m.getBoundingClientRect(), q = a.getBoundingClientRect(); return [!!m.querySelector('.sv-group'), Math.round(r.top) === Math.round(q.top), q.left > r.right, Math.round(r.width * 100 / (r.width + q.width))]; }).then(([g, top, right, pct]) => [g, top, right, pct >= 66 && pct <= 74]),
    [true, true, true, true], 'a computer: the cards on the left, the column on the right, side by side, about 70/30');
  eq(await page.evaluate(() => [...document.querySelectorAll('#acc-savings .acc-list li')].map(li => [!!li.querySelector('.bmark, .inst, svg, img'), li.querySelector('.grow').innerText.trim(), li.querySelector('.num').innerText.trim()])),
    [[true, 'Mercado Pago', 'R$ 5,400.00'], [true, 'Santander', 'R$ 11,400.00']], 'each savings account: its mark, its name, what it holds');
  ok(/Total saved R\$ 16,800\.00/.test(await box('acc-savings')) && /No change since Sep 30\./.test(await box('acc-savings')), 'their total (R$ 5,400 + R$ 11,400), and how it moved this month', await box('acc-savings'));
  await page.evaluate(() => { S.transactions.push({ id: 'qa-sv', accountId: 'sant', date: S.today, description: 'X', merchant: 'Deposit', amount: 100000, currency: 'BRL', type: 'income', status: 'cleared', categoryId: null }); render(); });
  ok(/Santander R\$ 12,400\.00 Total saved R\$ 17,800\.00 \+R\$ 1,000\.00 since Sep 30/.test(await box('acc-savings')), 'money put in: the account, the total and the month’s change follow', await box('acc-savings'));
  await page.evaluate(() => { S.transactions = S.transactions.filter(x => x.id !== 'qa-sv'); render(); });
  ok(/^How long your savings last \d.* months? of spending, at R\$ [\d,.]+ a month\. To reach 6 months: R\$ [\d,.]+ more saved\. See the days of freedom$/.test(await box('acc-cover')), 'how long the savings last, and what is missing to the next mark', await box('acc-cover'));
  await page.click('#acc-cover [data-a="runway-view"]'); await page.waitForSelector('.drawer');
  ok(await page.evaluate(() => UI.drawer && /runway/.test(UI.drawer.kind)), 'its button opens the days of freedom', await page.evaluate(() => UI.drawer && UI.drawer.kind));
  await page.evaluate(() => A.close());
  eq(await page.evaluate(() => { const n = el => { const x = el.innerText; return (/[−-]/.test(x) ? -1 : 1) * Number(x.replace(/[^\d.]/g, '')); }; const rows = [...document.querySelectorAll('#acc-sum .acc-row .num')].map(n), tot = n(document.querySelector('#acc-sum .acc-total .num')); return [document.querySelector('#acc-sum h2').innerText.trim(), rows.length, Math.abs(rows.reduce((a, b) => a + b, 0) - tot) < 0.02]; }),
    ['What you have', 3, true], 'what you have: to spend, saved and owed on cards add up to the net balance');
  ok(/^Your cards Nubank account (Invoice|Next invoice ≈) R\$ [\d,.]+, due \w{3} \d{2} · \d+% of the limit used$/.test(await box('acc-cards')), 'each card: its invoice, when it is due, how much of the limit is used', await box('acc-cards'));
  await page.setViewportSize({ width: 1100, height: 900 }); await page.waitForTimeout(150);
  ok(await page.evaluate(() => { const m = document.querySelector('.acc-main').getBoundingClientRect(), a = document.querySelector('.acc-side').getBoundingClientRect(); return a.top >= m.bottom - 1 && document.documentElement.scrollWidth <= innerWidth; }), 'under 1180px: the column goes below the cards, nothing wider than the screen');
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(150);
  // ---------- 4. a side with no savings account ----------
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('accounts'); }); await page.waitForSelector('.sv-group');
  eq(await page.evaluate(() => [(document.querySelector('.sv-none .note') || {}).innerText, !!document.querySelector('.sv-none [data-a="acct-add-savings"]'), (document.querySelector('#acc-savings .acc-note') || {}).innerText, !!document.querySelector('#acc-savings [data-a="acct-add-savings"]'), !document.querySelector('#acc-cover'), document.querySelector('#acc-sum h2').innerText.trim()]),
    ['No savings account yet. It is where your goals are kept.', true, 'No savings account yet.', true, true, 'What the company has'], 'the company, with no savings account: said, with the way to add one; its column says what the company has');
  await page.click('.sv-none [data-a="acct-add-savings"]'); await page.waitForSelector('#a-name');
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.type, UI.drawer.draft.scope, document.querySelector('#a-type').value]), ['account', 'savings', 'business', 'savings'], 'it opens the account form, set to a savings account of that side');
  await page.evaluate(() => { A.close(); A.space({ v: 'personal' }); });
  // ---------- 6. Goals: what is wanted ----------
  await page.evaluate(() => navigate('goals')); await page.waitForSelector('#goal-money');
  eq(await page.evaluate(() => [!document.querySelector('#goal-where'), document.querySelector('#goal-money').innerText.trim(), !!document.querySelector('#goal-money a[href="#accounts"]'), document.querySelector('.tiles .tile .label span').innerText.trim(), document.querySelector('.goal .bal').previousElementSibling.innerText]),
    [true, 'Your goals are plans; the real money is in your savings accounts. See Accounts & savings', true, 'Set aside in goals and funds', 'Set aside'], 'Goals: no “where the money is”; one line leads to the savings; its figures are set aside');
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(150);
  eq(await page.evaluate(() => { const c = document.querySelector('#goals-card'); return c ? [c.querySelector('h2').innerText.trim(), /set aside in goals and funds/.test(c.innerText)] : null; }), ['Goals', true], 'the dashboard’s card is Goals, and says set aside');
  ok(await page.evaluate(() => { const box = document.createElement('div'); box.innerHTML = plannedMonthCard(ymOf(S.today)); return [...box.querySelectorAll('.legend-row')].some(r => /^\s*Goals/.test(r.textContent)) && !/Savings and goals/.test(box.textContent); }), 'the month as planned (before the first transaction): its part for goals is Goals');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 5. a phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; S.user.acctStack = false; navigate('accounts'); }); await page.waitForSelector('.sv-group');
  eq(await page.evaluate(() => [document.querySelector('.acc-head h2').textContent.trim(), [...document.querySelectorAll('#view > .cc-grid .cc-item, .content > .cc-grid .cc-item')].map(i => acct(i.dataset.id).type).filter(x => x === 'savings').length, [...document.querySelectorAll('.sv-group .cc-item')].map(i => acct(i.dataset.id).name), document.querySelector('#cc-h-savings').textContent.trim(), document.querySelectorAll('.sv-split').length, !document.querySelector('.acc-side')]),
    ['Cuentas', 0, ['Mercado Pago', 'Santander'], 'Tus ahorros', 0, true], 'a phone: the accounts, then “Tus ahorros” with each savings card (no split, no column on the right)');
  eq(await page.evaluate(() => [...document.querySelectorAll('.tabbar a, #tabbar a, #tabbar button')].map(b => b.innerText.trim()).filter(x => /Metas|Ahorros/.test(x))), ['Metas'], 'the phone’s bar says Metas');
  await page.evaluate(() => A['acct-view']({ v: 'stack' })); await page.waitForTimeout(500);
  eq(await page.evaluate(() => [document.querySelectorAll('.acc-stack').length, document.querySelectorAll('.sv-group .acc-stack .w-card').length, [...document.querySelectorAll('.sv-rows .sv-row')].map(r => r.querySelector('.sv-row-h .grow').innerText.trim()), document.querySelectorAll('.sv-rows .sv-split').length]),
    [2, 2, ['Mercado Pago', 'Santander'], 0], 'stacked: the accounts and the savings each in their stack, the savings as rows under theirs (the stack shows no details)');
  await page.evaluate(() => navigate('goals')); await page.waitForSelector('#goal-money');
  ok(await page.evaluate(() => /Apartado en metas y fondos/.test(document.querySelector('.g-total').innerText) && !!document.querySelector('#goal-money a[href="#accounts"]')), 'Goals on a phone: set aside, and the way to the savings');
  eq(errors, [], 'no error in the console (phone)'); await browser.close();
  done('qc-savings-accounts');
})();
