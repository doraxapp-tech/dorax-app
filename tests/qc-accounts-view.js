// QC of a phone's Accounts and the panel of an account.
//   1. (owner, 2026-10-11: "do what you propose") one button, then the accounts as rows by kind under their totals (day to day, credit cards, savings)
//      and how long the savings last; no view switch and no delete button any more (an account is deleted from its form); a computer keeps its cards;
//   2. a tap on a row opens the account's panel, the card large with its details and what can be done with it; closing it, the focus returns to the row;
//   5. (owner, 2026-10-08: "add the tap action on the cards in the summary tab: when the user taps a card a menu opens with details and actions")
//      a tap on a card of the summary opens the same panel: the card, its details, and an expense or an income in it, its transactions, its form;
//      an expense starts in that account; a credit card has no income; its transactions open with the panel closed;
//   6. (owner, same day: "the eye toggle on the phone has a bug, the figure hides and gets lost") hidden, the balance is still a whole line of dots;
//   7. "Add account" opens the account form; an account is deleted from its form (Edit account, at its foot), after a confirmation; one with
//      transactions cannot be deleted until they are moved or deleted.
// v194: the household's phone has the summary "Bosque" in both themes (tests/qc-summary-phone.js tests it); this suite tests the parts of the
// previous phone look that the company's side and a computer still share, so it opens the app in that look (tests/pw.js: oldLook)
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ oldLook: true, lang: 'es', account: 'example', plan: true, beta: true, motion: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => navigate('accounts')); await page.waitForTimeout(700);
  // ---------- 1. the page ----------
  eq(await page.evaluate(() => { const v = document.querySelector('#view'); return [!!v.querySelector('.acc-ph-acts'), ['#acc-day', '#acc-cc', '#acc-sv', '#acc-cover'].map(q => !!v.querySelector(q)), [...v.querySelectorAll('.acc-grp h2')].map(h => h.innerText.trim()), !v.querySelector('.acc-view, .acc-stack, .cc-grid, [data-a="acct-del-pick"]'), document.documentElement.scrollWidth - innerWidth]; }),
    [true, [true, true, true, true], ['Día a día', 'Tarjetas de crédito', 'Tus ahorros'], true, 0], 'one button, then Día a día, Tarjetas de crédito and Tus ahorros as rows, then how long the savings last; no view switch, no stack, no delete button; nothing wider than the phone');
  eq(await page.evaluate(() => [...document.querySelectorAll('.acc-grp .ac-row')].every(r => r.getBoundingClientRect().height >= 56 && !!r.querySelector('.inst') && !!r.querySelector('.grow b') && !!r.querySelector('.num') && r.querySelector('.num').getBoundingClientRect().right <= innerWidth - 16)), true, 'each row: the bank’s mark, the name, what it holds, a thumb high, inside the screen');
  // ---------- 2. a row opens its panel ----------
  const second = await page.evaluate(() => document.querySelectorAll('.acc-grp .ac-row')[1].dataset.id);
  await page.tap(`.acc-grp .ac-row[data-id="${second}"]`); await page.waitForSelector('.drawer .cv, .sheet .cv');
  eq(await page.evaluate(id => [UI.drawer.kind, UI.drawer.id === cardMain(acct(id)).id, !!document.querySelector('#overlay .cv .ccard'), !!document.querySelector('#overlay .cv .cv-ops')], second), ['card-view', true, true, true], 'a tap on a row opens its panel, the card large, its details and its transactions');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => document.activeElement.dataset.id), second, 'closed: the focus is back on that row');
  // ---------- 7. add, and delete from the account's form ----------
  eq(await page.evaluate(() => [...document.querySelectorAll('.acc-ph-acts .btn')].map(b => [b.dataset.a, b.innerText.trim(), b.getBoundingClientRect().height >= 44])), [['account-add', 'Agregar cuenta', true]], 'one button on top of Accounts: Agregar cuenta, a thumb high');
  await page.tap('.acc-ph-acts [data-a="account-add"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.isNew, UI.drawer && UI.drawer.draft.scope]), ['account', true, 'personal'], 'Agregar cuenta opens the form for a new account of the household');
  // v224 (owner, 2026-10-14: "separa la lista de los dropdowns… por continente o país"): A to Z inside each country, the countries in their order
  eq(await page.evaluate(() => { const s = document.querySelector('#a-inst'), az = xs => xs.join() === xs.slice().sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' })).join(), o = [...s.options].map(x => x.textContent);
    return [[...s.querySelectorAll('optgroup')].map(g => g.label).join(), [...s.querySelectorAll('optgroup')].every(g => az([...g.querySelectorAll('option')].map(x => x.textContent))), o[o.length - 1], s.value]; }),
    ['Brasil,Cuba,España,Alemania,Internacional', true, 'Otra', 'Nubank'], 'the banks by country (Brazil, Cuba, Spain, Germany, international), A to Z inside each, Otra last, and a new account still starts on Nubank (owner, 2026-10-09)');
  await page.evaluate(() => { A.close(); S.accounts.push({ id: 'qa-empty', name: 'Conta PicPay', institution: 'PicPay', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 }); render(); }); await page.waitForTimeout(200);
  await page.tap('.acc-grp .ac-row[data-id="nu-conta"]'); await page.waitForSelector('#overlay .cv-acts');
  await page.tap('#overlay .cv-acts [data-v="edit"]'); await page.waitForSelector('[data-a="delete-account"]');
  eq(await page.evaluate(() => [document.querySelector('[data-a="delete-account"]').disabled, /\d/.test(document.querySelector('[data-a="delete-account"]').dataset.tip || '')]), [true, true], 'an account with transactions: its form’s delete is off, and says how many go first');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.tap('.acc-grp .ac-row[data-id="qa-empty"]'); await page.waitForSelector('#overlay .cv-acts');
  await page.tap('#overlay .cv-acts [data-v="edit"]'); await page.waitForSelector('[data-a="delete-account"]');
  await page.tap('[data-a="delete-account"]'); await page.waitForSelector('.modal');
  ok(await page.evaluate(() => /Conta PicPay/.test(document.querySelector('.modal').innerText) && !!acct('qa-empty')), 'one without transactions: its panel, Edit account, Delete, and it asks first');
  await page.click('#modal-ok'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [!acct('qa-empty'), !document.querySelector('.ac-row[data-id="qa-empty"]')]), [true, true], 'and is deleted once confirmed, its row gone');
  // ---------- 5. the summary's cards ----------
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(500);
  const first = await page.evaluate(() => walletChosen()[0].id);
  await page.tap(`#ac-card .w-tap[data-id="${first}"]`); await page.waitForSelector('#overlay .cv');
  eq(await page.evaluate(id => [UI.drawer.kind, UI.drawer.id === id, !!document.querySelector('#overlay .cv .ccard'), !!document.querySelector('#overlay .cv .cc-meta .note'), !document.querySelector('#overlay .cv .cc-meta .btn'),
      [...document.querySelectorAll('#overlay .cv-acts button')].map(b => [b.dataset.v, b.innerText.trim(), b.getBoundingClientRect().height >= 44])], first),
    ['card-view', true, true, true, true, [['expense', 'Registrar un gasto', true], ['income', 'Registrar un ingreso', true], ['edit', 'Editar cuenta', true]]],
    'the summary: a tap on a card opens a panel with the card, its details, and four things to do, each a thumb high');
  await page.tap('#overlay .cv-acts [data-v="expense"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(id => [UI.drawer.kind, UI.drawer.draft.accountId === (cardCredit(acct(id)) || acct(id)).id, UI.drawer.draft.type], first), ['tx', true, 'expense'], 'an expense starts on that card (on its credit, when it has one, with Credit | Debit under it)');
  await page.evaluate(() => A.close()); await page.waitForTimeout(300);
  // a card with credit only (here the Nubank card moved to a bank where there is no account, for the time of these checks)
  const credit = await page.evaluate(() => { const c = personal().find(a => a.type === 'credit'); c.institution = 'Inter'; return c.id; });
  await page.evaluate(id => A['card-view']({ id }), credit); await page.waitForSelector('#overlay .cv');
  eq(await page.evaluate(() => [...document.querySelectorAll('#overlay .cv-acts button')].map(b => b.dataset.v + (b.classList.contains('wide') ? '*' : ''))), ['expense', 'edit'], 'a credit card: no income; no button for the transactions, they are under the actions (owner, 2026-10-09)');
  // ---------- 8. (owner, 2026-10-09: "when I tap View transactions I want it shown in this style under the card, not going to the Transactions tab")
  eq(await page.evaluate(id => { const xs = S.transactions.filter(x => x.accountId === id), rows = [...document.querySelectorAll('#overlay .cv-ops .op-row')], ds = rows.map(r => S.transactions.find(x => x.id === r.dataset.id).date);
      return [UI.route, UI.drawer.kind, !!document.querySelector('#overlay .cv > .ccard') && !!document.querySelector('#overlay .cv .cv-acts'), document.querySelector('#overlay .cv-ops h3').innerText.trim(), rows.length === Math.min(30, xs.length), ds.every((d, i) => !i || d <= ds[i - 1]), rows.every(r => r.getBoundingClientRect().height >= 44)]; }, credit),
    ['dashboard', 'card-view', true, 'Transacciones', true, true, true], 'its latest transactions are under the card, its details and its actions, in the panel: the newest first, each a thumb high');
  await page.evaluate(c => { acct(c).institution = 'Nubank'; }, credit);
  await page.evaluate(id => { S.transactions.unshift({ id: 'qa-today', accountId: id, date: S.today, merchant: 'Reembolso', description: '', amount: 4250, currency: 'BRL', type: 'income', categoryId: null, subcategoryId: null, status: 'confirmed' }); A.close(); }, first);
  await page.evaluate(id => A['card-view']({ id }), first); await page.waitForSelector('#overlay .cv-ops');
  eq(await page.evaluate(() => { const r = document.querySelector('#overlay .op-row[data-id="qa-today"]'), amt = r.querySelector('.op-amt'); return [document.querySelector('#overlay .op-day').innerText.trim().toLowerCase(), r.querySelector('.op-t b').innerText.trim(), amt.innerText.trim().startsWith('+ R$'), getComputedStyle(amt).color, !!r.querySelector('.op-ico.in svg')]; }),
    ['hoy', 'Reembolso', true, 'rgb(159, 209, 130)', true], 'by day (Today first); money in, green with a +');
  const all = await page.evaluate(() => document.querySelector('#overlay .op-head .linkbtn').innerText.trim());
  ok(/^Ver (todas|las \d+)$/.test(all), 'its title has the way to all of them: ' + all);
  await page.tap('#overlay .op-row[data-id="qa-today"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.id]), ['tx', 'qa-today'], 'a row opens the transaction');
  await page.evaluate(id => { A.close(); A['card-tx']({ id }); }, first); await page.waitForSelector('#overlay .cv-ops');
  await page.tap('#overlay .op-head .linkbtn'); await page.waitForTimeout(500);
  eq(await page.evaluate(id => [UI.route, UI.tx.account === id, !UI.drawer], first), ['transactions', true, true], '"View all" opens the Transactions screen on that account, the panel closed');
  await page.evaluate(() => { A.close(); S.transactions = S.transactions.filter(x => x.id !== 'qa-today'); render(); }); await page.waitForTimeout(300);
  // ---------- 6. the eye ----------
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(500);
  await page.tap('.bb-eye'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => { const b = document.querySelector('.bar-bal .bb-link b'), r = b.getBoundingClientRect(); return [b.textContent.includes('•••'), r.width > 60, r.height >= 20, getComputedStyle(b).borderRadius]; }), [true, true, true, '0px'], 'the eye: hidden, the balance is a whole line of dots, not squeezed into a small circle');
  await page.tap('.bb-eye'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const b = document.querySelector('.bar-bal .bb-link b'); return /\d/.test(b.textContent) && b.getBoundingClientRect().width > 100; }), 'shown again, whole');
  // ---------- 9. (owner, 2026-10-08: "lower the brightness of the cards of the classic style, e.g. the red one to #ec00007d, and follow the same pattern
  // for the others; remove the other style of cards") ----------
  await page.evaluate(() => { A.close(); navigate('accounts'); }); await page.waitForTimeout(400);
  // since 2026-10-11 a phone's Accounts draws each card in its panel: every account's card, one panel after the other
  eq(await page.evaluate(() => { const mid = c => { const m = getComputedStyle(c).backgroundImage.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\) 42%/) || getComputedStyle(c).backgroundImage.match(/rgb\((\d+), (\d+), (\d+)\) 42%/); return m ? m.slice(1, 4).map(Number).map(v => v > 1 ? v / 255 : v) : null; };
      const each = cardsOf(personal()).map(a => { A.close(); A['card-view']({ id: a.id }); const c = document.querySelector('#overlay .cv > .ccard'), want = [1, 3, 5].map(i => parseInt(c.style.getPropertyValue('--cc').slice(i, i + 2), 16) / 255 * .49), got = mid(c);
        return [!!got && got.every((v, i) => Math.abs(v - want[i]) < .01), getComputedStyle(c).color === 'rgb(255, 255, 255)' && getComputedStyle(c.querySelector('.cc-amt b')).color === 'rgb(255, 255, 255)']; }); A.close();
      return [!document.querySelector('.acc-style, .cs-seg, .ccard.glow'), each.length > 0 && each.every(x => x[0]), each.every(x => x[1])]; }),
    [true, true, true], 'one style of card: the bank’s colour at 49 % over black (Santander’s red is #EC00007D on the black page), white words on every card; no choice of style');
  eq(await page.evaluate(() => { const red = cardsOf(personal()).find(a => (BANK_MARKS[a.institution] || {}).bg === '#EC0000'); if (!red) return 'no red card'; A.close(); A['card-view']({ id: red.id }); const c = document.querySelector('#overlay .cv > .ccard'); const m = getComputedStyle(c).backgroundImage.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\) 42%/); return m && m.slice(1, 4).map(v => Math.round(v * 255)).join(); }),
    '116,0,0', 'the red card: #EC0000 at 7D (49 %) over black is #740000');
  eq(errors, [], 'no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ oldLook: true, lang: 'pt', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 860 } }));
  await page.evaluate(() => navigate('accounts'));
  eq(await page.evaluate(() => [!document.querySelector('.acc-view, .acc-ph-acts, .acc-grp'), document.querySelectorAll('.cc-grid .cc-item').length === cardsOf(personal()).length]), [true, true], 'a computer keeps its cards (no rows, no switch); Portuguese');
  ok(await page.evaluate(() => !document.querySelector('.acc-style, .ccard.glow')), 'a computer has the one style too');
  // the opened account's actions on a computer (owner, 2026-10-09: "there is room to put them side by side, make them smaller; they all weigh the
  // same, I can't tell the main action; they don't look like buttons"): one row of the app's own buttons, recording an expense filled, editing quiet
  for (const id of ['nu-conta', 'mp', 'nu-card', 'nu-pj']) {
    await page.evaluate(id => { UI.drawer = null; navigate('accounts'); A['card-view']({ id }); }, id); await page.waitForTimeout(200);
    eq(await page.evaluate(() => { const box = document.querySelector('.cv-acts.pc'), bs = [...box.querySelectorAll('button')], r = box.getBoundingClientRect();
      return [new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size, bs.every(b => b.classList.contains('btn') && b.classList.contains('sm') && b.getBoundingClientRect().right <= r.right + 0.5), bs[0].dataset.v + ':' + bs[0].classList.contains('primary'), bs.filter(b => b.classList.contains('primary')).length, bs[bs.length - 1].dataset.v + ':' + bs[bs.length - 1].classList.contains('ghost'), !document.querySelector('.cv-acts.pc .fl-ico')]; }),
      [1, true, 'expense:true', 1, 'edit:true', true], `computer, ${id}: the actions are one row of small buttons inside the panel, one filled (recording an expense), editing quiet on the right`);
  }
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-accounts-view');
})();
