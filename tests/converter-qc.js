// QC of the statement converter and the spreadsheet import: the numbers that come out are the numbers that went in.
const { load } = require('./load.js');
const E = load();
let pass = 0, fail = 0;
const ok = (c, name, d) => { if (c) pass++; else { fail++; if (fail < 40) console.log('  FAIL', name, d === undefined ? '' : JSON.stringify(d).slice(0, 600)); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, { got: a, want: b });
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const br = c => { const n = c < 0, a = Math.abs(c); return (n ? '-' : '') + String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + String(a % 100).padStart(2, '0'); };
const us = c => { const n = c < 0, a = Math.abs(c); return (n ? '-' : '') + String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + String(a % 100).padStart(2, '0'); };
const dBR = d => d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4), dUS = d => d.slice(5, 7) + '/' + d.slice(8) + '/' + d.slice(0, 4);

// ---------- 1. statements in many layouts, both orders, checked line by line ----------
const LAYOUTS = {
  'one signed column, ; and 1.234,56, balance': { head: 'Data;Histórico;Valor;Saldo', row: (t) => [dBR(t.date), t.desc, br(t.amount), br(t.bal)].join(';') },
  'money in / money out columns': { head: 'Data,Descrição,Crédito,Débito,Saldo', row: (t) => [dBR(t.date), t.desc, t.amount > 0 ? '"' + br(t.amount) + '"' : '', t.amount < 0 ? '"' + br(-t.amount) + '"' : '', '"' + br(t.bal) + '"'].join(',') },
  'D / C marker column': { head: 'Data;Lançamento;Valor;D/C;Saldo', row: (t) => [dBR(t.date), t.desc, br(Math.abs(t.amount)), t.amount < 0 ? 'D' : 'C', br(t.bal)].join(';') },
  'English, 1,234.56, ISO dates, tab': { head: 'Date\tDescription\tAmount\tBalance', row: (t) => [t.date, t.desc, us(t.amount), us(t.bal)].join('\t') },
  'month first (US)': { head: 'Date,Description,Amount,Balance', row: (t) => [dUS(t.date), t.desc, '"' + us(t.amount) + '"', '"' + us(t.bal) + '"'].join(','), order: 'mdy' },
  'R$ sign and trailing minus': { head: 'Data;Descrição;Valor;Saldo', row: (t) => [dBR(t.date), t.desc, 'R$ ' + br(Math.abs(t.amount)) + (t.amount < 0 ? '-' : ''), 'R$ ' + br(Math.abs(t.bal)) + (t.bal < 0 ? '-' : '')].join(';') },
  'brackets for money out': { head: 'Date,Details,Amount,Balance', row: (t) => [t.date, t.desc, '"' + (t.amount < 0 ? '(' + us(-t.amount) + ')' : us(t.amount)) + '"', '"' + (t.bal < 0 ? '(' + us(-t.bal) + ')' : us(t.bal)) + '"'].join(',') },
};
for (const [name, L] of Object.entries(LAYOUTS)) for (let seed = 1; seed <= 25; seed++) {
  const r = rng(seed * 97 + name.length), int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const n = int(2, 40), oneDay = seed % 5 === 0, tx = []; let bal = int(-50000, 900000); const opening = bal;
  let day = 1; for (let i = 0; i < n; i++) { if (!oneDay && r() < .6) day = Math.min(28, day + int(0, 2)); const amount = (r() < .65 ? -1 : 1) * int(1, 400000); bal += amount; tx.push({ date: `2026-09-${String(oneDay ? 17 : day).padStart(2, '0')}`, desc: 'MOV ' + i + ' ' + ['PIX', 'TED', 'COMPRA', 'TARIFA'][int(0, 3)], amount, bal }); }
  for (const newestFirst of [false, true]) {
    const lines = (newestFirst ? [...tx].reverse() : tx).map(L.row), text = ['Banco Exemplo S.A.', 'Extrato de conta corrente', '', L.head, ...lines].join('\n');
    const t = E.readStatementText ? E.readStatementText(text) : E.readStatementCSV(text), label = `${name} #${seed}${newestFirst ? ' newest first' : ''}${oneDay ? ' one day' : ''}`;
    if (!t.ok) { ok(false, label + ' read', t); continue; }
    const res = E.statementRows(t, t.map, { mode: t.mode, order: L.order || t.order, year: t.year });
    eq(res.rows.length, n, label + ': every line read');
    eq(res.rows.reduce((s, x) => s + x.amount, 0), tx.reduce((s, x) => s + x.amount, 0), label + ': total of the movements');
    eq(res.rows.map(x => x.amount).sort((a, b) => a - b), tx.map(x => x.amount).sort((a, b) => a - b), label + ': each amount, sign included');
    eq(res.closing, bal, label + ': closing balance is the latest line’s');
    eq(res.chain && res.chain.bad, 0, label + ': balances follow one another');
    eq([res.start, res.end], [tx[0].date, tx[n - 1].date], label + ': period');
    eq(res.rows.map(x => x.date + x.amount), tx.map(x => x.date + x.amount), label + ': oldest first, in the file’s own order within a day');
    // -> OFX in every version and back
    const rows = res.rows.map((x, i) => ({ date: x.date, amount: x.amount, type: x.amount < 0 ? 'expense' : 'income', description: x.description, merchant: x.description, fitid: 'ID' + i }));
    for (const v of E.OFX_VERSIONS.map(v => v.id)) {
      const profile = { version: v, language: 'POR', currency: 'BRL', bankId: '341', accountId: 'Conta 123', accountType: 'CHECKING', institutionName: 'Banco Exemplo', transferMapping: 'SIGN' };
      const ofx = E.generateOFX(rows, profile, { asOf: '2026-10-02', balance: res.closing }), val = E.validateOFX(ofx, profile, rows), back = E.parseOFX(ofx);
      ok(val.ok, label + ' OFX ' + v + ' valid', val.checks.filter(c => !c.ok));
      eq(back.rows.map(x => [x.date, x.amount]), [...rows].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0).map(x => [x.date, x.amount]), label + ' OFX ' + v + ' reads back the same');
      eq(E.decimalToCents(E.tagValue(ofx.slice(ofx.indexOf('<LEDGERBAL>')), 'BALAMT')), bal, label + ' OFX ' + v + ' closing balance');
    }
  }
}
// a file whose balances do not follow is reported, never silently accepted
{
  const text = 'Data;Histórico;Valor;Saldo\n01/09/2026;A;-10,00;90,00\n02/09/2026;B;-20,00;70,00\n03/09/2026;C;-5,00;60,00\n';
  const t = E.readStatementCSV(text), res = E.statementRows(t, t.map, { mode: t.mode, order: t.order });
  eq(res.chain, { checked: 2, bad: 1 }, 'a balance that does not follow is counted');
  const t2 = E.readStatementCSV('Data;Histórico;Valor;Saldo\nSaldo anterior;;;100,00\n01/09/2026;A;-10,00;90,00\nTotal;;-10,00;\n'), r2 = E.statementRows(t2, t2.map, { mode: t2.mode, order: t2.order });
  eq([r2.rows.length, r2.balanceLines], [1, 2], 'balance and total lines are left out, not converted');
}
// dates
eq(['05/09/2026', '5/9/26', '2026-09-05', '20260905', '05.09.2026', '05-09-2026 14:33', '05 set 2026', '5 de setembro de 2026', 'Sep 5, 2026', '05 sept 2026', '31/02/2026', '29/02/2024', '29/02/2026', '00/01/2026'].map(d => E.readDate(d, 'dmy')),
  ['2026-09-05', '2026-09-05', '2026-09-05', '2026-09-05', '2026-09-05', '2026-09-05', '2026-09-05', '2026-09-05', '2026-09-05', '2026-09-05', null, '2024-02-29', null, null], 'dates as statements write them; impossible days refused');
eq([E.readDate('03/04/2026', 'dmy'), E.readDate('03/04/2026', 'mdy'), E.readDate('05/09', 'dmy', 2026), E.readDate('13/01/2026', 'mdy')], ['2026-04-03', '2026-03-04', '2026-09-05', null], 'day-first and month-first; a year supplied; month 13 refused');

// ---------- 2. the example Wise statements: every month converts, totals kept, balances follow ----------
for (const id of ['wise-brl', 'wise-usd']) for (const ym of ['2026-07', '2026-08', '2026-09']) {
  const csv = E.wiseCsv(id, ym), w = E.parseWiseCSV(csv);
  ok(w && w.rows && w.rows.length >= 0, `wise ${id} ${ym} read`, w && w.error);
  if (!w || !w.rows) continue;
  const demo = E.buildDemoState('en'), mine = demo.transactions.filter(t => t.accountId === id && t.date.slice(0, 7) === ym);
  if (mine.length) {      // months already in the account; September is the statement still to be converted
    eq(w.rows.reduce((s, r) => s + r.amount, 0), mine.reduce((s, t) => s + t.amount, 0), `wise ${id} ${ym}: file total = account movements`);
    eq(w.rows.length, mine.length, `wise ${id} ${ym}: line count`);
  }
  ok(w.rows.every((r, i) => !i || w.rows[i - 1].balance + r.amount === r.balance), `wise ${id} ${ym}: each running balance follows the one before`);
  eq(w.closing, w.rows.length ? w.rows[w.rows.length - 1].balance : null, `wise ${id} ${ym}: closing balance is the latest line’s`);
}

// ---------- 3. the spreadsheet import: the example sheet in three languages comes in whole, and twice changes nothing ----------
for (const lang of ['en', 'es', 'pt']) {
  const wb = E.sampleWorkbook(lang), units = E.analyzeWorkbook(wb, E.sampleSheetName(lang), { today: '2026-10-02' });
  const S = E.buildNewState('s@example.org', lang, '2026-10-02');
  const list = Array.isArray(units) ? units : units.units; E.sheetPrefill(S, list);
  eq(E.sheetProblems(list), [], lang + ': the example sheet has nothing blocking');
  let uid = 0; const opt = { newId: p => p + '-qc' + (++uid) }; E.applySheetImport(S, list, opt);
  const plan2026 = S.plan.lines.reduce((s, l) => s + (l.plan[2026] || []).reduce((a, b) => a + b, 0), 0), want = E.PLAN.lines.reduce((s, l) => s + l.plan[2026].reduce((a, b) => a + b, 0), 0);
  eq([S.plan.lines.length, plan2026], [E.PLAN.lines.length, want], lang + ': every fixed cost and every monthly amount');
  for (let m = 0; m < 12; m++) eq(S.plan.lines.reduce((s, l) => s + ((l.plan[2026] || [])[m] || 0), 0), E.PLAN.lines.reduce((s, l) => s + l.plan[2026][m], 0), `${lang}: month ${m + 1} total`);
  eq(S.goals.length, E.GOALS.length, lang + ': every goal and fund');
  for (const y of [2026, 2027]) eq(S.goals.reduce((s, g) => s + (g.plan[y] || []).reduce((a, b) => a + b, 0), 0), E.GOALS.reduce((s, g) => s + (g.plan[y] || []).reduce((a, b) => a + b, 0), 0), `${lang}: goal plans ${y}`);
  // the example sheet has one tab of fixed costs (2026) and two of savings (2026, 2027): the income of each tab comes in with it
  const tot = (pay, y, to) => (pay[y] || []).filter(r => r.to === to).reduce((s, r) => s + r.values.reduce((a, b) => a + b, 0), 0);
  eq([tot(S.pay, 2026, 'fixed'), tot(S.pay, 2026, 'savings'), tot(S.pay, 2027, 'savings')], [tot(E.PAY, 2026, 'fixed'), tot(E.PAY, 2026, 'savings'), tot(E.PAY, 2027, 'savings')], lang + ': income rows, per tab');
  const before = JSON.stringify([S.plan, S.goals, S.pay, S.fii]);
  const again = E.analyzeWorkbook(E.sampleWorkbook(lang), E.sampleSheetName(lang), { today: '2026-10-02' }), list2 = Array.isArray(again) ? again : again.units; E.sheetPrefill(S, list2); E.applySheetImport(S, list2, opt);
  eq(JSON.stringify([S.plan, S.goals, S.pay, S.fii]), before, lang + ': importing the same sheet twice changes nothing');
}
console.log(`converter-qc: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
