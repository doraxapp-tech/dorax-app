// QC of the phone's top panel (owner, 2026-10-08: "take the Household / Company switch out of the top banner; put a button beside the bell with two
// opposite arrows, and tell the user that is where to switch when they say they have a company. Where the switch was, the household's net balance
// with an eye beside it to show or hide the app's numbers, on white, the amount in green or black; a tap on it opens Accounts").
//   1. no switch in the panel; with a company, a button with two arrows beside the bell that goes to the other side; without one, no button;
//   2. the balance: white, its amount the sum of the household's accounts (the company's on its side), in the side's colour; a tap opens Accounts;
//   3. the eye hides every amount in the app (the balance, the figures, the lists, the messages) and shows them again; kept on this device;
//      what goes into a file is written in full;
//   4. the first time the company's side opens after saying yes, a notice says where to switch, and the button pulses; only once;
//   5. a computer keeps its menu's choice, and gets the eye beside the bell; Spanish and Portuguese on the narrowest phone;
//   6. the summary has the photo and the greeting at the left of the panel; every other screen has its name there instead, and no large title under
//      the panel (owner, 2026-10-10); a screen reader still hears each title; a computer keeps all.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  // ---------- 1. the button ----------
  eq(await page.evaluate(() => { const f = document.querySelector('.navbar .side-flip'), bell = document.querySelector('.navbar .bell'), r = f.getBoundingClientRect(), b = bell.getBoundingClientRect();
      return [document.querySelectorAll('.bar-side, .navbar .side-seg').length, f.dataset.a, f.dataset.v, f.getAttribute('aria-label'), !!f.querySelector('svg'), r.right <= b.left + 1 && Math.abs(r.top - b.top) <= 4, r.width >= 40 && r.height >= 40]; }),
    [0, 'space', 'business', 'Switch to Company', true, true, true], 'no switch in the panel; a round button with two arrows just before the bell, a thumb wide, that goes to the company');
  await page.click('.navbar .side-flip');
  eq(await page.evaluate(() => [UI.space, document.querySelector('.navbar .side-flip').dataset.v, document.querySelector('.navbar .side-flip').getAttribute('aria-label')]), ['business', 'personal', 'Switch to Household'], 'it changes side, and then points back to the household');
  await page.click('.navbar .side-flip'); eq(await page.evaluate(() => UI.space), 'personal', 'and back');
  // ---------- 2. the balance ----------
  const bal = await page.evaluate(() => { const b = document.querySelector('.bar-bal'), l = b.querySelector('.bb-link'), v = l.querySelector('b'), want = personal().filter(a => a.currency === 'BRL').reduce((s, a) => s + accountBalance(S, a.id, S.today), 0);
    return [l.querySelector('small').innerText.trim(), v.innerText.trim() === fmt.money(want, 'BRL'), getComputedStyle(l).backgroundColor, getComputedStyle(v).color, l.getAttribute('href'), b.getBoundingClientRect().top < document.querySelector('.pagehead h1').getBoundingClientRect().top, l.getBoundingClientRect().height >= 56, parseFloat(getComputedStyle(v).fontSize) >= 28, Math.abs((v.getBoundingClientRect().left + v.getBoundingClientRect().right) / 2 - innerWidth / 2) <= 2]; });
  eq(bal, ['Household net balance', true, 'rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)', '#accounts', true, true, true, true], 'where the switch was: the household’s net balance, the sum of its accounts, with no card behind it, large, white and in the middle of the screen (owner, 2026-10-09), a thumb high, above the screen’s title');
  await page.click('.bar-bal .bb-link'); await page.waitForFunction(() => UI.route === 'accounts');
  ok(true, 'a tap on the balance opens Accounts');
  await page.evaluate(() => { navigate('dashboard'); A.space({ v: 'business' }); });
  eq(await page.evaluate(() => { const l = document.querySelector('.bar-bal .bb-link'), want = inBook(pageBookKey(), () => bookAccounts().reduce((s, a) => s + accountBalance(S, a.id, S.today), 0)); return [l.querySelector('small').innerText.trim(), l.querySelector('b').innerText.trim() === inBook(pageBookKey(), () => fmt.money(want, BCUR())), getComputedStyle(l.querySelector('b')).color]; }),
    ['Company net balance', true, 'rgb(255, 255, 255)'], 'on the company’s side it is the company’s balance, in its currency, white too');
  await page.evaluate(() => A.space({ v: 'personal' }));
  // ---------- 3. the eye ----------
  const shown = await page.evaluate(() => document.querySelector('#view').innerText.match(/R\$ [\d.]+,\d\d/g).length);
  await page.click('.bar-bal .bb-eye');
  eq(await page.evaluate(() => [document.querySelector('.bb-eye').getAttribute('aria-pressed'), document.querySelector('.bb-eye').getAttribute('aria-label'), document.querySelector('.bb-link b').innerText.trim(), (document.querySelector('#view').innerText.match(/R\$ [\d.]+,\d\d/g) || []).length, /R\$ •••••/.test(document.querySelector('#view').innerText), localStorage.getItem('dorax-hide-nums')]),
    ['true', 'Show the amounts', 'R$ •••••', 0, true, '1'], `the eye hides every amount: the balance and the ${shown} amounts of the dashboard show R$ •••••, and this device remembers it`);
  for (const r of ['plan', 'goals', 'transactions', 'accounts']) { await page.evaluate(r => navigate(r), r); ok(await page.evaluate(() => !/R\$ [\d.]+,\d\d/.test(document.querySelector('#view').innerText)), `${r}: no amount shows while they are hidden`); }
  await page.reload(); await page.waitForFunction(() => !!UI.session); await page.evaluate(() => navigate('dashboard'));      // the balance and its eye are on the summary only (owner, 2026-10-09)
  eq(await page.evaluate(() => [numsHidden(), document.querySelector('.bb-link b').innerText.trim()]), [true, 'R$ •••••'], 'opened again, they are still hidden');
  eq(await page.evaluate(() => { fmt.raw = true; const s = fmt.money(123456, 'BRL'); fmt.raw = false; return [s, fmt.money(123456, 'BRL')]; }), ['R$ 1.234,56', 'R$ •••••'], 'what goes into a file is written in full');
  await page.click('.bar-bal .bb-eye');
  eq(await page.evaluate(() => [numsHidden(), /R\$ [\d.]+,\d\d/.test(document.querySelector('#view').innerText), localStorage.getItem('dorax-hide-nums')]), [false, true, null], 'the eye again shows them');
  eq(errors, [], 'phone: no error in the console'); await browser.close();

  // ---------- 4. the notice, the first time ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true, curio: true }));
  await page.evaluate(() => { delete S.user.sideTip; sideTipShow(); });
  eq(await page.evaluate(() => { const c = document.querySelector('#curio'); return c && [c.querySelector('b').innerText.trim(), /two arrows, next to the bell/.test(c.innerText), document.querySelector('.navbar .side-flip').classList.contains('pulse'), S.user.sideTip]; }),
    ['Household and Company, one tap apart', true, true, true], 'the notice says the switch is the button with two arrows next to the bell, and the button pulses');
  await page.evaluate(() => { UI.curio = null; renderCurio(); sideTipShow(); });
  eq(await page.evaluate(() => !!document.querySelector('#curio')), false, 'it is said only once');
  ok(await page.evaluate(() => /coSetup|sideTipShow/.test(String(COMPANY_ACTIONS['co-setup-done'] || COMPANY_ACTIONS['co-setup-save'] || '')) || Object.values(COMPANY_ACTIONS).some(f => /sideTipShow\(\)/.test(String(f)))), 'finishing the company’s setup (or leaving it for later) brings it up');
  await browser.close();

  // ---------- 5. without a company; a computer; languages ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.company = false; render(); });
  eq(await page.evaluate(() => [document.querySelectorAll('.navbar .side-flip').length, !!document.querySelector('.bar-bal .bb-link')]), [0, true], 'with no company there is no button to change side, and the balance stays');
  await browser.close();
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  eq(await page.evaluate(() => [document.querySelectorAll('#rail-side [data-a="space"]').length, getComputedStyle(document.querySelector('.bar-bal')).display, getComputedStyle(document.querySelector('.navbar .side-flip') || document.body).display !== 'none' && !!document.querySelector('.navbar .side-flip') && getComputedStyle(document.querySelector('.navbar .side-flip')).display !== 'none', !!document.querySelector('.nums-btn') && getComputedStyle(document.querySelector('.nums-btn')).display !== 'none']), [1, 'none', false, true], 'a computer has the way to the other side in its menu (the two arrows beside the eye), has no balance strip, and has the eye at the end of the logo’s row');
  await page.click('.nums-btn'); eq(await page.evaluate(() => [numsHidden(), /R\$ [\d.]+,\d\d/.test(document.querySelector('#view').innerText)]), [true, false], 'the eye works there too');
  await page.click('.nums-btn'); eq(errors, [], 'computer: no error in the console'); await browser.close();
  for (const [lang, w, want] of [['es', 390, ['Saldo neto del hogar', 'Cambiar a Empresa']], ['pt', 320, ['Saldo líquido da casa', 'Mudar para Empresa']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    eq(await page.evaluate(() => { const l = document.querySelector('.bar-bal .bb-link'), e = document.querySelector('.bar-bal .bb-eye').getBoundingClientRect(); return [l.querySelector('small').innerText.trim(), document.querySelector('.navbar .side-flip').getAttribute('aria-label'), l.querySelector('b').scrollWidth <= l.querySelector('b').clientWidth + 1, e.right <= innerWidth && e.width >= 44, [...document.querySelectorAll('.navbar .bar-tools > *')].every(b => b.getBoundingClientRect().right <= innerWidth), document.documentElement.scrollWidth <= innerWidth]; }),
      [want[0], want[1], true, true, true, true], `${lang}, ${w}px: in the language; the amount whole; the eye a thumb wide; the four round buttons inside the screen`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  // ---------- 6. the screens' names (owner, 2026-10-10: "on the phone, in the top menu, on every tab except Resumen, remove the profile photo and the
  // greeting and put the tab's name in their place") ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  const head = r => page.evaluate(r => { navigate(r); window.scrollTo(0, 0); const h = document.querySelector('.pagehead h1'), ph = document.querySelector('.pagehead'), m = document.querySelector('.pagehead .month'), n = document.querySelector('.navbar .bar-name'), nb = document.querySelector('.navbar');
    return { who: !!document.querySelector('.navbar .bar-who'), name: n ? n.textContent : null, fits: !n || n.scrollWidth <= n.clientWidth, heard: h.textContent.trim().length > 0, big: h.getBoundingClientRect().width > 20, row: Math.round(ph.getBoundingClientRect().height), month: !!m && (document.querySelector('.pagehead .jr-btn') || m).getBoundingClientRect().right >= innerWidth - 20, bar: Math.round(nb.getBoundingClientRect().height) }; }, r);
  eq(await page.evaluate(() => tabsNow()), ['dashboard', 'reports', 'plan', 'goals'], '(the bar at the foot: Summary, Reports, Plan, Goals; owner, 2026-10-08: "change Accounts for Reports")');
  const sum = await head('dashboard');
  eq([sum.who, sum.name, sum.heard, sum.big, sum.month], [true, null, true, false, true], 'Resumen: the photo and the greeting; no name on top (a screen reader still hears it); the month, then the Journey button, filling its row');
  const names = { plan: 'Plan', goals: 'Metas', reports: 'Informes', transactions: 'Transacciones', accounts: 'Cuentas y ahorros', settings: 'Ajustes', categories: 'Categorías y reglas', imports: 'Importaciones', recurring: 'Recurrentes', investments: 'Inversiones', profile: 'Perfil' };
  for (const [r, name] of Object.entries(names)) {
    const h = await head(r), month = ['plan', 'goals', 'reports'].includes(r);
    eq([h.who, h.name, h.fits, h.heard, h.big, month ? h.month : h.row <= 16], [false, name, true, true, false, true], `${r}: its name where the photo was, whole; no photo or greeting; no large title under the panel (a screen reader still hears it)${month ? '; the month in its row' : '; no empty row'}`);
  }
  eq(await page.evaluate(() => { navigate('dashboard'); const a = document.querySelector('.navbar .bar-who').getBoundingClientRect().height; navigate('plan'); const b = document.querySelector('.navbar .bar-name').getBoundingClientRect().height; return Math.abs(a - b) <= 2; }), true, 'the name is as tall as the photo it replaces: the panel’s row does not jump from Resumen to another screen');
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('plan'); });
  eq(await page.evaluate(() => [document.querySelector('.navbar .bar-name').textContent, getComputedStyle(document.querySelector('.navbar .bar-name')).color]), ['Plan', 'rgb(255, 255, 255)'], 'the company’s side: its name too, in white on its blue');
  await page.evaluate(() => { A.space({ v: 'personal' }); });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'nothing wider than the screen');
  eq(errors, [], 'titles: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 860 } }));
  ok(await page.evaluate(() => ['dashboard', 'accounts', 'plan', 'goals'].every(r => { navigate(r); return document.querySelector('.topbar h1').getBoundingClientRect().width > 20; })), 'a computer keeps every title');
  await browser.close();
  done('qc-topbar-phone');
})();
