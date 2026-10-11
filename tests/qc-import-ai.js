// QC of category suggestions with AI (owner, 2026-10-09: "reduce human error, the user's work and the load of accepting and categorizing every
// expense", phase 3; asked first because it sends words off the device): off until turned on, asked for by a button, strict about what leaves.
//   1. the plain rules (supabase/functions/suggest/logic.mjs): what may leave the device, how Claude's answer is read;
//   2. the function itself (index.ts) run here with a stand-in database and Anthropic (tests/server/suggest-harness.mjs): who may use it,
//      that it says it is not set up without its key or its table, the daily limit, what is sent and what is kept;
//   3. the app: no button while it is off; with it on, what is sent (no numbers), how suggestions come back (to be looked at), the failures said.
const { open, ok, eq, done } = require('./pw.js');
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), FN = path.join(ROOT, 'supabase', 'functions', 'suggest');
(async () => {
  // 1. the rules
  const R = await import('file://' + path.join(FN, 'logic.mjs'));
  eq(['Compra no débito - PADARIA SOL 12/10 #4432', 'Transferência recebida - ANA SOUZA •••.123.456-•• BCO 001', '123', 'x'.repeat(300)].map(R.cleanText), ['COMPRA NO DEBITO PADARIA SOL', 'TRANSFERENCIA RECEBIDA ANA SOUZA BCO', '', 'X'.repeat(140)], 'what may leave the device: words only, no number of any kind, 140 letters at most');
  eq([R.cleanRows(Array.from({ length: 100 }, (_, i) => ({ id: 'r' + i, text: 'LOJA', dir: i % 2 ? 'in' : 'sideways' }))).length, R.cleanRows([{ id: '', text: 'A' }, { id: 'x', text: '99' }, null]).length, R.cleanRows([{ id: 'a', text: 'B', dir: 'sideways' }])[0].dir], [80, 0, 'out'], 'at most 80 rows; a row without an id or without words is left out');
  const groups = R.cleanGroups([{ key: 'casa|super', name: 'Casa  ›  Supermercado', dir: 'out' }, { key: 'income|salary', name: 'Sueldo', dir: 'in' }]), rows = R.cleanRows([{ id: 'r1', text: 'PADARIA', dir: 'out' }, { id: 'r2', text: 'ANA', dir: 'in' }]);
  eq(R.readAnswer('ok {"s":[{"id":"r1","key":"casa|super","name":"Padaria Sol"},{"id":"r2","key":"casa|super","name":"Ana"},{"id":"r1","key":null},{"id":"zz","key":"casa|super"}]} done', rows, groups),
    [{ id: 'r1', key: 'casa|super', name: 'Padaria Sol' }, { id: 'r2', key: null, name: 'Ana' }], 'the answer is read strictly: rows asked about, once each, a group only of the person’s and of the row’s direction');
  eq([R.readAnswer('no json', rows, groups), R.readAnswer('{"s": [}', rows, groups)], [[], []], 'an answer that is not JSON suggests nothing');
  const src = fs.readFileSync(path.join(FN, 'index.ts'), 'utf8');
  ok(!/sk-ant-|eyJhbGciOi|ANTHROPIC_API_KEY\s*=\s*['"]/.test(src) && /env\('ANTHROPIC_API_KEY'\)/.test(src), 'no key is written in the function: it is read from the server’s secrets');
  ok(/verify_jwt = false/.test(fs.readFileSync(path.join(ROOT, 'supabase', 'config.toml'), 'utf8').split('[functions.suggest]')[1] || ''), 'its deploy settings are written down (it checks its callers itself)');
  ok(/create table if not exists public\.ai_calls/.test(fs.readFileSync(path.join(ROOT, 'supabase', 'schema.sql'), 'utf8')), 'the table for the daily limit is in schema.sql');
  // 2. the function, run here
  const strip = +process.versions.node.split('.')[0] > 22 || (+process.versions.node.split('.')[0] === 22 && +process.versions.node.split('.')[1] >= 18) ? [] : ['--experimental-strip-types'];
  const run = spawnSync(process.execPath, ['--no-warnings', ...strip, path.join(__dirname, 'server', 'suggest-harness.mjs')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let O = null; try { O = JSON.parse(run.stdout); } catch (e) { console.log(run.stderr.slice(0, 2000)); }
  ok(!!O, 'the function runs here');
  if (O) {
    eq([O.anon.status, O.anon.json.code, O.get.status, O.anon.cors], [401, 'not_logged_in', 405, 'https://dorax.app'], 'every request needs a logged-in person; only the app’s own address may call it from a browser');
    eq([O.noKey.json, O.noKeySent, O.noTable.json, O.noTableSent], [{ ok: false, code: 'not_set_up' }, 0, { ok: false, code: 'not_set_up' }, 0], 'without its key, or without its table (no daily limit), it says it is not set up and asks nothing');
    eq([O.empty.json, O.emptySent], [{ ok: true, suggestions: [] }, 0], 'nothing to ask about: nothing is sent');
    eq(O.ok.json, { ok: true, suggestions: [{ id: 'r1', key: 'casa|super', name: 'Padaria Sol' }, { id: 'r2', key: null, name: 'Ana Souza' }] }, 'its answer passes on only what is the person’s own');
    const s = O.sent[0], body = s && s.body, user = body && JSON.parse(body.messages[0].content);
    eq([O.sent.length, s.host + s.path, s.headers['anthropic-version'], s.headers['x-api-key'], body.model], [1, 'api.anthropic.com/v1/messages', '2023-06-01', 'sk-ant-test-key', 'claude-haiku-5-5'], 'one request to Anthropic, with the server’s key, to Claude Haiku by default');
    eq([user.lines.map(l => l.text), user.lines.map(l => l.id), /\d/.test(user.lines.map(l => l.text).join(' ')), user.groups.length], [['COMPRA NO DEBITO PADARIA SOL', 'TRANSFERENCIA RECEBIDA ANA SOUZA BCO'], ['r1', 'r2'], false, 3], 'what Claude gets: the rows’ words without a single number (a row of numbers only is not sent), and the group names');
    eq([O.kept, O.tooManyRows], [['at,id,rows,user_id'], [80]], 'kept: who asked, when and how many rows, never the words; at most 80 rows a call');
    eq([O.failed.json, O.callsAfterFail], [{ ok: false, code: 'ai_failed' }, 1], 'when the AI fails it says so, and the call does not count');
    eq([O.limit.json, O.limitSent, O.otherPerson.json.ok], [{ ok: false, code: 'limit' }, 0, true], 'the daily limit is per person: after it, nothing is sent; someone else still may');
    eq([O.logsLeak, O.everyHost], [false, ['api.anthropic.com']], 'the logs hold counts only; Anthropic is the only address it talks to');
  }
  // 3. the app
  let { browser, page: p, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } });
  const LINES = ['Data,Valor,Identificador,Descrição', '01/10/2026,-99.00,a1,Pagamento - LANGUAGE SCHOOL XPTO 5591', '02/10/2026,-37.50,a2,Compra no débito - LOJA QUALQUER 77', '03/10/2026,1500.00,a3,Pix recebido - SALARY BONUS EMPRESA'];
  const send = async () => { await p.evaluate(() => { UI.imp = null; render(); }); await p.setInputFiles('#imp-file-csv', { name: 'NU_ai.csv', mimeType: 'text/csv', buffer: Buffer.from(LINES.join('\n'), 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map'); await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review'); };
  await p.evaluate(() => { setMain(acct('nu-conta'), true); S.transactions = S.transactions.filter(x => x.date < '2026-10-01'); navigate('imports'); });
  await send();
  ok(await p.evaluate(() => !document.querySelector('[data-a="rv-ai"]') && !S.settings.aiSuggest), 'off by default: no button, nothing can be sent');
  await p.evaluate(() => { navigate('settings'); document.getElementById('set-ai').click(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => S.settings.aiSuggest === true && document.querySelector('#set-ai-row').innerText.includes('Only the words of those rows are sent')), 'Settings turns it on, saying what is sent');
  await p.evaluate(() => navigate('imports')); await send();
  ok(await p.evaluate(() => document.querySelector('#imp-view, #view').innerText.includes('the words of the rows you ask about are sent for a suggestion')), 'the import page says it too');
  eq(await p.evaluate(() => document.querySelector('[data-a="rv-ai"]').innerText.trim()), 'Suggest with AI (3)', 'the button says how many rows would be asked about');
  await p.click('[data-a="rv-ai"]'); await p.waitForFunction(() => !UI.imp.aiBusy); await p.waitForTimeout(100);
  const asked = await p.evaluate(() => DORAX_PREVIEW.db().aiAsked.slice(-1)[0]);
  eq([asked.rows.map(r => [r.id, r.text, r.dir]), asked.groups.some(g => g.key === 'suscripciones|idiomas' && g.dir === 'out'), asked.groups.some(g => g.dir === 'in')], [[['r0', 'PAGAMENTO LANGUAGE SCHOOL XPTO', 'out'], ['r1', 'COMPRA NO DEBITO LOJA QUALQUER', 'out'], ['r2', 'PIX RECEBIDO SALARY BONUS EMPRESA', 'in']], true, true], 'what was sent: the words without numbers, the direction, and the person’s groups');
  eq(await p.evaluate(() => UI.imp.rows.map(r => [r.categoryId, r.subcategoryId, r.why, r.look])), [['suscripciones', 'idiomas', 'ai', true], [null, null, null, true], ['income', 'sueldo', 'ai', true]], 'suggestions come in to be looked at; a row with no fitting group stays without one');
  ok(await p.evaluate(() => [...document.querySelectorAll('.review .rv-t')].some(x => x.innerText.includes('Suggested by AI'))), 'each says it was suggested by AI');
  eq(await p.evaluate(() => document.querySelector('[data-a="rv-ai"]').innerText.trim()), 'Suggest with AI (1)', 'the one left can be asked about again');
  await p.evaluate(() => DORAX_PREVIEW.set({ aiOff: true })); await p.click('[data-a="rv-ai"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.body.innerText.includes('Suggestions with AI are not set up on the server yet.')), 'a server without the AI says so');
  await p.evaluate(() => DORAX_PREVIEW.set({ aiOff: false, aiLimit: true })); await p.click('[data-a="rv-ai"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.body.innerText.includes('You have asked the AI many times today.')), 'the daily limit is said');
  await p.evaluate(() => { UI.imp = null; UI.tx.account = 'nu-pj'; navigate('imports'); });
  await p.setInputFiles('#imp-file-csv', { name: 'PJ.csv', mimeType: 'text/csv', buffer: Buffer.from(LINES.join('\n'), 'utf8') }); await p.waitForFunction(() => UI.imp && UI.imp.step === 'map');
  await p.evaluate(() => { if (UI.imp.accountId !== 'nu-pj') { UI.imp.accountId = 'nu-pj'; } }); await p.click('[data-a="imp-review"]'); await p.waitForFunction(() => UI.imp.step === 'review');
  ok(await p.evaluate(() => !isBiz(UI.imp.accountId) || !document.querySelector('[data-a="rv-ai"]')), 'a company account’s import is never sent');
  eq(errors, [], 'no errors in the page');
  await browser.close(); done('qc-import-ai');
})();
