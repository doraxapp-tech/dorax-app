// QC of Settings in parts and of the main currency (v205; owner, 2026-10-12: "agrega un ajuste de monedas en ajustes (Reales por defecto, USD,
// EUROS, CUP (moneda cubana)); saca de perfil todo lo que no tenga que ver con ajustes de perfil de usuario y ponlo en ajustes. Crea sub menus
// debajo de ajustes ya que veo que ajustes es muy largo y no es funcional. El sub-menu se muestra al hacer click en ajustes").
//   1. a computer: Settings' parts are not in the side bar until Settings is pressed; then six, General open; each part is its own page with its own
//      address, and the browser's way back goes part by part; the person's card stays in sight; the side bar closed to icons keeps the parts;
//   2. what each part holds; the reminders, the app lock and the language are no longer in Profile; the ways to them (Help, a reminder) lead to
//      their part; on the company's side, Imports has the converter and its OFX profiles;
//   3. the main currency (v224): the main account's, read in Settings and changed by choosing another main account, which asks first and says what
//      changes, and nothing changes if not confirmed; confirmed, every amount is in the new currency and the goals keep theirs; a new account takes
//      its bank's currency; the five currencies;
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
  eq(await p.evaluate(() => ['#set-lang', '#set-currency-row', '#set-locale', '#set-theme'].map(s => !!document.querySelector(s))), [true, true, true, false], 'General: the language, the main currency and the number format (the theme is in Appearance)');
  await holds('appearance'); eq(await p.evaluate(() => ['#set-theme', '#set-wallet', '#set-lang'].map(s => !!document.querySelector(s))), [true, true, false], 'Appearance: light or dark, the accounts as cards');
  await holds('notifications'); eq(await p.evaluate(() => [!!document.querySelector('#reminders-card'), !!document.querySelector('#nf-bills, [id^="nf-"]')]), [true, true], 'Notifications: the reminders, with their switches');
  await holds('security'); ok(await p.evaluate(() => !!document.querySelector('#guard-card')), 'Security: the protection on this device');
  await holds('imports'); eq(await p.evaluate(() => ['#set-auto', '#set-ai', '#set-platform'].map(s => !!document.querySelector(s))), [true, true, false], 'Imports, the household: its preferences, no converter');
  await holds('data'); eq(await p.evaluate(() => [!!document.querySelector('#your-data [data-a="export-json"]'), !!document.querySelector('[data-a="wipe"]'), !!document.querySelector('[data-a="contact"]')]), [true, true, true], 'Your data: backup, deleting data, contact');
  await p.evaluate(() => navigate('profile')); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [...document.querySelectorAll('.pf-page > .set-group .set-head h2')].map(h => h.textContent.trim())), ['Tú', 'Correo e inicio de sesión', 'Eliminar cuenta'], 'Profile: only the person (name, email and login, deleting the account)');
  eq(await p.evaluate(() => [!!document.querySelector('#pf-lang'), !!document.querySelector('#reminders-card'), !!document.querySelector('#guard-card'), !!document.querySelector('.pf-page a[href="#settings"]')]), [false, false, false, true], 'Profile: no language, reminders or lock; a link says they are in Settings');
  await p.evaluate(() => { A.help(); }); await p.waitForTimeout(150);
  await p.evaluate(() => A['help-go']({ v: 'notify' })); await p.waitForTimeout(200);      // from the Help center (v209: a page of the website, over the app)
  eq(await p.evaluate(() => [UI.route, UI.setSec, !!document.querySelector('#reminders-card')]), ['settings', 'notifications', true], 'Help’s way to the reminders leads to Settings › Notifications');
  await p.evaluate(() => { UI.drawer = null; renderOverlay(); A.help(); A['help-go']({ v: 'safe' }); }); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [UI.route, UI.setSec]), ['settings', 'security'], 'and to the app lock, Settings › Security');
  await p.evaluate(() => { UI.drawer = null; renderOverlay(); A.space({ v: 'business' }); navigate('settings/imports'); }); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [UI.space, !!document.querySelector('#set-platform'), !!document.querySelector('[data-a="edit-profile"]')]), ['business', true, true], 'the company’s side: Imports has the converter and its OFX profiles');
  await p.evaluate(() => { A.space({ v: 'personal' }); }); await p.waitForTimeout(200);

  // ---------- 3. the main currency: the main account's (v224, owner, 2026-10-14: "si el usuario elige una cuenta principal la moneda de la app cambia a
  // la moneda de esa cuenta; las metas deben mantenerse en la moneda de la cuenta de ahorro elegida en 'se guarda en'") ----------
  await p.evaluate(() => navigate('settings/general')); await p.waitForTimeout(150);
  eq(await p.evaluate(() => { const r = document.getElementById('set-currency-row'); return [!!document.querySelector('#set-currency'), r.querySelector('.set-cur-now b').textContent, r.innerText.includes(mainOf('personal').name), !!r.querySelector('[data-a="cur-main-pick"]'), !!document.getElementById('set-curs-row')]; }),
    [false, 'Real brasileño (R$)', true, true, false], 'the main currency is read, not chosen: the main account’s, named, with the way to change the main account; one currency, so no list of currencies');
  eq(await p.evaluate(() => { const keep = S.accounts; S.accounts = []; render(); const sel = document.querySelector('#set-currency'), out = [!!sel, sel && [...sel.options].map(o => o.value)]; S.accounts = keep; render(); return out; }),
    [true, ['BRL', 'USD', 'EUR', 'CUP', 'MLC']], 'with no account yet it is chosen in a list: the five currencies');
  // an account in euros, made the main one: it asks first, since the plan has numbers
  await p.evaluate(() => { S.accounts.push({ id: 'qa-eu', name: 'Cuenta BBVA', institution: 'BBVA', place: 'ES', type: 'checking', currency: 'EUR', scope: 'personal', purpose: '', opening: 50000 }); render(); });
  eq(await p.evaluate(() => [...document.querySelectorAll('#set-curs-row .set-curs li .set-curs-c b')].map(b => b.textContent)), ['Real brasileño (R$)', 'Euro (€)'], 'two currencies in the accounts: listed, the main one first');
  await p.evaluate(() => makeMain(acct('qa-eu'))); await p.waitForTimeout(250);
  const ask = await p.evaluate(() => [!!UI.modal, UI.modal && UI.modal.title, UI.modal && UI.modal.text, S.settings.currency || 'BRL', BASE_CURRENCY, mainOf('personal').id]);
  eq(ask.slice(0, 2), [true, '¿Contar tu dinero en Euro (€)?'], 'a main account in euros: it asks first');
  ok(/Cuenta BBVA pasa a ser tu cuenta principal\./.test(ask[2]) && /con los mismos números/.test(ask[2]) && /Cada meta sigue en la moneda de su cuenta\. No se convierte nada\./.test(ask[2]), 'and says what changes: the plan keeps its numbers, each goal keeps its currency, nothing is converted');
  eq(ask.slice(3), ['BRL', 'BRL', 'nu-conta'], 'until it is confirmed nothing has changed');
  await p.click('.modal footer [data-a="modal-cancel"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [S.settings.currency || 'BRL', mainOf('personal').id]), ['BRL', 'nu-conta'], 'cancelled: still reais, and the main account is the one it was');
  const goalsBefore = await p.evaluate(() => S.goals.map(g => g.currency));
  await p.evaluate(() => makeMain(acct('qa-eu'))); await p.waitForTimeout(250); await p.click('#modal-ok'); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [S.settings.currency, BASE_CURRENCY, CUR, fmt.money(123456), mainOf('personal').id, document.querySelector('#set-currency-row .set-cur-now b').textContent]), ['EUR', 'EUR', 'EUR', '€ 1.234,56', 'qa-eu', 'Euro (€)'], 'confirmed: the main account is the one in euros, and the amounts are in euros');
  eq([goalsBefore.every(c => c === 'BRL'), await p.evaluate(() => S.goals.every(g => g.currency === 'BRL'))], [true, true], 'the goals stay in reais, their accounts’ currency');
  await p.evaluate(() => navigate('dashboard')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /€/.test(document.querySelector('#view').innerText)), 'the summary speaks in euros');
  // a new account takes its bank's currency (v224: "si el usuario selecciona un banco cubano al crear la cuenta pues la moneda de ese banco es CUP")
  await p.evaluate(() => A['account-add']()); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [document.querySelector('#a-inst').value, document.querySelector('#a-cur').value, [...document.querySelectorAll('#a-cur option')].map(o => o.value)]), ['Nubank', 'BRL', ['BRL', 'USD', 'EUR', 'CUP', 'MLC']], 'a new account starts on Nubank, in reais; an account can be in any of the five');
  await p.selectOption('#a-inst', 'BANDEC'); await p.waitForTimeout(200);
  const cu = await p.evaluate(() => [document.querySelector('#a-cur').value, !!document.querySelector('#overlay .cur-follow')]);
  await p.selectOption('#a-inst', 'Santander@ES'); await p.waitForTimeout(200);
  const es = await p.evaluate(() => [document.querySelector('#a-cur').value, UI.drawer.draft.institution, UI.drawer.draft.place]);
  await p.selectOption('#a-cur', 'MLC'); await p.waitForTimeout(150); await p.selectOption('#a-inst', 'Itaú'); await p.waitForTimeout(200);
  eq([cu, es, await p.evaluate(() => document.querySelector('#a-cur').value)], [['CUP', false], ['EUR', 'Santander', 'ES'], 'MLC'], 'BANDEC: pesos cubanos; Santander in Spain: euros; a currency chosen by hand stays when the bank changes');
  await p.evaluate(() => A.close());
  eq(await p.evaluate(() => { const st = JSON.parse(JSON.stringify(S)); return [currencyOf(st), currencyOf({ settings: {} }), currencyOf({ settings: { currency: 'XYZ' } })]; }), ['EUR', 'BRL', 'BRL'], 'the setting is kept with the account; never chosen, or unknown, it is reais');
  // the server's reminder job reads the same setting
  const engine = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'engine.mjs'), 'utf8');
  ok(/BASE_CURRENCY = currencyOf\(S\); const CUR = BASE_CURRENCY;/.test(engine) && /let BASE_CURRENCY = 'BRL';/.test(engine), 'the server’s reminder job takes the person’s main currency');
  await p.evaluate(() => { makeMain(acct('nu-conta')); }); await p.waitForTimeout(200); if (await p.evaluate(() => !!UI.modal)) { await p.click('#modal-ok'); await p.waitForTimeout(200); }
  eq(errors, [], 'computer: no error'); await browser.close();

  // ---------- 4. a phone ----------
  for (const [lang, theme, want] of [['es', 'light', ['General', 'Apariencia', 'Notificaciones', 'Seguridad', 'Importaciones', 'Tus datos']], ['pt', 'dark', ['Geral', 'Aparência', 'Notificações', 'Segurança', 'Importações', 'Seus dados']], ['en', 'light', ['General', 'Appearance', 'Notifications', 'Security', 'Imports', 'Your data']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
    await page.evaluate(th => { S.user.greeted = true; S.settings.themePhone = th; navigate('settings'); render(); }, theme); await page.waitForTimeout(250);
    eq(await page.evaluate(() => [...document.querySelectorAll('.set-list .set-li b')].map(b => b.textContent)), want, `${lang}, phone: Settings is the list of its parts`);
    eq(await page.evaluate(() => [...document.querySelectorAll('.set-li')].every(a => a.getBoundingClientRect().height >= 44) && document.documentElement.scrollWidth <= innerWidth), true, `${lang}, phone: each row a thumb high, nothing wider than the screen`);
    await page.click('.set-li[href="#settings/general"]'); await page.waitForTimeout(250);
    eq(await page.evaluate(() => [location.hash, !!document.querySelector('#set-currency-row'), !!document.querySelector('.set-list')]), ['#settings/general', true, false], `${lang}, phone: a row opens its part`);
    await page.click('.bq-back'); await page.waitForTimeout(250);
    eq(await page.evaluate(() => [UI.route, setSecNow(), !!document.querySelector('.set-list')]), ['settings', '', true], `${lang}, phone: the top's ‹ goes back to the list`);
    // v208 (owner, 2026-10-13: "el botón de ajustes en el móvil tiene dos flechas y cuando le das y quieres ir atrás no puedes, el botón de atrás no sale
    // al menú anterior"): from More, Settings has one arrow; its parts and the list go back step by step, and the list's ‹ opens More again
    await page.evaluate(() => { BACK.stack = []; navigate('dashboard'); }); await page.waitForTimeout(250);
    await page.click('.more-btn'); await page.waitForTimeout(400);
    eq(await page.evaluate(() => { const a = document.querySelector('#overlay a[href="#settings"]'); return [a.querySelectorAll('svg').length, !!a.querySelector('.nav-chev, .nav-sub')]; }), [2, false], `${lang}, phone: in More, Settings has its icon and one arrow`);
    await page.click('#overlay a[href="#settings"]'); await page.waitForTimeout(400);
    for (const part of ['general', 'notifications']) {
      await page.click(`.set-li[href="#settings/${part}"]`); await page.waitForTimeout(250); await page.click('.bq-back'); await page.waitForTimeout(300);
    }
    eq(await page.evaluate(() => [UI.route, setSecNow(), BACK.stack.length]), ['settings', '', 1], `${lang}, phone: part, back, part, back: the list, with one step behind it (no loop between the list and a part)`);
    await page.click('.bq-back'); await page.waitForTimeout(450);
    eq(await page.evaluate(() => [UI.route, UI.sheet, !!document.querySelector('#overlay a[href="#settings"]')]), ['dashboard', true, true], `${lang}, phone: the list's ‹ goes back to More, open, where Settings was chosen`);
    await page.evaluate(() => { UI.sheet = false; renderOverlay(); BACK.stack = []; navigate('settings/security'); }); await page.waitForTimeout(250);
    await page.click('.bq-back'); await page.waitForTimeout(300);
    eq(await page.evaluate(() => [UI.route, setSecNow(), BACK.stack.length]), ['settings', '', 0], `${lang}, phone: a part opened from its address: ‹ shows the list, without a step that would lead back to the part`);
    eq(errors, [], `${lang}, phone: no error`); await browser.close();
  }
  done('qc-settings-parts');
})();
