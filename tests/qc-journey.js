// QC: the Journey out of debt (owner, 2026-10-10: "add to the summary a black button with a subtle border, white words and an icon, called Journey;
// inside, something like the picture and other relevant information. The main goal is to run sprints to get out of debt, with reminders, to answer
// 'How do I get out of debt?'"; "the button is at the right of the date picker"). He chose: the person marks each day; the debts are the ones the
// person writes plus the cards already in the app; a sprint lasts 7, 14 or 30 days, as the person chooses.
//   1. the summary: the button right after the month, black, a subtle border, white words, the flame; the streak beside it; on a phone too;
//   2. the panel: the streak and the week; today and yesterday can be marked (and unmarked), the other days cannot;
//   3. a debt: what it is and what is owed are required; the interest, the payment and the due day optional (a wrong day refused); a payment lowers it;
//      editing what is owed keeps the payments; the order of the list moves; the cards that owe money come in by themselves;
//   4. a sprint: 7, 14 or 30 days and an amount; payments to debts and to cards count; its bar and its days; closing it keeps it and opens the next;
//   5. out of debt: the month at the pace of the sprint, and with R$ 100 more; a pace below the interest is said plainly;
//   6. reminders: yesterday to mark while a sprint runs, a debt's payment coming due, a sprint ending; in the bell, in the push and the email words,
//      and a switch in the profile; the server's copy of the rules follows;
//   7. each side keeps its own journey.
const { open, ok, eq, done } = require('./pw.js');
const pushRefresh_wait = page => page.evaluate(() => pushRefresh());      // this device's notifications, read before the first panel opens
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  // this device's notifications on (window.DORAX_PUSH stands in for the browser, as in qc-install.js): a sprint needs them (v132); the first time is
  // the onboarding (tests/qc-journey-start.js), so this account has had a sprint before
  await page.addInitScript(() => { const sub = { endpoint: 'https://push.example/this-device', keys: { p256dh: 'BPk', auth: 'YXV0aA' } }; window.DORAX_PUSH = { supported: () => true, needsInstall: () => false, permission: () => 'granted', ask: async () => 'granted', current: async () => sub, subscribe: async () => sub, unsubscribe: async () => {} }; });
  await page.reload(); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); await pushRefresh_wait(page);
  await page.evaluate(() => { S.user.greeted = true; S.settings.locale = 'en-US'; S.journey = journeyEmpty(); S.journey.sprints.push({ id: 'sp0', start: addDays(S.today, -70), days: 30, target: 50000, paid: 50000 }); navigate('dashboard'); });
  // ---------- 1. the button ----------
  eq(await page.evaluate(() => { const b = document.querySelector('.pagehead .jr-btn'), m = document.querySelector('.pagehead .month'), r = b.getBoundingClientRect(), q = m.getBoundingClientRect(), cs = getComputedStyle(b);
      return [b.dataset.a, b.innerText.trim(), r.left >= q.right && r.left - q.right <= 16, Math.abs((r.top + r.bottom) / 2 - (q.top + q.bottom) / 2) <= 2, cs.backgroundColor, cs.color, cs.borderTopWidth, !!b.querySelector('svg'), b.getAttribute('aria-haspopup')]; }),
    ['journey-open', 'Journey', true, true, 'rgb(0, 0, 0)', 'rgb(255, 255, 255)', '1px', true, 'dialog'], 'the summary: “Journey” right after the month, on its row; black, a subtle border, white words, an icon; it opens a panel');
  ok(await page.evaluate(() => ['plan', 'goals', 'reports'].every(r => { navigate(r); return !document.querySelector('.jr-btn'); })), 'only on the summary');
  await page.evaluate(() => navigate('dashboard'));
  // ---------- 2. the streak and the week ----------
  await page.click('.jr-btn'); await page.waitForSelector('.drawer .jr-card');
  const week = () => page.evaluate(() => [...document.querySelectorAll('.jr-week li')].map(li => { const d = li.querySelector('.jr-day'); return [d.tagName, [...d.classList].filter(c => c !== 'jr-day').join(), li.querySelector('small').textContent]; }));
  const w0 = await week(), dow = await page.evaluate(() => (new Date(S.today + 'T00:00:00Z').getUTCDay() + 6) % 7);
  eq([w0.length, w0.map(x => x[2]).join(' '), w0[dow][0], w0[dow][1], w0.filter(x => x[0] === 'BUTTON').length, await page.evaluate(() => document.querySelector('.jr-streak').innerText.replace(/\s+/g, ' ').trim())],
    [7, 'Mon Tue Wed Thu Fri Sat Sun', 'BUTTON', 'now', dow === 0 ? 1 : 2, 'STREAK 0 DAYS'], 'the week, Monday first: today a ring that can be pressed, yesterday too; the other days cannot; the streak at 0');
  await page.click('.jr-ask [data-a="journey-mark"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [S.journey.checks[S.today], document.querySelector('.jr-streak .num').textContent, !!document.querySelector('.jr-ok'), document.querySelector(`.jr-day[data-d="${S.today}"]`).getAttribute('aria-pressed'), document.querySelector('.pagehead .jr-btn b').textContent]),
    [true, '1', true, 'true', '1'], 'today marked: the streak is 1, the day has its check, the button says 1');
  await page.evaluate(() => A['journey-mark']({ d: addDays(S.today, -1) }));
  eq(await page.evaluate(() => document.querySelector('.jr-streak .num').textContent), '2', 'yesterday marked too: 2 in a row');
  await page.evaluate(() => A['journey-mark']({ d: addDays(S.today, -5) }));
  eq(await page.evaluate(() => !S.journey.checks[addDays(S.today, -5)]), true, 'a day before yesterday cannot be marked');
  await page.evaluate(() => A['journey-mark']({ d: S.today }));
  eq(await page.evaluate(() => [!S.journey.checks[S.today], document.querySelector('.jr-streak .num').textContent, !!document.querySelector('.jr-ask')]), [true, '1', true], 'pressed again, today is unmarked; the streak counts up to yesterday (the day is not over)');
  // ---------- 3. debts ----------
  eq(await page.evaluate(() => [...document.querySelectorAll('#jr-debts .jr-row')].map(r => r.querySelector('.grow b').textContent + ' · ' + r.querySelector('.grow small').textContent.replace(/\d{2}$/, 'DD'))), ['Nubank card · Card invoice, due Oct DD'], 'the card that owes money comes in by itself, with its invoice’s due date');
  await page.click('#jr-debts [data-a="debt-new"]'); await page.waitForSelector('#db-name');
  ok(await page.evaluate(() => ['db-name', 'db-owed'].every(id => !!document.querySelector(`label[for="${id}"] .req`)) && ['db-rate', 'db-min', 'db-due'].every(id => !document.querySelector(`label[for="${id}"] .req`))), 'what it is and what is owed wear the *; the interest, the payment and the due day are optional');
  await page.click('[data-a="debt-save"]'); eq(await page.evaluate(() => [document.activeElement.id, document.querySelector('#db-name').getAttribute('aria-invalid')]), ['db-name', 'true'], 'no name: refused, the cursor there');
  await page.fill('#db-name', 'Bank loan'); await page.click('[data-a="debt-save"]'); eq(await page.evaluate(() => document.activeElement.id), 'db-owed', 'nothing owed: refused');
  await page.fill('#db-owed', '8000'); await page.fill('#db-rate', '3,5'); await page.fill('#db-min', '400'); await page.fill('#db-due', '40'); await page.click('[data-a="debt-save"]');
  eq(await page.evaluate(() => document.activeElement.id), 'db-due', 'a due day of 40: refused');
  await page.fill('#db-due', '15'); await page.click('[data-a="debt-save"]'); await page.waitForSelector('.drawer .jr-card');
  eq(await page.evaluate(() => { const d = S.journey.debts[0]; return [d.name, d.owed, d.rate, d.min, d.due, UI.drawer.kind]; }), ['Bank loan', 800000, 3.5, 40000, 15, 'journey'], 'saved as written: R$ 8,000 owed, 3.5% a month, R$ 400 a month, due on the 15th; back to the journey');
  ok(await page.evaluate(() => /Bank loan\s*3\.5% a month · payment R\$ 400 · due on the 15/.test(document.querySelector('#jr-debts .jr-row').innerText)), 'its line says it, in the person’s words', await page.evaluate(() => document.querySelector('#jr-debts .jr-row').innerText));
  await page.evaluate(() => { A['debt-new'](); Object.assign(UI.drawer.draft, { name: 'Overdraft', owedText: '1200', rateText: '8' }); A['debt-save'](); });
  eq(await page.evaluate(() => [...document.querySelectorAll('#jr-debts .jr-row .grow b')].map(b => b.textContent)), ['Bank loan', 'Overdraft', 'Nubank card'], 'the written debts in their order, then the card');
  await page.click('#jr-debts [data-a="debt-move"][data-v="1"]'); await page.waitForTimeout(100);
  eq(await page.evaluate(() => S.journey.debts.map(d => d.name)), ['Overdraft', 'Bank loan'], 'moved down: the order changes (where the money above the payments goes first)');
  ok(await page.evaluate(() => /the highest interest first .* or the smallest first .* The order is yours\./.test(document.querySelector('#jr-debts').innerText)), 'the two common orders are explained; none is chosen for the person');
  // ---------- 4. a sprint ----------
  await page.click('.jr-sprint [data-a="sprint-new"]'); await page.waitForSelector('#sp-target');
  ok(await page.evaluate(() => /Your monthly payments, for these days: R\$ 400\.00/.test(document.querySelector('.drawer .body').innerText)), 'the sprint form offers the monthly payments for its days');
  eq(await page.evaluate(() => document.querySelector('#sp-target').value), '500', 'it starts from the last sprint’s amount');
  await page.click('[data-a="sprint-days"][data-v="14"]'); await page.fill('#sp-target', ''); await page.click('[data-a="sprint-save"]'); eq(await page.evaluate(() => document.activeElement.id), 'sp-target', 'no amount: refused');
  await page.fill('#sp-target', '1000'); await page.click('[data-a="sprint-save"]'); await page.waitForSelector('#jr-sprint');
  eq(await page.evaluate(() => [S.journey.sprint.days, S.journey.sprint.target, S.journey.sprint.start === S.today, document.querySelector('#jr-sprint .jr-fig').innerText.replace(/\s+/g, ' ').trim(), document.querySelector('#jr-sprint .jr-lab').innerText]),
    [14, 100000, true, 'R$ 0 / R$ 1,000 0%', 'SPRINT · DAY 1 OF 14'], 'a sprint of 14 days for R$ 1,000, from today: its figure and its day');
  await page.evaluate(() => A['debt-pay']({ id: S.journey.debts.find(d => d.name === 'Bank loan').id })); await page.waitForSelector('#dp-amount');
  eq(await page.evaluate(() => document.querySelector('#dp-amount').value), '400', 'paying a debt starts from its monthly payment');
  await page.click('[data-a="debt-pay-save"]'); await page.waitForSelector('#jr-sprint');
  eq(await page.evaluate(() => [debtLeft(S.journey, S.journey.debts.find(d => d.name === 'Bank loan')), document.querySelector('#jr-sprint .jr-fig').innerText.replace(/\s+/g, ' ').trim(), document.querySelector('#jr-sprint .jr-bar').getAttribute('aria-valuenow')]), [760000, 'R$ 400 / R$ 1,000 40%', '40'], 'a payment: the debt owes R$ 7,600; the sprint has R$ 400 of R$ 1,000, the bar at 40%');
  await page.evaluate(() => { S.transactions.push({ id: 'qa-cp', accountId: 'nu-card', date: S.today, description: 'Payment', merchant: 'Payment', amount: 10000, currency: 'BRL', type: 'transfer', transferAccountId: 'nu-conta', categoryId: null, status: 'confirmed' }); render(); });
  ok(await page.evaluate(() => /R\$ 500 \/ R\$ 1,000 50%/.test(document.querySelector('#jr-sprint .jr-fig').innerText.replace(/\s+/g, ' '))), 'a payment to the card counts too');
  ok(await page.evaluate(() => /14 days left and R\$ 500\.00 to go: about R\$ 36 a day\./.test(document.querySelector('#jr-sprint').innerText)), 'what is left, in days and money, and what that is a day', await page.evaluate(() => document.querySelector('#jr-sprint .note').innerText));
  await page.evaluate(() => { A['debt-edit']({ id: S.journey.debts.find(d => d.name === 'Bank loan').id }); UI.drawer.draft.owedText = '7000'; A['debt-save'](); });
  eq(await page.evaluate(() => { const d = S.journey.debts.find(x => x.name === 'Bank loan'); return [debtLeft(S.journey, d), S.journey.pays.length]; }), [700000, 1], 'editing what is owed: it owes what was typed, the payment stays recorded');
  // ---------- 5. out of debt ----------
  eq(await page.evaluate(() => { const list = journeyDebts(S, S.today, 'BRL'), p = payoffPlan(list, Math.round(100000 * 30 / 14)), p2 = payoffPlan(list, Math.round(100000 * 30 / 14) + 10000); return [document.querySelector('#jr-free .jr-big').textContent === fmt.month(payoffMonth(S.today, p.months)), new RegExp(`With R\\$ 100 more a month: ${fmt.month(payoffMonth(S.today, p2.months))}, ${p.months - p2.months} months? sooner\\.`).test(document.querySelector('#jr-free').innerText), /At R\$ 2,143 a month \(the pace of your sprint\)/.test(document.querySelector('#jr-free').innerText), p.interest > 0]; }),
    [true, true, true, true], 'out of debt: the month at the pace of the sprint (R$ 1,000 in 14 days is R$ 2,143 a month), the interest along the way, and R$ 100 more a month');
  eq(await page.evaluate(() => payoffPlan([{ left: 100000, rate: 10, min: 0 }], 5000).stuck), true, 'a pace below the interest: nothing ever goes down, and it is said');
  eq(await page.evaluate(() => payoffPlan([{ left: 120000, rate: 0, min: 0 }], 40000).months), 3, 'with no interest: R$ 1,200 at R$ 400 a month is 3 months');
  // closing a sprint that ended
  await page.evaluate(() => { S.journey.sprint.start = addDays(S.today, -20); render(); });
  ok(await page.evaluate(() => !!document.querySelector('#jr-sprint [data-a="sprint-close"]') && /The sprint ended: you paid/.test(document.querySelector('#jr-sprint').innerText)), 'a sprint past its last day says how it went and offers the next');
  await page.click('#jr-sprint [data-a="sprint-close"]'); await page.waitForSelector('#sp-target');
  eq(await page.evaluate(() => [S.journey.sprint, S.journey.sprints.length, UI.drawer.draft.days, UI.drawer.draft.targetText === plain(100000)]), [null, 2, 14, true], 'closed: kept with what was paid; the next opens with the same length and amount');
  await page.click('[data-a="sprint-save"]'); await page.waitForSelector('#jr-sprint');
  // ---------- 6. reminders ----------
  await page.evaluate(() => { A.close(); S.journey.sprint.start = addDays(S.today, -3); S.journey.checks = {}; S.journey.pays.forEach(p => { p.date = addDays(S.today, -40); });      // no payment this month: the loan's is still due
    const d = S.journey.debts.find(x => x.name === 'Bank loan'); d.due = +addDays(S.today, 2).slice(8); render(); });
  const rs = await page.evaluate(() => allReminders().filter(r => ['jmark', 'debt', 'sprint'].includes(r.kind)).map(r => [r.kind, reminderLine(r)]));
  eq(rs.map(r => r[0]).sort(), ['debt', 'jmark'], 'yesterday not marked while a sprint runs, and the loan due in 2 days: two reminders');
  ok(/^Journey: if you added no debt yesterday, mark it\.$/.test(rs.find(r => r[0] === 'jmark')[1]) && /^Bank loan: payment of R\$ 400\.00, due .* \(in 2 days\)\.$/.test(rs.find(r => r[0] === 'debt')[1]), 'in the words of a push and an email', rs);
  await page.evaluate(() => A.reminders()); await page.waitForSelector('.drawer .rem');
  ok(await page.evaluate(() => !!document.querySelector('.drawer [data-a="journey-mark"]') && /Bank loan/.test(document.querySelector('.drawer .body').innerText) && /a debt in your journey/.test(document.querySelector('.drawer .body').innerText)), 'the bell lists them, with a button to mark yesterday');
  await page.click('.drawer [data-a="journey-mark"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!!S.journey.checks[addDays(S.today, -1)], allReminders().some(r => r.kind === 'jmark')]), [true, false], 'marked from the bell: the reminder goes');
  await page.evaluate(() => { A.close(); S.journey.sprint.start = addDays(S.today, -13); render(); });
  ok(await page.evaluate(() => allReminders().some(r => r.kind === 'sprint' && !r.done && r.days === 0 && /^Your sprint ends today: R\$ [\d,.]+ to go\.$/.test(reminderLine(r)))), 'the sprint’s last day, short of its amount: said');
  await page.evaluate(() => { S.user.notify.journey = false; render(); });
  eq(await page.evaluate(() => allReminders().filter(r => ['jmark', 'debt', 'sprint'].includes(r.kind)).length), 0, 'the switch off: no journey reminder');
  await page.evaluate(() => { S.user.notify.journey = true; navigate('profile'); });
  ok(await page.evaluate(() => !!document.querySelector('#nf-journey') && document.querySelector('#nf-journey').checked), 'the profile has the journey’s switch, on by default');
  // ---------- 7. each side its own ----------
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); A['journey-open'](); });
  eq(await page.evaluate(() => [!!document.querySelector('.jr-btn'), !!UI.jstart && !!document.querySelector('#jstart'), UI.jstart.step, !!B().journey]), [true, true, 0, false], 'the company: its own journey, never started (its onboarding)');
  await page.evaluate(() => { A['jstart-close'](); A.space({ v: 'personal' }); });
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- a phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  eq(await page.evaluate(() => { const b = document.querySelector('.pagehead .jr-btn'), m = document.querySelector('.pagehead .m-row .month'), r = b.getBoundingClientRect(), q = m.getBoundingClientRect(); return [b.innerText.trim(), r.left >= q.right, Math.abs(r.top - q.top) <= 2, r.height >= 44, r.right <= innerWidth, document.documentElement.scrollWidth <= innerWidth]; }),
    ['Jornada', true, true, true, true, true], 'a phone: “Jornada” at the right of the month, on its row, a thumb high, inside the screen');
  await page.tap('.pagehead .jr-btn'); await page.waitForSelector('#jstart .js-light');      // the first time: the onboarding's page (qc-journey-start.js)
  ok(await page.evaluate(() => { const r = document.querySelector('#jstart').getBoundingClientRect(); return r.top <= 0 && r.left <= 0 && r.width >= innerWidth && r.height >= innerHeight && !document.querySelector('.drawer'); }), 'it opens as a page of its own, the whole screen, not a panel');
  eq(errors, [], 'no error in the console (phone)'); await browser.close();
  done('qc-journey');
})();
