// QC: the way back (owner, 2026-10-09: "on every tab and sub-menu of the web app add a button to go back, to the previous action: sometimes I open
// something and cannot go back, and have to look for it again").
//   1. a category pressed in Reports opens Transactions: "‹ Reports" is before the title; back is Reports, on the same month, the category still open;
//      with nowhere left to go, no way back is shown;
//   2. screen after screen from the menu: back goes through them in reverse;
//   3. a panel opened from a panel: ‹ before its title goes back to the first; a panel that closes takes the panels behind it along;
//   4. from a panel to a screen ("View all" in a card): back is the screen with that panel open again;
//   5. changing side is not a step (its own switch is the way back); a step back lands on the side its place was on;
//   6. the browser's own Back (a phone's back button): a panel open closes first, then the screens go back;
//   7. a phone: no button on top (owner, 2026-10-10: "remove the back button on the phone beside the profile photo"); its own back goes back, and the
//      bar at the foot counts as steps;
//   8. thirty steps are kept, the oldest forgotten.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.month = '2026-09'; navigate('reports'); }); await page.waitForSelector('#rep-ring-cat');
  const backPc = () => page.evaluate(() => { const b = document.querySelector('#back-pc button'); return b ? [b.textContent.trim(), b.getAttribute('aria-label')] : null; });
  eq(await backPc(), null, 'nowhere to go back to yet: no way back');
  // ---------- 1. Reports → Transactions → back ----------
  const cat = await page.evaluate(() => document.querySelector('#rep-ring-cat .rg-row[data-a="rep-drill"]').dataset.cat);
  await page.click(`#rep-ring-cat .rg-row[data-cat="${cat}"]`); await page.click('#rep-ring-cat button.rg-row[data-a="filter-cat"]'); await page.waitForTimeout(150);
  eq([await page.evaluate(() => UI.route), await backPc()], ['transactions', ['Reports', 'Back to Reports']], 'a subcategory of the ring opens Transactions; “‹ Reports” before the title');
  await page.evaluate(() => { S.month = '2026-08'; });      // what the new screen does is its own
  await page.click('#back-pc button'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.route, S.month, UI.repDrill, !!document.querySelector('#rep-ring-cat .rg-back'), BACK.stack.length]), ['reports', '2026-09', cat, true, 0], 'back: Reports, on its month, the category still open');
  eq(await backPc(), null, 'and nothing more to go back to');
  // ---------- 2. the menu, screen after screen ----------
  await page.click('#nav a[href="#plan"]'); await page.click('#nav a[href="#goals"]'); await page.click('#nav a[href="#accounts"]'); await page.waitForTimeout(100);
  eq(await backPc(), ['Goals', 'Back to Goals'], 'after Plan, Goals and Accounts from the menu: back is Goals');
  await page.click('#back-pc button'); await page.click('#back-pc button'); await page.waitForTimeout(100);
  eq([await page.evaluate(() => UI.route), await backPc()], ['plan', ['Reports', 'Back to Reports']], 'twice: Plan, and Reports before it');
  // ---------- 3. a panel from a panel ----------
  await page.evaluate(() => navigate('accounts')); await page.click('.cc-item[data-id="mp"] .cc-tap'); await page.waitForSelector('#overlay .cv');
  eq(await page.evaluate(() => !document.querySelector('#overlay .dr-back')), true, 'a panel opened over a screen: its X is the way back, no ‹');
  await page.click('[data-a="card-do"][data-v="edit"]'); await page.waitForSelector('#a-name');
  eq(await page.evaluate(() => { const b = document.querySelector('#overlay header .dr-back'); return b && [b.getAttribute('aria-label'), b.parentElement.nextElementSibling.tagName]; }), ['Back to Mercado Pago', 'H2'], 'the account’s form, opened from the card: ‹ before its title, back to the card');
  await page.click('#overlay .dr-back'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.id]), ['card-view', 'mp'], 'back: the card’s panel');
  await page.click('[data-a="card-do"][data-v="edit"]'); await page.waitForSelector('#a-name'); await page.click('#overlay header [data-a="close"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.drawer, BACK.stack.some(p => p.drawer)]), [null, false], 'the form closed with its X: the panels behind it go too');
  // ---------- 4. from a panel to a screen ----------
  await page.click('.cc-item[data-id="nu-conta"] .cc-tap'); await page.waitForSelector('#overlay .cv-ops');
  await page.click('#overlay .cv-ops .op-head .linkbtn'); await page.waitForTimeout(150);
  eq([await page.evaluate(() => [UI.route, UI.drawer])], [['transactions', null]], '“View all” under a card: Transactions');
  eq(await backPc(), ['Nubank account', 'Back to Nubank account'], 'the way back names the card it came from');
  await page.click('#back-pc button'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.route, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.id, !!document.querySelector('#overlay .cv')]), ['accounts', 'card-view', 'nu-conta', true], 'back: Accounts, with that card open again');
  await page.click('#overlay header [data-a="close"]'); await page.waitForTimeout(250);
  // ---------- 5. the other side ----------
  await page.evaluate(() => navigate('reports')); await page.click('#nav a[href="#plan"]'); await page.evaluate(() => document.querySelector('[data-a="space"][data-v="business"]').click()); await page.waitForTimeout(900);
  eq([await page.evaluate(() => UI.space), await backPc()], ['business', ['Reports', 'Back to Reports · Household']], 'changing side is not a step (its switch is the way back, and the top bar does not move); the way back tells a screen reader the side it returns to');
  await page.click('#back-pc button'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.space, UI.route]), ['personal', 'reports'], 'back: the household’s Reports');
  // ---------- 6. the browser's own Back ----------
  await page.click('#nav a[href="#dashboard"]'); await page.click('#nav a[href="#reports"]'); await page.waitForTimeout(100);
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-amount'); await page.evaluate(() => backGuard());
  await page.goBack(); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [!!UI.session, UI.drawer, UI.route]), [true, null, 'reports'], 'a phone’s back with a panel open: the panel closes, the screen stays');
  await page.goBack(); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [!!UI.session, UI.route, location.hash]), [true, 'dashboard', '#dashboard'], 'again: the screen before');
  // ---------- 8. thirty steps ----------
  eq(await page.evaluate(() => { for (let i = 0; i < 40; i++) backPush({ route: i % 2 ? 'plan' : 'goals', space: 'personal', key: '', drawer: null, tx: {}, y: i }); return [BACK.stack.length, BACK.stack[0].y]; }), [30, 10], 'thirty steps kept, the oldest forgotten');
  eq(errors, [], 'no error in the console'); await browser.close();
  // ---------- 7. a phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); }); await page.waitForTimeout(200);
  await page.tap('#tabbar a[href="#plan"]'); await page.tap('#tabbar a[href="#goals"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!document.querySelector('#back-ph, .back-btn.ph'), !document.querySelector('.bar-left [data-a="back"]'), getComputedStyle(document.querySelector('#back-pc')).display, (document.querySelector('.bar-left').firstElementChild || {}).className]), [true, true, 'none', 'bar-name'], 'a phone, after Plan and Goals from the bar at the foot: no way back on top; the screen’s name is first (v128)');
  await page.evaluate(() => backGuard()); await page.goBack(); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [!!UI.session, UI.route]), [true, 'plan'], 'the phone’s own back: Plan');
  await page.evaluate(() => backGuard()); await page.goBack(); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [!!UI.session, UI.route]), [true, 'dashboard'], 'again: Resumen');
  eq(errors, [], 'no error in the console (phone)'); await browser.close();
  done('qc-back');
})();
