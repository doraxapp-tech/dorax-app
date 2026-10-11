// QC of the dashboard on a phone (owner, 2026-10-08: "add an accounts section to the summary tab on mobile, as bullets with the icons of the user's
// accounts and the amount saved in them"; "create an option for the user to order the summary tab as they like"; "the heading with each screen's
// name is gigantic on mobile, make it much smaller").
//   1. the heading: 20 px on a phone (it was 32), on every screen, beside the month; a computer's is as it was;
//   2. the accounts: one line per account of the side, the bank's mark, the name and its kind, what is in it today (cards last, in red); a tap opens
//      that account's transactions, the link opens Accounts; the eye hides the amounts; the company's side lists the company's; not on a computer;
//   3. the order: by default the days of freedom, To do, quick access, the insight, the accounts and the goals, the rest hidden (each with its eye); a button at the foot opens the list; the arrows move a part and
//      the page follows at once; the arrows at the ends are off and the focus stays on the part; the order is kept per side, and "Original order"
//      undoes it; a part that is not on the page this month is not offered; an order saved before a part existed takes the new part in its place;
//   4. thumb sizes, no sideways scroll; Spanish and Portuguese on the narrowest phone.
const { open, ok, eq, done } = require('./pw.js');

const PART = { 'free-card': 'free', 'runway-card': 'runway', 'insight-card': 'insight', 'ac-card': 'accounts', todo: 'todo', 'goals-card': 'goals', 'planned-month': 'planned', 'plan-card': 'plan', 'cat-card': 'categories', 'in-card': 'received', 'trend-card': 'trend', 'fii-card': 'fii', 'recent-card': 'recent' };
const parts = page => page.evaluate(P => [...document.querySelectorAll('#view > *')].map(e => P[e.id] || (e.classList.contains('quick-row') ? 'quick' : e.classList.contains('kpis') ? 'figures' : null)).filter(Boolean), PART);

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  // ---------- 1. the heading ----------
  for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'accounts']) {
    await page.evaluate(r => navigate(r), r);
    eq(await page.evaluate(() => { const h = document.querySelector('.pagehead h1'), m = document.querySelector('.pagehead .month'), cs = getComputedStyle(h); return [parseFloat(cs.fontSize), +cs.fontWeight, !m || Math.abs(h.getBoundingClientRect().top + h.getBoundingClientRect().height / 2 - (m.getBoundingClientRect().top + m.getBoundingClientRect().height / 2)) <= 3]; }),
      [20, 600, true], `${r}: the screen’s title is 20 px (it was 32) and sits level with the month`);
  }
  await page.evaluate(() => navigate('dashboard'));
  // ---------- 2. the accounts ----------
  const ac = await page.evaluate(() => { const c = document.querySelector('#ac-card'), rows = [...c.querySelectorAll('.ac-list .ac-row')], list = personal(), kind = a => ACCT_TYPES().find(x => x[0] === a.type)[1];
    const want = [...list.filter(a => a.type !== 'credit'), ...list.filter(a => a.type === 'credit')].slice(0, 6);
    return { title: c.querySelector('h2').innerText.trim(), n: rows.length, same: rows.every((r, i) => r.dataset.id === want[i].id && r.querySelector('b').innerText.trim() === want[i].name && r.querySelector('small').innerText.trim().startsWith(kind(want[i])) && r.querySelector('.num').innerText.trim() === fmt.money(accountBalance(S, want[i].id, S.today), want[i].currency)),
      marks: rows.every(r => !!r.querySelector('.inst')), creditLast: list.some(a => a.type === 'credit') ? rows[rows.length - 1].dataset.id === want[want.length - 1].id && acct(rows[rows.length - 1].dataset.id).type === 'credit' : true,
      red: rows.filter(r => accountBalance(S, r.dataset.id, S.today) < 0).every(r => r.querySelector('.num').classList.contains('neg') && getComputedStyle(r.querySelector('.num')).color !== getComputedStyle(r.querySelector('b')).color),
      link: c.querySelector('.card-h a.go').getAttribute('href'), cards: c.querySelectorAll('.card').length, tall: rows.every(r => r.getBoundingClientRect().height >= 56), right: rows.every(r => Math.abs(r.querySelector('.num').getBoundingClientRect().right - r.getBoundingClientRect().right) <= 1) }; });
  eq([ac.title, ac.n > 2, ac.same, ac.marks, ac.creditLast, ac.red, ac.link, ac.cards, ac.tall, ac.right], ['Accounts', true, true, true, true, true, '#accounts', 0, true, true],
    `the accounts: ${ac.n} lines with the bank’s mark, the name, the kind and today’s balance at the right edge; money kept first, cards last and in red; a link to Accounts; no card inside the card`);
  const first = await page.evaluate(() => document.querySelector('#ac-card .ac-row').dataset.id);
  await page.click('#ac-card .ac-row');
  eq(await page.evaluate(() => [UI.route, UI.tx.account]), ['transactions', first], 'a tap on an account opens its transactions');
  await page.evaluate(() => navigate('dashboard'));
  await page.click('.bar-bal .bb-eye');
  ok(await page.evaluate(() => [...document.querySelectorAll('#ac-card .ac-row .num')].every(n => /•••••/.test(n.innerText))), 'the eye hides what is in each account');
  await page.click('.bar-bal .bb-eye');
  await page.evaluate(() => { S.accounts.push(...[1, 2, 3, 4].map(k => ({ id: 'ax' + k, name: 'Extra ' + k, institution: '', type: 'savings', currency: 'BRL', opening: 0, scope: 'personal' }))); render(); });
  eq(await page.evaluate(() => [document.querySelectorAll('#ac-card .ac-row').length, (document.querySelector('#ac-card .ac-more') || {}).innerText, (document.querySelector('#ac-card .ac-more') || {}).getAttribute && document.querySelector('#ac-card .ac-more').getAttribute('href'), !!document.querySelector('#ac-card .ac-row[data-id="ax1"] .inst svg')]),
    [6, `See all ${await page.evaluate(() => personal().length)} accounts`, '#accounts', true], 'six lines at most, then a link to all of them; an account without a bank wears a wallet');
  await page.evaluate(() => { S.accounts = S.accounts.filter(a => !/^ax/.test(a.id)); A.space({ v: 'business' }); });
  eq(await page.evaluate(() => [...document.querySelectorAll('#ac-card .ac-row')].map(r => r.dataset.id).join() === business().map(a => a.id).join() && [...document.querySelectorAll('#ac-card .ac-row')].every(r => { const a = acct(r.dataset.id); return r.querySelector('.num').innerText.trim() === fmt.money(accountBalance(S, a.id, S.today), a.currency); })), true,
    'on the company’s side, the company’s accounts, each in its own currency');
  await page.evaluate(() => A.space({ v: 'personal' }));
  // ---------- 3. the order ----------
  const def = await parts(page);
  // since the usability QC of 2026-10-08, what needs doing comes right after the days of freedom
  // since 2026-10-08 the two charts are in Reports (qc-reports-phone) and a phone shows six parts to start with; the others wait in the list, hidden
  eq(def, ['free', 'runway', 'todo', 'quick', 'insight', 'goals', 'accounts'], 'by default (free to spend first since 2026-10-10): the days of freedom, To do, quick access, the day’s insight, the goals and then the accounts (owner, 2026-10-09); the investments and the latest transactions wait, hidden');
  eq(await page.evaluate(() => { const b = document.querySelector('#view > .dash-order:last-child button'); return b ? [b.innerText.replace(/\s+/g, ' ').trim(), b.getBoundingClientRect().height >= 44] : null; }), ['Reorder the dashboard 2 parts hidden', true], 'at the foot, a button a thumb high: Reorder the dashboard, saying two parts are hidden');
  await page.click('#dash-order-btn');
  const sheet = await page.evaluate(() => { const s = document.querySelector('.sheet.d-order'), li = [...s.querySelectorAll('.ord-list li')];
    return [s.getAttribute('role'), s.querySelector('h2').innerText.trim(), li.map(l => l.querySelector('b').innerText.trim()), li[0].querySelector('[data-d="-1"]').disabled, li[li.length - 1].querySelector('[data-d="1"]').disabled, li.slice(1, -1).every(l => !l.querySelector('[data-d="-1"]').disabled && !l.querySelector('[data-d="1"]').disabled),
      [...s.querySelectorAll('.ord-btn')].every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }), document.activeElement.classList.contains('ord-btn'), !!s.querySelector('[data-a="dash-order-reset"]')]; });
  eq(sheet, ['dialog', 'Reorder the dashboard', ['You can spend', 'Days of freedom', 'To do', 'Quick access', 'Insight of the day', 'Goals', 'Accounts', 'Investments (FIIs)', 'Recent transactions'], true, true, true, true, true, false],
    'the list names the parts as the page does, in its order; the first can’t go up, the last can’t go down; arrows of 44 px; the focus is in the list; no “Original order” yet');
  for (let k = 0; k < 6; k++) await page.click('.d-order .ord-btn[data-id="accounts"][data-d="-1"]');
  eq(await parts(page), ['accounts', 'free', 'runway', 'todo', 'quick', 'insight', 'goals'], 'six taps on its up arrow and the accounts are at the top of the page, under the sheet');
  eq(await page.evaluate(() => [document.querySelector('.d-order .ord-list li b').innerText.trim(), document.querySelector('.d-order .ord-btn[data-id="accounts"][data-d="-1"]').disabled, document.activeElement.dataset.id, document.activeElement.dataset.d, (S.user.dashOrder || {}).home.slice(0, 2).join(), !!document.querySelector('[data-a="dash-order-reset"]')]),
    ['Accounts', true, 'accounts', '1', 'accounts,free', true], 'in the list too; its up arrow is off and the focus went to its down arrow; the order is saved with the account; “Original order” is offered');
  await page.click('.d-order .ord-btn[data-id="goals"][data-d="-1"]');
  eq((await parts(page)).slice(-2), ['goals', 'insight'], 'any part moves: the goals above the day’s insight');
  // the eye (usability QC, 2026-10-08): a part hidden leaves the page and stays in the list, dimmed; shown, it comes back in its place
  eq(await page.evaluate(() => [...document.querySelectorAll('.d-order .ord-eye')].map(b => b.dataset.id + ':' + b.getAttribute('aria-pressed')).slice(-2)), ['fii:false', 'recent:false'], 'the hidden parts are in the list, their eye shut');
  await page.click('.d-order .ord-eye[data-id="recent"]');
  eq([(await parts(page)).slice(-1)[0], await page.evaluate(() => [document.activeElement.dataset.id, S.user.dashHidden.home.join()])], ['recent', ['recent', 'fii']], 'its eye shows the latest transactions at the foot of the page; the focus stays on it; kept with the account');
  await page.click('.d-order .ord-eye[data-id="goals"]');
  ok(!(await parts(page)).includes('goals') && await page.evaluate(() => document.querySelector('.d-order li[data-id="goals"]').classList.contains('off')), 'and the goals hidden: off the page, dimmed in the list');
  await page.click('.d-order .ord-eye[data-id="goals"]'); await page.click('.d-order .ord-eye[data-id="recent"]');
  await page.click('.d-order [data-a="dash-order-done"]');
  eq(await page.evaluate(() => [UI.sheet, document.activeElement.id]), [false, 'dash-order-btn'], 'Done closes the list and the focus is back on its button');
  await page.evaluate(() => navigate('plan')); await page.evaluate(() => navigate('dashboard'));
  eq((await parts(page))[0], 'accounts', 'the order stays when the page is opened again');
  await page.evaluate(() => A.space({ v: 'business' }));
  eq(await parts(page), ['runway', 'todo', 'quick', 'insight', 'accounts'], 'the company’s side keeps its own order (its plan, what it received and its latest movements wait, hidden)');
  await page.click('#dash-order-btn'); await page.click('.d-order .ord-btn[data-id="accounts"][data-d="-1"]'); await page.click('.d-order [data-a="dash-order-done"]');
  eq([(await parts(page)).slice(3, 5), await page.evaluate(() => S.user.dashOrder.home[0])], [['accounts', 'insight'], 'accounts'], 'moving a company part leaves the household’s order alone');
  await page.evaluate(() => A.space({ v: 'personal' }));
  await page.click('#dash-order-btn'); await page.click('.d-order [data-a="dash-order-reset"]');
  eq([await parts(page), await page.evaluate(() => [!!S.user.dashOrder.home, !!S.user.dashOrder.co, !!document.querySelector('[data-a="dash-order-reset"]'), document.activeElement.dataset.a])], [def, [false, true, false, 'dash-order-done']],
    '“Original order” puts the household’s page back as it was and keeps the company’s; the focus goes to Done');
  await page.evaluate(() => A.close());
  // a month already over: the parts of a month in progress are neither drawn nor offered
  await page.evaluate(() => A.month({ d: '-1' }));
  const past = await parts(page);
  await page.click('#dash-order-btn');
  eq([past.includes('runway') || past.includes('quick') || past.includes('todo'), await page.evaluate(() => [...document.querySelectorAll('.d-order .ord-list li')].map(li => li.dataset.id).join() === UI.dashShown.join() && !UI.dashShown.some(id => ['runway', 'quick', 'todo'].includes(id)))], [false, true], 'in a month already over, what belongs to the month in progress is not drawn and not offered');
  await page.evaluate(() => { A.close(); A.month({ d: '1' }); });
  // an order saved before the accounts existed: they take their place after the goals, as by default; names that are not parts are left out
  eq(await page.evaluate(() => { S.user.dashOrder = { home: ['recent', 'runway', 'nope', 'quick', 'figures', 'insight', 'todo', 'recent', 'goals', 'planned', 'categories', 'trend', 'fii'] }; const o = dashOrder('home'); S.user.dashOrder = {}; return o; }),
    ['free', 'recent', 'runway', 'quick', 'insight', 'todo', 'goals', 'accounts', 'planned', 'fii'], 'an order saved before a part existed takes it after the part it follows by default (free to spend, first by default, comes first); unknown or repeated names (the month’s figures, and the two charts now in Reports) are dropped');
  eq(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, 'no sideways scroll');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- a computer: no accounts list and no order ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  eq(await page.evaluate(() => [!!document.querySelector('#ac-card'), !!document.querySelector('.dash-order #dash-order-btn'), !!document.querySelector('.hello #dash-order-btn'), parseFloat(getComputedStyle(document.querySelector('.topbar h1')).fontSize)]), [false, false, true, 20], 'a computer: no accounts list, its own “Reorder the dashboard” on the greeting’s line (tests/qc-summary-pc.js), and its title as it was');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 4. Spanish and Portuguese on the narrowest phone ----------
  for (const [lang, w, want] of [['es', 390, ['Resumen', 'Cuentas', 'Ordenar el resumen', 'Subir Cuentas', 'Orden original']], ['pt', 320, ['Resumo', 'Contas', 'Ordenar o resumo', 'Subir Contas', 'Ordem original']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.click('#dash-order-btn'); await page.click('.d-order .ord-btn[data-id="accounts"][data-d="-1"]');
    eq(await page.evaluate(() => [document.querySelector('.pagehead h1').innerText.trim(), document.querySelector('#ac-card h2').innerText.trim(), document.querySelector('.d-order h2').innerText.trim(), document.querySelector('.d-order .ord-btn[data-id="accounts"][data-d="-1"]').getAttribute('aria-label'), document.querySelector('[data-a="dash-order-reset"]').innerText.trim()]),
      want, `${lang}: in the language`);
    ok(await page.evaluate(() => { const h = document.querySelector('.pagehead h1'), m = document.querySelector('.pagehead .month'); return h.getBoundingClientRect().width <= 1 && (document.querySelector('.pagehead .jr-btn') || m).getBoundingClientRect().right >= innerWidth - 20 && m.getBoundingClientRect().right <= innerWidth - 16 && document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.d-order .ord-list li')].every(l => l.scrollWidth <= l.clientWidth + 1); }),
      `${lang} at ${w} px: no title on top (the bar says it), the month and the Journey (v130) filling its row, the list fits, no sideways scroll`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-summary-phone');
})();
