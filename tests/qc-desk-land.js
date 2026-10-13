// QC of the summary's look on a computer (v199, owner, 2026-10-12: "push updates a la versión de ordenador", then "Todo, como el teléfono" and the
// side bar "Verde bosque"; css/look/look-land-desk.css, features/phone/bosque-desk.js).
//   1. the household on a computer wears it (the company's side and the previous look do not): the side bar and the top bar in the forest, the screen
//      in use a lime pill, the main button lime, the grey page rising under the bar with rounded corners (or under a screen's own forest top);
//   2. the summary (v201, the same day: "claramente se ve que es una versión agrandada de celular, no una versión web"): a dashboard's header on the
//      forest (greeting, net balance, "You can spend" at its right, the month's four figures side by side, a row of buttons), the computer's parts three
//      to a row under it, no hole at the end; on a narrower window the figures go under the balance, two by two;
//   3. its buttons work: a new expense has no keypad on a computer (its keyboard), the sentence to write it in one go is there; More is a menu
//      under its button, inside the window;
//   4. Transactions: a forest header (the switch, the figure, the month, the chart wide at their right) and the computer's table under it, whose
//      search the header follows as it is typed;
//   5. the panels wear the phone's colours (an account's panel on the forest); a contribution is slid into its goal and answered by its screen;
//   6. both themes: every text readable (4.5 to 1, 3 to 1 when large); nothing wider than the window at 1440 and 1024 px; the folded side bar; no way back beside the title; no error;
//   7. the computer's light or dark and the phone's are two choices: changing one leaves the other (v202).
const { open, ok, eq, done } = require('./pw.js');
const CONTRAST = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = el => { const chain = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; const c = parse(s.backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break; } }
    let c = { r: 255, g: 255, b: 255, a: 1 }; for (let i = chain.length - 1; i >= 0; i--) c = over(chain[i], c); return c; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const out = [];
  for (const el of document.querySelectorAll('#view *, .rail *, .topbar *')) {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
    const s = getComputedStyle(el), r = el.getBoundingClientRect(); if (!r.width || !r.height || s.visibility === 'hidden' || +s.opacity < .99 || el.closest('[aria-hidden="true"], .ins-mark, svg, .tour, #toast-root')) continue;
    const fg = parse(s.color), bg = bgOf(el); if (!fg || !bg) continue;
    const c = over(fg, bg), ratio = (Math.max(lum(c), lum(bg)) + .05) / (Math.min(lum(c), lum(bg)) + .05), big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && +s.fontWeight >= 600);
    if (ratio < (big ? 3 : 4.5) - .05) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${el.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
  }
  return [...new Set(out)];
};

(async () => {
  const pc = { lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } };
  let { browser, page, errors } = await open(pc);
  // v202 (owner: "el saludo en ordenador quítalo y muéstralo una sola vez cuando el usuario entra a la webapp"): coming in, the greeting over the balance
  eq(await page.evaluate(() => [!!document.querySelector('.bq-dhero #bq-hello h2'), /Good to see you/.test(document.getElementById('toast-root').innerText)]), [true, false], 'coming in, the summary greets the person over the balance (no strip at the foot)');
  await page.waitForTimeout(4900);
  eq(await page.evaluate(() => [!!document.querySelector('.bq-dhero .hello'), UI.hello]), [false, false], 'a few seconds later the greeting is gone');
  await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); render(); }); await page.waitForTimeout(300);
  const bg = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);

  // ---------- 1. the frame ----------
  eq(await page.evaluate(() => { const cs = s => getComputedStyle(document.querySelector(s)), on = document.querySelector('.rail .nav a[aria-current="page"]');
    return [document.documentElement.classList.contains('land'), cs('.rail').backgroundColor, cs('.topbar').backgroundColor, getComputedStyle(on).backgroundColor, getComputedStyle(on).color, cs('.topbar .btn.primary').backgroundColor, cs('.topbar .btn.primary').color, cs('.content').backgroundColor]; }),
    [true, 'rgb(17, 38, 34)', 'rgb(17, 38, 34)', 'rgb(182, 221, 98)', 'rgb(17, 38, 34)', 'rgb(182, 221, 98)', 'rgb(17, 38, 34)', 'rgb(233, 237, 236)'],
    'a computer, the household: the side bar and the top bar in the forest, the screen in use a lime pill, the main button lime, the page grey');
  await page.evaluate(() => navigate('recurring'));      // v203: the Plan, Goals, Investments, Reports and Accounts have their own top on the forest (qc-desk-pages.js)
  eq(await page.evaluate(() => { const a = getComputedStyle(document.querySelector('.topbar'), '::after'); return [a.display, a.borderTopLeftRadius, a.backgroundColor]; }), ['block', '30px', 'rgb(233, 237, 236)'], 'a screen without a top of its own: the grey page rises right under the bar, its corners round');
  await page.evaluate(() => navigate('dashboard'));
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('.topbar'), '::after').display, getComputedStyle(document.querySelector('.bq-dhero'), '::after').borderTopLeftRadius]), ['none', '30px'], 'the summary: the bar goes on into its forest top, which carries the rounded edge');
  await page.evaluate(() => A.space({ v: 'business' }));
  eq(await page.evaluate(() => document.documentElement.classList.contains('land')), false, 'the company’s side keeps its own look');
  await page.evaluate(() => { A.space({ v: 'personal' }); navigate('dashboard'); });

  // ---------- 2. the summary (v201: a web page's layout, not the phone's parts enlarged) ----------
  const sum = await page.evaluate(() => { const v = document.getElementById('view'), hero = v.querySelector('.bq-dhero'), r = el => el.getBoundingClientRect();
    const figs = [...hero.querySelectorAll('.bq-dkpis > .bq-dk')], tops = figs.map(f => Math.round(r(f).top)), grid = v.querySelector('.dash-grid'), cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;
    const bal = r(hero.querySelector('.bq-dbal')), free = r(hero.querySelector('.bq-dh-r'));
    return [!hero.querySelector('.hello'), !!hero.querySelector('.bq-dbal .bb-link b'), !!hero.querySelector('.bq-dh-r #free-card #free-open'), free.left > bal.right, figs.map(f => f.dataset.k).join(), new Set(tops).size,
      [...hero.querySelectorAll('.bq-dacts .bq-dact')].map(b => b.dataset.v || b.dataset.a).join(), !!hero.querySelector('.bq-dacts #dash-order-btn'), cols, !!v.querySelector('.dash-grid #runway-card'), !v.querySelector('#quick-acts, #ac-card, .bq-dgrid, #bq-moves-card')]; });
  eq(sum, [true, true, true, true, 'income,spending,left,unpaid', 1, 'expense,income,transfer,quick-more', true, 6, true, true],
    'the summary: a dashboard’s header on the forest (the net balance, no fixed greeting, “You can spend” at its right, the month’s four figures side by side, a row of buttons with “Reorder”), the computer’s parts three to a row under it; none of the phone’s parts');
  // v202 (owner: "trae de vuelta las tarjetas de por pagar como el celular… los bancos en círculos al lado izquierdo de ordenar resumen… las metas cada una en una tarjeta independiente")
  eq(await page.evaluate(() => { const v = document.getElementById('view'), r = el => el.getBoundingClientRect(), logos = [...v.querySelectorAll('.bq-dacts .bq-daccs .bq-acc')], order = r(v.querySelector('#dash-order-btn'));
    const bills = [...v.querySelectorAll('#todo .bq-bills .bq-bill')], rows = [...new Set(bills.map(b => Math.round(r(b).top)))], per = rows.map(y => bills.filter(b => Math.round(r(b).top) === y).length);
    const goals = [...v.querySelectorAll('#goals-card .bq-dgoal')], live = B().goals.filter(g => g.status === 'active' && !isYearly(g));
    return [logos.length === cardsOf(personal()).length, logos.every(l => r(l).right <= order.left && Math.abs((r(l).top + r(l).bottom) / 2 - (order.top + order.bottom) / 2) < 3), bills.length > 3, Math.max(...per) - Math.min(...per) <= 1,
      !v.querySelector('.dash-grid #todo, .dash-grid #goals-card'), goals.map(g => g.dataset.id).join() === live.map(g => g.id).join(), goals.every(g => !!g.querySelector('.bq-dgoal-n') && !!g.querySelector('.bq-dgoal-v b')), r(v.querySelector('#todo')).top < r(v.querySelector('#goals-card')).top]; }),
    [true, true, true, true, true, true, true, true], 'v202: the accounts’ round logos left of “Reorder”, on its line; what there is to pay as the phone’s cards in even rows across the page; each goal and fund its own card, in their order; both before the rest');
  eq(await page.evaluate(() => { const was = window.DORAX_BETA; window.DORAX_BETA = true; render(); const v = document.getElementById('view'), out = [walletOn(), !!v.querySelector('#ac-card, .wallet-sec, .w-card'), !!v.querySelector('.bq-daccs .bq-acc')]; window.DORAX_BETA = was; render(); return out; }),
    [true, false, true], 'v202 (owner: "quita esta sección también de resumen"): no accounts’ cards on the computer’s summary, even with the cards on; the accounts are the logos in the header');
  await page.click('#goals-card .bq-dgoal'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'goal-view', 'a goal’s card opens the goal');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.click('.bq-daccs .bq-acc'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'card-view', 'a bank’s logo opens its panel');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#insight-card')).backgroundColor, getComputedStyle(document.querySelector('#insight-card .grow b')).color]), ['rgb(17, 38, 34)', 'rgb(255, 255, 255)'], 'the insight of the day on the forest, its fact white');
  eq(await page.evaluate(() => { const v = document.getElementById('view'), more = v.querySelector(':scope > .dash-more'), last = [...v.querySelectorAll('.dash-grid > *')].pop(); const gr = Math.round(v.querySelector('.dash-grid').getBoundingClientRect().right); return [!more || Math.abs(Math.round(more.getBoundingClientRect().right) - gr) <= 1, Math.abs(Math.round(last.getBoundingClientRect().right) - gr) <= 1]; }), [true, true],
    'no hole at the end of the parts (a last row of two shares the width); “Also for the summary” on the page’s column');
  await page.click('.bq-dk[data-k="spending"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.k]), ['kpi', 'spending'], 'a figure of the header opens how it is worked out');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  for (const w of [1100, 1024]) {
    await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(250);
    eq(await page.evaluate(() => { const h = document.querySelector('.bq-dhero'), r = el => el.getBoundingClientRect(), k = r(h.querySelector('.bq-dkpis')), bal = h.querySelector('.bq-dbal .bb-link b');
      return [k.top >= r(h.querySelector('.bq-dh-r')).bottom - 1, [...h.querySelectorAll('.bq-dk b')].every(b => b.scrollWidth <= b.clientWidth + 1 && r(b).right <= k.right + 1), r(bal).height < 60]; }), [true, true, true], `${w} px: the four figures under the balance and “You can spend”, none of them cut, the balance on one line`);
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);

  // ---------- 3. its buttons ----------
  await page.click('.bq-dacts [data-v="expense"]'); await page.waitForSelector('#overlay .drawer');
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.pad, !!document.querySelector('#overlay .bq-pad'), document.getElementById('d-amount').getAttribute('inputmode'), !!document.getElementById('d-say'), getComputedStyle(document.querySelector('#overlay .drawer')).backgroundColor]),
    ['tx', false, false, 'decimal', true, 'rgb(233, 237, 236)'], 'a new expense on a computer: no keypad (its keyboard types the amount), the sentence to write it in one go, the panel in the page’s grey');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.click('.bq-dacts [data-a="quick-more"]'); await page.waitForSelector('#overlay .bq-more-sheet');
  eq(await page.evaluate(() => { const m = document.querySelector('#overlay .bq-more-sheet'), b = document.querySelector('.bq-dacts [data-a="quick-more"]').getBoundingClientRect(), r = m.getBoundingClientRect(), sc = getComputedStyle(document.querySelector('#overlay .scrim'));
    return [Math.abs(r.left - b.left) <= 1, r.top >= b.bottom && r.top - b.bottom <= 12, Math.round(r.width), r.bottom <= innerHeight, sc.backgroundColor, m.querySelectorAll('.g-pick-list button').length > 3, [...m.querySelectorAll('.g-pick-list button')].every(x => Math.round(x.getBoundingClientRect().height) === 52), document.activeElement.closest('.bq-more-sheet') !== null]; }),
    [true, true, 340, true, 'rgba(0, 0, 0, 0)', true, true, true], 'More on a computer: a menu under its button (not the phone’s sheet at the foot of the screen), the page not dimmed, its rows even, the focus in it');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.sheet, document.activeElement.dataset.a]), [false, 'quick-more'], 'Escape closes it, the focus back on More');
  await page.setViewportSize({ width: 1024, height: 640 }); await page.waitForTimeout(300);
  await page.click('.bq-dacts [data-a="quick-more"]'); await page.waitForSelector('#overlay .bq-more-sheet');
  eq(await page.evaluate(() => { const r = document.querySelector('#overlay .bq-more-sheet').getBoundingClientRect(); return [r.top >= 0, r.bottom <= innerHeight]; }), [true, true], 'a short window: the menu opens over its button, inside the window');
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(250);

  // ---------- 4. Transactions: a forest header, the computer's table ----------
  await page.evaluate(() => navigate('transactions')); await page.waitForTimeout(200);
  eq(await page.evaluate(() => { const top = document.querySelector('#view > .bq-dtx'), card = document.getElementById('tx-card'), r = el => el.getBoundingClientRect(), svg = top.querySelector('.bq-chart svg');
    return [getComputedStyle(top).backgroundColor, !!top.querySelector('.bq-kind'), !!top.querySelector('.bq-sum-v'), !!svg && r(svg).left > r(top.querySelector('.bq-dtx-l')).right, !!card && !!card.querySelector('#tx-q') && !!card.querySelector('#tx-filters-btn') && !!card.querySelector('table'), !document.querySelector('.bq-txtop, .bq-txsheet, .topbar .bq-tool'), Math.round(r(card).width) > 1000]; }),
    ['rgb(17, 38, 34)', true, true, true, true, true, true], 'Transactions on a computer: the switch, the figure and the month on the forest with the chart wide at their right; under it the computer’s table with its search and filters, the page’s width');
  eq(await page.evaluate(() => { const c = document.querySelector('#tx-card .fchips'), chip = c && c.querySelector('.fchip'); return c ? [parseFloat(getComputedStyle(c).paddingLeft) >= 16, Math.round(chip.getBoundingClientRect().height) <= 40] : [true, true]; }), [true, true], 'the filters applied sit inside the card, as the table’s rows (the phone’s pills stay on the phone)');
  const before = await page.evaluate(() => document.querySelector('#bq-dtx .bq-sum-v').textContent);
  await page.fill('#tx-q', 'Assa'); await page.waitForTimeout(300);
  eq(await page.evaluate(b => [UI.tx.q, document.querySelectorAll('#tx-list tbody tr').length > 0, [...document.querySelectorAll('#tx-list tbody tr')].every(tr => /assa/i.test(tr.textContent)), document.querySelector('#bq-dtx .bq-sum-v').textContent !== b, document.activeElement.id], before), ['Assa', true, true, true, 'tx-q'],
    'the search finds as it is typed; the header’s figure follows it; the focus stays in the search');
  await page.evaluate(() => { UI.tx.q = ''; render(); });
  await page.click('.bq-kind [data-v="income"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.tx.type, document.activeElement.dataset.v]), ['income', 'income'], 'the switch filters the table, the focus stays on it');
  await page.evaluate(() => { UI.tx.type = 'expense'; render(); });

  // ---------- 5. the panels ----------
  await page.evaluate(() => A['card-view']({ id: personal()[0].id })); await page.waitForSelector('#overlay .drawer .cv');
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#overlay .drawer')).backgroundColor, [...document.querySelectorAll('#overlay .bq-cv-acts .btn')].map(b => getComputedStyle(b).borderRadius)[0]]), ['rgb(17, 38, 34)', '999px'], 'an account’s panel on the forest, its buttons pills');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(200);
  await page.click('#free-open'); await page.waitForSelector('#overlay .bq-sheet');
  ok(await page.evaluate(() => { const sh = document.querySelector('#overlay .bq-sheet'), dr = sh.closest('.drawer, .sheet'); return Math.abs(sh.getBoundingClientRect().left - dr.getBoundingClientRect().left) <= 1 && Math.abs(sh.getBoundingClientRect().right - dr.getBoundingClientRect().right) <= 1; }), '“You can spend”: the grey sheet as wide as its panel');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.evaluate(() => A['goal-move']({ id: B().goals.find(g => g.kind === 'goal' && g.status === 'active').id, dir: 'in' })); await page.waitForTimeout(200);
  await page.fill('#m-amount', '10'); await page.focus('#gw-knob'); await page.keyboard.press('Enter'); await page.waitForSelector('#overlay .gw-win');
  eq(await page.evaluate(() => { const w = document.querySelector('.gw-in').getBoundingClientRect(), f = document.querySelector('.gw-win').getBoundingClientRect(); return [UI.sheet, w.width <= 421, Math.abs((w.left + w.right) / 2 - (f.left + f.right) / 2) < 2]; }), ['goal-win', true, true], 'a contribution slid into its goal on a computer too; its success screen’s words in a column in the middle');
  await page.click('#overlay [data-a="gw-done"]'); await page.waitForTimeout(300);

  // ---------- 6. both themes, the width, the folded side bar ----------
  for (const theme of ['light', 'dark']) {
    const bad = [];
    await page.evaluate(th => { S.settings.theme = S.settings.themePhone = th; render(); }, theme);
    for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'reports', 'accounts', 'investments', 'settings']) { await page.evaluate(r => navigate(r), r); await page.waitForTimeout(450); for (const f of await page.evaluate(CONTRAST)) bad.push(`${r}: ${f}`); }
    eq(bad, [], `${theme}: every text of the frame and the screens readable (4.5 to 1; 3 to 1 when large)`);
  }
  eq(await page.evaluate(() => [document.documentElement.classList.contains('land-dark'), getComputedStyle(document.querySelector('.content')).backgroundColor, getComputedStyle(document.querySelector('.rail')).backgroundColor]), [true, 'rgb(11, 20, 18)', 'rgb(17, 38, 34)'], 'dark: the look’s dark version, the side bar the same forest');
  for (const w of [1440, 1024]) {
    await page.setViewportSize({ width: w, height: 800 });
    const wide = [];
    for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'investments', 'reports', 'accounts']) { await page.evaluate(r => navigate(r), r); await page.waitForTimeout(250); if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) wide.push(r); }
    eq(wide, [], `${w} px: nothing wider than the window`);
  }
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(250);
  ok(await page.evaluate(() => !document.querySelector('#back-pc, .topbar [data-a="back"]')), 'v202: no way back beside the screen’s name (owner: “el botón de dar atrás es el de la foto”)');
  await page.click('#rail-toggle'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => [document.querySelector('.app').classList.contains('rail-shut'), Math.round(document.querySelector('.rail').getBoundingClientRect().width), getComputedStyle(document.querySelector('.rail .nav a[aria-current="page"]')).backgroundColor]), [true, 68, 'rgb(182, 221, 98)'], 'the side bar folded: 68 px, the screen in use still lime');
  // ---------- 7. the computer's theme and the phone's apart (v202, owner: "desenlaza la PC del móvil en cuanto a light/dark theme") ----------
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
  await page.evaluate(() => { S.settings.theme = 'light'; delete S.settings.themePhone; render(); });      // an account from before: one choice for both
  await page.evaluate(() => A['theme-set']({ v: 'dark' })); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [S.settings.theme, S.settings.themePhone, document.documentElement.classList.contains('app-light')]), ['dark', 'light', false], 'the computer turned dark: the phone keeps the light it had');
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  eq(await page.evaluate(() => [themeChoice(), document.documentElement.classList.contains('app-light')]), ['light', true], 'the phone’s layout: its own choice, light');
  await page.evaluate(() => A['theme-set']({ v: 'dark' })); await page.waitForTimeout(150);
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400);
  await page.evaluate(() => A['theme-set']({ v: 'light' })); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [S.settings.theme, S.settings.themePhone, themeChoice(), document.documentElement.classList.contains('app-light')]), ['light', 'dark', 'light', true], 'each side changes only its own: the computer light, the phone dark');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- the previous look ----------
  ({ browser, page, errors } = await open({ ...pc, oldLook: true }));
  eq(await page.evaluate(() => [document.documentElement.classList.contains('land'), !!document.querySelector('#view .kpis')]), [false, true], 'the previous look (tests/pw.js: oldLook) keeps its summary');
  await browser.close();
  done('qc-desk-land');
})();
