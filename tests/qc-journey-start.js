// QC: the Journey's first time (owner, 2026-10-10: "when the person taps Journey and has no sprint yet, make an interactive onboarding: what it is,
// why it was created, and let them create a sprint; for that, notifications must be on"; then: "it looks like a form's steps, it has no animation,
// it does not motivate; on the phone it cannot open in a panel: a page of its own over the whole screen; not a form's card").
//   1. no sprint ever: a page over the whole screen, with the scene (the path, the point walking up it), six steps, Begin/Next and back;
//   2. the flame of the first step marks today for real; why (82.8 million, its source); how; what is owed (a debt added over the page comes back);
//   3. notifications: the button turns them on (and the Journey's reminders); the first sprint cannot be reached without them;
//   4. the first sprint: 7, 14 or 30 days and the amount in large figures (required); started, the page celebrates, then opens the Journey;
//   5. the phone's back steps back, Escape and the X close; blocked notifications and an iPhone outside the Home Screen are told what to do.
const { open, ok, eq, done } = require('./pw.js');
const device = d => { let perm = d.perm || 'default', sub = d.on ? { endpoint: 'https://push.example/this-device', keys: { p256dh: 'BPk', auth: 'YXV0aA' } } : null;
  window.__asked = 0; window.DORAX_PUSH = { supported: () => !d.install, needsInstall: () => !!d.install, permission: () => perm, ask: async () => { window.__asked++; return (perm = 'granted'); }, current: async () => sub, subscribe: async () => (sub = { endpoint: 'https://push.example/this-device', keys: { p256dh: 'BPk', auth: 'YXV0aA' } }), unsubscribe: async () => { sub = null; } }; };
const start = async (d, more) => { const o = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true, ...(more || {}) }); await o.page.addInitScript(device, d); await o.page.reload(); await o.page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); await o.page.evaluate(() => { S.user.greeted = true; S.settings.locale = 'en-US'; navigate('dashboard'); }); return o; };
(async () => {
  let { browser, page, errors } = await start({});
  const st = () => page.evaluate(() => [UI.jstart && UI.jstart.step, document.querySelector('#jstart').dataset.step, document.querySelectorAll('.js-progress li').length, (document.querySelector('#js-h') || {}).innerText]);
  const go = async () => { await page.click('#jstart .js-go'); await page.waitForTimeout(150); };
  // ---------- 1. a page of its own ----------
  await page.click('.jr-btn'); await page.waitForSelector('#jstart');
  eq(await page.evaluate(() => { const r = document.querySelector('#jstart').getBoundingClientRect(); return [r.width >= innerWidth && r.height >= innerHeight, !document.querySelector('.drawer'), !!document.querySelector('#jstart .js-svg .js-walked'), !!document.querySelector('#jstart .js-me'), document.documentElement.classList.contains('js-open'), document.querySelector('#jstart').getAttribute('role')]; }),
    [true, true, true, true, true, 'dialog'], 'no sprint ever: a page over the whole screen (no panel), with the path and the point on it');
  eq(await st(), [0, '0', 6, 'Your way out of debt starts today.'], 'the first step of six');
  // ---------- 2. the steps ----------
  await page.click('.js-light'); await page.waitForTimeout(100);
  eq(await page.evaluate(() => [!!S.journey.checks[S.today], document.querySelector('.js-light').getAttribute('aria-pressed'), /Day 1\. You have started\./.test(document.querySelector('.js-light').innerText)]), [true, 'true', true], 'the flame tapped: today marked for real, “Day 1”');
  await go(); eq((await st())[0], 1, 'Begin: why');
  ok(await page.evaluate(() => /82\.8 million/.test(document.querySelector('#js-h').innerText) && /Serasa, Mapa da Inadimplência, March 2026\./.test(document.querySelector('.js-src').textContent)), 'the figure, with its source');
  eq(await page.evaluate(() => { const a = +document.querySelector('#jstart').dataset.at; return a > .2 && a < .3; }), true, 'the point walked up the path');
  await go(); eq(await page.evaluate(() => [...document.querySelectorAll('.js-how b')].map(b => b.textContent)), ['Streak', 'Sprint', 'The way out'], 'how: three things');
  await go(); eq(await page.evaluate(() => [UI.jstart.step, [...document.querySelectorAll('.js-owed .grow')].map(x => x.textContent)]), [3, ['Nubank card']], 'what is owed: the card already there');
  await page.click('.js-step [data-a="debt-new"]'); await page.waitForSelector('#db-name');
  await page.fill('#db-name', 'Store'); await page.fill('#db-owed', '600'); await page.click('[data-a="debt-save"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!UI.drawer, UI.jstart.step, [...document.querySelectorAll('.js-owed .grow')].map(x => x.textContent)]), [true, 3, ['Store', 'Nubank card']], 'a debt added over the page: back on it, listed');
  // ---------- 3. notifications ----------
  await go(); eq(await page.evaluate(() => [UI.jstart.step, document.querySelector('.js-go').dataset.a, !!document.querySelector('.js-notif')]), [4, 'jstart-push', true], 'every morning: a notification shows how it will look; the button turns them on');
  await page.evaluate(() => A['jstart-step']({ v: 5 })); eq((await st())[0], 4, 'the first sprint cannot be reached around it');
  await page.evaluate(() => { S.user.notify.journey = false; }); await page.click('.js-go'); await page.waitForFunction(() => (UI.push || {}).status === 'on');
  eq(await page.evaluate(() => [window.__asked, S.user.notify.journey, !!document.querySelector('.js-ok'), document.querySelector('.js-go').dataset.a]), [1, true, true, 'jstart-step'], 'on: asked once, the Journey’s reminders on, Next');
  // ---------- 4. the first sprint ----------
  await go();
  eq(await page.evaluate(() => [UI.jstart.step, [...document.querySelectorAll('.js-days button')].map(b => b.getAttribute('aria-checked')), document.querySelector('.js-go').dataset.a, parseFloat(getComputedStyle(document.querySelector('#sp-target')).fontSize) >= 40]), [5, ['false', 'false', 'true'], 'jstart-go', true], 'the first sprint: three large choices, the amount in large figures');
  await go(); eq(await page.evaluate(() => [document.activeElement.id, !!document.querySelector('#js-err'), document.querySelector('#sp-target').getAttribute('aria-invalid')]), ['sp-target', true, 'true'], 'no amount: refused, said under it, the cursor there');
  await page.click('.js-days [data-v="7"]'); await page.fill('#sp-target', '300');
  eq(await page.evaluate(() => !document.querySelector('#js-err')), true, 'typed: the refusal goes');
  await go();
  eq(await page.evaluate(() => [UI.jstart.done, S.journey.sprint.days, S.journey.sprint.target, document.querySelector('#jstart').dataset.step, document.querySelector('#js-h').innerText]), [true, 7, 30000, 'done', 'Your Journey has begun!'], 'started: the page celebrates, the point at the top');
  await go(); eq(await page.evaluate(() => [!UI.jstart, !document.querySelector('#jstart'), UI.drawer && UI.drawer.kind, document.documentElement.classList.contains('js-open')]), [true, true, 'journey', false], 'See my Journey: the page goes, the Journey opens');
  await page.evaluate(() => { A.close(); A['journey-open'](); }); eq(await page.evaluate(() => [!UI.jstart, UI.drawer.kind]), [true, 'journey'], 'from then on, the panel');
  eq(errors, [], 'no error in the console'); await browser.close();
  // ---------- 5. back, close, notifications that cannot be turned on here ----------
  ({ browser, page, errors } = await start({ perm: 'denied' }));
  await page.evaluate(() => { A['journey-open'](); A['jstart-step']({ v: 2 }); backGuard(); }); await page.goBack(); await page.waitForTimeout(200);
  eq(await page.evaluate(() => UI.jstart && UI.jstart.step), 1, 'the phone’s back: a step back');
  await page.keyboard.press('Escape'); eq(await page.evaluate(() => [!UI.jstart, !document.querySelector('#jstart')]), [true, true], 'Escape: closed');
  await page.evaluate(() => { A['journey-open'](); A['jstart-step']({ v: 4 }); }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => /blocked in this browser/.test(document.querySelector('#jstart').innerText) && !!document.querySelector('[data-a="jstart-recheck"]') && document.querySelector('.js-go').disabled), 'blocked: what to do, a way to check again, Next shut');
  await page.click('.js-x'); eq(await page.evaluate(() => !UI.jstart), true, 'the X: closed');
  await page.evaluate(() => { S.journey = S.journey || journeyEmpty(); S.journey.sprints.push({ id: 'old', start: addDays(S.today, -40), days: 30, target: 10000, paid: 10000 }); A['journey-open'](); });
  await page.click('.jr-sprint [data-a="sprint-new"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [!!UI.jstart, UI.jstart && UI.jstart.step]), [true, 4], 'a new sprint with notifications off: the page, at the notifications step');
  eq(errors, [], 'blocked: no error in the console'); await browser.close();
  ({ browser, page, errors } = await start({ install: true }));
  await page.evaluate(() => { A['journey-open'](); A['jstart-step']({ v: 4 }); }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => /add Dorax to the Home Screen first/.test(document.querySelector('#jstart').innerText) && document.documentElement.scrollWidth <= innerWidth), 'an iPhone in a browser tab: told to add Dorax to the Home Screen first');
  eq(errors, [], 'iPhone: no error in the console'); await browser.close();
  ({ browser, page, errors } = await start({}, { viewport: { width: 1440, height: 900 }, touch: false, mobile: false }));
  await page.click('.jr-btn'); await page.waitForSelector('#jstart');
  ok(await page.evaluate(() => { const r = document.querySelector('#jstart').getBoundingClientRect(), b = document.querySelector('#jstart .js-body').getBoundingClientRect(); return r.width >= innerWidth - 1 && r.height >= innerHeight && b.left < innerWidth / 2 && !document.querySelector('.drawer'); }), 'a computer: the whole window too, the words on the left');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-journey-start');
})();
