// QC of the two views of a phone's Accounts (owner, 2026-10-08: "on the phone, in Accounts, make a button to change the cards' view from all of them
// to grouped one on top of another, as we had in the summary tab; the user chooses").
//   1. two icons beside the side's name: every card (the default) or stacked; the one in use is pressed;
//   2. stacked: every account of the side, each card's top strip above the next, the last one whole; the cards slide to their places;
//   3. a tap on a card opens it, large, with its details and what can be done with it; closing it, the focus returns to that card;
//   4. the choice is kept with the person's settings; back to every card; a computer has no switch; Portuguese;
//   5. (owner, same day: "add the tap action on the cards in the summary tab: when the user taps a card a menu opens with details and actions")
//      a tap on a card of the summary opens the same panel: the card, its details, and an expense or an income in it, its transactions, its form;
//      an expense starts in that account; a credit card has no income; its transactions open with the panel closed;
//   6. (owner, same day: "the eye toggle on the phone has a bug, the figure hides and gets lost") hidden, the balance is still a whole line of dots;
//   7. (owner, same day: "add on the phone in Accounts two buttons, 'add account' and 'delete account'") add opens the account form; delete asks which
//      account; one with transactions is there but cannot be chosen (they go first, as on its form); one without is deleted after a confirmation.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, motion: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => navigate('accounts')); await page.waitForTimeout(700);
  eq(await page.evaluate(() => { const v = document.querySelector('.acc-head .acc-view'), bs = [...v.querySelectorAll('button')]; return [!!document.querySelector('.acc-head h2.sec'), v.getAttribute('aria-label'), bs.map(b => [b.dataset.v, b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]), bs.every(b => b.getBoundingClientRect().height >= 40 && b.getBoundingClientRect().width >= 44), document.querySelectorAll('.cc-grid .cc-item').length === cardsOf(personal()).length, !document.querySelector('.acc-stack')]; }),
    [true, 'Vista de las tarjetas', [['all', 'Todas las tarjetas', 'true'], ['stack', 'Apiladas', 'false']], true, true, true], 'two icons beside the side’s name; every card to start with');
  await page.evaluate(() => { window.__an = []; const o = Element.prototype.animate; Element.prototype.animate = function (k, x) { window.__an.push(this.className); return o.call(this, k, x); }; });
  await page.click('.acc-view [data-v="stack"]');
  // since v122 the accounts and the savings are two stacks, one under each heading (tests/qc-savings-accounts.js)
  eq(await page.evaluate(() => { const cs = [...document.querySelectorAll(".acc-stack .w-card")], all = cardsOf(personal()), order = [...all.filter(a => a.type !== 'savings'), ...all.filter(a => a.type === 'savings')]; return [S.user.acctStack, cs.map(c => c.dataset.id).join() === order.map(a => a.id).join(), [...document.querySelectorAll('.acc-stack')].every(st => { const r = [...st.querySelectorAll('.w-card')].map(c => c.offsetTop); return r.every((x, i) => !i || x - r[i - 1] === 40); }), !document.querySelector('.cc-grid'), document.querySelector('.acc-view [data-v="stack"]').getAttribute('aria-pressed'), window.__an.filter(c => c === 'w-card').length > 0]; }),
    [true, true, true, true, 'true', true], 'stacked: every account, the accounts then the savings, each card 40 px below the one before in its stack, the last whole; the cards slide to their places');
  await page.click('.acc-stack .w-card:nth-child(2)', { position: { x: 120, y: 18 } }); await page.waitForSelector('.drawer .cv, .sheet .cv');
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.id === cardsOf(personal())[1].id, !!document.querySelector('#overlay .cv .ccard'), !!document.querySelector('#overlay .cv .cv-ops')]), ['card-view', true, true, true], 'a tap on a card opens it, large, with its details and its transactions a tap away');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  eq(await page.evaluate(() => document.activeElement.dataset.id === cardsOf(personal())[1].id), true, 'closed: the focus is back on that card');
  await page.evaluate(() => { navigate('dashboard'); navigate('accounts'); });
  ok(await page.evaluate(() => !!document.querySelector('.acc-stack')), 'the choice is kept');
  await page.click('.acc-view [data-v="all"]');
  eq(await page.evaluate(() => [S.user.acctStack, !!document.querySelector('.cc-grid'), !document.querySelector('.acc-stack')]), [false, true, true], 'and back to every card');
  // ---------- 7. add and delete ----------
  eq(await page.evaluate(() => [...document.querySelectorAll('.acc-acts .btn')].map(b => [b.dataset.a, b.innerText.trim(), b.getBoundingClientRect().height >= 44])), [['account-add', 'Agregar cuenta', true], ['acct-del-pick', 'Eliminar cuenta', true]], 'two buttons on top of Accounts: Agregar cuenta and Eliminar cuenta, a thumb high');
  await page.tap('.acc-acts [data-a="account-add"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.isNew, UI.drawer && UI.drawer.draft.scope]), ['account', true, 'personal'], 'Agregar cuenta opens the form for a new account of the household');
  eq(await page.evaluate(() => { const o = [...document.querySelectorAll('#a-inst option')].map(x => x.textContent), banks = o.slice(0, -1); return [banks.join() === banks.slice().sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' })).join(), o[o.length - 1], document.querySelector('#a-inst').value]; }), [true, 'Otra', 'Nubank'], 'the banks are A to Z, Otra last, and a new account still starts on Nubank (owner, 2026-10-09)');
  await page.evaluate(() => { A.close(); S.accounts.push({ id: 'qa-empty', name: 'Conta PicPay', institution: 'PicPay', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 }); render(); }); await page.waitForTimeout(200);
  await page.tap('.acc-acts [data-a="acct-del-pick"]'); await page.waitForSelector('.sheet .acc-del');
  eq(await page.evaluate(() => { const bs = [...document.querySelectorAll('.sheet .acc-del button')]; return [document.querySelector('.sheet h2').innerText, bs.length === cardsOf(personal()).length, bs.filter(b => b.getAttribute('aria-disabled') === 'true').map(b => b.dataset.id).join() === cardsOf(personal()).filter(a => cardTxCount(a)).map(a => a.id).join(), bs.find(b => b.dataset.id === 'qa-empty').getAttribute('aria-disabled'), bs[0].innerText.includes(cardTxCount(acct(bs[0].dataset.id)) + ' transacciones')]; }),
    ['¿Qué cuenta quieres eliminar?', true, true, null, true], 'Eliminar cuenta asks which: every card once (its credit and debit inside it, owner 2026-10-09); one with transactions is there, says how many go first (on any part of the card), and cannot be chosen');
  await page.waitForTimeout(350); await page.tap('.sheet .acc-del button[aria-disabled="true"]', { force: true }); await page.waitForTimeout(200);      // the sheet has come up
  eq(await page.evaluate(() => [UI.sheet, !document.querySelector('.modal'), S.accounts.length]), ['acct-del', true, await page.evaluate(() => S.accounts.length)], 'a tap on one with transactions does nothing');
  await page.tap('.sheet .acc-del [data-id="qa-empty"]'); await page.waitForSelector('.modal');
  ok(await page.evaluate(() => /Conta PicPay/.test(document.querySelector('.modal').innerText) && !!acct('qa-empty')), 'one without transactions asks first');
  await page.click('#modal-ok'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [!acct('qa-empty'), !document.querySelector('.acc-stack [data-id="qa-empty"], .cc-item[data-id="qa-empty"]')]), [true, true], 'and is deleted once confirmed');
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
    ['hoy', 'Reembolso', true, 'rgb(62, 207, 142)', true], 'by day (Today first); money in, green with a +');
  const all = await page.evaluate(() => document.querySelector('#overlay .op-head .linkbtn').innerText.trim());
  ok(/^Ver (todas|las \d+)$/.test(all), 'its title has the way to all of them: ' + all);
  await page.tap('#overlay .op-row[data-id="qa-today"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.id]), ['tx', 'qa-today'], 'a row opens the transaction');
  await page.evaluate(id => { A.close(); A['card-tx']({ id }); }, first); await page.waitForSelector('#overlay .cv-ops');
  await page.tap('#overlay .op-head .linkbtn'); await page.waitForTimeout(500);
  eq(await page.evaluate(id => [UI.route, UI.tx.account === id, !UI.drawer], first), ['transactions', true, true], '"View all" opens the Transactions screen on that account, the panel closed');
  await page.evaluate(() => { S.user.acctStack = false; navigate('accounts'); }); await page.waitForTimeout(500);
  await page.tap(`.cc-item[data-id="${first}"] .cc-meta [data-a="card-tx"]`); await page.waitForSelector('#overlay .cv-ops');
  eq(await page.evaluate(id => [UI.route, UI.drawer.id === id, !!document.activeElement.closest('.cv-ops')], first), ['accounts', true, true], '"View transactions" under a card in Accounts opens its panel at its transactions');
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
  eq(await page.evaluate(() => { const cs = [...document.querySelectorAll('#view .ccard')], mid = c => { const m = getComputedStyle(c).backgroundImage.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\) 42%/) || getComputedStyle(c).backgroundImage.match(/rgb\((\d+), (\d+), (\d+)\) 42%/); return m ? m.slice(1, 4).map(Number).map(v => v > 1 ? v / 255 : v) : null; };
      return [!document.querySelector('.acc-style, .cs-seg, .ccard.glow'), cs.length > 0 && cs.every(c => { const want = [1, 3, 5].map(i => parseInt(c.style.getPropertyValue('--cc').slice(i, i + 2), 16) / 255 * .49), got = mid(c); return got && got.every((v, i) => Math.abs(v - want[i]) < .01); }),
        cs.every(c => getComputedStyle(c).color === 'rgb(255, 255, 255)' && getComputedStyle(c.querySelector('.cc-amt b')).color === 'rgb(255, 255, 255)')]; }),
    [true, true, true], 'one style of card: the bank’s colour at 49 % over black (Santander’s red is #EC00007D on the black page), white words on every card; no choice of style');
  eq(await page.evaluate(() => { const c = [...document.querySelectorAll('#view .ccard')].find(x => x.style.getPropertyValue('--cc') === '#EC0000'); if (!c) return 'no red card'; const m = getComputedStyle(c).backgroundImage.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\) 42%/); return m && m.slice(1, 4).map(v => Math.round(v * 255)).join(); }),
    '116,0,0', 'the red card: #EC0000 at 7D (49 %) over black is #740000');
  eq(errors, [], 'no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'pt', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 860 } }));
  await page.evaluate(() => navigate('accounts'));
  eq(await page.evaluate(() => [!document.querySelector('.acc-view'), acctViewSwitch().includes('Empilhados')]), [true, true], 'a computer has no switch; Portuguese');
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
