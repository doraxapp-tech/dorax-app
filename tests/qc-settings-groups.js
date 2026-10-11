// QC of three asks of the owner (2026-10-09):
//   1. "in the import history the date column is cut; the year cannot be read": the date is whole on a computer at every width, and on a narrower
//      one the file's name keeps its room ("Detected" and the status step out; an undone import says so where its button was);
//   2. "the statement converter is only for the company account; I don't think a person needs it": on the household's side it is not in the menu,
//      not in More, not on Imports, and an account of the household does not offer to send its statement to an accountant; opened from the
//      household's side it opens on the company's; with no company it goes to Imports; going back to the household from it opens its dashboard;
//   3. "in Settings everything is inside containers; take the headings out, they are hard to find": each group's heading is outside its card, one
//      column; the converter's choices and OFX profiles are on the company's side only.
const { open, ok, eq, done } = require('./pw.js');
const PHONE = { viewport: { width: 390, height: 844 }, touch: true, mobile: true };
(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  // ---------- 1. the history's date ----------
  for (const w of [1440, 1280, 1100, 960]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.evaluate(() => { S.imports[0].status = 'Undone'; navigate('imports'); }); await page.waitForTimeout(150);
    const r = await page.evaluate(() => { const ds = [...document.querySelectorAll('.imp-hist tbody tr td:first-child')], f = document.querySelector('.imp-hist tbody td.first');
      return [ds.length > 0 && ds.every(td => td.scrollWidth <= td.clientWidth && /\d{4}$/.test(td.innerText.trim())), Math.round(f.getBoundingClientRect().width) >= 80, [...document.querySelectorAll('.imp-hist .chip')].some(c => c.offsetParent && c.innerText.trim() === 'Deshecha')]; });
    eq(r, [true, true, true], `${w}px: every date whole with its year, the file’s name has room, an undone import says so`);
  }
  // ---------- 2. the converter, the company's ----------
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => { if (UI.space !== 'personal') A.space({ v: 'personal' }); navigate('dashboard'); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [...document.querySelectorAll('#nav a')].some(a => a.getAttribute('href') === '#converter')), false, 'household: no converter in the menu');
  await page.evaluate(() => navigate('imports'));
  eq(await page.evaluate(() => [document.querySelectorAll('#view a[href="#converter"]').length, document.querySelector('#view .grid').classList.contains('g-2')]), [0, true], 'household: Imports has no way to the converter, its two cards share the row');
  await page.evaluate(() => { A['edit-account']({ id: 'nu-conta' }); }); await page.waitForTimeout(150);
  eq(await page.evaluate(() => document.querySelectorAll('#a-monthly').length), 0, 'household: an account does not offer to send its statement to an accountant');
  await page.evaluate(() => { A.close(); navigate('converter'); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.route, UI.space, !!document.querySelector('#conv-intro')]), ['converter', 'business', true], 'the converter opened from the household’s side opens on the company’s');
  ok(await page.evaluate(() => [...document.querySelectorAll('#nav a')].some(a => a.getAttribute('href') === '#converter')), 'company: the converter is in its menu');
  await page.evaluate(() => navigate('imports'));
  eq(await page.evaluate(() => document.querySelectorAll('#view a[href="#converter"]').length), 1, 'company: Imports keeps its way to the converter');
  await page.evaluate(() => { const a = business()[0]; A['edit-account']({ id: a.id }); }); await page.waitForTimeout(150);
  eq(await page.evaluate(() => document.querySelectorAll('#a-monthly').length), 1, 'company: an account offers to send its statement to an accountant');
  await page.evaluate(() => { A.close(); navigate('converter'); A.space({ v: 'personal' }); }); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.route, UI.space]), ['dashboard', 'personal'], 'back to the household from the converter: its dashboard');
  // ---------- 3. Settings ----------
  await page.evaluate(() => navigate('settings')); await page.waitForTimeout(150);
  const set = () => page.evaluate(() => { const gs = [...document.querySelectorAll('#view .set-group')];
    return [gs.map(g => g.querySelector('.set-head h2').innerText.trim()), gs.every(g => !g.querySelector('.card h2') && g.querySelector('.set-head').nextElementSibling.classList.contains('card')),
      gs.every((g, i) => i === 0 || g.getBoundingClientRect().top > gs[i - 1].getBoundingClientRect().bottom), getComputedStyle(gs[0].querySelector('h2')).fontSize]; });
  eq(await set(), [['Idioma y visualización', 'Preferencias de importación', 'Tus datos'], true, true, '17px'], 'household Settings: the headings outside their cards, one column; no converter choices');
  ok(await page.evaluate(() => /Guardado en el servidor|Not saved/.test(document.querySelector('#your-data .set-head').innerText) && !!document.querySelector('#your-data #set-company')), 'Your data: its chip beside its heading, its rows in its card');
  await page.evaluate(() => A.space({ v: 'business' })); await page.waitForTimeout(250); await page.evaluate(() => navigate('settings')); await page.waitForTimeout(150);
  eq((await set())[0], ['Idioma y visualización', 'Preferencias de importación', 'Conversor de extractos', 'Perfiles de exportación OFX', 'Tus datos'], 'company Settings: the converter’s choices and its OFX profiles');
  ok(await page.evaluate(() => !!document.querySelector('#set-h-profiles').parentElement.querySelector('[data-a="edit-profile"][data-id=""]') && !!document.querySelector('#set-platform') && !!document.querySelector('#set-close')), 'company: "New profile" beside its heading; the platform and the due day');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- a phone; and someone with no company ----------
  ({ browser, page, errors } = await open({ lang: 'pt', account: 'example', plan: true, beta: true, ...PHONE }));
  await page.evaluate(() => { A.sheet && A.sheet(); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('#sheet-desk') || !/Conversor/.test(document.querySelector('#sheet-desk').innerText)), 'phone, household: More does not name the converter');
  await page.evaluate(() => { UI.sheet = false; navigate('settings'); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const g = document.querySelector('.set-group'), h = g.querySelector('.set-head').getBoundingClientRect(), c = g.querySelector('.card').getBoundingClientRect(); return h.bottom <= c.top && document.documentElement.scrollWidth <= innerWidth; }), 'phone: the heading above its card; nothing wider than the page');
  await page.evaluate(() => { S.user.company = false; S.accounts = S.accounts.filter(a => a.scope !== 'business'); navigate('converter'); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.route, UI.space]), ['imports', 'personal'], 'with no company, the converter’s address opens Imports');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  done('qc-settings-groups');
})();
