// QC of the type of what comes in (owner, 2026-10-09: "the most dangerous is not the category, it is the type (expense, income, transfer)"):
//   1. money coming into a card is never income: the invoice's payment is a transfer, anything else is money given back;
//   2. the same amount the other way in another of the person's accounts is a move between them: sure when a line names the other bank (made a
//      transfer, both sides put right on import, undone whole), otherwise asked; 3. money to or from investments is a move, what it earns is income;
//   4. a card's invoice paid from another bank's account pays that bank's card; 5. the type never turns the amount round;
//   6. what was a transfer before, or what the person made one by hand, comes in as one; 7. the review says what the import does to each total;
//   8. pairs already in the ledger, counted as spending and income, are found and settled one by one.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  await p.evaluate(() => { setMain(acct('nu-conta'), true); S.transactions = S.transactions.filter(x => x.date < '2026-10-01'); navigate('imports'); });
  const send = async (account, name, lines) => {
    await p.evaluate(a => { UI.imp = null; UI.pg = {}; UI.tx.account = a; delete acct(a).csvMap; render(); }, account);
    await p.setInputFiles('#imp-file-csv', { name, mimeType: 'text/csv', buffer: Buffer.from(lines.join('\n'), 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map');
    await p.evaluate(a => { if (UI.imp.accountId !== a) C['imp-account']({ value: a }); }, account);      // as choosing it in the list does
    await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  };
  const rows = () => p.evaluate(() => UI.imp.rows.map(r => ({ type: r.type, amount: r.amount, refund: r.refund, move: r.move && r.move.kind, to: r.move && r.move.to, look: r.look, why: r.why })));
  const commit = () => p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; r.seen = true; }); UI.imp.seenOk = true; A['imp-commit'](); });
  // 1. a card's own file (Nubank's: purchases positive, read the right way round by the app)
  await send('nu-card', 'Nubank_card.csv', ['date,title,amount', '2026-10-02,Padaria Sol,15.00', '2026-10-03,Mercado Bom,82.40', '2026-10-04,Posto Ipiranga,150.00', '2026-10-05,Crédito de cashback,-10.00', '2026-10-06,Estorno - Loja Azul,-20.00', '2026-10-07,Pagamento recebido,-77.79']);
  eq((await rows()).map(r => [r.type, r.amount, r.refund, r.move]), [['expense', -1500, false, null], ['expense', -8240, false, null], ['expense', -15000, false, null], ['expense', 1000, true, null], ['expense', 2000, true, null], ['transfer', 7779, false, 'paid']],
    'a card’s file: purchases are spending, its payment is a transfer, and money coming back (a cashback, a refund) takes off spending; nothing is income');
  ok((await rows()).filter(r => r.refund).every(r => r.look), 'money coming back on a card is shown to be looked at');
  // 2. pairs with another account (Banco do Brasil already has its side)
  await p.evaluate(() => { S.transactions.push(
    { id: 'bb-in', date: '2026-10-05', accountId: 'bb', type: 'income', amount: 50000, currency: 'BRL', merchant: 'Pix recebido', description: 'PIX RECEBIDO NU PAGAMENTOS', categoryId: 'income', subcategoryId: null, status: 'confirmed', notes: '' },
    { id: 'bb-out', date: '2026-10-06', accountId: 'bb', type: 'expense', amount: -12000, currency: 'BRL', merchant: 'Compra loja', description: 'COMPRA LOJA', categoryId: 'salidas', subcategoryId: null, status: 'confirmed', notes: '' },
    { id: 'old-ted-1', date: '2026-09-02', accountId: 'nu-conta', type: 'transfer', amount: -20000, currency: 'BRL', merchant: 'TED', description: 'TED ENVIADA CONTA XYZ', transferAccountId: 'mp', categoryId: null, subcategoryId: null, status: 'confirmed', notes: '' },
    { id: 'old-ted-2', date: '2026-09-16', accountId: 'nu-conta', type: 'transfer', amount: -20000, currency: 'BRL', merchant: 'TED', description: 'TED ENVIADA CONTA XYZ', transferAccountId: 'mp', categoryId: null, subcategoryId: null, status: 'confirmed', notes: '' }); });
  const sum0 = await p.evaluate(() => monthSummary(S, '2026-10', 'BRL')), bbN = await p.evaluate(() => S.transactions.filter(x => x.accountId === 'bb').length);
  await send('nu-conta', 'NU_type.csv', ['Data,Valor,Identificador,Descrição', '04/10/2026,-500.00,y1,Transferência enviada pelo Pix - Fulano - BCO DO BRASIL', '07/10/2026,120.00,y2,Pix recebido - Maria',
    '08/10/2026,-1000.00,y3,Aplicação Tesouro Direto', '08/10/2026,5.12,y4,Rendimento poupança', '09/10/2026,-250.00,y5,TED ENVIADA CONTA XYZ', '10/10/2026,-64.00,y6,Compra no débito - Padaria Sol', '10/10/2026,-80.00,y7,Transferência enviada pelo Pix - Joana Lima']);
  const r2 = await rows();
  eq([r2[0].type, r2[0].move, r2[0].to, r2[0].look], ['transfer', 'pair', 'bb', true], 'the same R$ 500 into Banco do Brasil a day later, and the line names that bank: a move between the two accounts, to be looked at');
  eq([r2[1].type, r2[1].move, r2[1].look], ['income', 'pair', true], 'R$ 120 coming in, with R$ 120 out of Banco do Brasil the day before but nothing naming it: kept as it is and asked');
  ok(await p.evaluate(() => { UI.imp.only = 'all'; render(); const s = [...document.querySelectorAll('.review .rv-t')].map(x => x.innerText).join(' | '); return s.includes('Same amount in Banco do Brasil on 05/10: a move between your accounts') && s.includes('Same amount in Banco do Brasil on 06/10. A move between your accounts?'); }), 'the review says which account and day it matched, and asks when it is not sure');
  // 3. investments
  eq([r2[2].type, r2[2].move, r2[2].look, r2[3].type], ['transfer', 'invest', true, 'income'], 'money into Tesouro Direto is a move of the person’s own money, asked; what savings earn is income');
  // 6. what was a transfer before
  eq([r2[4].type, r2[4].move, r2[4].to, r2[4].why], ['transfer', 'own', 'mp', 'before'], 'a line that was a transfer to Mercado Pago the last times is one again, to the same account');
  eq([r2[5].type, r2[5].move], ['expense', null], 'a purchase stays a purchase');
  // 7. the totals, before importing
  eq(await p.evaluate(() => document.querySelector('#rv-types').innerText.replace(/\s+/g, ' ').trim()), 'If you import now as income R$ 125,12 (2) as spending R$ 144,00 (2) between your accounts R$ 1.750,00 (3)', 'the review says what the import does to each total');
  // 5. the type never turns the amount round
  await p.evaluate(() => { const s = UI.imp, r = s.rows[1]; rvApply(s, r, 'type', 'expense'); render(); });
  eq(await p.evaluate(() => [UI.imp.rows[1].amount, UI.imp.rows[1].refund]), [12000, true], 'R$ 120 that came in, made spending, still came in: it is money given back');
  await p.evaluate(() => { const s = UI.imp; rvApply(s, s.rows[1], 'type', 'transfer'); rvApply(s, s.rows[6], 'type', 'transfer'); render(); });      // the pair asked about, and a Pix the person knows is theirs
  // commit: both sides put right
  await commit(); await p.waitForTimeout(150);
  eq(await p.evaluate(() => ['bb-in', 'bb-out'].map(id => { const x = S.transactions.find(k => k.id === id); return [x.type, x.transferAccountId, x.categoryId]; })), [['transfer', 'nu-conta', null], ['transfer', 'nu-conta', null]], 'imported: Banco do Brasil’s side of each pair is now the same transfer, pointing back');
  eq(await p.evaluate(n => S.transactions.filter(x => x.accountId === 'bb').length - n, bbN), 0, 'no second copy is written into Banco do Brasil');
  eq(await p.evaluate(m => { const n = monthSummary(S, '2026-10', 'BRL'); return [n.income - m.income, n.expenses - m.expenses]; }, sum0), [-50000 + 512, 6400 - 12000], 'the month: Banco do Brasil’s R$ 500 is no longer income nor its R$ 120 spending; only the earnings and the bakery count');
  eq(await p.evaluate(() => S.rules.filter(r => r.auto && r.transfer).map(r => r.pattern)), ['TRANSFERENCIA ENVIADA PELO PIX JOANA LIMA'], 'a line made a transfer by hand is a rule for next time (a pair the app asked about is not: it is that one pair)');
  // undo puts both back
  const imp = await p.evaluate(() => S.imports[0].id); await p.evaluate(() => { UI.imp = null; render(); });
  await p.click(`[data-a="imp-undo"][data-id="${imp}"]`); await p.waitForSelector('#modal-ok'); await p.click('#modal-ok'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => ['bb-in', 'bb-out'].map(id => { const x = S.transactions.find(k => k.id === id); return [x.type, x.transferAccountId || null, x.categoryId]; })), [['income', null, 'income'], ['expense', null, 'salidas']], 'undone: Banco do Brasil’s rows are what they were');
  // 4. a card paid from another bank
  await send('bb', 'BB.csv', ['Data,Valor,Identificador,Descrição', '10/10/2026,-300.00,z1,PAGTO FATURA CARTAO NUBANK']);
  eq((await rows()).map(r => [r.type, r.move, r.to]), [['transfer', 'card', 'nu-card']], 'paying the Nubank card from Banco do Brasil pays the Nubank card');
  // 8. pairs already in the ledger
  await p.evaluate(() => { UI.imp = null; S.transactions.push(
    { id: 'lp-out', date: '2026-09-10', accountId: 'nu-conta', type: 'expense', amount: -33333, currency: 'BRL', merchant: 'Pix enviado', description: 'PIX ENVIADO', categoryId: 'other', subcategoryId: null, status: 'confirmed', notes: '' },
    { id: 'lp-in', date: '2026-09-11', accountId: 'bb', type: 'income', amount: 33333, currency: 'BRL', merchant: 'Pix recebido', description: 'PIX RECEBIDO', categoryId: 'income', subcategoryId: null, status: 'confirmed', notes: '' }); UI.tx = { ...TX_DEFAULT }; navigate('transactions'); });
  const lp = await p.evaluate(() => ledgerPairs().map(([e, i]) => e.id + '>' + i.id));
  ok(lp.includes('lp-out>lp-in'), 'a pair already in the ledger is found: ' + lp.join(', '));
  ok(await p.evaluate(n => document.querySelector('#view .banner').innerText.includes(n === 1 ? '1 pair looks like' : n + ' pairs look like'), lp.length), 'Transactions says how many there are');
  await p.click('#tx-pairs'); await p.waitForSelector('#overlay .pr');
  eq(await p.evaluate(() => document.querySelectorAll('#overlay .pr').length), lp.length, 'the panel lists each pair');
  await p.click('#overlay [data-a="pair-yes"][data-e="lp-out"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => ['lp-out', 'lp-in'].map(id => { const x = S.transactions.find(k => k.id === id); return [x.type, x.transferAccountId]; })), [['transfer', 'bb'], ['transfer', 'nu-conta']], '“It is a transfer” makes both rows one move');
  const left = await p.evaluate(() => ledgerPairs().length);
  if (left) { const [e, i] = await p.evaluate(() => [ledgerPairs()[0][0].id, ledgerPairs()[0][1].id]); await p.click(`#overlay [data-a="pair-no"][data-e="${e}"]`); await p.waitForTimeout(150);
    eq(await p.evaluate(([e, i]) => [S.pairsNo.includes([e, i].sort().join('|')), ledgerPairs().some(([x, y]) => x.id === e && y.id === i)], [e, i]), [true, false], '“It is not” is remembered, and that pair is not offered again'); }
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-import-type');
})();
