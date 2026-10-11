// QC of More on a phone (owner, 2026-10-10: "order this menu: it mixes the system's settings with the person's and the app's tabs; here are some
// examples", Cash App and ARQ).
//   1. the order: the person (photo, name, email, to the profile), the search, "Your money", "Preferences" (categories, Settings, language,
//      appearance), Help, then the account's buttons (open a company account, log out) and the terms;
//   2. every row that goes somewhere ends in a chevron; the language and the appearance show their value and are the system's own picker;
//   3. each thing still works: the profile, the language, the appearance, Help, the terms, log out's place; a thumb fits every row; 320 px fits.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  for (const [lang, w, h] of [['es', 390, 844], ['pt', 320, 568]]) {
    const { browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: h }, touch: true, mobile: true }), where = `${lang} ${w}: `;
    const T = k => page.evaluate(k => t(k), k);
    await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); }); await page.click('.more-btn'); await page.waitForSelector('.sheet.more');
    const order = await page.evaluate(() => [...document.querySelectorAll('.sheet.more > *')].map(e => e.className.split(' ')[0]).filter(c => c !== 'grab'));
    eq(order, ['mr-me', 'sheet-find', 'nav', 'nav-group', 'mr-acts', 'mr-legal'], where + 'the person first, then the search, the app’s places and preferences, Help, the account’s buttons and the terms');
    eq(await page.evaluate(() => [...document.querySelectorAll('.sheet .mr-h')].map(x => x.innerText.trim())), [await T('Your money'), await T('Preferences')], where + 'two titled groups: the money, then the preferences');
    eq(await page.evaluate(() => { const me = document.querySelector('.mr-me'); return [me.getAttribute('href'), /Alex/.test(me.innerText), !!me.querySelector('.avatar'), document.activeElement === me]; }), ['#profile', true, true, true], where + 'the person at the top leads to the profile, with photo, name and email; it gets the focus when More opens');
    eq(await page.evaluate(() => [...document.querySelectorAll('.sheet .mr-group')][1].querySelectorAll('a, .mr-pick').length), 4, where + 'Preferences: categories, Settings, language and appearance');
    ok(await page.evaluate(() => [...document.querySelectorAll('.sheet .mr-nav a, .mr-pick, .mr-row, .mr-me')].every(r => !!r.querySelector('.mr-chev'))), where + 'every row that goes somewhere ends in a chevron');
    ok(await page.evaluate(() => [...document.querySelectorAll('.sheet .mr-nav a, .mr-pick, .mr-row, .mr-btn, .mr-me')].every(r => r.getBoundingClientRect().height >= 44) && document.querySelector('.sheet').scrollWidth <= document.querySelector('.sheet').clientWidth), where + 'a thumb fits every row and button, and nothing is wider than the sheet');
    // the pickers
    const val = id => page.evaluate(id => document.querySelector('#' + id).closest('.mr-pick').querySelector('.mr-val').innerText.trim(), id);
    eq([await val('lang-m'), await val('theme-m')], [lang === 'es' ? 'Español' : 'Português', lang === 'es' ? 'Oscuro' : 'Escuro'], where + 'the language and the appearance show their value');
    eq(await page.evaluate(() => { const s = document.querySelector('#theme-m'), r = s.getBoundingClientRect(), row = s.closest('.mr-pick').getBoundingClientRect(); return [getComputedStyle(s).opacity, Math.abs(r.width - row.width) < 2 && Math.abs(r.height - row.height) < 2, !!document.querySelector('label[for="theme-m"]')]; }), ['0', true, true], where + 'the whole row is the system’s picker, with its label');
    await page.selectOption('#theme-m', 'light'); await page.waitForTimeout(150);
    eq(await page.evaluate(() => [S.settings.theme, document.documentElement.classList.contains('app-light')]), ['light', true], where + 'choosing the appearance changes it');
    await page.evaluate(() => { S.settings.theme = 'dark'; render(); A.sheet(); });
    // the account's buttons
    eq(await page.evaluate(() => { const b = [...document.querySelectorAll('.mr-acts button')], probe = document.createElement('i'); probe.style.color = 'var(--neg)'; document.body.appendChild(probe); const neg = getComputedStyle(probe).color; probe.remove(); return [b.map(x => x.dataset.a), getComputedStyle(b[b.length - 1]).color === neg]; }), [['logout'], true], where + 'with a company, Log out is the only button, in red');
    await page.evaluate(() => { S.user.company = false; renderOverlay(); });
    eq(await page.evaluate(() => [...document.querySelectorAll('.mr-acts button')].map(x => x.dataset.a)), ['co-open', 'logout'], where + 'without a company, “Open a company account” comes first, then Log out');
    await page.click('.mr-legal [data-v="terms"]'); await page.waitForTimeout(150);
    eq(await page.evaluate(() => [UI.sheet, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.doc]), [false, 'legal', 'terms'], where + 'the terms open from the foot of More');
    await page.evaluate(() => { A.close(); A.sheet(); }); await page.click('.mr-me'); await page.waitForTimeout(200);
    eq(await page.evaluate(() => [UI.route, UI.sheet]), ['profile', false], where + 'the person at the top opens the profile');
    eq(errors, [], where + 'no error in the console'); await browser.close();
  }
  done('qc-more');
})().catch(e => { console.error('qc-more: Error', e); process.exit(1); });
