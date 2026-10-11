// QC of a statement's own moves (owner, 2026-10-09: "I imported a Nubank CSV: 'Pagamento de fatura' paid down my Nubank card's invoice, and 'Resgate
// RDB' came out of the account's separate balance; make the import do it by itself"):
//   1. on review, the card's payment and the separate balance's moves are transfers, said for what they are; nothing else is touched;
//   2. the separate balance with no account yet: a savings account is made for it, with what is in it today when the person says so;
//   3. imported: each comes with its other side (the card's invoice goes down, the separate balance moves), no income and no spending is counted;
//   4. importing the same file again, nothing is doubled; and the import goes to the main account by default.
const { open, ok, eq, done } = require('./pw.js');
const CSV = ['Data,Valor,Identificador,Descrição', '06/10/2026,620.00,a1,Resgate RDB', '06/10/2026,-421.87,a2,Transferência enviada pelo Pix - Roberto - ITAÚ', '06/10/2026,-107.90,a3,Transferência enviada pelo Pix - CLARO',
  '07/10/2026,-13.00,a4,Transferência enviada pelo Pix - Yura', '07/10/2026,-77.79,a5,Pagamento de fatura', '07/10/2026,-50.00,a6,Aplicação RDB'].join('\n');

(async () => {
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  await p.evaluate(() => { setMain(acct('nu-conta'), true); S.transactions = S.transactions.filter(x => x.date < '2026-10-01'); navigate('imports'); });
  const sendCsv = async () => { await p.setInputFiles('#imp-file-csv', { name: 'NU_123_01OUT2026_07OUT2026.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map'); };
  await sendCsv();
  eq(await p.evaluate(() => UI.imp.accountId), 'nu-conta', 'a statement goes to the main account by default');
  await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  eq(await p.evaluate(() => UI.imp.rows.map(r => [r.description.slice(0, 14), r.type, r.move ? r.move.kind : null])), [['Resgate RDB', 'transfer', 'save'], ['Transferência ', 'expense', null], ['Transferência ', 'expense', null], ['Transferência ', 'expense', null], ['Pagamento de f', 'transfer', 'card'], ['Aplicação RDB', 'transfer', 'save']],
    'review: the card’s payment and the separate balance’s moves are transfers; the Pix payments are left as they are');
  await p.click('.rv-only [data-v="all"]'); await p.waitForTimeout(100);      // the moves are ready: they show under "All"
  eq(await p.evaluate(() => [...document.querySelectorAll('.rv-move')].map(x => x.innerText.trim())), ['Between this account and Nubank Caixinha (new)', 'Pays the card: Nubank account · Credit', 'Between this account and Nubank Caixinha (new)'], 'each says what it is: with the separate balance (a new account), or paying the card');
  ok(await p.evaluate(() => document.querySelector('#imp-panel').innerText.includes('Nubank Caixinha is new: a savings account for the separate balance of Nubank.') && !!document.querySelector('#imp-save-bal')), 'the new account is announced, and what is in it today is asked');
  await p.fill('#imp-save-bal', '1.000'); await p.dispatchEvent('#imp-save-bal', 'change');
  const card0 = await p.evaluate(() => accountBalance(S, 'nu-card')), inc0 = await p.evaluate(() => monthSummary(S, '2026-10', 'BRL'));
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; }); A['imp-commit'](); }); await p.waitForTimeout(200);
  const cx = await p.evaluate(() => S.accounts.find(a => a.name === 'Nubank Caixinha'));
  eq([cx && cx.type, cx && cx.institution, cx && cx.scope], ['savings', 'Nubank', 'personal'], 'imported: the separate balance is a savings account at Nubank');
  eq(await p.evaluate(id => [accountBalance(S, id), S.transactions.filter(x => x.accountId === id).map(x => [x.amount, x.type, x.transferAccountId]).sort()], cx.id), [100000, [[-62000, 'transfer', 'nu-conta'], [5000, 'transfer', 'nu-conta']]], 'its balance is what was said (R$ 1.000), the moves of the file are on both sides');
  eq(await p.evaluate(c0 => [accountBalance(S, 'nu-card') - c0, S.transactions.filter(x => x.accountId === 'nu-card' && x.type === 'transfer' && x.date >= '2026-10-01').map(x => [x.amount, x.transferAccountId, x.merchant])], card0), [7779, [[7779, 'nu-conta', 'Payment received from Nubank account']]], 'the card’s invoice went down by the payment');
  eq(await p.evaluate(i0 => { const m = monthSummary(S, '2026-10', 'BRL'); return [m.income - i0.income, m.expenses - i0.expenses]; }, inc0), [0, 54277], 'no income counted from the separate balance, and only the Pix payments count as spending');
  // 4. the same file again
  const n1 = await p.evaluate(() => S.transactions.length);
  await p.evaluate(() => { UI.imp = null; render(); }); await sendCsv(); await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  eq(await p.evaluate(() => [UI.imp.rows.every(r => r.dup), UI.imp.rows.filter(r => r.move).map(r => r.move.to === S.accounts.find(a => a.name === 'Nubank Caixinha').id || r.move.kind === 'card')]), [true, [true, true, true]], 'again: every row is already there, and the separate balance is the account made the first time');
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; }); A['imp-commit'](); }); await p.waitForTimeout(150);
  eq(await p.evaluate(n => [S.transactions.length - n, S.accounts.filter(a => a.name === 'Nubank Caixinha').length], n1), [0, 1], 'nothing is doubled, no second account');
  // 5. the card's own statement (owner, 2026-10-09: "the imports table looks messy"; his Nubank card file read its purchases as income)
  const CARD = ['date,title,amount', '2026-10-09,Total Pass Participaco,109.90', '2026-10-08,Mp *Melimais,9.90', '2026-10-07,Pagamento recebido,-77.79', '2026-10-07,Anthropic,77.90'].join('\n');
  await p.evaluate(() => { UI.imp = null; UI.tx.account = 'nu-card'; delete acct('nu-card').csvMap; render(); });
  await p.setInputFiles('#imp-file-csv', { name: 'Nubank_2026-10-09.csv', mimeType: 'text/csv', buffer: Buffer.from(CARD, 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map');
  eq(await p.evaluate(() => [UI.imp.accountId, UI.imp.invert, !!document.querySelector('[data-a="imp-flip"]')]), ['nu-card', true, false], 'a card’s file with its payment negative: its purchases are still read as spending');
  await p.evaluate(() => { UI.imp.invert = false; render(); });
  ok(await p.evaluate(() => !!document.querySelector('[data-a="imp-flip"]')), 'read the wrong way round, it says so and offers to turn it');
  await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review'); await p.click('#imp-panel [data-a="imp-flip"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => UI.imp.rows.map(r => [r.amount, r.type, r.move ? r.move.kind : null, !!r.dup])), [[-10990, 'expense', null, false], [-990, 'expense', null, false], [7779, 'transfer', 'paid', true], [-7790, 'expense', null, false]],
    'turned: purchases are spending; the payment received is a transfer from the account, already written by the account’s own import');
  eq(await p.evaluate(() => { const tb = document.querySelector('.review'), hs = [...tb.querySelectorAll('thead th')].map(h => h.textContent.trim()), rows = [...tb.querySelectorAll('tbody tr:not(.dup)')].map(r => Math.round(r.getBoundingClientRect().height));
    return [getComputedStyle(tb).tableLayout, hs.slice(1), new Set(rows).size, !!tb.querySelector('.chip.good'), !tb.querySelector('.btn.primary')]; }),
    ['fixed', ['Date', 'Merchant', 'Type', 'Category', 'Amount (BRL)', 'Decision'], 1, false, true], 'the table: fixed columns in a calm order, every row the same height (a duplicate adds its “keep both”), no “Verified” on every row, no green button in it');
  // 6. a long file: what has not been seen is asked about; only what needs a look can be shown; and an import is undone whole (owner, 2026-10-09)
  const LONG = ['Data,Valor,Identificador,Descrição', ...Array.from({ length: 14 }, (_, i) => `0${1 + (i % 7)}/10/2026,-${10 + i}.00,l${i},Compra no débito - Loja ${String.fromCharCode(65 + i)}${String.fromCharCode(75 + i)}`), '07/10/2026,-30.00,l99,Aplicação RDB'].join('\n');
  await p.evaluate(() => { UI.imp = null; UI.tx.account = 'nu-conta'; UI.pg = {}; render(); });
  await p.setInputFiles('#imp-file-csv', { name: 'NU_long.csv', mimeType: 'text/csv', buffer: Buffer.from(LONG, 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map');
  await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  eq(await p.evaluate(() => [UI.imp.rows.filter(r => r.seen).length, UI.imp.rows.length, document.querySelector('.rv-unseen').innerText.trim(), [...document.querySelectorAll('.rv-only button')].map(b => b.innerText.trim()), document.querySelector('.rv-only [aria-pressed="true"]').dataset.v, UI.imp.rows[0].merchant]), [10, 15, '4 not seen yet', ['All (15)', 'To look at (14)'], 'todo', 'Loja Ak'],
    'a long file: it opens on what needs a look (the move to the caixinha is ready); its first page is seen, the rest is said to be not seen yet; each store is named, not “Compra no débito”');
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; }); render(); A['imp-commit'](); }); await p.waitForSelector('#modal-ok');
  eq(await p.evaluate(() => [document.querySelector('#modal-title').innerText.trim(), [...document.querySelectorAll('#modal-root footer button')].map(b => b.innerText.trim())]), ['You have not seen 4 rows yet', ['Show them', 'Import anyway']], 'importing with rows not seen asks first (only those that need a look)');
  await p.click('#modal-root footer [data-a="modal-cancel"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [UI.pg['rv-imp'].page, UI.imp.rows.filter(r => r.look).every(r => r.seen), UI.imp.step]), [2, true, 'review'], '“Show them” goes to the page with them, and nothing is imported');
  const nTx = await p.evaluate(() => S.transactions.length);
  await p.evaluate(() => A['imp-commit']()); await p.waitForTimeout(150);
  eq(await p.evaluate(n => [UI.imp.step, S.transactions.length - n, !UI.modal], nTx), ['done', 16, true], 'every row seen: it imports without asking (15 rows and the caixinha’s side)');
  await p.evaluate(() => { UI.imp = null; render(); }); await p.waitForSelector('[data-a="imp-undo"]');
  const imp = await p.evaluate(() => S.imports[0].id);
  await p.click(`[data-a="imp-undo"][data-id="${imp}"]`); await p.waitForSelector('#modal-ok');
  ok((await p.evaluate(() => document.querySelector('#modal-text').innerText)).includes('The 15 transactions that NU_long.csv brought into Nubank account are deleted'), 'undoing says what goes');
  await p.click('#modal-ok'); await p.waitForTimeout(150);
  eq(await p.evaluate(([n, id]) => [S.transactions.length - n, S.transactions.some(x => x.importId === id), S.imports[0].status, !document.querySelector(`[data-a="imp-undo"][data-id="${id}"]`), [...document.querySelectorAll('#view .chip')].some(c => c.innerText.trim() === 'Undone')], [nTx, imp]), [0, false, 'Undone', true, true], 'undone: its rows are gone on both sides, the history keeps it as undone, without the button');
  // 7. less to do (owner, 2026-10-09: "reduce human error, the user's work and the load of accepting and categorizing every expense"):
  //    a line filed before comes filed; a merchant's rows are one choice; a category chosen by hand is a rule for next time, gone with the import
  const [cat, cat2] = await p.evaluate(() => { const ex = S.categories.filter(c => !c.income); return [[ex[0].id, catName(ex[0].id)], [ex[1].id, catName(ex[1].id)]]; });
  await p.evaluate(c => { S.transactions.unshift({ id: 'old-sol', date: '2026-09-20', accountId: 'nu-conta', type: 'expense', amount: -2500, currency: 'BRL', merchant: 'Padaria do Sol', description: 'Compra no débito - Padaria Sol', categoryId: c, subcategoryId: null, status: 'cleared', notes: '' }); }, cat[0]);
  const LEARN = ['Data,Valor,Identificador,Descrição', '08/10/2026,-40.00,m1,Transferência enviada pelo Pix - Roberto - ITAÚ', '08/10/2026,-12.50,m2,Compra no débito - Padaria Sol', '09/10/2026,-60.00,m3,Transferência enviada pelo Pix - Roberto - ITAÚ',
    '09/10/2026,-8.00,m4,Compra no débito - Padaria Sol', '10/10/2026,-25.00,m5,Transferência enviada pelo Pix - Roberto - ITAÚ', '10/10/2026,300.00,m6,Transferência Recebida - Ana Souza - •••.123.456-•• - BCO DO BRASIL'].join('\n');
  await p.evaluate(() => { UI.imp = null; UI.pg = {}; render(); });
  await p.setInputFiles('#imp-file-csv', { name: 'NU_learn.csv', mimeType: 'text/csv', buffer: Buffer.from(LEARN, 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map');
  await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  eq(await p.evaluate(() => UI.imp.rows.filter(r => /Padaria/.test(r.description)).map(r => [r.merchant, r.categoryId, r.learned, r.look, r.issue])), [['Padaria do Sol', cat[0], 1, false, ''], ['Padaria do Sol', cat[0], 1, false, '']], 'filed before: it comes with that category and name, ready, nothing to look at');
  eq(await p.evaluate(() => [...document.querySelectorAll('.review tbody tr')].map(r => r.classList.contains('rv-grp') ? 'group ' + r.querySelector('.rv-count').innerText.trim() + ' ' + r.querySelector('.rv-gname').value : r.querySelector('.rv-in').value + ' / ' + r.querySelector('.rv-t').innerText.trim())),
    ['group ×3 Roberto', 'Ana Souza / Transferência Recebida - Ana Souza - •••.123.456-•• - BCO DO BRASIL'], 'to look at: Roberto’s three Pix on one line, and the money coming in, named first with the bank’s words under it');
  ok(await p.evaluate(() => document.querySelector('.rv-why').innerText.startsWith('2 ready')), 'the ready rows are counted');
  // the bar (owner, 2026-10-09: "many options in sight; the All / To look at toggle can hardly be seen, make the active one white")
  eq(await p.evaluate(() => { const on = document.querySelector('.rv-only [aria-pressed="true"]'), cs = getComputedStyle(on); return [on.dataset.v, cs.backgroundColor, document.querySelectorAll('.rv-bar > .btn, .rv-bar > select').length, !document.querySelector('.rv-selbar'), !document.querySelector('#rv-more')]; }),
    ['todo', 'rgb(250, 250, 250)', 0, true, true], 'the bar: the toggle’s active side is white; no row actions in sight while nothing is chosen; the rest closed under “More”');
  await p.click('#rv-more-btn'); await p.waitForTimeout(100);
  eq(await p.evaluate(() => [...document.querySelectorAll('#rv-more button')].map(b => b.dataset.a)), ['rv-recat'], '“More” holds re-running the categorization (and accepting the verified, when some wait)');
  await p.mouse.click(5, 5); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !UI.rvMore && !document.querySelector('#rv-more')), 'a click elsewhere closes it');
  await p.evaluate(() => { UI.imp.rows.filter(r => r.look).slice(0, 2).forEach(r => { r.sel = true; }); render(); });
  eq(await p.evaluate(() => [document.querySelector('.rv-selbar b').innerText, [...document.querySelectorAll('.rv-selbar [data-a]')].map(b => b.dataset.a + (b.dataset.op ? ':' + b.dataset.op : ''))]), ['2 selected', ['rv-bulk:accept', 'rv-bulk:ignore', 'rv-bulk:transfer', 'rv-unselect']], 'rows chosen: what acts on them appears, with a way to clear the choice');
  await p.click('.rv-selbar [data-a="rv-unselect"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !document.querySelector('.rv-selbar') && UI.imp.rows.every(r => !r.sel)), 'cleared: the row actions go away');
  await p.selectOption('.rv-grp select[data-f="category"]', cat2[0] + '|'); await p.waitForTimeout(100);
  await p.click('.rv-grp [data-a="rv-group-decide"][data-op="ignore"]'); await p.waitForTimeout(100);
  eq(await p.evaluate(() => UI.imp.rows.filter(r => /Roberto/.test(r.description)).map(r => [r.categoryId, r.decision, r.catTouched])), [[cat2[0], 'ignore', true], [cat2[0], 'ignore', true], [cat2[0], 'ignore', true]], 'one choice files all three, and one press decides for all three');
  await p.click('.rv-grp [data-a="rv-group-decide"][data-op="ignore"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => UI.imp.rows.filter(r => /Roberto/.test(r.description)).every(r => r.decision === null)), 'pressed again, all three are undecided again');
  await p.fill('.rv-grp .rv-gname', 'Roberto (aluguel)'); await p.dispatchEvent('.rv-grp .rv-gname', 'change'); await p.waitForTimeout(100);
  eq(await p.evaluate(() => UI.imp.rows.filter(r => /Roberto/.test(r.description)).map(r => r.merchant)), ['Roberto (aluguel)', 'Roberto (aluguel)', 'Roberto (aluguel)'], 'the name typed on the line names all three');
  await p.click('.rv-grp [data-a="rv-group-open"]'); await p.waitForTimeout(100);
  eq(await p.evaluate(() => [document.querySelector('.rv-open').getAttribute('aria-expanded'), document.querySelectorAll('.review tr.rv-member').length, document.querySelector('.rv-grp').isConnected && document.querySelectorAll('.review tbody tr').length]), ['true', 3, 5], 'opened: each of the three is there to change on its own');
  await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; }); A['imp-commit'](); }); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [UI.imp.result.rules, S.rules.filter(r => r.auto).map(r => [r.pattern, r.merchant, r.categoryId])]), [[['Roberto (aluguel)', cat2[1]]], [['TRANSFERENCIA ENVIADA PELO PIX ROBERTO ITAU', 'Roberto (aluguel)', cat2[0]]]], 'the category chosen by hand is a rule now (not the one that came from before)');
  ok(await p.evaluate(n => document.querySelector('.imp-learnt').innerText.includes('Next time this goes in by itself: Roberto (aluguel) → ' + n), cat2[1]), 'the done message says what was learnt');
  await p.evaluate(() => { UI.imp = null; render(); }); await p.setInputFiles('#imp-file-csv', { name: 'NU_learn2.csv', mimeType: 'text/csv', buffer: Buffer.from(LEARN.replace(/m(\d)/g, 'n$1').replace(/\/10\/2026/g, '/11/2026'), 'utf8') });
  await p.waitForFunction(() => UI.imp && UI.imp.step === 'map'); await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  eq(await p.evaluate(() => UI.imp.rows.filter(r => /Roberto/.test(r.description)).map(r => [r.categoryId, !!r.ruleId, r.look])), [[cat2[0], true, false], [cat2[0], true, false], [cat2[0], true, false]], 'the next file: Roberto’s Pix come filed by the rule, nothing to look at');
  await p.evaluate(() => { UI.imp = null; render(); }); await p.waitForSelector('[data-a="imp-undo"]');
  const imp2 = await p.evaluate(() => S.imports.find(i => i.file === 'NU_learn.csv').id);
  await p.click(`[data-a="imp-undo"][data-id="${imp2}"]`); await p.waitForSelector('#modal-ok'); await p.click('#modal-ok'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => S.rules.filter(r => r.auto).length), 0, 'undoing the import takes away the rule it learnt');
  // 8. what is still unfiled has one place: Transactions says how many and shows them all
  await p.evaluate(() => { S.transactions.find(x => x.id === 'old-sol').categoryId = null; navigate('transactions'); });
  const nUn = await p.evaluate(() => filteredTx({ ...TX_DEFAULT, month: '', category: 'none' }).filter(x => x.status !== 'ignored').length);
  ok(nUn > 0 && await p.evaluate(n => document.querySelector('#view .banner').innerText.includes(n === 1 ? '1 transaction has no category.' : n + ' transactions have no category.'), nUn), 'Transactions says how many rows have no category');
  await p.click('#tx-inbox'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [UI.tx.category, UI.tx.month, !document.querySelector('#tx-inbox'), filteredTx().length]), ['none', '', true, nUn], '“File them” shows all of them, in every month');
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-import-own');
})();
