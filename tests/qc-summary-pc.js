// QC of the computer's summary (owner, 2026-10-08: "I also want to order my summary tab on the computer, add the option; remove the KPI card 'Put
// into goals' and add 'Household net balance' first, with a white background maybe; put the insight of the day beside the days of freedom on the
// computer").
//   1. the figures: the household's net balance first, a tile like the others with its amount in green (owner, 2026-10-08: "I did not like the
//      white background, only the green letters"), the deep green on the light theme; its amount the household's accounts in reais today; no
//      "Put into goals"; its name whole at 1280 px; its second line says how much of it is in savings accounts (owner, 2026-10-09: "add a
//      button with two arrows to see the household's total savings, or is a separate card better?"), hidden by the eye too, opening Accounts;
//      with no savings account, "In your household accounts today";
//   2. (2026-10-11, at a glance: qc-dash-glance.js) three parts to a row, two on a narrower window: the days of freedom beside what can be spent
//      and what is due, as tall as them;
//   3. "Reorder the dashboard" beside the greeting opens a side panel with every part in its order (the ones waiting one click away too); an
//      arrow moves a part and the page follows at once; the accounts' cards and the latest transactions take the whole width;
//      the order is the computer's own (the phone's is left alone) and it is kept; "Original order" undoes it; Escape closes and the focus goes back;
//   4. the company's side: its own order, its button in its band, its runway beside the insight;
//   5. Spanish and Portuguese.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  await page.evaluate(() => navigate('dashboard'));
  // ---------- 1. the figures ----------
  const k = await page.evaluate(() => { const ks = [...document.querySelectorAll('#view .kpis .kpi')], n = ks[0], st = getComputedStyle(n), lab = n.querySelector('.label span');
    const net = personal().filter(a => a.currency === CUR).reduce((s, a) => s + accountBalance(S, a.id, S.today), 0);
    const o = getComputedStyle(ks[1]);
    return [ks.map(x => x.querySelector('.label span').innerText.trim()), n.querySelector('.value').innerText.trim() === fmt.money(net, CUR), st.backgroundColor === o.backgroundColor && st.borderTopColor === o.borderTopColor, getComputedStyle(n.querySelector('.value')).color, lab.scrollWidth <= lab.clientWidth + 1, n.querySelector('.delta').innerText.trim(), !!n.querySelector('.hint')]; });
  const savedLine = await page.evaluate(() => 'Of which ' + fmt.money(personal().filter(a => a.currency === CUR && a.type === 'savings').reduce((s, a) => s + accountBalance(S, a.id, S.today), 0), CUR, { trim: true }) + ' in savings');
  eq(k, [['Household net balance', 'Income', 'Spending', 'Left over', 'Still to pay'], true, true, 'rgb(62, 207, 142)', true, savedLine, true],
    'the net balance first: a tile like the others with its amount in green (owner: “no white background, only the green letters”), the household’s accounts in reais today, its name whole, with its (i); no “Put into goals”');
  ok(savedLine === 'Of which R$ 16.800 in savings', 'its second line: how much of it the savings accounts hold (Mercado Pago R$ 5.400 and Santander R$ 11.400)');
  await page.evaluate(() => { if (!numsHidden()) A['nums-toggle'](); });
  ok(await page.evaluate(() => /•••/.test(document.querySelector('.kpi.net .value').innerText) && /•••/.test(document.querySelector('.kpi.net .kpi-saved').innerText)), 'the eye hides it too, the savings with it');
  await page.evaluate(() => { if (numsHidden()) A['nums-toggle'](); });
  await page.click('.kpi.net .kpi-saved'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => UI.route), 'accounts', 'the savings line opens Accounts');
  eq(await page.evaluate(() => { const keep = S.accounts; S.accounts = S.accounts.filter(a => a.type !== 'savings'); navigate('dashboard'); const s = document.querySelector('.kpi.net .delta').innerText.trim(); S.accounts = keep; render(); return s; }),
    'In your household accounts today', 'with no savings account, the line it had');
  await page.evaluate(() => navigate('dashboard'));
  // ---------- 2. the days of freedom beside the insight ----------
  // 2026-10-11 (at a glance): at 1280 px three to a row; the days of freedom are the third part, beside To do, as tall as it
  const row = await page.evaluate(() => { const g = document.querySelector('#view .dash-grid'), r = document.querySelector('#runway-card').getBoundingClientRect(), d = document.querySelector('#todo').getBoundingClientRect(), f = document.querySelector('#free-card').getBoundingClientRect(), v = document.querySelector('#view .kpis').getBoundingClientRect();
    return [document.querySelector('#runway-card').parentElement === g, getComputedStyle(g).gridTemplateColumns.split(' ').length, Math.round(r.top) === Math.round(d.top), Math.round(r.height) === Math.round(d.height), d.right < r.left, Math.abs(f.left - v.left) < 2 && Math.abs(r.right - v.right) < 2]; });
  eq(row, [true, 3, true, true, true, true], '1280 px: three to a row; the days of freedom beside To do, as tall as it, the row as wide as the figures');
  // the days of freedom, lighter (owner, 2026-10-08: "on the computer the days of freedom card has too much information, it is very loaded")
  eq(await page.evaluate(() => { const c = document.querySelector('#runway-card'), say = c.querySelector('.rw-say'), lh = parseFloat(getComputedStyle(say).lineHeight) || 21, p = c.querySelector('.rw-fig .pill');
      return [!!c.querySelector('.rw.one'), !c.querySelector('.rw.two, .rw-basis'), say.getBoundingClientRect().height <= lh * 2.6, !!c.querySelector('.rw-fig .rw-e'), !p || (!!p.dataset.tip && !!p.querySelector('.sr')), !!c.querySelector('.rw-track'), !!c.querySelector('.rw-next'), c.querySelectorAll('.card-h .btn').length]; }),
    [true, true, true, true, true, true, true, 2], 'the days of freedom on a computer: one column, the figure with its 🎉 and a small sign of the month (its sentence in a tip and for screen readers), the goal in two lines at most, the track, the next goal; no figures it rests on (behind Adjust); What if…? and Adjust stay');
  // the insight of the day, redrawn (owner, 2026-10-08: "I don't like the design of the insight of the day on the computer, improve its UI")
  const ins = await page.evaluate(() => { const c = document.querySelector('#insight-card'), h = c.querySelector('.card-h'), b = c.querySelector('.card-b .grow b'), f = c.querySelector('.ins-foot'), cr = c.getBoundingClientRect(), pick = insightOfDay(B(), B().today, BCUR(), UI.insightSkip || 0), dots = [...c.querySelectorAll('.ins-dots i')];
    return [c.classList.contains('ins-pc'), !!h.querySelector('.fl-ico svg'), parseFloat(getComputedStyle(b).fontSize) >= 20, b.getBoundingClientRect().top - h.getBoundingClientRect().bottom < 40, !f || cr.bottom - f.getBoundingClientRect().bottom <= 32,
      !!c.querySelector('#insight-next svg'), /Another/.test(c.querySelector('#insight-next').getAttribute('aria-label')), dots.length === pick.count && dots.findIndex(d => d.classList.contains('on')) === pick.index, c.querySelector('.ins-mark').getAttribute('aria-hidden'), getComputedStyle(c.querySelector('.ins-mark')).pointerEvents]; });
  eq(ins, [true, true, true, true, true, true, true, true, 'true', 'none'], 'the insight of the day: its icon and name on top with “Another” (its arrows); the fact as the headline, just under them; what to do with it at the foot; dots for which of the day’s facts this is; its icon large and faint, out of the way');
  eq(await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#insight-card')); return [c.backgroundColor, c.borderTopColor]; }), ['rgb(19, 19, 19)', 'rgba(0, 0, 0, 0)'], 'the insight’s card: #131313 and no border (owner, 2026-10-08)');
  await page.click('#insight-next');
  eq(await page.evaluate(() => { const pick = insightOfDay(B(), B().today, BCUR(), UI.insightSkip || 0); return [...document.querySelectorAll('#insight-card .ins-dots i')].findIndex(d => d.classList.contains('on')) === pick.index && UI.insightSkip === 1; }), true, '“Another”: the next fact, and the dots follow');
  await page.evaluate(() => { UI.insightSkip = 0; render(); });
  // ---------- 3. the order ----------
  const btn = await page.evaluate(() => { const b = document.querySelector('#dash-order-btn'), h = document.querySelector('.hello'); return [!!b && h.contains(b), b && b.innerText.trim(), Math.abs(b.getBoundingClientRect().top + b.offsetHeight / 2 - (h.querySelector('h2').getBoundingClientRect().top + h.querySelector('h2').offsetHeight / 2)) < 4]; });
  eq(btn, [true, 'Reorder the dashboard', true], '“Reorder the dashboard” on the greeting’s line');
  const page0 = () => page.evaluate(() => [...document.querySelectorAll('#view #ac-card, #view #runway-card, #view #insight-card, #view #free-card, #view #todo, #view #goals-card, #view #cat-card, #view #trend-card, #view #fii-card, #view #recent-card, #view #planned-card')].map(e => e.id));
  const ids0 = await page0();
  await page.click('#dash-order-btn'); await page.waitForSelector('.drawer .d-order .ord-list');
  const lst = await page.evaluate(() => ({ names: [...document.querySelectorAll('.drawer .ord-list b')].map(b => b.innerText.trim()), shown: UI.dashShown.slice(), first: document.querySelector('.drawer .ord-list li .ord-btn[data-d="-1"]').disabled, last: [...document.querySelectorAll('.drawer .ord-list li')].pop().querySelector('[data-d="1"]').disabled, focus: document.activeElement.classList.contains('ord-btn'), kind: UI.drawer.kind, sheet: !!document.querySelector('.sheet') }));
  eq([lst.names.length === lst.shown.length, lst.names.slice(0, 3), lst.first, lst.last, lst.focus, lst.kind, lst.sheet], [true, ['You can spend', 'To do', 'Days of freedom'], true, true, true, 'dash-order', false], 'a side panel, not a sheet: every part in its order (the waiting ones too), the first one’s up and the last one’s down off, the focus on an arrow');
  // the goals to the top: they open the page at once
  for (let i = 0; i < 3; i++) await page.click('.drawer .ord-btn[data-id="goals"][data-d="-1"]');
  const after = await page.evaluate(() => [document.querySelector('#view .dash-grid').firstElementChild.id, S.user.dashOrder['home-pc'][0], !(S.user.dashOrder || {}).home, document.activeElement.dataset.id, document.activeElement.dataset.d, document.querySelector('.drawer .ord-list b').innerText.trim()]);
  eq(after, ['goals-card', 'goals', true, 'goals', '1', 'Goals'], 'up to the top: the goals open the page at once, the order kept for the computer (the phone’s untouched); at the top the focus moves to its other arrow');
  // the insight of the day one place down: it follows the part after it
  await page.click('.drawer .ord-btn[data-id="insight"][data-d="1"]');
  const order = await page.evaluate(() => [...document.querySelectorAll('#view .dash-grid > [id]')].map(e => e.id));
  ok(order.indexOf('insight-card') === order.length - 1 || order.indexOf('insight-card') > order.indexOf('cat-card'), 'one place down: the insight follows the part after it', order);
  // kept: drawn again, it keeps the order
  await page.evaluate(() => { A.close(); navigate('plan'); navigate('dashboard'); }); await page.waitForTimeout(250);
  eq(await page.evaluate(() => document.querySelector('#view .dash-grid').firstElementChild.id), 'goals-card', 'back on the page, the order is kept');
  await page.click('#dash-order-btn'); await page.waitForSelector('.drawer .d-order');
  await page.click('.drawer [data-a="dash-order-reset"]');
  eq(await page.evaluate(() => [!(S.user.dashOrder || {})['home-pc'], document.activeElement.dataset.a, !document.querySelector('.drawer [data-a="dash-order-reset"]')]), [true, 'dash-order-done', true], '“Original order” undoes it, and goes away; the focus on Done');
  eq(await page0(), ids0, 'the page as it was');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [!!UI.drawer, document.activeElement.id]), [false, 'dash-order-btn'], 'Escape closes it, and the focus goes back to its button');
  await page.click('#dash-order-btn'); await page.waitForSelector('.drawer .d-order'); await page.click('.drawer [data-a="dash-order-done"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [!!UI.drawer, document.activeElement.id]), [false, 'dash-order-btn'], 'Done the same');
  // the phone keeps its own order
  await page.evaluate(() => { S.user.dashOrder = { home: ['goals'] }; render(); });
  eq(await page.evaluate(() => document.querySelector('#view .dash-grid').firstElementChild.id), 'free-card', 'an order chosen on the phone does not move the computer’s page');
  await page.evaluate(() => { S.user.dashOrder = {}; render(); });
  // ---------- 4. the company ----------
  await page.evaluate(() => A.space({ v: 'business' })); await page.waitForTimeout(300);
  const co = await page.evaluate(() => { const b = document.querySelector('#dash-order-btn'), r = document.querySelector('#runway-card'), i = document.querySelector('#insight-card');
    return [!!b && !!b.closest('#co-band'), !!r && !!i && r.parentElement === i.parentElement && Math.round(r.getBoundingClientRect().top) === Math.round(i.getBoundingClientRect().top), document.querySelectorAll('.kpi.net').length]; });
  eq(co, [true, true, 0], 'the company: the button in its band, its runway beside the insight, its own figures (no household balance)');
  await page.click('#dash-order-btn'); await page.waitForSelector('.drawer .d-order');
  await page.click('.drawer .ord-btn[data-id="runway"][data-d="1"]');
  eq(await page.evaluate(() => [!!(S.user.dashOrder || {})['co-pc'], !(S.user.dashOrder || {})['home-pc']]), [true, true], 'its order is its own');
  await page.evaluate(() => { A.close(); A.space({ v: 'personal' }); });
  // ---------- the light theme ----------
  await page.evaluate(() => { S.settings.theme = 'light'; document.documentElement.classList.add('app-light'); render(); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => { const ks = document.querySelectorAll('.kpis .kpi'); return [getComputedStyle(ks[0]).backgroundColor === getComputedStyle(ks[1]).backgroundColor, getComputedStyle(ks[0].querySelector('.value')).color]; }), [true, 'rgb(0, 98, 57)'], 'light theme: the same tile, its amount in the deep green');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 5. Spanish and Portuguese ----------
  for (const [lang, want] of [['es', ['Saldo neto del hogar', 'Ordenar el resumen', 'Dato del día']], ['pt', ['Saldo líquido da casa', 'Ordenar o resumo', 'Destaque do dia']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } }));
    await page.evaluate(() => navigate('dashboard'));
    eq(await page.evaluate(() => [document.querySelector('.kpi.net .label span').innerText.trim(), document.querySelector('#dash-order-btn').innerText.trim(), document.querySelector('#insight-card h2').innerText.trim()]), want, `${lang}: in the language`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${lang}: nothing wider than the page`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-summary-pc');
})();
