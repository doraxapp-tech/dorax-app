// QC (owner, 2026-10-11): "the 'Not enough money' card: its 'Set your pay day' button takes me to the Plan and makes me look for the button that
// changes the salary. Make sure ALL the buttons that change the salary open the salary's pop-up instead of making the person look for a hidden button".
//   1. the summary's "Set your pay day" opens the income's panel in the middle of the screen, on the first pay day; the page stays where it is;
//   2. the same from the panel of "You can spend" (and on a phone, from its sheet);
//   3. the guide's "Change income" opens the panel, and its Done goes back to the guide;
//   4. the first steps' "Add income" opens the panel with a new payment, its name ready to type;
//   5. no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.user.closeSeen = { '2026-09': true }; navigate('dashboard'); });
  // ---------- 1. the summary's button ----------
  ok(await page.locator('#free-card [data-a="plan-income"]').count() === 1 && await page.locator('#free-card a[href="#plan"]').count() === 0, 'the summary: “Set your pay day” is a button, not a way to the Plan');
  await page.click('#free-card [data-a="plan-income"]');
  eq(await page.evaluate(() => [UI.route, UI.drawer && UI.drawer.kind, document.querySelector('#overlay .drawer').classList.contains('pop'), document.activeElement.closest('.pay-day') !== null, document.querySelectorAll('#overlay .payrow').length > 0]), ['dashboard', 'plan-income', true, true, true], '“Set your pay day”: the income’s panel in the middle, on the first pay day; the summary stays');
  await page.selectOption('#overlay .pay-day select >> nth=0', '5'); await page.click('#overlay footer [data-a="plan-income-done"]');
  ok(await page.evaluate(() => !UI.drawer && payRows(B(), 2026).some(r => r.day === 5)), 'a pay day chosen there is kept; Done closes the panel');
  // ---------- 2. from the panel of "You can spend" ----------
  await page.evaluate(() => { payRows(B(), 2026).forEach(r => { delete r.day; }); render(); });
  await page.click('#free-card .fu-how'); await page.waitForSelector('#overlay [data-a="free-pay"]');
  await page.click('#overlay [data-a="free-pay"]');
  eq(await page.evaluate(() => [UI.route, UI.drawer && UI.drawer.kind]), ['dashboard', 'plan-income'], 'from “How we worked it out”: the same panel');
  await page.evaluate(() => A.close());
  // ---------- 3. the guide ----------
  await page.evaluate(() => { navigate('plan'); A['plan-guide']({}); });
  ok(await page.locator('#overlay .btn[data-a="pg-income-plan"]').count() === 1, 'the guide: “Change income” is a real button');
  await page.click('#overlay [data-a="pg-income-plan"]');
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.ret]), ['plan-income', 'guide'], 'it opens the income’s panel');
  await page.click('#overlay footer [data-a="plan-income-done"]');
  eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'plan-guide', 'Done goes back to the guide');
  await page.evaluate(() => A.close());
  // ---------- 4. the first steps' "Add income" ----------
  const before = await page.evaluate(() => payRows(B(), 2026).length);
  await page.evaluate(() => { navigate('profile'); A['step-income'](); });
  eq(await page.evaluate(n => [UI.route, UI.drawer && UI.drawer.kind, payRows(B(), 2026).length === n + 1, /^pn-/.test(document.activeElement.id)], before), ['profile', 'plan-income', true, true], 'the first steps’ “Add income”: the panel with a new payment, its name ready to type');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- a phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  await page.tap('#free-open'); await page.waitForSelector('#overlay [data-a="free-pay"]'); await page.tap('#overlay [data-a="free-pay"]');
  eq(await page.evaluate(() => [UI.route, UI.drawer && UI.drawer.kind, document.documentElement.scrollWidth <= innerWidth, [...document.querySelectorAll('#overlay .payrow select, #overlay .payrow input')].every(e => e.getBoundingClientRect().right <= innerWidth)]), ['dashboard', 'plan-income', true, true], 'phone: “Di qué día cobras” opens the income’s panel too, and it fits the screen');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  done('qc-income-pop');
})().catch(e => { console.error('qc-income-pop: Error', e); process.exit(1); });
