// QC of a transfer between two of the person's accounts reaching both (v225, owner, 2026-10-14: "sí" to "al registrar una transferencia entre dos
// cuentas tuyas, la de origen baja pero la de destino no sube"; features/transactions/transactions.actions.js: sideRowSync, halfTransfers).
//   1. recorded by hand: the other account gets its side, linked; both balances move;
//   2. either side edited, the other follows; another account chosen, the side moves; "Not in Dorax", the side goes; ignored and deleted together;
//   3. only between accounts in the same currency: the lists offer only those, one to another currency is not saved and says why;
//   4. the other account already has the move (its statement came in first): that row is linked, not a second one made;
//   5. transfers recorded by hand before: Transactions says how many never reached their other account, and adds them;
//   6. the company's side, the same; paying yourself keeps its own way.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const { browser, page: p, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  const bal = (...ids) => p.evaluate(ids => ids.map(id => accountBalance(S, id, S.today)), ids);
  const record = (o) => p.evaluate(o => { A['new-tx']({}); const d = UI.drawer.draft; Object.assign(d, { type: 'transfer', dir: 'out', merchant: o.merchant, ...o }); A['save-tx'](); return UI.drawer && UI.drawer.error ? UI.drawer.error : null; }, o);
  const rows = m => p.evaluate(m => S.transactions.filter(x => x.merchant === m).map(x => [x.accountId, x.amount, x.type, x.transferAccountId, !!x.linkId]).sort(), m);

  // ---------- 1. both sides ----------
  const b0 = await bal('nu-conta', 'bb');
  eq(await record({ accountId: 'nu-conta', transferAccountId: 'bb', amountText: '100', merchant: 'QA uno' }), null, 'recorded');
  eq(await rows('QA uno'), [['bb', 10000, 'transfer', 'nu-conta', true], ['nu-conta', -10000, 'transfer', 'bb', true]].sort(), 'two rows, each pointing at the other account, linked');
  eq((await bal('nu-conta', 'bb')).map((v, i) => v - b0[i]), [-10000, 10000], 'the account it left goes down, the one it went into goes up');

  // ---------- 2. edited, moved, let go, ignored, deleted ----------
  await p.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'QA uno' && k.accountId === 'nu-conta'); A['open-tx']({ id: x.id }); UI.drawer.draft.amountText = '150'; A['save-tx'](); });
  eq(await rows('QA uno'), [['bb', 15000, 'transfer', 'nu-conta', true], ['nu-conta', -15000, 'transfer', 'bb', true]].sort(), 'its amount changed: the other side follows');
  await p.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'QA uno' && k.accountId === 'bb'); A['open-tx']({ id: x.id }); UI.drawer.draft.date = '2026-09-30'; A['save-tx'](); });
  eq(await p.evaluate(() => S.transactions.filter(k => k.merchant === 'QA uno').map(k => k.date)), ['2026-09-30', '2026-09-30'], 'the side it arrived in edited: the one it left follows');
  await p.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'QA uno' && k.accountId === 'nu-conta'); A['open-tx']({ id: x.id }); UI.drawer.draft.transferAccountId = 'mp'; A['save-tx'](); });
  eq(await rows('QA uno'), [['mp', 15000, 'transfer', 'nu-conta', true], ['nu-conta', -15000, 'transfer', 'mp', true]].sort(), 'another account chosen: its side moves there');
  await p.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'QA uno' && k.accountId === 'nu-conta'); A['open-tx']({ id: x.id }); A['ignore-tx'](); });
  eq(await p.evaluate(() => S.transactions.filter(k => k.merchant === 'QA uno').map(k => k.status)), ['ignored', 'ignored'], 'ignored together');
  await p.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'QA uno' && k.accountId === 'nu-conta'); A['open-tx']({ id: x.id }); A['ignore-tx'](); A['open-tx']({ id: x.id }); UI.drawer.draft.transferAccountId = ''; A['save-tx'](); });
  eq(await rows('QA uno'), [['nu-conta', -15000, 'transfer', null, false]], '“Not in Dorax”: the other side goes');
  await record({ accountId: 'nu-conta', transferAccountId: 'bb', amountText: '40', merchant: 'QA dos' });
  await p.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'QA dos' && k.accountId === 'bb'); A['open-tx']({ id: x.id }); A['ask-delete'](); });
  const said = await p.evaluate(() => { A['modal-confirm'](); return UI.toast && UI.toast.msg; });
  eq([await rows('QA dos'), said], [[], 'Eliminada de las dos cuentas.'], 'deleted from either side: both go, and it says so');

  // ---------- 3. only between accounts in the same currency (owner: "asegúrate que las transferencias sean entre cuentas del mismo tipo, no de
  // Nubank (reales) a BANDEC (CUP)") ----------
  await p.evaluate(() => S.accounts.push({ id: 'qa-cu', name: 'Cuenta BANDEC', institution: 'BANDEC', type: 'checking', currency: 'CUP', scope: 'personal', purpose: '', opening: 0 }, { id: 'qa-cu2', name: 'Cuenta BPA', institution: 'BPA', type: 'checking', currency: 'CUP', scope: 'personal', purpose: '', opening: 0 }));
  await p.evaluate(() => { A['new-tx']({}); Object.assign(UI.drawer.draft, { type: 'transfer', dir: 'out', accountId: 'nu-conta', transferAccountId: '', amountText: '100', merchant: 'QA cambio' }); renderOverlay(); });
  eq(await p.evaluate(() => [...document.querySelectorAll('#d-xfer option')].map(o => o.value).filter(v => /^qa-cu/.test(v))), [], 'from an account in reais, the accounts in pesos are not offered');
  const err = await p.evaluate(() => { UI.drawer.draft.transferAccountId = 'qa-cu'; A['save-tx'](); return UI.drawer && UI.drawer.error; });
  ok(/Una transferencia va entre dos cuentas de la misma moneda: Cuenta BANDEC está en CUP\./.test(String(err && (err.text || err))) && !(await rows('QA cambio')).length, 'one to another currency is not saved, and it says why', err);
  await p.evaluate(() => { A.close(); A['new-tx']({}); Object.assign(UI.drawer.draft, { type: 'transfer', dir: 'out', accountId: 'qa-cu', transferAccountId: 'qa-cu2', merchant: 'QA pesos' }); renderOverlay(); });
  eq(await p.evaluate(() => [...document.querySelectorAll('#d-xfer option')].map(o => o.value).filter(Boolean)), ['qa-cu2'], 'from an account in pesos, only the other accounts in pesos');
  await p.evaluate(() => { const s = document.getElementById('d-account'); s.value = 'nu-conta'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  eq(await p.evaluate(() => UI.drawer.draft.transferAccountId), null, 'the account it leaves changed to one in reais: the account in pesos it was going to is let go');
  await p.evaluate(() => { A.close(); A['new-tx']({}); Object.assign(UI.drawer.draft, { type: 'transfer', dir: 'out', accountId: 'qa-cu', transferAccountId: 'qa-cu2', amountText: '9500', merchant: 'QA pesos' }); A['save-tx'](); });
  eq(await rows('QA pesos'), [['qa-cu', -950000, 'transfer', 'qa-cu2', true], ['qa-cu2', 950000, 'transfer', 'qa-cu', true]].sort(), 'between two accounts in pesos: both sides');

  // ---------- 4. the other account already has it ----------
  await p.evaluate(() => S.transactions.push({ id: 'qa-imp', accountId: 'bb', date: S.today, description: 'PIX RECEBIDO NUBANK', merchant: 'Pix recebido', amount: 7700, currency: 'BRL', type: 'transfer', categoryId: null, subcategoryId: null, status: 'confirmed', transferAccountId: null, recurring: false, notes: '', source: 'csv', sourceTxnId: 'x1', confidence: 99, splits: null, importId: 'i-qa' }));
  await record({ accountId: 'nu-conta', transferAccountId: 'bb', amountText: '77', merchant: 'QA ya estaba', date: await p.evaluate(() => S.today) });
  eq(await p.evaluate(() => [S.transactions.filter(k => k.accountId === 'bb' && k.amount === 7700).length, (S.transactions.find(k => k.id === 'qa-imp') || {}).transferAccountId, !!(S.transactions.find(k => k.id === 'qa-imp') || {}).linkId, (S.transactions.find(k => k.id === 'qa-imp') || {}).merchant]),
    [1, 'nu-conta', true, 'Pix recebido'], 'its statement brought it first: that row is linked, with its own words, and no second one is made');

  // ---------- 5. transfers recorded by hand before ----------
  await p.evaluate(() => S.transactions.push(
    { id: 'qa-old1', accountId: 'nu-conta', date: '2026-09-20', description: 'QA viejo', merchant: 'QA viejo', amount: -20000, currency: 'BRL', type: 'transfer', categoryId: null, subcategoryId: null, status: 'confirmed', transferAccountId: 'bb', recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null },
    { id: 'qa-old2', accountId: 'nu-conta', date: '2026-09-21', description: 'QA viejo cambio', merchant: 'QA viejo cambio', amount: -5000, currency: 'BRL', type: 'transfer', categoryId: null, subcategoryId: null, status: 'confirmed', transferAccountId: 'qa-cu', recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null }));
  await p.evaluate(() => { UI.drawer = null; navigate('transactions'); render(); }); await p.waitForTimeout(300);
  eq(await p.evaluate(() => { const b = [...document.querySelectorAll('#view .banner')].find(x => /solo sacó el dinero/.test(x.innerText)); return b ? [/^1 transferencia/.test(b.innerText.trim()), !!b.querySelector('[data-a="half-fix"]')] : null; }), [true, true], 'Transactions says one never reached its other account (the one to another currency is not one of them), with the way to add it');
  await p.click('[data-a="half-fix"]'); await p.waitForTimeout(300);
  eq(await p.evaluate(() => [S.transactions.filter(k => k.accountId === 'bb' && k.amount === 20000 && k.transferAccountId === 'nu-conta').length, !!S.transactions.find(k => k.id === 'qa-old1').linkId, halfTransfers().length, !![...document.querySelectorAll('#view .banner')].find(x => /solo sacaron el dinero|solo sacó el dinero/.test(x.innerText))]), [1, true, 0, false], 'it is added to its other account, and the notice goes');

  // ---------- 6. the company's side ----------
  await p.evaluate(() => S.accounts.push({ id: 'qa-co1', name: 'PJ Inter', institution: 'Inter', type: 'checking', currency: 'BRL', scope: 'business', purpose: '', opening: 100000 }, { id: 'qa-co2', name: 'PJ Wise', institution: 'Wise', type: 'checking', currency: 'USD', scope: 'business', purpose: '', opening: 0 }));
  await p.evaluate(() => { S.accounts.find(a => a.id === 'qa-co2').currency = 'BRL'; });
  await record({ accountId: 'qa-co1', transferAccountId: 'qa-co2', amountText: '500', merchant: 'QA PJ' });
  eq(await rows('QA PJ'), [['qa-co1', -50000, 'transfer', 'qa-co2', true], ['qa-co2', 50000, 'transfer', 'qa-co1', true]].sort(), 'between two of the company’s accounts: both sides');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-transfer-sides');
})();
