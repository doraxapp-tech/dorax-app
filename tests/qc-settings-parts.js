// QC of Settings in parts and of the main currency (v205; owner, 2026-10-12: "agrega un ajuste de monedas en ajustes (Reales por defecto, USD,
// EUROS, CUP (moneda cubana)); saca de perfil todo lo que no tenga que ver con ajustes de perfil de usuario y ponlo en ajustes. Crea sub menus
// debajo de ajustes ya que veo que ajustes es muy largo y no es funcional. El sub-menu se muestra al hacer click en ajustes").
//   1. a computer: Settings' parts are not in the side bar until Settings is pressed; then six, General open; each part is its own page with its own
//      address, and the browser's way back goes part by part; the person's card stays in sight; the side bar closed to icons keeps the parts;
//   2. what each part holds; the reminders, the app lock and the language are no longer in Profile; the ways to them (Help, a reminder) lead to
//      their part; on the company's side, Imports has the converter and its OFX profiles;
//   3. the main currency: reais by default; changing it with accounts in another currency asks first and says what changes, and nothing changes
//      if not confirmed; confirmed, every amount is in the new currency, a new account starts in it, the account's currencies are the four;
//      the server's reminder job reads the same setting;
//   4. a phone: Settings is the list of the parts, a row opens its part, the top's ‹ goes back to the list; light and dark; Portuguese and English.
const { open, ok, eq, done } = require('./pw.js');
const fs = require('fs'), path = require('path');
const PARTS = ['general', 'appearance', 'notifications', 'security', 'imports', 'data'];
(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } });
  const p = page;
  await p.evaluate(() => { S.user.greeted = true; navigate('dashboard'); }); await p.waitForTimeout(200);
  // ---------- 1. the side bar ----------
  eq(await p.evaluate(() => { const a = document.querySelector('#nav a[href="#settings"]'); return [!!a, a.getAttribute('aria-expanded'), document.querySelectorAll('#nav-sub-settings a').length]; }), [true, 'false', 0], 'computer: Settings in the side bar, its parts folded');
  await p.click('#nav a[href="#settings"]'); await p.waitForTimeout(300);
  eq(await p.evaluate(() => [UI.route, document.querySelector('#nav a[href="#settings"]').getAttribute('aria-expanded'), [...document.querySelectorAll('#nav-sub-settings a')].map(a => a.getAttribute('href')), document.querySelector('#nav-sub-settings a[aria-current="page"]').getAttribute('href'), document.querySelector('.topbar h1').textContent.trim()]),
    ['settings', 'true', PARTS.map(x => '#settings/' + x), '#settings/general', 'Ajustes'], 'pressing Settings opens its six parts under it, General on screen');
  eq(await p.evaluate(() => [...document.querySelectorAll('#nav-sub-settings a span')].map(s => s.textContent)), ['General', 'Apariencia', 'Notificaciones', 'Seguridad', 'Importaciones', 'Tus datos'], 'the parts by name');
  for (const part of PARTS) {
    await p.click(`#nav-sub-settings a[href="#settings/${part}"]`); await p.waitForTimeout(200);
    eq(await p.evaluate(() => [location.hash, document.querySelector('.set-page').dataset.sec, document.querySelector('#nav-sub-settings a[aria-current="page"]').getAttribute('href')]), ['#settings/' + part, part, '#settings/' + part], `${part}: its own page and address, marked in the side bar`);
    const foot = await p.evaluate(() => { const f = document.getElementById('rail-foot').getBoundingClientRect(), cur = document.querySelector('#nav-sub-settings a[aria-current="page"]').getBoundingClientRect(); return [f.bottom <= innerHeight + 1, cur.bottom <= f.top + 1, cur.top >= 0]; });
    eq(foot, [true, true, true], `${part}: the person's card in sight at the foot, the part's link above it`);
  }
  await p.goBack(); await p.waitForTimeout(300);
  eq(await p.evaluate(() => [UI.route, UI.setSec]), ['settings', 'imports'], 'the browser’s Back goes part by part');
  await p.evaluate(() => navigate('settings/notifications')); await p.waitForTimeout(150);
  await p.evaluate(() => A['rail-toggle']()); await p.waitForTimeout(250);
  {
    eq(await p.evaluate(() => [...document.querySelectorAll('#nav-sub-settings a')].map(a => [Math.round(a.getBoundingClientRect().width) <= 44, !!a.dataset.tip])), PARTS.map(() => [true, true]), 'the side bar closed to its icons: the parts are icons, each says its name');
    await p.evaluate(() => A['rail-toggle']()); await p.waitForTimeout(200);
  }
  await p.evaluate(() => navigate('transactions')); await p.waitForTimeout(150);
  eq(await p.evaluate(() => document.querySelectorAll('#nav-sub-settings a').length), 0, 'another screen: the parts fold away');

  // ---------- 2. what each part holds ----------
  const holds = async part => { await p.evaluate(x => navigate('settings/' + x), part); await p.waitForTimeout(150); return p.evaluate(() => [...document.querySelectorAll('.set-page > .set-group')].map(g => g.id || g.querySelector('.set-head h2').id)); };
  eq((await holds('general')).length, 1, 'General: one group');
  eq(await p.evaluate(() => ['#set-lang', '#set-currency', '#set-locale', '#set-theme'].map(s => !!document.querySelector(s))), [true, true, true, false], 'General: the language, the main currency and the number format (the theme is in Appearance)');
  await holds('appearance'); eq(await p.evaluate(() => ['#set-theme', '#set-wallet', '#set-lang'].map(s => !!document.querySelector(s))), [true, true, false], 'Appearance: light or dark, the accounts as cards');
  await holds('notifications'); eq(await p.evaluate(() => [!!document.querySelector('#reminders-card'), !!document.querySelector('#nf-bills, [id^="nf-"]')]), [true, true], 'Notifications: the reminders, with their switches');
  await holds('security'); ok(await p.evaluate(() => !!document.querySelector('#guard-card')), 'Security: the protection on this device');
  await holds('imports'); eq(await p.evaluate(() => ['#set-auto', '#set-ai', '#set-platform'].map(s => !!document.querySelector(s))), [true, true, false], 'Imports, the household: its preferences, no converter');
  await holds('data'); eq(await p.evaluate(() => [!!document.querySelector('#your-data [data-a="export-json"]'), !!document.querySelector('[data-a="wipe"]'), !!document.querySelector('[data-a="contact"]')]), [true, true, true], 'Your data: backup, deleting data, contact');
  await p.evaluate(() => navigate('profile')); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [...document.querySelectorAll('.pf-page > .set-group .set-head h2')].map(h => h.textContent.trim())), ['Tú', 'Correo e inicio de sesión', 'Eliminar cuenta'], 'Profile: only the person (name, email and login, deleting the account)');
  eq(await p.evaluate(() => [!!document.querySelector('#pf-lang'), !!document.querySelector('#reminders-card'), !!document.querySelector('#guard-card'), !!document.querySelector('.pf-page a[href="#settings"]')]), [false, false, false, true], 'Profile: no language, reminders or lock; a link says they are in Settings');
  await p.evaluate(() => { A.help(); }); await p.waitForTimeout(150);
  await p.evaluate(() => HELP_GO.notify()); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [UI.route, UI.setSec, !!document.querySelector('#reminders-card')]), ['settings', 'notifications', true], 'Help’s way to the reminders leads to Settings › Notifications');
  await p.evaluate(() => { UI.drawer = null; renderOverlay(); HELP_GO.safe(); }); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [UI.route, UI.setSec]), ['settings', 'security'], 'and to the app lock, Settings › Security');
  await p.evaluate(() => { UI.drawer = null; renderOverlay(); A.space({ v: 'business' }); navigate('settings/imports'); }); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [UI.space, !!document.querySelector('#set-platform'), !!document.querySelector('[data-a="edit-profile"]')]), ['business', true, true], 'the company’s side: Imports has the converter and its OFX profiles');
  await p.evaluate(() => { A.space({ v: 'personal' }); }); await p.waitForTimeout(200);

  // ---------- 3. the main currency ----------
  await p.evaluate(() => navigate('settings/general')); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [document.querySelector('#set-currency').value, [...document.querySelectorAll('#set-currency option')].map(o => o.value), [...document.querySelectorAll('#set-currency option')].map(o => o.textContent)]),
    ['BRL', ['BRL', 'USD', 'EUR', 'CUP'], ['Real brasileño (R$)', 'Dólar estadounidense (US$)', 'Euro (€)', 'Peso cubano (CUP)']], 'the main currency: reais by default, four to choose from');
  await p.selectOption('#set-currency', 'USD'); await p.waitForTimeout(250);
  const ask = await p.evaluate(() => [!!UI.modal, UI.modal && UI.modal.title, UI.modal && UI.modal.text, S.settings.currency || 'BRL', BASE_CURRENCY]);
  eq(ask.slice(0, 2), [true, '¿Contar tu dinero en Dólar estadounidense (US$)?'], 'with accounts in reais it asks first');
  ok(/se muestran aparte, fuera de los totales\. No se convierte nada\./.test(ask[2]) && /conservan sus números, ahora en dólares/.test(ask[2]), 'and says what changes: the accounts in reais leave the totals, the plan keeps its numbers, nothing is converted');
  eq(ask.slice(3), ['BRL', 'BRL'], 'until it is confirmed nothing has changed');
  await p.click('.modal footer [data-a="modal-cancel"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [S.settings.currency || 'BRL', document.querySelector('#set-currency').value]), ['BRL', 'BRL'], 'cancelled: still reais');
  await p.selectOption('#set-currency', 'EUR'); await p.waitForTimeout(250); await p.click('#modal-ok'); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [S.settings.currency, BASE_CURRENCY, CUR, fmt.money(123456), document.querySelector('#set-currency').value]), ['EUR', 'EUR', 'EUR', '€ 1.234,56', 'EUR'], 'confirmed: the amounts are in euros');
  await p.evaluate(() => navigate('dashboard')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /€/.test(document.querySelector('#view').innerText) && !/R\$ 0,00/.test(document.querySelector('.bq-dbal, #view').innerText.slice(0, 200))), 'the summary speaks in euros');
  await p.evaluate(() => A['edit-account']({ id: '' })); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [document.querySelector('#a-cur').value, [...document.querySelectorAll('#a-cur option')].map(o => o.value)]), ['EUR', ['BRL', 'USD', 'EUR', 'CUP']], 'a new account starts in euros; an account can be in any of the four');
  await p.evaluate(() => A.close());
  eq(await p.evaluate(() => { const st = JSON.parse(JSON.stringify(S)); return [currencyOf(st), currencyOf({ settings: {} }), currencyOf({ settings: { currency: 'XYZ' } })]; }), ['EUR', 'BRL', 'BRL'], 'the setting is kept with the account; never chosen, or unknown, it is reais');
  // the server's reminder job reads the same setting
  const engine = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'engine.mjs'), 'utf8');
  ok(/BASE_CURRENCY = currencyOf\(S\); const CUR = BASE_CURRENCY;/.test(engine) && /let BASE_CURRENCY = 'BRL';/.test(engine), 'the server’s reminder job takes the person’s main currency');
  await p.evaluate(() => { S.settings.currency = 'BRL'; render(); });
  eq(errors, [], 'computer: no error'); await browser.close();

  // ---------- 4. a phone ----------
  for (const [lang, theme, want] of [['es', 'light', ['General', 'Apariencia', 'Notificaciones', 'Seguridad', 'Importaciones', 'Tus datos']], ['pt', 'dark', ['Geral', 'Aparência', 'Notificações', 'Segurança', 'Importações', 'Seus dados']], ['en', 'light', ['General', 'Appearance', 'Notifications', 'Security', 'Imports', 'Your data']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
    await page.evaluate(th => { S.user.greeted = true; S.settings.themePhone = th; navigate('settings'); render(); }, theme); await page.waitForTimeout(250);
    eq(await page.evaluate(() => [...document.querySelectorAll('.set-list .set-li b')].map(b => b.textContent)), want, `${lang}, phone: Settings is the list of its parts`);
    eq(await page.evaluate(() => [...document.querySelectorAll('.set-li')].every(a => a.getBoundingClientRect().height >= 44) && document.documentElement.scrollWidth <= innerWidth), true, `${lang}, phone: each row a thumb high, nothing wider than the screen`);
    await page.click('.set-li[href="#settings/general"]'); await page.waitForTimeout(250);
    eq(await page.evaluate(() => [location.hash, !!document.querySelector('#set-currency'), !!document.querySelector('.set-list')]), ['#settings/general', true, false], `${lang}, phone: a row opens its part`);
    await page.click('.bq-back'); await page.waitForTimeout(250);
    eq(await page.evaluate(() => [UI.route, setSecNow(), !!document.querySelector('.set-list')]), ['settings', '', true], `${lang}, phone: the top's ‹ goes back to the list`);
    eq(errors, [], `${lang}, phone: no error`); await browser.close();
  }
  done('qc-settings-parts');
})();
