// QC of the flows from end to end, as a person uses them: first-time setup, the converter with real files,
// statement imports and duplicates, the spreadsheet import, backup and restore, what survives a reload, and every delete.
const { open, ok, eq, done } = require('./pw.js');
// The server is the stand-in (see pw.js). Here it asks for no email confirmation, so a sign-up goes straight to the setup; the links in the
// emails are covered by flows-auth.js.
const fs = require('fs'), path = require('path'), os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dorax-qc-'));
const file = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
(async () => {
  // ---------- 1. a new person: sign-up, the whole setup, and a dashboard that opens with their own numbers ----------
  let { browser, page, errors } = await open({ lang: 'en', server: { confirmEmail: false } });
  const reload = async () => { await page.evaluate(() => saveNow()); await page.reload(); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); };
  const toast = () => page.locator('#toast-root').innerText().catch(() => '');
  await page.evaluate(() => A['pub-go']({ v: 'signup' }));
  await page.fill('#au-name', 'Bia'); await page.fill('#au-email', 'bia@example.org'); await page.fill('#au-pass', 'BiaSenha2026'); await page.check('#au-accept');
  await page.click('[data-a="auth-signup"]'); await page.waitForSelector('#ob-name');
  await page.click('[data-a="onboard-save"]');
  // step 2: account
  await page.fill('#ob-acct', 'Conta principal');
  const fill = async (sel, v) => { const el = page.locator(sel).first(); if (await el.count()) await el.fill(v); return el.count(); };
  await page.evaluate(() => { const b = document.querySelector('.onb input[id*="bal"], .onb input[id*="open"]'); if (b) b.dataset.qc = '1'; });
  const obInputs = async () => page.evaluate(() => [...document.querySelectorAll('.onb input, .onb select')].map(e => e.id + ':' + e.type + ':' + (e.value || '')));
  const step2 = await obInputs();
  await fill('#ob-bal', '2.500,00');
  await page.click('[data-a="ob-next"]');
  const step3 = await obInputs();
  await fill('#ob-pay0', '3.000'); await fill('#ob-pay1', '5.200,50');
  await page.click('[data-a="ob-next"]');
  const step4 = await obInputs();
  await fill('#ob-bn0', 'Aluguel'); await fill('#ob-ba0', '1.800'); await fill('#ob-bd0', '5');
  await page.click('[data-a="ob-next"]');
  const step5 = await obInputs();
  await fill('#ob-gname', 'Viagem'); await fill('#ob-gtarget', '6.000'); await fill('#ob-gsaved', '1.000'); await fill('#ob-gmonth', '500');
  await page.click('[data-a="ob-next"]');
  const summary = await page.locator('.onb').innerText().catch(() => '');
  await page.click('[data-a="ob-finish"]'); await page.waitForFunction(() => !!UI.session);
  const st = await page.evaluate(() => ({ user: S.user.name, accounts: S.accounts.map(a => [a.name, a.opening]), pay: Object.values(S.pay).flat().map(r => [r.to, r.half, r.values[+S.today.slice(5, 7) - 1]]), lines: S.plan.lines.map(l => [l.name, l.due, planValue(S, l, ymOf(S.today))]),
    goals: S.goals.map(g => [g.name, g.target, goalSaved(S, g.id), goalPlan(g, ymOf(S.today))]), moves: S.goalMoves.map(m => [m.amount, !!m.start]), net: planTotals(S, ymOf(S.today)), goalStatus: S.goals.map(g => goalStatus(S, g, S.today).state) }));
  if (!st.accounts.length || !st.pay.length) console.log('  setup inputs seen:', JSON.stringify({ step2, step3, step4, step5 }));
  eq(st.user, 'Bia', 'setup: name');
  eq(st.accounts, [['Conta principal', 250000]], 'setup: account with its balance (2.500,00)');
  eq(st.pay.map(r => r[2]).sort((a, b) => a - b), [300000, 520050], 'setup: two payments read as 3.000 and 5.200,50');
  eq(st.lines, [['Aluguel', 5, 180000]], 'setup: fixed cost with its due day');
  eq(st.goals, [['Viagem', 600000, 100000, 50000]], 'setup: goal with target, already saved and monthly amount');
  eq(st.moves, [[100000, true]], 'setup: what was already saved is a starting balance, not a contribution of this month');
  ok(st.goalStatus[0] !== 'ahead' && st.goalStatus[0] !== 'behind', 'setup: a goal with money already saved reads neither ahead nor behind on day one', st.goalStatus);
  ok(await page.locator('.hello').isVisible() && /Bia/.test(await page.locator('.hello').innerText()), 'setup: dashboard greets by name');
  const dash = await page.locator('#view').innerText();
  ok(/Aluguel/.test(dash) && /Viagem/.test(dash), 'setup: the dashboard opens with the person’s own bill and goal', dash.slice(0, 200));
  ok(!/NaN|undefined/.test(dash), 'setup: no broken value on the first dashboard');
  // what survives a reload, and a log out / log in
  await reload();
  eq(await page.evaluate(() => [S.user.name, S.plan.lines.length, S.goals.length, S.accounts.length]), ['Bia', 1, 1, 1], 'reload: the account is as it was left (read back from the server)');
  // mark the bill paid, undo, pay again; the account balance follows
  await page.evaluate(() => navigate('plan'));
  await page.click('#paylist [data-a="line-pay-now"]');
  eq(await page.evaluate(() => accountBalance(S, S.accounts[0].id)), 250000 - 180000, 'bill paid: taken from the account');
  ok(await page.locator('#toast-root [data-a="undo-pay"]').count() === 1, 'bill paid: Undo is offered');
  await page.click('#toast-root [data-a="undo-pay"]');
  eq(await page.evaluate(() => [accountBalance(S, S.accounts[0].id), S.transactions.length]), [250000, 0], 'undo: the payment is gone and the balance is back');
  // typed amounts that used to be misread are refused in the forms
  await page.click('#topbar [data-a="line-new"]');
  const drawerInputs = await page.evaluate(() => [...document.querySelectorAll('#overlay input, #overlay select')].map(e => e.id + ':' + e.type));
  await page.fill('#l-name', 'Internet'); await page.fill('#l-amount', '110,905'); await page.click('[data-a="line-save"]');
  ok(await page.evaluate(() => !!UI.drawer && S.plan.lines.length === 1) && await page.locator('#l-amount').count() === 1, 'a slip like 110,905 is refused, not saved as 110.905,00', drawerInputs);
  await page.fill('#l-amount', '1o0'); await page.click('[data-a="line-save"]');
  ok(await page.evaluate(() => S.plan.lines.length === 1) && await page.locator('#l-amount').count() === 1, 'an amount with a letter in it is refused');
  await page.fill('#l-amount', '110,90'); await page.click('[data-a="line-save"]');
  eq(await page.evaluate(() => S.plan.lines.filter(l => l.name === 'Internet').map(l => planValue(S, l, ymOf(S.today)))), [11090], 'the corrected amount is saved as typed');
  await page.evaluate(() => { UI.drawer = null; render(); });
  // ids: things created after a reload never take the id of something that exists
  await reload(); await page.evaluate(() => navigate('accounts'));
  await page.evaluate(() => { for (let i = 0; i < 12; i++) { S.accounts.push({ id: newId('a'), name: 'Extra ' + i, type: 'checking', scope: 'personal', currency: 'BRL', opening: 0, institution: '' }); S.goals.push({ id: newId('g'), name: 'G' + i, kind: 'fund', target: null, deadline: null, status: 'active', accountId: null, note: '', plan: {} }); S.plan.lines.push({ id: newId('pl'), categoryId: S.plan.lines[0].categoryId, subcategoryId: null, name: 'L' + i, pay: 'fixed', accountId: S.accounts[0].id, due: null, end: null, note: '', plan: {} }); } });
  { const ids = await page.evaluate(() => { const out = []; JSON.stringify(S, (k, v) => { if (k === 'id' && typeof v === 'string') out.push(v); return v; }); return out; }); eq(ids.length - new Set(ids).size, 0, 'ids: nothing created after a reload shares an id with something that exists'); }
  await page.evaluate(() => { S.accounts = S.accounts.filter(a => !/^Extra /.test(a.name)); S.goals = S.goals.filter(g => !/^G\d/.test(g.name)); S.plan.lines = S.plan.lines.filter(l => !/^L\d/.test(l.name)); render(); });
  // deleting: a centred dialog; the important ones ask for the word
  await page.evaluate(() => navigate('goals'));
  await page.click('[data-a="goal-open"]');
  const del = page.locator('#overlay [data-a="goal-delete-ask"]').first();
  if (await del.count()) {
    await del.click();
    const m = await page.evaluate(() => { const el = document.querySelector('#modal-root .modal'); if (!el) return null; const b = el.getBoundingClientRect(); return { centred: Math.abs((b.left + b.right) / 2 - innerWidth / 2) < 3, role: el.getAttribute('role') || (el.closest('[role]') || {}).getAttribute && el.closest('[role]').getAttribute('role'), word: UI.modal.word || null, okDisabled: document.querySelector('#modal-ok').disabled }; });
    ok(m && m.centred, 'delete: asked in a centred dialog', m);
    ok(m && m.word && m.okDisabled, 'delete of a goal with movements: the word has to be typed first', m);
    await page.fill('#modal-word', 'nope'); ok(await page.locator('#modal-ok').isDisabled(), 'delete: a wrong word keeps the button off');
    await page.keyboard.press('Escape'); eq(await page.evaluate(() => [!!UI.modal, S.goals.length]), [false, 1], 'delete: Escape cancels and nothing is deleted');
    await del.click(); await page.fill('#modal-word', m.word.toUpperCase() + ' '); ok(!(await page.locator('#modal-ok').isDisabled()), 'delete: capitals and a space are forgiven');
    await page.click('#modal-ok'); eq(await page.evaluate(() => [S.goals.length, S.goalMoves.length]), [0, 0], 'delete: the goal and its movements are gone');
  } else ok(false, 'delete button found in the goal panel');
  // backup and restore give back the same account
  const before = await page.evaluate(() => JSON.stringify(S));
  const backup = await page.evaluate(() => JSON.stringify({ app: 'dorax-finance', version: BACKUP_VERSION, exportedAt: S.today, state: S }));
  ok(!/BiaSenha2026/.test(backup) && !/"hash"/.test(backup), 'backup: holds no password and no password digest');
  await page.evaluate(() => { S.plan.lines = []; S.accounts[0].opening = 1; render(); navigate('settings'); });
  const bfile = file('backup.json', backup);
  const restoreInput = page.locator('#view input[type="file"]').first();
  if (await restoreInput.count()) {
    await restoreInput.setInputFiles(bfile); await page.waitForTimeout(300);
    if (await page.locator('#modal-word').count()) await page.fill('#modal-word', await page.evaluate(() => UI.modal.word));
    if (await page.locator('#modal-ok').count()) await page.click('#modal-ok');
    await page.waitForTimeout(200);
    eq(await page.evaluate(() => JSON.stringify(S)) === before, true, 'restore: the account is exactly what the backup held');
    await restoreInput.setInputFiles(file('bad.json', '{"hello":1}')); await page.waitForTimeout(200);
    ok(/could not be read|not a|backup/i.test(await page.locator('#view').innerText()) && await page.evaluate(() => !UI.modal), 'restore: a file that is not a backup is refused');
  } else ok(false, 'restore file input found');
  eq(errors, [], 'new account flows: no console errors');
  await browser.close();

  // ---------- 2. the converter ----------
  ({ browser, page, errors } = await open({ lang: 'en', plan: true, account: 'example' }));
  await page.evaluate(() => navigate('converter'));
  await page.locator('[data-a="conv-start"][data-id="wise-brl"]').first().click();
  // the app has no sample button any more: the fixture's statement goes in as a file, the way a person brings theirs
  eq(await page.locator('[data-a="conv-sample"], [data-a="sheet-sample"], [data-a="imp-start"]').count(), 0, 'converter: no sample button');
  { const f = await page.evaluate(() => [wiseFileName('wise-brl', UI.conv.ym), wiseCsv('wise-brl', UI.conv.ym)]); await page.setInputFiles('#stmt-file', { name: f[0], mimeType: 'text/csv', buffer: Buffer.from(f[1], 'utf8') }); await page.waitForFunction(() => UI.conv && UI.conv.file && !UI.conv.busy); }
  await page.click('[data-a="conv-analyze"]');
  const rv = await page.evaluate(() => ({ rows: UI.conv.rows.length, sum: UI.conv.rows.filter(r => r.decision !== 'ignore').reduce((s, r) => s + r.amount, 0) }));
  await page.click('[data-a="conv-generate"]');
  let conv = await page.evaluate(() => { const c = UI.conv, p = parseOFX(c.ofx); return { name: c.outName, n: p.rows.length, sum: p.rows.reduce((s, r) => s + r.amount, 0), bal: tagValue(c.ofx.slice(c.ofx.indexOf('<LEDGERBAL>')), 'BALAMT'), ids: new Set(p.rows.map(r => r.sourceTxnId)).size, checks: [...document.querySelectorAll('#view .checks > *')].length, bad: document.querySelectorAll('#view .checks .bad').length, ascii: /^[\x09\x0A\x0D\x20-\x7E]*$/.test(c.ofx) }; });
  eq([conv.n, conv.sum, conv.ids], [rv.rows, rv.sum, rv.rows], 'converter: every reviewed row is in the OFX, same total, unique IDs');
  eq(conv.bad, 0, 'converter: every format check passes'); ok(conv.ascii, 'converter: SGML file is plain ASCII'); ok(/\.ofx$/.test(conv.name), 'converter: file is named .ofx', conv.name);
  // a real file in another bank's layout, saved as Windows-1252, newest first, with lines above the table and a balance line
  const lines = ['Banco Exemplo S.A.;;;;', 'Extrato de conta corrente;;;;', 'Período: 01/09/2026 a 30/09/2026;;;;', 'Data;Histórico;Crédito;Débito;Saldo', '30/09/2026;TARIFA MANUTENÇÃO;;12,50;4.321,07', '18/09/2026;PIX RECEBIDO JOÃO;1.500,00;;4.333,57', '18/09/2026;PAGAMENTO BOLETO ÁGUA;;166,43;2.833,57', '02/09/2026;TED ENVIADA;;1.000,00;3.000,00', 'Saldo anterior;;;;4.000,00'];
  const real = file('extrato-set.csv', Buffer.from(lines.join('\r\n'), 'latin1'));
  await page.click('[data-a="conv-reset"]'); await page.locator('[data-a="conv-start"]').first().click();
  await page.selectOption('#cv-acct', 'nu-pj').catch(() => {});
  await page.setInputFiles('#stmt-file', real); await page.waitForTimeout(500);
  // the file is read in the background; the button is pressed if the screen is still waiting for it (a short try: the app may have moved on by itself)
  await page.click('[data-a="conv-analyze"]', { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(300);
  const colsStep = await page.evaluate(() => ({ step: UI.conv && UI.conv.step, acts: [...document.querySelectorAll('#view [data-a]')].filter(e => e.offsetParent !== null).map(e => e.dataset.a) }));
  const confirm = colsStep.acts.find(a => /conv-(cols|columns|map)/.test(a) && !/back/.test(a));
  if (confirm) await page.locator(`#view [data-a="${confirm}"]`).last().click();
  await page.waitForTimeout(200);
  const rv2 = await page.evaluate(() => UI.conv && UI.conv.rows ? UI.conv.rows.map(r => [r.date, r.amount, r.description]) : null);
  eq(rv2 && rv2.map(r => [r[0], r[1]]), [['2026-09-02', -100000], ['2026-09-18', -16643], ['2026-09-18', 150000], ['2026-09-30', -1250]], 'real file: four movements, signs from the two columns, oldest first, balance line left out');
  ok(rv2 && rv2.some(r => /ÁGUA/.test(r[2])) && rv2.some(r => /JOÃO/.test(r[2])) && rv2.some(r => /MANUTENÇÃO/.test(r[2])), 'real file: accents of a Windows-1252 file are kept', rv2 && rv2.map(r => r[2]));
  if (rv2) {
    await page.evaluate(() => { document.querySelectorAll('#view [data-a="rv-accept-verified"]').forEach(b => b.click()); UI.conv.rows.forEach(r => { if (!r.decision || r.decision === 'review') r.decision = 'accept'; }); render(); });
    await page.click('[data-a="conv-generate"]').catch(() => {});
    conv = await page.evaluate(() => { const c = UI.conv; if (!c.ofx) return null; const p = parseOFX(c.ofx); return { n: p.rows.length, sum: p.rows.reduce((s, r) => s + r.amount, 0), bal: decimalToCents(tagValue(c.ofx.slice(c.ofx.indexOf('<LEDGERBAL>')), 'BALAMT')), bad: document.querySelectorAll('#view .checks .bad').length, bank: tagValue(c.ofx, 'BANKID'), memo: p.rows.map(r => r.description).join('|') }; });
    eq(conv && [conv.n, conv.sum, conv.bal, conv.bad], [4, 32107, 432107, 0], 'real file: OFX total 321,07, closing balance 4.321,07 from the latest line, all checks pass');
    ok(conv && /AGUA/.test(conv.memo) && !/[^\x20-\x7E|]/.test(conv.memo), 'real file: accents folded to plain letters in the SGML file', conv && conv.memo);
  }
  eq(errors, [], 'converter: no console errors');

  // ---------- 3. statement imports: a second import of the same file adds nothing ----------
  await page.evaluate(() => { UI.conv = null; navigate('imports'); });
  const n0 = await page.evaluate(() => S.transactions.length);
  // an OFX file of the card: three movements the account already has (same bank IDs) and two new ones
  const ofxFile = await page.evaluate(() => { const id = 'nu-card', p = { ...(S.ofxProfiles[0] || OFX_BASE), accountType: 'CREDITCARD', currency: acct(id).currency };
    const known = S.transactions.filter(x => x.accountId === id && x.sourceTxnId).slice(0, 3).map(x => ({ ...x, fitid: x.sourceTxnId }));
    const fresh = [{ date: '2026-10-02', amount: -13270, type: 'expense', description: 'PAO DE ACUCAR LJ 1203', fitid: 'NU202610020901' }, { date: '2026-10-02', amount: -1290, type: 'expense', description: 'CLUBE ENTREGAS', fitid: 'NU202610020902' }];
    return generateOFX([...known, ...fresh], p, { asOf: S.today, balance: 0 }); });
  const pickOfx = async () => { await page.setInputFiles('#imp-file-ofx', { name: 'Nubank_2026-10.ofx', mimeType: 'application/x-ofx', buffer: Buffer.from(ofxFile, 'latin1') }); await page.waitForFunction(() => UI.imp && UI.imp.rows); await page.selectOption('#imp-acct', 'nu-card'); await page.waitForFunction(() => UI.imp.accountId === 'nu-card'); };
  await pickOfx();
  const imp1 = await page.evaluate(() => ({ rows: UI.imp.rows.length, dup: UI.imp.rows.filter(r => r.duplicate || r.dup || /dup/i.test(r.status || '') || r.decision === 'ignore').length }));
  await page.evaluate(() => { UI.imp.rows.forEach(r => { if (!r.decision || r.decision === 'review') r.decision = (r.duplicate || r.dup) ? 'ignore' : 'accept'; }); render(); });
  await page.click('[data-a="imp-commit"]');
  const added1 = await page.evaluate(n => S.transactions.length - n, n0);
  ok(added1 >= 1 && added1 <= imp1.rows, 'OFX import: new rows come in', { added1, imp1 });
  eq(added1, 2, 'OFX import: the three rows already in the account are caught as duplicates, the two new ones come in');
  await page.evaluate(() => { UI.imp = null; render(); });
  await pickOfx();
  const second = await page.evaluate(() => UI.imp.rows.map(r => r.decision || r.status));
  await page.evaluate(() => { UI.imp.rows.forEach(r => { if (!r.decision || r.decision === 'review') r.decision = 'ignore'; }); render(); });
  const canCommit = await page.locator('[data-a="imp-commit"]').isEnabled().catch(() => false);
  if (canCommit) await page.click('[data-a="imp-commit"]');
  eq(await page.evaluate(n => S.transactions.length - n, n0), 2, 'OFX import twice: nothing is counted twice', second);
  // the spreadsheet: the fixture's sheet comes in whole
  await page.evaluate(() => { UI.imp = null; S.plan.lines = []; render(); navigate('imports'); });
  await page.evaluate(() => sheetLoaded(sampleWorkbook('en'), sampleSheetName('en')));
  ok(await page.locator('[data-a="sheet-apply"]').isEnabled(), 'spreadsheet: the sheet is ready to import');
  await page.click('[data-a="sheet-apply"]');
  const sheet = await page.evaluate(() => ({ lines: S.plan.lines.length, oct: planTotals(S, '2026-10').expenses, want: PLAN.lines.reduce((s, l) => s + l.plan[2026][9], 0), n: PLAN.lines.length }));
  eq([sheet.lines, sheet.oct], [sheet.n, sheet.want], 'spreadsheet: every fixed cost of the sheet, October adds up to the sheet’s total');
  eq(errors, [], 'imports: no console errors');
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  done('qc-flows');
})().catch(e => { console.error(e); process.exit(1); });
