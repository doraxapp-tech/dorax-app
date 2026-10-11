// QC of the two invitations added on 2026-10-07 (owner: "create an announcement banner at the top so that with one button people can add the web
// app to the home screen of their Android or iOS device; create a notification a little after the onboarding so the person turns notifications on").
//   1. a computer, and an app already opened from the home screen, are offered nothing;
//   2. an iPhone in a browser tab: the banner at the very top, its button shows Apple's three taps; closing it is remembered on the device;
//   3. Android: the button opens the browser's own install box when the browser offered one, and the menu's steps when it did not;
//   4. the question about notifications: once per device, a moment after a screen opens, even while the first steps are pending;
//      "Turn on" asks the browser and switches this device on; "Not now" puts it away; an iPhone in a tab is shown the way to the Home Screen.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const text = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  // the device, as the app is told it is (window.DORAX_INSTALL), and its notifications (window.DORAX_PUSH)
  const device = d => {
    window.__prompted = 0; window.__asked = 0;
    if (d.kind !== undefined) window.DORAX_INSTALL = { ios: () => d.kind === 'ios', android: () => d.kind === 'android', standalone: () => !!d.standalone, canPrompt: () => !!d.offer, prompt: async () => { window.__prompted++; return d.offer; } };
    if (d.push) { let perm = d.push.perm || 'default', sub = d.push.on ? { endpoint: 'https://push.example/this-device', keys: { p256dh: 'BPk', auth: 'YXV0aA' } } : null;
      window.DORAX_PUSH = { supported: () => !d.push.install, needsInstall: () => !!d.push.install, permission: () => perm, ask: async () => { window.__asked++; return (perm = d.push.answer || 'granted'); }, current: async () => sub, subscribe: async () => (sub = { endpoint: 'https://push.example/this-device', keys: { p256dh: 'BPk', auth: 'YXV0aA' } }), unsubscribe: async () => { sub = null; } }; }
  };
  const start = async (d, more) => { const o = await open({ lang: 'en', account: 'example', viewport: { width: 390, height: 844 }, touch: true, mobile: true, ...(more || {}) }); await o.page.addInitScript(device, d); await o.page.reload(); await o.page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); return o; };

  // ---------- 1. nothing to offer ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', viewport: { width: 1280, height: 900 } });
  eq(await page.evaluate(() => [INSTALL.kind(), INSTALL.due(), document.querySelectorAll('#install-bar').length]), [null, false, 0], 'a computer is offered nothing: no banner');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  ({ browser, page, errors } = await start({ kind: 'ios', standalone: true }));
  eq(await page.evaluate(() => [INSTALL.kind(), document.querySelectorAll('#install-bar').length]), [null, 0], 'opened from the home screen, the app is already there: no banner');
  await browser.close();

  // ---------- 2. an iPhone in a browser tab ----------
  ({ browser, page, errors } = await start({ kind: 'ios' }));
  eq(await page.evaluate(() => { const b = document.querySelector('#install-bar'), r = b.getBoundingClientRect(), nav = document.querySelector('.navbar').getBoundingClientRect(), add = b.querySelector('[data-a="install-add"]'), x = b.querySelector('[data-a="install-close"]');
    return [INSTALL.kind(), Math.round(r.top), r.bottom <= nav.top + 1, r.left >= 0 && r.right <= innerWidth, b.previousElementSibling === null && b.parentElement.classList.contains('work') || b.parentElement.id === 'topbar', add.innerText.trim(), add.getBoundingClientRect().height >= 40, x.getAttribute('aria-label'), x.getBoundingClientRect().height >= 40 && x.getBoundingClientRect().width >= 40, !!b.querySelector('svg.ins-app'), document.documentElement.scrollWidth - innerWidth]; }),
    ['ios', 0, true, true, true, 'Add', true, 'Not now', true, true, 0], 'an iPhone in a browser tab: the banner is the very first thing, above the panel, inside the screen, with the app’s icon, a button a thumb can hit and a way to close it');
  ok(/Add Dorax to your home screen/.test(await text(page, '#install-bar')) && /It opens like an app: full screen, one tap away\./.test(await text(page, '#install-bar')), 'it says what it is for, in one line and a half', await text(page, '#install-bar'));
  const places = [];
  for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'settings']) { await page.evaluate(r => navigate(r), r); places.push(await page.evaluate(() => JSON.stringify(['#install-bar', '.bar-left', '.navbar', '#tabbar'].map(s => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height)]; })))); }
  eq(new Set(places).size, 1, 'it is on every screen, and nothing under it moves from one screen to the next');
  await page.evaluate(() => { document.querySelector('.work').scrollTop = 400; });
  eq(await page.evaluate(() => [document.querySelector('#install-bar').getBoundingClientRect().bottom <= 0, Math.round(document.querySelector('.navbar').getBoundingClientRect().top)]), [true, 0], 'scrolling, the banner goes with the page and the panel is what stays');
  await page.evaluate(() => toTop()); await page.click('#install-bar [data-a="install-add"]'); await page.waitForSelector('.drawer .ins-steps');
  let steps = await text(page, '.drawer');
  ok(/1\. Tap Share/.test(steps) && /2\. Choose “Add to Home Screen”/.test(steps) && /3\. Tap “Add”/.test(steps) && /Notifications on an iPhone work only once Dorax is on the Home Screen\./.test(steps), 'Apple gives a page no way to start it, so the button shows the three taps, and says what else the Home Screen brings', steps);
  eq(await page.evaluate(() => [window.__prompted, UI.drawer.kind, document.querySelectorAll('.ins-steps li').length, [...document.querySelectorAll('.ins-steps li')].every(li => li.querySelector('svg')), document.querySelector('.drawer').getBoundingClientRect().bottom <= innerHeight + 1]), [0, 'install', 3, true, true], 'three steps, each with its mark, in a panel that fits the phone');
  await page.click('.drawer [data-a="close"]'); eq(await page.locator('#install-bar').count(), 1, '“Got it” closes the steps and leaves the banner for later');
  await page.click('#install-bar [data-a="install-close"]');
  eq(await page.evaluate(() => [document.querySelectorAll('#install-bar').length, localStorage.getItem('dorax-install-hide'), Math.round(document.querySelector('.navbar').getBoundingClientRect().top)]), [0, '1', 0], 'closing the banner puts it away and the panel takes its place at the top');
  await page.reload(); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
  eq(await page.evaluate(() => [INSTALL.kind(), document.querySelectorAll('#install-bar').length]), ['ios', 0], 'and that is remembered on this device: it is not back on the next visit');
  eq(errors, [], 'iPhone: no error in the console'); await browser.close();

  // ---------- 3. Android ----------
  ({ browser, page, errors } = await start({ kind: 'android', offer: 'dismissed' }));
  await page.click('#install-bar [data-a="install-add"]');
  eq(await page.evaluate(() => [window.__prompted, !!UI.drawer, document.querySelectorAll('#install-bar').length]), [1, false, 1], 'Android, where the browser offered to install: the button opens the browser’s own box; told no there, the banner stays');
  await browser.close();
  ({ browser, page, errors } = await start({ kind: 'android', offer: 'accepted' }));
  await page.click('#install-bar [data-a="install-add"]'); await page.waitForFunction(() => !document.querySelector('#install-bar'));
  eq(await page.evaluate(() => [window.__prompted, document.querySelector('#toast').innerText.trim(), localStorage.getItem('dorax-install-hide')]), [1, 'Done. Dorax is on your home screen.', '1'], 'told yes: it says so and the banner is gone for good');
  await browser.close();
  ({ browser, page, errors } = await start({ kind: 'android' }));
  await page.click('#install-bar [data-a="install-add"]'); await page.waitForSelector('.drawer .ins-steps'); steps = await text(page, '.drawer');
  ok(/1\. Open the browser’s menu/.test(steps) && /2\. Choose “Add to Home screen” or “Install app”/.test(steps) && /3\. Confirm/.test(steps) && !/iPhone/.test(steps) && await page.evaluate(() => window.__prompted) === 0, 'Android, where the browser made no offer: the menu’s way, in three steps', steps);
  await page.click('.drawer [data-a="install-close"]'); eq(await page.evaluate(() => [!!UI.drawer, document.querySelectorAll('#install-bar').length]), [false, 0], '“Do not show the banner again”, from the steps, closes both');
  eq(errors, [], 'Android: no error in the console'); await browser.close();
  // a tablet wide enough for the computer's layout still gets it, inside the top bar
  ({ browser, page, errors } = await start({ kind: 'ios' }, { viewport: { width: 1180, height: 820 }, mobile: false }));
  eq(await page.evaluate(() => { const b = document.querySelector('#install-bar'), r = b.getBoundingClientRect(), h = document.querySelector('.topbar h1').getBoundingClientRect(); return [isPhone(), r.bottom <= h.top + 1, r.right <= innerWidth, document.documentElement.scrollWidth <= innerWidth]; }), [false, true, true, true], 'an iPad in the wide layout: the banner sits above the screen’s title, inside the page');
  await browser.close();

  // ---------- 4. the question about notifications ----------
  ({ browser, page, errors } = await start({ push: {} }, { curio: true }));
  await page.evaluate(() => { S.isNew = true; navigate('dashboard'); });
  eq(await page.locator('#curio').count(), 0, 'nothing is asked the instant the screen opens');
  await page.waitForSelector('#curio.nudge', { timeout: 6000 });
  let q = await text(page, '#curio');
  ok(/Want a heads-up before a bill is due\?/.test(q) && /before a bill’s due day, on the day, and if it is late/.test(q) && /In your profile you choose what it reminds you of\./.test(q), 'a moment later a notice asks, and says exactly what the notifications are', q);
  eq(await page.evaluate(() => { const c = document.querySelector('#curio'), r = c.getBoundingClientRect(), bar = document.querySelector('#tabbar').getBoundingClientRect(), bs = [...c.querySelectorAll('.row button')]; return [S.isNew, !!document.querySelector('#first-steps'), c.getAttribute('role'), bs.map(b => b.dataset.a + ':' + b.innerText.trim()), bs.every(b => b.getBoundingClientRect().height >= 40), r.bottom <= bar.top + 1 && r.top >= 0 && r.left >= 0 && r.right <= innerWidth, localStorage.getItem('dorax-push-asked'), !!document.querySelector('.scrim')]; }),
    [true, true, 'status', ['push-ask-yes:Turn on notifications', 'push-ask-no:Not now'], true, true, '1', false], 'it comes even while the first steps are pending (it is the one thing asked for after the setup), sits above the bar, blocks nothing, and is written down as asked on this device');
  await page.click('#curio [data-a="push-ask-yes"]'); await page.waitForFunction(() => /Notifications are on for this device\./.test((document.querySelector('#toast') || {}).innerText || ''));
  eq(await page.evaluate(async () => [window.__asked, !!(await window.DORAX_PUSH.current()), DORAX_PREVIEW.db().push.length, document.querySelectorAll('#curio').length]), [1, true, 1, 0], '“Turn on notifications”: the browser is asked once, in answer to the tap; this device is switched on and the server knows it; the notice is gone');
  await page.evaluate(() => navigate('plan')); await page.waitForTimeout(3300);
  eq(await page.locator('#curio.nudge').count(), 0, 'it is not asked again');
  eq(errors, [], 'the question: no error in the console'); await browser.close();

  ({ browser, page, errors } = await start({ push: {} }, { curio: true }));
  await page.evaluate(() => { S.isNew = true; navigate('dashboard'); }); await page.waitForSelector('#curio.nudge', { timeout: 6000 });
  await page.click('#curio .row [data-a="push-ask-no"]');
  eq(await page.evaluate(async () => [window.__asked, !!(await window.DORAX_PUSH.current()), document.querySelectorAll('#curio').length, document.querySelector('#toast').innerText.trim()]), [0, false, 0, 'Fine. If you change your mind, the switch is in your profile, under Reminders.'], '“Not now”: the browser is never asked, nothing is switched on, and it says where the switch is');
  await page.reload(); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); await page.evaluate(() => { S.isNew = true; navigate('dashboard'); }); await page.waitForTimeout(3300);
  eq(await page.locator('#curio.nudge').count(), 0, 'and it is not asked on the next visit either');
  await browser.close();

  for (const [name, push, want] of [['already on', { on: true, perm: 'granted' }, 0], ['blocked in the browser', { perm: 'denied' }, 0]]) {
    ({ browser, page, errors } = await start({ push }, { curio: true }));
    await page.evaluate(() => { S.isNew = true; navigate('dashboard'); }); await page.waitForTimeout(3300);
    eq(await page.locator('#curio.nudge').count(), want, `notifications ${name}: there is nothing to ask`); await browser.close();
  }
  // an iPhone in a tab: the way to notifications is the Home Screen
  ({ browser, page, errors } = await start({ kind: 'ios', push: { install: true } }, { curio: true }));
  await page.evaluate(() => { S.isNew = true; navigate('dashboard'); }); await page.waitForSelector('#curio.nudge', { timeout: 6000 }); q = await text(page, '#curio');
  ok(/Apple allows that only once Dorax is on your Home Screen\./.test(q) && /Show me how/.test(q), 'an iPhone in a browser tab: the notice says notifications need the Home Screen first', q);
  await page.click('#curio [data-a="push-ask-yes"]'); await page.waitForSelector('.drawer .ins-steps');
  eq(await page.evaluate(() => [window.__asked, UI.drawer.kind, document.querySelectorAll('#curio').length]), [0, 'install', 0], '“Show me how” opens the three taps; the browser is not asked for a permission it cannot give');
  eq(errors, [], 'iPhone, notifications: no error in the console'); await browser.close();

  // ---------- 5. Spanish and Portuguese ----------
  for (const [lang, want] of [['es', [/Agrega Dorax a tu pantalla de inicio/, 'Agregar', /¿Te aviso antes de que venza una cuenta\?/, 'Activar notificaciones', /Toca Compartir/]], ['pt', [/Adicione o Dorax à sua tela inicial/, 'Adicionar', /Quer um aviso antes de uma conta vencer\?/, 'Ativar notificações', /Toque em Compartilhar/]]]) {
    const o = await open({ lang, account: 'example', viewport: { width: 320, height: 640 }, touch: true, mobile: true, curio: true }); await o.page.addInitScript(device, { kind: 'ios', push: {} }); await o.page.reload(); await o.page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
    page = o.page;
    eq([want[0].test(await text(page, '#install-bar')), (await text(page, '#install-bar [data-a="install-add"]')).trim(), await page.evaluate(() => { const b = document.querySelector('#install-bar'); return [b.getBoundingClientRect().right <= innerWidth, [...b.querySelectorAll('b, small, button')].every(e => e.scrollWidth <= e.clientWidth + 1), document.documentElement.scrollWidth - innerWidth]; })], [true, want[1], [true, true, 0]], `${lang}, 320px: the banner in the language, every word whole, inside the narrowest phone`);
    await page.waitForSelector('#curio.nudge', { timeout: 6000 });
    eq([want[2].test(await text(page, '#curio')), (await text(page, '#curio [data-a="push-ask-yes"]')).trim(), await page.evaluate(() => { const r = document.querySelector('#curio').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; })], [true, want[3], true], `${lang}, 320px: the question in the language, inside the screen`);
    await page.evaluate(() => { UI.curio = null; renderCurio(); }); await page.click('#install-bar [data-a="install-add"]'); await page.waitForSelector('.drawer .ins-steps');
    ok(want[4].test(await text(page, '.drawer')) && !/NaN|undefined|\{[a-z]+\}/.test(await text(page, '.drawer')) && await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) === 0, `${lang}, 320px: the steps in the language, whole`, await text(page, '.drawer'));
    eq(o.errors, [], `${lang}: no error in the console`); await o.browser.close();
  }
  done('qc-install');
})();
