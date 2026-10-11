// QC of Sprint 3 (owner, 2026-10-10: "do the sprints"; claude/open-gaps-funcionalidades-2026-10-10.md, item 5): the close of the month, guided.
//   1. offered in the first ten days of a month, while the month before has movements and its close has not been seen: a note at the top of the
//      summary, and "See the close" on the bell's "September is closed"; not after the 10th, not on the company's side, not once seen;
//   2. three steps on the whole screen of a phone: how it closed (left over, came in and went out side by side, the month before, the limits),
//      the goals (each against its plan), the month that starts (how much a day, the Plan);
//   3. the end: "You did it!" with confetti when it was met; a kind word when it was not;
//   4. "Not now"; Spanish; 320 px; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  const c = await page.evaluate(() => monthClose(B(), '2026-09', CUR));
  const money = v => page.evaluate(v => fmt.money(v, CUR, { round: true }), v);
  // ---------- 1. offered ----------
  eq(await page.evaluate(() => { const a = document.querySelector('#mc-ask'); return a && [a.querySelector('b').innerText, a.querySelector('small').innerText, [...a.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 40), a.compareDocumentPosition(document.querySelector('#free-card')) & Node.DOCUMENT_POSITION_FOLLOWING ? 'above' : 'below']; }),
    ['September closed', 'See how it went, in 3 short steps.', true, 'above'], 'October 2nd: at the top of the summary, “September closed”, a thumb high');
  eq(await page.evaluate(() => { S.user.notify.summary = true; A.reminders(); const b = document.querySelector('#overlay [data-a="month-close"]'); const r = b && b.dataset.ym; A.close(); return r; }), '2026-09', 'with the month’s summary on in the profile, the bell’s “September is closed” opens it too');
  // ---------- 2. the steps ----------
  await page.click('#mc-ask [data-a="month-close"]');
  eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('#overlay .drawer').classList.contains('full'), getComputedStyle(document.querySelector('#overlay .drawer')).height === innerHeight + 'px', document.activeElement.id]), ['month-close', true, true, 'mc-h'], 'the whole screen of the phone, the focus on its title');
  eq(await page.evaluate(() => [document.querySelector('.pg-step').innerText.toLowerCase(), document.querySelector('#mc-h').innerText, document.querySelector('.mc-big').innerText, [...document.querySelectorAll('.mc-bars li')].map(l => l.querySelector('.mc-bl').innerText + ' ' + l.querySelector('b').innerText), (document.querySelector('.mc .note') || {}).innerText, document.querySelector('.mc-lims').innerText]),
    ['step 1 of 3', 'How September closed', `${await money(c.saved)} left over`, [`Came in ${await money(c.income)}`, `Went out ${await money(c.expenses)}`], `In August, ${await money(c.before)} was left over.`, `You kept all your ${c.limits} limits.`], 'step 1: what was left over, what came in and went out side by side, August, the limits');
  await page.click('[data-a="month-close-step"][data-v="1"]');
  eq(await page.evaluate(() => [document.querySelector('#mc-h').innerText, document.querySelector('.mc-big').innerText, [...document.querySelectorAll('.mc-goals li')].map(l => [l.querySelector('b').innerText, l.classList.contains('ok')]), document.querySelector('.mc .note').innerText]),
    ['Your goals in September', `${await money(c.done)} set aside`, c.goals.map(g => [g.name, g.done >= g.planned]), 'All that was planned, and the goals moved on.'], 'step 2: each goal, against its plan');
  await page.click('[data-a="month-close-step"][data-v="2"]');
  eq(await page.evaluate(() => [document.querySelector('#mc-h').innerText, !!document.querySelector('.mc .fu-big .fu-n'), document.querySelector('.mc-lead').innerText]), ['October starts', true, 'This month you can spend'], 'step 3: October, and how much a day');
  await page.click('[data-a="month-close-step"][data-v="1"]'); eq(await page.evaluate(() => UI.drawer.step), 1, '“Back” goes back');
  await page.click('[data-a="month-close-step"][data-v="2"]'); await page.click('[data-a="month-close-step"][data-v="3"]');
  eq(await page.evaluate(() => [document.querySelector('#mc-h').innerText, document.querySelector('.mc-end').classList.contains('good'), !!document.getElementById('confetti') || reducedMotion(), S.user.closeSeen['2026-09'], !document.querySelector('.mc-dots')]), ['You did it!', true, true, true, true], 'the end: “You did it!”, with confetti; the close is kept as seen');
  await page.click('[data-a="month-close-done"]');
  eq(await page.evaluate(() => [!UI.drawer, !document.querySelector('#mc-ask')]), [true, true], '“Done”: closed, and the summary no longer offers it');
  // ---------- 3. a month that was not met ----------
  await page.evaluate(() => { S.user.closeSeen = {}; S.transactions.push({ id: 'big-sep', accountId: 'nu-conta', date: '2026-09-20', type: 'expense', amount: -600000, currency: 'BRL', categoryId: 'casa', subcategoryId: 'supermercado', status: 'confirmed', merchant: 'Big' }); render(); A['month-close']({ ym: '2026-09' }); });
  const bad = await page.evaluate(() => monthClose(B(), '2026-09', CUR));
  eq(await page.evaluate(() => [document.querySelector('.mc-big').innerText, /Over: /.test(document.querySelector('.mc-lims').innerText)]), [`${await money(-bad.saved)} more went out than came in`, true], 'not met: what went out above what came in, and the limit gone over, by name');
  await page.evaluate(() => A['month-close-step']({ v: '3' }));
  eq(await page.evaluate(() => [document.querySelector('#mc-h').innerText, document.querySelector('.mc-end p').innerText, document.querySelector('.mc-end').classList.contains('good')]), ['September is behind you', 'It did not all go as planned, and that happens. Every month starts again: October is a new one.', false], 'its end: a kind word, no blame');
  await page.evaluate(() => { A['month-close-done'](); S.transactions = S.transactions.filter(x => x.id !== 'big-sep'); S.user.closeSeen = {}; render(); });
  // ---------- not now; after the 10th; the company ----------
  await page.click('#mc-ask .mc-ask-x');
  eq(await page.evaluate(() => [!document.querySelector('#mc-ask'), S.user.closeSeen['2026-09'], UI.toast.msg]), [true, true, 'Hidden until next month.'], '“Not now”: hidden for this month, and it says so');
  eq(await page.evaluate(() => { S.user.closeSeen = {}; const keep = S.today; S.today = '2026-10-15'; const r = mcOffered(); S.today = keep; return r; }), '', 'after the 10th: not offered');
  eq(await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); const r = !document.querySelector('#mc-ask'); A.space({ v: 'personal' }); return r; }), true, 'the company’s side: not offered');
  eq(await page.evaluate(() => { const keep = S.goals; S.goals = []; A['month-close']({ ym: '2026-09' }); A['month-close-step']({ v: '1' }); const r = [document.querySelector('.mc .note').innerText.startsWith('You had no goals'), !!document.querySelector('[data-a="month-close-go"][data-v="goals"]')]; A.close(); S.goals = keep; return r; }), [true, true], 'no goals: said, with the way to create one');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- Spanish, 320 px ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  eq(await page.evaluate(() => document.querySelector('#mc-ask b').innerText), 'Septiembre cerró', 'es: “Septiembre cerró”');
  await page.click('#mc-ask [data-a="month-close"]');
  eq(await page.evaluate(() => [document.querySelector('#overlay .drawer h2').innerText, document.querySelector('#mc-h').innerText, document.querySelector('.mc-big').innerText.split(' ').slice(0, 2).join(' ')]), ['El cierre de septiembre', 'Cómo cerró septiembre', 'Te sobraron'], 'es: in plain words, months in lower case inside sentences');
  eq(await page.evaluate(() => { const b = document.querySelector('#overlay .drawer .body'); return [b.scrollWidth <= b.clientWidth, document.documentElement.scrollWidth - innerWidth]; }), [true, 0], 'es, 320 px: nothing to drag sideways');
  await page.evaluate(() => A['month-close-step']({ v: '3' }));
  eq(await page.evaluate(() => document.querySelector('#mc-h').innerText), '¡Lo lograste!', 'es: “¡Lo lograste!”');
  eq(errors, [], 'es: no error in the console'); await browser.close();
  done('qc-month-close');
})().catch(e => { console.error('qc-month-close: Error', e); process.exit(1); });
