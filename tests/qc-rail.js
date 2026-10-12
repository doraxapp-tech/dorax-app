// QC of the computer's side menu (owner, 2026-10-08: "put the account-switch icon beside the eye on the computer, take out the switch that is there
// now, and add a button to open and close the sidebar").
//   1. the two arrows sit beside the eye at the top of the menu, saying where they go; no Household | Company switch anywhere; the row never runs into
//      the round button on the menu's edge, the company's "Company" tag included;
//   2. the round button closes the menu to a column of icons: each icon says what it is in a tip, the counts become dots, everything still works
//      (a screen, the search, the person's menu); it opens again; the choice is kept on this device;
//   3. a phone has none of it; Spanish and Portuguese.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 860 } });
  // ---------- 1. the two arrows ----------
  const row = () => page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), b = document.querySelector('#rail-side .rail-flip');
    return [b && b.getAttribute('aria-label'), b && b.dataset.v, !!b && b.closest('.rail-tools').contains(document.querySelector('#rail-eye .nums-btn')), document.querySelectorAll('.side-seg').length, r('.rail-tools').right <= r('#rail-toggle').left - 2, r('.rail-tools').left >= (document.querySelector('#brand-tag').hidden ? r('.brand .logo').right : r('#brand-tag').right)]; });
  eq(await row(), ['Switch to Company', 'business', true, 0, true, true], 'the household’s menu: the two arrows beside the eye, saying where they go; no switch; clear of the round button');
  await page.click('#rail-side .rail-flip'); await page.waitForTimeout(200);
  eq([await page.evaluate(() => UI.space), ...(await row())], ['business', 'Switch to Household', 'personal', true, 0, true, true], 'a click: the company’s side, the arrows now lead back; “Company” beside the logo and the row still clear of the round button');
  await page.click('#rail-side .rail-flip'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => UI.space), 'personal', 'and back');
  // ---------- 2. closing the menu ----------
  eq(await page.evaluate(() => { const b = document.querySelector('#rail-toggle'); return [b.getAttribute('aria-expanded'), b.getAttribute('aria-label'), b.getAttribute('aria-controls'), document.querySelector('.rail').getBoundingClientRect().width]; }), ['true', 'Close the menu', 'rail', 248], 'open: the round button on its edge says it closes the menu');
  await page.click('#rail-toggle'); await page.waitForTimeout(350);
  const shut = await page.evaluate(() => { const rail = document.querySelector('.rail'), links = [...rail.querySelectorAll('.nav a')], b = document.querySelector('#rail-toggle');
    return [document.querySelector('.app').classList.contains('rail-shut'), Math.round(rail.getBoundingClientRect().width), links.every(a => a.dataset.tip && a.dataset.tip === a.querySelector('span').textContent && a.querySelector('span').getBoundingClientRect().width <= 1), links.every(a => a.getBoundingClientRect().width <= 48),
      [...rail.querySelectorAll('.nav .count')].every(c => c.getBoundingClientRect().width <= 9), getComputedStyle(rail.querySelector('.brand .logo')).display, getComputedStyle(rail.querySelector('.brand .logo-mark')).display, b.getAttribute('aria-expanded'), b.getAttribute('aria-label'), localStorage.getItem('dorax-rail'), document.documentElement.scrollWidth <= innerWidth]; });
  eq(shut, [true, 68, true, true, true, 'none', 'block', 'false', 'Open the menu', 'shut', true], 'closed: a 68 px column of icons, each saying what it is in a tip (its word kept for screen readers), the counts as dots, the logo’s “d”; the button now opens it; kept on this device');
  await page.hover('#rail .nav a[href="#plan"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [document.querySelector('#tip').hidden, document.querySelector('#tip').textContent]), [false, 'Plan'], 'pointing at an icon shows its name');
  await page.click('#rail .nav a[href="#plan"]'); await page.waitForFunction(() => UI.route === 'plan');
  ok(await page.evaluate(() => document.querySelector('.app').classList.contains('rail-shut')), 'a screen opens from the closed menu, and the menu stays closed');
  await page.click('#rail .findbtn'); await page.waitForSelector('.find'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.click('#user-menu-btn'); await page.waitForSelector('.umenu');
  eq(await page.evaluate(() => { const m = document.querySelector('.umenu').getBoundingClientRect(); return [m.left >= 0, m.right <= innerWidth, m.width >= 200]; }), [true, true, true], 'the search and the person’s menu open from it, the menu whole on screen');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.focus('#rail-toggle'); await page.keyboard.press('Enter'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => [document.querySelector('.app').classList.contains('rail-shut'), Math.round(document.querySelector('.rail').getBoundingClientRect().width), [...document.querySelectorAll('#rail .nav a')].some(a => a.dataset.tip), localStorage.getItem('dorax-rail'), document.activeElement.id]), [false, 248, false, 'open', 'rail-toggle'], 'Enter on it opens the menu again: its words back, no tips, the focus kept');
  await page.evaluate(() => { localStorage.setItem('dorax-rail', 'shut'); UI.railShut = undefined; renderShell(); });
  ok(await page.evaluate(() => document.querySelector('.app').classList.contains('rail-shut')), 'the next visit on this device opens it as it was left');
  await page.evaluate(() => { localStorage.setItem('dorax-rail', 'open'); UI.railShut = undefined; renderShell(); });
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 3. a phone; the languages ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', viewport: { width: 390, height: 800 }, touch: true, mobile: true }));
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#rail-toggle')).display, getComputedStyle(document.querySelector('.rail')).display]), ['none', 'none'], 'a phone: no side menu and no round button');
  await browser.close();
  for (const [lang, want] of [['es', ['Cerrar el menú', 'Cambiar a Empresa']], ['pt', ['Fechar o menu', 'Mudar para Empresa']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', viewport: { width: 1280, height: 800 } }));
    eq(await page.evaluate(() => [document.querySelector('#rail-toggle').getAttribute('aria-label'), document.querySelector('#rail-side .rail-flip').getAttribute('aria-label')]), want, `${lang}: in the language`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-rail');
})();
