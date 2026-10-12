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
  // sections 1–4 test the previous phone summary, which the company's side still shares (tests/pw.js: oldLook); from 5 on, the new look
  let { browser, page, errors } = await open({ oldLook: true, lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
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
  // the cards' names outside them (owner, 2026-10-11: "take the headings out of the summary's cards, on the phone, e.g. the Goals card, Transactions")
  eq(await page.evaluate(() => { const cards = [...document.querySelectorAll('#view > .card')]; return [cards.length > 0 && cards.every(c => c.classList.contains('part-out') && c.firstElementChild.classList.contains('part-h') && !!c.querySelector(':scope > .part-h h2') && c.lastElementChild.classList.contains('part-box') && !c.querySelector('.part-box .card-h, .part-box .rw-h')),
      getComputedStyle(document.querySelector('#goals-card')).borderTopWidth, getComputedStyle(document.querySelector('#goals-card .part-box')).borderTopWidth, document.querySelector('#goals-card .part-h').getBoundingClientRect().bottom <= document.querySelector('#goals-card .part-box').getBoundingClientRect().top + 1,
      [...document.querySelectorAll('#view > .card .part-h h2')].map(h => h.innerText.trim())]; }),
    [true, '0px', '1px', true, ['You can spend', 'Days of freedom', 'To do', 'Goals', 'Accounts']], 'each card’s name is outside it, right above its box: the part has no box of its own, the box under the name holds the rest');
  await page.tap('#runway-card .part-h .btn.go'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'runway-view', 'the “See” beside a name does what its card does'); await page.evaluate(() => A.close());
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

  // ---------- a computer (v199: the summary's look there too; v201: a web page's layout, not the phone's parts; tests/qc-desk-land.js) ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  eq(await page.evaluate(() => [!!document.querySelector('#ac-card'), !!document.querySelector('.dash-order #dash-order-btn'), !!document.querySelector('.bq-dhero .bq-dacts #dash-order-btn'), !!document.querySelector('#view .dash-grid'), parseFloat(getComputedStyle(document.querySelector('.topbar h1')).fontSize)]), [false, false, true, true, 20], 'v201: a computer has the summary’s colours with a web page’s layout: the computer’s parts three to a row (not the phone’s accounts card), “Reorder the dashboard” in the header’s row of buttons, the bar’s title as it was');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 4. Spanish and Portuguese on the narrowest phone ----------
  for (const [lang, w, want] of [['es', 390, ['Resumen', 'Cuentas', 'Ordenar el resumen', 'Subir Cuentas', 'Orden original']], ['pt', 320, ['Resumo', 'Contas', 'Ordenar o resumo', 'Subir Contas', 'Ordem original']]]) {
    ({ browser, page, errors } = await open({ oldLook: true, lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.click('#dash-order-btn'); await page.click('.d-order .ord-btn[data-id="accounts"][data-d="-1"]');
    eq(await page.evaluate(() => [document.querySelector('.pagehead h1').innerText.trim(), document.querySelector('#ac-card h2').innerText.trim(), document.querySelector('.d-order h2').innerText.trim(), document.querySelector('.d-order .ord-btn[data-id="accounts"][data-d="-1"]').getAttribute('aria-label'), document.querySelector('[data-a="dash-order-reset"]').innerText.trim()]),
      want, `${lang}: in the language`);
    ok(await page.evaluate(() => { const h = document.querySelector('.pagehead h1'), m = document.querySelector('.pagehead .month'); const jb = document.querySelector('.pagehead .jr-btn'), mr = m.getBoundingClientRect(); return h.getBoundingClientRect().width <= 1 && Math.round(mr.left) === 16 && (!jb || (jb.getBoundingClientRect().left - mr.right <= 12 && jb.getBoundingClientRect().right <= innerWidth - 16)) && document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.d-order .ord-list li')].every(l => l.scrollWidth <= l.clientWidth + 1); }),
      `${lang} at ${w} px: no title on top (the bar says it), the month on the left and the Journey right beside it (v167), the list fits, no sideways scroll`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  // ---------- 5. the summary "Bosque" (owner, 2026-10-11: "lleva esa a cabo en resumen, exactamente lo que me muestras"; 2026-10-12: "no se ve igual,
  // no está organizado tal como el ejemplo… usa este verde por favor": always in the design's order, in the reference's deep green and lime) ----------
  // a phone, light, the household: the forest block at the top, "You can spend" half on it with its lime strip, four round buttons, the accounts as
  // round logos, what there is to pay as cards, the days of freedom and the goals side by side, the bar at the foot floating; nowhere else
  for (const w of [390, 320]) {
    ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: w, height: 844 }, touch: true, mobile: true }));
    await page.evaluate(() => { S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); });
    const look = () => page.evaluate(() => { const root = document.documentElement, cs = el => el ? getComputedStyle(el) : {}, r = el => el.getBoundingClientRect();
      const f = document.querySelector('#view > .bq-free'), head = document.querySelector('.topbar > .pagehead'), foot = f && f.querySelector('.bq-free-foot'), bal = document.querySelector('.bar-bal .bb-link b');
      const acts = [...document.querySelectorAll('#quick-acts button')], tab = document.querySelector('.tabbar');
      return { on: root.classList.contains('land'), meta: document.querySelector('meta[name="theme-color"]').content, page: cs(document.querySelector('.work')).backgroundColor, behind: [cs(root).backgroundColor, cs(root).backgroundImage, cs(root).backgroundSize, cs(document.body).backgroundColor], block: [cs(document.querySelector('.topbar > .navbar')).backgroundColor, cs(head).backgroundColor],
        card: f ? [f === document.querySelector('#view').firstElementChild, cs(f.querySelector('.bq-free-top')).backgroundColor, Math.abs(r(f).top - r(head).bottom) <= 1 && Math.abs(r(foot).top - r(f.querySelector('.bq-free-top')).bottom) <= 1, cs(foot).backgroundColor, foot.dataset.a, Math.round(r(foot).height) >= 44, parseFloat(cs(f.querySelector('.fu-n')).fontSize) < parseFloat(cs(bal).fontSize), parseFloat(cs(head).borderBottomLeftRadius)] : null,
        acts: acts.map(b => b.dataset.v || b.dataset.a).join(), actsTall: acts.every(b => r(b).height >= 44),
        accounts: document.querySelectorAll('#ac-card .bq-acc').length === cardsOf(personal()).length && cardsOf(personal()).length < personal().length, logos: !!document.querySelector('#ac-card .bq-acc .inst img'),
        bills: document.querySelectorAll('#todo .bq-bill').length > 0, firstDue: (document.querySelector('#todo .bq-bill.first .bq-due') || {}).textContent,
        pair: [...document.querySelectorAll('#view > .bq-pair > [id]')].map(x => x.id).join(),
        bar: [cs(tab).backgroundColor, cs(tab).backdropFilter, Math.round(r(tab).left), Math.round(innerWidth - r(tab).right), Math.round(r(tab).height), [...tab.querySelectorAll('a')].every(a => a.scrollWidth <= a.clientWidth + 1 && r(a).height >= 44)],
        whole: bal.scrollWidth <= bal.clientWidth + 1, wide: document.documentElement.scrollWidth - innerWidth };
    });
    eq(await look(), { on: true, meta: '#112622', page: 'rgb(233, 237, 236)', behind: ['rgb(233, 237, 236)', 'linear-gradient(rgb(17, 38, 34), rgb(17, 38, 34))', '100% 50%', 'rgba(0, 0, 0, 0)'], block: ['rgb(17, 38, 34)', 'rgb(17, 38, 34)'], card: [true, 'rgb(17, 38, 34)', true, 'rgb(182, 221, 98)', 'free-view', true, true, 0],
      acts: 'expense,income,transfer,quick-more', actsTall: true, accounts: true, logos: true, bills: true, firstDue: 'en 3 días', pair: 'runway-card,goals-card',
      bar: ['rgba(255, 255, 255, 0.72)', 'saturate(1.8) blur(20px)', w < 375 ? 12 : 16, w < 375 ? 12 : 16, 58, true], whole: true, wide: 0 }, `${w} px: the summary "Bosque" as designed (v180: the day's figure on the block's own green, flush with it, the lime strip right under it, smaller than the net balance; the block square at its foot; v189: the bar at the foot frosted glass as Wise’s, 16 px from the sides, 58 px tall, every name whole; the forest only at the top behind the app)`);
    if (w === 390) {
      // More: the other things to do, in a list; a bill opens its details; "You can spend" opens how it was worked out
      await page.click('#quick-acts [data-a="quick-more"]');
      eq(await page.evaluate(() => { const vs = [...document.querySelectorAll('.bq-more-sheet [data-a="quick-go"]')].map(b => b.dataset.v); return [vs.length > 3, vs.some(v => ['expense', 'income', 'transfer'].includes(v)), document.activeElement === document.querySelector('.bq-more-sheet [data-a="quick-go"]')]; }), [true, false, true], 'More lists the other things to do, the focus on the first');
      await page.evaluate(() => A.close());
      // one logo per card, its functions together (v181: "condensa las cuentas"); a tap opens its panel ("cuando hago tap no me abre el menú de cuenta")
      await page.click('#ac-card .bq-acc'); await page.waitForTimeout(200);
      eq(await page.evaluate(() => { const dr = document.querySelector('#overlay .drawer'), acts = [...document.querySelectorAll('#overlay .cv-acts button')], cs = el => getComputedStyle(el), ops = document.querySelector('#overlay .cv-ops'), r = el => el.getBoundingClientRect();
        return [!!(UI.drawer && UI.drawer.kind === 'card-view' && dr), cs(dr).backgroundColor, acts.map(b => b.dataset.v).join(), cs(acts[0]).backgroundColor, Math.abs(r(acts[0]).top - r(acts[1]).top) < 1, acts.every(b => r(b).height >= 44), cs(ops).backgroundColor, cs(ops).borderTopLeftRadius, cs(document.querySelector('#overlay .op-card')).backgroundColor, cs(dr.querySelector('header h2')).color]; }),
        [true, 'rgb(17, 38, 34)', 'expense,income', 'rgb(182, 221, 98)', true, true, 'rgb(233, 237, 236)', '30px', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)'], 'an account’s logo opens its panel (v191, as Transactions): the card and what is above the list on forest, two pills side by side (an expense lime, an income; no “Edit account”), the transactions light in the grey sheet over it, the days in a white card');
      // v197: its income pill opens an income (it had opened an expense: the line that made it one had slipped into a comment)
      await page.click('#overlay .cv-acts [data-v="income"]'); await page.waitForTimeout(250);
      eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.type, UI.drawer && UI.drawer.draft.dir, document.querySelector('#overlay .tx-kind [aria-pressed="true"]').dataset.v]), ['tx', 'income', 'in', 'income'], 'v197: an account’s “Record an income” opens an income in that account');
      await page.evaluate(() => A.close()); await page.waitForTimeout(250);
      await page.click('#ac-card .bq-acc'); await page.waitForTimeout(200);
      await page.evaluate(() => A.close());
      ok(await page.evaluate(() => document.activeElement && document.activeElement.matches('#ac-card .bq-acc')), 'closing it, the focus is back on the logo');
      await page.click('#todo .bq-bill.first'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => !!(UI.drawer && document.querySelector('#overlay .drawer'))), 'a bill opens its details');
      await page.evaluate(() => A.close());
      await page.click('#free-open'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => !!(UI.drawer && UI.drawer.kind === 'free-view')), '"You can spend" opens how it was worked out');
      await page.evaluate(() => A.close());
      // always the design's order, whatever order or eyes were saved for the summary before; the notices after it; no "Reorder the dashboard"
      const order = () => page.evaluate(() => [...document.querySelectorAll('#view > *')].map(x => x.id || x.className));
      const want = ['free-card', 'quick-acts', 'ac-card', 'todo', 'bq-pair', 'bq-moves-card', 'insight-card', 'mc-ask'];      // v195: the month's spending and the latest transactions after the pair
      eq(await order(), want, 'the design’s order, the notice after it');
      await page.evaluate(() => { S.user.dashOrder = { home: ['recent', 'goals', 'insight', 'runway', 'accounts', 'todo', 'quick', 'free'] }; S.user.dashHidden = { home: ['accounts', 'todo', 'quick'] }; render(); });
      eq([await order(), await page.evaluate(() => !!document.querySelector('#dash-order-btn'))], [want, false], 'an order and hidden parts saved before do not move it');
      await page.evaluate(() => { delete S.user.dashOrder; delete S.user.dashHidden; render(); });
      // short of money the card stays (owner, 2026-10-12: "quiero que pongas que puedes gastar hoy como en el screenshot"): R$ 0 a day, the strip says how much is missing
      await page.evaluate(() => { window.__fu = freeUntil; window.freeUntil = (...a) => { const r = window.__fu(...a); return r && Object.assign({}, r, { free: -487536, perDay: 0 }); }; render(); });
      eq(await page.evaluate(() => { const f = document.querySelector('#view > .bq-free'); return f && [f.classList.contains('short'), f.querySelector('.fu-n').textContent.trim(), /4\.875/.test(f.querySelector('.bq-say').textContent), f.querySelector('.bq-chip').textContent.trim()]; }), [true, 'R$ 0', true, 'Puedes gastar'], 'short of money: the card stays, R$ 0 a day and how much is missing');
      await page.evaluate(() => { window.freeUntil = window.__fu; render(); });
      // v195 ("agrega el gráfico de transacciones con las más recientes debajo en Resumen"): the month's spending as on Transactions, its chart in a white
      // card, and the five latest transactions under it; "View all" opens Transactions on the expenses
      eq(await page.evaluate(() => { const c = document.querySelector('#bq-moves-card'), cs = el => getComputedStyle(el), rows = [...c.querySelectorAll('.bq-op')], latest = S.transactions.filter(x => !isBiz(x.accountId) && x.date <= S.today && x.status !== 'ignored').map(x => x.date).sort().reverse().slice(0, 5);
        return [cs(c.querySelector('.bq-mv')).backgroundColor, !!c.querySelector('.bq-chart.on-card svg .now'), cs(c.querySelector('.bq-chart.on-card .now')).stroke, rows.length, rows.map(r => S.transactions.find(x => x.id === r.dataset.id).date).join() === latest.join(), rows.every(r => r.getBoundingClientRect().height >= 44), /Gastaste en octubre/.test(c.querySelector('.bq-sum-k').textContent)]; }),
        ['rgb(255, 255, 255)', true, 'rgb(17, 38, 34)', 5, true, true, true], 'the month’s spending with its chart in a white card (the line deep green on white), and the five latest transactions under it, newest first');
      await page.click('#bq-moves-card .bq-more'); await page.waitForTimeout(200);
      eq(await page.evaluate(() => [UI.route, UI.tx.type, UI.tx.month]), ['transactions', 'expense', 'current'], '“View all” opens Transactions on this month’s expenses');
      await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(200);
      // the bar at the foot: no round + here, four screens; smaller while the page goes down, whole again going up (v183)
      eq(await page.evaluate(() => [getComputedStyle(document.querySelector('.tabbar .fab')).display, document.querySelectorAll('.tabbar a').length]), ['none', 4], 'no round + in the bar on the summary');
      for (const y of [120, 320, 520]) { await page.evaluate(y => { document.querySelector('.work').scrollTop = y; }, y); await page.waitForTimeout(60); }
      await page.waitForTimeout(400);
      const small = await page.evaluate(() => [document.documentElement.classList.contains('bar-small'), Math.round(document.querySelector('.tabbar').getBoundingClientRect().height), [...document.querySelectorAll('.tabbar a')].every(a => a.getBoundingClientRect().height >= 44 && a.textContent.trim().length > 0)]);
      await page.evaluate(() => { document.querySelector('.work').scrollTop = 380; }); await page.waitForTimeout(400);
      eq([small, await page.evaluate(() => document.documentElement.classList.contains('bar-small'))], [[true, 54, true], false], 'scrolling down the bar gets smaller (icons alone, names kept for a screen reader, 44 px to tap); up, whole again');
      await page.evaluate(() => { document.querySelector('.work').scrollTop = 0; }); await page.waitForTimeout(200);
      // a month already over: no card on the block, which ends under the month
      await page.evaluate(() => A.month({ d: '-1' }));
      eq(await page.evaluate(() => [!!document.querySelector('.bq-free'), Math.round(parseFloat(getComputedStyle(document.querySelector('.topbar > .pagehead')).paddingBottom))]), [false, 24], 'a month already over: no card, the block ends under the month');
      await page.evaluate(() => A.month({ d: '1' }));
      // ---------- 6. the panels opened from it and a new transaction with its keypad (v187: "actualiza todas las pantallas de menú a las que se
      // accede a partir de Resumen… haz estos dos updates, quiero ver cómo se ven en vivo") ----------
      await page.click('#quick-acts [data-v="expense"]'); await page.waitForTimeout(250);
      eq(await page.evaluate(() => { const a = document.getElementById('d-amount'), keys = [...document.querySelectorAll('#overlay .bq-key')], dr = document.querySelector('#overlay .drawer'), cl = dr.querySelector('header [data-a="close"]');
        return [UI.drawer.pad, a.readOnly, a.getAttribute('inputmode'), keys.map(k => k.dataset.v).join(), keys.every(k => k.getBoundingClientRect().height >= 42), getComputedStyle(dr).backgroundColor, getComputedStyle(cl).borderRadius, Math.round(cl.getBoundingClientRect().width), !document.getElementById('d-say')]; }),
        [true, true, 'none', '1,2,3,4,5,6,7,8,9,sep,0,del', true, 'rgb(233, 237, 236)', '50%', 44, true], 'a new expense from the summary: its keypad (1 to 9, the decimal mark, 0, erase), the field takes no phone keyboard, the panel in the summary’s grey with a round close button');
      for (const k of ['9', '2', 'sep', '5', '0', '0', 'del', '0']) await page.click(`#overlay .bq-key[data-v="${k}"]`);
      eq(await page.evaluate(() => [UI.drawer.draft.amountText, document.getElementById('d-amount').value, document.getElementById('bq-save-amt').textContent, getComputedStyle(document.querySelector('#overlay .bq-save')).backgroundColor, getComputedStyle(document.querySelector('#overlay .bq-save-ico')).backgroundColor]),
        ['92,50', '92,50', 'R$ 92,50', 'rgb(17, 38, 34)', 'rgb(182, 221, 98)'], 'typed on the keys: one decimal mark, two decimals at most, erase; the deep green bar says the amount, its check lime');
      // v197 (owner, 2026-10-12: "el teclado numérico sigue visible en agregar transacción, necesito esconderlo para poder ver mejor los otros fields")
      const padNow = () => page.evaluate(() => { const f = document.querySelector('#overlay .bq-tx-foot'), w = f.querySelector('.bq-pad-wrap'), b = document.getElementById('bq-pad-btn'), h = Math.round(w.getBoundingClientRect().height), acc = document.getElementById('d-account');
        return [f.classList.contains('off'), h > 150 ? 'up' : h === 0 ? 'down' : h, getComputedStyle(w).visibility, b.getAttribute('aria-expanded'), b.getAttribute('aria-label') === t(f.classList.contains('off') ? 'Show keypad' : 'Hide keypad'), Math.round(b.getBoundingClientRect().width), getComputedStyle(document.querySelector('#overlay .bq-save')).display, acc.getBoundingClientRect().bottom <= f.getBoundingClientRect().top]; });
      eq(await padNow(), [false, 'up', 'visible', 'true', true, 44, 'flex', false], 'v197: the keypad is up when the panel opens, the round button on the amount offers to put it away; the account is under it');
      await page.click('#bq-pad-btn');
      eq(await padNow(), [true, 'down', 'hidden', 'false', true, 44, 'flex', true], 'v197: the round button puts the keypad away: “Save” alone at the foot, the rest of the form (the account) in sight, the button now brings it back');
      await page.click('#d-amount');
      eq(await padNow(), [false, 'up', 'visible', 'true', true, 44, 'flex', false], 'v197: touching the amount brings the keys back');
      await page.click('#overlay .tx-pick');
      eq((await padNow()).slice(0, 2), [true, 'down'], 'v197: touching another field (a group) puts them away');
      await page.evaluate(() => { UI.drawer.draft.amountText = ''; document.getElementById('d-amount').value = ''; }); await page.click('#overlay .bq-save'); await page.waitForTimeout(250);
      eq(await page.evaluate(() => [UI.drawer.invalid, document.querySelector('#overlay .bq-tx-foot').classList.contains('off')]), ['d-amount', false], 'v197: saved with no amount, its keys come back up');
      for (const k of ['9', '2', 'sep', '5', '0']) await page.click(`#overlay .bq-key[data-v="${k}"]`);
      eq(await page.evaluate(() => [UI.drawer.draft.amountText, UI.drawer.invalid, document.getElementById('d-amount').getAttribute('aria-invalid')]), ['92,50', null, null], 'v197: typed again on the keys, the amount is no longer marked');
      eq(await page.evaluate(() => [...new Set([...document.querySelectorAll('#overlay .bq-key, #quick-acts button, .bq-acc, .bq-bill')].map(k => getComputedStyle(k).touchAction + ' ' + getComputedStyle(k).userSelect))]), ['manipulation none'], 'v190: the keys and the summary’s buttons keep the quick tap (two taps never zoom the page) and select no digit');
      await page.fill('#d-merchant', 'Cena QC');
      eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#overlay .bq-pad')).display, getComputedStyle(document.querySelector('#overlay .bq-save')).display]), ['none', 'flex'], 'v190: while a word is typed the keypad steps aside, “Save” stays'); await page.evaluate(() => document.getElementById('d-merchant').dispatchEvent(new Event('change', { bubbles: true })));
      await page.click('#overlay .bq-save'); await page.waitForTimeout(250);      // its group was chosen above (v197)
      ok(await page.evaluate(() => !UI.drawer && S.transactions.some(x => x.merchant === 'Cena QC' && x.amount === -9250)), 'saved: an expense of R$ 92,50');
      // v192 ("¿este es el nuevo diseño?", with the notifications, More, "You can spend", the days of freedom and a fixed cost): each as Transactions
      const split = () => page.evaluate(() => { const box = document.querySelector('#overlay .drawer, #overlay .sheet'), sh = box && box.querySelector('.bq-sheet'), cs = el => getComputedStyle(el);
        return box && sh ? [cs(box).backgroundColor, cs(sh).backgroundColor, cs(sh).borderTopLeftRadius, sh.getBoundingClientRect().left <= box.getBoundingClientRect().left + 1] : null; });
      for (const [sel, name] of [['.navbar .bell', 'the notifications'], ['.navbar .more-btn', 'More'], ['#free-open', '"You can spend"'], ['#runway-open', 'the days of freedom'], ['#todo .bq-bill.first', 'a fixed cost']]) {
        await page.click(sel); await page.waitForTimeout(250);
        eq(await split(), ['rgb(17, 38, 34)', 'rgb(233, 237, 236)', '30px', true], `${name}, opened from it: forest at the top, the rest in the grey sheet that rises over it, edge to edge`);
        await page.evaluate(() => A.close()); await page.waitForTimeout(250);
      }
      await page.evaluate(() => { navigate('plan'); A.reminders(); }); await page.waitForTimeout(250);
      ok(await page.evaluate(() => !document.querySelector('.navbar .bell') && !!document.querySelector('#overlay .bq-sheet')), 'v193: the bell is the summary’s (Plan has none in its bar); its panel, wherever it opens, as the others');
      await page.evaluate(() => { A.close(); navigate('dashboard'); }); await page.waitForTimeout(250);
      // ---------- 7. Transactions, "Movimientos · Bosque" (v188) ----------
      await page.click('.tabbar a[href="#transactions"]'); await page.waitForTimeout(300);
      const moves = () => page.evaluate(() => { const cs = el => el ? getComputedStyle(el) : {}, r = el => el.getBoundingClientRect(), top = document.querySelector('.bq-txtop'), sheet = document.querySelector('.bq-txsheet');
        const rows = filteredTx().filter(x => x.currency === CUR && x.status !== 'ignored'), spent = -sum(rows.filter(x => x.type === 'expense').map(x => x.amount));
        return { on: document.documentElement.classList.contains('land'), meta: document.querySelector('meta[name="theme-color"]').content, top: cs(top).backgroundColor, flush: Math.abs(r(top).top - r(document.querySelector('.topbar > .pagehead')).bottom) <= 1,
          kind: [...document.querySelectorAll('.bq-kind button')].map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')).join(), tools: [...document.querySelectorAll('.navbar .bar-tools > button, .navbar .bar-tools .bq-tt > button')].filter(b => b.getClientRects().length).map(b => b.id || b.dataset.a).join(),
          label: document.querySelector('.bq-sum-k').textContent, figure: document.querySelector('.bq-sum-v').textContent === fmt.money(spent, CUR), chart: !!document.querySelector('.bq-chart svg .now') && !!document.querySelector('.bq-chart .bq-mk'),
          sheet: [cs(sheet).backgroundColor, cs(sheet).borderTopLeftRadius, r(sheet).top < r(top).bottom], rows: document.querySelectorAll('#tx-list .bq-op').length === Math.min(40, filteredTx().length), tall: [...document.querySelectorAll('#tx-list .bq-op')].every(b => r(b).height >= 44),
          bar: [getComputedStyle(document.querySelector('.tabbar .fab')).display, document.querySelectorAll('.tabbar a').length], wide: document.documentElement.scrollWidth - innerWidth };
      });
      eq(await moves(), { on: true, meta: '#112622', top: 'rgb(17, 38, 34)', flush: true, kind: 'expense:true,income:false,:false', tools: 'bq-find-btn,tx-filters-btn', label: 'Gastaste en octubre', figure: true, chart: true,
        sheet: ['rgb(233, 237, 236)', '30px', true], rows: true, tall: true, bar: ['none', 4], wide: 0 }, 'Transactions as the canvas: the forest block on from the top bar, search and filters as round buttons, Expenses first, the month’s spending large, its chart; the list by day in a grey sheet over the block; the floating bar');
      await page.click('.bq-kind [data-v="income"]');
      eq(await page.evaluate(() => [UI.tx.type, document.activeElement.dataset.v, document.querySelector('.bq-sum-k').textContent, filteredTx().every(x => x.type === 'income')]), ['income', 'income', 'Recibiste en octubre', true], 'Income: the list, the figure and its words follow; the finger stays on the switch');
      await page.click('.bq-kind [data-v=""]');
      eq(await page.evaluate(() => [UI.tx.type, document.querySelector('.bq-sum-k').textContent, /^[+−]R\$/.test(document.querySelector('.bq-sum-v').textContent)]), ['', 'Balance de octubre', true], 'All: what came in less what went out, with its sign');
      await page.click('.bq-kind [data-v="expense"]');
      await page.click('#bq-find-btn'); await page.keyboard.type('cena q');
      eq(await page.evaluate(() => [document.activeElement.id, document.querySelectorAll('#tx-list .bq-op').length, document.querySelector('.bq-sum-v').textContent]), ['tx-q', 1, 'R$ 92,50'], 'search: the field opens in the block, the list and the figure follow while typing, the focus stays in the field');
      await page.click('.bq-find-x');
      eq(await page.evaluate(() => [document.activeElement.id, UI.tx.q, !!document.getElementById('tx-q')]), ['bq-find-btn', '', false], 'closed: the search is let go, the focus back on its button');
      await page.click('.bq-mon [data-d="-1"]'); await page.waitForTimeout(250);
      eq(await page.evaluate(() => [S.month, document.querySelector('.bq-sum-k').textContent, /en agosto$/.test(document.querySelector('.bq-cmp').textContent), document.activeElement.dataset.d]), ['2026-09', 'Gastaste en septiembre', true, '-1'], 'the month before: its figure, compared with the whole month before it');
      await page.focus('.bq-chart svg'); await page.keyboard.press('Home');
      eq(await page.evaluate(() => [bqChartNow.day, /^1 sep · R\$/.test(document.querySelector('.bq-mk text').textContent), document.getElementById('bq-mk-say').textContent === document.querySelector('.bq-mk text').textContent]), [1, true, true], 'the chart’s mark moves with the keys, and says its day and figure');
      await page.click('.bq-mon [data-d="1"]'); await page.waitForTimeout(250);
      await page.click('.bq-add'); await page.waitForTimeout(200);
      eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.type, !!document.querySelector('#overlay .bq-pad')]), ['tx', 'expense', true], '“Add” in the list opens a new expense with its keypad');
      await page.evaluate(() => A.close());
      await page.click('#tx-list .bq-op'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => !!(UI.drawer && UI.drawer.kind === 'tx' && !UI.drawer.isNew)), 'a row opens its transaction');
      await page.evaluate(() => A.close());
      await page.evaluate(() => { S.settings.theme = S.settings.themePhone = 'dark'; render(); });
      eq(await page.evaluate(() => [document.documentElement.classList.contains('land'), document.documentElement.classList.contains('land-dark'), !!document.querySelector('.bq-tx'), getComputedStyle(document.querySelector('.bq-txsheet')).backgroundColor]), [true, true, true, 'rgb(11, 20, 18)'], 'v194: the dark theme has the same Transactions, its sheet the deep green that reads as black');
      await page.evaluate(() => { S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); });
      // the other pages, the company's side, the dark theme: as they were
      await page.evaluate(() => navigate('plan'));
      // ---------- 8. the other screens in the same look (v193: "sigue con el resto de la webapp"; "no repitas los botones de cambio de cuenta, campana,
      // tres puntos; usa los que tengan sentido") ----------
      const screen = () => page.evaluate(() => { const cs = el => el ? getComputedStyle(el) : {}, hero = document.querySelector('#view > .bq-hero'), r = el => el.getBoundingClientRect();
        return { land: ['land', 'land-page'].map(c => document.documentElement.classList.contains(c)).join(), page: cs(document.querySelector('.work')).backgroundColor, bar: cs(document.querySelector('.tabbar')).backgroundColor,
          tools: [...document.querySelectorAll('.navbar .bar-tools > *, .navbar .bar-left .bq-back')].filter(b => b.getClientRects().length).map(b => b.className.split(' ').filter(c => /^bq-|more-btn|bell|side-flip/.test(c)).join('.')).join(),
          hero: hero ? [cs(hero).backgroundColor, Math.round(r(hero).width) === innerWidth, getComputedStyle(hero, '::after').backgroundColor] : null, wide: document.documentElement.scrollWidth - innerWidth }; });
      for (const [route, tools, hero] of [['plan', 'bq-tool.bq-new', true], ['goals', 'bq-tool.bq-new', true], ['accounts', 'bq-tool.bq-back,bq-tool.bq-new', false], ['investments', 'bq-tool.bq-back,bq-tool.bq-new', false], ['recurring', 'bq-tool.bq-back', false], ['settings', 'bq-tool.bq-back', false], ['profile', 'bq-tool.bq-back', false]]) {
        await page.evaluate(r => navigate(r), route); await page.waitForTimeout(150);
        eq(await screen(), { land: 'true,true', page: 'rgb(233, 237, 236)', bar: 'rgba(255, 255, 255, 0.72)', tools, hero: hero ? ['rgb(17, 38, 34)', true, 'rgb(233, 237, 236)'] : null, wide: 0 }, `${route}: the forest bar with only its own tools (${tools || 'none'}), ${hero ? 'its top on the forest and ' : ''}the page as the grey sheet, the glass bar`);
      }
      // v194 ("no me gusta la fecha en todas las pantallas, es repetitivo"): no month row on Plan, Goals and Reports; Reports has its month by its switch;
      // Plan with another month in view says which, with the way back
      for (const r of ['plan', 'goals', 'reports']) { await page.evaluate(r => navigate(r), r); ok(await page.evaluate(() => !document.querySelector('.pagehead .month')), `v194: ${r} has no month row`); }
      eq(await page.evaluate(() => { const m = document.querySelector('.bq-hero .bq-rep-top .bq-mon'); return m && [...m.querySelectorAll('button')].map(b => b.dataset.a + b.dataset.d).join(); }), 'month-1,month1', 'Reports: its month beside its switch');
      await page.evaluate(() => { navigate('plan'); A.month({ d: '-1' }); });
      eq(await page.evaluate(() => { const p = document.querySelector('.bq-hero .bq-past'); return p && [p.querySelector('span').textContent, p.querySelector('[data-a="month-now"]').textContent]; }), ['Viendo Septiembre 2026', 'Volver a octubre'], 'Plan on another month: which, and the way back to this one');
      await page.click('.bq-past-go'); ok(await page.evaluate(() => S.month === ymOf(S.today) && !document.querySelector('.bq-past')), 'and back');
      await page.evaluate(() => navigate('goals'));
      ok(await page.evaluate(() => !document.querySelector('#view .g-acts [data-a="goal-new"]') && !!document.querySelector('.navbar .bq-new[data-a="goal-new"]')), 'Goals: “Create” is the lime + in the bar, not a third button on the forest');
      await page.click('.navbar .bq-new'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => !!(UI.drawer && UI.drawer.kind === 'goal-form')), 'and it opens a new goal'); await page.evaluate(() => A.close());
      await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); });
      eq(await page.evaluate(() => [document.documentElement.classList.contains('land'), !!document.querySelector('.bq-free, .bq-acts')]), [false, false], 'the company’s summary keeps its look');
      await page.evaluate(() => { A.space({ v: 'personal' }); S.settings.theme = S.settings.themePhone = 'dark'; navigate('dashboard'); });
      eq(await page.evaluate(() => { const cs = el => getComputedStyle(el); return [document.documentElement.classList.contains('land-dark'), !!document.querySelector('.bq-acts'), cs(document.querySelector('.work')).backgroundColor, cs(document.querySelector('.topbar > .navbar')).backgroundColor, cs(document.querySelector('.bq-acts')).backgroundColor, cs(document.querySelector('.tabbar')).backgroundColor, cs(document.querySelector('.bq-acc-n')).color]; }),
        [true, true, 'rgb(11, 20, 18)', 'rgb(17, 38, 34)', 'rgb(21, 34, 31)', 'rgba(21, 34, 31, 0.72)', 'rgb(238, 242, 239)'], 'v194 ("el modo oscuro me lleva al diseño viejo"): the dark theme has the new summary in its dark version: the same forest block, the page a green that reads as black, the cards a step lighter, light words, the glass bar dark');
      // v196: Automatic follows the device, in the new look too; More offers it
      await page.evaluate(() => { S.settings.theme = S.settings.themePhone = 'system'; render(); }); await page.emulateMedia({ colorScheme: 'light' }); await page.waitForTimeout(100);
      const light1 = await page.evaluate(() => document.documentElement.classList.contains('land-dark'));
      await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(100);
      eq([light1, await page.evaluate(() => document.documentElement.classList.contains('land-dark'))], [false, true], 'Automatic: the light version with a light device, the dark one when the device turns dark');
      await page.click('.navbar .more-btn'); await page.waitForTimeout(150);
      eq(await page.evaluate(() => { const sel = document.getElementById('theme-m'); return [[...sel.options].map(o => o.value).join(), sel.value, document.querySelector('#theme-m').closest('.mr-pick').querySelector('.mr-val').textContent]; }), ['system,light,dark', 'system', 'Automático'], 'More offers Automatic, Light and Dark, Automatic chosen');
      await page.evaluate(() => { A.close(); S.settings.theme = S.settings.themePhone = 'dark'; render(); }); await page.emulateMedia({ colorScheme: 'light' });
      eq(await page.evaluate(() => { const i = document.querySelector('#quick-acts .bq-ico.on'); return [getComputedStyle(i).backgroundColor, getComputedStyle(i).color, getComputedStyle(document.querySelector('#bq-moves-card .now')).stroke]; }), ['rgb(182, 221, 98)', 'rgb(17, 38, 34)', 'rgb(182, 221, 98)'], 'v195: in the dark theme the expense’s icon is deep green on its lime (it was lime on lime), and the chart’s line lime on the dark card');
      eq(await page.evaluate(() => { const g = document.querySelector('#goals-card .bq-tile'), d = document.querySelector('#todo .bq-bill.first .bq-due'); return [getComputedStyle(g).color, getComputedStyle(g.querySelector('.bq-tile-h')).color, getComputedStyle(g.querySelector('.bq-bar')).backgroundColor, getComputedStyle(d).backgroundColor, getComputedStyle(d).color]; }),
        ['rgb(182, 221, 98)', 'rgb(182, 221, 98)', 'rgba(182, 221, 98, 0.18)', 'rgb(182, 221, 98)', 'rgb(17, 38, 34)'], 'v195: in the dark theme the goals’ words are lime on their dark mint, their bars’ track visible; the nearest bill’s day deep green on its lime');
      for (const r of ['plan', 'goals', 'settings']) { await page.evaluate(r => navigate(r), r); eq(await page.evaluate(() => [document.documentElement.classList.contains('land-page'), getComputedStyle(document.querySelector('.work')).backgroundColor, document.documentElement.scrollWidth - innerWidth]), [true, 'rgb(11, 20, 18)', 0], `v194: ${r} in the dark version too`); }
      await page.evaluate(() => navigate('dashboard'));
    }
    eq(errors, [], `${w} px, Bosque: no error in the console`); await browser.close();
  }
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  await page.evaluate(() => { S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); });
  eq(await page.evaluate(() => [document.documentElement.classList.contains('land'), !!document.querySelector('.bq-free, .bq-acts')]), [true, true], 'v199: a computer has the summary’s look too (tests/qc-desk-land.js)');
  eq(errors, [], 'computer, Bosque: no error in the console'); await browser.close();
  done('qc-summary-phone');
})();
