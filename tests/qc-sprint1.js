// QC of the first batch of "what more can help" (owner, 2026-10-10: "open gaps: what more can we add to help the person meet their goals and help
// them with money?", then "ok, start"):
//   1. free to spend until pay day ("You can spend" since 2026-10-11, qc-free-simple.js): the figure, its share a day, the sum line by line (and it adds up), the pay day when there is one, the end of the
//      month when there is none, a shortfall said in red; first on a phone's summary, beside To do on a computer; the household's only;
//   2. spending limits: at 80% of a limit and past it, a reminder in the bell (with the way to its transactions), the same line on the server, once
//      each a month, and none when switched off in the profile;
//   3. Help: the questions people ask, each leading to the screen that answers it; the screen's introduction again; writing to Dorax at the end;
//   4. "your emergency fund" under Days of freedom (the household's, not the company's);
//   5. the shortcuts of the app's icon: ?do=expense opens the expense form, ?do=import opens Imports.
const path = require('path');
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const logic = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'logic.mjs'));
  // ---------- 1. free to spend ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  const r = await page.evaluate(() => freeUntil(S, S.today, CUR));
  eq([r.free, r.cash - r.bills - r.cards - r.goals, r.until, r.pay], [r.cash - r.bills - r.cards - r.goals, r.free, '2026-10-31', null], 'free to spend: what is in the accounts, less the bills, the card and the goals still due; with no pay day, to the end of the month');
  eq(await page.evaluate(() => { const parts = [...document.querySelectorAll('#view > section.card, #view > .card')].map(c => c.id).filter(Boolean); return [parts[0], !!document.querySelector('#free-card .fu-n'), /the end of the month/.test(document.querySelector('#free-card').innerText), /a day/.test(document.querySelector('#free-card').innerText)]; }),
    ['free-card', true, true, true], 'a phone: it is the first part of the summary, one figure, until when, and how much a day');
  await page.click('#free-open'); await page.waitForSelector('.fu-view');
  eq(await page.evaluate(() => [document.querySelectorAll('.fu-steps li').length >= 3, !!document.querySelector('.fu-steps .fu-total'), !!document.querySelector('[data-a="free-pay"]')]), [true, true, true], 'its details: the sum line by line, and the way to set the pay day');
  await page.click('[data-a="free-pay"]'); eq(await page.evaluate(() => [UI.route, !UI.drawer]), ['plan', true], '“Set your pay day” goes to the Plan');
  // a pay day: the figure runs to it
  const withPay = await page.evaluate(() => { const y = +S.today.slice(0, 4), row = (S.pay[y] || [])[0]; if (!row) return null; row.day = 20; const x = freeUntil(S, S.today, CUR); return [x.until, !!x.pay]; });
  if (withPay) eq(withPay, ['2026-10-20', true], 'with a pay day on the 20th, it runs to the 20th');
  // a shortfall
  eq(await page.evaluate(() => { const keep = S.transactions.slice(); S.transactions.push({ id: 'big-out', accountId: 'nu-conta', date: S.today, type: 'expense', amount: -5000000, currency: 'BRL', categoryId: 'other', status: 'confirmed', merchant: 'Big' }); navigate('dashboard'); const c = document.querySelector('#free-card'), out = [c.querySelector('.fu-big').classList.contains('neg'), /Not enough money/.test(c.innerText) && /to pay everything/.test(c.innerText)]; S.transactions = keep; navigate('dashboard'); return out; }),
    [true, true], 'when what is due is more than what there is: the figure in red and how much is missing, without blame');
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); });
  eq(await page.evaluate(() => !document.querySelector('#free-card')), true, 'the company’s side has none (a pay day is the household’s)');
  await page.evaluate(() => { A.space({ v: 'personal' }); navigate('dashboard'); });
  // ---------- 4. the people's words ----------
  eq(await page.evaluate(() => (document.querySelector('#runway-card .rw-alias') || {}).innerText), 'Your emergency fund', 'Days of freedom says “Your emergency fund” under its name');
  // ---------- 2. spending limits ----------
  const add = amount => page.evaluate(a => { S.transactions.push({ id: 'g' + a, accountId: 'nu-card', date: S.today, type: 'expense', amount: -a, currency: 'BRL', categoryId: 'casa', subcategoryId: 'supermercado', status: 'confirmed', merchant: 'Mercado' }); render(); }, amount);
  await add(80000);      // 214,80 + 800 = 1.014,80 of 1.200: 85%
  eq(await page.evaluate(() => { const r = activeReminders().find(x => x.kind === 'budget'); return r && [r.when, r.pct, r.name, r.amount]; }), ['near', 85, 'Groceries', 18520], 'a limit at 85%: a reminder, what is left');
  await page.evaluate(() => A.reminders()); await page.waitForSelector('.drawer .rem-group');
  eq(await page.evaluate(() => { const g = [...document.querySelectorAll('.drawer .rem-group')].find(x => x.querySelector('h3').textContent.trim() === 'Spending limits'); return g && [g.querySelectorAll('.rem').length, /85%/.test(g.innerText), !!g.querySelector('[data-a="issue-open"][data-id^="budget:"]')]; }), [1, true, true], 'the bell lists it under “Spending limits”, a row that opens what is going on (v148)');
  await page.click('.drawer [data-a="issue-open"][data-id^="budget:"]');
  eq(await page.evaluate(() => [...document.querySelectorAll('.iss-fix')].map(b => b.dataset.v)[0]), 'budget-tx', 'its first way: the purchases');
  await page.click('.iss-fix[data-v="budget-tx"]'); eq(await page.evaluate(() => [UI.route, UI.tx.category]), ['transactions', 'supermercado'], 'which leads to its transactions');
  await page.evaluate(() => { navigate('dashboard'); A.reminders(); });
  const doc = await page.evaluate(() => JSON.parse(JSON.stringify(S)));
  const m1 = logic.messageFor(JSON.parse(JSON.stringify(doc)), '2026-10-02', new Set());
  ok(m1 && m1.keys.includes('budget:pl-supermercado:2026-10|near') && m1.lines.some(l => /Groceries: 85% of this month’s limit used/.test(l)), 'the server says the same the next morning, by notification and email', m1 && m1.keys);
  ok(!(logic.messageFor(JSON.parse(JSON.stringify(doc)), '2026-10-02', new Set(m1.keys)) || { keys: [] }).keys.some(k => k.startsWith('budget:')), 'and not twice');
  await add(30000);      // past the limit
  const over = await page.evaluate(() => { const r = activeReminders().find(x => x.kind === 'budget'); return r && [r.when, r.amount]; });
  eq(over, ['over', 11480], 'past the limit: “over”, by how much');
  const doc2 = await page.evaluate(() => JSON.parse(JSON.stringify(S)));
  const m2 = logic.messageFor(doc2, '2026-10-02', new Set(m1.keys));
  ok(m2 && m2.keys.includes('budget:pl-supermercado:2026-10|over'), 'passing it is said once more, on the server too', m2 && m2.keys);
  await page.evaluate(() => { A.close(); S.user.notify.budgets = false; });
  eq(await page.evaluate(() => activeReminders().filter(x => x.kind === 'budget').length), 0, 'switched off in the profile: no reminder');
  await page.evaluate(() => { S.user.notify.budgets = true; navigate('profile'); });
  ok(await page.evaluate(() => !!document.querySelector('#nf-budgets') && document.querySelector('#nf-budgets').checked), 'the profile has its switch, on by default');
  // ---------- 3. Help ----------
  await page.evaluate(() => { navigate('dashboard'); A.sheet(); }); await page.click('.sheet [data-a="help"]'); await page.waitForSelector('.hp-list');
  eq(await page.evaluate(() => [UI.drawer.kind, document.querySelectorAll('.hp-row[data-a="help-go"]').length >= 10, !!document.querySelector('.hp-write [data-a="contact"]'), !!document.querySelector('[data-a="help-tour"]')]), ['help', true, true, true], 'Help: the questions people ask, the screen’s introduction again, and writing to Dorax at the end');
  ok(await page.evaluate(() => [...document.querySelectorAll('.hp-row')].every(b => b.getBoundingClientRect().height >= 44) && document.documentElement.scrollWidth <= innerWidth), 'each question a thumb high, nothing wider than the phone');
  await page.click('[data-a="help-go"][data-v="where"]'); eq(await page.evaluate(() => [UI.route, !UI.drawer]), ['reports', true], '“Where does my money go?” opens Reports');
  await page.evaluate(() => A.help()); await page.click('[data-a="help-go"][data-v="debt"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => (UI.drawer && UI.drawer.kind === 'journey') || !!UI.jstart), '“How do I get out of debt?” opens the Journey');
  await page.evaluate(() => { if (UI.jstart) A['jstart-close'](); A.close(); A.help(); }); await page.click('.hp-write [data-a="contact"]');
  eq(await page.evaluate(() => UI.drawer.kind), 'contact', '“Write to Dorax” opens the contact form');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- the computer ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => navigate('dashboard'));
  eq(await page.evaluate(() => { const c = document.querySelector('#free-card'); return [!!c, !!c.querySelector('.fu-bar') && !!c.querySelector('.fu-how') && !c.querySelector('.fu-steps'), /Puedes gastar/.test(c.querySelector('h2').innerText), (document.querySelector('#runway-card .rw-alias') || {}).innerText]; }), [true, true, true, 'Tu reserva de emergencia'], 'a computer: the card with its sum in view, in Spanish; the emergency fund under Days of freedom');
  await page.evaluate(() => A.help()); eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('.drawer').classList.contains('pop')]), ['help', true], 'Help on a computer: a card in the middle');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- 5. the icon's shortcuts ----------
  for (const [what, check, label] of [['expense', () => !!UI.drawer && UI.drawer.kind === 'tx' && UI.drawer.draft.type === 'expense', 'the expense form'], ['import', () => UI.route === 'imports', 'Imports']]) {
    const file = 'file://' + path.join(__dirname, '..', process.env.DORAX_TARGET === 'bundle' ? 'dist/dorax-preview.html' : 'app/index.html').replace(/ /g, '%20') + '?do=' + what;
    ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true, url: file }));
    await page.waitForTimeout(300);
    eq(await page.evaluate(check), true, `the icon’s shortcut ?do=${what} opens ${label}`);
    eq(await page.evaluate(() => /do=/.test(location.search)), false, `?do=${what}: the address goes back to plain`);
    eq(errors, [], `?do=${what}: no error in the console`); await browser.close();
  }
  const man = JSON.parse(require('fs').readFileSync(path.join(__dirname, '..', 'app', 'manifest.webmanifest'), 'utf8'));
  eq(man.shortcuts.map(s => s.url), ['./?do=expense', './?do=import'], 'the manifest offers the two shortcuts');
  done('qc-sprint1');
})().catch(e => { console.error('qc-sprint1: Error', e); process.exit(1); });
