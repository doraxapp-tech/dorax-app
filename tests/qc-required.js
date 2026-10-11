// QC: what the app needs is required (owner, 2026-10-09: "in the forms to add a card/account with credit on, the invoice's due date is mandatory;
// now it saves without it. That is inconceivable. Check across the app that the inputs NEEDED for the app to work correctly are mandatory").
//   1. every always-required field shows a red * and aria-required;
//   2. an account: its name and its money today (0 is an answer, empty is not); a credit card: its next invoice's due date; an account whose card
//      has credit: that date and the invoice as it stands; a savings account whose card has debit: what that debit spends from. Each refusal says
//      why and puts the cursor on the field, outlined;
//   3. a fixed cost: what it costs each month (more than zero) and, for a bill paid from an account, its due day; one charged to a card or spent
//      during the month does not need it;
//   4. a transaction: its amount first; a recurring payment: its day;
//   5. a card saved before without its due date is asked for on its side's dashboard, with the way to give it;
//   6. the reason of a refusal sits under its field (a phone does not show the top of a long panel) and goes once the field is given.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; });
  const refused = (id, re) => page.evaluate(([id, re]) => [!!UI.drawer && new RegExp(re).test((document.querySelector('.drawer .banner') || {}).innerText || ''), document.activeElement && document.activeElement.id, (document.getElementById(id) || {}).getAttribute && document.getElementById(id).getAttribute('aria-invalid')], [id, re]);
  // ---------- 2. an account ----------
  await page.evaluate(() => A['edit-account']({ id: '' })); await page.waitForSelector('#a-name');
  eq(await page.evaluate(() => ['a-name', 'a-open'].map(id => [!!document.querySelector(`label[for="${id}"] .req`), document.getElementById(id).getAttribute('aria-required')])), [[true, 'true'], [true, 'true']], 'an account: its name and its balance wear the * and say they are required');
  await page.click('[data-a="save-account"]'); eq(await refused('a-name', 'account name'), [true, 'a-name', 'true'], 'no name: refused, the cursor on the name');
  await page.fill('#a-name', 'Inter'); await page.click('[data-a="save-account"]');
  eq(await refused('a-open', 'money in the account today: 0 if it is empty'), [true, 'a-open', 'true'], 'no balance: refused, it says 0 is an answer');
  await page.fill('#a-open', '0'); await page.evaluate(() => { UI.drawer.draft.hasCredit = true; renderOverlay(); }); await page.waitForSelector('#a-cdue');
  eq(await page.evaluate(() => ['a-cdue', 'a-cowed'].map(id => !!document.querySelector(`label[for="${id}"] .req`))), [true, true], 'with credit: the due date and the invoice wear the *');
  await page.click('[data-a="save-account"]'); eq(await refused('a-cdue', 'next invoice is due'), [true, 'a-cdue', 'true'], 'credit without its due date: refused');
  eq(await page.evaluate(() => { const m = $('fail-msg'), f = $('a-cdue').closest('.field'); return [!!m && f.nextElementSibling === m, m && m.getAttribute('role'), /fail-msg/.test($('a-cdue').getAttribute('aria-describedby') || '')]; }), [true, 'alert', true], 'the reason is right under the field, where a phone shows it, and the field points to it');
  await page.fill('#a-cdue', await page.evaluate(() => addDays(S.today, 10)));
  eq(await page.evaluate(() => [!$('fail-msg'), $('a-cdue').getAttribute('aria-invalid'), UI.drawer.error]), [true, null, null], 'given, the field is no longer red and its reason goes');
  await page.click('[data-a="save-account"]');
  eq(await refused('a-cowed', 'invoice as it stands today'), [true, 'a-cowed', 'true'], 'credit without the invoice as it stands: refused');
  await page.fill('#a-cowed', '0'); await page.click('[data-a="save-account"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => { const a = S.accounts.find(k => k.name === 'Inter'), cr = cardCredit(a); return !UI.drawer && !!cr && cr.dueDay > 0; }), 'everything given: saved, its credit with its due day');
  await page.evaluate(() => { A['edit-account']({ id: '' }); UI.drawer.draft.type = 'credit'; renderOverlay(); }); await page.waitForSelector('#a-due');
  await page.fill('#a-name', 'Store card'); await page.fill('#a-open', '0'); await page.click('[data-a="save-account"]');
  eq(await refused('a-due', 'next invoice is due'), [true, 'a-due', 'true'], 'a credit card without its next due date: refused');
  await page.evaluate(() => A.close());
  await page.evaluate(() => { A['edit-account']({ id: '' }); Object.assign(UI.drawer.draft, { type: 'savings', debitCard: true }); renderOverlay(); }); await page.waitForSelector('#a-sopen');
  await page.fill('#a-name', 'Poupança'); await page.fill('#a-open', '1.000'); await page.click('[data-a="save-account"]');
  eq(await refused('a-sopen', 'debit card spends from'), [true, 'a-sopen', 'true'], 'a savings account whose card has debit: what that debit spends from is required');
  await page.evaluate(() => A.close());
  // ---------- 3. a fixed cost ----------
  await page.evaluate(() => { navigate('plan'); A['line-new']({}); }); await page.waitForSelector('#l-name');
  await page.fill('#l-name', 'Gym'); await page.click('[data-a="line-save"]'); eq(await refused('l-amount', 'what it costs each month'), [true, 'l-amount', 'true'], 'a fixed cost without its amount: refused');
  await page.fill('#l-amount', '120'); await page.click('[data-a="line-save"]');
  eq(await refused('l-due', 'day it is due'), [true, 'l-due', 'true'], 'a bill paid from an account without its due day: refused');
  ok(await page.evaluate(() => !!document.querySelector('label[for="l-due"] .req') && !!document.querySelector('label[for="l-acct"]') && !document.querySelector('#line-more-box #l-acct')), 'the due day wears the *, and where it is paid from is in sight');
  await page.selectOption('#l-acct', 'nu-card'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !document.querySelector('label[for="l-due"] .req') && /optional/.test(document.querySelector('label[for="l-due"]').innerText)), 'charged to a card: the due day is optional (the invoice has it)');
  await page.click('[data-a="line-save"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => B().plan.lines.some(l => l.name === 'Gym')), 'and it saves');
  await page.evaluate(() => { A.close(); A['line-new']({}); UI.drawer.draft.pay = 'budget'; renderOverlay(); }); await page.waitForSelector('#l-name');
  ok(await page.evaluate(() => !document.querySelector('#l-due')), 'a cost spent during the month has no due day to ask');
  await page.evaluate(() => A.close());
  // ---------- 4. a transaction, a recurring payment ----------
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-amount');
  ok(await page.evaluate(() => ['d-merchant', 'd-date'].every(id => !!document.querySelector(`label[for="${id}"] .req`)) && !!document.querySelector('label[for="d-amount"] .req')), 'a transaction: its amount, what it was and its date wear the *');
  await page.click('.drawer footer [data-a="save-tx"]'); eq(await refused('d-amount', 'above zero|greater than zero'), [true, 'd-amount', 'true'], 'a transaction without its amount: refused, the cursor on the amount');
  await page.evaluate(() => { A.close(); navigate('recurring'); }); await page.waitForSelector('#rc-name');
  await page.fill('#rc-name', 'Spotify'); await page.fill('#rc-amt', '21,90'); await page.fill('#rc-day', ''); await page.click('[data-a="add-recurring"]'); await page.waitForTimeout(100);
  eq(await page.evaluate(() => [document.activeElement.id, S.recurringManual.some(r => r.merchant === 'Spotify')]), ['rc-day', false], 'a recurring payment without its day: refused');
  // ---------- 1. every required field marked ----------
  const marks = await page.evaluate(() => {
    const bad = [], seen = new Set();
    const look = () => document.querySelectorAll('#view .field, #overlay .field').forEach(f => { const l = f.querySelector('label[for]'); if (!l) return; const id = l.getAttribute('for'); if (seen.has(id) || !REQUIRED.has(id)) return; seen.add(id); const el = document.getElementById(id); if (!l.querySelector('.req') || !el || el.getAttribute('aria-required') !== 'true') bad.push(id); });
    const panels = [() => A['new-tx'](), () => A['line-new']({}), () => A['goal-new']({}), () => { A['edit-account']({ id: '' }); UI.drawer.draft.hasCredit = true; renderOverlay(); }, () => { A['edit-account']({ id: '' }); UI.drawer.draft.type = 'credit'; renderOverlay(); }, () => { A['edit-account']({ id: '' }); Object.assign(UI.drawer.draft, { type: 'savings', debitCard: true }); renderOverlay(); },
      () => A['fii-move']({ kind: 'buy' }), () => A['card-pay']({ id: 'nu-card' }), () => { const l = B().plan.lines[0]; A['line-pay']({ id: l.id, ym: S.month }); }, () => { const g = B().goals[0]; A['goal-move']({ id: g.id, dir: 'in' }); }];
    for (const f of panels) { UI.drawer = null; navigate('dashboard'); try { f(); look(); } catch (e) { bad.push(String(e).slice(0, 60)); } }
    UI.drawer = null; navigate('recurring'); look();
    return [seen.size, bad];
  });
  ok(marks[0] >= 20 && !marks[1].length, 'every required field the panels show wears the * and aria-required (' + marks[0] + ')', marks[1]);
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); });
  // ---------- 5. a card saved before without its due date ----------
  await page.evaluate(() => { delete acct('nu-card').dueDay; navigate('dashboard'); });
  ok(await page.evaluate(() => /Nubank account · Credit has no due date for its invoice/.test(document.querySelector('#view').innerText) || /has no due date for its invoice/.test(document.querySelector('#view').innerText)), 'the dashboard asks for the due date of a card saved without one');
  await page.click('#view [data-a="edit-account"][data-id="nu-card"]'); await page.waitForSelector('.drawer');
  ok(await page.evaluate(() => UI.drawer.kind === 'account' && (!!document.querySelector('#a-cdue') || !!document.querySelector('#a-due'))), 'its button opens the card, where the date is asked');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-required');
})();
