// QC of the simpler dashboard on a phone (owner, 2026-10-08: "11 - remove the KPI cards above the insight of the day; give the button that changes
// the date, beside the tabs' headings, the colour #282828. 12 - make the savings and goals rows tappable, opening that goal's details; the same for
// fixed costs: a tap on fixed costs opens a list of them, and a tap on one opens its details. 13 - simplify the months-of-freedom card").
//   1. no month's figures on a phone's dashboard, on either side, nor in the list that orders it; a computer keeps them;
//   2. the month's button is #282828 with white words on the dark theme, light grey on the light one; a computer's is as it was;
//   3. Savings & goals: each goal is a button that opens its details, the funds' line opens the list of funds, and each fund its details;
//   4. "Your month, as planned": Fixed costs and Savings and goals open their list, each line its details; the list is the month's fixed costs and
//      adds up to the figure; it opens at its top; the third line keeps its figures in the same columns;
//   5. the days of freedom: one thing to tap with its name, the figure, a small sign, the track and the next mark; the sentence, the figures it
//      rests on, the explanation, What if…? and Adjust are in its details; the company's side alike; with nothing to show, its own button only;
//   6. thumb sizes, no sideways scroll; Spanish and Portuguese on the narrowest phone.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  // ---------- 1. no figures ----------
  eq(await page.evaluate(() => [!!document.querySelector('#view .kpis'), document.querySelector('.quick-row').nextElementSibling.id, dashOrder('home').includes('figures')]), [false, 'insight-card', false],
    'household: no row of figures; the quick things to do are followed by the day’s insight; the figures are not a part to order');
  await page.click('#dash-order-btn');
  ok(await page.evaluate(() => ![...document.querySelectorAll('.d-order .ord-list b')].some(b => /figures/i.test(b.innerText))), 'the list that orders the page does not offer them');
  await page.evaluate(() => { A.close(); A.space({ v: 'business' }); });
  eq(await page.evaluate(() => [!!document.querySelector('#view .kpis'), document.querySelector('.quick-row').nextElementSibling.id]), [false, 'insight-card'], 'company: no row of figures either');
  await page.evaluate(() => A.space({ v: 'personal' }));
  // ---------- 2. the month's button ----------
  for (const r of ['dashboard', 'plan', 'goals']) {
    await page.evaluate(r => navigate(r), r);
    // since 2026-10-08 (owner: "use 100% of the space, background #000000, border #1A1A1A, the date in green, no divider under it"): features/phone/phone.month.js
    eq(await page.evaluate(() => { const m = document.querySelector('.pagehead .month'), cs = getComputedStyle(m), ph = document.querySelector('.pagehead'), pr = ph.getBoundingClientRect(), mr = m.getBoundingClientRect();
        return [cs.backgroundColor, cs.borderTopColor, getComputedStyle(m.querySelector('.m-slide.on')).color, [...m.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 38), (jb => jb ? Math.round(jb.right) === Math.round(pr.right - 16) && mr.right <= jb.left - 6 : Math.round(mr.width) === Math.round(pr.width - 32))(ph.querySelector('.jr-btn') && ph.querySelector('.jr-btn').getBoundingClientRect()), getComputedStyle(ph).borderBottomWidth]; }),
      ['rgb(0, 0, 0)', 'rgb(26, 26, 26)', 'rgb(93, 187, 139)', true, true, '0px'], `${r}: the month takes the whole row (on the summary, up to the Journey button, v130), black with a #1A1A1A edge, the month in green, its arrows a thumb high; no line under it`);
  }
  // the same grey for the circles of the quick things to do, and 14 px more around the title (owner, 2026-10-08)
  await page.evaluate(() => navigate('dashboard'));
  eq(await page.evaluate(() => { const i = [...document.querySelectorAll('.quick-row .fl-ico')], ph = getComputedStyle(document.querySelector('.pagehead')); return [i.length > 4 && i.every(x => getComputedStyle(x).backgroundColor === 'rgb(14, 14, 14)' && getComputedStyle(x).borderTopColor === 'rgb(14, 14, 14)'), getComputedStyle(i[0]).color, Math.round(i[0].getBoundingClientRect().width), Math.round(i[0].querySelector('svg').getBoundingClientRect().width), ph.marginTop, ph.marginBottom, getComputedStyle(document.querySelector('.ins-ar')).color, getComputedStyle(document.querySelector('.ins-say')).color]; }),
    [true, 'rgb(255, 255, 255)', 62, 28, '4px', '14px', 'rgb(93, 187, 139)', 'rgb(180, 180, 180)'], 'the quick things to do sit in #0E0E0E circles of 62 px (owner, 2026-10-08), their icons white and 28 px (owner, 2026-10-08: "bigger and white"); the day’s facts in the quiet grey, their arrow green (owner, same day); the month’s row has 14 px under it');
  await page.evaluate(() => navigate('settings'));
  eq(await page.evaluate(() => [!!document.querySelector('.navbar .bar-name'), !document.querySelector('.navbar .bar-who'), document.querySelector('.pagehead h1').getBoundingClientRect().width <= 1, Math.round(document.querySelector('.pagehead').getBoundingClientRect().height)]), [true, true, true, 16], 'a screen with no month: its name in the panel (owner, 2026-10-10), no large title under it, only 16 px of air before the first card');
  await page.evaluate(() => navigate('dashboard'));
  await page.evaluate(() => { S.settings.theme = 'light'; render(); });
  eq(await page.evaluate(() => { const m = document.querySelector('.pagehead .month'); return [document.documentElement.classList.contains('app-light'), getComputedStyle(m).backgroundColor !== 'rgb(0, 0, 0)', getComputedStyle(m.querySelector('.m-slide.on')).color]; }), [true, true, 'rgb(0, 98, 57)'],
    'the light theme keeps a light button, the month in the deep green');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.quick-row .fl-ico')).backgroundColor !== 'rgb(14, 14, 14)'), 'and light circles');
  await page.evaluate(() => { S.settings.theme = 'dark'; navigate('dashboard'); });
  // ---------- 3. Savings & goals ----------
  const g = await page.evaluate(() => { const c = document.querySelector('#goals-card'), rows = [...c.querySelectorAll('button.budget[data-a="goal-open"]')], want = B().goals.filter(x => x.status === 'active' && x.kind === 'goal').slice(0, 3);
    return [rows.map(r => r.dataset.id).join() === want.map(x => x.id).join(), rows.every(r => !!r.querySelector('svg') && r.getBoundingClientRect().height >= 44), !!c.querySelector('button.budget.funds[data-a="goal-list"]'), c.querySelectorAll('div.budget').length]; });
  eq(g, [true, true, true, 0], 'each goal of the card is a button with a chevron, a thumb high; the funds’ line too');
  const gid = await page.evaluate(() => document.querySelector('#goals-card button.budget').dataset.id);
  await page.click('#goals-card button.budget');
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.id]), ['goal-view', gid], 'a tap on a goal opens its details');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.click('#goals-card button.budget.funds');
  const funds = await page.evaluate(() => { const s = document.querySelector('.sheet.s-list'); return [s.getAttribute('role'), s.querySelector('h2').innerText.trim(), [...s.querySelectorAll('[data-a="list-goal"]')].map(b => b.dataset.id).join() === B().goals.filter(x => x.status === 'active' && x.kind !== 'goal').map(x => x.id).join(), s.querySelector('.s-foot a').getAttribute('href'), document.activeElement.dataset.a]; });
  eq(funds, ['dialog', await page.evaluate(() => tn(B().goals.filter(x => x.status === 'active' && x.kind !== 'goal').length, '{n} fund', '{n} funds')), true, '#goals', 'list-goal'], 'the funds’ line opens the list of funds, with a way to Goals; the focus is on its first line');
  const fid = await page.evaluate(() => document.querySelector('.s-list [data-a="list-goal"]').dataset.id);
  await page.click('.s-list [data-a="list-goal"]');
  eq(await page.evaluate(() => [UI.sheet, UI.drawer.kind, UI.drawer.id, !!document.activeElement.closest('.drawer')]), [false, 'goal-view', fid, true], 'a fund of the list opens its details, in place of the list, with the focus in them');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  // ---------- 4. "Your month, as planned" (before the first transaction) ----------
  await page.evaluate(() => { window.__tx = S.transactions; S.transactions = []; render(); });
  const pm = await page.evaluate(() => { const c = document.querySelector('#planned-month'), rows = [...c.querySelectorAll('.legend-row')], right = rows.map(r => Math.round(r.querySelector('.num').getBoundingClientRect().right));
    return [rows.map(r => r.tagName + ':' + (r.dataset.a || '')), new Set(right).size, rows.every(r => r.getBoundingClientRect().height >= 44)]; });
  eq(pm, [['BUTTON:fixed-list', 'BUTTON:goal-list', 'DIV:'], 1, true], 'Fixed costs and Savings and goals are buttons, Not assigned yet is not; the three amounts end at the same edge; each line a thumb high');
  await page.click('#planned-month [data-a="fixed-list"]');
  const fl = await page.evaluate(() => { const s = document.querySelector('.sheet.s-list'), ym = B().month, xs = planProgress(B(), ym, BCUR(), B().today).filter(p => p.planned > 0), btns = [...s.querySelectorAll('[data-a="list-line"]')];
    return [s.querySelector('h2').innerText.trim(), btns.length === xs.length && btns.every(b => xs.some(p => p.id === b.dataset.id)), sum(xs.map(p => p.planned)) === planTotals(B(), ym).expenses, s.scrollTop, document.activeElement === btns[0], btns.every(b => b.getBoundingClientRect().height >= 56), s.querySelector('.s-foot a').getAttribute('href')]; });
  eq(fl, [await page.evaluate(() => t('Fixed costs, {month}', { month: fmt.month(B().month) })), true, true, 0, true, true, '#plan'],
    'Fixed costs opens the month’s fixed costs, which add up to the figure on the card; the list opens at its top with the focus on its first line; a way to Plan');
  const lid = await page.evaluate(() => document.querySelector('.s-list [data-a="list-line"]').dataset.id);
  await page.click('.s-list [data-a="list-line"]');
  eq(await page.evaluate(() => [UI.sheet, UI.drawer.kind, UI.drawer.id, UI.drawer.ym, !!document.activeElement.closest('.drawer')]), [false, 'line-view', lid, await page.evaluate(() => B().month), true], 'a fixed cost opens its details for that month, with the focus in them');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.click('#planned-month [data-a="goal-list"]');
  eq(await page.evaluate(() => [document.querySelector('.s-list h2').innerText.trim(), document.querySelectorAll('.s-list [data-a="list-goal"]').length === B().goals.filter(x => x.status === 'active').length]), ['Goals', true], 'Savings and goals opens every goal and fund');
  await page.click('.s-list [data-a="list-goal"]');
  eq(await page.evaluate(() => UI.drawer.kind), 'goal-view', 'and each one its details');
  await page.evaluate(() => { A.close(); S.transactions = window.__tx; render(); }); await page.waitForTimeout(250);
  // ---------- 5. the days of freedom ----------
  const rw = await page.evaluate(() => { const c = document.querySelector('#runway-card'), b = c.querySelector('#runway-open');
    return [b && b.tagName, b && b.dataset.a, b.querySelector('.rw-h b').innerText.trim(), !!b.querySelector('.rw-n'), !!b.querySelector('.rw-track'), !!b.querySelector('.rw-next'), !!c.querySelector('.rw-say, .rw-basis, [data-a="whatif"], [data-a="runway-edit"], .info'), [...c.querySelectorAll('.rw-seg .lbl')].every(l => getComputedStyle(l).display === 'none'), Math.round(c.getBoundingClientRect().height) < 230]; });
  eq(rw, ['BUTTON', 'runway-view', 'Days of freedom', true, true, true, false, true, true], 'the card is one thing to tap: its name, the figure, the track and the next mark; no sentence, no figures behind it, no buttons; under 230 px high');
  eq(await page.evaluate(() => { const c = document.querySelector('#runway-card'), u = c.querySelector('.rw-u').getBoundingClientRect(), e = c.querySelector('.rw-e'), p = c.querySelector('.rw-fig .pill');
    return [!!e, e && e.getBoundingClientRect().left - u.right < 16, !p || p.getBoundingClientRect().left > e.getBoundingClientRect().right, /^Next goal: /.test(c.querySelector('.rw-next').innerText)]; }), [true, true, true, true], 'a goal passed: the 🎉 right after the figure’s words, the month’s change at the end of the line; the next goal and what reaches it');
  const fig = await page.evaluate(() => document.querySelector('#runway-card .rw-n').innerText.trim());
  await page.click('#runway-open');
  const dv = await page.evaluate(() => { const d = document.querySelector('.drawer'); return [UI.drawer.kind, d.querySelector('header h2, header b, header').innerText.trim().split('\n')[0], d.querySelector('.rw-n').innerText.trim(), !!d.querySelector('.rw-say'), !!d.querySelector('.rw-basis'), d.querySelector('.body > .note').innerText.length > 100, [...d.querySelectorAll('footer button')].map(b => b.dataset.a), !!document.querySelector('[id="runway-card"] ~ [id="runway-card"]') || document.querySelectorAll('#runway-card').length]; });
  eq(dv, ['runway-view', 'Days of freedom', fig, true, true, true, ['whatif', 'runway-edit'], 1], 'its details: the same figure, the sentence, what it rests on, how it is worked out, and What if…? and Adjust');
  await page.click('.drawer footer [data-a="whatif"]'); eq(await page.evaluate(() => UI.drawer.kind), 'whatif', 'What if…? opens');
  await page.evaluate(() => A['runway-view']()); await page.click('.drawer footer [data-a="runway-edit"]'); eq(await page.evaluate(() => UI.drawer.kind), 'runway', 'Adjust opens');
  // the company's runway counts what it keeps (2026-10-09: savings only): a reserve account gives it a figure
  await page.evaluate(() => { A.close(); S.accounts.push({ id: 'co-res', name: 'Reserve', institution: 'Nubank', type: 'savings', currency: 'BRL', scope: 'business', purpose: '', opening: 1000000 }); A.space({ v: 'business' }); }); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [!!document.querySelector('#runway-open'), (document.querySelector('#runway-open .rw-h b') || {}).innerText]), [true, 'Company runway'], 'the company’s side has the same short card');
  await page.evaluate(() => A.space({ v: 'personal' }));
  eq(await page.evaluate(() => { const keep = [S.transactions, S.plan.lines, S.user.spend]; S.transactions = []; S.plan.lines = []; delete S.user.spend; render(); const r = runway(S, S.today, CUR), c = document.querySelector('#runway-card');
      const out = [r.days, !!c.querySelector('#runway-open'), !!c.querySelector('.card-h [data-a="whatif"], .card-h [data-a="runway-edit"]'), !!c.querySelector('.card-b [data-a="runway-edit"]')]; [S.transactions, S.plan.lines] = keep; if (keep[2]) S.user.spend = keep[2]; render(); return out; }),
    [null, false, false, true], 'with nothing to measure yet, the card keeps its own button to start, and no What if…? or Adjust in its title');
  eq(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, 'no sideways scroll');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- a computer: as it was ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  eq(await page.evaluate(() => [!!document.querySelector('#view .kpis'), getComputedStyle(document.querySelector('.topbar .month')).backgroundColor !== 'rgb(40, 40, 40)', !!document.querySelector('#runway-card .card-h [data-a="whatif"]'), !!document.querySelector('#runway-open'), document.querySelectorAll('#goals-card button.budget').length, document.querySelectorAll('#goals-card div.budget').length > 0]),
    [true, true, true, false, 0, true], 'a computer keeps its figures, its month’s button, its days-of-freedom card with its buttons, and the goals as lines');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 6. Spanish and Portuguese on the narrowest phone ----------
  for (const [lang, w, want] of [['es', 390, ['Días de libertad', 'Ver', 'Gastos fijos de Octubre 2026']], ['pt', 320, ['Dias de liberdade', 'Ver', 'Gastos fixos de Outubro 2026']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.evaluate(() => { S.transactions = []; render(); });
    await page.click('#planned-month [data-a="fixed-list"]');
    eq(await page.evaluate(() => [document.querySelector('#runway-open .rw-h b').innerText.trim(), document.querySelector('#runway-open .rw-see').innerText.trim(), document.querySelector('.s-list h2').innerText.trim()]), want, `${lang}: in the language`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.s-list .g-pick-list button')].every(b => b.scrollWidth <= b.clientWidth + 1) && (r => r.right <= innerWidth)(document.querySelector('#runway-open .rw-next').getBoundingClientRect())), `${lang} at ${w} px: everything fits, no sideways scroll`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-summary-simple');
})();
