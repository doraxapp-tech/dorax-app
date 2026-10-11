// QC of the company's side of Plan and Savings & goals (owner, 2026-10-06: "I feel the need to also organize my PJ account like, savings,
// goals, etc"; decided: fixed costs and goals first, one switch Household / Company, each currency by itself).
// What must hold:
//   1. the household is untouched: its screens and its data are the same, byte for byte, after the company's side is used;
//   2. company money never adds into a household figure, and reais never add into dollars;
//   3. everything Plan and Savings & goals do works on the company's side: costs, due days, payments, income, goals, contributions, deletes;
//   4. the bell, the calendar file and the server's reminder job know about the company's bills;
//   5. it reads right on a phone and in the three languages.
const { open, ok, eq, done, TARGET } = require('./pw.js');
const path = require('path');

(async () => {
  const tag = TARGET + ': ';
  const wide = { width: 1440, height: 900 }, phone = { width: 390, height: 800 };
  const quiet = p => p.waitForFunction(() => !document.querySelector('#toast-root').innerText.trim(), null, { timeout: 15000 }).catch(() => {});
  // the household's screens, as text of the page, and its data
  const household = p => p.evaluate(() => { const was = [UI.route, UI.space, UI.spaceCur], out = {}; UI.space = 'personal';
    for (const r of ['dashboard', 'plan', 'goals', 'reports', 'recurring']) { UI.route = r; UI.pg = {}; out[r] = inBook('personal', () => ROUTES.find(x => x[0] === r)[2]()).replace(/\s+/g, ' '); }
    [UI.route, UI.space, UI.spaceCur] = was;
    out.data = JSON.stringify([S.plan, S.goals, S.goalMoves, S.pay, S.categories, S.rules, S.remainderLabel]);
    out.month = JSON.stringify(monthSummary(S, ymOf(S.today), BASE_CURRENCY)); out.personalTx = S.transactions.filter(x => !isBiz(x.accountId)).length;
    return out; });

  // ---------------------------------------------------------------- 1. where the switch is, and where it is not
  {
    const o = await open({ lang: 'en', account: 'example', plan: true, viewport: wide }), p = o.page;
    eq(await p.evaluate(() => { const r = ROUTES.map(r => { UI.route = r[0]; renderShell(); return [document.querySelectorAll('#rail-side [data-a="space"]').length, document.querySelectorAll('.pagehead [data-a="space"], .pagehead .space').length]; }); return [r.every(x => x[0] === 1), r.every(x => x[1] === 0)]; }), [true, true], tag + 'Household | Company is changed from the menu (the two arrows beside the eye), on every screen, and no screen has a switch of its own in the top bar (owner, 2026-10-07)');
    await p.evaluate(() => navigate('plan'));
    eq(await p.evaluate(() => [[...document.querySelectorAll('#rail-side [data-a="space"]')].map(b => [b.getAttribute('aria-label'), b.dataset.v]), document.querySelectorAll('[data-a="space-cur"]').length, S.company === undefined]),
      [[['Switch to Company', 'business']], 0, true], tag + 'it opens on the household, with no currency to choose; nothing is kept for the company until its side is opened');
    await p.evaluate(() => { S.user.company = true; });      // the dashboard's question about a company (2026-10-07) is answered: it goes when a company account is added, which is meant, and is not what this compares
    const before = await household(p);
    // the way to the other side is the two arrows beside the eye, in both themes, readable, and it says where it goes (2026-10-08)
    for (const theme of ['dark', 'light']) eq(await p.evaluate(th => { S.settings.theme = th; render(); const b = document.querySelector('#rail-side .rail-flip'), r = [!!b && !!b.querySelector('svg'), b && b.getAttribute('aria-label'), b && b.closest('.brand') !== null, b && getComputedStyle(b).color !== getComputedStyle(b).backgroundColor]; S.settings.theme = 'dark'; render(); return r; }, theme), [true, 'Switch to Company', true, true], tag + `${theme}: the two arrows beside the eye, at the top of the menu, saying where they go`);
    // a person with no company account sees the switch too (owner: "I never created one, make it visible for all users for now"):
    // the company's side opens in the account's own currency, says an account is missing, and can be planned all the same
    const none = await p.evaluate(() => { const keep = S.accounts, tx = S.transactions.length, out = {}; S.accounts = keep.filter(a => a.scope !== 'business'); S.user.coLater = true; render();      // the company's setup was left for later (tests/qc-sides.js has the setup itself)
      out.home = [!!document.querySelector('#rail-side [data-a="space"]'), !!document.querySelector('#view .banner [data-a="edit-account"]')];
      document.querySelector('[data-a="space"][data-v="business"]').click();
      const note = document.querySelector('#view > .banner');
      out.side = [pageBookKey(), !!document.querySelector('[data-a="space-cur"]'), note.innerText.replace(/\s+/g, ' ').trim(), !!note.querySelector('[data-a="edit-account"][data-scope="business"][data-cur="BRL"]')];
      A['line-new'](); out.from = [...document.querySelectorAll('#l-acct option')].map(x => x.textContent); Object.assign(UI.drawer.draft, { name: 'Trial cost', catId: 'co-tax', amountText: '100', due: '9' }); A['line-save'](); A.close();
      const l = B().plan.lines[0]; A['line-pay-now']({ id: l.id });
      out.plan = [B().plan.lines.length, planValue(B(), l, S.month), S.transactions.length - tx, document.querySelector('#toast-root').innerText.trim().startsWith('Add an account first.'), allReminders().filter(r => r.book && r.kind !== 'issue').map(r => [r.kind, r.name, r.cur])];
      navigate('goals'); out.goals = [pageBookKey(), !!document.querySelector('#view > .banner [data-a="edit-account"]')]; navigate('plan');
      document.querySelector('#view > .banner [data-a="edit-account"]').click();
      out.form = [UI.drawer.kind, UI.drawer.draft.scope, UI.drawer.draft.currency]; UI.drawer.draft.name = 'New PJ'; UI.drawer.draft.openingText = '0'; A['save-account']();
      A['line-pay-now']({ id: l.id }); const x = S.transactions.find(k => k.planLineId === l.id) || {};
      out.after = [!!document.querySelector('#view > .banner'), UI.route, pageBookKey(), S.transactions.length - tx, isBiz(x.accountId), x.amount];
      S.transactions = S.transactions.filter(k => k !== x); S.accounts = keep; delete S.company; delete S.user.coLater; UI.space = 'personal'; UI.toast = UI.undo = null; renderToast(); render(); return out; });
    eq(none, { home: [true, false], side: ['business:BRL', false, 'No company account in BRL yet. You can plan here already. Add the company’s account to pay its bills from it and to keep its goals in it. Add company account', true],
      from: ['No account'], plan: [1, 10000, 0, true, [['bill', 'Trial cost', 'BRL']]], goals: ['business:BRL', true], form: ['account', 'business', 'BRL'], after: [false, 'plan', 'business:BRL', 1, true, -10000] },
      tag + 'without a company account the switch is there all the same: the company’s side opens in reais, says the account is missing and how to add it, and can be planned; its bill is in the bell; paying waits for the account, which the note adds as a company account');

    // ---------------------------------------------------------------- 2. the company's fixed costs
    await p.click('[data-a="space"][data-v="business"]');
    eq(await p.evaluate(() => [pageBookKey(), [...document.querySelectorAll('[data-a="space-cur"]')].map(b => [b.innerText.trim(), b.getAttribute('aria-pressed')]), !!document.querySelector('#paylist .empty'), !!document.querySelector('#paylist a[href="#imports"]'), [...document.querySelectorAll('.tile .value')].map(x => x.innerText.trim()), Object.keys(S.company.books), S.company.categories.map(c => c.name)]),
      ['business:BRL', [['BRL', 'true'], ['USD', 'false']], true, false, ['R$ 0,00', 'R$ 0,00', 'R$ 0,00', 'R$ 0,00'], ['BRL'], ['Taxes', 'Accounting and services', 'Tools and software', 'Pay and people', 'Other', 'Income']],
      tag + 'the company’s side opens in reais, offers the dollars too, and starts empty: no cost, no figure, its own groups');
    await p.click('.topbar [data-a="line-new"]'); await p.waitForSelector('#l-name');
    eq(await p.evaluate(() => [[...document.querySelectorAll('#l-cat option')].map(x => x.textContent), [...document.querySelectorAll('#l-acct option')].map(x => x.textContent), document.querySelector('#l-name').placeholder, document.querySelector('label[for="l-amount"]').innerText.replace('*', '').trim(), UI.drawer.book]),
      [['Taxes', 'Accounting and services', 'Tools and software', 'Pay and people', 'Other'], ['Nubank PJ (main)', 'Wise BRL'], 'e.g. Accountant, taxes', 'Each month (R$)', 'business:BRL'], tag + 'a new company cost chooses among the company’s groups and is paid from a company account in reais');
    await p.fill('#l-name', 'Accounting fee'); await p.selectOption('#l-cat', 'co-services'); await p.fill('#l-amount', '189'); await p.fill('#l-due', '4'); await p.click('[data-a="line-save"]'); await p.click('#overlay [data-a="close"]');
    await p.evaluate(() => { const mk = (name, cat, amount, due, pay) => { A['line-new'](); Object.assign(UI.drawer.draft, { name, catId: cat, amountText: String(amount), due: due ? String(due) : '', pay: pay || 'fixed' }); A['line-save'](); A.close(); };
      mk('Monthly tax', 'co-tax', 1250, 20, 'variable'); mk('Owner pay', 'co-people', 1518, 5); mk('Software', 'co-tools', 60, 9);
      delete S.company.books.BRL.plan.lines.find(x => x.name === 'Software').due;      // a cost saved before its due day was required (v121): the due days panel asks for it
      save(); }); await quiet(p);
    eq(await p.evaluate(() => { const b = S.company.books.BRL, l = b.plan.lines[0], sub = S.company.categories.find(c => c.id === 'co-services').subs[0];
      return [b.plan.lines.map(x => [x.name, x.categoryId, x.due || null, x.pay]), l.subcategoryId === sub.id && sub.name === 'Accounting fee', planValue(B(), l, S.month), S.plan.lines.some(x => x.name === 'Accounting fee'), S.categories.some(c => c.subs.some(s => s.name === 'Accounting fee'))]; }),
      [[['Accounting fee', 'co-services', 4, 'fixed'], ['Monthly tax', 'co-tax', 20, 'variable'], ['Owner pay', 'co-people', 5, 'fixed'], ['Software', 'co-tools', null, 'fixed']], true, 18900, false, false],
      tag + 'the costs are kept in the company’s book for reais, each under a company group; none is in the household’s plan or categories');
    eq(await p.evaluate(() => [[...document.querySelectorAll('.tile .value')].map(x => x.innerText.trim()), [...document.querySelectorAll('#paylist tr.grp b')].map(x => x.innerText.trim()), [...document.querySelectorAll('#paylist tr.grp .dot')].every(d => !/ink-3/.test(d.getAttribute('style'))), (A['plan-year-open'](), document.querySelectorAll('#plan-year tbody input').length), A.close()].slice(0, 4)),
      [['R$ 3.017,00', 'R$ 0,00', 'R$ 3.017,00', '−R$ 3.017,00'], ['Taxes', 'Accounting and services', 'Tools and software', 'Pay and people'], true, 48], tag + 'the page shows them grouped, in their group’s colour, with the month’s figures and a year grid to type in');

    // paying: one click records an expense in the company account, tied to the cost
    const txBefore = await p.evaluate(() => S.transactions.length);
    await p.click('#paylist [data-a="line-pay-now"]'); await quiet(p);
    eq(await p.evaluate(n => { const x = S.transactions.find(k => k.planLineId === S.company.books.BRL.plan.lines[0].id) || {}, pr = planProgress(B(), S.month, BCUR(), S.today).find(q => q.name === 'Accounting fee');
      return [S.transactions.length - n, x.accountId, x.amount, x.currency, x.categoryId, isBiz(x.accountId), pr.status, pr.spent, document.querySelectorAll('.tile .value')[1].innerText.trim()]; }, txBefore),
      [1, 'nu-pj', -18900, 'BRL', 'co-services', true, 'paid', 18900, 'R$ 189,00'], tag + '“Mark as paid” records the planned amount as an expense in the company account, and the cost reads as paid');
    // income for the company, and the year grid
    await p.evaluate(() => A['plan-income']());      // a computer keeps the income one click away (2026-10-11)
    await p.click('[data-a="add-pay"]'); await p.waitForSelector('.payrow input');
    await p.evaluate(() => { const y = S.today.slice(0, 4), r = B().pay[y][0]; r.name = 'Client A'; r.values = r.values.map(() => 1200000); render(); });
    eq(await p.evaluate(() => { const y = S.today.slice(0, 4); return [S.company.books.BRL.pay[y].length, (S.pay[y] || []).some(r => r.name === 'Client A'), S.company.categories.find(c => c.income).subs.length, S.categories.find(c => c.income).subs.some(s => s.id === S.company.books.BRL.pay[y][0].sub), document.querySelectorAll('.tile .value')[3].innerText.trim()]; }),
      [1, false, 2, false, 'R$ 8.983,00'], tag + 'the company’s income is its own row, under the company’s income group; income minus fixed costs follows');
    // a cell of the year grid
    await p.evaluate(() => { if (!document.querySelector('#plan-year')) A['plan-year-open'](); });
    await p.fill('#plan-year tbody tr:nth-of-type(2) td:nth-of-type(12) input', '11000'); await p.keyboard.press('Tab'); await quiet(p);
    eq(await p.evaluate(() => S.company.books.BRL.pay[S.today.slice(0, 4)][0].values[11]), 1100000, tag + 'typing in the year grid changes the company’s own row');

    // due days: the company's bills only
    await p.evaluate(() => A.close());
    await p.click('#paylist [data-a="due-days"]'); await p.waitForSelector('.due-row');
    eq(await p.evaluate(() => [[...document.querySelectorAll('.due-row b')].map(b => b.innerText.trim()), [...document.querySelectorAll('.due-group h3')].map(h => h.textContent.trim())]), [['Monthly tax', 'Accounting fee', 'Software', 'Owner pay'], ['Taxes', 'Accounting and services', 'Tools and software', 'Pay and people']], tag + 'the due days panel lists the company’s bills, not the household’s');
    await p.evaluate(() => { const l = S.company.books.BRL.plan.lines.find(x => x.name === 'Software'); const el = document.getElementById('dd-' + l.id); el.value = '28'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.click('[data-a="due-save"]'); await quiet(p);
    eq(await p.evaluate(() => [S.company.books.BRL.plan.lines.find(x => x.name === 'Software').due, S.plan.lines.filter(l => l.due === 28).length]), [28, 0], tag + 'a due day saved there is the company cost’s');

    // ---------------------------------------------------------------- 3. the dollars: another book
    await p.click('[data-a="space-cur"][data-v="USD"]');
    eq(await p.evaluate(() => [pageBookKey(), !!document.querySelector('#paylist .empty'), [...document.querySelectorAll('.tile .value')].map(x => x.innerText.trim()), Object.keys(S.company.books)]), ['business:USD', true, ['US$ 0,00', 'US$ 0,00', 'US$ 0,00', 'US$ 0,00'], ['BRL', 'USD']], tag + 'the dollars are a book of their own: empty, in US$, with none of the reais’ costs');
    await p.evaluate(() => { S.accounts.push({ id: 'wise-usd-save', name: 'Wise USD reserve', institution: 'Wise', type: 'savings', currency: 'USD', scope: 'business', monthly: false, purpose: '', opening: 0 }); navigate('goals'); });      // a goal is kept in a savings account (owner, 2026-10-09)
    eq(await p.evaluate(() => [pageBookKey(), !!document.querySelector('#view .empty'), UI.space]), ['business:USD', true, 'business'], tag + 'Savings & goals opens on the same side and currency, with no goal yet');
    await p.click('#view [data-a="goal-new"]'); await p.waitForSelector('#g-name');
    // (owner, 2026-10-09: "'already saved' beside the target date when the goal has a target; 'kept in' above the monthly plan")
    eq(await p.evaluate(() => { const y = s => Math.round(document.querySelector(s).getBoundingClientRect().top); return [y('#g-deadline-m') === y('#g-initial'), y('#g-acct') < y('#g-monthly'), !document.querySelector('#overlay .form-more:not([hidden]) ~ * #g-acct')]; }), [true, true, true], tag + 'the goal form: already saved beside the target date, kept in above the monthly plan');
    eq(await p.evaluate(() => [[...document.querySelectorAll('#g-acct option')].map(x => x.textContent), document.querySelector('label[for="g-target"]').innerText.replace('*', '').trim(), document.querySelector('label[for="g-initial"]').innerText.trim(), document.querySelector('label[for="g-monthly"]').innerText.trim(), document.querySelector('#g-name').placeholder]),
      [['Wise USD reserve'], 'Target (US$)', 'Already saved (US$)', 'Each month (US$)', 'e.g. Taxes, Reserve, Equipment'], tag + 'a company goal in dollars is kept in a company dollar savings account (the only one, so it is chosen), and every label says US$');
    await p.fill('#g-name', 'Laptop'); await p.fill('#g-target', '2400'); await p.selectOption('#g-acct', 'wise-usd-save'); await p.fill('#g-initial', '400'); await p.fill('#g-monthly', '300'); await p.click('[data-a="goal-save"]'); await p.click('#overlay [data-a="close"]');
    await p.evaluate(() => { A['goal-new'](); Object.assign(UI.drawer.draft, { name: 'Tax reserve', kind: 'fund', monthlyText: '500' }); A['goal-save'](); A.close(); save(); }); await quiet(p);
    eq(await p.evaluate(() => { const b = S.company.books.USD; return [b.goals.map(g => [g.name, g.kind, g.target, g.accountId]), b.goalMoves.map(m => [m.amount, !!m.start]), S.company.books.BRL.goals.length, S.goals.some(g => g.name === 'Laptop'), [...document.querySelectorAll('.tile .value')].map(x => x.innerText.trim()), [...document.querySelectorAll('.goal b')].map(x => x.innerText.trim())]; }),
      [[['Laptop', 'goal', 240000, 'wise-usd-save'], ['Tax reserve', 'fund', null, 'wise-usd-save']], [[40000, true]], 0, false, ['US$ 400,00', 'US$ 800,00', 'US$ 0,00', '−US$ 800,00'], ['Laptop', 'Tax reserve']],
      tag + 'the goals are in the dollar book only: not in the reais’, not in the household’s; the figures are in US$');
    // hand out the month, then a withdrawal
    await p.click('[data-a="dist-register"]'); await quiet(p);
    eq(await p.evaluate(() => { const b = S.company.books.USD, g = b.goals[0]; return [b.goalMoves.length, goalSaved(B(), g.id), goalMonth(B(), g.id, S.month), S.goalMoves.length === JSON.parse(JSON.stringify(S.goalMoves)).length, document.querySelectorAll('.tile .value')[2].innerText.trim()]; }), [3, 70000, 30000, true, 'US$ 800,00'], tag + 'handing out the month records one contribution per company goal, in dollars');
    await p.click('.goal [data-a="goal-open"]'); await p.click('.drawer [data-a="goal-move"][data-dir="out"]'); await p.waitForSelector('#m-amount');      // Withdraw is in the details (owner, 2026-10-08)
    eq(await p.evaluate(() => [accountBalance(S, 'wise-usd-save'), S.transactions.filter(x => x.goalMoveId).map(x => [x.accountId, x.amount]).sort()]), [80000, [['wise-usd', -30000], ['wise-usd', -50000], ['wise-usd-save', 30000], ['wise-usd-save', 50000]]], tag + 'the month’s contributions to the company goals went out of the company’s dollar account into its dollar savings');
    eq(await p.evaluate(() => [document.querySelector('label[for="m-amount"]').innerText.replace('*', '').trim(), !!document.querySelector('#m-acct'), [...document.querySelectorAll('#m-from option')].map(x => x.textContent), document.querySelector('#m-say').innerText.includes('Wise USD reserve')]), ['Amount (US$)', false, ['Wise USD'], true], tag + 'a withdrawal asks in US$, from the goal’s company dollar savings (said, not asked), back to the company dollar account');
    await p.fill('#m-amount', '900'); await p.click('[data-a="move-save"]');
    ok((await p.locator('#overlay .banner.crit').innerText()).includes('US$ 700,00'), tag + 'more than is saved is refused, said in US$');
    await p.fill('#m-amount', '100'); await p.click('[data-a="move-save"]'); await quiet(p);
    eq(await p.evaluate(() => goalSaved(B(), S.company.books.USD.goals[0].id)), 60000, tag + 'a withdrawal lowers the company goal');
    // deleting asks first, in the middle, and takes only the company goal
    await p.evaluate(() => A.close()); await p.waitForTimeout(250);      // the withdrawal came from the details, which are open again
    await p.click('.goal:nth-of-type(2) [data-a="goal-open"]'); await p.click('#goal-menu-btn'); await p.waitForSelector('[data-a="goal-delete-ask"]'); await p.click('[data-a="goal-delete-ask"]');      // Delete is under More (owner, 2026-10-09) await p.waitForSelector('#modal-ok');
    const box = await p.evaluate(() => { const m = document.querySelector('#modal-root [role="alertdialog"], #modal-root [role="dialog"], .modal'), r = m.getBoundingClientRect(); return [Math.abs((r.left + r.right) / 2 - (r => (r.left + r.right) / 2)(document.querySelector('.app').getBoundingClientRect())) <= 2, !!document.querySelector('#modal-word'), S.company.books.USD.goals.length]; });
    eq(box, [true, true, 2], tag + 'deleting a company goal with money in it asks in a centred pop-up and wants the word typed; nothing goes until then');
    await p.fill('#modal-word', 'delete'); await p.click('#modal-ok'); await quiet(p);
    eq(await p.evaluate(() => [S.company.books.USD.goals.map(g => g.name), S.company.books.USD.goalMoves.every(m => m.goalId === S.company.books.USD.goals[0].id), S.goals.length > 0]), [['Laptop'], true, true], tag + 'after it the company goal and its movements are gone; the household’s goals are all there');

    // ---------------------------------------------------------------- 4. the household is exactly as it was
    const after = await household(p);
    for (const k of Object.keys(before)) eq(after[k] === before[k], true, tag + `the household’s ${k === 'data' ? 'plan, goals, income and categories' : k === 'month' ? 'figures of the month' : k === 'personalTx' ? 'own transactions' : k + ' screen'} did not change by one character`);
    eq(await p.evaluate(() => { const sum2 = (b, cur) => sum(planProgress(b, S.month, cur, S.today).map(x => x.spent)); return [sum2(companyBook(S, 'BRL'), 'BRL'), sum2(companyBook(S, 'USD'), 'USD'), categoryTotals(S, S.month, 'BRL').byCat['co-services'] || 0, monthSummary(companyBook(S, 'BRL'), S.month, 'BRL').expenses >= 18900]; }),
      [18900, 0, 0, true], tag + 'the payment counts in the reais book, not in the dollar book and not in any household total');

    // ---------------------------------------------------------------- 5. the bell and the reminders
    await p.evaluate(() => { A.space({ v: 'personal' }); navigate('dashboard'); });      // the dashboard has two sides since 2026-10-07: this part is about the household's
    // 2026-10-09 (owner: "the accounts do not mix"): each side's bell is its own; the company's bill is on the company's side
    const bell = await p.evaluate(() => { const all = allReminders(), co = all.filter(r => r.book && r.kind !== 'issue'), n = document.querySelector('.bell .count'); return [pageBookKey(), co.map(r => [r.kind, r.name || '', r.cur, r.when, r.id.startsWith('business:')]), new Set(all.map(r => r.id)).size === all.length, (n ? +n.innerText : 0) === activeReminders().length && activeReminders().every(r => !r.book)]; });
    eq(bell, ['personal', [['bill', 'Owner pay', 'BRL', 'soon', true]], true, true], tag + 'the company’s bill that is coming up has its book and currency, no id is used twice, and the household’s bell counts only the household’s');
    await p.evaluate(() => A.space({ v: 'business' })); await p.waitForTimeout(200);
    await p.click('.bell'); await p.waitForSelector('.rem');
    eq(await p.evaluate(() => [...document.querySelectorAll('.rem')].filter(r => (r.querySelector('[data-book]') || { dataset: {} }).dataset.book === 'business:BRL').map(r => [r.querySelector('.rem-t b').innerText.replace(/\s+/g, ' ').trim(), r.querySelector('.num').innerText.trim()])),
      [['Owner pay', 'R$ 1.518,00']], tag + 'on the company’s side its bell lists its bill, in its own currency, carrying its book');
    const homeLines = await p.evaluate(() => JSON.stringify(S.plan.lines));
    await p.click('.rem [data-a="line-pay-now"][data-book="business:BRL"]'); await quiet(p);
    eq(await p.evaluate(h => { const l = S.company.books.BRL.plan.lines.find(x => x.name === 'Owner pay'), x = S.transactions.find(k => k.planLineId === l.id) || {}; return [x.accountId, x.amount, x.categoryId, UI.route, pageBookKey().startsWith('business:'), JSON.stringify(S.plan.lines) === h, allReminders().some(r => r.lineId === l.id)]; }, homeLines),
      ['nu-pj', -151800, 'co-people', 'dashboard', true, true, false], tag + 'paid from the company’s bell, the payment lands in the company account and book; the household’s plan is untouched and the reminder is gone');
    // a variable bill from the bell opens the payment panel of the company's book
    await p.evaluate(() => { A.close(); const l = S.company.books.BRL.plan.lines.find(x => x.name === 'Monthly tax'); l.due = +S.today.slice(8) + 1; render(); }); await p.click('.bell'); await p.waitForSelector('.rem [data-a="line-pay"][data-book="business:BRL"]');
    await p.click('.rem [data-a="line-pay"][data-book="business:BRL"]'); await p.waitForSelector('#py-amount');
    eq(await p.evaluate(() => [UI.drawer.book, [...document.querySelectorAll('#py-acct option')].map(x => x.textContent), document.querySelector('label[for="py-amount"]').innerText.replace('*', '').trim()]), ['business:BRL', ['Nubank PJ (main)', 'Wise BRL'], 'Amount (R$)'], tag + 'recording a company payment from the bell offers the company’s accounts');
    await p.fill('#py-amount', '1.301,55'); await p.selectOption('#py-acct', 'wise-brl'); await p.click('[data-a="pay-save"]'); await quiet(p);
    eq(await p.evaluate(() => { const l = S.company.books.BRL.plan.lines.find(x => x.name === 'Monthly tax'), x = S.transactions.find(k => k.planLineId === l.id); return [x.accountId, x.amount, planProgress(companyBook(S, 'BRL'), S.month, 'BRL', S.today).find(q => q.id === l.id).status, UI.drawer]; }), ['wise-brl', -130155, 'over', null], tag + 'and the amount typed is what counts against the plan');
    // the calendar file and the list of next reminders name the company's bills too
    eq(await p.evaluate(() => [calendarEvents().filter(e => /Accounting fee|Software|Monthly tax|Owner pay/.test(e.title)).length, reminderScheduleAll(S, S.today, 3, 45).filter(x => x.book).map(x => [x.name, x.cur]), new Set(calendarEvents().map(e => e.uid)).size === calendarEvents().length]), [4, [['Software', 'BRL'], ['Monthly tax', 'BRL'], ['Accounting fee', 'BRL'], ['Owner pay', 'BRL']], true], tag + 'the calendar file has one event per company bill with a due day, each with its own id; the next reminders list the company’s bills in the order they go out');
    ok((await p.evaluate(() => reminderScheduleAll(S, S.today, 3, 45).filter(x => x.book).every(x => x.cur === 'BRL' && x.sendDate <= x.date))) === true, tag + 'the next reminders of the company are dated before their due day');

    // ---------------------------------------------------------------- 6. a company movement and the company's costs
    await p.evaluate(() => { A.close(); A.space({ v: 'personal' }); }); await p.waitForTimeout(200);
    await p.evaluate(() => { navigate('transactions'); A['new-tx'](); UI.drawer.draft.accountId = 'nu-pj'; renderOverlay(); });
    eq(await p.evaluate(() => { const picks = [...document.querySelectorAll('.tx-pick[data-k]')]; return [document.querySelector('#tx-cat-l').innerText.trim(), picks.length > 0, picks.every(b => { const c = companyCats().find(k => k.id === b.dataset.k.split('|')[0]); return !!c && !c.income; }), document.querySelectorAll('#d-cat').length]; }), ['Company cost or income', true, true, 0], tag + 'in a company account the groups at a touch are the company’s own costs, never the household’s');
    await p.click('[data-a="tx-cats-all"]');
    eq(await p.evaluate(() => [document.querySelector('label[for="d-cat"]').textContent.trim(), [...document.querySelectorAll('#d-cat optgroup')].map(g => g.label), document.querySelector('#d-cat option').textContent, !!document.querySelector('[data-a="split-on"]')]), ['Company cost or income', ['Taxes', 'Accounting and services', 'Tools and software', 'Pay and people', 'Other', 'Income'], 'Not in the company plan', false], tag + 'a movement in a company account can be tied to one of the company’s costs or income rows, and to nothing of the household');
    const soft = await p.evaluate(() => { const l = S.company.books.BRL.plan.lines.find(x => x.name === 'Software'); return catKey(l.categoryId, l.subcategoryId); });
    await p.fill('#d-merchant', 'NOTION LABS'); await p.fill('#d-amount', '58,40'); await p.selectOption('#d-cat', soft); await p.click('[data-a="save-tx"]'); await quiet(p);
    eq(await p.evaluate(() => { const l = S.company.books.BRL.plan.lines.find(x => x.name === 'Software'), pr = planProgress(companyBook(S, 'BRL'), S.month, 'BRL', S.today).find(q => q.id === l.id), x = S.transactions.find(k => k.merchant === 'NOTION LABS'); return [x.categoryId, x.subcategoryId === l.subcategoryId, pr.spent, pr.status, UI.rulePrompt, catLabel(x).replace(/<[^>]+>/g, '')]; }), ['co-tools', true, 5840, 'paid', null, 'Company · Software'], tag + 'tied to a cost, it counts as that cost’s payment; no household rule is offered, and the list names the cost');
    // the same choice is refused for a household account, and a household category for a company one
    eq(await p.evaluate(k => { const x = S.transactions.find(q => q.merchant === 'NOTION LABS'); A['open-tx']({ id: x.id }); UI.drawer.draft.accountId = personal()[0].id; A['save-tx'](); const a = [x.categoryId, x.subcategoryId]; A['open-tx']({ id: x.id }); UI.drawer.draft.accountId = 'nu-pj'; UI.drawer.draft.catKey = catKey(S.categories[0].id); A['save-tx'](); return [a, [x.categoryId, x.subcategoryId]]; }, soft), [['other', null], [null, null]], tag + 'moved to a household account it loses the company cost; a household category never sticks to a company movement');

    // ---------------------------------------------------------------- 7. language, saving, clearing
    await p.evaluate(() => { S.settings.lang = 'pt'; render(); });
    eq(await p.evaluate(() => [S.company.categories.map(c => c.name), S.company.books.BRL.plan.lines.map(l => l.name), S.company.categories.find(c => c.income).subs.map(s => s.name)]), [['Impostos', 'Contabilidade e serviços', 'Ferramentas e software', 'Salários e equipe', 'Outros', 'Renda'], ['Accounting fee', 'Monthly tax', 'Owner pay', 'Software'], ['Pagamentos de clientes', 'Outra receita']], tag + 'the company’s groups follow the language; what the person typed does not change');
    await p.evaluate(() => { S.settings.lang = 'en'; render(); save(); saveNow(); });
    await p.waitForFunction(() => savedState() === 'saved' && accountJson() === SYNC.last);
    ok(await p.evaluate(() => backupClean(JSON.parse(JSON.stringify(S)))), tag + 'an account with a company side is still a clean backup');
    await p.reload(); await p.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
    eq(await p.evaluate(() => [Object.keys(S.company.books), S.company.books.BRL.plan.lines.length, S.company.books.USD.goals.map(g => g.name), UI.space, pageBookKey()]), [['BRL', 'USD'], 4, ['Laptop'], 'personal', 'personal'], tag + 'the company’s side is saved with the account and is there after a reload; the app opens on the household');
    eq(o.errors, [], tag + 'no errors'); await o.browser.close();
  }

  // ---------------------------------------------------------------- 8. phone, three languages; leaving the company's side
  for (const lang of ['en', 'es', 'pt']) {
    const o = await open({ lang, account: 'example', plan: true, viewport: phone, mobile: true, touch: true }), p = o.page, where = `${tag}${lang} 390: `;
    await p.evaluate(() => navigate('plan')); await p.click('.navbar .side-flip');      // a phone has no side menu: the side is changed with the button beside the bell
    await p.evaluate(() => { const mk = (name, cat, amount, due) => { A['line-new'](); Object.assign(UI.drawer.draft, { name, catId: cat, amountText: String(amount), due: String(due) }); A['line-save'](); A.close(); }; mk('Accounting fee', 'co-services', 189, 10); mk('Monthly tax for the company', 'co-tax', 1250, 20); render(); }); await quiet(p);
    for (const route of ['plan', 'goals']) {
      await p.evaluate(r => navigate(r), route);
      eq(await p.evaluate(() => { const s = document.querySelector('.pagehead .space').getBoundingClientRect(), h = document.querySelector('.pagehead h1').getBoundingClientRect(), bs = [...document.querySelectorAll('.space .seg button')].map(b => b.getBoundingClientRect()), pill = document.querySelector('.navbar .side-flip'), pr = pill.getBoundingClientRect();
        return [document.documentElement.scrollWidth - innerWidth <= 0, s.top >= h.bottom - 1, s.right <= innerWidth && s.left >= 0, bs.every(b => b.height >= 36 && b.width >= 44), document.querySelectorAll('.space .seg').length, pill.dataset.v, pr.height >= 40 && pr.width >= 40 && pr.left >= 0 && pr.bottom <= h.top + 1, document.querySelectorAll('.pagehead [data-a="space"]').length]; }), [true, true, true, true, 1, 'personal', true, 0], where + `${route}: the side is chosen in the panel at the top, each choice big enough for a thumb; the currency sits under the title, inside the screen; no Household | Company switch on the page; nothing is wider than the phone`);
    }
    await p.evaluate(() => navigate('plan')); await p.click('#tabbar .fab'); await p.click('.quick-grid [data-a="quick-go"][data-v="cost"]'); await p.waitForSelector('#l-name');      // the phone's round +: "Add a fixed cost" is one of the things it offers
    eq(await p.evaluate(() => [UI.drawer.book, document.documentElement.scrollWidth - innerWidth <= 0]), ['business:BRL', true], where + 'the round + at the foot of the screen adds a cost to the side being shown');
    await p.evaluate(() => A.close());
    // every text of the company's side is in the language chosen
    eq(await p.evaluate(() => [t('Whose money'), t('Not in the company plan'), t('Company cost or income'), t('e.g. Accountant, taxes'), t('e.g. Taxes, Reserve, Equipment')].every(x => typeof x === 'string' && x.length > 3) && (S.settings.lang === 'en' || t('Whose money') !== 'Whose money')), true, where + 'the new texts are translated');
    // the company's last account goes: its side and its plan stay, and the page says an account is missing
    eq(await p.evaluate(() => { const keep = S.accounts; S.accounts = keep.filter(a => a.scope !== 'business'); render(); const n = document.querySelector('#view > .banner'), r = [document.querySelectorAll('.navbar .side-flip').length === 1, pageBookKey(), S.company.books.BRL.plan.lines.length, !!n && n.getBoundingClientRect().right <= innerWidth, document.documentElement.scrollWidth - innerWidth <= 0, companyCurrencies(S)]; S.accounts = keep; render(); return r.concat(pageBookKey()); }), [true, 'business:BRL', 2, true, true, ['BRL'], 'business:BRL'], where + 'when the company’s accounts are gone the switch and the plan stay, and the note about the missing account fits the phone');
    await p.evaluate(() => { wipeAll(); }); await quiet(p);
    eq(await p.evaluate(() => [S.company === undefined, UI.space, S.accounts.length]), [true, 'personal', 0], where + '“Delete all your data” deletes the company’s side too');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }

  // ---------------------------------------------------------------- 9. the server's reminder job reads the same books
  if (TARGET === 'app') {
    const E = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'engine.mjs'));
    const { load } = require('./load.js'), L = load();
    for (const lang of ['pt', 'en']) {
      const acc = L.buildNewState('co@example.org', lang, '2026-10-02');
      acc.accounts.push({ id: 'h1', name: 'Home', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'personal', opening: 0 }, { id: 'c1', name: 'PJ', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'business', opening: 0 }, { id: 'c2', name: 'Wise USD', institution: 'Wise', type: 'checking', currency: 'USD', scope: 'business', opening: 0 });
      acc.plan.lines.push({ id: 'pl-h', name: 'Rent', categoryId: 'home', subcategoryId: null, pay: 'fixed', due: 5, accountId: 'h1', plan: { 2026: Array(12).fill(180000) }, end: null });
      const quietAcc = E.openAccount(JSON.parse(JSON.stringify(acc)), '2026-10-02').reminders.map(r => r.id);
      const usd = L.companyData(acc, 'USD', true), brl = L.companyData(acc, 'BRL', true);
      usd.plan.lines.push({ id: 'pl-u', name: 'Design tool', categoryId: 'co-tools', subcategoryId: null, pay: 'fixed', due: 4, accountId: 'c2', plan: { 2026: Array(12).fill(5000) }, end: null });
      brl.plan.lines.push({ id: 'pl-b', name: 'Accountant', categoryId: 'co-services', subcategoryId: null, pay: 'variable', due: 1, accountId: 'c1', plan: { 2026: Array(12).fill(18900) }, end: null });
      const open2 = E.openAccount(JSON.parse(JSON.stringify(acc)), '2026-10-02'), rs = open2.reminders, co = lang === 'pt' ? 'Empresa' : 'Company';
      eq([quietAcc, rs.map(r => [r.id, r.book || null, r.cur || null, r.when])], [['bill:pl-h:2026-10'], [['bill:pl-h:2026-10', null, null, 'soon'], ['business:BRL:bill:pl-b:2026-10', 'business:BRL', 'BRL', 'late'], ['business:USD:bill:pl-u:2026-10', 'business:USD', 'USD', 'soon']]], `server ${lang}: the job finds the household’s bill and, after it, the company’s in each currency, each with an id of its own`);
      const d = open2.digest(rs), one = open2.push(rs.filter(r => r.book === 'business:USD')), mailOne = open2.digest(rs.filter(r => r.book === 'business:USD'));
      ok(d.lines[1].startsWith(co + ' · Accountant: ≈ R$ 189,00') && d.lines[2].startsWith(co + ' · Design tool: US$ 50,00') && !d.lines[0].startsWith(co), `server ${lang}: the email says which bills are the company’s, each amount in its own currency`, d.lines);
      eq([one.title, mailOne.subject.startsWith(co + ' · Design tool: ')], [co + ' · Design tool · US$ 50,00', true], `server ${lang}: a notification for one company bill names the company, the bill and the dollars`);
      eq(new Set(rs.map(open2.key)).size, 3, `server ${lang}: each has its own key, so each is sent once per stage`);
      // paid in the company account: the reminder goes; a household payment of the same name changes nothing
      acc.transactions.push({ id: 't1', accountId: 'c2', date: '2026-10-01', description: 'x', merchant: 'x', amount: -5000, currency: 'USD', type: 'expense', categoryId: 'co-tools', subcategoryId: null, status: 'confirmed' }, { id: 't2', accountId: 'h1', date: '2026-10-01', description: 'y', merchant: 'y', amount: -18900, currency: 'BRL', type: 'expense', categoryId: 'co-services', subcategoryId: null, status: 'confirmed' });
      eq(E.openAccount(JSON.parse(JSON.stringify(acc)), '2026-10-02').reminders.map(r => r.id), ['bill:pl-h:2026-10', 'business:BRL:bill:pl-b:2026-10'], `server ${lang}: a payment in the company’s dollar account settles the dollar bill; money spent from a household account never settles a company bill`);
    }
  }
  done('qc-company');
})().catch(e => { console.error('qc-company: Error', e); process.exit(1); });
