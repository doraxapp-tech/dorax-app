// QC of Sprint 2, part 1 (owner, 2026-10-10: "do the sprints"; claude/open-gaps-funcionalidades-2026-10-10.md, item 3): what is paid once a year.
//   1. Goals: "Yearly expenses" with the ideas (IPVA, IPTU, school, supplies, insurance, Christmas) and one of the person's own;
//   2. an idea fills in its name and month; the form says how much a month, from when, and what there will be; saved, it is a goal underneath
//      (target, deadline, plan in the months before it is due), out of the goals' cards and the summary's goals, in the savings plan;
//   3. its details: the months one by one, "Set aside R$ 600" (a contribution, back to it), and the month marked;
//   4. due this month: in the bell, its panel's ways; "I paid it": what was set aside comes out (with its transfer), the payment is recorded in a
//      category that fits, and next year's starts at the price paid; late: said in red;
//   5. edited (another month, another price) and deleted; found by the search; none on the company's side; Spanish in plain words; 320 px;
//      no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('goals'); });
  // ---------- 1. the section ----------
  eq(await page.evaluate(() => [document.querySelector('#yr-h').textContent, [...document.querySelectorAll('.yr-idea')].map(b => b.dataset.v || 'own'), [...document.querySelectorAll('.yr-idea')].every(b => b.getBoundingClientRect().height >= 44)]),
    ['Yearly expenses', ['ipva', 'iptu', 'school', 'supplies', 'insurance', 'christmas', 'own'], true], 'Goals: “Yearly expenses”, six ideas and one of your own, each a thumb high');
  // ---------- 2. from an idea ----------
  await page.click('.yr-idea[data-v="ipva"]');
  eq(await page.evaluate(() => [UI.drawer.kind, $('yr-name').value, $('yr-month').value, document.activeElement.id]), ['yearly-form', 'IPVA (car tax)', '1', 'yr-cost'], 'IPVA: its name and January filled in, the cost to write');
  await page.fill('#yr-cost', '1800'); await page.selectOption('#yr-acct', await page.evaluate(() => goalSavings()[0].id));
  eq(await page.evaluate(() => document.querySelector('.yr-preview').innerText.trim()), 'Set aside R$ 600 a month from October. In January 2027 you will have R$ 1.800.', 'the form says it: how much a month, from when, and what there will be by then');
  await page.click('[data-a="yearly-save"]');
  const g = await page.evaluate(() => { const x = B().goals.find(k => k.yearly); return { id: x.id, kind: x.kind, target: x.target, deadline: x.deadline, plan: x.plan['2026'], month: x.yearly.month, idea: x.yearly.idea }; });
  eq([g.kind, g.target, g.deadline, g.plan.slice(8), g.month, g.idea], ['goal', 180000, '2027-01', [0, 60000, 60000, 60000], 1, 'ipva'], 'a goal underneath: R$ 1.800 by January 2027, R$ 600 in October, November and December, nothing before');
  eq(await page.evaluate(id => [UI.drawer.kind, UI.drawer.id === id, UI.toast.msg], g.id), ['yearly-view', true, 'IPVA (car tax) added. Dorax plans it every month.'], 'saved: its details, and it says so');
  eq(await page.evaluate(id => { A.close(); navigate('goals'); return [!!document.querySelector(`.yr-card [data-id="${id}"]`), ![...document.querySelectorAll('.g-item')].some(b => b.dataset.id === id), distribution(B(), ymOf(B().today)).rows.some(r => r.goal.id === id && r.planned === 60000)]; }, g.id), [true, true, true], 'on Goals among the yearly expenses, not among the goals’ cards; in the hand-out of the savings payment');
  eq(await page.evaluate(id => { navigate('dashboard'); const c = document.querySelector('#goals-card'); return !c || !c.innerHTML.includes(id); }, g.id), true, 'not among the summary’s goals');
  eq(await page.evaluate(() => { navigate('goals'); const c = document.querySelector('.yr-card'); return [c.querySelector('.chip').innerText, c.querySelector('.yr-say').innerText, c.querySelector('.yr-amt').innerText]; }), ['In January 2027', 'Set aside R$ 600 a month until December.', 'R$ 0 of R$ 1.800'], 'its card: when, how much a month until when, what is set aside of what it costs');
  // ---------- 3. its details ----------
  await page.click(`.yr-card [data-a="yearly-open"]`);
  eq(await page.evaluate(() => [[...document.querySelectorAll('.yr-strip li')].map(l => l.querySelector('span').innerText.toLowerCase() + ':' + l.querySelector('b').innerText), document.querySelector('[data-a="yearly-put"]').innerText.trim()]),
    [['oct:R$ 600', 'nov:R$ 600', 'dec:R$ 600', 'jan:You pay'], 'Set aside R$ 600'], 'its details: the months one by one, the one it is paid in; “Set aside R$ 600”');
  await page.click('[data-a="yearly-put"]');
  eq(await page.evaluate(() => [UI.drawer.kind, $('m-amount').value]), ['goal-move', '600'], 'a contribution of this month’s share');
  await page.click('[data-a="move-save"]');
  eq(await page.evaluate(id => [UI.drawer.kind, goalSaved(B(), id), document.querySelector('.yr-strip li.cur').classList.contains('done'), !document.querySelector('[data-a="yearly-put"]'), S.transactions.filter(x => x.goalMoveId && B().goalMoves.find(m => m.id === x.goalMoveId && m.goalId === id)).length], g.id),
    ['yearly-view', 60000, true, true, 2], 'saved: back to its details, October marked, nothing more to set aside this month; the money moved (one transfer row in each account)');
  // ---------- 4. due this month; paid; late ----------
  await page.evaluate(() => { A.close(); A['yearly-new']({ v: '' }); });
  await page.fill('#yr-name', 'IPTU'); await page.fill('#yr-cost', '1200'); await page.selectOption('#yr-month', '10'); await page.selectOption('#yr-acct', await page.evaluate(() => goalSavings()[0].id));
  eq(await page.evaluate(() => document.querySelector('.yr-preview').innerText.trim()), 'It is due this month: set aside R$ 1.200 now.', 'one due this month: all of it now');
  await page.click('[data-a="yearly-save"]');
  const iptu = await page.evaluate(() => B().goals.find(k => k.name === 'IPTU').id);
  eq(await page.evaluate(id => { A.close(); const r = activeReminders().find(x => x.what === 'yearly' && x.goalId === id); return r && [r.id, issueTitle(r), issueLine(r), r.level]; }, iptu), [`issue:yearly:${iptu}:2026-10`, 'IPTU is due this month', 'R$ 0 set aside of R$ 1.200.', 'warn'], 'due this month: in the bell, with what is set aside');
  await page.evaluate(id => { A.reminders(); A['issue-open']({ id: `issue:yearly:${id}:2026-10` }); }, iptu);
  eq(await page.evaluate(() => [...document.querySelectorAll('.iss-fix')].map(b => b.dataset.v)), ['yearly-pay', 'yearly-view'], 'its panel: “I paid it”, or see it');
  await page.click('.iss-fix[data-v="yearly-pay"]');
  eq(await page.evaluate(() => [UI.drawer.kind, $('yp-amount').value, UI.route]), ['yearly-pay', '1.200', 'goals'], '“I paid it”: what it cost, to change if it was another price');
  // pay the IPVA early instead, with what was set aside
  await page.evaluate(id => { A.close(); A['yearly-pay']({ id }); }, g.id);
  eq(await page.evaluate(() => [$('yp-cat').value, acct($('yp-acct').value).type]), ['casa|transporte', 'checking'], 'IPVA goes to Transport, paid from the main account');
  await page.fill('#yp-amount', '1900');
  eq(await page.evaluate(() => [...document.querySelectorAll('.yr-steps li')].map(l => l.innerText.trim())), [`R$ 600 comes out of what you set aside in ${await page.evaluate(id => acct(goalById(id).accountId).name, g.id)}.`, `The payment of R$ 1.900 is recorded in ${await page.evaluate(() => acct($('yp-acct').value).name)}.`, 'Next year’s starts by itself: R$ 136 a month.'], 'before saving, what happens, step by step');
  await page.click('[data-a="yearly-paid"]');
  eq(await page.evaluate(id => { const x = goalById(id), tx = S.transactions.find(k => k.yearlyId === id); return [goalSaved(B(), id), tx.amount, tx.categoryId + '|' + tx.subcategoryId, tx.type, x.deadline, x.target, goalPlan(x, '2026-10'), goalPlan(x, '2026-11'), goalPlan(x, '2027-12'), goalPlan(x, '2028-01'), S.transactions.filter(k => k.goalMoveId && B().goalMoves.find(m => m.id === k.goalMoveId && m.goalId === id && m.amount < 0)).length, x.yearly.cat]; }, g.id),
    [0, -190000, 'casa|transporte', 'expense', '2028-01', 190000, 60000, 13600, 13600, 0, 2, 'casa|transporte'], 'paid: what was set aside came out (a transfer back), the payment is an expense in its category, next year’s (January 2028) at R$ 1.900, from November; October keeps its R$ 600');
  eq(await page.evaluate(() => UI.drawer.kind), 'yearly-view', 'and back to its details, next year’s');
  await page.evaluate(id => { A.close(); goalById(id).deadline = '2026-08'; navigate('goals'); }, iptu);
  eq(await page.evaluate(id => { const c = [...document.querySelectorAll('.yr-card')].find(k => k.querySelector(`[data-id="${id}"]`)); const r = activeReminders().find(x => x.goalId === id); return [c.querySelector('.chip').innerText, c.querySelector('.yr-say').innerText, !!c.querySelector('[data-a="yearly-pay"]'), r.level, issueTitle(r)]; }, iptu),
    ['Not paid yet', 'It was due in August. Did you pay it?', true, 'crit', 'IPTU: not paid yet'], 'late: said in red on its card and in the bell, with “I paid it” right there');
  // ---------- 5. edited, deleted, found; the company ----------
  await page.evaluate(id => A['yearly-edit']({ id }), iptu);
  await page.selectOption('#yr-month', '2'); await page.fill('#yr-cost', '1100'); await page.click('[data-a="yearly-save"]');
  eq(await page.evaluate(id => { const x = goalById(id); return [x.deadline, x.target, x.yearly.month, goalPlan(x, '2026-10'), goalPlan(x, '2027-01'), goalPlan(x, '2027-02')]; }, iptu), ['2027-02', 110000, 2, 27500, 27500, 0], 'another month and price: due February 2027, R$ 1.100 over October to January');
  eq(await page.evaluate(id => { A['goal-edit']({ id }); return UI.drawer.kind; }, iptu), 'yearly-form', 'its “Edit” from the goal’s details opens its own form');
  await page.click('[data-a="yearly-delete"]'); await page.click('#modal-ok');
  eq(await page.evaluate(id => [!goalById(id), !B().goalMoves.some(m => m.goalId === id), UI.toast.msg], iptu), [true, true, 'IPTU deleted.'], 'deleted: no longer planned');
  eq(await page.evaluate(() => { const r = findResults('IPVA').find(x => x.kind === 4); return r && [r.sub.startsWith('Yearly expense'), r.icon]; }), [true, 'calendar'], 'the search finds it as a yearly expense');
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('goals'); });
  eq(await page.evaluate(() => !document.querySelector('#yearly')), true, 'the company’s side has none');
  await page.evaluate(() => A.space({ v: 'personal' }));
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- Spanish, 320 px ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('goals'); A['yearly-new']({ v: 'christmas' }); UI.drawer.draft.costText = '1200'; UI.drawer.draft.accountId = goalSavings()[0].id; A['yearly-save'](); A.close(); navigate('goals'); });
  eq(await page.evaluate(() => { const c = document.querySelector('.yr-card'); return [document.querySelector('#yr-h').textContent.toLowerCase(), c.querySelector('b').innerText, c.querySelector('.chip').innerText, c.querySelector('.yr-say').innerText, document.querySelector('.yr-idea[data-v="ipva"] small').innerText]; }),
    ['gastos del año', 'Navidad', 'En diciembre', 'Aparta R$ 600 al mes hasta noviembre.', 'enero'], 'es: “Gastos del año”, Navidad, months in lower case as in a sentence');
  eq(await page.evaluate(() => { const v = document.querySelector('#view'); return [document.documentElement.scrollWidth - innerWidth, [...v.querySelectorAll('.yr button')].every(b => b.getBoundingClientRect().height >= 40)]; }), [0, true], 'es, 320 px: nothing wider than the phone, every button a thumb high');
  eq(errors, [], 'es: no error in the console'); await browser.close();
  done('qc-yearly');
})().catch(e => { console.error('qc-yearly: Error', e); process.exit(1); });
