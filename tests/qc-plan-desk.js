// QC (owner, 2026-10-11): "on the computer the Plan tab is too long; the information is so vertical that if I want to compare something I have to
// scroll and I lose sight of the rest; show the most important things; what is not important day to day, put it one click away: the salary is not
// touched much, it can be a pop-up".
//   1. a computer: the figures, then the payments beside the month as planned and the limits, in about one screen and a half (it was four);
//   2. the income one click away ("Change income", a real button at the top of the month, dark with a fine edge: owner, 2026-10-11, "I didn't see it"):
//      a panel; what is changed there shows in the month at once;
//   3. the year month by month one click away: a wide panel, its cells typed in, Plan | Actual | Difference;
//   4. the payments' buttons always in sight; under 1600 px without the "Paid" column; a narrower window stacks the two columns;
//   5. a phone keeps its own page; Spanish; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); scrollTo(0, 0); });
  // ---------- 1. the page ----------
  eq(await page.evaluate(() => { const p = document.querySelector('#paylist').getBoundingClientRect(), m = document.querySelector('#plan-month').getBoundingClientRect(), l = document.querySelector('#limits-card').getBoundingClientRect();
    return [document.querySelectorAll('#view section.tiles .tile').length, Math.abs(p.top - m.top) < 2, p.right < m.left, m.bottom <= l.top, !document.querySelector('#view #plan-year'), !document.querySelector('#view .payrows'), !document.querySelector('#limits-card .lim-month'), document.documentElement.scrollHeight < 1700]; }),
    [4, true, true, true, true, true, true, true], 'the four figures; the payments beside the month and its limits; no year grid, no income form, the month not twice; about a screen and a half');
  // ---------- 2. the income ----------
  eq(await page.evaluate(() => { const b = document.querySelector('#plan-month .card-h .pm-income'), s = getComputedStyle(b); return [b.innerText.trim(), b.classList.contains('btn') && !b.classList.contains('primary'), s.borderTopStyle, s.backgroundColor === 'rgba(0, 0, 0, 0)' || /^rgb\((\d), (\d), (\d)\)$/.test(s.backgroundColor), b.getBoundingClientRect().height >= 30, document.querySelector('#plan-month .lim-mh b').innerText]; }),
    ['Change income', true, 'solid', true, true, await page.evaluate(() => fmt.money(monthPlan(B(), B().month).income, CUR, { trim: true }))], '“Change income”: a real button at the top of the month, dark with a fine edge');
  await page.click('#plan-month .pm-income');
  const inc = await page.evaluate(() => payRows(B(), 2026).find(r => r.to === 'fixed').id);
  eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('#overlay .drawer').classList.contains('pop'), document.querySelectorAll('#overlay .payrow').length, document.activeElement.closest('.payrow') !== null]), ['plan-income', true, await page.evaluate(() => payRows(B(), 2026).length), true], 'a panel in the middle with each payment, the focus on the first');
  await page.fill(`#pv-${inc}`, '6000'); await page.press(`#pv-${inc}`, 'Tab');
  await page.click('#overlay footer [data-a="close"]');
  eq(await page.evaluate(id => [!UI.drawer, payRows(B(), 2026).find(r => r.id === id).values[9], document.querySelector('#plan-month .lim-mh b').innerText], inc), [true, 600000, await page.evaluate(() => fmt.money(monthPlan(B(), B().month).income, CUR, { trim: true }))], '“Done”: closed, and the month shows the new income');
  // ---------- 3. the year ----------
  await page.click('[data-a="plan-year-open"]');
  eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('#overlay .drawer').classList.contains('wide'), !!document.querySelector('#overlay #plan-year .tbl.plan'), document.querySelector('#overlay #plan-year .tbl.plan').getBoundingClientRect().width <= document.querySelector('#overlay .drawer').getBoundingClientRect().width]),
    ['plan-year', true, true, true], '“The year, month by month”: a wide panel with the whole grid');
  await page.fill('#pl-pl-alquiler-11', '1.900'); await page.locator('#pl-pl-alquiler-11').blur();
  eq(await page.evaluate(() => [S.plan.lines.find(l => l.id === 'pl-alquiler').plan[2026][11], UI.drawer && UI.drawer.kind]), [190000, 'plan-year'], 'a cell typed in: kept, and the panel stays open');
  await page.click('#overlay [data-a="plan-mode"][data-v="actual"]');
  eq(await page.evaluate(() => [UI.planMode, UI.drawer.kind, !document.querySelector('#overlay #plan-year tbody input')]), ['actual', 'plan-year', true], 'Actual: in the same panel');
  await page.evaluate(() => { UI.planMode = 'plan'; A.close(); });
  // ---------- 4. the payments' buttons; widths ----------
  ok(await page.evaluate(() => { const c = document.querySelector('#paylist').getBoundingClientRect(); return [...document.querySelectorAll('#paylist tbody .btn')].every(b => b.getBoundingClientRect().right <= c.right + 1); }), '1440 px: every payment’s button in sight');
  eq(await page.evaluate(() => document.querySelector('#paylist thead th:nth-child(4)').getBoundingClientRect().width), 0, '1440 px: no “Paid” column (the status says it)');
  await page.setViewportSize({ width: 1800, height: 900 }); await page.evaluate(() => render());
  ok(await page.evaluate(() => document.querySelector('#paylist thead th:nth-child(4)').getBoundingClientRect().width > 40), '1800 px: the “Paid” column is back');
  await page.setViewportSize({ width: 1180, height: 900 }); await page.evaluate(() => render());
  ok(await page.evaluate(() => document.querySelector('#plan-month').getBoundingClientRect().top > document.querySelector('#paylist').getBoundingClientRect().bottom - 1), '1180 px: the month goes under the payments');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- 5. a phone; Spanish ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); });
  eq(await page.evaluate(() => [!!document.querySelector('#paylist'), !!document.querySelector('#limits-card .lim-month'), !document.querySelector('#plan-month'), !document.querySelector('[data-a="plan-year-open"]'), !!document.querySelector('#desk-plan-year')]), [true, true, true, true, true], 'a phone keeps its own page: the limits with the month, the note about the year');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); });
  eq(await page.evaluate(() => [document.querySelector('[data-a="plan-year-open"]').innerText.trim(), document.querySelector('#plan-month .pm-income').innerText.trim(), document.querySelector('#plan-month h2').innerText]), ['El año, mes a mes', 'Cambiar ingresos', 'Oct, según el plan'], 'es: “El año, mes a mes”, “Cambiar ingresos”');
  eq(errors, [], 'es: no error in the console'); await browser.close();
  done('qc-plan-desk');
})().catch(e => { console.error('qc-plan-desk: Error', e); process.exit(1); });
