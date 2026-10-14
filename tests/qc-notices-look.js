// QC: the floating notices in the look (v215; owner, 2026-10-13: "también actualiza las curiosidades y los avisos flotantes al nuevo estilo visual
// que tenemos"; css/look/look-land-notices.css).
//   1. each notice (a curiosity, a milestone, a goal reached, notifications, the app lock, Household | Company, pay day) is the summary's forest
//      block: a forest card with 24 px corners, white title, its mark one of Dorax's things on the look's lime circle, the main button lime with
//      forest words; the close button in the corner, clear of the title; buttons a thumb wide on a phone, no word under 12 px;
//   2. on the company's side the circle and the button are white; in the dark theme the card is a step lighter than the page;
//   3. a phone's small signal is a forest pill with the lightbulb.
const { open, ok, eq, done } = require('./pw.js');
const CASES = {
  curio: () => ({ id: curioNext(S, UI.space === 'business'), open: true }), cheer: () => ({ cheer: 'mark', mark: 90 }), goal: () => ({ cheer: 'goal', name: 'Trip' }),
  push: () => ({ ask: 'push', st: 'ok' }), lock: () => ({ ask: 'lock', what: 'pin' }), side: () => ({ ask: 'side' }),
};
const look = page => page.evaluate(() => {
  const c = document.querySelector('#curio'), cs = getComputedStyle(c), r = c.getBoundingClientRect(), mark = c.querySelector('.fl-ico.nt-art svg.obj'), bg = mark && getComputedStyle(mark.querySelector('.obj-bg')).fill;
  const x = c.querySelector(':scope > .x').getBoundingClientRect(), rg = document.createRange(), main = c.querySelector('.btn.primary'); rg.selectNodeContents(c.querySelector('.grow > b'));
  const words = [...rg.getClientRects(), ...[...c.querySelectorAll('.grow p, .grow small')].flatMap(e => { const q = document.createRange(); q.selectNodeContents(e); return [...q.getClientRects()]; })];
  const small = Math.min(...[...c.querySelectorAll('b, p, small, button')].map(e => parseFloat(getComputedStyle(e).fontSize)));
  const btns = Math.min(...[...c.querySelectorAll('button')].map(b => b.getBoundingClientRect().height));
  return { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, title: getComputedStyle(c.querySelector('.grow > b')).color, mark: bg, main: main ? [getComputedStyle(main).backgroundColor, getComputedStyle(main).color] : null,
    xClear: words.every(w => w.right <= x.left + 1 || w.top >= x.bottom - 1 || w.bottom <= x.top + 1), inside: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, small, btns };
});
(async () => {
  const LIME = 'rgb(182, 221, 98)', DEEP = 'rgb(17, 38, 34)', WHITE = 'rgb(255, 255, 255)';
  for (const phone of [true, false]) {
    const vp = phone ? { viewport: { width: 390, height: 844 }, mobile: true, touch: true } : { viewport: { width: 1440, height: 900 } }, where = phone ? 'a phone' : 'a computer';
    let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, ...vp });
    await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'light'; localStorage.setItem('dorax-push-asked', '1'); navigate('dashboard'); render(); });
    for (const [name, fn] of Object.entries(CASES)) {
      await page.evaluate(src => { UI.curio = eval('(' + src + ')')(); renderCurio(); }, fn.toString());
      const l = await look(page);
      eq([l.bg, l.radius, l.title, l.mark, l.xClear, l.inside, l.small >= 12, l.btns >= (phone ? 44 : 40)], ['rgba(17, 38, 34, 0.96)', '24px', WHITE, LIME, true, true, true, true],
        `${where}, ${name}: the forest card, 24 px corners, white title, its thing on the lime circle, the close button in the corner clear of the title, on screen, nothing under 12 px, buttons ${phone ? 44 : 40} px`);
      if (l.main) eq(l.main, [LIME, DEEP], `${where}, ${name}: the main button lime with forest words`);
    }
    // the things, one per notice, each about what the notice says
    eq(await page.evaluate(() => Object.entries({ push: { ask: 'push', st: 'ok' }, lock: { ask: 'lock', what: 'pin' }, side: { ask: 'side' }, cheer: { cheer: 'mark', mark: 90 }, goal: { cheer: 'goal', name: 'Trip' } }).map(([k, c]) => { UI.curio = c; renderCurio(); const p = document.querySelector('#curio .nt-art svg path.ol'); return [k, p && Object.entries(ART_ICONS).find(([, v]) => v[1].includes(p.getAttribute('d')))?.[0]]; })),
      [['push', 'bell-ringing'], ['lock', 'key'], ['side', 'arrows-left-right'], ['cheer', 'hourglass-medium'], ['goal', 'flag-banner']], `${where}: each notice's thing says what it is about (a bell, a key, the two arrows, the hourglass of the days of freedom, the goal's flag)`);
    await page.evaluate(() => { UI.curio = null; renderCurio(); toast('Saved.', { label: 'Undo', a: 'close' }); }); await page.waitForSelector('#toast');
    eq(await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#toast')), b = getComputedStyle(document.querySelector('#toast button')); return [c.backgroundColor, c.color, b.color]; }),
      phone ? ['rgba(255, 255, 255, 0.97)', 'rgb(14, 15, 12)', DEEP] : ['rgba(17, 38, 34, 0.96)', WHITE, LIME], phone ? 'a phone: the toast drops in white over the forest block, its button forest' : 'a computer: the toast is the forest card, its button lime');
    if (phone) {
      await page.evaluate(() => { UI.curio = { id: curioNext(S, false) }; renderCurio(); });
      eq(await page.evaluate(() => { const c = document.querySelector('#curio.sig'), cs = getComputedStyle(c); return [cs.backgroundColor, parseFloat(cs.borderTopLeftRadius) >= 22, !!c.querySelector('.cu-open .nt-art svg.obj'), c.querySelector('.cu-open').getBoundingClientRect().height >= 44]; }),
        ['rgba(17, 38, 34, 0.96)', true, true, true], 'a phone: the curiosity’s small signal is a forest pill with its lightbulb, a thumb tall');
      // the company's side: white circle and button
      await page.evaluate(() => { UI.curio = null; renderCurio(); A.space({ v: 'business' }); UI.curio = { ask: 'side' }; renderCurio(); });
      const co = await look(page); eq([co.bg, co.mark, co.main], ['rgba(17, 38, 34, 0.96)', WHITE, [WHITE, DEEP]], 'the company’s side: the same forest card, its thing on a white circle, a white button');
      await page.evaluate(() => { UI.curio = null; renderCurio(); A.space({ v: 'personal' }); S.settings.theme = S.settings.themePhone = 'dark'; render(); UI.curio = { ask: 'push', st: 'ok' }; renderCurio(); });
      const dk = await look(page); eq([dk.bg, dk.mark, dk.main && dk.main[0]], ['rgba(31, 51, 47, 0.97)', LIME, LIME], 'the dark theme: the card a step lighter than the page, the same lime');
    }
    eq(errors, [], `${where}: no error in the console`); await browser.close();
  }
  done('qc-notices-look');
})();
