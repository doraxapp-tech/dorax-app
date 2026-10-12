// QC (owner, 2026-10-11, on the spending limits' green box): "I don't like this box on a box, take the green box out of there; check the whole app
// and stop making boxes inside boxes; tune down the green a little bit".
//   1. no page has a box inside a card: an element with its own edge or fill and round corners, inside a card or inside another such box (the
//      light sheet of the new look, .bq-sheet and .bq-txsheet, is the page itself rising over its forest, not a box: v192–v194)
//      (the household's and the company's side; a computer and a phone; an account with a plan and one without);
//   2. nor the panels most used: the bell, the summary's order, the spending limits, a yearly expense;
//   3. what may keep an edge: a button, a field, a place to drop a file, a chart's column, the card's own picture, a card's transactions sheet
//      (it reaches the panel's edges: owner, 2026-10-09);
//      the categories keep their blocks: their container has no edge and no fill (owner, 2026-10-11);
//   4. the colourway is Wise's: lime #9FD182 inside the app (it was #5DBB8B, and #3ECF8E before); the app's white words #D4D4D4 (owner, 2026-10-11: "so it is not so
//      bright"); every figure tile dashed, on black (owner, same night); no error in the console.
// v199: the household on a computer has the summary's look too (tests/qc-desk-land.js tests it); the computer's parts here are the previous look's, which the company's side still has (tests/pw.js: oldLook)
const { open, ok, eq, done } = require('./pw.js');
const FIND = () => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  const alpha = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? +p[3] : 1; };
  const KEEP = 'button:not(.rem), a.btn, input, select, textarea, label, svg, svg *, canvas, img, .btn, .chip, .pill, .seg, .seg *, .switch, .stackbar, .meter, .bar, .tabs, .tabs *, [role=tablist], [role=tablist] *, .field, .search, .tag, .ccard, .ccard *, .w-mini, .drop, .cv-ops, .drawer, #overlay';
  const edged = e => { const s = getComputedStyle(e), side = k => parseFloat(s['border' + k + 'Width']) > 0 && alpha(s['border' + k + 'Color']) > .05 && s['border' + k + 'Style'] !== 'none';
    return (['Top', 'Right', 'Bottom', 'Left'].every(side) || alpha(s.backgroundColor) > .02 || s.backgroundImage !== 'none') && parseFloat(s.borderTopLeftRadius) >= 6; };
  const isBox = e => { const r = e.getBoundingClientRect(); return r.width >= 120 && r.height >= 44 && !e.matches(KEEP) && edged(e); };
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const roots = [...document.querySelectorAll('#view, #overlay .drawer, #overlay .bq-sheet, #view .bq-txsheet')], out = [];      // a light sheet is a page of its own: its white cards are the page's cards (v192–v194)
  for (const e of [...document.querySelectorAll('#view *, #overlay .drawer *')].filter(vis)) {
    if (!isBox(e)) continue;
    let p = e.parentElement, host = null;
    while (p && !roots.includes(p)) { if (vis(p) && ((p.matches('.card') && edged(p)) || isBox(p))) { host = p; break; } p = p.parentElement; }
    if (!host && !e.closest('.bq-sheet, .bq-txsheet')) host = e.closest('#overlay .drawer');
    if (host) out.push(name(e) + ' in ' + name(host));
  }
  return [...new Set(out)];
};
(async () => {
  for (const [label, view] of [['computer', { viewport: { width: 1440, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, touch: true, mobile: true }]]) {
    for (const plan of [true, false]) {
      const { browser, page, errors } = await open({ lang: 'es', account: 'example', plan, beta: true, ...view });
      const routes = await page.evaluate(() => ROUTES.map(r => r[0])), found = [];
      for (const side of ['personal', 'business']) {
        await page.evaluate(v => { S.user.greeted = true; A.space({ v }); }, side);
        for (const r of routes) { await page.evaluate(r => navigate(r), r); for (const f of await page.evaluate(FIND)) found.push(`${side}/${r}: ${f}`); }
      }
      eq(found, [], `${label}, ${plan ? 'with a plan' : 'without a plan'}: no box inside a card on any page, on either side`);
      await page.evaluate(() => { A.space({ v: 'personal' }); navigate('dashboard'); });
      const panels = [];
      for (const [kind, go] of [['reminders', 'A.reminders()'], ['dash-order', "A['dash-order']()"], ['limits', 'A.limits()'], ['yearly-form', "A['yearly-new']({ v: 'ipva' })"]]) {
        const opened = await page.evaluate(go => { UI.drawer = null; renderOverlay(); try { (0, eval)(go); } catch (e) { return null; } return UI.drawer && UI.drawer.kind; }, go);
        if (!opened) continue;
        for (const f of await page.evaluate(FIND)) panels.push(`${opened}: ${f}`);
      }
      eq(panels, [], `${label}, ${plan ? 'with a plan' : 'without a plan'}: nor in the bell, the summary’s order, the limits, a yearly expense`);
      eq(errors, [], `${label}: no error in the console`); await browser.close();
    }
  }
  const { browser, page } = await open({ oldLook: true, lang: 'es', account: 'example', plan: true });
  eq(await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return ['--brand', '--link', '--cta', '--pos'].map(k => s.getPropertyValue(k).trim().toUpperCase()); }), ['#9FD182', '#9FD182', '#9FD182', '#9FD182'], 'Wise’s lime, a little softer (2026-10-11)');
  eq(await page.evaluate(() => { navigate('dashboard'); return [document.body, document.querySelector('#view h2'), document.querySelector('#view .kpis .kpi:nth-child(2) .value')].map(e => getComputedStyle(e).color); }), ['rgb(212, 212, 212)', 'rgb(212, 212, 212)', 'rgb(212, 212, 212)'], 'the app’s white words are #D4D4D4');
  eq(await page.evaluate(() => { const look = e => { const c = getComputedStyle(e); return [c.borderTopStyle, c.borderTopColor, c.backgroundColor].join(' '); }; navigate('dashboard'); const k = look(document.querySelector('#view .kpis .kpi')); navigate('plan'); const t = look(document.querySelector('#view .card.tile')); navigate('goals'); return [k, t, look(document.querySelector('#view .card.tile, #view .kpi'))]; }),
    Array(3).fill('dashed rgb(57, 62, 52) rgb(14, 15, 12)'), 'every figure tile in the summary’s dashed style, on black (owner, 2026-10-11)');
  await browser.close();
  done('qc-no-boxes');
})().catch(e => { console.error('qc-no-boxes: Error', e); process.exit(1); });
