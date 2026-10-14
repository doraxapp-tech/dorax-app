// QC of the computer's own pages in the summary's look (v203; owner, 2026-10-12: "crea artefactos de Plan, Metas, Inversiones, informes con el mismo
// estilo de cuenta y ahorros… y hacerlos todo en un pase", then "deja todo y publica todo"; features/desk/desk-kit.js and features/<page>/<page>.desk.js).
//   1. each page: its figure on the forest, what comes next at its right, its band; the sheet under it; nothing wider than the screen; no error;
//   2. Plan: the next bill and its button, the strip of the month (the card's invoice as an outline), the bills with no day, the card's costs folded
//      into one row that opens and folds back, the limits with today's mark and a way to give one to a category without;
//   3. Goals: the savings payment to hand out and its button down to the hand-out, when each goal gets there, a card each, the reserve's days, the
//      monthly plan one click away in a panel; recording the hand-out;
//   4. Investments: what they pay against the person's own costs, the year's bars with this month to record, a day's distributions in one row;
//   5. Reports: the month against the same days of the one before, the average kept, the months as bars that open, the year as a table in a panel;
//   6. Accounts & savings: the net balance, how long the savings last, the table (what goes out and what is left), the savings and the card;
//   7. dark, Portuguese and English, the amounts hidden; a phone keeps its own pages;
//   8. Reports from the first month: each part shows what there is (the month's balance, the months to come as outlines, the categories against the plan).
const { open, ok, eq, done } = require('./pw.js');
const go = async (page, route, theme) => { await page.evaluate(([r, th]) => { S.user.greeted = true; S.settings.theme = th || 'light'; window.DORAX_BETA = true; UI.drawer = null; UI.sheet = false; renderOverlay(); navigate(r); render(); }, [route, theme]); await page.waitForTimeout(350); };
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const wide = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

(async () => {
  const { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } });

  // ---------- 4. Investments ----------
  await go(page, 'investments');
  eq(await txt(page, '.dk-hero .dk-big'), 'R$ 7.520,00', 'Investments: what the FIIs are worth today');
  ok(/Ya cubre el 23% de tus suscripciones/.test(await txt(page, '.dk-cov')), 'Investments: what they pay a month, against the person’s own subscriptions');
  eq(await page.evaluate(() => [document.querySelectorAll('.dk-col').length, !!document.querySelector('.dk-col.now i.todo')]), [12, true], 'Investments: twelve months of bars, this month’s to record as an outline');
  eq(await page.evaluate(() => document.querySelectorAll('#fii-position tbody tr:not(.tot)').length), 3, 'Investments: the position, a row a fund');
  eq(await page.evaluate(() => document.querySelectorAll('#fii-moves tbody tr.dk-day').length), 6, 'Investments: a day’s distributions in one row');
  await page.click('#fii-moves tr.dk-day [data-a="dk-day"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [document.querySelectorAll('#fii-moves tr.dk-sub-row').length, document.querySelectorAll('#fii-moves tr.dk-sub-row [data-a="fii-delete"]').length, document.activeElement.getAttribute('aria-expanded')]), [3, 3, 'true'], 'Investments: a day opens into its funds, each with its way to delete');
  await page.click('.dk-band [data-a="dk-go"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => document.activeElement && !!document.activeElement.closest('#fii-income')), 'Investments: “Record those of October” leads to them');

  // ---------- 5. Reports ----------
  await go(page, 'reports');
  eq(await txt(page, '.dk-hero .dk-big'), 'R$ 346,70', 'Reports: what went out this month so far');
  eq(await page.evaluate(() => [...document.querySelectorAll('.dk-main .dk-chip')].map(e => e.textContent.trim())), ['+R$ 89,29 frente a los mismos días de septiembre', 'El plan iba en R$ 280'], 'Reports: against the same days of the month before, and the plan’s pace');
  ok(/R\$ 3\.400/.test(await txt(page, '.dk-side .dk-mid')) && /41,5%/.test(await txt(page, '.dk-side .dk-mid')), 'Reports: what is left each month on average, and its share');
  eq(await page.evaluate(() => document.querySelectorAll('.dk-grp').length), 7, 'Reports: seven months as bars');
  eq(await page.evaluate(() => ['#rep-daily', '#rep-cats', '#rep-balance', '#rep-pay', '#rep-matrix'].map(s => !!document.querySelector(s))), [true, true, true, true, true], 'Reports: the day by day, where it went, the net balance, how it was paid, the categories');
  await page.click('.dk-band [data-a="dk-rep-table"]'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, document.querySelectorAll('#overlay table tbody tr').length > 3]), ['rep-year', true], 'Reports: the year as a table, in a panel');
  await page.evaluate(() => A.close()); await page.waitForTimeout(300);
  await page.click('.dk-grp[data-ym="2026-09"]'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => [S.month, document.querySelector('.dk-hero .dk-k').textContent]), ['2026-09', 'Gastado en septiembre'], 'Reports: a month’s bars open it');
  await page.evaluate(() => { S.month = ymOf(S.today); render(); });

  // ---------- 6. Accounts & savings ----------
  await go(page, 'accounts');
  eq(await txt(page, '.dk-hero .dk-big'), 'R$ 29.075,83', 'Accounts: the household’s net balance');
  eq(await txt(page, '.dk-side .dk-mid'), '3 meses y medio de gastos', 'Accounts: how long the savings last, in whole and half months');
  eq(await page.evaluate(() => document.querySelectorAll('#acc-table tbody tr').length), 5, 'Accounts: every account in the table, the card under its account');
  eq(await page.evaluate(() => { const r = document.querySelector('#acc-table tbody tr'); return [...r.querySelectorAll('td')].slice(1, 4).map(td => td.querySelector('b').textContent); }), ['R$ 13.167,65', 'R$ 4.665,06', 'R$ 8.502,59'], 'Accounts: what the main account has, what goes out of it this month and what it keeps');
  ok(await page.evaluate(() => !!document.querySelector('#acc-table .dk-sub-acc') && /Alcanza/.test(document.querySelector('#acc-table tbody tr').textContent)), 'Accounts: it is enough, said; the card is a row under its account');
  eq(await page.evaluate(() => [!!document.querySelector('#acc-savings'), document.querySelectorAll('#acc-savings .dk-sv').length, !!document.querySelector('#acc-savings .dk-lost')]), [true, 2, true], 'Accounts: where the savings are, and the goal that does not say where');
  await page.click('[id^="acc-card-"] [data-a="card-pay"]'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'card-pay', 'Accounts: the card’s invoice has its button to record the payment');
  await page.evaluate(() => A.close()); await page.waitForTimeout(300);
  eq(await wide(page) <= 0, true, 'Accounts: nothing wider than the screen');

  // ---------- 1 + 2. Plan ----------
  await go(page, 'plan');
  eq(await txt(page, '.dk-hero .dk-k'), 'Falta pagar en octubre', 'Plan: the figure says what it is, the month in a sentence');
  eq(await txt(page, '.dk-hero .dk-big'), 'R$ 2.805,60', 'Plan: what is still to pay of the month’s bills');
  ok(await page.evaluate(() => !!document.querySelector('.dk-hero .dk-big .cents')), 'Plan: its cents drawn small');
  eq(await page.evaluate(() => [...document.querySelectorAll('.dk-main .dk-chip')].map(e => e.textContent.trim())), ['Pagado R$ 39,90 · 1 de 11', 'De R$ 2.845,50 en gastos fijos'], 'Plan: paid so far and of how much, in chips');
  eq(await page.evaluate(() => { const s = document.querySelector('.dk-side'); return [s.querySelector('.dk-next-t b').textContent, s.querySelector('.dk-chip').textContent, s.querySelector('.btn.primary').dataset.a]; }), ['Alquiler', 'en 3 días', 'line-pay-now'], 'Plan: the next bill due, in how many days, and its button');
  eq(await page.evaluate(() => [...document.querySelectorAll('.dk-band .dk-legend li .dk-legend-k')].map(e => e.textContent.trim())), ['Cuentas fijas', 'Ahorros y metas', 'Límites de gasto', 'Sin asignar'], 'Plan: how what comes in is shared, four parts');
  eq(await page.evaluate(() => [...document.querySelectorAll('.dk-strip .dk-m')].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left)).map(e => e.className.replace('dk-m ', ''))), ['bill', 'inv', 'bill'], 'Plan: the strip has the two bills with a day and the card’s invoice as an outline');
  ok(/3 sin día/.test(await txt(page, '.dk-noday')), 'Plan: the bills with no day are said, with the way to set them');
  eq(await page.evaluate(() => document.querySelectorAll('#paylist tbody tr:not(.grp)').length), 5, 'Plan: the table lists the home’s five bills');
  const fold = await page.$('[data-a="dk-fold"]');
  ok(!!fold && (await fold.getAttribute('aria-expanded')) === 'false', 'Plan: the costs charged to the card are one folded row');
  await fold.click(); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [document.querySelectorAll('#paylist tbody tr:not(.grp)').length, document.activeElement.dataset.a, document.activeElement.getAttribute('aria-expanded')]), [11, 'dk-fold', 'true'], 'Plan: “See the 6” opens them, the focus stays on its button');
  await page.click('[data-a="dk-fold"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => document.querySelectorAll('#paylist tbody tr:not(.grp)').length), 5, 'Plan: and folds them back');
  eq(await page.evaluate(() => [document.querySelectorAll('#limits-card .dk-lim').length, document.querySelectorAll('#limits-card .dk-add').length, !!document.querySelector('#limits-card .dk-lim-today')]), [2, 2, true], 'Plan: two limits with today’s mark, two categories offered one');
  ok(/unos R\$ 3\d al día/.test(await txt(page, '#limits-card .dk-lim')), 'Plan: a limit says what is left a day');
  eq(await wide(page) <= 0, true, 'Plan: nothing wider than the screen');
  await page.click('.dk-side .btn.primary'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => planProgress(B(), B().month, BCUR(), B().today).find(p => p.name === 'Alquiler').spent > 0), 'Plan: the forest’s button marks the rent as paid');
  await page.evaluate(() => { UI.sheet = false; UI.drawer = null; renderOverlay(); render(); }); await page.waitForTimeout(250);
  eq(await txt(page, '.dk-hero .dk-big'), 'R$ 1.005,60', 'Plan: and the figure goes down by it');
  eq(await txt(page, '.dk-side .dk-next-t b'), 'Tarjeta Nubank: factura', 'Plan: the next thing due is then the card’s invoice, with its button to record the payment');

  // ---------- 3. Goals ----------
  await go(page, 'goals');
  eq(await txt(page, '.dk-hero .dk-big'), 'R$ 17.100,00', 'Goals: what is set aside in goals and funds');
  ok(/R\$ 2\.550/.test(await txt(page, '.dk-side .dk-mid')), 'Goals: the savings payment still to hand out');
  eq(await page.evaluate(() => [...document.querySelectorAll('.dk-lane:not(.dk-lane-x) .dk-lane-n b')].map(e => e.textContent)), ['Viaje', 'Entrada del carro', 'Computadora nueva'], 'Goals: when each goal with a target gets there, one lane each');
  eq(await page.evaluate(() => [...document.querySelectorAll('.dk-lane-l')].map(e => e.textContent.trim())), ['Mar 2027', 'Dic 2027', 'Dic 2027'], 'Goals: the month each one arrives at the planned pace');
  eq(await page.evaluate(() => [document.querySelectorAll('#goal-cards .dk-goal:not(.ch-tile)').length, document.querySelectorAll('#goal-cards .ch-tile').length, !!document.querySelector('#goal-cards .dk-goal-add [data-a="goal-new"]'), document.querySelectorAll('#goal-cards .dk-idea').length > 2]), [5, 1, true, true], 'Goals: five cards, the 52-week challenge’s (v227), and the dashed one to add, with the yearly ideas');
  ok(/Cubre 33 días de tus gastos/.test(await txt(page, '#dk-goal-emergencia')), 'Goals: the emergency fund says how many days of spending it covers');
  ok(/Mar 2027 · manteniendo R\$ 1\.000 al mes/.test(await txt(page, '#dk-goal-viaje') || await txt(page, '.dk-goal')), 'Goals: the date and the amount kept up on one line');
  await page.click('.dk-side [data-a="dk-go"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => document.activeElement && document.activeElement.closest('#dist') && document.activeElement.tagName === 'INPUT'), 'Goals: “Hand it out now” leads to the hand-out, its first amount in focus');
  await page.click('.dk-band [data-a="goal-year-open"]'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, !!document.querySelector('#overlay #goal-year table')]), ['goal-year', true], 'Goals: the monthly plan opens in a panel');
  await page.click('#overlay [data-a="goal-mode"][data-v="actual"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.goalMode, !!document.querySelector('#overlay #goal-year')]), ['actual', true], 'Goals: its switch works inside the panel');
  await page.evaluate(() => { UI.goalMode = 'plan'; A.close(); }); await page.waitForTimeout(300);
  const moves = await page.evaluate(() => B().goalMoves.length);
  await page.click('#dist [data-a="dist-register"]'); await page.waitForTimeout(600);
  eq(await page.evaluate(n => B().goalMoves.length - n, moves), 4, 'Goals: recording the hand-out records its four contributions');
  await page.evaluate(() => { UI.sheet = false; UI.drawer = null; renderOverlay(); render(); }); await page.waitForTimeout(250);
  ok(await page.evaluate(() => !document.querySelector('.dk-side [data-a="dk-go"]') && /Repartido/.test(document.querySelector('.dk-side').textContent)), 'Goals: then the payment says it is handed out');

  // ---------- 7. dark, hidden amounts ----------
  for (const r of ['plan', 'goals', 'investments', 'reports', 'accounts']) {
    await go(page, r, 'dark');
    eq(await page.evaluate(() => [document.documentElement.classList.contains('land-dark'), getComputedStyle(document.querySelector('.dk-sheet .dk-card, .dk-sheet .dk-tile')).backgroundColor]), [true, 'rgb(21, 34, 31)'], `${r}: dark, its cards in the dark card colour`);
  }
  await page.evaluate(() => { numsSet(true); render(); }); await page.waitForTimeout(200);
  ok(/•••••/.test(await txt(page, '.dk-hero .dk-big')), 'the eye hides the page’s figure too');
  await page.evaluate(() => { numsSet(false); render(); });
  eq(errors, [], 'no error in the console');
  await browser.close();

  // ---------- Portuguese and English, a phone ----------
  for (const [lang, want] of [['pt', 'Falta pagar em outubro'], ['en', 'Still to pay in October']]) {
    const o = await open({ lang, account: 'example', plan: true, viewport: { width: 1280, height: 860 } });
    await go(o.page, 'plan');
    eq(await txt(o.page, '.dk-hero .dk-k'), want, `${lang}: the Plan's figure in its language`);
    for (const r of ['goals', 'investments', 'reports', 'accounts']) { await go(o.page, r); ok(await o.page.evaluate(() => !!document.querySelector('.dk-hero .dk-big')), `${lang}: ${r} drawn`); }
    eq(await wide(o.page) <= 0, true, `${lang}: nothing wider than a 1280 px screen`);
    eq(o.errors, [], `${lang}: no error`); await o.browser.close();
  }
  // ---------- Reports from the first month (owner, 2026-10-12, his account starting in October: "no se parece al artefacto") ----------
  {
    const o = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 860 } }), p = o.page;
    const first = async income => { await p.evaluate(inc => { S.user.greeted = true; S.settings.theme = 'light'; S.today = '2026-10-12'; S.month = '2026-10'; S.transactions = [];
      const add = (id, date, accountId, type, amount, merchant, categoryId) => S.transactions.push({ id, date, accountId, type, amount, currency: 'BRL', merchant, description: merchant, categoryId, subcategoryId: null, status: 'confirmed', notes: '' });
      if (inc) add('f0', '2026-10-05', 'nu-conta', 'income', 650000, 'Sueldo', 'income');
      add('f1', '2026-10-01', 'nu-card', 'expense', -12330, 'Claude', 'suscripciones'); add('f2', '2026-10-03', 'nu-card', 'expense', -10990, 'TotalPass', 'suscripciones'); add('f3', '2026-10-11', 'nu-conta', 'expense', -50000, 'Envio', 'other');
      navigate('reports'); render(); }, income); await p.waitForTimeout(400); };
    await first(true);
    eq(await p.evaluate(() => ['#rep-daily', '#rep-cats', '#rep-balance', '#rep-pay', '#rep-vsplan', '#rep-matrix'].map(s => !!document.querySelector(s))), [true, true, true, true, true, false], 'first month: the day by day, where it went, the balance, how it was paid, and the categories against the plan (nothing to compare months with yet)');
    eq(await txt(p, '#dk-keep-h'), 'Lo que te queda en octubre, hasta hoy', 'first month: the forest says what is left of this month');
    ok(/R\$ 5\.767/.test(await txt(p, '.dk-side .dk-mid')) && /88,7%/.test(await txt(p, '.dk-side .dk-mid')) && /Desde noviembre/.test(await txt(p, '.dk-side')), 'first month: what came in less what went out, its share, and when the average takes its place');
    eq(await p.evaluate(() => [document.querySelectorAll('.dk-grp').length, [...document.querySelectorAll('.dk-gx .dk-grp-m')].map(e => e.textContent)]), [1, ['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr']], 'first month: the band has this month and the six to come as outlines');
    eq(await p.evaluate(() => [document.querySelector('#rep-balance h2').textContent, document.querySelector('#rep-balance .dk-pill').textContent]), ['Tu saldo neto, día a día', '+R$ 5.767 en octubre'], 'first month: the net balance day by day, and how far it moved');
    eq(await p.evaluate(() => { const r = [...document.querySelectorAll('#rep-vsplan-tbl tbody tr')].find(tr => /Suscripciones/.test(tr.textContent)); return r && [...r.querySelectorAll('td')].slice(1, 4).map(td => td.textContent.trim()); }),
      await p.evaluate(() => { const ym = '2026-10', pl = sum(linesLive(S, ym).filter(l => l.categoryId === 'suscripciones').map(l => planValue(S, l, ym))), n = v => fmt.money(v, null, { bare: true, round: true }); return ['233', n(pl), n(pl - 23320)]; }), 'first month: a category’s cost, what the plan gives it, and what is left of it');
    eq(await txt(p, '#rep-daily .dk-sub'), 'Lo que salió, sumado día a día, frente al plan', 'first month: the day by day does not promise a month before');
    eq(await p.evaluate(() => [...document.querySelectorAll('.dk-axl')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 12).length + document.querySelectorAll('.dk-chart text').length), 0, 'the charts’ words are HTML over the drawing, 12 px and up');
    await first(false);
    eq(await p.evaluate(() => [!!document.querySelector('.dk-side [data-a="quick-go"][data-v="income"]'), document.querySelectorAll('.dk-side .dk-split').length]), [true, 0], 'first month without income: the forest offers to add it');
    eq(await wide(p) <= 0, true, 'first month: nothing wider than the screen'); eq(o.errors, [], 'first month: no error'); await o.browser.close();
  }
  const ph = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, mobile: true, touch: true });
  for (const r of ['plan', 'goals', 'investments', 'reports', 'accounts']) { await go(ph.page, r); ok(await ph.page.evaluate(() => !document.querySelector('.dk-hero')), `a phone keeps its own ${r}`); }
  eq(ph.errors, [], 'phone: no error'); await ph.browser.close();
  done('qc-desk-pages');
})();
