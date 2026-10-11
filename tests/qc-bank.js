// QC of connecting a bank through Open Finance (a trial): Belvo's test banks only, on its own page in the menu, for everybody.
// Three parts:
//   1. the plain rules (supabase/functions/bank/rules.mjs): what a CPF is, what Belvo is asked, how its answers become the app's rows;
//   2. the function itself (index.ts) run here with a stand-in Belvo and database (tests/server/bank-harness.mjs): who may use it,
//      that a connection can only be attached by the person Belvo holds it for, what is kept and what is not;
//   3. the app: the Open Finance page, the way out to the bank and back, the review, disconnecting.
// No key, no bank and no network are used: "Belvo" is a function in the harness, and in the browser a stand-in server.
const { open, ok, eq, done, TARGET } = require('./pw.js');
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), FN = path.join(ROOT, 'supabase', 'functions', 'bank');

(async () => {
  // ---------------------------------------------------------------- 1. the rules
  const R = await import('file://' + path.join(FN, 'rules.mjs'));
  eq(['761.092.776-73', '76109277673', ' 761 092 776 73 ', '76109277674', '111.111.111-11', '7610927767', '761092776730', 'abc', '', null].map(R.cpfOf), ['76109277673', '76109277673', '76109277673', null, null, null, null, null, null, null], 'a CPF counts when its 11 digits and its two check digits are right, however it is typed');
  eq(['  Ana   Souza ', "João D'Ávila-Souza Jr.", 'Ana', 'A B', 'Ana <b>Souza</b>', 'Ana Souza 2', 'x'.repeat(60) + ' ' + 'y'.repeat(70)].map(R.nameOf), ['Ana Souza', "João D'Ávila-Souza Jr.", null, null, null, null, null], 'a full name is letters with a space between; markup, digits and overlong names are refused');
  const tr = R.tokenRequest({ id: 'ID', password: 'PW' }, { cpf: '76109277673', name: 'Ana Souza' }, 'https://dorax.app');
  eq([tr.fetch_resources, tr.widget.consent.permissions, tr.widget.consent.identification_info, tr.widget.callback_urls, tr.widget.openfinance_feature],
    [['ACCOUNTS', 'TRANSACTIONS'], ['REGISTER', 'ACCOUNTS', 'CREDIT_CARDS'], [{ type: 'CPF', number: '76109277673', name: 'Ana Souza' }], { success: 'https://dorax.app/?bank=done', exit: 'https://dorax.app/?bank=left', event: 'https://dorax.app/?bank=failed' }, 'consent_link_creation'],
    'Belvo is asked for accounts and transactions only (no investments, no loans), for this one person, and to send them back to the app');
  eq(R.widgetUrl('a b&c', 'user-1'), 'https://widget.belvo.io/?access_token=a%20b%26c&locale=pt&access_mode=single&external_id=user-1', 'the person is sent to Belvo’s own page, in Portuguese, for a single read, with their id in Dorax on the connection');
  eq([R.transactionOf({ id: 'b1', internal_identification: 'bank-9', value_date: '2026-10-01', amount: 250.5, type: 'OUTFLOW', description: 'Mercado', account: { id: 'a1' } }),
      R.transactionOf({ id: 'b2', accounting_date: '2026-10-02T10:00:00Z', amount: 1000, type: 'INFLOW', description: '', merchant: { name: 'Empresa' }, account: { id: 'a1' } }),
      R.transactionOf({ id: 'b3', value_date: '2026-10-03', amount: -12.345, description: 'x'.repeat(400) }).amount, R.transactionOf({ id: 'b3', value_date: '2026-10-03', amount: -12.345, description: 'x'.repeat(400) }).description.length,
      R.transactionOf({ id: 'b4', amount: 5, type: 'OUTFLOW' }), R.transactionOf({ id: 'b5', value_date: '2026-10-01', amount: null }), R.transactionOf({ id: 'b6', value_date: '01/10/2026', amount: 1 }), R.transactionOf(null)],
    [{ id: 'bank-9', account: 'a1', date: '2026-10-01', amount: -25050, description: 'Mercado' }, { id: 'b2', account: 'a1', date: '2026-10-02', amount: 100000, description: 'Empresa' }, -1235, 200, null, null, null, null],
    'a bank transaction becomes a day, words and cents with a sign (money out is negative); the bank’s own id is kept when there is one; no day or no amount means left out');
  eq(R.accountOf({ id: 'a', name: 'Conta\r\nX', category: 'CREDIT_CARD', currency: 'brl', balance: { current: -1200.4 }, number: '12345-6', institution: { name: 'Banco' }, public_identification_value: 'N' }),
    { id: 'a', name: 'Conta X', kind: 'credit', currency: 'BRL', institution: 'Banco', balance: -120040 }, 'of a bank account only its name, kind, currency, bank and balance are passed on: no account number');
  const src = fs.readFileSync(path.join(FN, 'index.ts'), 'utf8') + fs.readFileSync(path.join(FN, 'rules.mjs'), 'utf8');
  ok(/const BELVO = 'https:\/\/sandbox\.belvo\.com';/.test(src) && !/api\.belvo\.com|development\.belvo\.com/.test(src), 'the function can only talk to Belvo’s sandbox: the address of the real banks is not in it');
  ok(!/sb_secret_|eyJhbGciOi|-----BEGIN|BELVO_SECRET_(ID|PASSWORD)\s*=\s*['"]/.test(src), 'no key is written in the function');
  const appSrc = ['app/js/features/imports/bank.view.js', 'app/js/features/imports/bank.actions.js', 'app/js/server/server.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  ok(!/sandbox\.belvo|api\/token|BELVO_SECRET|Basic /.test(appSrc), 'the app never talks to Belvo with keys: everything goes through the server');

  // ---------------------------------------------------------------- 2. the function, run here
  const strip = +process.versions.node.split('.')[0] > 22 || (+process.versions.node.split('.')[0] === 22 && +process.versions.node.split('.')[1] >= 18) ? [] : ['--experimental-strip-types'];
  const run = spawnSync(process.execPath, ['--no-warnings', ...strip, path.join(__dirname, 'server', 'bank-harness.mjs')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let O = null; try { O = JSON.parse(run.stdout); } catch (e) { /* judged below */ }
  if (!O && +process.versions.node.split('.')[0] < 22) console.log('qc-bank: the function itself was not run here (it is TypeScript; Node 22 or newer reads it). The other checks ran.');
  else if (!O) ok(false, 'the function runs outside Supabase', (run.stderr || run.stdout).trim().split('\n').slice(-6));
  else {
    const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', LA = '11111111-1111-4111-8111-111111111111', LB = '22222222-2222-4222-8222-222222222222';
    eq([O.anon.status, O.badToken, O.get.status, O.unknown.status, O.cors], [401, 401, 405, 400, ['https://dorax.app', 'https://dorax.app']], 'every request needs a logged-in person; only the app’s own addresses are named as allowed callers');
    eq([O.anyone, O.anyoneAsked], [[{ ok: true, enabled: true, sandbox: true, links: [] }, { ok: false, code: 'no_link' }], 0], 'there is no list of people: any logged-in person finds it switched on, with no bank of their own and no way into somebody else’s');
    ok(!/BANK_TRIAL_USERS|not_enabled/.test(src), 'nothing of the old list of people is left in the function');
    eq([O.noKeys.json, O.status0.json], [{ ok: false, code: 'not_set_up', enabled: false }, { ok: true, enabled: true, sandbox: true, links: [] }], 'without keys it says it is not set up; with them, it is switched on');
    eq([O.badCpf.map(r => r.json.code), O.badName.map(r => r.json.code), O.badAsked], [['bad_cpf', 'bad_cpf', 'bad_cpf'], ['bad_name', 'bad_name'], 0], 'a wrong CPF or name is refused before anything is sent to Belvo');
    const s = O.startAsked[0];
    eq([O.start.json, O.startAsked.length, s.host, s.path, s.method, s.body.id, s.body.widget.consent.identification_info], [{ ok: true, url: 'https://widget.belvo.io/?access_token=ACCESS.token-value&locale=pt&access_mode=single&external_id=' + A }, 1, 'sandbox.belvo.com', '/api/token/', 'POST', 'sandbox-secret-id', [{ type: 'CPF', number: '76109277673', name: 'Ana Souza' }]],
      'starting asks Belvo’s sandbox once, with the server’s keys and the person’s tidied CPF and name, and answers only the address to go to');
    ok(!JSON.stringify(O.start.json).includes('REFRESH') && !JSON.stringify(O.start.json).includes('secret'), 'neither the keys nor Belvo’s second token leave the server');
    eq([O.startRefused.json, O.startDown.json], [{ ok: false, code: 'bank_refused', status: 401 }, { ok: false, code: 'bank_refused', status: 0 }], 'when Belvo refuses or cannot be reached, the app is told so');
    eq([O.finishNoLink.status, O.finishUnknown.json.code, O.finishOthers.json, O.afterOthers], [400, 'bank_refused', { ok: false, code: 'not_yours' }, 0], 'coming back with a made-up id, an unknown one, or SOMEBODY ELSE’S connection adds nothing');
    eq([O.finish.json.ok, O.finishAgain.json.ok, O.table], [true, true, [{ created_at: true, user_id: A, link_id: LA, institution: 'ofmockbank_br_retail <b>' }]], 'a person’s own connection is remembered once: which connection, which bank, whose. Nothing else (no CPF, no name)');
    eq([O.status1[0].links.map(l => l.id), O.status1[1], O.stealAfter.json, O.ownerAfter], [[LA], [LB], { ok: false, code: 'not_yours' }, true], 'each person lists only their own banks, and cannot take over one that is somebody else’s');
    eq([O.fetchNotMine.json, O.fetchNotMineAsked], [{ ok: false, code: 'no_link' }, 0], 'asking for the data of somebody else’s connection is refused without Belvo being asked');
    const f = O.fetch.json;
    eq([f.ok, f.accounts, f.transactions.length, f.left, f.more, f.transactions.slice(0, 2)], [true, [{ id: 'acc-main', name: 'Conta corrente X', kind: 'checking', currency: 'BRL', institution: 'ofmockbank_br_retail', balance: 123456 }, { id: 'acc-card', name: 'Cartão', kind: 'credit', currency: 'BRL', institution: 'ofmockbank_br_retail', balance: -45000 }], 7, 3, false,
      [{ id: 'belvo-0', account: 'acc-main', date: '2026-09-01', amount: 1025, description: 'COMPRA <script>alert(1)</script> SEGUNDA LINHA' }, { id: 'bank-id-1', account: 'acc-main', date: '2026-09-02', amount: -1125, description: 'MOVIMENTO 1' }]],
      'the bank’s accounts and transactions come back in the app’s own shapes; what has no day or no amount is counted as left out');
    ok(!JSON.stringify(f).includes('12345-6') && !JSON.stringify(f).includes('SECRET-NUMBER'), 'account numbers are not passed on to the browser');
    eq([O.fetchAsked.map(q => q.path), O.fetchAsked[1].query.link, /^\d{4}-\d{2}-\d{2}$/.test(O.fetchAsked[1].query.value_date__gte), O.fetchAsked.every(q => q.basic === 'sandbox-secret-id:sandbox-secret-password')], [['/api/accounts/', '/api/transactions/'], LA, true, true], 'reading asks Belvo for that one connection, the last twelve months, with the server’s keys');
    eq([O.fetchLong.json.more, O.fetchLongAsked, O.fetchLong.json.transactions.length, O.fetchDown.json.code], [true, 5, 15, 'bank_refused'], 'a very long history is read up to a limit and the app is told there is more; Belvo being down is said, not hidden');
    eq([O.discNotMine.json, O.discNotMineState, O.discRefused.json.code, O.discRefusedKept], [{ ok: true, removed: 0 }, [true, true], 'bank_refused', true], 'nobody disconnects somebody else’s bank; if Belvo cannot delete the connection, it is not forgotten here either');
    eq([O.disc.json, O.discAsked, O.discState], [{ ok: true, removed: 1 }, ['DELETE /api/links/' + LA + '/'], [false, false, true]], 'disconnecting deletes the connection at Belvo (which withdraws the consent) and then here; other people’s stay');
    eq([O.tooMany.json, O.tooManyAsked], [{ ok: false, code: 'too_many' }, 0], 'a person can have five banks connected, not more');
    ok(!O.logsLeak && O.logs.every(l => /^(ERR )?bank: /.test(l)), 'the logs hold counts and codes: no CPF, no name, no key, no account, no transaction', O.logs.slice(0, 3));
    eq(O.everyHost, ['sandbox.belvo.com'], 'the only place the function ever called is Belvo’s sandbox');
  }

  // ---------------------------------------------------------------- 3. the app
  const tag = TARGET + ': ', toastOf = p => p.evaluate(() => (document.querySelector('#toast-root') || { innerText: '' }).innerText.trim());
  {
    // the page is in the menu for everybody. Where the server's side is missing (this stand-in, until a test switches a pretend bank on)
    // it is still there: it says so, and offers nothing to press.
    for (const [lang, viewport] of [['en', { width: 1440, height: 900 }], ['es', { width: 390, height: 800 }], ['pt', { width: 390, height: 800 }]]) {
      const phone = viewport.width < 500, o = await open({ lang, account: 'example', plan: true, viewport, mobile: phone, touch: phone }), p = o.page, T = k => p.evaluate(k => t(k), k), where = `${tag}${lang} ${viewport.width}: `;
      if (phone) {
        // a phone leaves connecting a bank to the computer (features/phone/desk-only.js, owner 2026-10-07): what the bank sends is reviewed in a wide table
        await p.click('.navbar [data-a="sheet"]'); await p.waitForSelector('.sheet .nav a');
        eq(await p.evaluate(() => [document.querySelectorAll('.sheet a[href="#openfinance"]').length, /Open Finance/.test(document.querySelector('#sheet-desk').innerText)]), [0, true], where + 'on a phone Open Finance is not a place to go: More names it among what is on the computer');
        await p.evaluate(() => { A.close(); navigate('openfinance'); });
        eq(await p.evaluate(() => [!!document.querySelector('#desk-openfinance'), document.querySelectorAll('#bank-card').length, document.documentElement.scrollWidth - innerWidth <= 0]), [true, 0, true], where + 'and its address shows a note, not the bank card');
        eq(o.errors, [], where + 'no errors'); await o.browser.close(); continue;
      }
      const link = phone ? '.sheet a[href="#openfinance"]' : '#nav a[href="#openfinance"]';
      eq(await p.evaluate(s => { const a = document.querySelector(s), r = a.getBoundingClientRect(), all = [...a.parentNode.querySelectorAll('a')].map(x => x.getAttribute('href')); return [a.innerText.trim(), !!a.querySelector('svg'), r.width > 0 && r.bottom <= innerHeight, all.indexOf('#openfinance') - all.indexOf('#imports'), a.scrollWidth <= a.clientWidth]; }, link),
        ['Open Finance', true, true, 1, true], where + 'Open Finance is in the menu, right after Imports, with its icon, in view and not cut');
      await p.click(link); await p.waitForFunction(() => UI.route === 'openfinance' && UI.bank && UI.bank.known);
      eq(await p.evaluate(() => [document.querySelector('.pagehead h1').innerText.trim(), !!document.querySelector('#bank-card .chip.warn'), document.querySelector('#bank-card .empty').innerText.replace(/\s+/g, ' ').trim(), document.querySelectorAll('#bank-card button').length, UI.sheet, document.documentElement.scrollWidth - innerWidth <= 0]),
        ['Open Finance', true, (await T('Not available here yet')) + ' ' + (await T('This preview has no bank to connect to.')), 0, false, true], where + 'the page opens for a person nobody named, marked as a trial; with no bank behind it, it says so and has nothing to press');
      await p.evaluate(() => navigate('imports'));
      eq(await p.evaluate(() => [!!document.querySelector('#bank-card'), !!document.querySelector('[data-a="bank-open"]')]), [false, false], where + 'the Imports page is about files again: the bank card has moved out');
      eq(o.errors, [], where + 'no errors'); await o.browser.close();
    }
  }
  // (the second width was a phone until phones left this page to the computer; a tablet has the phone's frame and keeps the page)
  for (const [lang, viewport] of [['pt', { width: 1440, height: 900 }], ['en', { width: 820, height: 1100 }]]) {
    const o = await open({ lang, account: 'example', plan: true, viewport, mobile: viewport.width < 500, touch: viewport.width < 500, server: { bankTrial: true } }), p = o.page, T = k => p.evaluate(k => t(k), k), where = `${tag}${lang} ${viewport.width}: `;
    const ready = () => p.waitForFunction(() => typeof UI !== 'undefined' && UI.session && UI.bank && UI.bank.known);
    await p.evaluate(() => navigate('openfinance')); await ready();
    eq(await p.evaluate(() => [!!document.querySelector('#bank-card .chip.warn'), !!document.querySelector('#bank-card .empty'), document.querySelectorAll('[data-a="bank-fetch"]').length, document.documentElement.scrollWidth - innerWidth <= 0]), [true, true, 0, true], where + 'with a bank behind it the card is marked as a trial and has no bank yet');
    const before = await p.evaluate(() => S.transactions.length);
    await p.click('[data-a="bank-open"]'); await p.waitForSelector('#bk-cpf');
    await p.fill('#bk-cpf', '123'); await p.fill('#bk-name', 'Alex Souza'); await p.click('[data-a="bank-start"]');
    eq([await p.locator('#overlay .banner').innerText(), await p.evaluate(() => (DORAX_PREVIEW.db().bankAsked || []).length)], [await T('That CPF is not valid. Check the 11 digits.'), 0], where + 'a CPF that is not 11 digits is refused in the panel, before the server is asked');
    await p.fill('#bk-cpf', '761.092.776-73'); await p.fill('#bk-name', 'Alex'); await p.click('[data-a="bank-start"]');
    eq(await p.locator('#overlay .banner').innerText(), await T('Type your full name, first and last.'), where + 'so is a single name');
    await p.fill('#bk-name', 'Alex Souza'); await p.click('[data-a="bank-start"]');
    await p.waitForFunction(() => typeof UI !== 'undefined' && UI.bank && (UI.bank.links || []).length === 1, null, { timeout: 15000 });
    eq(await p.evaluate(() => [location.search, UI.route, UI.drawer, (DORAX_PREVIEW.db().bank || []).length, JSON.stringify(S).includes('76109277673') || JSON.stringify(S).includes('761.092'), Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(k => /761\.?092/.test(localStorage[k] || sessionStorage[k] || ''))]),
      ['', 'openfinance', null, 1, false, false], where + 'the person leaves for the bank and comes back to the Open Finance page with the bank connected; the address is tidied and the CPF is kept nowhere in the browser');
    eq(await toastOf(p), (await T('{name} is connected. Bring its transactions when you are ready.')).replace('{name}', 'Mock Bank'), where + 'and is told so');
    await p.click('[data-a="bank-fetch"]'); await p.waitForSelector('[data-a="bank-review"]');
    eq(await p.evaluate(() => [...document.querySelectorAll('#bank-card .list .li')].map(li => [li.querySelector('.grow').innerText.split(' · ')[0].trim(), li.querySelector('[data-a="bank-review"]').disabled])), [['Conta corrente', false], ['Cartão', false]], where + '"Bring transactions" lists the bank’s accounts, each with its own review');
    eq(await p.evaluate(() => S.transactions.length), before, where + 'bringing them imports nothing by itself');
    eq(await p.evaluate(() => [...document.querySelectorAll('#bank-card .list .li')].every(li => { const g = li.querySelector('.grow'), b = li.querySelector('button').getBoundingClientRect(), r = li.getBoundingClientRect(); return g.getBoundingClientRect().height <= (innerWidth <= 920 ? 46 : 30) && b.right <= r.right + 1 && b.height >= (innerWidth <= 920 ? 38 : 28); })), true, where + 'each account’s name stays on one line (two at most in a tablet’s narrower card), with its button inside the row');
    await p.click('[data-a="bank-review"]'); await p.waitForSelector('#imp-panel');
    eq(await p.evaluate(() => { const y = s => document.querySelector(s).getBoundingClientRect().top; return [UI.route, y('#imp-panel') > y('#bank-card')]; }), ['openfinance', true], where + 'the review opens on the same page, under the bank');
    await p.evaluate(() => navigate('imports')); eq(await p.evaluate(() => !!document.querySelector('#imp-panel')), false, where + 'and is not shown among the file imports'); await p.evaluate(() => navigate('openfinance')); await p.waitForSelector('#imp-panel');
    const rev = await p.evaluate(() => ({ source: UI.imp.source, file: UI.imp.file, rows: UI.imp.rows.length, ids: UI.imp.rows.every(r => /^bank:tx-\d$/.test(r.sourceTxnId)), first: [UI.imp.rows[0].date, UI.imp.rows[0].amount, UI.imp.rows[0].description], pick: !!document.querySelector('#imp-panel #imp-acct'), kind: acct(UI.imp.accountId).type, over: document.documentElement.scrollWidth - innerWidth <= 0 }));
    eq(rev, { source: 'bank', file: 'Mock Bank · Conta corrente', rows: 5, ids: true, first: ['2026-09-28', -18990, 'SUPERMERCADO PAO DE ACUCAR'], pick: true, kind: 'checking', over: true }, where + 'an account’s transactions open in the same review as a statement file, into a household account of the same kind that can be changed');
    await p.evaluate(() => { UI.imp.rows.forEach(r => { r.decision = 'accept'; }); render(); }); await p.click('[data-a="imp-commit"]'); await p.waitForFunction(() => UI.imp && UI.imp.step === 'done');
    eq(await p.evaluate(b => [S.transactions.length - b, S.imports[0].source, S.imports[0].imported, S.transactions.filter(x => x.source === 'bank').every(x => /^bank:/.test(x.sourceTxnId))], before), [5, 'bank', 5, true], where + 'accepted rows enter the ledger marked as coming from the bank connection, and the import is in the history');
    // the same transactions again: recognised by the bank's own ids
    await p.click('[data-a="bank-fetch"]'); await p.waitForFunction(() => !UI.bank.busy); await p.click('[data-a="bank-review"]'); await p.waitForFunction(() => UI.imp && UI.imp.step === 'review');
    eq(await p.evaluate(() => [UI.imp.rows.length, UI.imp.rows.filter(r => r.dup && r.dup.certainty === 'exact').length]), [5, 5], where + 'bringing the same transactions again marks every one as already imported');
    await p.evaluate(() => A['imp-cancel']());
    // disconnecting asks first, in a pop-up in the middle
    await p.click('[data-a="bank-disconnect"]'); await p.waitForSelector('#modal-ok');
    eq(await p.evaluate(() => { const m = document.querySelector('.modal, #modal-root [role="alertdialog"], #modal-root [role="dialog"]'), r = m && m.getBoundingClientRect(); return [!!m, r ? Math.abs((r.left + r.right) / 2 - (r => (r.left + r.right) / 2)(document.querySelector('.app').getBoundingClientRect())) <= 2 : false, (DORAX_PREVIEW.db().bank || []).length]; }), [true, true, 1], where + 'disconnecting asks for confirmation in a centred pop-up, and nothing is removed until it is given');
    await p.click('#modal-ok'); await p.waitForFunction(() => UI.bank && !UI.bank.busy && (UI.bank.links || []).length === 0);
    eq(await p.evaluate(b => [(DORAX_PREVIEW.db().bank || []).length, !!document.querySelector('#bank-card .empty'), S.transactions.length - b], before), [0, true, 5], where + 'after it the bank is gone from the server and the imported transactions stay');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }
  for (const [outcome, key] of [['left', 'No bank was connected.'], ['failed', 'The bank could not be connected. Nothing was shared.']]) {
    const o = await open({ lang: 'en', account: 'example', plan: true, server: { bankTrial: true, bankOutcome: outcome } }), p = o.page;
    await p.evaluate(() => navigate('openfinance')); await p.waitForFunction(() => UI.bank && UI.bank.known);
    await p.click('[data-a="bank-open"]'); await p.fill('#bk-cpf', '76109277673'); await p.fill('#bk-name', 'Alex Souza'); await p.click('[data-a="bank-start"]');
    await p.waitForFunction(k => typeof UI !== 'undefined' && UI.session && UI.bank && UI.bank.known && document.querySelector('#toast-root') && document.querySelector('#toast-root').innerText.includes(k), key, { timeout: 15000 });
    eq(await p.evaluate(() => [location.search, UI.route, (UI.bank.links || []).length, (DORAX_PREVIEW.db().bank || []).length]), ['', 'openfinance', 0, 0], `${tag}coming back having ${outcome === 'left' ? 'given up' : 'failed'} at the bank connects nothing and says so`);
    eq(o.errors, [], `${tag}no errors (${outcome})`); await o.browser.close();
  }
  {
    // somebody pastes an address with another connection's id: the server refuses, nothing is added
    const o = await open({ lang: 'en', account: 'example', plan: true, server: { bankTrial: true } }), p = o.page;
    await p.evaluate(() => { history.replaceState(null, '', location.pathname + '?bank=done&link=12345678-1234-4234-8234-123456789012&institution=x'); }); await p.reload();
    await p.waitForFunction(() => typeof UI !== 'undefined' && UI.session && UI.bank && UI.bank.known && document.querySelector('#toast-root').innerText.trim());
    eq([await toastOf(p), await p.evaluate(() => [(UI.bank.links || []).length, location.search, UI.route])], ['That connection is not yours, so it was not added.', [0, '', 'openfinance']], tag + 'an address carrying a connection the server does not hold for this person adds nothing');
    // an empty answer from the bank is explained, not shown as "nothing"
    await p.evaluate(() => DORAX_PREVIEW.set({ bankEmpty: true })); await p.click('[data-a="bank-open"]'); await p.fill('#bk-cpf', '76109277673'); await p.fill('#bk-name', 'Alex Souza'); await p.click('[data-a="bank-start"]');
    await p.waitForFunction(() => typeof UI !== 'undefined' && UI.bank && (UI.bank.links || []).length === 1, null, { timeout: 15000 });
    await p.click('[data-a="bank-fetch"]'); await p.waitForFunction(() => UI.bank.got && !UI.bank.busy);
    ok((await p.locator('#bank-card').innerText()).includes('The bank has not sent any transactions yet.') && !(await p.locator('[data-a="bank-review"]').count()), tag + 'when the bank has not sent transactions yet, the card says to try again shortly');
    eq(o.errors, [], tag + 'no errors'); await o.browser.close();
  }
  done('qc-bank');
})().catch(e => { console.error('qc-bank: Error', e); process.exit(1); });
