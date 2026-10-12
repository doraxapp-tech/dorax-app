// QC of the summary's look on a computer (v199, owner, 2026-10-12: "push updates a la versión de ordenador", then "Todo, como el teléfono" and the
// side bar "Verde bosque"; css/look/look-land-desk.css, features/phone/bosque-desk.js).
//   1. the household on a computer wears it (the company's side and the previous look do not): the side bar and the top bar in the forest, the screen
//      in use a lime pill, the main button lime, the grey page rising under the bar with rounded corners (or under a screen's own forest top);
//   2. the summary: the greeting, the net balance and "You can spend" on the forest; two columns: the four buttons, the accounts, what there is to pay
//      and the month's spending (its chart as wide as its card) on the left, the days of freedom, the goals and the insight on the right;
//   3. its buttons work: a new expense has no keypad on a computer (its keyboard), the sentence to write it in one go is there;
//   4. Transactions: the search always open with the filters beside it, the switch, the figure and the chart on the forest, the list in its column;
//   5. the panels wear the phone's colours (an account's panel on the forest); a contribution is slid into its goal and answered by its screen;
//   6. both themes: every text readable (4.5 to 1, 3 to 1 when large); nothing wider than the window at 1440 and 1024 px; the folded side bar; no error.
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
  await page.evaluate(() => { S.user.greeted = true; S.settings.theme = 'light'; navigate('dashboard'); render(); }); await page.waitForTimeout(300);
  const bg = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);

  // ---------- 1. the frame ----------
  eq(await page.evaluate(() => { const cs = s => getComputedStyle(document.querySelector(s)), on = document.querySelector('.rail .nav a[aria-current="page"]');
    return [document.documentElement.classList.contains('land'), cs('.rail').backgroundColor, cs('.topbar').backgroundColor, getComputedStyle(on).backgroundColor, getComputedStyle(on).color, cs('.topbar .btn.primary').backgroundColor, cs('.topbar .btn.primary').color, cs('.content').backgroundColor]; }),
    [true, 'rgb(17, 38, 34)', 'rgb(17, 38, 34)', 'rgb(182, 221, 98)', 'rgb(17, 38, 34)', 'rgb(182, 221, 98)', 'rgb(17, 38, 34)', 'rgb(233, 237, 236)'],
    'a computer, the household: the side bar and the top bar in the forest, the screen in use a lime pill, the main button lime, the page grey');
  await page.evaluate(() => navigate('plan'));
  eq(await page.evaluate(() => { const a = getComputedStyle(document.querySelector('.topbar'), '::after'); return [a.display, a.borderTopLeftRadius, a.backgroundColor]; }), ['block', '30px', 'rgb(233, 237, 236)'], 'a screen without a top of its own: the grey page rises right under the bar, its corners round');
  await page.evaluate(() => navigate('dashboard'));
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('.topbar'), '::after').display, getComputedStyle(document.querySelector('.bq-dhero'), '::after').borderTopLeftRadius]), ['none', '30px'], 'the summary: the bar goes on into its forest top, which carries the rounded edge');
  await page.evaluate(() => A.space({ v: 'business' }));
  eq(await page.evaluate(() => document.documentElement.classList.contains('land')), false, 'the company’s side keeps its own look');
  await page.evaluate(() => { A.space({ v: 'personal' }); navigate('dashboard'); });

  // ---------- 2. the summary ----------
  const sum = await page.evaluate(() => { const v = document.getElementById('view'), hero = v.querySelector('.bq-dhero'), cols = [...v.querySelectorAll('.bq-dgrid > .bq-dcol')], ids = c => [...c.children].map(e => e.id || e.className.split(' ')[0]);
    const card = document.querySelector('#bq-moves-card .bq-mv'), svg = card && card.querySelector('.bq-chart svg'), vb = svg ? +svg.getAttribute('viewBox').split(' ')[2] : 0;
    return [!!hero.querySelector('.hello h2'), !!hero.querySelector('.bq-dbal .bb-link b'), !!hero.querySelector('.bq-dh-r #free-card #free-open'), cols.length, ids(cols[0]), ids(cols[1]).map(s => s.replace(/^bq-pair$/, 'pair')), cols[0].getBoundingClientRect().right < cols[1].getBoundingClientRect().left, Math.abs(vb - card.getBoundingClientRect().width) < 48, !document.querySelector('#dash-order-btn')]; });
  eq(sum, [true, true, true, 2, ['quick-acts', 'ac-card', 'todo', 'bq-moves-card'], ['pair', 'insight-card'], true, true, true],
    'the summary: the greeting, the net balance and “You can spend” on the forest; the four buttons, the accounts, what there is to pay and the month’s spending on the left, the days of freedom with the goals and the insight on the right; its chart drawn as wide as its card; no “Reorder”');
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#insight-card')).backgroundColor, getComputedStyle(document.querySelector('#insight-card .grow b')).color]), ['rgb(17, 38, 34)', 'rgb(255, 255, 255)'], 'the insight of the day on the forest, its fact white');

  // ---------- 3. its buttons ----------
  await page.click('#quick-acts [data-v="expense"]'); await page.waitForSelector('#overlay .drawer');
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.pad, !!document.querySelector('#overlay .bq-pad'), document.getElementById('d-amount').getAttribute('inputmode'), !!document.getElementById('d-say'), getComputedStyle(document.querySelector('#overlay .drawer')).backgroundColor]),
    ['tx', false, false, 'decimal', true, 'rgb(233, 237, 236)'], 'a new expense on a computer: no keypad (its keyboard types the amount), the sentence to write it in one go, the panel in the page’s grey');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);

  // ---------- 4. Transactions ----------
  await page.evaluate(() => navigate('transactions')); await page.waitForTimeout(200);
  eq(await page.evaluate(() => { const top = document.querySelector('.bq-txtop'), q = document.getElementById('tx-q'), list = document.querySelector('.bq-txsheet #tx-list');
    return [getComputedStyle(top).backgroundColor, !!q && top.contains(q), !!top.querySelector('#tx-filters-btn'), !!top.querySelector('.bq-kind'), !!top.querySelector('.bq-chart svg'), Math.round(list.getBoundingClientRect().width) <= 920, !document.querySelector('.topbar .bq-tool')]; }),
    ['rgb(17, 38, 34)', true, true, true, true, true, true], 'Transactions on a computer: the search always open, the filters beside it, the switch and the chart on the forest; the list in a column of its own width');
  await page.fill('#tx-q', 'Assa'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.tx.q, document.querySelectorAll('#tx-list .bq-op').length > 0, [...document.querySelectorAll('#tx-list .bq-op-t b')].every(b => /assa/i.test(b.textContent))]), ['Assa', true, true], 'the search finds as it is typed');
  await page.evaluate(() => { UI.tx.q = ''; render(); });

  // ---------- 5. the panels ----------
  await page.evaluate(() => navigate('dashboard')); await page.click('#ac-card .bq-acc'); await page.waitForSelector('#overlay .drawer .cv');
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#overlay .drawer')).backgroundColor, [...document.querySelectorAll('#overlay .bq-cv-acts .btn')].map(b => getComputedStyle(b).borderRadius)[0]]), ['rgb(17, 38, 34)', '999px'], 'an account’s panel on the forest, its buttons pills');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
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
    await page.evaluate(th => { S.settings.theme = th; render(); }, theme);
    for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'reports', 'accounts', 'investments', 'settings']) { await page.evaluate(r => navigate(r), r); await page.waitForTimeout(450); for (const f of await page.evaluate(CONTRAST)) bad.push(`${r}: ${f}`); }
    eq(bad, [], `${theme}: every text of the frame and the screens readable (4.5 to 1; 3 to 1 when large)`);
  }
  eq(await page.evaluate(() => [document.documentElement.classList.contains('land-dark'), getComputedStyle(document.querySelector('.content')).backgroundColor, getComputedStyle(document.querySelector('.rail')).backgroundColor]), [true, 'rgb(11, 20, 18)', 'rgb(17, 38, 34)'], 'dark: the look’s dark version, the side bar the same forest');
  for (const w of [1440, 1024]) {
    await page.setViewportSize({ width: w, height: 800 });
    const wide = [];
    for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'reports', 'accounts']) { await page.evaluate(r => navigate(r), r); await page.waitForTimeout(250); if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) wide.push(r); }
    eq(wide, [], `${w} px: nothing wider than the window`);
  }
  await page.evaluate(() => navigate('dashboard')); await page.click('#rail-toggle'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => [document.querySelector('.app').classList.contains('rail-shut'), Math.round(document.querySelector('.rail').getBoundingClientRect().width), getComputedStyle(document.querySelector('.rail .nav a[aria-current="page"]')).backgroundColor]), [true, 68, 'rgb(182, 221, 98)'], 'the side bar folded: 68 px, the screen in use still lime');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- the previous look ----------
  ({ browser, page, errors } = await open({ ...pc, oldLook: true }));
  eq(await page.evaluate(() => [document.documentElement.classList.contains('land'), !!document.querySelector('#view .kpis')]), [false, true], 'the previous look (tests/pw.js: oldLook) keeps its summary');
  await browser.close();
  done('qc-desk-land');
})();
