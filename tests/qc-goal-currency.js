// QC of each goal in its savings account's currency and of the bank lists by country (v224, owner, 2026-10-14):
//   "si el usuario elige una cuenta principal la moneda de la app cambia a la moneda de esa cuenta; las metas deben mantenerse en la moneda de la
//   cuenta de ahorro elegida en el dropdown de 'se guarda en'"; "la lista de bancos separa la lista de los dropdowns en toda la app por continente o
//   país y una línea al lado"; "agrega los logos de los bancos a los dropdowns"; "Santander también está en España".
//   1. the goals saved before v224 are stamped with the currency their numbers were written in;
//   2. a goal kept in an account in pesos cubanos is in pesos cubanos: its form, its card, its details; it is outside the month's sums (the savings
//      hand-out, the free money) and has its own rows in the monthly plan; the totals say each currency apart;
//   3. a goal with money in it is offered only savings accounts in its currency;
//   4. a goal from before v224 kept in an account of another currency says so, and can be counted in the account's;
//   5. the bank lists: by country, each with its name and a line beside it, each bank with its logo, Santander in Brazil and in Spain.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const { browser, page: p, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });

  // ---------- 1. stamped ----------
  eq(await p.evaluate(() => [S.goals.length > 0, S.goals.every(g => g.currency === 'BRL')]), [true, true], 'the example’s goals, from before v224, are stamped in reais when the account is opened');

  // ---------- 2. a goal in pesos cubanos ----------
  await p.evaluate(() => { S.accounts.push({ id: 'qa-cu', name: 'Ahorro BANDEC', institution: 'BANDEC', type: 'savings', currency: 'CUP', scope: 'personal', purpose: '', opening: 9000000 }, { id: 'qa-cu2', name: 'Cuenta BPA', institution: 'BPA', type: 'checking', currency: 'CUP', scope: 'personal', purpose: '', opening: 2000000 }); navigate('goals'); render(); A['goal-new'](); });
  await p.waitForTimeout(300);
  await p.fill('#g-name', 'Casa en Cuba'); await p.fill('#g-target', '400000'); await p.selectOption('#g-acct', 'qa-cu'); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [document.querySelector('label[for="g-target"]').innerText.replace('*', '').trim(), document.querySelector('label[for="g-monthly"]').innerText.trim(), /se planifica aparte de tu ingreso para ahorro, que está en reales/.test(document.querySelector('#overlay .stack').innerText)]),
    ['Objetivo (CUP)', 'Cada mes (CUP)', true], 'the form: its amounts in pesos cubanos once it is kept in an account in them, and it says it is planned apart');
  await p.fill('#g-monthly', '20000'); await p.click('#overlay [data-a="goal-save"]'); await p.waitForTimeout(300);
  const g = await p.evaluate(() => { const g = S.goals.find(x => x.name === 'Casa en Cuba'); return { id: g.id, cur: g.currency }; });
  eq(g.cur, 'CUP', 'saved in its account’s currency');
  eq(await p.evaluate(id => [goalsHere(S).some(x => x.id === id), distribution(S, S.month).rows.some(r => r.goal.id === id), freeUntil(S, S.today, 'BRL') ? 'ok' : 'none'], g.id), [false, false, 'ok'], 'outside the month’s sums: the savings hand-out and the free money are in reais');
  // a contribution, from the account in pesos with debit
  await p.evaluate(id => { UI.drawer = null; A['goal-move']({ id, dir: 'in' }); }, g.id); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [document.querySelector('label[for="m-amount"]').innerText.replace('*', '').trim(), [...document.querySelectorAll('#m-from option')].map(o => o.value)]), ['Importe (CUP)', ['qa-cu2']], 'contributing: in pesos cubanos, out of the account in pesos with debit only');
  await p.fill('#m-amount', '50000'); await p.click('#overlay [data-a="move-save"]').catch(() => {}); await p.waitForTimeout(300);
  if (await p.evaluate(() => !!document.querySelector('#gw-knob'))) await p.evaluate(() => A['move-save']());
  await p.evaluate(() => { UI.drawer = null; UI.sheet = null; UI.win = null; navigate('goals'); render(); }); await p.waitForTimeout(400);
  eq(await p.evaluate(id => { const r = document.querySelector('#view .sums-rest'), big = r && r.parentElement; return [goalSaved(S, id), /^R\$ [\d.,]+/.test(big ? big.textContent : ''), r ? r.textContent.trim() : null]; }, g.id), [5000000, true, '+ CUP 50.000,00'], 'the goals’ total says each currency apart: reais large, the pesos on a small line under them');
  eq(await p.evaluate(id => { const card = [...document.querySelectorAll('#view .dk-tile, #view .goal')].find(c => c.innerText.includes('Casa en Cuba')); return card ? /CUP 50\.000/.test(card.innerText) && /CUP 400\.000/.test(card.innerText) && !/R\$/.test(card.innerText) : null; }, g.id), true, 'its card is in pesos cubanos only');
  await p.evaluate(() => { UI.goalYear = +S.today.slice(0, 4); A['goal-plan-open'] ? A['goal-plan-open']() : 0; document.querySelector('#view').insertAdjacentHTML('beforeend', `<div id="qa-grid">${goalYearSection(true)}</div>`); });
  eq(await p.evaluate(() => { const rows = [...document.querySelectorAll('#qa-grid tbody tr')].map(r => r.querySelector('th').textContent.trim()); const i = rows.findIndex(r => /Metas y fondos en pesos cubanos/i.test(r)), sumRow = rows.findIndex(r => /Queda libre|Total/.test(r)); return [i > sumRow && sumRow > 0, rows[i + 1]]; }), [true, 'Casa en Cuba'], 'the monthly plan: its own rows under its currency’s name, after the sums');
  await p.evaluate(() => document.getElementById('qa-grid').remove());

  // ---------- 3. kept in: its currency once it has money ----------
  await p.evaluate(() => S.accounts.push({ id: 'qa-eu', name: 'Ahorro BBVA', institution: 'BBVA', type: 'savings', currency: 'EUR', scope: 'personal', purpose: '', opening: 0 }));
  await p.evaluate(id => A['goal-edit']({ id }), g.id); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [[...document.querySelectorAll('#g-acct option')].map(o => o.value).filter(Boolean), /sigue en pesos cubanos/.test(document.querySelector('#overlay .body').innerText)]), [['qa-cu'], true], 'a goal with money in it: only savings accounts in pesos cubanos, and it says why');
  await p.evaluate(() => { A.close(); A['goal-new'](); }); await p.waitForTimeout(250);
  eq(await p.evaluate(() => ['qa-cu', 'qa-eu'].every(id => [...document.querySelectorAll('#g-acct option')].some(o => o.value === id))), true, 'a new goal: every savings account, whatever its currency');
  await p.evaluate(() => A.close());

  // ---------- 4. a goal from before v224 kept in an account of another currency ----------
  const old = await p.evaluate(() => { const v = S.goals.find(x => x.name === 'Viaje') || S.goals[0]; v.accountId = 'qa-cu'; A['goal-open']({ id: v.id }); return v.id; }); await p.waitForTimeout(250);
  eq(await p.evaluate(() => [/Sus números están en reales, pero la cuenta donde se guarda, Ahorro BANDEC, está en pesos cubanos\./.test(document.querySelector('#overlay .body').innerText), !!document.querySelector('[data-a="goal-cur-fix"]')]), [true, true], 'its details say so, with the two ways out');
  await p.click('[data-a="goal-cur-fix"]'); await p.waitForTimeout(250);
  eq(await p.evaluate(id => [S.goals.find(x => x.id === id).currency, !!document.querySelector('[data-a="goal-cur-fix"]')], old), ['CUP', false], 'counted in its account’s currency, the notice gone');

  // ---------- 5. the bank lists ----------
  await p.evaluate(() => { A.close(); navigate('accounts'); render(); A['account-add'](); }); await p.waitForTimeout(300);
  eq(await p.evaluate(() => { const s = document.getElementById('a-inst'); return [[...s.querySelectorAll('optgroup legend')].map(l => l.textContent).join(), [...s.querySelectorAll('optgroup')].map(g => g.querySelectorAll('option').length).join(), [...s.querySelectorAll('option')].filter(o => o.value !== 'Otra').every(o => o.querySelector('img.bk-logo') && o.querySelector('img').alt === ''), [...s.querySelectorAll('option')].filter(o => o.textContent === 'Santander').map(o => o.value).join(), getComputedStyle(s).appearance]; }),
    ['Brasil,Cuba,España,Alemania,Internacional', '15,3,6,1,1', true, 'Santander,Santander@ES', 'base-select'], 'by country with its name, each bank with its logo (a picture with no words of its own), Santander in Brazil and in Spain; drawn by the app where the browser lets it');
  eq(await p.evaluate(() => { const l = document.querySelector('#a-inst optgroup legend'), a = getComputedStyle(l, '::after'); return [getComputedStyle(l).display, a.content, parseFloat(a.height) > 0]; }), ['flex', '""', true], 'a line beside each country’s name');
  await p.click('#a-inst'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('a-inst').matches(':open')), 'it opens');
  await p.keyboard.press('Escape');
  await p.evaluate(() => A.close());

  // ---------- 6. what does not move the currency (the review of v224) ----------
  eq(await p.evaluate(() => [typeof SYNC === 'undefined' || accountJson() === SYNC.last]), [true], 'opening the account: the goals stamped before it is taken as what the server has, so there is nothing to send');
  // a mismatch from before v224: the money counted in euros, the main account in reais; saving another account or deleting one leaves it
  eq(await p.evaluate(() => { S.settings.currency = 'EUR'; syncCurrency(); A['edit-account']({ id: 'bb' }); A['save-account'](); const a = S.settings.currency;
    S.accounts.push({ id: 'qa-del', name: 'Para borrar', institution: 'Inter', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 }); deleteCard(acct('qa-del')); const said = UI.modal.text; A['modal-confirm']();
    const b = S.settings.currency; S.settings.currency = 'BRL'; syncCurrency(); render(); return [a, b, /pasa a ser tu cuenta principal/.test(said)]; }), ['EUR', 'EUR', false], 'saving or deleting an account that is not the main one never moves the main currency, nor says it does');
  // a yearly expense kept in pesos cubanos
  await p.evaluate(() => { navigate('goals'); render(); A['yearly-new'] ? A['yearly-new']({}) : A['yearly-add']({}); }); await p.waitForTimeout(250);
  const yr = await p.evaluate(() => { const x = UI.drawer.draft; Object.assign(x, { name: 'Matrícula', costText: '12000', month: '3', accountId: 'qa-cu' }); renderOverlay(); const label = document.querySelector('label[for="yr-cost"]').innerText.replace('*', '').trim(); A['yearly-save'](); const g = S.goals.find(k => k.name === 'Matrícula'); return [label, g && g.currency, g && goalsHere(S).includes(g)]; });
  eq(yr, ['¿Cuánto cuesta? (CUP)', 'CUP', false], 'a yearly expense kept in pesos cubanos: asked and saved in them, outside the reais’ sums');
  // a new account at a bank with no country takes the main currency; an account already kept keeps its own when its bank changes
  await p.evaluate(() => { A.close(); navigate('accounts'); render(); A['account-add'](); }); await p.waitForTimeout(250);
  await p.selectOption('#a-inst', 'BANDEC'); await p.waitForTimeout(150); await p.selectOption('#a-inst', 'Otra'); await p.waitForTimeout(150);
  const other = await p.evaluate(() => UI.drawer.draft.currency);
  await p.evaluate(() => { A.close(); A['edit-account']({ id: 'bb' }); }); await p.waitForTimeout(250); await p.selectOption('#a-inst', 'Santander@ES'); await p.waitForTimeout(150);
  eq([other, await p.evaluate(() => UI.drawer.draft.currency)], ['BRL', 'BRL'], '“Otra”: the main currency; an account already kept: its currency stays when its bank is changed');
  await p.evaluate(() => A.close());
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-goal-currency');
})();
