// QC of importing on a phone (owner, 2026-10-10: "let phone users import from the phone, make sure it is as simple as possible, and make an
// onboarding for it").
//   1. the first time: a page over the whole screen says where the file comes from, in three steps; its button opens the file picker; for any
//      account, on both sides; once; "How do I get my statement?" shows it again;
//   2. the way in: More lists Imports, the round + offers it; the screen is one button, the account above it, and the latest imports;
//   3. a CSV whose columns are guessed goes straight to the review; only what needs a look is asked, each with its category and Import or Skip;
//      what is sure is counted; one button imports; the end says what went in, opens the transactions or brings another;
//   4. a CSV that cannot be guessed asks the three columns, one under the other; an OFX goes straight in and leaves out what the account has;
//   5. an import can be undone from the list; a thumb fits everything and nothing is wider than 320 px; the computer keeps its screen.
const { open, ok, eq, done } = require('./pw.js');
const CSV = ['Data,Valor,Identificador,Descrição', '06/10/2026,620.00,a1,Resgate RDB', '06/10/2026,-421.87,a2,Transferência enviada pelo Pix - Roberto - ITAÚ', '07/10/2026,-13.00,a4,Transferência enviada pelo Pix - Yura',
  '07/10/2026,-77.79,a5,Pagamento de fatura', '08/10/2026,-32.50,a7,Compra no débito - Padaria Sol', '08/10/2026,-89.90,a8,Compra no débito - Netflix'].join('\n');
const ODD = ['quando;quanto;oque', '06/10/2026;-45,00;Feira do bairro', '07/10/2026;-12,30;Banca de jornal'].join('\n');
const phone = (w = 390, h = 844, more = {}) => ({ lang: 'en', account: 'example', plan: true, tours: true, viewport: { width: w, height: h }, touch: true, mobile: true, ...more });
(async () => {
  // ---------- 1. the first time ----------
  let { browser, page, errors } = await open(phone());
  await page.evaluate(() => { S.user.greeted = true; S.user.since = '2025-01-01'; S.user.tours = { dashboard: true, transactions: true, plan: true, goals: true, reports: true, accounts: true }; navigate('imports'); });
  await page.waitForSelector('#tour[data-route="imports"]');
  eq(await page.evaluate(() => { const p = document.querySelector('#tour'), r = p.getBoundingClientRect(); return [r.width >= innerWidth && r.height >= innerHeight, document.querySelectorAll('#tour .tour-does li').length, !!p.querySelector('.ta-file'), p.querySelector('.tour-go').dataset.go, p.querySelector('.tour-later').innerText.trim()]; }),
    [true, 3, true, 'imp-pick', 'Not now'], 'the first time, for an account more than a year old: a page over the whole screen, three steps, the file going in, “Choose my statement” and “Not now”');
  ok(await page.evaluate(() => /OFX or CSV/.test(document.querySelector('#tour').innerText) && /Files on an iPhone/.test(document.querySelector('#tour').innerText)), 'it says the formats and where the file is kept on each phone');
  await page.evaluate(() => { window.__picked = 0; document.querySelector('#imp-file-m').addEventListener('click', e => { window.__picked++; e.preventDefault(); }); });
  await page.click('#tour .tour-go');
  eq(await page.evaluate(() => [window.__picked, !UI.tour, !!S.user.tours.imports]), [1, true, true], '“Choose my statement” opens the file picker, and the page is not shown again');
  await page.evaluate(() => { navigate('dashboard'); navigate('imports'); }); eq(await page.evaluate(() => !UI.tour), true, 'not twice');
  await page.click('[data-a="imp-howto"]'); eq(await page.evaluate(() => UI.tour), 'imports', '“How do I get my statement?” shows it again');
  await page.click('#tour .tour-later'); eq(await page.evaluate(() => !UI.tour), true, '“Not now” closes it');
  await page.evaluate(() => { delete S.user.tours.imports; A.space({ v: 'business' }); navigate('imports'); }); await page.waitForTimeout(100);
  eq(await page.evaluate(() => UI.tour), 'imports', 'the company’s side has it too'); await page.evaluate(() => { A['tour-close'](); A.space({ v: 'personal' }); });
  eq(errors, [], 'first time: no error in the console'); await browser.close();
  // ---------- 2-3. the way in, a guessed CSV ----------
  ({ browser, page, errors } = await open(phone(390, 844, { tours: false })));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); A.sheet(); });
  eq(await page.evaluate(() => [[...document.querySelectorAll('.sheet .mr-nav a')].some(a => a.getAttribute('href') === '#imports'), !/Imports/.test((document.querySelector('#sheet-desk') || {}).innerText || '')]), [true, true], 'More lists Imports with the money; it is no longer “on the computer”');
  await page.evaluate(() => { A.close(); A.quick(); }); ok(await page.evaluate(() => !!document.querySelector('.sheet.quick [data-v="import"]')), 'the round + offers “Import a statement”');
  await page.evaluate(() => { A.close(); setMain(acct('nu-conta'), true); S.transactions = S.transactions.filter(x => x.date < '2026-10-01'); navigate('imports'); });
  eq(await page.evaluate(() => [!!document.querySelector('#imp-start .ip-pick'), document.querySelector('#imp-file-m').accept.includes('.ofx'), document.querySelector('#imp-dest').value, document.querySelectorAll('#view table').length, !!document.querySelector('.ip-hist li')]), [true, true, 'nu-conta', 0, true], 'the screen: one button, OFX and CSV, the main account chosen above it, no table, the latest imports');
  await page.selectOption('#imp-dest', 'nu-conta');
  await page.setInputFiles('#imp-file-m', { name: 'NU_out.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf8') }); await page.waitForFunction(() => UI.imp && UI.imp.step === 'review');
  const st = () => page.evaluate(() => { const i = UI.imp; return { look: ipLook(i).length, ready: ipReady(i).length, cards: document.querySelectorAll('.ip-row').length, left: ipLook(i).filter(r => !r.decision).length, btn: document.querySelector('.ip-go[data-a="imp-commit"]').innerText.trim(), off: document.querySelector('.ip-go[data-a="imp-commit"]').disabled }; });
  const s1 = await st();
  ok(s1.look + s1.ready === 6 && s1.cards === s1.look && s1.look > 0, 'a guessed CSV goes straight to the review: only what needs a look is a card; the rest is counted', s1);
  eq(await page.evaluate(() => [UI.imp.accountId, !!document.querySelector('#ip-sum'), !!document.querySelector('.ip-row select.ip-cat') || !!document.querySelector('.ip-row .ip-nocat')]), ['nu-conta', true, true], 'into the account chosen; how many are ready and to look at; each card has its category');
  await page.evaluate(() => { UI.imp.rows.forEach(r => { if (r.look) r.decision = null; }); render(); });
  eq((await st()).off, true, 'while a card is undecided, nothing can be imported');
  await page.click('[data-a="imp-accept-look"]'); eq((await st()).left, 0, '“Import all of these” decides them all');
  const first = await page.evaluate(() => ipLook(UI.imp)[0].id);
  await page.click(`#ip-${first} [data-op="ignore"]`);
  eq(await page.evaluate(id => [UI.imp.rows.find(r => r.id === id).decision, document.querySelector('#ip-' + id).classList.contains('off')], first), ['ignore', true], 'Skip leaves a row out, and it shows faded');
  const cat = await page.evaluate(() => { const r = ipLook(UI.imp).find(x => x.type === 'expense' && document.querySelector('#ip-cat-' + x.id)); return r && r.id; });
  if (cat) { const v = await page.evaluate(id => [...document.querySelector('#ip-cat-' + id).options].map(o => o.value).find(x => x !== '|'), cat); await page.selectOption('#ip-cat-' + cat, v);
    eq(await page.evaluate(id => [UI.imp.rows.find(r => r.id === id).categoryId + '|', UI.imp.rows.find(r => r.id === id).catTouched], cat), [v.split('|')[0] + '|', true], 'the category is chosen in the card'); }
  await page.click('.ip-rh'); ok(await page.evaluate(() => document.querySelectorAll('.ip-mini li').length === ipReady(UI.imp).length), 'the ready ones can be seen');
  const n = await page.evaluate(() => importable(UI.imp).length), before = await page.evaluate(() => S.transactions.length);
  ok((await st()).btn.includes(String(n)), 'the one button says how many go in', await st());
  await page.click('.ip-go[data-a="imp-commit"]'); await page.waitForFunction(() => UI.imp && UI.imp.step === 'done');
  eq(await page.evaluate(([b, n]) => [S.transactions.length - b >= n, !!document.querySelector('.ip-done [data-a="view-account"]'), !!document.querySelector('.ip-done [data-a="imp-cancel"]'), S.imports[0].file], [before, n]), [true, true, true, 'NU_out.csv'], 'imported: what went in, the way to the transactions and to bring another');
  await page.click('.ip-done [data-a="imp-cancel"]'); eq(await page.evaluate(() => [!UI.imp, !!document.querySelector('#imp-start')]), [true, true], '“Bring another statement” starts again');
  // ---------- 5. undo ----------
  await page.click('.ip-hist li:first-child [data-a="imp-undo"]'); await page.waitForSelector('.modal'); await page.click('[data-a="modal-confirm"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [S.imports[0].status, S.transactions.filter(x => x.importId === S.imports[0].id).length]), ['Undone', 0], 'an import is undone from the list');
  eq(errors, [], 'CSV: no error in the console'); await browser.close();
  // ---------- 4. a CSV that cannot be guessed, an OFX ----------
  ({ browser, page, errors } = await open(phone(320, 568, { tours: false })));
  await page.evaluate(() => { S.user.greeted = true; navigate('imports'); });
  await page.setInputFiles('#imp-file-m', { name: 'odd.csv', mimeType: 'text/csv', buffer: Buffer.from(ODD, 'utf8') }); await page.waitForFunction(() => UI.imp && UI.imp.step);
  eq(await page.evaluate(() => [UI.imp.step, document.querySelectorAll('.ip-fields select').length, !document.querySelector('#view table')]), ['map', 4, true], 'columns that cannot be guessed: asked, one under the other, with the account (no table)');
  await page.selectOption('#map-date', '0'); await page.selectOption('#map-amount', '1'); await page.selectOption('#map-description', '2'); await page.waitForTimeout(100);
  await page.click('.ip-go[data-a="imp-review"]'); await page.waitForFunction(() => UI.imp.step === 'review');
  eq(await page.evaluate(() => UI.imp.rows.length), 2, 'chosen once: the review');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#view button, #view select, #view .btn')].filter(b => b.offsetParent).every(b => b.getBoundingClientRect().height >= 44)), '320 px: nothing wider than the screen, every button and choice a thumb high');
  await page.click('[data-a="imp-cancel"]');
  const ofx = await page.evaluate(() => { const id = 'nu-card', p = { ...(S.ofxProfiles[0] || OFX_BASE), accountType: 'CREDITCARD', currency: acct(id).currency };
    const known = S.transactions.filter(x => x.accountId === id && x.sourceTxnId).slice(0, 2).map(x => ({ ...x, fitid: x.sourceTxnId }));
    return generateOFX([...known, { date: '2026-10-02', amount: -13270, type: 'expense', description: 'PAO DE ACUCAR LJ 1203', fitid: 'NU202610020901' }], p, { asOf: S.today, balance: 0 }); });
  await page.selectOption('#imp-dest', 'nu-card');
  await page.setInputFiles('#imp-file-m', { name: 'Nubank.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from(ofx, 'latin1') }); await page.waitForFunction(() => UI.imp && UI.imp.step === 'review');
  eq(await page.evaluate(() => [UI.imp.source, UI.imp.accountId, UI.imp.rows.filter(r => r.dup).length, /already in this account/.test(document.querySelector('#view').innerText)]), ['ofx', 'nu-card', 2, true], 'an OFX is told apart by what it holds, goes straight to the review, and what the card has is left out');
  eq(errors, [], 'OFX: no error in the console'); await browser.close();
  // ---------- the computer ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  await page.evaluate(() => navigate('imports'));
  eq(await page.evaluate(() => [!!document.querySelector('#imp-file-csv'), !!document.querySelector('#imp-file-ofx'), !document.querySelector('#imp-start')]), [true, true, true], 'the computer keeps its own screen');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-import-phone');
})().catch(e => { console.error('qc-import-phone: Error', e); process.exit(1); });
