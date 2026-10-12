// QC of the computer's side menu (owner, 2026-10-08: "put the account-switch icon beside the eye on the computer, take out the switch that is there
// now, and add a button to open and close the sidebar").
//   1. the two arrows sit beside the eye at the top of the menu, saying where they go; no Household | Company switch anywhere; the row never runs into
//      the round button on the menu's edge, the company's "Company" tag included;
//   2. no round button on the menu's edge, beside the screen's name (v202, owner, 2026-10-12: "quita el botón que estás colocando al lado del
//      nombre del tab, como para ir atrás, no es necesario"): the menu is always open, also on a device that had it closed;
//   3. a phone has none of it; Spanish and Portuguese.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 860 } });
  // ---------- 1. the two arrows ----------
  const row = () => page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), b = document.querySelector('#rail-side .rail-flip');
    return [b && b.getAttribute('aria-label'), b && b.dataset.v, !!b && b.closest('.rail-tools').contains(document.querySelector('#rail-eye .nums-btn')), document.querySelectorAll('.side-seg').length, r('.rail-tools').right <= r('.rail').right - 8, r('.rail-tools').left >= (document.querySelector('#brand-tag').hidden ? r('.brand .logo').right : r('#brand-tag').right)]; });
  eq(await row(), ['Switch to Company', 'business', true, 0, true, true], 'the household’s menu: the two arrows beside the eye, saying where they go; no switch; inside the menu');
  await page.click('#rail-side .rail-flip'); await page.waitForTimeout(200);
  eq([await page.evaluate(() => UI.space), ...(await row())], ['business', 'Switch to Household', 'personal', true, 0, true, true], 'a click: the company’s side, the arrows now lead back; “Company” beside the logo and the row still inside the menu');
  await page.click('#rail-side .rail-flip'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => UI.space), 'personal', 'and back');
  // ---------- 2. no button to close the menu ----------
  eq(await page.evaluate(() => [!!document.querySelector('#rail-toggle, .rail-toggle, [data-a="rail-toggle"]'), Math.round(document.querySelector('.rail').getBoundingClientRect().width), document.querySelector('.app').classList.contains('rail-shut')]), [false, 248, false], 'no round button beside the screen’s name; the menu open, its words in it');
  await page.evaluate(() => { localStorage.setItem('dorax-rail', 'shut'); UI.railShut = undefined; renderShell(); });
  eq(await page.evaluate(() => [document.querySelector('.app').classList.contains('rail-shut'), Math.round(document.querySelector('.rail').getBoundingClientRect().width)]), [false, 248], 'a device that had it closed finds it open');
  await page.click('#rail .nav a[href="#plan"]'); await page.waitForFunction(() => UI.route === 'plan');
  await page.click('#rail .findbtn'); await page.waitForSelector('.find'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.click('#user-menu-btn'); await page.waitForSelector('.umenu');
  eq(await page.evaluate(() => { const m = document.querySelector('.umenu').getBoundingClientRect(); return [m.left >= 0, m.right <= innerWidth, m.width >= 200]; }), [true, true, true], 'a screen, the search and the person’s menu open from it, the menu whole on screen');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 3. a phone; the languages ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', viewport: { width: 390, height: 800 }, touch: true, mobile: true }));
  eq(await page.evaluate(() => getComputedStyle(document.querySelector('.rail')).display), 'none', 'a phone: no side menu');
  await browser.close();
  for (const [lang, want] of [['es', 'Cambiar a Empresa'], ['pt', 'Mudar para Empresa']]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', viewport: { width: 1280, height: 800 } }));
    eq(await page.evaluate(() => document.querySelector('#rail-side .rail-flip').getAttribute('aria-label')), want, `${lang}: in the language`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-rail');
})();
