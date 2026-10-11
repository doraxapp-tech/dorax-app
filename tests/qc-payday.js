// QC of pay day (owner, 2026-10-07: "if the person is paid a fixed salary on the same day each month ... a notification: today is your pay day, do
// you want to record your salary of [amount]? Add transaction | I'll do it").
//   1. the arithmetic (core/payday.js): which payment is due by today with nothing recorded;
//   2. the day is given beside each income in the Plan and in the first steps; the first-time setup does not ask it;
//   3. the notice: on the day, once; "Add transaction" opens it filled in and nothing is saved by itself; "I'll do it" is kept for the month;
//      the same question is one of the first steps (the field), a reminder in the bell, and a notification the server sends;
//   4. Spanish and Portuguese on the narrowest phone.
// The suites' day is 2026-10-02.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const text = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  const signup = async (p, name) => { await p.evaluate(() => A['pub-go']({ v: 'signup' })); await p.fill('#au-name', name); await p.fill('#au-email', name.toLowerCase() + '@example.org'); await p.fill('#au-pass', 'UmaSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]'); await p.waitForSelector('#ob-name'); await p.click('[data-a="onboard-save"]'); await p.waitForSelector('#ob-pay0'); };

  // ---------- 1. the arithmetic ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  eq(await page.evaluate(() => { const rows = S.pay[2026], r = rows[0], out = [], due = (today) => payDue(S, today || S.today, CUR).map(g => [g.name, g.amount, g.date, g.today]);
    out.push(due().length);                                                   // no day given: nothing is ever asked
    r.day = 5; out.push(due().length);                                        // its day has not come
    r.day = 2; out.push(due());                                               // today
    r.day = 1; out.push(due());                                               // yesterday, still nothing recorded
    r.day = 31; out.push(due('2026-11-30'));                                  // a day the month does not have is its last day
    const keep = r.values[9]; r.values[9] = 0; r.day = 1; out.push(due().length); r.values[9] = keep;      // nothing planned this month
    S.transactions.push({ id: 'pd1', accountId: personal()[0].id, date: '2026-10-01', amount: 100, type: 'income', categoryId: S.categories.find(c => c.income).id, subcategoryId: r.sub, status: 'confirmed', merchant: 'x', description: 'x' });
    out.push(due().length); S.transactions = S.transactions.filter(x => x.id !== 'pd1'); delete r.day; return [r.name, r.half, r.values[9], r.values[10]].concat([out]); }),
    ['Salary · 1st payment', 1, 300000, 300000, [0, 0, [['Salary · 1st payment', 300000, '2026-10-02', true]], [['Salary · 1st payment', 300000, '2026-10-01', false]], [['Salary · 1st payment', 300000, '2026-11-30', true]], 0, 0]],
    'a payment is asked about from its day on, while something is planned and nothing was received under its income line; with no day it is never asked; day 31 in a 30-day month is the 30th');
  eq(await page.evaluate(() => { const rows = S.pay[2026], keep = JSON.stringify(rows); rows.push({ id: 'tw', name: 'Salary · savings part', sub: rows[0].sub, half: rows[0].half, to: 'savings', values: Array(12).fill(50000) }); rows[0].day = 2;
    const r = payDue(S, S.today, CUR).map(g => [g.name, g.amount, g.ids.length]); S.pay[2026] = JSON.parse(keep); return r; }), [['Salary · 1st payment', 350000, 2]], 'one payment split in two rows (the part for bills, the part for savings) is asked about once, for the whole amount');

  // ---------- 2. where the day is given: beside each income in the Plan ----------
  await page.evaluate(() => { navigate('plan'); if (!isPhone()) A['plan-income'](); });      // a computer keeps the income one click away (2026-10-11)
  eq(await page.evaluate(() => { const sels = [...document.querySelectorAll('.payrow select[data-c="pay-day"]')], s = sels[0]; return [sels.length === S.pay[2026].length, s.options.length, s.options[0].text, s.value, document.querySelector(`label[for="${s.id}"]`).innerText.trim(), /It never records it by itself\./.test(document.querySelector('#pay-day-note').innerText)]; }),
    [true, 32, 'No fixed day', '', 'Pay day', true], 'the Plan’s income panel: each payment has a “Pay day”, none by default, 1 to 31, and a line that says nothing is recorded by itself');
  await page.selectOption('.payrow select[data-c="pay-day"]', '20');
  eq(await page.evaluate(() => { const r = S.pay[2026][0]; return [r.day, r.half, document.querySelector('.payrow select[data-c="pay-day"]').value]; }), [20, 2, '20'], 'choosing a day keeps it; a payment said to come in the first half moves to the half its day is in');
  await page.selectOption('.payrow select[data-c="pay-day"]', '');
  eq(await page.evaluate(() => 'day' in S.pay[2026][0]), false, 'choosing “No fixed day” takes it away');
  eq(await page.evaluate(() => { document.documentElement.style.width = ''; return document.documentElement.scrollWidth <= innerWidth; }), true, 'the panel with its new field fits the page');
  eq(errors, [], 'arithmetic and Plan: no error in the console'); await browser.close();

  // ---------- 2b. the first-time setup does not ask it (owner, 2026-10-07: "take 'what day are you paid' out of the onboarding") ----------
  ({ browser, page, errors } = await open({ lang: 'en', viewport: { width: 1280, height: 900 }, server: { confirmEmail: false }, curio: true }));
  await signup(page, 'Ana');
  eq(await page.evaluate(() => [document.querySelectorAll('#ob-payday, .ob-day').length, 'payDay' in UI.ob, !!document.querySelector('#ob-pay0'), !!document.querySelector('#ob-spend')]), [0, false, true, true], 'the setup asks what comes in and what goes out, and no pay day');
  await page.click('[data-a="ob-next"]'); await page.click('[data-a="ob-finish"]'); await page.waitForSelector('.hello');
  eq(await page.evaluate(() => [S.pay[2026].map(r => [r.name, 'day' in r]), payDue(S, S.today, CUR).length]), [[['Salary', false], ['Salary · savings part', false]], 0], 'the salary it creates has no pay day, so nothing is asked until the person gives one');
  // ---------- 2c. it is one of the first steps, answered right there (owner, 2026-10-07: "pay day: add the field in the first steps") ----------
  eq(await page.evaluate(() => { const steps = [...document.querySelectorAll('#first-steps .step')], last = steps[4], s = document.querySelector('#fs-payday'); return [steps.length, last.querySelector('b').innerText.trim(), last.classList.contains('ok'), s.closest('.step') === last, s.options.length, [...s.options].slice(0, 3).map(o => o.text), s.value, document.querySelector('label[for="fs-payday"]').innerText.trim(), /It never records it by itself\./.test(last.innerText)]; }),
    [6, 'Set your pay day', false, true, 33, ['Choose a day', 'No fixed day', '1'], '', 'Pay day', true], 'the fifth first step is the pay day: a field in the card itself, nothing chosen, “No fixed day” and 1 to 31, and it says nothing is recorded by itself');
  await page.selectOption('#fs-payday', 'none');
  eq(await page.evaluate(() => { const last = document.querySelectorAll('#first-steps .step')[4]; return [S.user.payDaySaid, last.classList.contains('ok'), document.querySelectorAll('#fs-payday').length, S.pay[2026].some(r => 'day' in r), payDue(S, S.today, CUR).length, S.isNew]; }), [true, true, 0, false, 0, true], '“No fixed day” is an answer: the step is done, no day is kept and nothing will be asked');
  await page.evaluate(() => { delete S.user.payDaySaid; render(); }); await page.selectOption('#fs-payday', '2');
  eq(await page.evaluate(() => [S.pay[2026].map(r => [r.name, r.day, r.half]), payDue(S, S.today, CUR).map(g => [g.name, g.amount, g.today]), document.querySelectorAll('#first-steps .step')[4].classList.contains('ok'), document.querySelectorAll('#first-steps .steps-meter i.on').length, document.documentElement.scrollWidth <= innerWidth]), [[['Salary', 2, 0], ['Salary · savings part', 2, 0]], [['Salary', 370000, true]], true, 3, true], 'a day chosen there is kept on both parts of the salary and ticks the step; today being that day, the whole salary is due');
  await page.evaluate(() => { navigate('plan'); if (!isPhone()) A['plan-income'](); });      // a computer keeps the income one click away (2026-10-11)
  eq(await page.evaluate(() => [...document.querySelectorAll('.payrow select[data-c="pay-day"]')].map(x => x.value)), ['2', '2'], 'and the Plan shows the same day beside the income, where it can be changed');
  await page.evaluate(() => { A.close(); navigate('dashboard'); });

  // ---------- 3. the notice ----------
  eq(await page.locator('#curio').count(), 0, 'nothing is asked the instant the dashboard opens');
  await page.waitForSelector('#curio.nudge', { timeout: 6000 });
  let q = await text(page, '#curio');
  ok(/Today is pay day\./.test(q) && /Record Salary, R\$ 3\.700,00\? It opens ready to save: check the amount and the account\./.test(q), 'a moment later a notice asks: today is pay day, record the salary of that amount?', q);
  eq(await page.evaluate(() => { const c = document.querySelector('#curio'), bs = [...c.querySelectorAll('.row button')]; return [c.getAttribute('role'), bs.map(b => b.dataset.a + ':' + b.innerText.trim()), S.isNew, S.transactions.length, !!document.querySelector('.scrim')]; }), ['status', ['payday-add:Add transaction', 'payday-skip:I’ll do it'], true, 0, false], 'its two answers are “Add transaction” and “I’ll do it”; it comes even while the first steps are pending, blocks nothing, and nothing was recorded');
  await page.evaluate(() => { S.accounts.push({ id: 'a1', name: 'Nubank', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 }); });
  await page.click('#curio [data-a="payday-add"]'); await page.waitForSelector('#d-amount');
  eq(await page.evaluate(() => { const x = UI.drawer.draft; return [UI.drawer.kind, x.type, x.dir, x.amountText, x.merchant, x.date, x.catKey === catKey(S.categories.find(c => c.income).id, S.pay[2026][0].sub), document.querySelector('#d-amount').value, S.transactions.length, document.querySelectorAll('#curio').length]; }),
    ['tx', 'income', 'in', '3.700', 'Salary', '2026-10-02', true, '3.700', 0, 0], '“Add transaction” opens a new transaction filled in (an income, the amount, the name, the income line, today) and still saves nothing by itself');
  await page.click('.drawer footer .btn.primary'); await page.waitForFunction(() => !UI.drawer || UI.drawer.kind !== 'tx' || S.transactions.length > 0);
  eq(await page.evaluate(() => [S.transactions.filter(x => x.type === 'income').map(x => [x.amount, x.date, x.merchant]), payDue(S, S.today, CUR).length]), [[[370000, '2026-10-02', 'Salary']], 0], 'saved by the person, the salary is recorded once and is no longer due');
  await page.evaluate(() => { A.close(); navigate('plan'); }); await page.waitForTimeout(3300); eq(await page.locator('#curio.nudge').count(), 0, 'and it is not asked again');
  eq(errors, [], 'setup and notice: no error in the console'); await browser.close();

  // "I'll do it", the close button, and the company's side
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 }, curio: true }));
  await page.evaluate(() => { S.user.curio = { rate: 'off' }; S.pay[2026][0].day = 1; navigate('dashboard'); }); await page.waitForSelector('#curio.nudge', { timeout: 6000 });
  ok(/Pay day was on 01\/10\./.test(await text(page, '#curio')) && /Record Salary · 1st payment, R\$ 3\.000,00\?/.test(await text(page, '#curio')), 'opened the day after: it says which day pay day was', await text(page, '#curio'));
  await page.click('#curio [data-a="payday-close"]'); await page.evaluate(() => navigate('plan')); await page.waitForTimeout(3300);
  eq(await page.evaluate(() => [document.querySelectorAll('#curio').length, S.user.payAsk === undefined, UI.paySkip.length]), [0, true, 1], 'closed without an answer: put aside for this visit, nothing kept in the account');
  await page.evaluate(() => { UI.paySkip = null; navigate('dashboard'); }); await page.waitForSelector('#curio.nudge', { timeout: 6000 });
  await page.click('#curio [data-a="payday-skip"]');
  eq(await page.evaluate(() => [Object.values(S.user.payAsk), document.querySelectorAll('#curio').length, document.querySelector('#toast').innerText.trim(), S.transactions.filter(x => x.type === 'income' && x.date >= '2026-10-01').length]), [['2026-10'], 0, 'Fine. I will not ask again this month.', 0], '“I’ll do it”: kept for this month, said back, nothing recorded');
  await page.evaluate(() => { UI.paySkip = null; navigate('plan'); }); await page.waitForTimeout(3300); eq(await page.locator('#curio').count(), 0, 'and it is not asked again this month, even on another visit');
  eq(await page.evaluate(() => { delete S.user.payAsk; A.space({ v: 'business' }); const r = paydayDue(); A.space({ v: 'personal' }); return [r, !!paydayDue()]; }), [null, true], 'the company’s side never asks: its income has no pay day');
  eq(errors, [], 'answers: no error in the console'); await browser.close();

  // ---------- 3b. the same question as a reminder: in the bell, in the notification, and from the server (owner, 2026-10-07: "do the reminders function") ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  eq(await page.evaluate(() => activeReminders().filter(r => r.kind === 'pay').length), 0, 'with no pay day given, there is no pay-day reminder');
  const said = await page.evaluate(() => { S.pay[2026][0].day = 2; render(); const rs = allReminders().filter(r => !snoozedNow(r)),      /* everything the person is told, both sides */  p = rs.filter(r => r.kind === 'pay'), doc = JSON.parse(JSON.stringify(S)); delete doc.today;
    return { p: p.map(r => [r.id, r.when, r.name, r.amount, r.date, r.days]), key: p.map(reminderKey), keys: rs.map(reminderKey), push: reminderPush(p), digest: reminderDigest(p), many: reminderPush(rs).body.includes('Today is pay day. Salary · 1st payment: R$ 3.000,00. Open Dorax to record it.'), bell: document.querySelector('.bell .count, .bell-n, [data-a="reminders"] .n') ? 1 : 0, doc }; });
  eq([said.p, said.key, said.push, said.digest], [[['pay:sueldo|1:2026-10', 'today', 'Salary · 1st payment', 300000, '2026-10-02', 0]], ['pay:sueldo|1:2026-10|today'], { title: 'Today is pay day.', body: 'Salary · 1st payment: R$ 3.000,00. Open Dorax to record it.' }, { subject: 'Today is pay day.', lines: ['Today is pay day. Salary · 1st payment: R$ 3.000,00. Open Dorax to record it.'] }],
    'on the day there is one reminder for the payment, said once a month; alone, the notification and the email say “Today is pay day” with the income and its amount');
  ok(said.many, 'among other reminders it is one line of the summary');
  await page.evaluate(() => A.reminders()); await page.waitForSelector('.drawer .rem-group');
  eq(await page.evaluate(() => { const g = [...document.querySelectorAll('.drawer .rem-group')].find(x => x.querySelector('h3').textContent.trim() === 'Pay day'), bs = [...g.querySelectorAll('button')]; return [g.querySelectorAll('.rem').length, g.querySelector('.rem-t b').innerText.trim(), g.querySelector('.rem-t .num').innerText.trim(), /Salary · 1st payment/.test(g.querySelector('.note').innerText), bs.map(b => b.dataset.a + ':' + b.innerText.trim()), bs[0].classList.contains('later') && !bs[0].classList.contains('primary')]; }),
    [1, 'Today is pay day.', 'R$ 3.000,00', true, ['payday-add:Add transaction', 'payday-skip:I’ll do it'], true], 'the bell lists it under “Pay day” with the same two answers; its button is the quiet kind, the bright one there is kept for bills that are due');
  await page.click('.drawer [data-a="payday-add"]'); await page.waitForSelector('#d-amount');
  eq(await page.evaluate(() => { const x = UI.drawer.draft; return [UI.drawer.kind, x.type, x.amountText, x.merchant, S.transactions.filter(t => t.type === 'income' && t.date === '2026-10-02').length]; }), ['tx', 'income', '3.000', 'Salary · 1st payment', 0], 'from the bell, “Add transaction” opens the same filled-in transaction and saves nothing by itself');
  await page.evaluate(() => { A.close(); A.reminders(); }); await page.waitForSelector('.drawer [data-a="payday-skip"]'); await page.click('.drawer [data-a="payday-skip"]');
  eq(await page.evaluate(() => [S.user.payAsk, activeReminders().filter(r => r.kind === 'pay').length, [...document.querySelectorAll('.drawer .rem-group h3')].some(h => h.textContent.trim() === 'Pay day'), !!UI.drawer && UI.drawer.kind]), [{ 'sueldo|1': '2026-10' }, 0, false, 'reminders'], '“I’ll do it” in the bell is kept for the month: the reminder leaves the list, which stays open');
  eq(await page.evaluate(() => { delete S.user.payAsk; S.user.notify.pay = false; const off = activeReminders().filter(r => r.kind === 'pay').length; delete S.user.notify.pay; const on = activeReminders().filter(r => r.kind === 'pay').length;
    return [off, on, allReminders().filter(r => r.kind === 'pay').map(r => r.book || 'personal')]; }), [0, 1, ['personal']], 'it is on unless the person switches “Pay day” off in the profile, and only the household has it');
  await page.evaluate(() => { A.close(); navigate('profile'); });
  eq(await page.evaluate(() => { const row = [...document.querySelectorAll('#view .setting, #view .li, #view label')].find(e => /Pay day/.test(e.innerText) && e.querySelector('input[type="checkbox"], [role="switch"]')); const sw = row && row.querySelector('input[type="checkbox"], [role="switch"]'); return [!!row, sw ? (sw.checked === true || sw.getAttribute('aria-checked') === 'true') : null]; }), [true, true], 'the profile has a “Pay day” switch among the reminders, on by default');
  eq(errors, [], 'reminder: no error in the console'); await browser.close();
  {
    // the server (supabase/functions/reminders): built from the same code, it says the same thing once and never again that month
    const path = require('path'), FN = path.join(__dirname, '..', 'supabase', 'functions', 'reminders'), logic = await import('file://' + path.join(FN, 'logic.mjs')), copy = () => JSON.parse(JSON.stringify(said.doc));
    const first = logic.messageFor(copy(), '2026-10-02', new Set(said.keys.filter(k => !/^pay:/.test(k))));
    eq([first.keys, first.push, first.subject], [said.key, said.push, said.digest.subject], 'the server sends that same notification and email on pay day');
    eq(logic.messageFor(copy(), '2026-10-02', new Set(said.keys)), null, 'once sent, it is not sent again');
    const next = logic.messageFor(copy(), '2026-10-03', new Set(said.keys)); ok(!next || !next.keys.some(k => /^pay:/.test(k)), 'nor the next morning, with the pay still not recorded', next && next.keys);
    const before = logic.messageFor(copy(), '2026-10-01', new Set()); ok(!before || !before.keys.some(k => /^pay:/.test(k)), 'nothing the day before', before && before.keys);
    const off = copy(); off.user.notify.pay = false; const quiet = logic.messageFor(off, '2026-10-02', new Set()); ok(!quiet || !quiet.keys.some(k => /^pay:/.test(k)), 'and nothing for a person who switched “Pay day” off');
    const pt = copy(); pt.settings.lang = 'pt'; const m = logic.messageFor(pt, '2026-10-02', new Set(said.keys.filter(k => !/^pay:/.test(k))));
    ok(m && /dia de pagamento/i.test(m.push.title) && /R\$ 3\.000,00/.test(m.push.body), 'in Portuguese for an account in Portuguese', m && m.push);
  }

  // ---------- 4. Spanish and Portuguese, on the narrowest phone ----------
  for (const [lang, want] of [['es', [/Tu día de pago fue el 01\/10\./, /¿Registro Sueldo · 1\.er pago, R\$ 3\.000,00\?/, 'Agregar transacción', 'Yo lo hago', 'Día de cobro', 'Sin día fijo']], ['pt', [/Seu dia de pagamento foi em 01\/10\./, /Registro Salário · 1º pagamento, R\$ 3\.000,00\?/, 'Adicionar transação', 'Eu faço', 'Dia do pagamento', 'Sem dia fixo']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true, curio: true }));
    await page.evaluate(() => { S.user.curio = { rate: 'off' }; S.pay[2026][0].day = 1; navigate('dashboard'); }); await page.waitForSelector('#curio.nudge', { timeout: 6000 });
    const c = await text(page, '#curio');
    eq([want[0].test(c), want[1].test(c), await page.evaluate(() => [...document.querySelectorAll('#curio .row button')].map(b => b.innerText.trim())), await page.evaluate(() => { const r = document.querySelector('#curio').getBoundingClientRect(), bar = document.querySelector('#tabbar').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= bar.top + 1 && [...document.querySelectorAll('#curio .row button')].every(b => b.getBoundingClientRect().height >= 40); })], [true, true, [want[2], want[3]], true], `${lang}, 320px: the notice in the language, above the bar, inside the screen, buttons a thumb can hit`, c);
    await page.evaluate(() => { A['payday-close']({ key: UI.curio.key }); navigate('plan'); });
    // on a phone the income is a list to tap (2026-10-08): its row shows the day, and the field is in the panel the row opens
    ok(await page.evaluate(() => new RegExp(t('Pay day') + ' 1').test(document.querySelector('#income-list .pl-row').innerText)), `${lang}, 320px: the income’s row says its pay day`);
    await page.click('#income-list .pl-row');
    eq(await page.evaluate(() => { const s = document.querySelector('.drawer select[data-c="pay-day"]'), f = s.closest('.field').getBoundingClientRect(); return [document.querySelector(`label[for="${s.id}"]`).innerText.trim(), s.options[0].text, s.getBoundingClientRect().height >= 44, f.right <= innerWidth, document.documentElement.scrollWidth - innerWidth]; }), [want[4], want[5], true, true, 0], `${lang}, 320px: the pay-day field is in the income’s panel, in the language, a thumb high, inside the phone`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-payday');
})();
