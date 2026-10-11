// QC of a goal's money (owner, 2026-10-09: "'kept in' should only show the savings accounts, and a contribution to that goal is kept in the savings
// account, added to what is already there"; "'already saved' only shows when creating a goal, not when editing it: fix that too"):
//   1. the goal form offers only savings accounts; with none, the way to add one, and back to the goal with it chosen;
//   2. a contribution is a transfer: out of the account with debit, into the savings account; a withdrawal the way back; both balances change;
//   3. deleting the movement takes its transfer; deleting one transfer row takes the other and the movement; editing it moves the other with it;
//   4. the month's hand-out records transfers from the account picked;
//   5. "already saved" is asked when editing too, and it moves no money;
//   6. editing a goal shows its monthly amount, with no switch to press (owner, 2026-10-10: "editing a goal does not let me edit the contribution I want
//      to make each month"): a new amount changes the plan from the month chosen; the same amount leaves the plan, and its months edited one by one, alone.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true });
  const bal = id => p.evaluate(i => accountBalance(S, i), id);
  await p.evaluate(() => navigate('goals'));
  // ---------- 1. kept in: savings only ----------
  await p.evaluate(() => A['goal-new']()); await p.waitForSelector('#g-acct');
  eq(await p.evaluate(() => [[...document.querySelectorAll('#g-acct option')].map(o => o.textContent), document.querySelector('#g-acct').value]), [['Choose a savings account', 'Mercado Pago', 'Santander'], ''], 'the goal form keeps a goal in a savings account only, and with two it asks which');
  await p.evaluate(() => { Object.assign(UI.drawer.draft, { name: 'Bike', kind: 'fund' }); A['goal-save'](); });
  eq(await p.evaluate(() => [UI.drawer.kind, (UI.drawer.error || '')]), ['goal-form', 'Choose the savings account the goal is kept in.'], 'a goal is not saved without its savings account (owner, 2026-10-09)');
  eq(await p.evaluate(() => !!document.querySelector('[data-a="goal-add-savings"]')), false, 'with savings accounts there is no prompt to add one');
  await p.evaluate(() => A.close());
  // ---------- 2. a contribution and a withdrawal move money ----------
  const conta0 = await bal('nu-conta'), sant0 = await bal('sant'), n0 = await p.evaluate(() => S.transactions.length);
  await p.evaluate(() => A['goal-move']({ id: 'viaje', dir: 'in' })); await p.waitForSelector('#m-amount');
  eq(await p.evaluate(() => [document.querySelector('label[for="m-from"]').innerText.trim(), document.querySelector('#m-from').value, [...document.querySelectorAll('#m-from option')].map(o => o.textContent), document.querySelector('#m-say').innerText.trim()]),
    ['Comes out of', 'nu-conta', ['Nubank account (main)', 'Banco do Brasil'], 'It leaves Nubank account and goes into Santander: both balances change.'], 'a contribution says where it comes out of: the accounts with debit, the first one picked');
  // where it is kept is the goal's: said, not asked again (owner, 2026-10-09: "to change where it is kept, edit the goal")
  eq(await p.evaluate(() => [!!document.querySelector('#m-acct'), document.querySelector('#overlay .body > p.note').innerText.includes('Santander')]), [false, true], 'the contribution does not ask where it is kept again: it says the goal’s account');
  await p.fill('#m-amount', '500'); await p.click('[data-a="move-save"]'); await p.waitForTimeout(200);
  const mv = await p.evaluate(() => { const m = S.goalMoves[S.goalMoves.length - 1], xs = S.transactions.filter(x => x.goalMoveId === m.id); return { id: m.id, amount: m.amount, fromId: m.fromId, rows: xs.map(x => [x.accountId, x.amount, x.type, x.transferAccountId, x.merchant, x.source]).sort() }; });
  eq([mv.amount, mv.fromId, mv.rows], [50000, 'nu-conta', [['nu-conta', -50000, 'transfer', 'sant', 'Contribution to Trip', 'goal'], ['sant', 50000, 'transfer', 'nu-conta', 'Contribution to Trip', 'goal']]], 'the contribution is a transfer: one row out of the account, one into the savings account');
  eq([await bal('nu-conta') - conta0, await bal('sant') - sant0, await p.evaluate(n => S.transactions.length - n, n0)], [-50000, 50000, 2], 'the savings account adds it to what it had; the other account loses it');
  await p.evaluate(() => A['goal-move']({ id: 'viaje', dir: 'out' })); await p.waitForSelector('#m-amount');
  await p.selectOption('#m-from', 'bb'); await p.waitForTimeout(100);
  eq(await p.evaluate(() => [document.querySelector('label[for="m-from"]').innerText.trim(), document.querySelector('#m-say').innerText.trim()]), ['Goes to', 'It leaves Santander and goes into Banco do Brasil: both balances change.'], 'a withdrawal says where it goes back to');
  const bb0 = await bal('bb'); await p.fill('#m-amount', '200'); await p.click('[data-a="move-save"]'); await p.waitForTimeout(200);
  eq([await bal('bb') - bb0, await bal('sant') - sant0], [20000, 30000], 'a withdrawal leaves the savings account and goes into the account chosen');
  await p.evaluate(() => A['goal-move']({ id: 'viaje', dir: 'in' })); await p.waitForSelector('#m-from');
  eq(await p.evaluate(() => document.querySelector('#m-from').value), 'nu-conta', 'the next movement starts from the main account again, not from the one picked last (owner, 2026-10-09: the main account is where costs are charged)');
  await p.evaluate(() => A.close());
  // ---------- 3. deleting and editing ----------
  await p.evaluate(id => { A['goal-open']({ id: 'viaje' }); A['move-delete']({ id }); }, mv.id); await p.waitForSelector('.confirm, [role="alertdialog"]');
  ok((await p.evaluate(() => document.querySelector('[role="alertdialog"], .confirm').innerText)).includes('Its transfer between the two accounts is deleted too.'), 'deleting the movement says its transfer goes too');
  await p.click('[role="alertdialog"] .btn.danger, .confirm .btn.danger'); await p.waitForTimeout(200);
  eq([await p.evaluate(id => [S.goalMoves.some(m => m.id === id), S.transactions.some(x => x.goalMoveId === id)], mv.id), await bal('nu-conta') - conta0], [[false, false], 0], 'deleting the movement takes both rows of its transfer');
  const out = await p.evaluate(() => S.goalMoves[S.goalMoves.length - 1].id);
  await p.evaluate(id => { A.close(); const x = S.transactions.find(k => k.goalMoveId === id && k.accountId === 'sant'); A['open-tx']({ id: x.id }); }, out); await p.waitForSelector('#overlay [data-a="save-tx"]');
  await p.evaluate(() => { UI.drawer.draft.amountText = '150'; A['save-tx'](); }); await p.waitForTimeout(150);
  eq(await p.evaluate(id => [S.goalMoves.find(m => m.id === id).amount, S.transactions.filter(x => x.goalMoveId === id).map(x => x.amount).sort((a, b) => a - b)], out), [-15000, [-15000, 15000]], 'editing one row of the transfer moves the other row and the movement with it');
  await p.evaluate(id => { const x = S.transactions.find(k => k.goalMoveId === id && k.accountId === 'bb'); A['open-tx']({ id: x.id }); A['ask-delete'](); }, out); await p.waitForSelector('[role="alertdialog"], .confirm');
  ok((await p.evaluate(() => document.querySelector('[role="alertdialog"], .confirm').innerText)).includes('It is a movement of the goal Trip'), 'deleting a row of the transfer says the goal changes too');
  await p.click('[role="alertdialog"] .btn.danger, .confirm .btn.danger'); await p.waitForTimeout(200);
  eq(await p.evaluate(id => [S.goalMoves.some(m => m.id === id), S.transactions.some(x => x.goalMoveId === id)], out), [false, false], 'deleting one row takes the other and the movement');
  // ---------- 4. the month's hand-out ----------
  await p.evaluate(() => { A.close(); navigate('goals'); }); await p.waitForSelector('#dist-from');
  eq(await p.evaluate(() => [document.querySelector('label[for="dist-from"]').innerText.trim(), document.querySelector('#dist-from').value]), ['Comes out of', 'nu-conta'], 'the hand-out says where the contributions come out of');
  await p.selectOption('#dist-from', 'bb'); const n1 = await p.evaluate(() => S.transactions.length), bb1 = await bal('bb');
  const rows = await p.evaluate(() => distribution(B(), S.month).rows.filter(r => r.pending > 0).map(r => [r.goal.accountId, r.pending]));
  await p.click('[data-a="dist-register"]'); await p.waitForTimeout(200);
  const kept = rows.filter(r => r[0]);      // a goal with no account linked is recorded in the goal only
  eq([rows.length > kept.length, await p.evaluate(n => S.transactions.length - n, n1), await bal('bb') - bb1], [true, kept.length * 2, -kept.reduce((s, r) => s + r[1], 0)], 'the hand-out records one transfer per goal kept in a savings account, out of the account picked; a goal with no account moves no money');
  // ---------- 5. already saved, when editing ----------
  await p.evaluate(() => A['goal-edit']({ id: 'computadora' })); await p.waitForSelector('#g-initial');
  const start = await p.evaluate(() => [document.querySelector('#g-initial').value, sum(S.goalMoves.filter(m => m.goalId === 'computadora' && isStartMove(m)).map(m => m.amount))]);
  const n2 = await p.evaluate(() => S.transactions.length), saved2 = await p.evaluate(() => goalSaved(S, 'computadora'));
  await p.fill('#g-initial', '700'); await p.click('[data-a="goal-save"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(([n, s0, was]) => [sum(S.goalMoves.filter(m => m.goalId === 'computadora' && isStartMove(m)).map(m => m.amount)), goalSaved(S, 'computadora') - s0, S.transactions.length - n], [n2, saved2, start[1]]), [70000, 70000 - start[1], 0], 'editing what is already saved changes the starting balance and moves no money');
  await p.evaluate(() => A['goal-edit']({ id: 'computadora' })); await p.waitForSelector('#g-initial');
  eq(await p.evaluate(() => document.querySelector('#g-initial').value), '700', 'the edit form shows what is already saved');
  await p.evaluate(() => A.close());
  await p.evaluate(() => A['goal-move']({ id: 'regalos', dir: 'in' })); await p.waitForSelector('#m-amount');
  eq(await p.evaluate(() => [!!document.querySelector('#m-from'), document.querySelector('#m-say').innerText.trim()]), [false, 'Without a savings account it is recorded in the goal only: no account balance changes. Choose where it is kept'], 'a goal with no account: nothing to come out of, and the way to choose where it is kept');
  await p.click('#m-say [data-a="goal-edit"]'); await p.waitForSelector('#g-acct');
  eq(await p.evaluate(() => [UI.drawer.kind, UI.drawer.draft.id]), ['goal-form', 'regalos'], 'choosing where it is kept opens the goal’s edit form');
  await p.evaluate(() => { A.close(); navigate('goals'); }); await p.waitForSelector('.card.goal');
  eq(await p.evaluate(() => { const c = [...document.querySelectorAll('.card.goal')].find(k => k.innerText.includes('Gifts')); return c && c.querySelector('.g-pick-acct') ? c.querySelector('.g-pick-acct').innerText.trim() : null; }), 'Choose where it is kept', 'a goal with no account says so on its card, with the way to choose it');
  await p.evaluate(() => A.close());
  // ---------- 6. the details: few buttons (owner, 2026-10-09: "8 buttons in the details is too much"), the bank's name on the card ----------
  await p.evaluate(() => { A.close(); navigate('goals'); }); await p.waitForSelector('.card.goal');
  eq(await p.evaluate(() => { const c = [...document.querySelectorAll('.card.goal')].find(k => k.innerText.includes('Trip')); return [!!c.querySelector('.bmark, img, .atag'), c.querySelector('.note').innerText.trim()]; }), [false, 'Goal · Santander'], 'the goal card names the bank, without its logo');
  await p.evaluate(() => A['goal-open']({ id: 'viaje' })); await p.waitForSelector('#goal-menu-btn');
  const vis = () => p.evaluate(() => [...document.querySelectorAll('.drawer button')].filter(b => b.offsetParent && !b.closest('.mv') && !b.closest('.dhead, .drawer-h, header') && b.getAttribute('aria-label') !== 'Close').map(b => b.innerText.trim()));
  eq(await vis(), ['Contribute', 'Withdraw', 'What if…?', 'Edit', 'More'], 'the details show Contribute and Withdraw, What if…? with the facts, and at the foot Edit and More');
  await p.click('#goal-menu-btn');
  eq(await p.evaluate(() => [...document.querySelectorAll('#goal-menu button')].map(b => [b.innerText.trim(), b.getBoundingClientRect().height >= 44])), [['Pause', true], ['Mark as completed', true], ['Archive', true], ['Delete', true]], 'More holds pause, mark as completed, archive and delete, each a thumb high');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  eq(await p.evaluate(() => [!!document.querySelector('#goal-menu'), UI.drawer && UI.drawer.kind, document.activeElement.id]), [false, 'goal-view', 'goal-menu-btn'], 'Escape closes the menu first, the details stay open');
  await p.click('#goal-menu-btn'); await p.click('.drawer .bal'); await p.waitForTimeout(100);
  eq(await p.evaluate(() => !!document.querySelector('#goal-menu')), false, 'a click elsewhere closes the menu');
  await p.click('#goal-menu-btn'); await p.click('#goal-menu [data-v="paused"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [goalById('viaje').status, [...document.querySelectorAll('.drawer .g-do button')].map(b => b.innerText.trim())]), ['paused', ['Resume', 'Withdraw']], 'a paused goal leads with Resume');
  await p.click('.drawer .g-do [data-v="active"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => goalById('viaje').status), 'active', 'and Resume makes it active again');
  await p.evaluate(() => { A.close(); A['goal-new'](); Object.assign(UI.drawer.draft, { name: 'Zero', kind: 'fund', accountId: 'sant' }); A['goal-save'](); }); await p.waitForSelector('#goal-menu-btn');
  eq(await p.evaluate(() => [!!document.querySelector('.drawer [data-dir="out"]'), !!document.querySelector('.drawer [data-initial]')]), [false, false], 'with nothing saved there is no Withdraw (not even disabled), and the starting balance is “Already saved” in Edit');
  await p.evaluate(() => A.close());
  // ---------- 6. the monthly amount, when editing ----------
  const ym = await p.evaluate(() => ymOf(B().today)), next = await p.evaluate(ym => addMonths(ym, 1), ym);
  const plan = (id, m) => p.evaluate(([id, m]) => goalPlan(goalById(id), m), [id, m]);
  await p.evaluate(() => { A.close(); A['goal-edit']({ id: 'computadora' }); }); await p.waitForSelector('#g-monthly');
  eq(await p.evaluate(() => [!document.querySelector('#g-replan'), document.querySelector('#g-monthly').value === plain(goalPlan(goalById('computadora'), ymOf(B().today))), !!document.querySelector('#g-from-m')]), [true, true, true], 'editing a goal: its monthly amount in sight, with the plan’s amount for this month, and the month it starts; no switch to press first');
  await p.fill('#g-monthly', '350'); await p.click('[data-a="goal-save"]'); await p.waitForTimeout(150);
  eq([await p.evaluate(() => UI.drawer && UI.drawer.kind !== 'goal-form'), await plan('computadora', ym), await plan('computadora', next)], [true, 35000, 35000], 'a new amount saved: the plan has it from this month on');
  await p.evaluate(([n]) => { const g = goalById('computadora'), [y, m] = n.split('-'); g.plan[y][+m - 1] = 12300; A.close(); A['goal-edit']({ id: 'computadora' }); }, [next]); await p.waitForSelector('#g-monthly');
  await p.fill('#g-name', 'New computer!'); await p.click('[data-a="goal-save"]'); await p.waitForTimeout(150);
  eq([await p.evaluate(() => goalById('computadora').name), await plan('computadora', ym), await plan('computadora', next)], ['New computer!', 35000, 12300], 'saved with the same amount: the plan stays, with the month edited on its own');
  await p.evaluate(() => A.close());
  // ---------- 1b. no savings account: add one and come back ----------
  await p.evaluate(() => { S.accounts = S.accounts.filter(a => a.type !== 'savings'); A['goal-new'](); UI.drawer.draft.name = 'Bike'; renderOverlay(); }); await p.waitForSelector('[data-a="goal-add-savings"]');
  eq(await p.evaluate(() => [...document.querySelectorAll('#g-acct option')].map(o => o.textContent)), ['Choose a savings account'], 'with no savings account, none is offered');
  await p.click('[data-a="goal-add-savings"]'); await p.waitForSelector('#a-name');
  eq(await p.evaluate(() => [UI.drawer.kind, UI.drawer.draft.type]), ['account', 'savings'], 'adding one opens the account form on a savings account');
  await p.fill('#a-name', 'Inter savings'); await p.fill('#a-open', '0'); await p.click('[data-a="save-account"]'); await p.waitForSelector('#g-acct');
  eq(await p.evaluate(() => [UI.drawer.kind, UI.drawer.draft.name, acct(document.querySelector('#g-acct').value).name]), ['goal-form', 'Bike', 'Inter savings'], 'saving it goes back to the goal, with the new account chosen');
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-goal-money');
})();
