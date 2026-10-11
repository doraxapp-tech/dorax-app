// QC of what a bank line says by itself (owner, 2026-10-09: "reduce human error, the user's work and the load of accepting and categorizing every
// expense", phase 2): after the person's rules and what they filed before,
//   1. a merchant everybody knows is named and takes the person's own group for that kind of spending (never a group of subscriptions for an order);
//      with no such group it is only named;
//   2. a bill of the plan: the same amount and a second sign is ready; the same amount alone, or a bill whose amount changes, comes filed but to look at;
//      an amount that is only near is no bill;
//   3. a refund ("estorno") is spending given back: it keeps the purchase's group, takes off spending, and stays a refund when edited;
//   4. a Pix to the person's own name is a transfer, with its other side in the account at the bank it names (only when there is exactly one).
const { open, ok, eq, done } = require('./pw.js');
const rowsOf = p => p.evaluate(() => UI.imp.rows.map(r => ({ d: r.description, type: r.type, amount: r.amount, merchant: r.merchant, cat: r.categoryId, sub: r.subcategoryId, why: r.why, bill: r.bill, look: r.look, check: r.check, move: r.move && r.move.kind, to: r.move && r.move.to })));
(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  await p.evaluate(() => { setMain(acct('nu-conta'), true); S.transactions = S.transactions.filter(x => x.date < '2026-10-01'); S.user.name = 'Alex Souza';
    S.transactions.unshift({ id: 'old-renner', date: '2026-09-25', accountId: 'nu-conta', type: 'expense', amount: -8990, currency: 'BRL', merchant: 'Renner', description: 'Compra no débito - RENNER', categoryId: 'salidas', subcategoryId: null, status: 'confirmed', notes: '' });
    navigate('imports'); });
  const send = async (name, lines) => {
    await p.evaluate(() => { UI.imp = null; UI.pg = {}; render(); });
    await p.setInputFiles('#imp-file-csv', { name, mimeType: 'text/csv', buffer: Buffer.from(['Data,Valor,Identificador,Descrição', ...lines].join('\n'), 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map');
    await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  };
  // 1. known merchants
  await send('NU_known.csv', ['01/10/2026,-45.90,k1,Compra no débito - IFOOD *IFOOD', '02/10/2026,-55.90,k2,Compra no débito - Netflix.com', '03/10/2026,-32.10,k3,Compra no débito - DROGASIL 1234', '04/10/2026,-99.90,k4,Compra no débito - SMARTFIT BRASIL']);
  eq((await rowsOf(p)).map(r => [r.merchant, r.cat, r.sub, r.why, r.look]), [['iFood', 'salidas', null, 'known', false], ['Netflix', 'suscripciones', 'video', 'known', false], ['Drogasil', null, null, null, true], ['Smart Fit', 'suscripciones', 'gym', 'bill', false]],
    'known merchants: named, in the person’s group for the kind (an iFood order in Going out, not in the delivery club); a pharmacy with no group of its own is only named; the gym at the plan’s amount pays the plan’s bill');
  ok(await p.evaluate(() => { UI.imp.only = 'all'; render(); return [...document.querySelectorAll('.review .rv-t')].some(x => x.innerText.includes('Known merchant')); }), 'the review says it is a known merchant');
  // 2. bills of the plan (Rent R$ 1.800 due on the 5th, Condo fee R$ 420 with no due day, Electricity about R$ 180 and changing, Internet R$ 110 due on the 12th)
  await send('NU_bills.csv', ['05/10/2026,-1800.00,b1,Pagamento de boleto - IMOBILIARIA CENTRAL', '10/10/2026,-420.00,b2,Transferência enviada pelo Pix - Marcos', '15/10/2026,-205.40,b3,Pagamento de boleto - ENEL DISTRIBUICAO',
    '20/10/2026,-110.00,b4,Compra no débito - Loja Qualquer', '21/10/2026,-421.87,b5,Transferência enviada pelo Pix - Roberto']);
  eq((await rowsOf(p)).map(r => [r.merchant, r.sub, r.why, r.bill, r.look]), [['Imobiliaria Central', 'alquiler', 'bill', 'Rent', false], ['Marcos', 'condominio', 'bill', 'Condo fee', true], ['Enel', 'electricidad', 'bill', 'Electricity (variable)', true], ['Loja Qualquer', 'internet', 'bill', 'Internet', true], ['Roberto', null, null, null, true]],
    'bills: the rent (its amount, on its due day) is ready; the condo fee’s amount alone, the electricity a bit higher and the internet’s amount far from its day come filed to be looked at; R$ 421,87 is not the condo fee');
  ok(await p.evaluate(() => [...document.querySelectorAll('.review .rv-t')].some(x => x.innerText.includes('Bill in your plan: Condo fee'))), 'the review names the bill');
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; r.seen = true; }); A['imp-commit'](); }); await p.waitForTimeout(150);
  eq(await p.evaluate(() => planProgress(S, '2026-10', 'BRL', S.today).filter(l => ['pl-alquiler', 'pl-condominio', 'pl-electricidad', 'pl-internet'].includes(l.id)).map(l => [l.id, l.status])),
    [['pl-alquiler', 'paid'], ['pl-electricidad', 'over'], ['pl-internet', 'paid'], ['pl-condominio', 'paid']], 'imported: the plan’s bills are paid');
  // 3. refunds
  await send('NU_refund.csv', ['03/10/2026,89.90,e1,Estorno - RENNER', '06/10/2026,-15.00,e2,Compra no débito - Padaria Sol', '07/10/2026,15.00,e3,Estorno de compra - Padaria Sol']);
  eq((await rowsOf(p)).map(r => [r.type, r.amount, r.merchant, r.cat, r.why, r.look]), [['expense', 8990, 'Renner', 'salidas', 'refund', true], ['expense', -1500, 'Padaria Sol', null, null, true], ['expense', 1500, 'Padaria Sol', null, 'refund', true]],
    'refunds: spending given back, with the purchase’s name and group (from before, or from the same file), shown to be looked at');
  ok(await p.evaluate(() => { UI.imp.only = 'all'; render(); return [...document.querySelectorAll('.review .rv-t')].map(x => x.innerText).join(' | '); }).then(s => s.includes('Refund of the purchase of 25/09') && s.includes('Refund of the purchase of 06/10')), 'the review says which purchase it gives back');
  const e0 = await p.evaluate(() => monthSummary(S, '2026-10', 'BRL'));
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; r.seen = true; }); A['imp-commit'](); }); await p.waitForTimeout(150);
  eq(await p.evaluate(m => { const n = monthSummary(S, '2026-10', 'BRL'); return [n.income - m.income, n.expenses - m.expenses]; }, e0), [0, -8990], 'imported: no income, and spending goes down by what was given back (the bakery’s purchase and refund cancel out)');
  const rid = await p.evaluate(() => S.transactions.find(x => x.merchant === 'Renner' && x.amount > 0).id);
  await p.evaluate(id => { navigate('transactions'); A['open-tx']({ id }); }, rid); await p.waitForSelector('#d-refund');
  ok(await p.evaluate(() => document.querySelector('#d-refund').checked), 'the form says it is a refund');
  await p.evaluate(() => A['save-tx']()); await p.waitForTimeout(200);
  eq(await p.evaluate(id => { const x = S.transactions.find(k => k.id === id); return [x.type, x.amount]; }, rid), ['expense', 8990], 'saved again, it is still money given back');
  // 4. a Pix to oneself
  await p.evaluate(() => navigate('imports'));
  await send('NU_own.csv', ['08/10/2026,-500.00,o1,Transferência enviada pelo Pix - ALEX SOUZA - •••.123.456-•• - BCO DO BRASIL S.A.', '08/10/2026,-200.00,o2,Transferência enviada pelo Pix - Alex Souza - SANTANDER',
    '09/10/2026,-50.00,o3,Transferência enviada pelo Pix - Alex Souza - ITAÚ UNIBANCO', '09/10/2026,300.00,o4,Transferência Recebida - ALEX SOUZA - BCO DO BRASIL', '09/10/2026,-60.00,o5,Transferência enviada pelo Pix - Alex Lima']);
  eq((await rowsOf(p)).map(r => [r.type, r.move, r.to, r.look]), [['transfer', 'own', 'bb', false], ['transfer', 'own', 'sant', false], ['transfer', 'own', null, false], ['transfer', 'own', 'bb', false], ['expense', null, null, true]],
    'a Pix to the person’s own name is a transfer, to the account at the bank it names; someone else with the same first name is not');
  ok(await p.evaluate(() => { UI.imp.only = 'all'; render(); const s = [...document.querySelectorAll('.rv-move')].map(x => x.innerText.trim()); return s.includes('Between this account and Banco do Brasil') && s.includes('Between your own accounts'); }), 'the review says where the money went');
  const bb0 = await p.evaluate(() => accountBalance(S, 'bb'));
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; r.seen = true; }); A['imp-commit'](); }); await p.waitForTimeout(150);
  eq(await p.evaluate(b => accountBalance(S, 'bb') - b, bb0), 20000, 'imported: Banco do Brasil gets its side of both (R$ 500 in, R$ 300 out)');
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-import-read');
})();
