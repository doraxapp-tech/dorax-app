// QC: the quick actions drawn with Dorax's things, and the piggy bank of a contribution (v217; owner, 2026-10-13: "¿hiciste los cambios de iconos
// en el modo casa?", then on the review artifact "elijo la opción B para guardar una meta tanto en ordenador como en móvil. Todo lo demás se ve
// bien, reemplaza todos los iconos tal cual me muestras"; css/look/look-quick-art.css, features/phone/phone.view.js QUICK_ART).
//   1. the summary's four round buttons, its More list, the round +'s three and the computer's buttons each show their thing (the light line),
//      whose circle is the button's: the main one in the main button's colours (lime; the company's forest), the others quiet; the bar at the
//      foot keeps its line icons; no word under 12 px;
//   2. a contribution to a goal: the piggy bank in the ring's middle, upright, the percentage in one line under the ring; money set aside with no
//      amount to reach: the bank alone and the total said in the sentence ("demasiados números aquí"): two amounts on the screen, not three.
const { open, ok, eq, done } = require('./pw.js');
const LIME = 'rgb(182, 221, 98)', DEEP = 'rgb(17, 38, 34)';
const things = (page, sel) => page.evaluate(sel => [...document.querySelectorAll(sel)].map(b => {
  const v = b.dataset.v || (b.dataset.a === 'quick-more' ? 'more' : ''), svg = b.querySelector('svg.qa-art'), r = svg && svg.getBoundingClientRect();
  return { v, right: !!svg && (() => { const t = document.createElement('div'); t.innerHTML = artObj(QUICK_ART[v], 'bold qa-art'); return !!QUICK_ART[v] && t.firstElementChild.outerHTML === svg.outerHTML; })(), w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0,
    bg: svg ? getComputedStyle(svg.querySelector('.obj-bg')).fill : '', ink: svg ? getComputedStyle(svg.querySelector('.ol')).fill : '' };
}), sel);
const smallest = (page, sel) => page.evaluate(sel => Math.min(...[...document.querySelectorAll(sel)].filter(e => e.offsetParent && e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize))), sel);
async function give(page, kind, amount) {
  await page.evaluate(k => { A.close(); const g = B().goals.find(x => x.status === 'active' && (k === 'fund' ? x.kind !== 'goal' : x.kind === 'goal')); A['goal-move']({ id: g.id, dir: 'in' }); }, kind);
  await page.waitForTimeout(250); await page.fill('#m-amount', amount); await page.click('#gw-knob');
  await page.waitForSelector('#overlay .gw-win'); await page.waitForTimeout(400);
}
(async () => {
  for (const phone of [true, false]) {
    const vp = phone ? { viewport: { width: 390, height: 844 }, mobile: true, touch: true } : { viewport: { width: 1440, height: 900 } }, where = phone ? 'a phone' : 'a computer';
    const { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, ...vp });
    await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'light'; localStorage.setItem('dorax-push-asked', '1'); navigate('dashboard'); render(); });
    await page.waitForTimeout(300);
    // ---- 1. the quick actions
    if (phone) {
      const row = await things(page, '#quick-acts button');
      eq(row.map(x => x.v), ['expense', 'income', 'transfer', 'more'], `${where}: the summary's four round buttons`);
      ok(row.every(x => x.right && x.w === 52 && x.h === 52), `${where}: each is its thing (receipt, hand with coins, two arrows, three dots), filling its 52 px circle`, row);
      eq([row[0].bg, row[0].ink, row[1].bg, row[1].ink], [LIME, DEEP, 'rgb(232, 243, 210)', DEEP], `${where}: Expense on the main button's lime, the others on the quiet mint, the forest line`);
      ok(await page.evaluate(() => !document.querySelector('#tabbar .qa-art') && !!document.querySelector('#tabbar a svg')), `${where}: the bar at the foot keeps its line icons`);
      ok(await smallest(page, '#quick-acts span') >= 12, `${where}: no word of the buttons under 12 px`);
      await page.click('[data-a="quick-more"]'); await page.waitForTimeout(250);
      const more = await things(page, '.bq-more-sheet .g-pick-list button');
      ok(more.length >= 7 && more.every(x => x.right && x.w === 40), `${where}: More: every action with its thing, 40 px (pay, goal, start a goal, fixed cost, limit, statement, account)`, more.map(x => [x.v, x.right, x.w]));
      ok(await page.evaluate(() => !document.querySelector('.bq-more-sheet .fl-ico > svg:not(.qa-art)')), `${where}: no line icon left in More`);
      await page.evaluate(() => A.close()); await page.waitForTimeout(250);
      await page.evaluate(() => A.quick()); await page.waitForTimeout(250);
      const plus = await things(page, '.sheet.quick .quick-base button');
      ok(plus.length === 3 && plus.every(x => x.right && x.w === 48), `${where}: the round +: Expense, Income and Transfer with their things, 48 px`, plus);
      await page.evaluate(() => A.close()); await page.waitForTimeout(250);
      // the company's side: the main one forest with a white line, no lime
      await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); }); await page.waitForTimeout(300);
      const co = await things(page, '#quick-acts button');
      ok(co.every(x => x.right), `${where}: the company's buttons with the same things`, co.map(x => x.v));
      eq([co[0].bg, co[0].ink], [DEEP, 'rgb(255, 255, 255)'], `${where}: the company's Cost on the forest with a white line`);
      ok(co.every(x => x.bg !== LIME), `${where}: no lime on the company's side`, co.map(x => x.bg));
      // the dark theme: the main one stays lime with the forest line, the others a light line on the dark circle
      await page.evaluate(() => { A.space({ v: 'personal' }); S.settings.theme = S.settings.themePhone = 'dark'; navigate('dashboard'); }); await page.waitForTimeout(300);
      const dk = await things(page, '#quick-acts button');
      eq([dk[0].bg, dk[0].ink, dk[1].ink], [LIME, DEEP, 'rgb(232, 243, 210)'], `${where}, dark: Expense lime with the forest line, the others' line light`);
      await page.evaluate(() => { S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); }); await page.waitForTimeout(300);
    } else {
      const pills = await things(page, '.bq-dacts .bq-dact.art');
      eq(pills.map(x => x.v), ['expense', 'income', 'transfer', 'more'], `${where}: the four buttons under the figures`);
      ok(pills.every(x => x.right && x.w === 32), `${where}: each with its thing at its left, 32 px`, pills);
      await page.click('.bq-dacts [data-a="quick-more"]'); await page.waitForTimeout(250);
      const more = await things(page, '.bq-more-sheet .g-pick-list button');
      ok(more.length >= 6 && more.every(x => x.right && x.w === 40), `${where}: the More menu with its things, 40 px`, more.map(x => [x.v, x.w]));
      await page.evaluate(() => A.close()); await page.waitForTimeout(250);
    }
    // ---- 2. a contribution: the piggy bank in the ring's middle
    await give(page, 'goal', '50');
    const g = await page.evaluate(() => {
      const ring = document.querySelector('.gw-win .gw-ring'), pig = ring && ring.querySelector('.gw-pig-mid svg.obj'), under = document.querySelector('.gw-win .gw-pct-under');
      const rr = ring.getBoundingClientRect(), pr = pig.getBoundingClientRect(), ur = under.getBoundingClientRect();
      return { pig: !!pig, upright: getComputedStyle(pig).transform === 'none', centred: Math.abs((pr.left + pr.right) / 2 - (rr.left + rr.right) / 2) < 2 && Math.abs((pr.top + pr.bottom) / 2 - (rr.top + rr.bottom) / 2) < 2,
        under: ur.top >= rr.bottom - 1 && !!under.querySelector('#gw-num'), inRing: !!ring.querySelector('.gw-pct'), label: ring.getAttribute('aria-label'),
        small: Math.min(...[...document.querySelectorAll('.gw-win p, .gw-win small, .gw-win b, .gw-win h2, .gw-win button')].filter(e => e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize))),
        fits: document.querySelector('.gw-win .gw-acts').getBoundingClientRect().bottom <= innerHeight + 1 };
    });
    ok(g.pig && g.upright && g.centred, `${where}: the piggy bank in the ring's middle, upright`, g);
    ok(g.under && !g.inRing, `${where}: the percentage in one line under the ring, not inside it`, g);
    ok(/de R\$/.test(g.label || ''), `${where}: the ring still says its percentage aloud`, g.label);
    ok(g.small >= 12 && g.fits, `${where}: no word under 12 px; Done and See goal on the screen`, g);
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('.gw-coin')).display === 'none'), `${where}: with less motion asked for, no coin falls`);
    await page.click('[data-a="gw-done"]'); await page.waitForTimeout(300);
    // money set aside: the bank alone, the total in the sentence
    await give(page, 'fund', '50');
    const f = await page.evaluate(() => {
      const w = document.querySelector('.gw-win'), txt = w.querySelector('.gw-in').textContent;
      return { pig: !!w.querySelector('.gw-total .gw-pig-top svg.obj'), num: !!w.querySelector('#gw-num'), say: w.querySelector('.gw-say2').textContent, amounts: (txt.match(/R\$/g) || []).length };
    });
    ok(f.pig && !f.num, `${where}: money set aside: the bank alone, no total as a figure`, f);
    ok(/^Ya tienes R\$ [\d.]+(,\d\d)? apartados\.$/.test(f.say), `${where}: the total said in the sentence`, f.say);
    eq(f.amounts, 2, `${where}: two amounts on the screen (what was put in, the total), not three`);
    await page.click('[data-a="gw-done"]'); await page.waitForTimeout(300);
    // ---- 3. v218: the medium icons inside the screens ("¿toda la webapp tiene los iconos nuevos?", then "entrega la ronda 5 tal como está")
    const art = (sel) => page.evaluate(sel => [...document.querySelectorAll(sel)].map(h => { const s = h.querySelector(':scope > svg.ti-art'), r = h.getBoundingClientRect(), sr = s && s.getBoundingClientRect();
      return { thing: !!s, fills: !!s && Math.abs(sr.width - r.width) < 1.5, bg: s ? getComputedStyle(s.querySelector('.obj-bg')).fill : '' }; }), sel);
    await page.evaluate(() => { A.close(); navigate('dashboard'); render(); inboxAdd({ kind: 'cheer', cheer: 'goal', name: 'Viaje' }); inboxAdd({ kind: 'curio', id: Object.keys(curioFacts())[0] }); });
    await page.click('.bell'); await page.waitForTimeout(300);
    const iss = await art('#overlay .iss-ico');
    ok(iss.length > 0 && iss.every(x => x.thing && x.fills), `${where}: the bell: each problem with its thing, filling its circle`, iss);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#overlay [role="tab"], #overlay .seg button')].find(x => /Novedades/.test(x.textContent)); if (b) b.click(); }); await page.waitForTimeout(250);
    const nt = await art('#overlay .nt-ico');
    ok(nt.length >= 2 && nt.every(x => x.thing && x.fills), `${where}: the bell's updates: the flag, the lightbulb`, nt);
    await page.evaluate(() => A.close()); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !document.querySelector('#tabbar .ti-art, #nav .ti-art, .navbar .ti-art')), `${where}: the bars and the menu keep their line icons`);
    // a delete stays red
    await page.evaluate(() => confirmBox({ title: t('Delete this transaction?'), label: t('Delete') })); await page.waitForTimeout(200);
    const del = await art('#modal-root .modal-icon');
    ok(del.length === 1 && del[0].thing && del[0].fills && del[0].bg !== 'rgb(232, 243, 210)', `${where}: a delete's question: the trash drawn, on its red circle, not the quiet mint`, del);
    ok(await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#modal-root .modal-icon svg .ol')).fill; const m = c.match(/\d+/g).map(Number); return m[0] > m[1] && m[0] > m[2]; }), `${where}: its line red, not the brand's green`);
    await page.evaluate(() => { UI.modal = null; renderModal(); }); await page.waitForTimeout(200);
    // an account's two buttons: the receipt and the hand with coins
    await page.evaluate(() => { navigate('dashboard'); render(); scrollTo(0, 0); });
    const accBtn = await page.$(phone ? 'button.bq-acc:not([data-fn])' : '.bq-daccs button:not([data-fn])');
    if (accBtn) { await accBtn.click(); await page.waitForTimeout(400);
      const pills = await page.evaluate(() => [...document.querySelectorAll('#overlay .bq-cv-acts .btn[data-v]')].filter(b => b.dataset.v !== 'edit').map(b => { const s = b.querySelector(':scope > svg.qa-art'), t = document.createElement('div'); t.innerHTML = artObj(QUICK_ART[b.dataset.v], 'bold qa-art'); return !!s && s.outerHTML === t.firstElementChild.outerHTML; }));
      ok(pills.length === 2 && pills.every(Boolean), `${where}: an account's Expense and Income with the summary's things`, pills);
      await page.evaluate(() => A.close()); await page.waitForTimeout(300); }
    else ok(false, `${where}: an account to open`);
    eq(errors, [], `${where}: no errors`);
    await browser.close();
  }
  done('qc-quick-art');
})();
