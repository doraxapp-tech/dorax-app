// QC: the bell, the notices and the flame (owner, 2026-10-10: "animate the sprint's flame each time the summary is entered; the bell is not only for
// reminders, it is also for the web app's notifications: group them so they are organised; I don't like the green of the notifications that
// show in the app: all of them a medium-light black with an iOS-style border").
//   1. the bell's panel is "Notifications", in two parts chosen at the top: Reminders (what is due) and Updates (what Dorax said in a notice);
//   2. an update not seen counts on the bell; the panel opens on Updates when nothing is due; seen, the count goes and the dot stays until redrawn;
//      milestones and curiosities each under their heading, newest first, the curiosity with its source, the same one shown again not repeated;
//   3. every notice is dark (the toast, a curiosity, a milestone), in both themes, with a fine light edge;
//   4. arriving at the summary lights the Journey's flame; drawing the summary again does not; leaving and coming back does.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, motion: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.settings.locale = 'en-US'; navigate('dashboard'); });
  // ---------- 1. two parts ----------
  await page.evaluate(() => A.reminders()); await page.waitForSelector('.drawer .bell-tabs');
  eq(await page.evaluate(() => [UI.drawer.title, document.querySelector('.drawer header h2').textContent, [...document.querySelectorAll('.bell-tabs button')].map(b => [b.dataset.v, b.getAttribute('aria-pressed')]), /Reminders · \d+/.test(document.querySelector('.bell-tabs [data-v="rem"]').textContent) || activeReminders().length === 0]),
    ['Notifications', 'Notifications', [['rem', 'true'], ['news', 'false']], true], 'the bell’s panel: “Notifications”, Reminders and Updates at the top, Reminders first while something is due');
  await page.click('.bell-tabs [data-v="news"]');
  ok(await page.evaluate(() => /No updates yet/.test(document.querySelector('.drawer .body').innerText) && !document.querySelector('.drawer .rem')), 'Updates, with nothing yet: says what will be there');
  await page.evaluate(() => A.close());
  // ---------- 2. updates ----------
  await page.evaluate(() => { inboxAdd({ kind: 'curio', id: 'fgc' }); inboxAdd({ kind: 'cheer', cheer: 'mark', mark: 90 }); inboxAdd({ kind: 'curio', id: 'overdraft' }); inboxAdd({ kind: 'curio', id: 'fgc' }); });
  eq(await page.evaluate(() => [S.user.inbox.map(x => x.key), inboxUnread(), +document.querySelector('#topbar .bell .count').textContent === activeReminders().length + 3, document.querySelector('#topbar .bell').getAttribute('aria-label')]),
    [['curio:fgc', 'curio:overdraft', 'cheer:90'], 3, true, `Notifications: ${await page.evaluate(() => activeReminders().length + 3)} to look at`], 'three updates kept (the same curiosity again moves to the top), counted on the bell at once');
  await page.evaluate(() => A.reminders({ tab: 'news' })); await page.waitForSelector('.nt-row');
  eq(await page.evaluate(() => [[...document.querySelectorAll('.nt-group h3')].map(h => h.textContent), [...document.querySelectorAll('.nt-row')].map(r => r.querySelector('.nt-h b').textContent), document.querySelectorAll('.nt-row.new .nt-dot').length, /Source: FGC/.test(document.querySelector('.nt-group:last-child').innerText), inboxUnread()]),
    [['Milestones', 'Curiosities'], ['You passed 3 months of freedom!', 'Did you know?', 'Did you know?'], 3, true, 0], 'Updates: milestones, then curiosities, each under its heading, new ones with a dot; the curiosity with its source; now seen');
  ok(await page.evaluate(() => +((document.querySelector('#topbar .bell .count') || {}).textContent || 0) === activeReminders().length), 'seen: the bell counts only what is due');
  await page.click('.bell-tabs [data-v="rem"]'); await page.click('.bell-tabs [data-v="news"]');
  eq(await page.evaluate(() => document.querySelectorAll('.nt-row.new').length), 3, 'the dots stay while the panel is open');
  await page.evaluate(() => { A.close(); A.reminders(); });
  eq(await page.evaluate(() => [UI.drawer.tab === 'rem' || !activeReminders().length, document.querySelectorAll('.nt-row.new').length]), [true, 0], 'opened again: nothing new');
  await page.evaluate(() => { A.close(); S.user.remind.snoozed = {}; for (const r of bellItems()) S.user.remind.snoozed[r.id] = S.today; inboxAdd({ kind: 'curio', id: 'thirteenth' }); A.reminders(); });
  eq(await page.evaluate(() => UI.drawer.tab), 'news', 'nothing due and an update waiting: the panel opens on Updates');
  await page.evaluate(() => { A.close(); S.user.remind.snoozed = {}; });
  // ---------- 3. dark notices ----------
  const look = sel => page.evaluate(sel => { const c = getComputedStyle(document.querySelector(sel)); return [c.backgroundColor, c.borderTopColor, c.color]; }, sel);
  await page.evaluate(() => toast('Saved.')); await page.waitForSelector('#toast');
  eq(await look('#toast'), ['rgba(44, 44, 46, 0.94)', 'rgba(255, 255, 255, 0.14)', 'rgb(255, 255, 255)'], 'the toast: a medium-light black, a fine light edge, white words');
  await page.evaluate(() => { UI.curio = { cheer: 'mark', mark: 90 }; renderCurio(); }); await page.waitForSelector('#curio');
  eq([await look('#curio'), await page.evaluate(() => getComputedStyle(document.querySelector('#curio b')).color)], [['rgba(44, 44, 46, 0.94)', 'rgba(255, 255, 255, 0.14)', 'rgb(255, 255, 255)'], 'rgb(255, 255, 255)'], 'a milestone: the same, its title white, no green');
  await page.evaluate(() => { UI.curio = null; renderCurio(); S.settings.theme = 'light'; applyTheme && applyTheme(); render(); toast('Saved.'); });
  eq((await look('#toast'))[0], 'rgba(44, 44, 46, 0.94)', 'in the light theme too');
  await page.evaluate(() => { S.settings.theme = 'dark'; applyTheme && applyTheme(); render(); });
  // ---------- 4. the flame ----------
  await page.evaluate(() => navigate('plan')); await page.click('#nav a[href="#dashboard"]'); await page.waitForTimeout(80);
  eq(await page.evaluate(() => { const b = document.querySelector('.jr-btn'); return [b.classList.contains('lit'), getComputedStyle(b.querySelector('svg')).animationName]; }), [true, 'jr-catch'], 'arriving at the summary: the flame lights up');
  await page.evaluate(() => render()); await page.waitForTimeout(50);
  eq(await page.evaluate(() => document.querySelector('.jr-btn').classList.contains('lit')), false, 'the summary drawn again: the flame stays still');
  await page.click('#nav a[href="#reports"]'); await page.click('#nav a[href="#dashboard"]'); await page.waitForTimeout(50);
  eq(await page.evaluate(() => document.querySelector('.jr-btn').classList.contains('lit')), true, 'away and back: it lights up again');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-bell');
})();
