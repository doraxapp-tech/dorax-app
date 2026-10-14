// QC: a new person's first visit to each main screen (owner, 2026-10-10: "when the person is new, an onboarding for the most important tabs, so they
// know what each part is for and what to do with it; interesting, but not the same as the Journey's").
//   1. a new account opening Summary, Transactions, Plan, Goals, Reports or Accounts & savings: a page over the whole screen, a small drawing of the
//      screen, its purpose, three lines, one button; once per screen;
//   2. the button does the screen's first thing (a fixed cost's form on Plan); "I'll look around first", the X, Escape and the phone's back close it;
//   3. an account older than 30 days, the company's side and the other screens get none; nothing else pops up over it.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, tours: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; S.user.since = S.today; S.user.tours = { dashboard: true }; UI.tour = null; renderTour(); navigate('plan'); });
  await page.waitForSelector('#tour');
  eq(await page.evaluate(() => { const r = document.querySelector('#tour').getBoundingClientRect(); return [UI.tour, r.width >= innerWidth && r.height >= innerHeight, document.querySelector('#tour').getAttribute('role'), !!document.querySelector('#tour .ta-bills'), document.querySelector('#tour-h').innerText, document.querySelectorAll('.tour-does li').length, document.querySelector('.tour-go').dataset.go]; }),
    ['plan', true, 'dialog', true, 'Your month, before it happens.', 3, 'plan-guide'], 'Plan, the first time: a page over the whole screen, its drawing, its purpose, three lines, its first thing (Plan my month, v146)');
  eq(await page.evaluate(() => { const sh = document.querySelector('.tour-sheet').getBoundingClientRect(), fr = document.querySelector('.tour-screen').getBoundingClientRect(), th = document.querySelector('.tour-scene .tour-thing'), sc = document.querySelector('.tour-scroll');
    return [fr.top < sh.top && fr.bottom > sh.top, !!th && th.querySelector('svg.obj.badge') !== null && th.getBoundingClientRect().top < sh.top && th.getBoundingClientRect().bottom > sh.top, +getComputedStyle(document.querySelector('.tour-sheet')).zIndex >= 1, document.querySelectorAll('.tour-does li .tour-ico svg.obj').length, sc.scrollWidth <= sc.clientWidth]; }),
    [true, true, true, 3, true], 'Plan (v215): its drawing in a white frame rising from the sheet’s edge, the month’s calendar beside it, each line with one of Dorax’s things; nothing slides sideways');
  await page.click('.tour-go'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!UI.tour, !document.querySelector('#tour'), UI.drawer && UI.drawer.kind, S.user.tours.plan]), [true, true, 'plan-guide', true], 'its button: the page goes, “Plan your month” opens; seen');
  await page.evaluate(() => { A.close(); navigate('dashboard'); navigate('plan'); });
  eq(await page.evaluate(() => !UI.tour), true, 'Plan again: not shown twice');
  await page.evaluate(() => navigate('goals')); await page.waitForSelector('#tour');
  await page.click('.tour-later'); eq(await page.evaluate(() => [!UI.tour, S.user.tours.goals]), [true, true], 'Goals: “I’ll look around first” closes it, seen');
  await page.evaluate(() => navigate('reports')); await page.waitForSelector('#tour'); await page.keyboard.press('Escape');
  eq(await page.evaluate(() => [!UI.tour, S.user.tours.reports]), [true, true], 'Reports: Escape closes it');
  await page.evaluate(() => { navigate('accounts'); backGuard(); }); await page.waitForSelector('#tour'); await page.goBack(); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [!UI.tour, S.user.tours.accounts, UI.route]), [true, true, 'accounts'], 'Accounts: the phone’s back closes it, the screen stays');
  await page.evaluate(() => navigate('transactions')); await page.waitForSelector('#tour'); await page.click('.tour-x');
  eq(await page.evaluate(() => [!UI.tour, S.user.tours.transactions]), [true, true], 'Transactions: the X closes it');
  await page.evaluate(() => navigate('settings')); eq(await page.evaluate(() => !UI.tour), true, 'another screen: none');
  await page.evaluate(() => { delete S.user.tours.plan; A.space({ v: 'business' }); navigate('plan'); });
  eq(await page.evaluate(() => !UI.tour), true, 'the company’s side: none');
  await page.evaluate(() => { A.space({ v: 'personal' }); S.user.since = addDays(S.today, -45); navigate('dashboard'); navigate('plan'); });
  eq(await page.evaluate(() => !UI.tour), true, 'an account older than 30 days: none');
  await page.evaluate(() => { S.user.since = S.today; S.user.tours = {}; navigate('dashboard'); });
  eq(await page.evaluate(() => [UI.tour, !!document.querySelector('#tour .ta-kpis'), document.querySelector('.tour-go').dataset.a]), ['dashboard', true, 'tour-close'], 'Summary: its drawing, and “Got it”');
  eq(await page.evaluate(() => { const f = document.querySelector('.tour-scene .fig img[src$="shadow/coffee.svg"]'), sh = document.querySelector('.tour-sheet').getBoundingClientRect(); return !!f && Math.abs(f.closest('.fig').getBoundingClientRect().bottom - sh.top) <= 3; }), true, 'Summary (v215): the person at ease stands on the sheet’s edge beside the drawing');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-tours');
})();
