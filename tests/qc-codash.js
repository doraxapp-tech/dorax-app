// QC of the company's side of the dashboard (owner, 2026-10-07, asked which gap to close first: "company dashboard").
//   1. the dashboard has the Household | Company switch, and the currency when the company has more than one; the household's side is
//      what it was, before and after a visit to the company's;
//   2. the company's four figures (received, costs, result, transfers out) are worked out here by hand from the company's accounts in
//      one currency, and match; a household transaction never moves them, and reais never add into dollars;
//   3. costs by category shows what has no company category yet as its own part, which leads to those transactions;
//   4. a company bill is made, listed in To do and paid from the dashboard, in the company's book and from the company's account;
//   5. a company with nothing says so, with the two ways to start; a month that has passed is read the same way;
//   6. the chosen month's column of a chart is drawn (it was not: a layout variable had taken the colour's name);
//   7. it reads in three languages and fits a phone.
const { open, ok, eq, done, TARGET } = require('./pw.js');

(async () => {
  const tag = TARGET + ': ';
  const quiet = p => p.waitForFunction(() => !document.querySelector('#toast-root').innerText.trim(), null, { timeout: 15000 }).catch(() => {});
  const tiles = p => p.evaluate(() => [...document.querySelectorAll('.kpis .kpi')].map(k => [k.querySelector('.label span').innerText.trim(), k.querySelector('.value').innerText.trim(), k.querySelector('.delta').innerText.trim()]));
  // the month's figures of one side and one currency, added up without the app's own functions
  const hand = (p, cur, ym) => p.evaluate(([cur, ym]) => { const ids = new Set(S.accounts.filter(a => a.scope === 'business' && a.currency === cur).map(a => a.id)), xs = S.transactions.filter(x => ids.has(x.accountId) && x.date.slice(0, 7) === ym && x.status !== 'ignored');
    const add = f => xs.filter(f).reduce((n, x) => n + x.amount, 0), income = add(x => x.type === 'income'), costs = -add(x => x.type === 'expense'), out = -add(x => x.type === 'transfer' && x.amount < 0 && !ids.has(x.transferAccountId)), came = add(x => x.type === 'transfer' && x.amount > 0 && !ids.has(x.transferAccountId));
    return { income, costs, out, came, n: xs.length, text: [fmt.money(income, cur), fmt.money(costs, cur), income || costs ? fmt.money(income - costs, cur) : '—', fmt.money(out, cur)] }; }, [cur, ym]);
  {
    const o = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }), p = o.page;
    await p.evaluate(() => { navigate('dashboard'); S.month = '2026-09'; render(); });
    // ---------------------------------------------------------------- 1. the switch, and the household's side
    eq(await p.evaluate(() => [[...document.querySelectorAll('#rail-side [data-a="space"]')].map(b => b.dataset.v + ':' + b.getAttribute('aria-label')), document.querySelectorAll('.pagehead [data-a="space"], .pagehead [data-a="space-cur"]').length, !!document.querySelector('.pagehead .month'), pageBookKey()]),
      [['business:Switch to Company'], 0, true, 'personal'], tag + 'the side is changed from the menu, on Household (the two arrows beside the eye); the dashboard has no switch of its own');
    const house = () => p.evaluate(() => document.querySelector('#view').innerHTML.replace(/<header class="hello[^"]*">.*?<\/header>/, ''));
    const before = await house(), houseTiles = await tiles(p);
    eq(houseTiles.map(x => x[0]), ['Household net balance', 'Income', 'Spending', 'Left over', 'Still to pay'], tag + 'the household’s five figures, its net balance first (owner, 2026-10-08)');
    await p.click('#rail-side [data-a="space"][data-v="business"]');
    eq(await p.evaluate(() => [pageBookKey(), [...document.querySelectorAll('.pagehead [data-a="space-cur"]')].filter(b => b.offsetParent && !b.closest('.space-ghost')).map(b => b.innerText.trim() + ':' + b.getAttribute('aria-pressed')), !!document.querySelector('#first-steps'), !!document.querySelector('#fii-card')]),
      ['business:BRL', ['BRL:true', 'USD:false'], false, false], tag + 'Company opens the company’s side in reais, with the choice of dollars; no first steps and no investments there');

    // ---------------------------------------------------------------- 2. the four figures
    const brl = await hand(p, 'BRL', '2026-09'), usdAug = await hand(p, 'USD', '2026-08');
    ok(brl.n > 0 && brl.costs > 0 && usdAug.income > 0, tag + '(the example has company costs in reais in September and income in dollars in August)', { brl, usdAug });
    let tl = await tiles(p);
    eq([tl.map(x => x[0]), tl.map(x => x[1])], [['Received', 'Costs', 'Result', 'Transfers out'], brl.text], tag + 'September in reais: received, costs, result and transfers out are the company’s accounts in reais, added by hand');
    eq(tl[2][2], brl.income ? tl[2][2] : 'Received minus costs', tag + 'with costs and nothing received the result is the costs, as a loss, and says what it is');
    eq(await p.evaluate(() => [...document.querySelectorAll('.kpis .kpi .hint')].map(h => h.dataset.tip.length > 60).join()), 'true,true,true,true', tag + 'each figure has its (i)');
    // a household transaction, and a dollar one, do not move the figures in reais
    await p.evaluate(() => { const h = S.accounts.find(a => a.scope !== 'business'), u = S.accounts.find(a => a.scope === 'business' && a.currency === 'USD'), mk = (a, amount, type) => S.transactions.unshift({ id: newId('t'), accountId: a.id, date: '2026-09-15', description: 'Test', merchant: 'Test', amount, currency: a.currency, type, categoryId: null, subcategoryId: null, status: 'confirmed', transferAccountId: null, recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null });
      mk(h, -12345, 'expense'); mk(u, -777, 'expense'); mk(u, 50000, 'income'); render(); });
    eq((await tiles(p)).map(x => x[1]), brl.text, tag + 'a household expense and two dollar movements leave the figures in reais as they were');
    // transfers: what left and what came, not a move between two of the company's accounts in this currency
    await p.evaluate(() => { const [a, b] = S.accounts.filter(x => x.scope === 'business' && x.currency === 'BRL'), mk = (acct, amount, other) => S.transactions.unshift({ id: newId('t'), accountId: acct.id, date: '2026-09-16', description: 'Move', merchant: 'Move', amount, currency: 'BRL', type: 'transfer', categoryId: null, subcategoryId: null, status: 'confirmed', transferAccountId: other || null, recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null });
      mk(a, -100000); mk(a, 25000); mk(a, -40000, b.id); mk(b, 40000, a.id); render(); });
    tl = await tiles(p);
    const brl2 = await hand(p, 'BRL', '2026-09');
    eq([brl2.out - brl.out, brl2.came - brl.came, tl[3][1], tl[3][2], tl[1][1]], [100000, 25000, brl2.text[3], 'Came in: ' + await p.evaluate(v => fmt.money(v, 'BRL', { trim: true }), brl2.came), brl.text[1]],
      tag + 'a transfer out and one in show under Transfers out (“Came in”); a move between two of the company’s accounts in reais is neither; none is a cost');
    await p.click('.pagehead [data-a="space-cur"][data-v="USD"]');
    const usd = await hand(p, 'USD', '2026-09');
    tl = await tiles(p);
    eq([tl.map(x => x[1]), tl[0][1].includes('US$'), usd.income, usd.costs], [usd.text, true, 50000, 777], tag + 'the dollar side counts only the dollar accounts, in dollars');
    await p.click('.pagehead [data-a="space-cur"][data-v="BRL"]');

    // ---------------------------------------------------------------- 3. costs by category, and what is not filed
    const loose = await p.evaluate(() => { const ids = new Set(S.accounts.filter(a => a.scope === 'business' && a.currency === 'BRL').map(a => a.id)), cats = new Set(S.company.categories.map(c => c.id)); return S.transactions.filter(x => ids.has(x.accountId) && x.date.slice(0, 7) === '2026-09' && x.type === 'expense' && !cats.has(x.categoryId)); });
    eq(await p.evaluate(() => [document.querySelector('#cat-card h2').innerText.trim(), [...document.querySelectorAll('#cat-card .legend-row')].map(r => [r.dataset.cat, r.children[1].innerText.trim(), r.children[2].innerText.trim(), r.children[3].innerText.trim()])]),
      ['Costs by category', [['none', 'Not filed yet', brl.text[1], '100%']]], tag + 'no company cost is filed yet, so costs by category is one part, “Not filed yet”, with the whole amount');
    await p.evaluate(ids => { const x = S.transactions.find(k => k.id === ids[0]); x.categoryId = 'co-tax'; render(); }, loose.map(x => x.id));
    eq(await p.evaluate(a => { const rows = [...document.querySelectorAll('#cat-card .legend-row')].map(r => [r.dataset.cat, r.children[2].innerText.trim()]), pct = [...document.querySelectorAll('#cat-card .legend-row .pct')].map(e => parseInt(e.innerText, 10)).reduce((x, y) => x + y, 0); return [rows.find(r => r[0] === 'co-tax')[1] === fmt.money(-a, 'BRL'), rows.some(r => r[0] === 'none'), pct, getComputedStyle(document.querySelector('#cat-card .legend-row[data-cat="co-tax"] .dot')).backgroundColor !== getComputedStyle(document.querySelector('#cat-card .legend-row[data-cat="none"] .dot')).backgroundColor]; }, loose[0].amount),
      [true, true, 100, true], tag + 'filing one under Taxes gives Taxes its part, in its colour; the shares add up to 100');
    await p.click('#cat-card .legend-row[data-cat="none"]'); await p.waitForFunction(() => UI.route === 'transactions');
    eq(await p.evaluate(() => { const cats = new Set(S.company.categories.map(c => c.id)), want = S.transactions.filter(x => isBiz(x.accountId) && x.date.slice(0, 7) === '2026-09' && x.type !== 'transfer' && !cats.has(x.categoryId)).length, rows = filteredTx(); return [UI.space, UI.tx.category, rows.length === want && want > 0, rows.every(x => isBiz(x.accountId) && !cats.has(x.categoryId) && x.type !== 'transfer')]; }),
      ['business', 'none', true, true], tag + 'choosing “Not filed yet” opens the company’s transactions of the month that have no company category');
    eq(await p.evaluate(() => { const k = pageBookKeyFor(); setPageBook('personal'); Object.assign(UI.tx, { category: 'none', month: '' }); const rows = filteredTx(); setPageBook(k); return [rows.length > 0, rows.every(x => !isBiz(x.accountId) && (!x.categoryId || x.categoryId === 'other'))]; }), [true, true], tag + 'the same filter on the household’s side is what it was: household transactions with no category or under Other');
    await p.evaluate(() => { Object.assign(UI.tx, TX_DEFAULT); S.user.dashHidden = Object.assign({}, S.user.dashHidden, { 'co-pc': [] }); navigate('dashboard'); });      // the chart and the latest transactions are one click away on a computer (2026-10-11): shown here
    await p.click('#co-all'); await p.waitForFunction(() => UI.route === 'transactions');
    eq(await p.evaluate(() => [UI.space, UI.tx.category || '', filteredTx().every(x => isBiz(x.accountId))]), ['business', '', true], tag + '“View all” under the company’s recent transactions opens the company’s transactions');
    await p.evaluate(() => { Object.assign(UI.tx, TX_DEFAULT); S.month = '2026-10'; navigate('dashboard'); });

    // ---------------------------------------------------------------- 4. a company bill, from the dashboard
    eq(await p.evaluate(() => [pageBookKey(), !!document.querySelector('#todo'), !!document.querySelector('#todo-empty [data-a="line-new"]'), !!document.querySelector('#todo-empty a[href="#imports"]'), document.querySelector('#todo').innerText.includes('Statements to send')]),
      ['business:BRL', true, true, false, true], tag + 'October, company: To do offers a first fixed cost (no spreadsheet import there) and lists the accountant’s statements of the company’s accounts');
    await p.click('#todo-empty [data-a="line-new"]'); await p.waitForSelector('#l-name');
    eq(await p.evaluate(() => [UI.drawer.book, [...document.querySelectorAll('#l-cat option')].map(x => x.textContent).includes('Taxes')]), ['business:BRL', true], tag + 'the panel is the company’s: its book, its categories');
    await p.fill('#l-name', 'Monthly tax'); await p.selectOption('#l-cat', 'co-tax'); await p.fill('#l-amount', '380'); await p.fill('#l-due', '20'); await p.click('[data-a="line-save"]'); await p.waitForFunction(() => !UI.drawer || UI.drawer.kind !== 'line-form'); await p.evaluate(() => { if (UI.drawer) A.close(); }); await quiet(p);
    const lineId = await p.evaluate(() => S.company.books.BRL.plan.lines[0].id);
    eq(await p.evaluate(() => [S.company.books.BRL.plan.lines.map(l => l.name).join(), S.plan.lines.some(l => l.name === 'Monthly tax'), [...document.querySelectorAll('#todo .li.todo b')].map(b => b.innerText.trim()).includes('Monthly tax'), document.querySelector('#todo .sub').innerText.includes(fmt.money(38000, 'BRL')), [...document.querySelectorAll('#plan-card .budget')].map(b => b.querySelector('.cat').innerText.trim() + '|' + b.querySelector('.meta span:last-child').innerText.trim()).join()]),
      ['Monthly tax', false, true, true, 'Taxes|0 of 1 bills paid'], tag + 'the cost is in the company’s book for reais, not in the household’s plan; To do lists it with its amount; Plan vs actual shows Taxes, 0 of 1 paid');
    const tilesBefore = await tiles(p), txBefore = await p.evaluate(() => S.transactions.length);
    await p.click(`#todo [data-a="line-pay-now"][data-id="${lineId}"]`); await quiet(p);
    eq(await p.evaluate(n => { const x = S.transactions.find(k => k.planLineId === S.company.books.BRL.plan.lines[0].id); return [S.transactions.length - n, x && isBiz(x.accountId), x && acct(x.accountId).currency, x && x.amount, x && x.categoryId, [...document.querySelectorAll('#todo .li.todo b')].map(b => b.innerText.trim()).includes('Monthly tax'), [...document.querySelectorAll('#plan-card .budget .meta span:last-child')].map(s => s.innerText.trim()).join()]; }, txBefore),
      [1, true, 'BRL', -38000, 'co-tax', false, '1 of 1 bills paid'], tag + '“Mark as paid” records the payment from the company’s account, under Taxes; the bill leaves To do and counts as paid');
    eq([(await tiles(p))[1][1], tilesBefore[1][1]], [await p.evaluate(() => fmt.money(38000, 'BRL')), await p.evaluate(() => fmt.money(0, 'BRL'))], tag + 'and October’s costs go from nothing to the payment');
    // a reserve shows beside To do
    await p.evaluate(() => { S.accounts.push({ id: 'co-brl-save', name: 'Reserva PJ', institution: 'Nubank', type: 'savings', currency: 'BRL', scope: 'business', monthly: false, purpose: '', opening: 0 }); A['goal-new'](); Object.assign(UI.drawer.draft, { name: 'Tax reserve', targetText: '12000' }); A['goal-save'](); if (UI.drawer) A.close(); render(); }); await quiet(p);
    eq(await p.evaluate(() => [S.company.books.BRL.goals.map(g => g.name).join(), S.goals.some(g => g.name === 'Tax reserve'), !!document.querySelector('#goals-card'), (document.querySelector('#goals-card') || document.body).innerText.includes('Tax reserve')]), ['Tax reserve', false, true, true], tag + 'a company reserve shows on the company’s dashboard, beside To do, and is not one of the household’s goals');

    // ---------------------------------------------------------------- 6. the chosen month's column is drawn
    eq(await p.evaluate(() => { const col = sel => { const i = document.querySelector(sel + ' .colbtn[aria-pressed="true"] i'), c = getComputedStyle(i).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' && c !== getComputedStyle(document.querySelector(sel + ' .colbtn[aria-pressed="false"] i')).backgroundColor; };
      const out = [col('#trend-card'), document.querySelector('#trend-card h2').innerText.trim(), !!document.querySelector('#in-card')]; S.user.dashHidden = Object.assign({}, S.user.dashHidden, { 'home-pc': [] }); document.querySelector('#rail-side [data-a="space"][data-v="personal"]').click(); out.push(col('#trend-card'), document.querySelector('#trend-card h2').innerText.trim()); const h = Object.assign({}, S.user.dashHidden); delete h['home-pc']; S.user.dashHidden = h; render(); return out; }),
      [true, 'Costs by month', false, true, 'Monthly spending'], tag + 'the chosen month’s column is drawn in the accent colour, on both sides; with nothing received in reais there is no “Received by month”');

    // ---------------------------------------------------------------- 1 again: the household's side is what it was
    await p.evaluate(() => { S.transactions = S.transactions.filter(x => !(x.merchant === 'Test' && !isBiz(x.accountId))); S.month = '2026-09'; render(); });
    eq(await house() === before, true, tag + 'after all this, the household’s September dashboard is, to the letter, what it was before the company’s side was opened');
    eq((await tiles(p)).map(x => x.join('|')), houseTiles.map(x => x.join('|')), tag + 'and so are its four figures');
    // dollars have something received: its own chart
    await p.evaluate(() => { document.querySelector('#rail-side [data-a="space"][data-v="business"]').click(); document.querySelector('.pagehead [data-a="space-cur"][data-v="USD"]').click(); });
    eq(await p.evaluate(() => [!!document.querySelector('#in-card'), document.querySelector('#in-card h2').innerText.trim(), document.querySelectorAll('#in-card .colbtn').length, document.querySelector('#past-note') ? 'past' : 'now']), [true, 'Received by month', 6, 'past'], tag + 'the dollar side, where money was received, has “Received by month” with six months; a past month says so');

    // ---------------------------------------------------------------- 5. a company with nothing
    await p.evaluate(() => { const biz = new Set(S.accounts.filter(a => a.scope === 'business').map(a => a.id)); S.transactions = S.transactions.filter(x => !biz.has(x.accountId)); S.accounts = S.accounts.filter(a => !biz.has(a.id)); delete S.company; S.month = '2026-10'; UI.space = 'business'; UI.spaceCur = null; navigate('dashboard'); });
    eq(await p.evaluate(() => { const c = document.querySelector('#co-empty'); return [pageBookKey(), !!c, c && c.querySelector('b').innerText.trim(), c && [...c.querySelectorAll('a')].map(a => a.getAttribute('href')).join(), !!document.querySelector('#view [data-a="edit-account"][data-scope="business"]'), document.querySelectorAll('.pagehead [data-a="space-cur"]').length, !!document.querySelector('.kpis')]; }),
      ['business:BRL', true, 'Nothing for the company in BRL yet', '#plan,#imports', true, 0, false], tag + 'with no company account and no company plan the side is still there: it says nothing is there yet, and offers the plan, a statement and “Add company account”');
    eq(o.errors, [], tag + 'no errors'); await o.browser.close();
  }
  // ---------------------------------------------------------------- 7. languages, a phone, the light theme
  for (const lang of ['es', 'pt']) {
    const o = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 844 }, mobile: true, touch: true }), p = o.page, where = tag + lang + ', phone: ';
    await p.evaluate(() => { navigate('dashboard'); S.month = '2026-09'; if (document.documentElement.lang === 'pt') S.settings.theme = 'light'; render(); document.querySelector('[data-a="space"][data-v="business"]').click(); });
    // a phone's charts are in Reports, Costs (2026-10-08): the category card is read there (a ring since 2026-10-09, tests/qc-report-rings.js)
    eq(await p.evaluate(() => { const en = ['Received', 'Costs', 'Result', 'Transfers out'], labels = [...document.querySelectorAll('.kpis .kpi .label span')]; return [labels.length === 0, labels.map(l => l.innerText.trim()).some(x => en.includes(x) && x !== 'Total'), labels.every(l => l.scrollWidth <= l.clientWidth), document.documentElement.scrollWidth <= innerWidth,
      (UI.repView = 'out', navigate('reports'), document.querySelector('#rep-ring-cat h2').innerText.trim() === t('Costs by group, in detail')), [...document.querySelectorAll('#rep-ring-cat .rg-row .rg-name')].some(n => n.textContent.trim() === t('Not filed yet')), [...document.querySelectorAll('#view .card')].every(c => c.getBoundingClientRect().right <= innerWidth + 1)]; }),
      [true, false, true, true, true, true, true], where + 'no row of figures on a phone (owner, 2026-10-08); the cards are in the language and nothing runs off the screen');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }
  done('qc-codash');
})().catch(e => { console.error('qc-codash: Error', e); process.exit(1); });
